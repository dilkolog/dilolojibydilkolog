import type { TargetLanguage } from '../engine/types'

/**
 * The word pack, built offline from Wiktionary's structured dump (Wiktextract, https://kaikki.org;
 * CC BY-SA). This file is the pure part (no files, no network) so it can be tested; the command
 * line wrapper is scripts/build-wordpack.ts.
 *
 * What goes in: for each word, its Turkish meanings, pronunciation, a recording, where it comes
 * from, synonyms and antonyms, and the word in the other two languages. English Wiktionary only
 * keeps translation tables under its English entries ("decide: fr décider, es decidir, tr karar
 * vermek"), so French and Spanish words get their Turkish meanings and each other by pivoting
 * through English: words in one table row are the same meaning.
 */

export interface PackRecord {
  /** Turkish meanings. */
  t?: string[]
  /** IPA. */
  i?: string
  /** A recording (URL). */
  a?: string
  /** Where the word comes from. */
  e?: string
  /** Synonyms and antonyms. */
  s?: string[]
  n?: string[]
  /** The word in other languages. */
  x?: Partial<Record<TargetLanguage, string[]>>
}

export interface Pack {
  /** Version of the data, to refill words only when it changes. */
  v: string
  w: Record<string, PackRecord>
}

/** The fields of a Wiktextract JSONL line that are used here. */
export interface WtEntry {
  word: string
  lang_code?: string
  pos?: string
  senses?: { glosses?: string[]; tags?: string[]; synonyms?: { word?: string }[]; antonyms?: { word?: string }[]; form_of?: unknown[]; alt_of?: unknown[]; translations?: WtTranslation[] }[]
  sounds?: { ipa?: string; mp3_url?: string; ogg_url?: string }[]
  etymology_text?: string
  synonyms?: { word?: string }[]
  antonyms?: { word?: string }[]
  translations?: WtTranslation[]
}

export interface WtTranslation {
  lang_code?: string
  code?: string
  word?: string
  sense?: string
}

const LANGS: TargetLanguage[] = ['en', 'fr', 'es']
const MAX_LIST = 4
const MAX_SYN = 6
const MAX_ETYMOLOGY = 220
/** Translation rows kept per word before ordering; plenty for the four meanings that are shown. */
const MAX_ROWS = 40
/** Senses with these tags are not offered as meanings (their translations are left out). */
const RUDE = new Set(['vulgar', 'offensive', 'derogatory', 'slur'])

/**
 * The English equivalents a French or Spanish entry gives, in its own order:
 * "to run, to jog (quickly)" → run, jog. Used to put the main meaning first.
 */
export function glossHeads(glosses: readonly string[]): string[] {
  return glosses
    .flatMap((g) => g.replace(/\([^)]*\)/g, '').split(/[,;]/))
    .map((h) => clean(h).replace(/^(to|a|an|the) /i, '').toLowerCase())
    .filter((h) => h && h.split(' ').length <= 3)
}

const clean = (s: string | undefined) => (s ?? '').replace(/\s+/g, ' ').trim()
const isLanguage = (c: string | undefined): c is TargetLanguage => c === 'en' || c === 'fr' || c === 'es'

function add(list: string[] | undefined, words: readonly string[], max = MAX_LIST): string[] | undefined {
  const out = [...(list ?? [])]
  for (const w of words) if (w && !out.includes(w) && out.length < max) out.push(w)
  return out.length ? out : undefined
}

/** The first sentence or two of an etymology, short enough to carry for every word. */
export function shortEtymology(text: string | undefined): string | undefined {
  const t = clean(text)
  if (!t) return undefined
  const sentences = t.match(/[^.!?]+[.!?]+(\s|$)/g) ?? [t]
  let out = ''
  for (const s of sentences) {
    if ((out + s).length > MAX_ETYMOLOGY && out) break
    out += s
  }
  out = clean(out)
  return out.length > MAX_ETYMOLOGY ? out.slice(0, MAX_ETYMOLOGY - 1).trimEnd() + '…' : out
}

/** Only an inflected form or spelling variant of another word: its data belongs to the main entry. */
const isFormOnly = (e: WtEntry) => !!e.senses?.length && e.senses.every((s) => s.form_of?.length || s.alt_of?.length)

/** One row of an English translation table: words that share one English meaning. */
interface Row {
  en: string
  words: Partial<Record<TargetLanguage | 'tr', string[]>>
}

export class PackBuilder {
  private readonly words: Record<TargetLanguage, Map<string, PackRecord>> = { en: new Map(), fr: new Map(), es: new Map() }
  /** Rows each word appears in, ordered only at the end (the English dump may come before or after the word's own). */
  private readonly rows: Record<TargetLanguage, Map<string, Row[]>> = { en: new Map(), fr: new Map(), es: new Map() }
  /** A French or Spanish word's English equivalents from its own entry, main meaning first. */
  private readonly heads: Record<TargetLanguage, Map<string, string[]>> = { en: new Map(), fr: new Map(), es: new Map() }

  private key = (language: TargetLanguage, word: string) => word.toLocaleLowerCase(language)

  private rec(language: TargetLanguage, word: string): PackRecord {
    const key = this.key(language, word)
    let r = this.words[language].get(key)
    if (!r) this.words[language].set(key, (r = {}))
    return r
  }

