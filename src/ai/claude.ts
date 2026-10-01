import Anthropic from '@anthropic-ai/sdk'
import { betaZodOutputFormat } from '@anthropic-ai/sdk/helpers/beta/zod'
import * as z from 'zod/v4'
import type { TargetLanguage, VocabularyEntry } from '../engine/types'
import { LANGUAGE_NAME } from '../ui/labels'
import { AI_MODEL, AiError, type AiErrorKind, type EnrichRequest, type SentenceEvaluation, type WordInfo } from './types'

/**
 * The AI layer is a controlled content and evaluation engine, not the source of truth: everything
 * it returns is shown to the user to confirm (word data) or recorded as an ordinary review event
 * (sentence grading). The app works fully without it.
 *
 * Single-user app, so the browser calls the API directly with the user's own key, which never
 * leaves this device except to api.anthropic.com.
 */

const AI_MESSAGES: Record<AiErrorKind, string> = {
  auth: 'API anahtarı geçersiz. Ayarlar ekranından kontrol et.',
  rate: 'Çok sık istek gönderildi. Biraz bekleyip tekrar dene.',
  refusal: 'Model bu isteği yanıtlamadı.',
  network: 'İnternet bağlantısı yok ya da Anthropic API\'ye ulaşılamadı.',
  other: 'AI isteği başarısız oldu.',
}

function client(apiKey: string) {
  return new Anthropic({ apiKey, dangerouslyAllowBrowser: true, maxRetries: 2 })
}

async function structured<S extends z.ZodType>(
  apiKey: string,
  schema: S,
  system: string,
  user: string,
  effort: 'low' | 'medium',
): Promise<z.infer<S>> {
  try {
    const res = await client(apiKey).beta.messages.parse({
      model: AI_MODEL,
      max_tokens: 16000,
      // If a safety classifier declines, the API retries on a suitable fallback model in the same call.
      betas: ['server-side-fallback-2026-07-01'],
      fallbacks: 'default',
      output_config: { effort, format: betaZodOutputFormat(schema) },
      system,
      messages: [{ role: 'user', content: user }],
    })
    if (res.stop_reason === 'refusal') throw new AiError('refusal', AI_MESSAGES.refusal)
    if (!res.parsed_output) throw new AiError('other', 'AI cevabı okunamadı.')
    return res.parsed_output as z.infer<S>
  } catch (e) {
    if (e instanceof AiError) throw e
    if (e instanceof Anthropic.AuthenticationError || e instanceof Anthropic.PermissionDeniedError) {
      throw new AiError('auth', AI_MESSAGES.auth)
    }
    if (e instanceof Anthropic.RateLimitError) throw new AiError('rate', AI_MESSAGES.rate)
    if (e instanceof Anthropic.APIConnectionError) throw new AiError('network', AI_MESSAGES.network)
    if (e instanceof Anthropic.APIError) throw new AiError('other', `${AI_MESSAGES.other} (${e.status})`)
    throw new AiError('other', AI_MESSAGES.other)
  }
}

/** Cheapest possible call, used by the "test key" button. */
export async function testKey(apiKey: string): Promise<void> {
  await structured(apiKey, z.object({ ok: z.boolean() }), 'Return ok: true.', 'ping', 'low')
}

// ---------------------------------------------------------------------------
// Word enrichment
// ---------------------------------------------------------------------------

const POS = ['noun', 'verb', 'adjective', 'adverb', 'preposition', 'conjunction', 'pronoun', 'phrase', 'other'] as const

