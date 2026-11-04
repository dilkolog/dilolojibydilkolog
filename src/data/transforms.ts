import type { TransformPair } from '../engine/transformPairs'

/**
 * The transform pairs of a language (src/data/transforms/<lang>.json, written by
 * scripts/add-transform-pairs.ts): their own chunk, fetched only when "Zamanı değiştir" opens.
 */
const LOADERS = {
  fr: () => import('./transforms/fr.json'),
  es: () => import('./transforms/es.json'),
}
const cache = new Map<'fr' | 'es', Promise<TransformPair[]>>()

export function loadTransforms(language: 'fr' | 'es'): Promise<TransformPair[]> {
  const hit = cache.get(language)
  if (hit) return hit
  const p = LOADERS[language]()
    .then((m) => m.default as unknown as TransformPair[])
    .catch(() => {
      cache.delete(language)
      return [] as TransformPair[]
    })
  cache.set(language, p)
  return p
}
