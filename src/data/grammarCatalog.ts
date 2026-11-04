import fr from './grammarCatalog/fr.json'
import es from './grammarCatalog/es.json'
import type { TargetLanguage } from '../engine/types'

export const CATALOG_LEVELS = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'] as const
export type CatalogLevel = (typeof CATALOG_LEVELS)[number]
export type GrammarLevelFilter = CatalogLevel | 'all' | 'B2-C1'
export const matchesGrammarLevel = (level: string, filter: GrammarLevelFilter) => filter === 'all' || (filter === 'B2-C1' ? level === 'B2' || level === 'C1' : level === filter)

export interface GrammarTopic {
  /** Stable key, shared with exercise.topic when questions are added. */
  id: string
  level: CatalogLevel
  title: string
  description: string
}

export interface GrammarCategory {
  id: string
  title: string
  description: string
  topics: GrammarTopic[]
}

const catalogs = { fr, es } as Record<'fr' | 'es', GrammarCategory[]>
export const grammarCatalog = (language: TargetLanguage): readonly GrammarCategory[] => language === 'en' ? [] : catalogs[language]
const names = new Map([...fr, ...es].flatMap((g) => g.topics.map((t) => [t.id, t.title] as const)))
export const catalogTopicName = (id: string) => names.get(id)

/** Accent and Turkish casing tolerant, so both "subjonctif" and "sıfat" are easy to find. */
export const grammarSearchKey = (text: string) => text.normalize('NFD').replace(/\p{M}/gu, '').replace(/ı/g, 'i').toLowerCase().trim()