const WordInfo = z.object({
  input: z.string().describe('The word exactly as given in the request, to match results to requests.'),
  lemma: z.string().describe('Dictionary form. For French/Spanish nouns include the definite article: "la décision", "el año", "l\'arbre".'),
  partOfSpeech: z.enum(POS),
  gender: z.enum(['m', 'f', 'none']).describe('Grammatical gender for French/Spanish nouns, otherwise "none".'),
  meanings: z.array(z.string()).describe('1-3 short Turkish meanings, most common first (in the given context if any).'),
  example: z.string().describe('One natural example sentence in the target language with the word marked by asterisks, e.g. "She *abandoned* the plan."'),
  exampleTranslation: z.string().describe('Turkish translation of the example sentence.'),
  collocations: z
    .array(
      z.object({
        phrase: z.string(),
        translation: z.string().describe('Turkish'),
        wrongVariants: z.array(z.string()).describe('1-2 unnatural variants a Turkish learner typically produces.'),
      }),
    )
    .describe('0-3 high-value collocations. Empty for function words.'),
  confusables: z.array(z.string()).describe('0-2 words in the same language commonly confused with this one (affect/effect).'),
})
// Compile-time check that the schema and the shared WordInfo type agree.
const _schemaMatches: (x: z.infer<typeof WordInfo>) => WordInfo = (x) => x
void _schemaMatches

const WordBatch = z.object({ words: z.array(WordInfo) })

/** Fills in dictionary data for up to ~20 words in one request. */
export async function enrichWords(
  apiKey: string,
  language: TargetLanguage,
  words: EnrichRequest[],
): Promise<Map<string, WordInfo>> {
  const system = [
    `You prepare vocabulary cards for a Turkish native speaker who already speaks ${LANGUAGE_NAME[language]} (target language) well and is practising to keep and widen their active vocabulary.`,
    'Be accurate: meanings must be real Turkish equivalents, examples natural and idiomatic (not simplified), collocations genuinely frequent.',
    'If a word was given in an inflected form, return its dictionary form as the lemma.',
    'When a context sentence is given, the first meaning must be the sense used in that sentence, and the example may reuse that sentence.',
  ].join('\n')
  const list = words.map((w, i) => `${i + 1}. ${w.word}${w.context ? `\n   context: ${w.context}` : ''}`).join('\n')
  const out = await structured(apiKey, WordBatch, system, `Words:\n${list}`, 'low')
  return new Map(out.words.map((w) => [w.input.toLocaleLowerCase(), w]))
}

// ---------------------------------------------------------------------------
// Sentence evaluation (free production)
// ---------------------------------------------------------------------------

const ERROR_TYPES = ['meaning', 'accent', 'typo', 'article', 'gender', 'form', 'confusion', 'collocation'] as const

const SentenceGrade = z.object({
  verdict: z.enum(['correct', 'near', 'wrong']).describe(
    'correct: target word used correctly and the sentence is natural. near: target word right but a small slip (accent, agreement, article, minor grammar). wrong: target word missing, misused, or wrong meaning.',
  ),
  errorType: z.enum([...ERROR_TYPES, 'none']).describe('Main problem with the TARGET WORD usage; "none" if correct.'),
  corrected: z.string().describe('The learner\'s sentence minimally corrected (identical if already correct).'),
  feedback: z.string().describe('1-2 short, encouraging sentences in Turkish explaining what was right or what to fix.'),
})

export async function evaluateSentence(
  apiKey: string,
  entry: VocabularyEntry,
  sentence: string,
): Promise<SentenceEvaluation> {
  const lang = LANGUAGE_NAME[entry.language]
  const system = [
    `You are a warm but precise ${lang} teacher for a Turkish native speaker.`,
    'Grade only how the target word is used, plus grammar that directly affects it. Ignore punctuation and capitalisation.',
    'Do not penalise a correct but unusual sentence. Keep feedback in Turkish, short and kind.',
  ].join('\n')
  const user = [
    `Target word: ${entry.article ? `${entry.article} ` : ''}${entry.lemma} (${entry.partOfSpeech}) = ${entry.senses[0].gloss}`,
    `Learner's sentence: ${sentence}`,
  ].join('\n')
  const g = await structured(apiKey, SentenceGrade, system, user, 'medium')
  return {
    verdict: g.verdict,
    errorType: g.errorType === 'none' ? undefined : g.errorType,
    corrected: g.corrected,
    feedback: g.feedback,
  }
}
