import { TARGET_LANGUAGES } from '../engine/types'
import { growthStage } from '../engine/growth'
import { readingKey } from '../engine/reading'
import { displayForm } from '../engine/exercises'
import type { KelimeDB } from '../data/db'
import { APP_SOURCE, EXT_SOURCE, type AppMessage, type ExtData, type ExtListWord, type ExtMessage } from './extensionProtocol'

export type { ExtData, ExtLanguageData, ExtListWord } from './extensionProtocol'

/**
 * Talks to the Kelime Koçu browser extension through its bridge script, which runs only on this
 * app's own pages. The app sends what the extension needs to colour words on other sites; the
 * extension sends back words marked known or ignored there. Nothing leaves the device.
 */

export async function extensionData(db: KelimeDB): Promise<ExtData> {
  const states = new Map((await db.wordStates.toArray()).map((s) => [s.entryId, s]))
  const out = {} as ExtData
  for (const language of TARGET_LANGUAGES) {
    const vocabulary = (await db.vocabulary.where('language').equals(language).toArray()).filter((e) => e.source !== 'sample')
    const list: ExtListWord[] = []
    for (const e of vocabulary) {
      const st = states.get(e.id)
      const base = { id: e.id, w: displayForm(e), g: e.senses[0]?.gloss ?? '', s: st ? growthStage(st) : -1 }
      for (const form of [e.lemma, ...(e.alternativeForms ?? [])]) if (!form.includes(' ')) list.push({ ...base, k: readingKey(form, language) })
    }
    out[language] = { list, known: [...(await db.getKnownWords(language))], ignored: [...(await db.getIgnored(language))] }
  }
  return out
}

let present = false
let pending: ReturnType<typeof setTimeout> | undefined

const post = (m: AppMessage) => window.postMessage(m, location.origin)

/** Sends fresh data if the extension is there (debounced: reloads come in bursts). */
export function pushToExtension(db: KelimeDB) {
  if (!present) return
  clearTimeout(pending)
  pending = setTimeout(async () => post({ source: APP_SOURCE, type: 'data', data: await extensionData(db) }), 800)
}

/** Listens for the extension; `onMarks` runs after words marked on other sites were saved. */
export function connectExtension(db: KelimeDB, onMarks: () => void): () => void {
  const onMessage = async (e: MessageEvent) => {
    if (e.source !== window || e.origin !== location.origin) return
    const m = e.data as ExtMessage | undefined
    if (m?.source !== EXT_SOURCE) return
    if (m.type === 'hello') {
      present = true
      pushToExtension(db)
    } else if (m.type === 'marks') {
      let changed = false
      for (const language of TARGET_LANGUAGES) {
        const known = (m.known[language] ?? []).filter((k) => typeof k === 'string')
        if (known.length) {
          await db.addKnownWords(language, known)
          changed = true
        }
        for (const k of m.ignored[language] ?? []) if (typeof k === 'string') {
          await db.setIgnored(language, k, true)
          changed = true
        }
      }
      post({ source: APP_SOURCE, type: 'ack' })
      if (changed) onMarks()
    }
  }
  window.addEventListener('message', onMessage)
  // The bridge may have loaded first: ask it to say hello.
  post({ source: APP_SOURCE, type: 'ping' })
  return () => window.removeEventListener('message', onMessage)
}