  /** Feeds one dump line. Lines of other languages and of inflected forms are ignored. */
  add(entry: WtEntry): void {
    const language = entry.lang_code
    if (!isLanguage(language) || !entry.word || /^[-*]/.test(entry.word)) return
    const word = clean(entry.word)
    if (!isFormOnly(entry)) {
      const r = this.rec(language, word)
      const sound = entry.sounds?.find((s) => s.ipa)
      if (!r.i && sound?.ipa) r.i = clean(sound.ipa)
      const audio = entry.sounds?.find((s) => s.mp3_url || s.ogg_url)
      if (!r.a && audio) r.a = audio.mp3_url ?? audio.ogg_url
      if (!r.e) r.e = shortEtymology(entry.etymology_text)
      const names = (xs: { word?: string }[] | undefined) => (xs ?? []).map((x) => clean(x.word)).filter(Boolean)
      r.s = add(r.s, [...names(entry.synonyms), ...(entry.senses ?? []).flatMap((s) => names(s.synonyms))], MAX_SYN)
      r.n = add(r.n, [...names(entry.antonyms), ...(entry.senses ?? []).flatMap((s) => names(s.antonyms))], MAX_SYN)
      if (language !== 'en') {
        const polite = (entry.senses ?? []).filter((s) => !s.tags?.some((t) => RUDE.has(t)))
        const key = this.key(language, word)
        this.heads[language].set(key, [...(this.heads[language].get(key) ?? []), ...glossHeads(polite.flatMap((s) => s.glosses ?? []))])
      }
    }
    if (language !== 'en') return
    // Translation tables sit on the entry in older dumps and on each sense in newer ones; a rude sense's are left out.
    const senses = entry.senses ?? []
    const allRude = senses.length > 0 && senses.every((s) => s.tags?.some((t) => RUDE.has(t)))
    const translations = [...(allRude ? [] : (entry.translations ?? [])), ...senses.filter((s) => !s.tags?.some((t) => RUDE.has(t))).flatMap((s) => s.translations ?? [])]
    if (translations.length) this.pivot(word, translations)
  }

  /** Words in one translation row (same English meaning) are translations of each other, and of the Turkish ones. */
  private pivot(english: string, translations: readonly WtTranslation[]) {
    const rows = new Map<string, Row>()
    for (const t of translations) {
      const code = t.lang_code ?? t.code
      const w = clean(t.word)
      if (!w || !code || (!isLanguage(code) && code !== 'tr')) continue
      const row = rows.get(t.sense ?? '') ?? { en: english, words: { en: [english] } }
      row.words[code] = add(row.words[code], [w], Infinity)
      rows.set(t.sense ?? '', row)
    }
    for (const row of rows.values()) {
      for (const language of LANGS) {
        for (const w of row.words[language] ?? []) {
          const key = this.key(language, w)
          const list = this.rows[language].get(key) ?? []
          if (list.length < MAX_ROWS) list.push(row)
          this.rows[language].set(key, list)
        }
      }
    }
  }

  /** Turkish meanings and other-language forms of a word, main meaning first (by its own entry's order). */
  private meanings(language: TargetLanguage, key: string): Pick<PackRecord, 't' | 'x'> {
    const heads = this.heads[language].get(key) ?? []
    const rank = (row: Row) => {
      const i = heads.indexOf(row.en.toLowerCase())
      return i < 0 ? Infinity : i
    }
    const rows = (this.rows[language].get(key) ?? []).map((row, i) => ({ row, i })).sort((a, b) => rank(a.row) - rank(b.row) || a.i - b.i)
    let t: string[] | undefined
    let x: PackRecord['x']
    for (const { row } of rows) {
      t = add(t, row.words.tr ?? [])
      for (const other of LANGS) {
        if (other === language || !row.words[other]?.length) continue
        x = { ...x, [other]: add(x?.[other], row.words[other]!) }
      }
    }
    return { t, x }
  }

  /**
   * The pack for one language: only the wanted words (a frequency list), and only those with
   * something to say. `limit` keeps the file small: the first `limit` of `wanted` that have data.
   */
  finish(language: TargetLanguage, wanted: readonly string[], version: string, limit = Infinity): Pack {
    const w: Record<string, PackRecord> = {}
    let n = 0
    for (const word of wanted) {
      if (n >= limit) break
      const key = this.key(language, word)
      const own = this.words[language].get(key)
      if (!own && !this.rows[language].has(key)) continue
      const r = { ...own, ...this.meanings(language, key) }
      const kept = Object.fromEntries(Object.entries(r).filter(([, v]) => v !== undefined)) as PackRecord
      if (!Object.keys(kept).length) continue
      w[key] = kept
      n++
    }
    return { v: version, w }
  }
}

export interface PackStats {
  words: number
  bytes: number
  /** Share of words with each field. */
  coverage: Record<keyof PackRecord, number>
}

/** What a pack holds, for the build script to print before anyone ships it. */
export function packStats(pack: Pack): PackStats {
  const records = Object.values(pack.w)
  const keys = ['t', 'i', 'a', 'e', 's', 'n', 'x'] as const
  const coverage = Object.fromEntries(keys.map((k) => [k, records.length ? records.filter((r) => (k === 'x' ? Object.keys(r.x ?? {}).length : r[k]?.length)).length / records.length : 0])) as PackStats['coverage']
  return { words: records.length, bytes: JSON.stringify(pack).length, coverage }
}
