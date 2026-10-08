import type { Tense } from './tenses'

/**
 * A Turkish verb conjugated, to put beside a French or Spanish form (bekliyorum under j'attends):
 * the four core tenses, the six persons (ben, sen, o, biz, siz, onlar). Only for a meaning that is
 * one verb ("beklemek", or "yardım etmek"); a phrase, an "olmak" compound or a suffix ("-ebilmek")
 * gets nothing, since a wrong Turkish form would teach the wrong thing.
 */
export type TurkishTense = 'present' | 'past' | 'imperfect' | 'future'

/** The lab's core tenses and the Turkish one that renders them best. */
const FOR_TENSE: Partial<Record<Tense, TurkishTense>> = {
  present: 'present',
  presente: 'present',
  'passe-compose': 'past',
  preterito: 'past',
  imparfait: 'imperfect',
  imperfecto: 'imperfect',
  futur: 'future',
  futuro: 'future',
}

export const turkishTenseOf = (tense: Tense): TurkishTense | undefined => FOR_TENSE[tense]

const VOWELS = 'aeıioöuü'
const BACK = 'aıou'
const ROUND = 'oöuü'
const VOICELESS = 'çfhkpsşt'

const lastVowel = (s: string) => [...s].reverse().find((c) => VOWELS.includes(c))
/** Two-way harmony: a or e. */
const two = (s: string) => (BACK.includes(lastVowel(s) ?? 'e') ? 'a' : 'e')
/** Four-way harmony: ı, i, u or ü. */
function four(s: string): string {
  const v = lastVowel(s) ?? 'e'
  if (BACK.includes(v)) return ROUND.includes(v) ? 'u' : 'ı'
  return ROUND.includes(v) ? 'ü' : 'i'
}

/** Stems whose final t softens to d before a vowel (gidiyor, edecek); "at", "bit" keep it. */
const SOFTENS: Record<string, string> = { git: 'gid', et: 'ed', tat: 'tad', güt: 'güd' }
/** Stems whose e turns i before y (diyor, yiyecek). */
const NARROWS: Record<string, string> = { de: 'di', ye: 'yi' }

/** The six persons of -yor (and of -yordu's base). */
const YOR_ENDINGS = ['um', 'sun', '', 'uz', 'sunuz', 'lar']

function present(stem: string): string[] {
  let base: string
  if (NARROWS[stem]) base = `${NARROWS[stem]}yor`
  else if (SOFTENS[stem]) base = `${SOFTENS[stem]}${four(SOFTENS[stem])}yor`
  else if (/[ae]$/.test(stem)) {
    // bekle → bekliyor, oyna → oynuyor, söyle → söylüyor: the a/e drops, the vowel before it decides.
    const rest = stem.slice(0, -1)
    base = `${rest}${four(rest)}yor`
  } else if (/[ıiuü]$/.test(stem)) base = `${stem}yor`
  else base = `${stem}${four(stem)}yor`
  return YOR_ENDINGS.map((e) => base + e)
}

function past(stem: string): string[] {
  const d = VOICELESS.includes(stem.at(-1)!) ? 't' : 'd'
  const base = `${stem}${d}${four(stem)}`
  const v = four(stem)
  return [`${base}m`, `${base}n`, base, `${base}k`, `${base}n${v}z`, `${base}l${two(base)}r`]
}

function imperfect(stem: string): string[] {
  const yor = present(stem)[2]
  return [`${yor}dum`, `${yor}dun`, `${yor}du`, `${yor}duk`, `${yor}dunuz`, `${yor}lardı`]
}

function future(stem: string): string[] {
  let base = NARROWS[stem] ?? SOFTENS[stem] ?? stem
  const a = two(base)
  if (VOWELS.includes(base.at(-1)!)) base += 'y'
  const k = `${base}${a}c${a}k`
  const ğ = `${base}${a}c${a}ğ`
  const ı = a === 'a' ? 'ı' : 'i'
  return [`${ğ}${ı}m`, `${k}s${ı}n`, k, `${ğ}${ı}z`, `${k}s${ı}n${ı}z`, `${k}l${a}r`]
}

/**
 * The six Turkish forms of the meaning's verb in `tense`, or nothing when the meaning isn't one
 * plain verb. "yardım etmek" keeps its first word: yardım ediyorum.
 */
export function turkishForms(meaning: string, tense: TurkishTense): string[] | undefined {
  const gloss = meaning.split(/[,;/(]/)[0].trim().toLocaleLowerCase('tr')
  const words = gloss.split(/\s+/)
  if (!words.length || words.length > 2) return undefined
  const verb = words.at(-1)!
  const m = verb.match(/^([a-zçğıöşü]+)(mek|mak)$/)
  if (!m) return undefined
  const stem = m[1]
  // "olmak" (être: je suis = -im, not oluyorum), "zorunda olmak", "sahip olmak": Turkish says
  // these another way (zorundayım, sahibim), so they get nothing.
  if (stem === 'ol') return undefined
  // A two-word meaning is fine only with a light verb: yardım etmek, telefon etmek.
  if (words.length === 2 && stem !== 'et' && stem !== 'yap') return undefined
  // The suffix agrees with the verb's own vowels, not with the word before it.
  if (m[2] !== (two(stem) === 'a' ? 'mak' : 'mek')) return undefined
  const forms = { present, past, imperfect, future }[tense](stem)
  const lead = words.length === 2 ? `${words[0]} ` : ''
  return forms.map((f) => lead + f)
}
