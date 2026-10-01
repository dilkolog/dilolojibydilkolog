import type { TargetLanguage, VocabularyEntry } from '../engine/types'
import type { EnrichRequest, SentenceEvaluation, WordInfo } from './types'

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

export const evaluateSentence = async (apiKey: string, entry: VocabularyEntry, sentence: string): Promise<SentenceEvaluation> =>
  (await sdk()).evaluateSentence(apiKey, entry, sentence)
