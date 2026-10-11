import { recall, remember, type TranslationEntry } from '../engine/translationMemory'
import type { TargetLanguage } from '../engine/types'
import { accessFetch, APPROVAL_MESSAGE, isApprovalRefusal } from './access'
import { db } from './instance'

/**
 * Sentence translation through the app's server (DeepL with the owner's key; see api/translate.ts).
 * Nothing to set up on the device: when the server has no key, `translationReady` says no and
 * the buttons stay hidden. Every translation is kept in the device's translation memory (backed
 * up and synced): asked again, the same text is answered from there, offline too.
 */
export type TranslateLang = TargetLanguage | 'tr'

export class TranslateError extends Error {}

const MAX_CHARS = 600
const cache = new Map<string, Promise<string>>()
let ready: Promise<boolean> | null = null
/** When the server last said no: asked again only after a minute, not on every screen that wants to know. */
let refusedAt = 0
const REFUSAL_MS = 60_000

const MESSAGES: Record<string, string> = {
  quota: 'Bu ayın ücretsiz çeviri kotası doldu; gelecek ay yeniden açılır.',
  busy: 'Çeviri şu an yoğun; birazdan yeniden dene.',
  'bad text': `Çeviri bir seferde en fazla ${MAX_CHARS} karakter.`,
}

/** Whether the server can translate (it has a key and answers). */
export function translationReady(): Promise<boolean> {
  if (typeof navigator !== 'undefined' && !navigator.onLine) return Promise.resolve(false)
  // A real answer carries the month's limit; a page served in its place (no server function) does not.
  // A yes is kept for the session; a no is asked again next time (offline at first, online later).
  if (!ready && Date.now() - refusedAt < REFUSAL_MS) return Promise.resolve(false)
  ready ??= translationUsage().then((u) => {
    const yes = !!u && u.limit > 0
    if (!yes) {
      ready = null
      refusedAt = Date.now()
    }
    return yes
  })
  return ready
}

/** This month's characters translated and the limit; null when unavailable. */
export async function translationUsage(): Promise<{ count: number; limit: number } | null> {
  try {
    const r = await accessFetch('/api/translate?usage=1')
    if (!r.ok) return null
    const u = (await r.json()) as { count?: unknown; limit?: unknown }
    return typeof u.count === 'number' && typeof u.limit === 'number' ? { count: u.count, limit: u.limit } : null
  } catch {
    return null
  }
}

/** Writes one at a time: many translations at once (filling a list) must not overwrite each other. */
let writing: Promise<unknown> = Promise.resolve()
function keep(entry: TranslationEntry) {
  writing = writing.then(async () => db.saveTranslations(remember(await db.getTranslations(), entry))).catch(() => undefined)
  return writing
}

/** The memory, newest first (the translation screen's "recent"). */
export const recentTranslations = () => db.getTranslations()

/** One sentence into Turkish (or `to`), from the learner's language when known. */
export function translate(text: string, from: TranslateLang | undefined, to: TranslateLang = 'tr'): Promise<string> {
  const clean = text.replace(/\*/g, '').trim()
  if (!clean) return Promise.resolve('')
  if (clean.length > MAX_CHARS) return Promise.reject(new TranslateError(MESSAGES['bad text']))
  const key = `${from ?? ''}>${to}:${clean}`
  let p = cache.get(key)
  if (!p) {
    const q = new URLSearchParams({ text: clean, to, ...(from ? { from } : {}) })
    p = db
      .getTranslations()
      .catch(() => [] as TranslationEntry[])
      .then((memory) => recall(memory, clean, from, to)?.translation)
      .then(
        (known) =>
          known ??
          accessFetch(`/api/translate?${q}`)
            .catch(() => {
              throw new TranslateError('Çeviri için internet gerekiyor.')
            })
            .then(async (r) => {
              const body = (await r.json().catch(() => ({}))) as { translation?: string; error?: string }
              if (!r.ok || !body.translation) throw new TranslateError(isApprovalRefusal(body.error) ? APPROVAL_MESSAGE : (MESSAGES[body.error ?? ''] ?? 'Çeviri şu an alınamadı.'))
              void keep({ text: clean, translation: body.translation, ...(from ? { from } : {}), to, at: new Date().toISOString() })
              return body.translation
            }),
      )
    // A failure is not remembered: the next tap tries again.
    p.catch(() => cache.delete(key))
    cache.set(key, p)
  }
  return p
}
