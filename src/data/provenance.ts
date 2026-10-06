import type { FieldSource, VocabularyEntry } from '../engine/types'

/**
 * Where a word's data came from. Each field the app fills by itself (pronunciation, a definition,
 * real sentences, a picture…) gets a note: the source and a fingerprint of what was written. While
 * the value still matches its fingerprint nobody has touched it, so a newer source may replace it;
 * once it differs it is the learner's own and is left alone. No hook is needed in each edit form.
 */
export type SourceKind = FieldSource['kind']

export const FIELDS = ['ipa', 'audio', 'definition', 'corpus', 'image', 'gender', 'partOfSpeech', 'etymology', 'synonyms', 'translations'] as const
export type FieldName = (typeof FIELDS)[number]

export const FIELD_LABEL: Record<FieldName, string> = {
  ipa: 'Telaffuz',
  audio: 'Ses kaydı',
  definition: 'Tanım',
  corpus: 'Gerçek cümleler',
  image: 'Görsel',
  gender: 'Cinsiyet',
  partOfSpeech: 'Tür',
  etymology: 'Köken',
  synonyms: 'Eş anlamlılar',
  translations: 'Diğer dillerdeki karşılıklar',
}

export const SOURCE_INFO: Record<SourceKind, { name: string; license: string }> = {
  pack: { name: 'Sözlük paketi (Wiktionary)', license: 'CC BY-SA' },
  wiktionary: { name: 'Wiktionary', license: 'CC BY-SA' },
  tatoeba: { name: 'Tatoeba', license: 'CC BY 2.0 FR' },
  commons: { name: 'Wikimedia Commons / Openverse', license: 'görselin kendi lisansı' },
  wikidata: { name: 'Wikidata', license: 'CC0' },
  lexique: { name: 'Lexique 3.83', license: 'CC BY-SA' },
  ai: { name: 'Yapay zekâ', license: '' },
}

const get: Record<FieldName, (e: VocabularyEntry) => unknown> = {
  ipa: (e) => e.ipa,
  audio: (e) => e.audioUrl,
  definition: (e) => e.senses[0]?.definition,
  corpus: (e) => e.corpus,
  image: (e) => e.imageId,
  gender: (e) => e.gender,
  partOfSpeech: (e) => e.partOfSpeech,
  etymology: (e) => e.etymology,
  synonyms: (e) => e.synonyms,
  translations: (e) => e.translations,
}

export const valueOf = (e: VocabularyEntry, field: FieldName): unknown => get[field](e)

const isEmpty = (v: unknown) => v === undefined || v === null || v === '' || (Array.isArray(v) && v.length === 0) || (typeof v === 'object' && !Array.isArray(v) && Object.keys(v as object).length === 0)

/** FNV-1a over the JSON of a value: short, stable, enough to tell "edited" from "not edited". */
export function hashOf(value: unknown): string {
  const text = JSON.stringify(value ?? null)
  let h = 0x811c9dc5
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i)
    h = Math.imul(h, 0x01000193)
  }
  return (h >>> 0).toString(36)
}

/** `entry` with the fingerprint of each listed field recorded, as written by the given source. Call after the value is set. */
export function withSources(entry: VocabularyEntry, kinds: Partial<Record<FieldName, SourceKind>>, now = new Date()): VocabularyEntry {
  const sources = { ...entry.sources }
  for (const [field, kind] of Object.entries(kinds) as [FieldName, SourceKind][]) {
    if (isEmpty(valueOf(entry, field))) delete sources[field]
    else sources[field] = { kind, h: hashOf(valueOf(entry, field)), at: now.toISOString() }
  }
  return { ...entry, sources }
}

/** A database patch that also records the sources of the fields it writes: `db.vocabulary.update(id, patchWithSources(base, patch, {...}))`. */
export function patchWithSources(base: VocabularyEntry, patch: Partial<VocabularyEntry>, kinds: Partial<Record<FieldName, SourceKind>>, now = new Date()): Partial<VocabularyEntry> {
  const merged = withSources({ ...base, ...patch }, kinds, now)
  return { ...patch, sources: merged.sources }
}

/** Written by a source and not changed since. */
export function isUntouched(entry: VocabularyEntry, field: FieldName): boolean {
  const s = entry.sources?.[field]
  return !!s && s.h === hashOf(valueOf(entry, field))
}

/** An automatic fill may write this field: it is empty, or only ever filled by a source and never edited. */
export function canFill(entry: VocabularyEntry, field: FieldName): boolean {
  return isEmpty(valueOf(entry, field)) || isUntouched(entry, field)
}

export type Origin = { kind: SourceKind; at: string } | { kind: 'user' } | { kind: 'unknown' }

/** Who wrote what is in the field now; null for an empty field. */
export function originOf(entry: VocabularyEntry, field: FieldName): Origin | null {
  if (isEmpty(valueOf(entry, field))) return null
  const s = entry.sources?.[field]
  if (!s) return { kind: 'unknown' }
  return s.h === hashOf(valueOf(entry, field)) ? { kind: s.kind, at: s.at } : { kind: 'user' }
}

/** The fields a source filled (or that were edited after), each with its origin, for the word page's source list. */
export function originsOf(entry: VocabularyEntry): { field: FieldName; origin: Origin }[] {
  return FIELDS.flatMap((field) => {
    const origin = originOf(entry, field)
    return origin && origin.kind !== 'unknown' ? [{ field, origin }] : []
  })
}
