import { normalize, splitArticle, stripDiacritics } from '../engine/answerCheck'
import type { Gender, TargetLanguage, VocabularyEntry } from '../engine/types'
import type { KelimeDB } from './db'
import { loadFrequency } from './frequency'
import { englishGloss, fetchPages, languageSection } from './wiktionary'

/**
 * Pronunciation, a definition in the language itself and the word family, from Wiktionary
 * (CC BY-SA). French and Spanish come from their own Wiktionaries (definitions written by
 * native speakers); audio, and anything missing, from the English one.
 */

/** A French/Spanish noun's gender from its English-Wiktionary headword ({{fr-noun|f}}, {{es-noun|m}}). */
export function nounGender(section: string, language: TargetLanguage): Gender | undefined {
  if (language === 'en') return undefined
  const g = section.match(new RegExp(`\\{\\{${language}-noun\\|(m|f)\\b`))?.[1]
  return g === 'm' || g === 'f' ? g : undefined
}

export interface WordInfo {
  /** "/de.si.de/" */
  ipa?: string
  /** A native speaker saying the word (MP3 from Wikimedia Commons). */
  audioUrl?: string
  /** First definition, in the word's own language. */
  definition?: string
  /** Derived and related words: décider → décision, indécis, décideur… */
  family: string[]
  /** Noun gender, for nouns entered without a telling article (l'arbre, les gens). */
  gender?: Gender
}

// ---------------------------------------------------------------------------
// Wikitext to plain text
// ---------------------------------------------------------------------------

/** Templates whose content is part of the sentence: which argument holds the text. */
const KEEP_ARG: Record<string, number> = { l: 2, m: 2, lien: 1, w: 1, plm: 1, 'l-self': 2, 'm-self': 2, link: 1, nobr: 1, smallcaps: 1, term: 1 }

