import { stripDiacritics } from '../engine/answerCheck'
import type { Gender, TargetLanguage } from '../engine/types'

/**
 * The same word in the other two languages and where it comes from, read from the English
 * Wiktionary (CC BY-SA). English pages carry translation tables; French and Spanish entries
 * there are defined in English, which leads to the English page and its table.
 */

const API = 'https://en.wiktionary.org/w/api.php'
const SECTION: Record<TargetLanguage, string> = { en: 'English', fr: 'French', es: 'Spanish' }

const cache = new Map<string, string | null>()
const pause = (ms: number) => new Promise((r) => setTimeout(r, ms))

/**
 * Wikitext of several pages in one request (Wikimedia rate-limits anonymous callers, so
 * requests are batched, cached and retried with a pause when the limit is hit).
 */
export async function fetchPages(titles: string[]): Promise<Map<string, string | null>> {
  const want = [...new Set(titles)].filter((t) => !cache.has(t))
  if (want.length) {
    const q = new URLSearchParams({ action: 'query', prop: 'revisions', rvprop: 'content', rvslots: 'main', titles: want.join('|'), format: 'json', formatversion: '2', origin: '*', redirects: '1' })
    for (let attempt = 0; attempt < 4; attempt++) {
      const res = await fetch(`${API}?${q}`).catch(() => null)
      if (res?.status === 429 || !res) {
        await pause(2000 * 2 ** attempt)
        continue
      }
      if (!res.ok) break
      type Page = { title: string; missing?: boolean; revisions?: { slots: { main: { content: string } } }[] }
      const j = (await res.json()) as { query?: { pages?: Page[]; normalized?: { from: string; to: string }[]; redirects?: { from: string; to: string }[] } }
      const byTitle = new Map((j.query?.pages ?? []).map((p) => [p.title, p.revisions?.[0]?.slots.main.content ?? null]))
      const alias = new Map([...(j.query?.normalized ?? []), ...(j.query?.redirects ?? [])].map((x) => [x.from, x.to]))
      for (const t of want) {
        let title = t
        for (let i = 0; i < 3 && alias.has(title); i++) title = alias.get(title)!
        cache.set(t, byTitle.get(title) ?? null)
      }
      break
    }
  }
  return new Map(titles.map((t) => [t, cache.get(t) ?? null]))
}

export async function fetchWikitext(page: string): Promise<string | null> {
  return (await fetchPages([page])).get(page) ?? null
}

/** One language's part of a page (between its level-2 heading and the next). */
export function languageSection(wikitext: string, language: TargetLanguage): string | null {
  const start = wikitext.search(new RegExp(`^==${SECTION[language]}==\\s*$`, 'm'))
  if (start < 0) return null
  const rest = wikitext.slice(start + SECTION[language].length + 4)
  const end = rest.search(/^==[^=]/m)
  return end < 0 ? rest : rest.slice(0, end)
}

export interface Root {
  /** Wiktionary language code of the source, e.g. "la". */
  lang: string
  word: string
}

const SOURCE_NAME: Record<string, string> = {
  la: 'Latince', 'la-vul': 'Halk Latincesi', 'la-lat': 'Geç Latince', 'la-med': 'Orta Çağ Latincesi', 'LL.': 'Geç Latince', 'VL.': 'Halk Latincesi', 'ML.': 'Orta Çağ Latincesi',
  grc: 'Eski Yunanca', fro: 'Eski Fransızca', frm: 'Orta Fransızca', fr: 'Fransızca', osp: 'Eski İspanyolca', es: 'İspanyolca', it: 'İtalyanca', ar: 'Arapça',
  ang: 'Eski İngilizce', enm: 'Orta İngilizce', en: 'İngilizce', 'gem-pro': 'Ön-Cermence', 'ine-pro': 'Ön-Hint-Avrupaca', non: 'Eski İskandinavca', de: 'Almanca',
  nl: 'Felemenkçe', frk: 'Frankça', pt: 'Portekizce', ca: 'Katalanca', oc: 'Oksitanca', 'itc-pro': 'Ön-İtalikçe', fa: 'Farsça', tr: 'Türkçe',
}
export const sourceName = (code: string) => SOURCE_NAME[code] ?? code

const CLASSICAL = /^(la|la-.+|LL\.|VL\.|ML\.|grc)$/

/**
 * Where the word comes from: the first classical (Latin/Greek) source in the etymology if
 * there is one, since that deep root is what makes words in the three languages relatives;
 * otherwise the first real source. Reads both the classic templates ({{inh|fr|la|…}}) and
 * the newer {{ety|es|:der|la:dēcīdō<…>}}.
 */
