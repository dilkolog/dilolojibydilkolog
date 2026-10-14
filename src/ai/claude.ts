import Anthropic from '@anthropic-ai/sdk'
import { betaZodOutputFormat } from '@anthropic-ai/sdk/helpers/beta/zod'
import * as z from 'zod/v4'
import type { TargetLanguage, VocabularyEntry } from '../engine/types'
import { LANGUAGE_NAME } from '../ui/labels'
import { aiConfig, costOf, type AiFeature } from './usage'
import { AiError, type AiErrorKind, type EnrichRequest, type EpisodeDraft, type EpisodeRequest, type FamilySuggestion, type FieldSuggestions, type Mnemonic, type RetellEvaluation, type RetellRequest, type JournalRequest, type JournalReview, type ChatRequest, type ChatReply, type MonkiRequest, type MonkiReply, type ErrorReport, type ErrorReportRequest, type SessionNoteRequest, type PersonalSentencesRequest, type NotesQuizRequest, type QuizQuestion, type PersonalSentence, type WordSuggestRequest, type PrequestionSet, type SentenceEvaluation, type SuggestField, type SuggestRequest, type WordInfo } from './types'

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
  budget: 'Bu ayki YZ bütçen doldu. Ayarlar → YZ yardımcısı bölümünden sınırı değiştirebilirsin.',
  other: 'YZ isteği başarısız oldu.',
}

function client(apiKey: string) {
  return new Anthropic({ apiKey, dangerouslyAllowBrowser: true, maxRetries: 2 })
}

