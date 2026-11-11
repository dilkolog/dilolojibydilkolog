import { normalize, stripDiacritics } from '../engine/answerCheck'
import type { Register, TargetLanguage } from '../engine/types'

/**
 * The idiom pack: one file per language in `idioms/`, built from the batches in `content/raw/idioms/`
 * by `scripts/build-idioms.mjs` (never edited by hand). Each idiom is the language's own (none is
 * translated from another), with its Turkish meaning, its word-for-word image and a sentence of our own.
 */
export const IDIOM_THEMES = {
  body: 'Beden ve sağlık',
  animals: 'Hayvanlar',
  food: 'Yemek ve içmek',
  money: 'Para ve alışveriş',
  work: 'Çalışma ve çaba',
  feelings: 'Duygular',
  talk: 'Konuşma ve sır',
  mind: 'Akıl ve dikkat',
  people: 'İnsanlar ve ilişkiler',
  trouble: 'Hata ve dert',
  time: 'Zaman',
  nature: 'Hava ve doğa',
  luck: 'Şans ve risk',
  ease: 'Kolaylık ve zorluk',
  decide: 'Karar ve tavır',
  move: 'Yol ve hareket',
} as const

export type IdiomTheme = keyof typeof IDIOM_THEMES
export const IDIOM_LEVELS = ['B1', 'B2', 'C1'] as const
export type IdiomLevel = (typeof IDIOM_LEVELS)[number]
export const IDIOM_REGISTERS: readonly Register[] = ['neutral', 'informal', 'slang', 'formal']

export interface Idiom {
  /** The idiom in its dictionary form: "tomar el pelo", "poser un lapin". */
  w: string
  /** How it is built into a sentence, when that is not plain from the idiom: "tomarle el pelo a alguien". */
  pat?: string
  /** Turkish meaning(s), comma-separated. */
  t: string
  /** Word for word, in Turkish: the odd picture is what makes an idiom stick. */
  lit: string
  /** The Turkish idiom that says the same, when there is one. */
  eq?: string
  /** A sentence with the idiom unbroken in it, the idiom exactly as it stands there, and the sentence's Turkish. */
  s: string
  form: string
  tr: string
  reg: Register
  /** Where it is said: "genel", "İspanya", "Latin Amerika", "UK", "US", "Fransa", "Québec"… */
  area: string
  level: IdiomLevel
  theme: IdiomTheme
}

interface IdiomFile {
  language: TargetLanguage
  source: string
  items: Idiom[]
}

const FILES = import.meta.glob<IdiomFile>('./idioms/*.json', { import: 'default' })

/** The idioms of a language (loaded when asked for: they are not part of the first screen). */
export async function loadIdioms(language: TargetLanguage): Promise<Idiom[]> {
  const load = FILES[`./idioms/${language}.json`]
  return load ? (await load()).items : []
}

const fold = (s: string) => stripDiacritics(normalize(s)).replace(/['-]/g, ' ').replace(/\s+/g, ' ').trim()

/**
 * The idioms a dictionary search finds: the one typed (in its dictionary form, or as it stands in its sentence),
 * and the others that hold the typed word or start as typed, or whose Turkish says it. Accents and case do not count.
 */
export function findIdioms(idioms: readonly Idiom[], query: string, limit = 8): { exact?: Idiom; others: Idiom[] } {
  const q = fold(query)
  if (q.length < 2) return { others: [] }
  const exact = idioms.find((i) => fold(i.w) === q || fold(i.form) === q || (i.pat && fold(i.pat) === q))
  if (q.length < 3) return { exact, others: [] }
  const turkish = query.trim().toLocaleLowerCase('tr')
  const holds = (i: Idiom) => {
    const w = fold(i.w)
    return w.startsWith(q) || ` ${w} `.includes(` ${q} `) || ` ${fold(i.form)} `.includes(` ${q} `)
  }
  const says = (i: Idiom) => [i.t, i.eq ?? ''].some((t) => t.toLocaleLowerCase('tr').split(/,\s*/).some((m) => m === turkish || (turkish.length >= 4 && ` ${m} `.includes(` ${turkish} `))))
  const others = idioms.filter((i) => i !== exact && (holds(i) || says(i))).slice(0, limit)
  return { exact, others }
}

const words = (s: string) => s.trim().split(/\s+/).filter(Boolean)

/** What is wrong with a set of idioms, one line each (empty when it can ship). */
export function idiomProblems(items: readonly Idiom[]): string[] {
  const out: string[] = []
  const seen = new Set<string>()
  for (const i of items) {
    const say = (what: string) => out.push(`${i.w || '(adsız)'}: ${what}`)
    for (const key of ['w', 't', 'lit', 's', 'form', 'tr', 'area'] as const) if (!i[key]?.trim()) say(`${key} boş`)
    if (words(i.w ?? '').length < 2) say('tek kelime, deyim değil')
    if (/[()/,;]/.test(i.w ?? '')) say('sözlük biçiminde parantez, eğik çizgi ya da virgül var (kalıp `pat` alanına)')
    if (!(i.theme in IDIOM_THEMES)) say(`tema bilinmiyor: ${i.theme}`)
    if (!IDIOM_LEVELS.includes(i.level)) say(`seviye bilinmiyor: ${i.level}`)
    if (!IDIOM_REGISTERS.includes(i.reg)) say(`üslup bilinmiyor: ${i.reg}`)
    if (i.s && i.form && !i.s.includes(i.form)) say('`form` cümlede birebir geçmiyor')
    if (words(i.form ?? '').length < 2) say('`form` deyimin tamamı olmalı')
    if (words(i.s ?? '').length > 16) say('cümle 16 kelimeden uzun')
    if (i.lit && i.lit.trim().toLocaleLowerCase('tr') === i.t?.trim().toLocaleLowerCase('tr')) say('kelimesi kelimesine anlam, anlamın aynısı')
    const key = (i.w ?? '').toLocaleLowerCase().replace(/[’‘]/g, "'").replace(/\s+/g, ' ').trim()
    if (seen.has(key)) say('iki kez var')
    seen.add(key)
  }
  return out
}
