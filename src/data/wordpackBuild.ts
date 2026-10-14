import type { Gender, PartOfSpeech, TargetLanguage } from '../engine/types'

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
  /** Part of speech of the word's main entry, as a letter (POS_CODE). */
  p?: string
  /** A French or Spanish noun's gender: m, f, or e (either, by sense). */
  g?: 'm' | 'f' | 'e'
  /** Example sentences with their Turkish (Tatoeba), for the most frequent words: tuple array, columnar { s, t }, or tsv string. */
  c?: [string, string][] | { s: string[]; t: string[] } | string
}

/** Wiktextract's parts of speech, as one letter (the same letters as the Lexique file). */
const POS_LETTER: Record<string, string> = { noun: 'n', verb: 'v', adj: 'a', adv: 'd', prep: 'p', conj: 'c', pron: 'r', phrase: 'h', proverb: 'h' }
export const POS_CODE: Record<string, PartOfSpeech> = { n: 'noun', v: 'verb', a: 'adjective', d: 'adverb', p: 'preposition', c: 'conjunction', r: 'pronoun', h: 'phrase' }
export const genderOfCode = (g: PackRecord['g']): Gender | undefined => (g === 'e' ? 'mf' : g)

/** A noun's gender from its headword template ({{es-noun|f}}): m, f, or e for one that is either by sense. */
export function nounGender(entry: WtEntry, language: TargetLanguage): PackRecord['g'] {
  const arg = entry.head_templates?.find((h) => h.name === `${language}-noun`)?.args?.['1']
  if (!arg) return undefined
  if (/^m(-p)?$/.test(arg)) return 'm'
  if (/^f(-p)?$/.test(arg)) return 'f'
  if (/^(mf|mfbysense|mfequiv|m,f|f,m)/.test(arg)) return 'e'
  return undefined
}

export interface Pack {
  /** Version of the data, to refill words only when it changes. */
  v: string
  w: Record<string, PackRecord>
  /** Inflected forms of the frequency list and the word they belong to: allons → aller, went → go. */
  f?: Record<string, string>
}

