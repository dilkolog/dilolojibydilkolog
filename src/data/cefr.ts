import { parseCefrList, type CefrList } from '../engine/cefrLevels'
import type { TargetLanguage } from '../engine/types'

/**
 * The CEFR word levels (see cefr/SOURCE.md), French and Spanish; none for English yet. Each list is
 * its own chunk, loaded only when needed.
 */
const LOADERS: Partial<Record<TargetLanguage, () => Promise<{ default: string }>>> = {
  fr: () => import('./cefr/fr.txt?raw'),
  es: () => import('./cefr/es.txt?raw'),
}

const cache = new Map<TargetLanguage, Promise<CefrList | null>>()

export function loadCefr(language: TargetLanguage): Promise<CefrList | null> {
  let p = cache.get(language)
  if (!p) {
    const load = LOADERS[language]
    p = load ? load().then((m) => parseCefrList(m.default)) : Promise.resolve(null)
    cache.set(language, p)
  }
  return p
}
