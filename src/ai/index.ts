import type { TargetLanguage, VocabularyEntry } from '../engine/types'
import type { EnrichRequest, EpisodeDraft, EpisodeRequest, FieldSuggestions, Mnemonic, SentenceEvaluation, SuggestRequest, WordInfo } from './types'

export * from './types'

/**
 * The Anthropic SDK is loaded only when an AI feature is actually used, so the app starts as
 * fast without AI as it did before the AI layer existed.
 */
const sdk = () => import('./claude')

export const testKey = async (apiKey: string) => (await sdk()).testKey(apiKey)

export const enrichWords = async (
  apiKey: string,
  language: TargetLanguage,
  words: EnrichRequest[],
): Promise<Map<string, WordInfo>> => (await sdk()).enrichWords(apiKey, language, words)

export const suggestFields = async (apiKey: string, req: SuggestRequest): Promise<FieldSuggestions> => (await sdk()).suggestFields(apiKey, req)

export const evaluateSentence = async (apiKey: string, entry: VocabularyEntry, sentence: string): Promise<SentenceEvaluation> =>
  (await sdk()).evaluateSentence(apiKey, entry, sentence)

export const writeEpisode = async (apiKey: string, req: EpisodeRequest): Promise<EpisodeDraft> => (await sdk()).writeEpisode(apiKey, req)

export const createMnemonic = async (apiKey: string, entry: VocabularyEntry): Promise<Mnemonic> => (await sdk()).createMnemonic(apiKey, entry)

/** Turns a mnemonic into the text saved in the word's note. */
export function mnemonicNote(m: Mnemonic): string {
  return [m.soundAlike, m.scene, m.etymology && `Köken: ${m.etymology}`].filter(Boolean).join('\n')
}