/** The fields of a Wiktextract JSONL line that are used here. */
export interface WtEntry {
  word: string
  lang_code?: string
  pos?: string
  senses?: { glosses?: string[]; tags?: string[]; synonyms?: { word?: string }[]; antonyms?: { word?: string }[]; form_of?: { word?: string }[]; alt_of?: { word?: string }[]; translations?: WtTranslation[] }[]
  sounds?: { ipa?: string; mp3_url?: string; ogg_url?: string }[]
  etymology_text?: string
  synonyms?: { word?: string }[]
  antonyms?: { word?: string }[]
  translations?: WtTranslation[]
  head_templates?: { name?: string; args?: Record<string, string> }[]
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

/** Where the prose of an etymology starts once Wiktionary's "Etymology tree" (a list of ancestor forms with no sentence of its own) is set aside. */
const ETYMOLOGY_START =
  /\b(?:From|Borrowed|Inherited|Learned|Semi-learned|Derived|Ultimately|Compound|Back-formation|Clipping|Calque|Possibly|Probably|Perhaps|Uncertain|Unknown|Diminutive|Augmentative|Coined|Named|Partly|Blend|Contraction|Univerbation|Deverbal|Abbreviation|Onomatopoeic|Equivalent|Short|Shortening|Variant|Alteration|Orthographic)\b/

/**
 * An etymology without the "Etymology tree" that Wiktionary prints in front of the prose
 * ("Etymology tree Spanish botica Proto-Indo-European *-nós … Spanish botiquín From botica + -in.")
 * → "From botica + -in."); a text that is only the tree gives nothing.
 */
export function cleanEtymology(text: string | undefined): string | undefined {
  const t = text?.trim()
  if (!t) return undefined
  if (!/^Etymology tree\b/i.test(t)) return t
  const rest = t.replace(/^Etymology tree\b/i, '')
  const at = rest.search(ETYMOLOGY_START)
  return at < 0 ? undefined : rest.slice(at).trim() || undefined
}

/** The first sentence or two of an etymology, short enough to carry for every word. */
export function shortEtymology(text: string | undefined): string | undefined {
  const t = clean(cleanEtymology(text))
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

/**
 * The Turkish equivalents in a Turkish Wiktionary gloss: "ev, konut" → ev, konut. A definition
 * ("bir kişinin içinde yaşadığı yer…"), a note about a form ("aller sözcüğünün çekimi") and
 * anything longer than a few words is not an equivalent and is left out.
 */
export function turkishEquivalents(gloss: string | undefined): string[] {
  if (!gloss || /sözcüğünün|kelimesinin|çoğulu|biçimi|çekimi|anlam|:/.test(gloss)) return []
  // A gloss this long as a whole is a definition, even split at its commas.
  if (gloss.length > 60 || gloss.split(' ').length > 8) return []
  return gloss
    .replace(/\([^)]*\)/g, '')
    .split(/[,;]/)
    .map((x) => clean(x).replace(/\.$/, ''))
    // A Turkish equivalent is written in lower case; "Bir soyadı" (a surname) or an English expansion of
    // an abbreviation ("Subject Expert Teams") is not one.
    .filter((x) => x && x.length <= 40 && x.split(' ').length <= 4 && !/^[A-ZÇĞİÖŞÜ]/.test(x))
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
  /** An inflected form or spelling variant and the word it belongs to (its first such entry). */
  private readonly formOf: Record<TargetLanguage, Map<string, string>> = { en: new Map(), fr: new Map(), es: new Map() }
  /** Turkish Wiktionary's own Turkish glosses of a word, per entry (part of speech), in its order. */
  private readonly trDirect: Record<TargetLanguage, Map<string, { pos?: string; t: string[] }[]>> = { en: new Map(), fr: new Map(), es: new Map() }
  /** Recordings from elsewhere (Lingua Libre on Commons) for words whose Wiktionary entry has none. */
  private readonly audio: Record<TargetLanguage, Map<string, string>> = { en: new Map(), fr: new Map(), es: new Map() }
  /** Turkish words whose translation table in Turkish Wiktionary lists this word (ev → maison). */
  private readonly trReverse: Record<TargetLanguage, Map<string, string[]>> = { en: new Map(), fr: new Map(), es: new Map() }

  private key = (language: TargetLanguage, word: string) => word.toLocaleLowerCase(language)

  private rec(language: TargetLanguage, word: string): PackRecord {
    const key = this.key(language, word)
    let r = this.words[language].get(key)
    if (!r) this.words[language].set(key, (r = {}))
    return r
  }

  private noteForm(language: TargetLanguage, word: string, entry: WtEntry) {
    const base = clean(entry.senses!.flatMap((s) => [...(s.form_of ?? []), ...(s.alt_of ?? [])])[0]?.word)
    const key = this.key(language, word)
    if (base && this.key(language, base) !== key && !this.formOf[language].has(key)) this.formOf[language].set(key, this.key(language, base))
  }

  /** Feeds one dump line. Lines of other languages are ignored; an inflected form only links to its word. */
  add(entry: WtEntry): void {
    const language = entry.lang_code
    if (!isLanguage(language) || !entry.word || /^[-*]/.test(entry.word)) return
    const word = clean(entry.word)
    if (isFormOnly(entry)) {
      this.noteForm(language, word, entry)
    } else {
      // A word can be both: "allons" (an interjection) and a form of aller; the link is kept too.
      if (entry.senses?.some((s) => s.form_of?.length)) this.noteForm(language, word, entry)
      const r = this.rec(language, word)
      const sound = entry.sounds?.find((s) => s.ipa)
      if (!r.i && sound?.ipa) r.i = clean(sound.ipa)
      const audio = entry.sounds?.find((s) => s.mp3_url || s.ogg_url)
      if (!r.a && audio) r.a = audio.mp3_url ?? audio.ogg_url
      if (!r.e) r.e = shortEtymology(entry.etymology_text)
      // The word's first entry is its main one (livre: the masculine "book" before the feminine "pound").
      const pos = POS_LETTER[entry.pos ?? '']
      if (pos && !r.p) r.p = pos
      if (entry.pos === 'noun' && language !== 'en' && !r.g) r.g = nounGender(entry, language)
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

  /**
   * Feeds one line of the Turkish Wiktionary's dump. A French, Spanish or English entry there is
   * defined in Turkish ("maison: ev"): its short glosses are Turkish meanings straight from Turkish
   * editors, no pivot through English. A Turkish entry's translation table gives its word as a
   * meaning of each word it lists (ev → maison, house, casa).
   */
  addTurkish(entry: WtEntry): void {
    if (!entry.word) return
    const polite = (entry.senses ?? []).filter((s) => !s.tags?.some((t) => RUDE.has(t)))
    if (entry.lang_code === 'tr') {
      const head = clean(entry.word)
      if (head.split(' ').length > 3) return
      for (const t of [...(entry.translations ?? []), ...polite.flatMap((s) => s.translations ?? [])]) {
        const code = t.lang_code ?? t.code
        const w = clean(t.word)
        if (!isLanguage(code) || !w) continue
        const key = this.key(code, w)
        this.trReverse[code].set(key, add(this.trReverse[code].get(key), [head], MAX_ROWS) ?? [])
      }
      return
    }
    const language = entry.lang_code
    // Only real parts of speech: not names, abbreviations, prefixes, symbols.
    if (!isLanguage(language) || isFormOnly(entry) || !POS_LETTER[entry.pos ?? '']) return
    const t = polite.filter((s) => !s.form_of?.length).flatMap((s) => turkishEquivalents(s.glosses?.[0]))
    if (!t.length) return
    const key = this.key(language, clean(entry.word))
    this.trDirect[language].set(key, [...(this.trDirect[language].get(key) ?? []), { pos: POS_LETTER[entry.pos ?? ''], t }])
  }

  /** A recording of the word from another source, used when Wiktionary gives none. */
  addAudio(language: TargetLanguage, word: string, url: string): void {
    const key = this.key(language, clean(word))
    if (!this.audio[language].has(key)) this.audio[language].set(key, url)
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
    // Turkish editors' own glosses of the word's main part of speech first (run: koşmak), then the
    // pivot through English, then their glosses of its other parts of speech (koşu), then the Turkish
    // words that list it. A word with no main part of speech known takes Turkish Wiktionary's first.
    const groups = this.trDirect[language].get(key) ?? []
    const main = this.words[language].get(key)?.p ?? groups[0]?.pos
    const isMain = (g: { pos?: string }) => g.pos === main
    let t: string[] | undefined = add(undefined, groups.filter(isMain).flatMap((g) => g.t))
    let x: PackRecord['x']
    for (const { row } of rows) {
      t = add(t, row.words.tr ?? [])
      for (const other of LANGS) {
        if (other === language || !row.words[other]?.length) continue
        x = { ...x, [other]: add(x?.[other], row.words[other]!) }
      }
    }
    t = add(t, groups.filter((g) => !isMain(g)).flatMap((g) => g.t))
    // Last, the Turkish words that list it in their translation table.
    t = add(t, this.trReverse[language].get(key) ?? [])
    return { t, x }
  }

  /** Everything known about one word, or undefined when there is nothing to say. */
  private record(language: TargetLanguage, key: string): PackRecord | undefined {
    const own = this.words[language].get(key)
    if (!own && !this.rows[language].has(key) && !this.trDirect[language].has(key) && !this.trReverse[language].has(key)) return undefined
    const kept = Object.fromEntries(Object.entries({ ...own, ...this.meanings(language, key) }).filter(([, v]) => v !== undefined)) as PackRecord
    if (!Object.keys(kept).length) return undefined
    // A recording from elsewhere only completes a word the pack has anyway.
    if (!kept.a && this.audio[language].has(key)) kept.a = this.audio[language].get(key)
    return kept
  }

  /**
   * The pack for one language: the wanted words (a frequency list) that have something to say, up to
   * `limit`. A frequency list counts forms (subtitles say "allons", not "aller"), so a form brings in
   * the word it belongs to, at the form's rank, and is kept in `f` so a search for it finds the word.
   */
  finish(language: TargetLanguage, wanted: readonly string[], version: string, limit = Infinity): Pack {
    const w: Record<string, PackRecord> = {}
    const f: Record<string, string> = {}
    let n = 0
    const take = (key: string) => {
      if (w[key]) return true
      if (n >= limit) return false
      const r = this.record(language, key)
      if (!r) return false
      w[key] = r
      n++
      return true
    }
    // A word of its own that is also a form ("allons !", agua) links on only to a frequent word (aller,
    // not aguar): a rare verb behind a common noun is noise.
    const frequent = new Set(wanted.map((w) => this.key(language, w)))
    for (const word of wanted) {
      const key = this.key(language, word)
      const own = take(key)
      const base = this.formOf[language].get(key)
      if (base && (!own || frequent.has(base)) && take(base)) f[key] = base
      if (n >= limit) break
    }
    return { v: version, w, ...(Object.keys(f).length ? { f } : {}) }
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
  const keys = ['t', 'i', 'a', 'e', 's', 'n', 'x', 'p', 'g', 'c'] as const
  const countOf = (r: PackRecord, k: (typeof keys)[number]) => {
    if (k === 'x') return Object.keys(r.x ?? {}).length
    if (k === 'c') return r.c ? 1 : 0
    const v = r[k]
    return typeof v === 'string' || Array.isArray(v) ? v.length : v ? 1 : 0
  }
  const coverage = Object.fromEntries(keys.map((k) => [k, records.length ? records.filter((r) => countOf(r, k)).length / records.length : 0])) as PackStats['coverage']
  return { words: records.length, bytes: JSON.stringify(pack).length, coverage }
}