export function etymologyRoot(section: string): Root | null {
  const ety = section.match(/===Etymology(?: \d)?===\n([\s\S]*?)(?:\n===|$)/)?.[1]
  if (!ety) return null
  const found: Root[] = []
  for (const m of ety.matchAll(/\{\{(?:inh|der|bor|lbor|slbor|uder|ubor)\+?\|[a-z-]+\|([A-Za-z.-]+)\|([^|}]*)|\{\{ety\|[a-z]+\|[^|}]*?\|([A-Za-z.-]+):([^<|}]+)/g)) {
    const lang = m[1] ?? m[3]
    const word = (m[2] ?? m[4]).trim()
    if (word && word !== '-') found.push({ lang, word })
  }
  return found.find((r) => CLASSICAL.test(r.lang)) ?? found[0] ?? null
}

/** The first English sense of a French/Spanish entry: "to [[decide]], to …" → "decide". */
export function englishGloss(section: string): string | null {
  for (const line of section.split('\n')) {
    if (!/^# /.test(line)) continue
    const clean = line.replace(/\{\{(?:lb|lbl|gloss|q|qualifier|i)\|[^}]*\}\}/g, '')
    const link = clean.match(/\[\[([^\]|#]+)(?:[|#][^\]]*)?\]\]/)
    if (link) return link[1].trim()
  }
  return null
}

export interface Translation {
  word: string
  gender?: Gender
}

const plain = (s: string) => stripDiacritics(s.toLocaleLowerCase())

/** Letters two words share from the start: abandon/abandonar 6, decision/décision 8. */
function sharedPrefix(a: string, b: string): number {
  const x = plain(a)
  const y = plain(b)
  let i = 0
  while (i < x.length && i < y.length && x[i] === y[i]) i++
  return i
}

/**
 * The word in `code` (fr/es) from an English page's translation tables. Tables are per sense;
 * the first one listing the language wins, unless another lists a relative of the English
 * word (abandon → abandonar rather than renunciar), which is the easier word to remember.
 */
export function translationIn(section: string, code: 'fr' | 'es', english = ''): Translation | null {
  const candidates: Translation[] = []
  for (const table of section.matchAll(/\{\{trans-top[^}]*\}\}([\s\S]*?)\{\{trans-bottom\}\}/g)) {
    const line = table[1].split('\n').find((l) => new RegExp(`^\\*:? ?${code === 'fr' ? 'French' : 'Spanish'}:`).test(l))
    for (const t of line?.matchAll(new RegExp(`\\{\\{tt?\\+?\\|${code}\\|([^|}]+)(?:\\|([mf]))?`, 'g')) ?? []) {
      candidates.push({ word: t[1].trim(), gender: t[2] === 'm' || t[2] === 'f' ? t[2] : undefined })
    }
  }
  if (!candidates.length) return null
  const relative = english ? candidates.find((c) => sharedPrefix(c.word, english) >= Math.min(5, english.length - 1)) : undefined
  return relative ?? candidates[0]
}

export interface LanguageForm {
  language: TargetLanguage
  word: string
  gender?: Gender
  root: Root | null
}

export interface Equivalents {
  forms: LanguageForm[]
  /** A root the words share (same source word once accents are ignored), if any. */
  shared: Root | null
}

const rootKey = (r: Root) => stripDiacritics(r.word.toLocaleLowerCase()).replace(/[^a-z]/g, '')

/** The word in all three languages, with roots; null when Wiktionary doesn't know the word. */
export async function findEquivalents(lemma: string, language: TargetLanguage): Promise<Equivalents | null> {
  const own = await fetchWikitext(lemma)
  const ownSection = own && languageSection(own, language)
  if (!ownSection) return null
  const english = language === 'en' ? lemma : englishGloss(ownSection)
  if (!english) return null
  const enText = language === 'en' ? own : await fetchWikitext(english)
  const enSection = enText && languageSection(enText, 'en')
  if (!enSection) return null

  const forms: LanguageForm[] = [{ language, word: lemma, root: etymologyRoot(ownSection) }]
  if (language !== 'en') forms.push({ language: 'en', word: english, root: etymologyRoot(enSection) })
  const others = (['fr', 'es'] as const).filter((c) => c !== language).flatMap((code) => {
    const t = translationIn(enSection, code, english)
    return t ? [{ code, t }] : []
  })
  // Their pages in one request, for the roots.
  const pages = await fetchPages(others.map((o) => o.t.word))
  for (const { code, t } of others) {
    const text = pages.get(t.word)
    const section = text && languageSection(text, code)
    forms.push({ language: code, word: t.word, gender: t.gender, root: section ? etymologyRoot(section) : null })
  }
  forms.sort((a, b) => ['en', 'fr', 'es'].indexOf(a.language) - ['en', 'fr', 'es'].indexOf(b.language))

  // Shared root: the same source word behind at least two of the three.
  const roots = forms.map((f) => f.root).filter((r): r is Root => !!r)
  const shared = roots.find((r) => roots.filter((x) => rootKey(x) === rootKey(r)).length >= 2) ?? null
  return { forms, shared }
}

/** "la décision", "el problema", "l'eau": the article for a noun with a known gender. */
export function withArticle(word: string, language: TargetLanguage, gender?: Gender): string {
  if (!gender || language === 'en') return word
  if (language === 'fr') return /^[aeiouyhéèêàâîôû]/i.test(word) ? `l'${word}` : `${gender === 'f' ? 'la' : 'le'} ${word}`
  return `${gender === 'f' ? 'la' : 'el'} ${word}`
}
