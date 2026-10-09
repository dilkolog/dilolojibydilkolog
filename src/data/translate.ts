import type { TargetLanguage } from '../engine/types'

/**
 * Sentence translation through the app's server (DeepL with the owner's key; see api/translate.ts).
 * Nothing to set up on the device: when the server has no key, `translationReady` says no and
 * the buttons stay hidden. Translations are kept for the session, and the server's CDN keeps them
 * for good, so a sentence is paid for once.
 */
export type TranslateLang = TargetLanguage | 'tr'

export class TranslateError extends Error {}

const MAX_CHARS = 600
const cache = new Map<string, Promise<string>>()
let ready: Promise<boolean> | null = null

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
  ready ??= translationUsage().then((u) => {
    const yes = !!u && u.limit > 0
    if (!yes) ready = null
    return yes
  })
  return ready
}

/** This month's characters translated and the limit; null when unavailable. */
export async function translationUsage(): Promise<{ count: number; limit: number } | null> {
  try {
    const r = await fetch('/api/translate?usage=1')
    if (!r.ok) return null
    const u = (await r.json()) as { count?: unknown; limit?: unknown }
    return typeof u.count === 'number' && typeof u.limit === 'number' ? { count: u.count, limit: u.limit } : null
  } catch {
    return null
  }
}

/** One sentence into Turkish (or `to`), from the learner's language when known. */
export function translate(text: string, from: TranslateLang | undefined, to: TranslateLang = 'tr'): Promise<string> {
  const clean = text.replace(/\*/g, '').trim()
  if (!clean) return Promise.resolve('')
  if (clean.length > MAX_CHARS) return Promise.reject(new TranslateError(MESSAGES['bad text']))
  const key = `${from ?? ''}>${to}:${clean}`
  let p = cache.get(key)
  if (!p) {
    const q = new URLSearchParams({ text: clean, to, ...(from ? { from } : {}) })
    p = fetch(`/api/translate?${q}`)
      .catch(() => {
        throw new TranslateError('Çeviri için internet gerekiyor.')
      })
      .then(async (r) => {
        const body = (await r.json().catch(() => ({}))) as { translation?: string; error?: string }
        if (!r.ok || !body.translation) throw new TranslateError(MESSAGES[body.error ?? ''] ?? 'Çeviri şu an alınamadı.')
        return body.translation
      })
    // A failure is not remembered: the next tap tries again.
    p.catch(() => cache.delete(key))
    cache.set(key, p)
  }
  return p
}
