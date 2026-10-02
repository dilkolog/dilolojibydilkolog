import type { ExtData } from '../../src/ui/extensionProtocol'
import type { TargetLanguage } from '../../src/engine/types'

export const APP_URL = 'https://kelime-koc.vercel.app'

/** off: nothing coloured; list: only words in your list; all: list words and every new word. */
export type Mode = 'off' | 'list' | 'all'

export interface ExtSettings {
  mode: Mode
  /** On Turkish pages, show a few of your words in the target language (Toucan style). */
  turkish: boolean
  turkishLang: TargetLanguage
}

export const DEFAULTS: ExtSettings = { mode: 'list', turkish: false, turkishLang: 'en' }

export interface Stored {
  settings?: ExtSettings
  data?: ExtData
  syncedAt?: string
  /** Marked on other sites, waiting for the app to pick them up. */
  pendingKnown?: Partial<Record<TargetLanguage, string[]>>
  pendingIgnored?: Partial<Record<TargetLanguage, string[]>>
}

export const getStored = () => chrome.storage.local.get(null) as Promise<Stored>

/** Opens the app, which keeps the sentence as a sentence card. */
export function sentenceUrl(sentence: string, focus: string, lang: string, src: string): string {
  return `${APP_URL}/?${new URLSearchParams({ sentence: sentence.slice(0, 500), focus, lang, src })}`
}

export function addUrl(word: string, context: string, lang: string | null, src: string): string {
  const q = new URLSearchParams({ add: word, context: context.slice(0, 400), src })
  if (lang) q.set('lang', lang)
  return `${APP_URL}/?${q}`
}