export function wikiToText(s: string): string {
  let t = s.replace(/<ref[^>]*\/>/g, '').replace(/<ref[^>]*>[\s\S]*?<\/ref>/g, '').replace(/<[^>]+>/g, '')
  // Innermost templates first, until none are left.
  for (let i = 0; i < 6 && /\{\{/.test(t); i++) {
    t = t.replace(/\{\{([^{}]*)\}\}/g, (_, body: string) => {
      const args = body.split('|').map((a) => a.trim())
      const name = args[0].toLowerCase()
      const at = KEEP_ARG[name]
      if (at === undefined) return ''
      const positional = args.slice(1).filter((a) => !/^[a-z0-9]+=/.test(a))
      const v = positional[at - 1] ?? positional.at(-1) ?? ''
      return name === 'plm' ? v.charAt(0).toUpperCase() + v.slice(1) : v
    })
  }
  t = t.replace(/\[\[(?:[^\]|]*\|)?([^\]]*)\]\]/g, '$1').replace(/'{2,}/g, '')
  t = t.replace(/\s+/g, ' ').replace(/\s+([,.;:])/g, '$1').replace(/^[\s,;:.]+/, '').replace(/\(\s*\)/g, '').trim()
  return t.charAt(0).toUpperCase() + t.slice(1)
}

// ---------------------------------------------------------------------------
// Sections per Wiktionary
// ---------------------------------------------------------------------------

/** French Wiktionary: "== {{langue|fr}} ==" … next language. */
function frSection(text: string): string | null {
  const start = text.search(/^==\s*\{\{langue\|fr\}\}\s*==/m)
  if (start < 0) return null
  const rest = text.slice(start + 10)
  const end = rest.search(/^==\s*\{\{langue\|/m)
  return end < 0 ? rest : rest.slice(0, end)
}

/** Spanish Wiktionary: "== {{lengua|es}} ==" … next level-2 heading. */
function esSection(text: string): string | null {
  const start = text.search(/^==\s*\{\{lengua\|es\}\}\s*==/m)
  if (start < 0) return null
  const rest = text.slice(start + 10)
  const end = rest.search(/^==[^=]/m)
  return end < 0 ? rest : rest.slice(0, end)
}

/** The first definition line: "# …" (en, fr) or ";1: …" (es). */
export function firstDefinition(section: string, style: 'hash' | 'es'): string | undefined {
  for (const line of section.split('\n')) {
    let body: string | undefined
    if (style === 'hash' && /^# /.test(line)) body = line.slice(2)
    if (style === 'es' && /^;\d+[^:]*:/.test(line)) body = line.slice(line.indexOf(':') + 1)
    if (body === undefined) continue
    const text = wikiToText(body)
    if (text.length >= 3) return text.length > 220 ? `${text.slice(0, 217).trimEnd()}…` : text
  }
  return undefined
}

export function ipaOf(section: string, site: 'en' | 'fr' | 'es', language: TargetLanguage): string | undefined {
  if (site === 'fr') {
    const m = section.match(/\{\{pron\|([^|}]+)\|fr\}\}/)
    return m?.[1].trim() ? `/${m[1].trim()}/` : undefined
  }
  if (site === 'es') return section.match(/fone=([^|}]+)/)?.[1].trim().replace(/^(?!\[|\/)(.*)$/, '[$1]')
  return section.match(new RegExp(`\\{\\{IPA\\|${language}\\|([/[][^|}]+)`))?.[1].trim()
}

/** A Commons audio file for the word; plain recordings before Lingua Libre's long-named ones. */
export function audioFileOf(section: string, language: TargetLanguage): string | undefined {
  const files = [...section.matchAll(new RegExp(`\\{\\{audio\\|${language}\\|([^|}]+)`, 'g'))].map((m) => m[1].trim())
  return files.find((f) => !/^LL-/.test(f)) ?? files[0]
}

/** Every recording of the word on its page (different speakers and accents). */
export function audioFilesOf(section: string, language: TargetLanguage): string[] {
  return [...new Set([...section.matchAll(new RegExp(`\\{\\{audio\\|${language}\\|([^|}]+)`, 'g'))].map((m) => m[1].trim()))]
}

/**
 * Native recordings for a set of words (one request per 40 words): word → MP3 addresses, one per
 * speaker. High-variability phonetic training needs exactly this: many voices for each word.
 */
export async function nativeRecordings(words: readonly string[], language: TargetLanguage): Promise<Map<string, string[]>> {
  const pages = await fetchPages([...words], 'en')
  const out = new Map<string, string[]>()
  for (const w of words) {
    const text = pages.get(w)
    const section = text ? languageSection(text, language) : null
    const files = section ? audioFilesOf(section, language) : []
    if (files.length) out.set(w, files.map(commonsMp3))
  }
  return out
}

/** Words listed under derived/related terms, as links or list templates. */
export function familyOf(section: string, language: TargetLanguage, lemma: string): string[] {
  const parts = section.split(/^(={3,5}[^=\n]+={3,5})\s*$/m)
  const out: string[] = []
  for (let i = 1; i < parts.length; i += 2) {
    if (!/Derived terms|Related terms|S\|dérivés|S\|apparentés|S\|vocabulaire|Derivad|Relacionad/i.test(parts[i])) continue
    const body = parts[i + 1] ?? ''
    for (const m of body.matchAll(/\[\[([^\]|#]+)/g)) out.push(m[1])
    for (const m of body.matchAll(/\{\{(?:col\d?|der\d?|rel\d?|col-auto|der-top|l)\|([a-z-]+)\|([^}]*)\}\}/g)) {
      if (m[1] !== language) continue
      for (const a of m[2].split('|')) if (a && !a.includes('=')) out.push(a.replace(/<[^>]*>/g, '').trim())
    }
  }
  // Keep real relatives: one word, sharing the lemma's stem (décider → décision, indécis).
  const plain = (w: string) => stripDiacritics(w.toLocaleLowerCase())
  const stem = plain(lemma).slice(0, Math.max(4, plain(lemma).length - 3))
  return [...new Set(out.map((w) => w.trim()))].filter((w) => w && !/\s/.test(w) && plain(w) !== plain(lemma) && plain(w).includes(stem)).slice(0, 10)
}

// ---------------------------------------------------------------------------
// Commons audio address (MD5-hashed folders)
// ---------------------------------------------------------------------------

/** MD5 of a UTF-8 string, hex (Commons stores files under md5 prefixes). */
export function md5(input: string): string {
  const bytes = new TextEncoder().encode(input)
  const len = bytes.length
  const words = new Uint32Array((((len + 8) >> 6) + 1) * 16)
  for (let i = 0; i < len; i++) words[i >> 2] |= bytes[i] << ((i % 4) * 8)
  words[len >> 2] |= 0x80 << ((len % 4) * 8)
  words[words.length - 2] = len * 8
  const S = [7, 12, 17, 22, 5, 9, 14, 20, 4, 11, 16, 23, 6, 10, 15, 21]
  const K = Array.from({ length: 64 }, (_, i) => Math.floor(Math.abs(Math.sin(i + 1)) * 2 ** 32) >>> 0)
  let [a0, b0, c0, d0] = [0x67452301, 0xefcdab89, 0x98badcfe, 0x10325476]
  for (let off = 0; off < words.length; off += 16) {
    let [a, b, c, d] = [a0, b0, c0, d0]
    for (let i = 0; i < 64; i++) {
      const r = i >> 4
      const f = r === 0 ? (b & c) | (~b & d) : r === 1 ? (d & b) | (~d & c) : r === 2 ? b ^ c ^ d : c ^ (b | ~d)
      const g = r === 0 ? i : r === 1 ? (5 * i + 1) % 16 : r === 2 ? (3 * i + 5) % 16 : (7 * i) % 16
      const tmp = d
      d = c
      c = b
      const x = (a + f + K[i] + words[off + g]) >>> 0
      const s = S[r * 4 + (i % 4)]
      b = (b + ((x << s) | (x >>> (32 - s)))) >>> 0
      a = tmp
    }
    a0 = (a0 + a) >>> 0
    b0 = (b0 + b) >>> 0
    c0 = (c0 + c) >>> 0
    d0 = (d0 + d) >>> 0
  }
  return [a0, b0, c0, d0].map((v) => [0, 8, 16, 24].map((sh) => ((v >>> sh) & 0xff).toString(16).padStart(2, '0')).join('')).join('')
}

/** MP3 version of a Commons audio file (Safari can't play Ogg). */
export function commonsMp3(file: string): string {
  const name = file.replace(/ /g, '_')
  const h = md5(name)
  const e = encodeURIComponent(name)
  return `https://upload.wikimedia.org/wikipedia/commons/transcoded/${h[0]}/${h.slice(0, 2)}/${e}/${e}.mp3`
}

// ---------------------------------------------------------------------------
// Looking words up
// ---------------------------------------------------------------------------

/** Info for several words of one language, in two requests (English + the language's own). */
export async function lookUpWords(lemmas: string[], language: TargetLanguage): Promise<Map<string, WordInfo>> {
  const en = await fetchPages(lemmas, 'en')
  const own = language === 'en' ? en : await fetchPages(lemmas, language)
  const out = new Map<string, WordInfo>()
  for (const lemma of lemmas) {
    const enText = en.get(lemma)
    const enSection = enText ? languageSection(enText, language) : null
    const ownText = own.get(lemma)
    const ownSection = !ownText ? null : language === 'fr' ? frSection(ownText) : language === 'es' ? esSection(ownText) : enSection
    const audio = enSection ? audioFileOf(enSection, language) : undefined
    const family = [...(ownSection && language !== 'en' ? familyOf(ownSection, language, lemma) : []), ...(enSection ? familyOf(enSection, language, lemma) : [])]
    out.set(lemma, {
      ipa: (ownSection && ipaOf(ownSection, language, language)) || undefined,
      audioUrl: audio ? commonsMp3(audio) : undefined,
      definition: ownSection ? firstDefinition(ownSection, language === 'es' ? 'es' : 'hash') : undefined,
      family: [...new Set(family)].slice(0, 10),
      gender: enSection ? nounGender(enSection, language) : undefined,
    })
  }
  return out
}

/** Words per background run; one batch is two requests. */
const PER_RUN = 20

/**
 * Wiktionary lists every relative, rare ones too (décidabilité, abandonware). Only words in the
 * frequency list are offered, most frequent first: the family members worth learning.
 */
export function commonFamily(family: readonly string[], frequency: ReadonlyMap<string, number>, max = 8): string[] {
  return family
    .filter((w) => !w.includes('-') && frequency.has(w.toLocaleLowerCase()))
    .sort((a, b) => frequency.get(a.toLocaleLowerCase())! - frequency.get(b.toLocaleLowerCase())!)
    .slice(0, max)
}

/**
 * Background top-up for words never looked up: fills pronunciation, audio and definition only
 * where the learner hasn't, and keeps the family as suggestions. Marks each word looked up.
 */
export async function fillWordInfo(db: KelimeDB, language: TargetLanguage): Promise<number> {
  if (typeof navigator !== 'undefined' && !navigator.onLine) return 0
  const todo = (await db.vocabulary.where('language').equals(language).toArray())
    // Nouns looked up before genders were read (2026-10-03) get one more look for their gender.
    .filter((e) => e.source !== 'sample' && (!e.wiktAt || (e.language !== 'en' && e.partOfSpeech === 'noun' && !e.gender && e.wiktAt < '2026-10-03T12')))
    .slice(0, PER_RUN)
  if (todo.length) await fillEntries(db, todo, language)
  return todo.length
}

/** Looks the words up and saves what was found (only into empty fields), marking them done. */
export async function fillEntries(db: KelimeDB, entries: VocabularyEntry[], language: TargetLanguage): Promise<void> {
  const [info, frequency] = await Promise.all([lookUpWords(entries.map((e) => e.lemma), language), loadFrequency(language)])
  for (const e of entries) {
    const i = info.get(e.lemma)
    const fresh = (await db.vocabulary.get(e.id)) ?? e
    const senses = i?.definition && !fresh.senses[0]?.definition ? [{ ...fresh.senses[0], definition: i.definition }, ...fresh.senses.slice(1)] : fresh.senses
    await db.vocabulary.update(e.id, {
      wiktAt: new Date().toISOString(),
      ipa: fresh.ipa || i?.ipa,
      audioUrl: fresh.audioUrl || i?.audioUrl,
      senses,
      familyCandidates: commonFamily(i?.family ?? [], frequency),
      // A noun whose article didn't tell its gender (l', les) gets it from the dictionary.
      ...(fresh.language !== 'en' && fresh.partOfSpeech === 'noun' && !fresh.gender && i?.gender ? { gender: i.gender } : {}),
    } satisfies Partial<VocabularyEntry>)
  }
}

/** "{{inflection of|fr|décider||past|part}}", "{{plural of|es|casa}}", "{{es-verb form of|esperar}}" → the dictionary form. */
export function lemmaOfForm(section: string, language: TargetLanguage): string | undefined {
  const m = section.match(new RegExp(`\\{\\{[a-z -]*\\bof\\|${language}\\|([^|}]+)`)) ?? section.match(new RegExp(`\\{\\{${language}-[a-z ]*\\bof\\|([^|}=]+)[|}]`))
  return m?.[1].trim()
}

/**
 * A short English hint for words met in a text (English is the learner's other strong
 * language): the English sense of French/Spanish words, the definition of English ones.
 * Inflected forms lead to their dictionary form first. Two requests at most.
 */
export async function englishHints(words: string[], language: TargetLanguage): Promise<Map<string, { lemma: string; hint: string }>> {
  const pages = await fetchPages(words, 'en')
  const out = new Map<string, { lemma: string; hint: string }>()
  const forms = new Map<string, string>()
  const hintOf = (section: string) => (language === 'en' ? firstDefinition(section, 'hash') : englishGlossLine(section))
  for (const w of words) {
    const text = pages.get(w)
    const section = text ? languageSection(text, language) : null
    if (!section) continue
    const lemma = lemmaOfForm(section, language)
    if (lemma && lemma !== w) forms.set(w, lemma)
    else {
      const hint = hintOf(section)
      if (hint) out.set(w, { lemma: w, hint })
    }
  }
  if (forms.size) {
    const lemmaPages = await fetchPages([...new Set(forms.values())], 'en')
    for (const [w, lemma] of forms) {
      const text = lemmaPages.get(lemma)
      const section = text ? languageSection(text, language) : null
      const hint = section ? hintOf(section) : undefined
      if (hint) out.set(w, { lemma, hint })
    }
  }
  return out
}

/** The first English sense of a French/Spanish entry, as a short phrase. */
function englishGlossLine(section: string): string | undefined {
  const def = firstDefinition(section, 'hash')
  return def && def.length > 80 ? `${def.slice(0, 77).trimEnd()}…` : def
}

// ---------------------------------------------------------------------------
// Turkish meanings
// ---------------------------------------------------------------------------

const unlink = (s: string) => s.replace(/\[\[(?:[^\]|]*\|)?([^\]]*)\]\]/g, '$1').trim()

/**
 * Turkish words in a Wiktionary section's translation tables, in sense order: English
 * "* Turkish: {{t+|tr|karar}}", French "{{trad+|tr|ev}}", Spanish "{{t|tr|t1=ev|t2=…}}".
 */
export function turkishIn(section: string, site: 'en' | 'fr' | 'es'): string[] {
  const out: string[] = []
  if (site === 'en') {
    for (const line of section.split('\n').filter((l) => /^\*\s*Turkish:/.test(l))) {
      for (const m of line.matchAll(/\{\{t[a-z+-]*\|tr\|([^|}]+)/g)) out.push(m[1])
    }
  } else if (site === 'fr') {
    for (const m of section.matchAll(/\{\{trad[+-]?\|tr\|([^|}]+)/g)) out.push(m[1])
  } else {
    for (const m of section.matchAll(/\{\{t\|tr\|([^}]*)\}\}/g)) for (const t of m[1].matchAll(/(?:^|\|)t\d+=([^|]+)/g)) out.push(t[1])
  }
  return [...new Set(out.map(unlink).filter(Boolean))]
}

export interface TurkishMeanings {
  words: string[]
  /** Set when found through the English word (French/Spanish pages without Turkish): less exact. */
  via?: string
}

/**
 * Turkish meanings for a word from Wiktionary (CC BY-SA; the data Kaikki.org extracts), without
 * the AI: the word's own Wiktionary first (French and Spanish ones translate their words), then
 * the English page, for French/Spanish words through their English meaning.
 */
export async function turkishMeanings(word: string, language: TargetLanguage, max = 5): Promise<TurkishMeanings> {
  const w = normalize(word).toLocaleLowerCase(language)
  const lemma = splitArticle(w, language).rest || w
  if (!lemma || /\s/.test(lemma)) return { words: [] }
  if (language !== 'en') {
    const own = (await fetchPages([lemma], language)).get(lemma)
    const section = own ? (language === 'fr' ? frSection(own) : esSection(own)) : null
    const found = section ? turkishIn(section, language) : []
    if (found.length) return { words: found.slice(0, max) }
  }
  const en = (await fetchPages([lemma], 'en')).get(lemma)
  const section = en ? languageSection(en, language) : null
  if (!section) return { words: [] }
  if (language === 'en') return { words: turkishIn(section, 'en').slice(0, max) }
  const english = englishGloss(section)
  if (!english) return { words: [] }
  const page = (await fetchPages([english], 'en')).get(english)
  const enSection = page ? languageSection(page, 'en') : null
  const words = enSection ? turkishIn(enSection, 'en').slice(0, max - 1) : []
  return words.length ? { words, via: english } : { words: [] }
}
