import { addTenses, tensesLoaded } from '../engine/tenses'

/**
 * The tense tables are their own chunks, fetched once per language when first needed (word page,
 * a conjugation question, the drill); after that every tense works offline.
 */
const LOADERS = { fr: () => import('./tenses/fr.json'), es: () => import('./tenses/es.json') }
const pending = new Map<'fr' | 'es', Promise<void>>()

export function loadTenses(language: 'fr' | 'es' | 'en'): Promise<void> {
  if (language === 'en' || tensesLoaded(language)) return Promise.resolve()
  const waiting = pending.get(language)
  if (waiting) return waiting
  const p = LOADERS[language]()
    .then((m) => addTenses(language, m.default as Record<string, unknown>))
    .catch(() => {
      pending.delete(language)
    })
  pending.set(language, p)
  return p
}
