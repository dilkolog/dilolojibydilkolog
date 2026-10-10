import type { TargetLanguage, VocabularyEntry } from '../engine/types'
import type {
  ChatReply,
  ChatRequest,
  ErrorReport,
  ErrorReportRequest,
  SessionNoteRequest,
  PersonalSentence,
  PersonalSentencesRequest,
  PrequestionSet,
  EnrichRequest,
  EpisodeDraft,
  EpisodeRequest,
  FamilySuggestion,
  FieldSuggestions,
  JournalRequest,
  JournalReview,
  Mnemonic,
  RetellEvaluation,
  RetellRequest,
  SentenceEvaluation,
  SuggestRequest,
  WordInfo,
} from './types'

export * from './types'
export * from './usage'

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

export const evaluateTranslation = async (apiKey: string, entry: VocabularyEntry, turkish: string, reference: string, attempt: string): Promise<SentenceEvaluation> =>
  (await sdk()).evaluateTranslation(apiKey, entry, turkish, reference, attempt)

export const evaluateRetelling = async (apiKey: string, req: RetellRequest): Promise<RetellEvaluation> => (await sdk()).evaluateRetelling(apiKey, req)

export const reviewJournal = async (apiKey: string, req: JournalRequest): Promise<JournalReview> => (await sdk()).reviewJournal(apiKey, req)

export const prequestions = async (apiKey: string, language: TargetLanguage, text: string): Promise<PrequestionSet> => (await sdk()).prequestions(apiKey, language, text)
export const monthlyReport = async (apiKey: string, req: ErrorReportRequest): Promise<ErrorReport> => (await sdk()).monthlyReport(apiKey, req)
export const personalSentences = async (apiKey: string, req: PersonalSentencesRequest): Promise<PersonalSentence[]> => (await sdk()).personalSentences(apiKey, req)
export const sessionNote = async (apiKey: string, req: SessionNoteRequest): Promise<string> => (await sdk()).sessionNote(apiKey, req)
export const chatTurn = async (apiKey: string, req: ChatRequest): Promise<ChatReply> => (await sdk()).chatTurn(apiKey, req)

export const writeEpisode = async (apiKey: string, req: EpisodeRequest): Promise<EpisodeDraft> => (await sdk()).writeEpisode(apiKey, req)

export const createMnemonic = async (apiKey: string, entry: VocabularyEntry): Promise<Mnemonic> => (await sdk()).createMnemonic(apiKey, entry)
export const suggestFamily = async (apiKey: string, entry: VocabularyEntry, have: string[]): Promise<FamilySuggestion[]> => (await sdk()).suggestFamily(apiKey, entry, have)

/** Turns a mnemonic into the text saved in the word's note. */
export function mnemonicNote(m: Mnemonic): string {
  return [m.soundAlike, m.scene, m.etymology && `Köken: ${m.etymology}`].filter(Boolean).join('\n')
}