async function structured<S extends z.ZodType>(
  apiKey: string,
  schema: S,
  system: string,
  /** One user message, or a whole conversation (chat). */
  user: string | Anthropic.Beta.BetaMessageParam[],
  effort: 'low' | 'medium',
  feature: AiFeature,
): Promise<z.infer<S>> {
  await aiConfig.beforeRequest()
  const model = aiConfig.model
  // Haiku 4.5 takes neither the effort setting nor the refusal fallback; the 5.5 models get both.
  const modern = model !== 'claude-haiku-4-5'
  try {
    const res = await client(apiKey).beta.messages.parse({
      model,
      max_tokens: 16000,
      // If a safety classifier declines, the API retries on a suitable fallback model in the same call.
      ...(modern ? { betas: ['server-side-fallback-2026-07-01'], fallbacks: 'default' as const } : {}),
      output_config: { ...(modern ? { effort } : {}), format: betaZodOutputFormat(schema) },
      system,
      messages: typeof user === 'string' ? [{ role: 'user', content: user }] : user,
    })
    const u = res.usage
    aiConfig.onUsage({
      feature,
      model,
      inputTokens: u.input_tokens,
      outputTokens: u.output_tokens,
      cost: costOf(model, u.input_tokens, u.output_tokens, u.cache_read_input_tokens ?? 0, u.cache_creation_input_tokens ?? 0),
      at: new Date(),
    })
    if (res.stop_reason === 'refusal') throw new AiError('refusal', AI_MESSAGES.refusal)
    if (!res.parsed_output) throw new AiError('other', 'YZ cevabı okunamadı.')
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
  await structured(apiKey, z.object({ ok: z.boolean() }), 'Return ok: true.', 'ping', 'low', 'test')
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
  literal: z.string().describe('For idioms and multi-word expressions only: a word-for-word Turkish rendering (e.g. "avoir le cafard" → "hamamböceğine sahip olmak"); empty string for single words.'),
  frequencyBand: z
    .enum(['top1000', 'top3000', 'top10000', 'rare'])
    .describe('How common the word is in everyday use of the language, by frequency rank: among the 1000 most frequent words, 3000, 10000, or rarer.'),
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
  const out = await structured(apiKey, WordBatch, system, `Words:\n${list}`, 'low', 'word_fill')
  return new Map(out.words.map((w) => [w.input.toLocaleLowerCase(), w]))
}

// ---------------------------------------------------------------------------
// Single-field suggestions (add-word form)
// ---------------------------------------------------------------------------

const Collocation = z.object({
  phrase: z.string(),
  translation: z.string().describe('Turkish'),
  wrongVariants: z.array(z.string()).describe('1-2 unnatural variants a Turkish learner typically produces.'),
})

const FIELD_SHAPES = {
  example: {
    example: z.string().describe('One natural, idiomatic example sentence in the target language with the word marked by asterisks: "She *abandoned* the plan." Must differ from the current example if one is given.'),
    exampleTranslation: z.string().describe('Turkish translation of the example sentence.'),
  },
  notes: {
    note: z.string().describe('A short memory hook in Turkish (max 2 sentences): an accurate etymology, a Turkish sound-alike, or a usage tip that prevents a typical mistake.'),
  },
  tags: {
    tags: z.array(z.string()).describe('1-3 short lowercase Turkish topic tags (e.g. "iş", "duygular", "seyahat"). Reuse existing tags when they fit.'),
  },
  collocations: {
    collocations: z.array(Collocation).describe('2-3 genuinely frequent collocations of the word. Empty for function words.'),
  },
} satisfies Record<SuggestField, z.ZodRawShape>

/** Suggests only the requested add-word form fields, in one request. */
export async function suggestFields(apiKey: string, req: SuggestRequest): Promise<FieldSuggestions> {
  const shape = Object.assign({}, ...req.fields.map((f) => FIELD_SHAPES[f])) as z.ZodRawShape
  const system = [
    `You help a Turkish native speaker who speaks ${LANGUAGE_NAME[req.language]} well fill in a vocabulary card.`,
    'Be accurate and natural: no invented etymology, no textbook-simplified sentences, only genuinely frequent collocations.',
    'If a Turkish meaning is given, use that sense of the word.',
  ].join('\n')
  const user = [
    `Word: ${req.word}`,
    req.meaning.trim() && `Turkish meaning: ${req.meaning}`,
    req.fields.includes('tags') && req.existingTags.length > 0 && `Existing tags: ${req.existingTags.join(', ')}`,
    req.fields.includes('example') && req.currentExample?.trim() && `Existing example(s), write one in a different context: ${req.currentExample}`,
  ]
    .filter(Boolean)
    .join('\n')
  return (await structured(apiKey, z.object(shape), system, user, 'low', 'suggest')) as FieldSuggestions
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
  const g = await structured(apiKey, SentenceGrade, system, user, 'medium', 'sentence')
  return {
    verdict: g.verdict,
    errorType: g.errorType === 'none' ? undefined : g.errorType,
    corrected: g.corrected,
    feedback: g.feedback,
  }
}

/**
 * Back-translation: the learner turns a Turkish sentence into the target language. Graded on
 * whether the meaning comes across and the target word is used correctly; the original is a
 * reference, not the only right answer.
 */
export async function evaluateTranslation(
  apiKey: string,
  entry: VocabularyEntry,
  turkish: string,
  reference: string,
  attempt: string,
): Promise<SentenceEvaluation> {
  const lang = LANGUAGE_NAME[entry.language]
  const system = [
    `You are a warm but precise ${lang} teacher for a Turkish native speaker practising translation into ${lang}.`,
    'The learner translated a Turkish sentence. Judge whether their sentence conveys the same meaning naturally and uses the target word correctly.',
    'The reference translation is one good answer, not the only one: accept any natural, faithful translation. Ignore punctuation and capitalisation.',
    'Keep feedback in Turkish, short and kind; mention the most useful improvement.',
  ].join('\n')
  const user = [
    `Target word: ${entry.article ? `${entry.article} ` : ''}${entry.lemma} = ${entry.senses[0].gloss}`,
    `Turkish sentence: ${turkish}`,
    `Reference translation: ${reference}`,
    `Learner's translation: ${attempt}`,
  ].join('\n')
  const g = await structured(apiKey, SentenceGrade, system, user, 'medium', 'translation')
  return { verdict: g.verdict, errorType: g.errorType === 'none' ? undefined : g.errorType, corrected: g.corrected, feedback: g.feedback }
}

const Retell = z.object({
  feedback: z.string().describe('2-3 short, encouraging sentences in Turkish: what worked, and the single most useful improvement.'),
  corrected: z.string().describe("The learner's retelling with errors minimally corrected (identical if already correct)."),
  words: z
    .array(z.object({ lemma: z.string(), used: z.boolean(), correct: z.boolean().describe('Used with the right meaning and form. False if not used.') }))
    .describe('One item per practice word, in the given order.'),
})

/** Retelling an episode in your own words (pushed output): which practice words made it in, and how well. */
export async function evaluateRetelling(apiKey: string, req: RetellRequest): Promise<RetellEvaluation> {
  const lang = LANGUAGE_NAME[req.language]
  const system = [
    `You are a warm but precise ${lang} teacher. A Turkish learner who speaks ${lang} well read a short story and retold it in their own words.`,
    'Judge the retelling as communication first: is the story recognisable and the language natural? Then check each practice word: was it used, and correctly?',
    'Do not demand completeness; a short retelling is fine. Feedback in Turkish.',
  ].join('\n')
  const user = [
    `Story:\n${req.story}`,
    `Practice words: ${req.words.map((w) => `${w.lemma} (${w.gloss})`).join(', ')}`,
    `Learner's retelling:\n${req.retelling}`,
  ].join('\n\n')
  return structured(apiKey, Retell, system, user, 'medium', 'retell')
}

// ---------------------------------------------------------------------------
// Journal
// ---------------------------------------------------------------------------

const JOURNAL_ERRORS = ['meaning', 'accent', 'typo', 'article', 'gender', 'form', 'confusion', 'collocation', 'grammar'] as const

const Journal = z.object({
  corrected: z.string().describe('The whole text, minimally corrected so it is correct and natural (identical if already correct).'),
  feedback: z.string().describe('2-3 encouraging sentences in Turkish: what went well and the one thing most worth working on.'),
  mistakes: z
    .array(
      z.object({
        original: z.string().describe('The wrong words exactly as written.'),
        correction: z.string(),
        type: z.enum(JOURNAL_ERRORS),
        explanation: z.string().describe('One short sentence in Turkish.'),
        lemma: z.string().describe('If the mistake is about one of the practice words, that word exactly as listed; otherwise an empty string.'),
      }),
    )
    .describe('Real errors only, most important first, at most 8. No style nitpicks.'),
  suggestions: z
    .array(z.object({ lemma: z.string().describe('A practice word, exactly as listed.'), sentence: z.string().describe('A sentence from the text rewritten to use it naturally.') }))
    .describe('0-3 places where a practice word would have fitted naturally.'),
  usedWords: z.array(z.string()).describe('Practice words the learner used correctly, exactly as listed.'),
})

/** Daily journal: correct the learner's few sentences and point to practice words they could use. */
export async function reviewJournal(apiKey: string, req: JournalRequest): Promise<JournalReview> {
  const lang = LANGUAGE_NAME[req.language]
  const system = [
    `You are a warm but precise ${lang} writing coach for a Turkish adult who already speaks ${lang} well and keeps a short daily journal.`,
    'Correct only real errors (grammar, wrong word, agreement, gender, spelling, unnatural collocations); keep the learner\'s voice and content.',
    'Explanations and feedback in Turkish, short and kind.',
  ].join('\n')
  const user = [`Practice words: ${req.words.map((w) => `${w.lemma} (${w.gloss})`).join(', ') || 'none'}`, `Journal entry:\n${req.text}`].join('\n\n')
  return structured(apiKey, Journal, system, user, 'medium', 'journal')
}

// ---------------------------------------------------------------------------
// Questions before reading
// ---------------------------------------------------------------------------

const Prequestions = z.object({
  questions: z
    .array(z.object({ question: z.string().describe('In Turkish, about a key point of the text.'), answer: z.string().describe('Short answer in Turkish, as the text gives it.') }))
    .describe('Exactly 3 questions, in the order the answers appear in the text, about its main points (not trivia).'),
})

/**
 * Three questions to read for. Prequestions focus reading and improve memory of the text as a
 * whole, not only of the answers (Carpenter & Toftness 2017).
 */
export async function prequestions(apiKey: string, language: TargetLanguage, text: string): Promise<PrequestionSet> {
  const system = `You prepare a Turkish adult who reads ${LANGUAGE_NAME[language]} well for reading a text: ask about its main points so they read with a purpose.`
  return structured(apiKey, Prequestions, system, `Text:\n${text.slice(0, 12_000)}`, 'low', 'prequestions')
}

// ---------------------------------------------------------------------------
// Monthly error report
// ---------------------------------------------------------------------------

const Report = z.object({
  summary: z.string().describe('2-3 sentences in Turkish: how the month went and the one thing to focus on.'),
  patterns: z
    .array(
      z.object({
        title: z.string().describe('Short Turkish name of the pattern, e.g. "-age ile biten kelimelerin cinsiyeti".'),
        explanation: z.string().describe('Why this happens and the rule, in Turkish, 1-3 sentences.'),
        examples: z.array(z.string()).describe('2-4 of the learner\'s own errors as "wrote → correct".'),
        tip: z.string().describe('One concrete way to stop making it, in Turkish.'),
      }),
    )
    .describe('2-4 recurring patterns, most important first. Only real patterns (2+ errors with the same cause); never invent.'),
  drills: z
    .array(
      z.object({
        prompt: z.string().describe('A short exercise: a target-language sentence with a ___ gap, or a Turkish phrase to translate.'),
        answer: z.string().describe('The correct answer in the target language.'),
        note: z.string().describe('Why, in Turkish, one short sentence.'),
      }),
    )
    .describe('6 drills aimed at the patterns, mostly with words from the errors.'),
})

/** Names the patterns behind a month of errors and gives drills aimed at them. */
export async function monthlyReport(apiKey: string, req: ErrorReportRequest): Promise<ErrorReport> {
  const lang = LANGUAGE_NAME[req.language]
  const system = [
    `You are an experienced ${lang} teacher reviewing a month of a Turkish adult learner's wrong answers in a vocabulary app. The learner already speaks ${lang} well.`,
    'Find the underlying patterns (gender of a suffix group, a confusable pair, accents on a verb form, a false friend, a spelling rule), not a list of single mistakes.',
    'Accents/typos that happen once are noise; recurring ones are a pattern. Error type labels: meaning, accent, typo, gender, article, form, collocation, confusion, grammar.',
    'Write everything for the learner in Turkish, except target-language examples, answers and drills.',
  ].join('\n')
  const user = [`Last 30 days: ${req.answers} answers, ${req.wrong} not correct.`, 'Errors, most frequent first:', ...req.lines].join('\n')
  return structured(apiKey, Report, system, user, 'medium', 'report')
}

const PersonalSentencesSchema = z.object({
  sentences: z
    .array(
      z.object({
        text: z.string().describe('A natural sentence in the target language, in the first person or about the learner\'s own life, with the word\'s form in asterisks: "She *abandoned* the plan."'),
        translation: z.string().describe('Turkish translation.'),
      }),
    )
    .describe('Exactly 3 sentences, each in a different situation.'),
})

/** Three sentences with the word, about the learner's own interests (self-reference makes words stick). */
export async function personalSentences(apiKey: string, req: PersonalSentencesRequest): Promise<PersonalSentence[]> {
  const lang = LANGUAGE_NAME[req.language]
  const system = [
    `You write example sentences for a Turkish native speaker who speaks ${lang} well and is building a vocabulary list.`,
    'Each sentence must use the given word naturally and correctly (in the sense given), be about the learner\'s own world (first person or "my ..."), and stay short (under 15 words).',
    'Use the learner\'s interests as the settings and topics, one per sentence where they fit; with no interests, use everyday situations. No textbook-simplified sentences.',
  ].join('\n')
  const user = [
    `Word: ${req.word}`,
    req.meaning.trim() && `Turkish meaning: ${req.meaning}`,
    `Interests: ${req.interests.length ? req.interests.join(', ') : '(none given: everyday life)'}`,
    req.existing.length > 0 && `Sentences the word already has (write different ones): ${req.existing.join(' / ')}`,
  ]
    .filter(Boolean)
    .join('\n')
  return (await structured(apiKey, PersonalSentencesSchema, system, user, 'low', 'personal_sentences')).sentences.slice(0, 3)
}

/** New words for the learner's list, as full cards (the same data `enrichWords` gives for words they type). */
export async function suggestNewWords(apiKey: string, req: WordSuggestRequest): Promise<WordInfo[]> {
  const lang = LANGUAGE_NAME[req.language]
  const system = [
    `You suggest new ${lang} vocabulary for a Turkish native speaker who already speaks ${lang} well and is widening their active vocabulary.`,
    `Propose exactly ${req.count} words (or fixed expressions) that a learner of their level will meet often and can use: not basic words, not rare ones. Judge the level from the sample words they already have.`,
    'Spread them over different topics and parts of speech; prefer the learner\'s interests where they fit. Single dictionary-form words (nouns, verbs, adjectives, adverbs) or short common expressions; no proper nouns.',
    'Never propose a word already in their list. Set `input` to the lemma you propose. Meanings must be real Turkish equivalents, the example natural and idiomatic.',
  ].join('\n')
  const user = [
    `Interests: ${req.interests.length ? req.interests.join(', ') : '(none given: everyday life and work)'}`,
    req.sample.length > 0 && `Words they already know (level): ${req.sample.slice(0, 30).join(', ')}`,
    req.have.length > 0 && `Words already in their list (do not repeat): ${req.have.slice(0, 400).join(', ')}`,
  ]
    .filter(Boolean)
    .join('\n')
  const out = await structured(apiKey, WordBatch, system, user, 'low', 'word_suggest')
  const seen = new Set(req.have.map((w) => w.toLocaleLowerCase(req.language)))
  return out.words.filter((w) => !seen.has(w.lemma.toLocaleLowerCase(req.language))).slice(0, req.count)
}

const NotesQuiz = z.object({
  questions: z.array(
    z.object({
      question: z.string().describe('The question, in the language it is about (Turkish for a rule, the target language for a phrase), self-contained.'),
      options: z.array(z.string()).describe('Exactly four short options; one right, three plausible but wrong.'),
      answer: z.number().describe('Index (0-3) of the right option.'),
      explanation: z.string().describe('One or two Turkish sentences saying why that option is right, based on the notes.'),
    }),
  ),
})

/** A multiple-choice quiz about the learner's own notes. */
export async function notesQuiz(apiKey: string, req: NotesQuizRequest): Promise<QuizQuestion[]> {
  const lang = LANGUAGE_NAME[req.language]
  const system = [
    `You write practice questions for a Turkish adult learning ${lang}, from the notes they took (a lesson, grammar rules, a list of expressions).`,
    `Write exactly ${req.count} multiple-choice questions that test what the notes actually say: rules, meanings, forms, usage. Do not use facts that are not in the notes.`,
    'Each has four options, only one right; the wrong ones are the mistakes a learner really makes. Vary the kinds: meaning, form, which sentence is correct, which rule applies.',
    'Questions about a rule are in Turkish; questions about a phrase or sentence use the target language. Keep everything short.',
  ].join('\n')
  const out = await structured(apiKey, NotesQuiz, system, req.notes.slice(0, 8000), 'low', 'notes_quiz')
  return out.questions
    .filter((q) => q.options.length === 4 && Number.isInteger(q.answer) && q.answer >= 0 && q.answer < 4 && new Set(q.options.map((o) => o.trim().toLowerCase())).size === 4)
    .slice(0, req.count)
}

const SessionNoteSchema = z.object({
  note: z.string().describe('One or two short sentences in Turkish: the pattern behind this session\'s mistakes and one concrete thing to do about it.'),
})

/** One concrete remark on the mistakes of a single session. */
export async function sessionNote(apiKey: string, req: SessionNoteRequest): Promise<string> {
  const lang = LANGUAGE_NAME[req.language]
  const system = [
    `You are an experienced ${lang} teacher. A Turkish adult learner just finished a vocabulary practice session; you see only its mistakes.`,
    'Say what pattern the mistakes share (gender of a suffix group, a confusable pair, accents, a false friend, a spelling rule) and give one concrete tip. If there is no real pattern, say so in one sentence and name the word worth another look.',
    'Write in Turkish, at most two short sentences, warm and specific; target-language examples are allowed. No greetings, no lists.',
  ].join('\n')
  const user = [`${req.answers} answers, ${req.wrong} not correct.`, ...req.lines].join('\n')
  return (await structured(apiKey, SessionNoteSchema, system, user, 'low', 'session_note')).note
}

// ---------------------------------------------------------------------------
// Conversation partner
// ---------------------------------------------------------------------------

const Chat = z.object({
  reply: z.string().describe('Your next line in the conversation, in the target language: 1-3 natural sentences, ending with a question or prompt that keeps the conversation going.'),
  correction: z
    .object({
      original: z.string(),
      corrected: z.string(),
      note: z.string().describe('One short sentence in Turkish.'),
    })
    .nullable()
    .describe("A correction of the learner's last message only if it had a real mistake; null otherwise."),
  usedWords: z.array(z.string()).describe('Practice words the learner used correctly in their last message, exactly as listed.'),
  goalsDone: z
    .array(z.number().int())
    .describe('Mission only: 0-based indices of ALL goals the learner has achieved so far in the whole conversation (cumulative). Empty array when there is no mission.'),
})

/** One turn of a role-play conversation that weaves in the learner's practice words. */
export async function chatTurn(apiKey: string, req: ChatRequest): Promise<ChatReply> {
  const lang = LANGUAGE_NAME[req.language]
  const system = [
    `You are a friendly conversation partner speaking only ${lang} with a Turkish adult who speaks ${lang} well and wants speaking practice.`,
    `Scenario (described in Turkish): ${req.scenario}. Stay in this role-play naturally.`,
    `Weave these practice words into your lines over the conversation, one or two at a time, so the learner hears and can reuse them: ${req.words.map((w) => w.lemma).join(', ') || 'none'}.`,
    'Speak naturally at a normal adult level; keep each turn short so the learner talks more than you.',
    'Their messages may come from speech recognition: ignore missing punctuation and capitalisation.',
    ...(req.goals?.length
      ? [
          'This is a mission. You play the other party described in the scenario, with their own interests: do not hand the learner their goals, make them work for each one with natural resistance, and give in when they argue well.',
          `The learner's goals (in Turkish):\n${req.goals.map((g, i) => `${i}. ${g}`).join('\n')}`,
          'A goal counts as achieved only when the learner has clearly done it themselves in the target language.',
        ]
      : []),
  ].join('\n')
  // The API wants the conversation to open with a user turn; the partner speaks first.
  const messages: Anthropic.Beta.BetaMessageParam[] = [
    { role: 'user', content: '(Start the conversation with your first line.)' },
    ...req.history.map((t) => ({ role: t.role, content: t.text })),
  ]
  return structured(apiKey, Chat, system, messages, 'low', 'chat')
}

// ---------------------------------------------------------------------------
// Monki, the assistant
// ---------------------------------------------------------------------------

const Monki = z.object({
  reply: z.string().describe('Your answer, in Turkish with target-language examples. Short: a few lines unless asked for more. Only **bold**, _italic_ and plain lines or "- " lists; no headings, no tables.'),
  suggestions: z.array(z.string()).describe('Two or three short things the learner might tap next, each under 40 characters. Normally Turkish requests or questions to you; in a role-play scene, replies the learner could say next in the target language; in a quiz, the answer options of a multiple-choice question or Turkish taps like "İpucu ver".'),
})

/** The extra rules of the mode Monki is in (nothing for plain chat). */
function monkiModeRules(req: MonkiRequest, lang: string): string[] {
  if (req.mode === 'quiz')
    return [
      `QUIZ MODE: ask exactly one question at a time, then wait. Mix: Turkish meaning to ${lang} word, ${lang} word to Turkish meaning, fill-in-the-blank sentences, short translations. Fit the level to how the learner answers, and start from the weak words. After an answer say in one short line whether it was right, give the correct form and a brief reason, then ask the next question. Taps: the options of a multiple-choice question, or Turkish ones like "İpucu ver" and "Sonraki soru".`,
    ]
  if (req.mode === 'roleplay')
    return [
      `ROLE-PLAY MODE: scene: ${req.scenario || 'an everyday conversation'}. You play the other person in the scene and stay in character. Speak only in simple, natural ${lang} (A2-B1), one or two short sentences, then wait for the learner. No translation unless asked. If the learner makes a real mistake, finish your in-character reply and add one new line in Turkish starting with "✏️ Düzeltme:" with the corrected sentence and a few words of reason. After about eight exchanges close the scene and sum up in two Turkish lines what went well and what to watch. Override the "answer in Turkish" rule for the scene itself. Taps: two or three things the learner could say next, in ${lang}, of different difficulty.`,
    ]
  if (req.mode === 'mistakes')
    return [
      `MISTAKES MODE: the learner's recent mistakes, most repeated first: ${req.mistakes?.length ? req.mistakes.map((m) => `${m.word} (wrote "${m.given || '-'}", right: "${m.expected}")`).join('; ') : 'none recorded'}. Go through them one at a time: say in Turkish why it goes wrong, give a short memory trick and one new example, then ask the learner to write a sentence with it and correct it. Move on only when they have it.`,
    ]
  return []
}

/** One turn of free talk with Monki: explains, corrects, makes examples and small quizzes. */
export async function monkiTurn(apiKey: string, req: MonkiRequest): Promise<MonkiReply> {
  const lang = LANGUAGE_NAME[req.language]
  const system = [
    `You are Monki, a cheerful, encouraging little monkey who is the study buddy inside a ${lang} learning app. The learner is a Turkish adult learning ${lang}${req.name ? ` (their name is ${req.name})` : ''}.`,
    'Answer in Turkish. Give every example in the target language with its Turkish translation in parentheses or on the next line. Write in the target language only when the learner asks for practice in it, and then keep it natural.',
    'Be brief and warm: a few lines, one idea at a time, a light touch of playfulness (at most one small exclamation per answer, no emoji walls). Longer only when asked for a full explanation.',
    'You help with vocabulary, grammar, pronunciation tips, differences between similar words or tenses, checking and gently correcting sentences the learner wrote (show the corrected sentence, then one short reason), mnemonics, and small quizzes (one question at a time, wait for the answer).',
    'If the learner writes a sentence in the target language with a real mistake, point it out kindly even when they did not ask. Never invent features of the app. Politely steer off-topic requests back to language learning in one friendly sentence.',
    `Words they currently struggle with (use them for examples and quizzes when it fits): ${req.weakWords?.join(', ') || 'none known'}.`,
    'Also return two or three short follow-up taps that would naturally come next.',
    'Put the whole answer in "reply": never stop after an introduction such as "İşte örnekler:" or "Tabii, şunlar:"; the examples or list it announces must follow in the same reply.',
    ...monkiModeRules(req, lang),
  ].join('\n')
  const messages: Anthropic.Beta.BetaMessageParam[] = req.history.map((t) => ({ role: t.role, content: t.text }))
  const first = await structured(apiKey, Monki, system, messages, 'low', 'monki')
  if (!endsMidThought(first.reply)) return first
  // A small model sometimes announces a list and stops there ("Tabii, daha resmi ifadeler işte:"): ask once more.
  const again = await structured(apiKey, Monki, `${system}\nYour previous attempt ended right after its introduction, with nothing after it. Write the full answer this time.`, messages, 'low', 'monki')
  return endsMidThought(again.reply) ? first : again
}

/** A reply that only announces what comes next ("…işte:") and stops there. */
export function endsMidThought(reply: string): boolean {
  return /[:：]\s*$/.test(reply.trim())
}

// ---------------------------------------------------------------------------
// Story episodes
// ---------------------------------------------------------------------------

const Episode = z.object({
  title: z.string().describe('Short episode title in the target language.'),
  paragraphs: z
    .array(
      z.object({
        text: z.string().describe('Paragraph in the target language. Every practice word appears wrapped as {{form}}.'),
        translation: z.string().describe('Natural Turkish translation of the paragraph, without markers.'),
      }),
    )
    .describe('3-5 paragraphs.'),
  recap: z.string().describe('Two-sentence English summary of what happened, for writing the next episode.'),
})

/**
 * Writes the next episode of the learner's serial story around their weak words. Curiosity about
 * what happens next is the motivation; meeting the words in a meaningful context is the learning.
 */
export async function writeEpisode(apiKey: string, req: EpisodeRequest): Promise<EpisodeDraft> {
  const lang = LANGUAGE_NAME[req.language]
  const system = [
    `You write an ongoing serial story in ${lang} for a Turkish adult who speaks ${lang} well and wants to practise specific words.`,
    'Write natural, vivid, idiomatic prose (not simplified), 180-280 words in total, 3-5 short paragraphs.',
    'Use EVERY practice word exactly once, in a context that makes its meaning clear. Inflect it as grammar requires.',
    'Wrap each practice word occurrence in double curly braces, exactly as it appears in the sentence: {{abandoned}}. Do not mark any other word.',
    'Continue the plot from the previous episodes if any; end on a small cliffhanger so the reader wants the next episode.',
  ].join('\n')
  const user = [
    req.interests.length || req.custom ? `Reader's interests: ${[...req.interests, req.custom].filter(Boolean).join(', ')}` : 'Reader has no stated interests: pick an engaging everyday-adventure story.',
    req.previous.length
      ? `Previous episodes:\n${req.previous.map((p) => `Episode ${p.number} "${p.title}": ${p.recap}`).join('\n')}`
      : 'This is episode 1: introduce the main character and setting.',
    `Practice words (dictionary form = Turkish meaning):\n${req.words.map((w) => `- ${w.lemma} = ${w.gloss}`).join('\n')}`,
  ].join('\n\n')
  return structured(apiKey, Episode, system, user, 'medium', 'story')
}

// ---------------------------------------------------------------------------
// Mnemonics
// ---------------------------------------------------------------------------

const MnemonicSchema = z.object({
  etymology: z.string().describe('1-2 sentences in Turkish on where the word comes from, only if genuinely helpful and accurate; empty string if unknown.'),
  soundAlike: z.string().describe('A Turkish keyword mnemonic: a Turkish word or phrase that sounds like the target word, linked to its meaning in one memorable sentence.'),
  scene: z.string().describe('One vivid, slightly funny mental image in Turkish that ties the sound and the meaning together.'),
})

/** A memory hook for a word the learner keeps missing (mnemonic and etymology intervention). */
export async function createMnemonic(apiKey: string, entry: VocabularyEntry): Promise<Mnemonic> {
  const system = [
    `You help a Turkish speaker remember ${LANGUAGE_NAME[entry.language]} words they keep forgetting.`,
    'Be accurate about etymology; never invent it. Keep everything short, concrete and memorable, in Turkish.',
  ].join('\n')
  const user = `Word: ${entry.article ? `${entry.article} ` : ''}${entry.lemma} (${entry.partOfSpeech}) = ${entry.senses[0].gloss}`
  return structured(apiKey, MnemonicSchema, system, user, 'low', 'mnemonic')
}

const FamilySchema = z.object({
  items: z
    .array(
      z.object({
        word: z.string().describe('The form or relative as it would be written in a word list; French/Spanish nouns with their definite article (la décision, el año, l\'arbre).'),
        meaning: z.string().describe('Its Turkish meaning, short (1-3 words).'),
        kind: z.enum(['form', 'family', 'phrase']).describe('form: another form of the same word that a learner must know (feminine, plural if irregular, past participle); family: a word from the same root with another part of speech; phrase: a very common fixed expression with the word.'),
        note: z.string().describe('A 1-2 word Turkish label: dişil, çoğul, geçmiş zaman ortacı, isim, fiil, sıfat, zarf, kalıp…'),
      }),
    )
    .describe('At most 8 items, the most useful first; only real, common words; nothing rare or invented.'),
})

/**
 * Other forms and relatives of a word, for when Wiktionary has nothing (or little): the learner
 * picks which to add, so nothing goes into the list unseen.
 */
export async function suggestFamily(apiKey: string, entry: VocabularyEntry, have: string[]): Promise<FamilySuggestion[]> {
  const lang = LANGUAGE_NAME[entry.language]
  const system = [
    `You help a Turkish speaker learning ${lang} grow their vocabulary around words they already know.`,
    'Suggest only real, frequent words a learner at that level would meet. Accuracy matters more than quantity: return fewer items rather than doubtful ones.',
    'Do not repeat the word itself or the words the learner already has.',
  ].join('\n')
  const user = [
    `Word: ${entry.article ? (entry.article.endsWith("'") ? entry.article : `${entry.article} `) : ''}${entry.lemma} (${entry.partOfSpeech}) = ${entry.senses[0].gloss}`,
    have.length ? `Already in the list: ${have.join(', ')}` : '',
  ]
    .filter(Boolean)
    .join('\n')
  const r = await structured(apiKey, FamilySchema, system, user, 'low', 'family')
  return r.items.slice(0, 8)
}
