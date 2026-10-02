import type { TargetLanguage } from '../engine/types'

/** Messages and data shared by the app and the browser extension (kept free of app code, so the extension's bridge stays tiny). */

/** One list word, keyed the way reading mode matches running text. */
export interface ExtListWord {
  k: string
  id: string
  w: string
  g: string
  /** Growth stage 0–5; -1 = in the list, not studied yet. */
  s: number
}

export interface ExtLanguageData {
  list: ExtListWord[]
  known: string[]
  ignored: string[]
}

export type ExtData = Record<TargetLanguage, ExtLanguageData>

export const APP_SOURCE = 'kelime-koc-app'
export const EXT_SOURCE = 'kelime-koc-ext'

export type AppMessage = { source: typeof APP_SOURCE; type: 'data'; data: ExtData } | { source: typeof APP_SOURCE; type: 'ping' } | { source: typeof APP_SOURCE; type: 'ack' }
export type ExtMessage =
  | { source: typeof EXT_SOURCE; type: 'hello' }
  | {
      source: typeof EXT_SOURCE
      type: 'marks'
      known: Partial<Record<TargetLanguage, string[]>>
      ignored: Partial<Record<TargetLanguage, string[]>>
      /** List words met on web pages: entry id → where and when (once per page). */
      sightings?: Record<string, { at: string; host: string }[]>
    }
