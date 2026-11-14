import type { TargetLanguage } from '../engine/types'
import type { PtePack } from './pte'

const FILES = import.meta.glob<PtePack>('./pte/*.json', { import: 'default' })

/** The PTE-style practice of a language (English only for now), loaded when the exams screen asks: not part of the first screen. */
export async function loadPte(language: TargetLanguage): Promise<PtePack | null> {
  const load = FILES[`./pte/${language}.json`]
  return load ? await load() : null
}
