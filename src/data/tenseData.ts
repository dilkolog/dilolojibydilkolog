import { addAspect, addTenseSentences, addTenses, tensesLoaded } from '../engine/tenses'

/**
 * The tense tables are their own chunks, fetched once per language when first needed (word page,
 * a conjugation question, the drill); after that every tense works offline.
 */
const LOADERS = {
  fr: () =>
    Promise.all([import('./tenses/fr.json'), import('./tenses/fr-sentences.json'), import('./tenses/fr-aspect.json')]).then(([t, s, a]) => {
      addTenseSentences('fr', s.default as Record<string, Record<string, string>>)
      addAspect('fr', a.default as string[][])
      addTenses('fr', t.default as Record<string, unknown>)
    }),
  es: () =>
    Promise.all([import('./tenses/es.json'), import('./tenses/es-sentences.json'), import('./tenses/es-aspect.json')]).then(([t, s, a]) => {
      addTenseSentences('es', s.default as Record<string, Record<string, string>>)
      addAspect('es', a.default as string[][])
      addTenses('es', t.default as Record<string, unknown>)
    }),
}
const pending = new Map<'fr' | 'es', Promise<void>>()

export function loadTenses(language: 'fr' | 'es' | 'en'): Promise<void> {
  if (language === 'en' || tensesLoaded(language)) return Promise.resolve()
  const waiting = pending.get(language)
  if (waiting) return waiting
  const p = LOADERS[language]()
    .catch(() => {
      pending.delete(language)
    })
  pending.set(language, p)
  return p
}
