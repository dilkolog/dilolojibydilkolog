import type { Rng } from './rng'
import type { TargetLanguage } from './types'

/**
 * Numbers, times, prices and years in words, the way they are said, for the numbers game: the learner hears one
 * and types the digits, or sees the digits and writes the words. Every rule is here, pure and tested; the screen
 * only speaks and checks. Spelling follows the usual school rules (French "quatre-vingts", "deux cents", "vingt et
 * un"; Spanish "veintidós", "quinientos"); a written answer that only differs in hyphens or the 1990 French
 * spelling is right, one that misses an accent or a plural s is near.
 */

export type NumberKind = 'small' | 'big' | 'time' | 'price' | 'year' | 'date' | 'phone'

export const NUMBER_KINDS: readonly NumberKind[] = ['small', 'big', 'time', 'price', 'year', 'date', 'phone']

/** The kinds that can be written out in words (a time, price, date or phone number said in words is mostly listened to). */
export const WRITABLE_KINDS: readonly NumberKind[] = ['small', 'big', 'year']

export const NUMBER_ROUND = 10

export interface NumberQuestion {
  kind: NumberKind
  /** The value: a number, a year, cents for a price, minutes since midnight for a time, month × 100 + day for a date; a phone number's digits. */
  value: number
  /** What is said aloud (and shown after the answer). */
  spoken: string
  /** The digits as they are written in the language ("14:30", "12,50 €", "$12.50", "1 500"). */
  digits: string
  /** The words a written answer is checked against (the spoken form first). */
  written: string[]
  /** A phone number's digits as typed, leading zero and all. */
  phone?: string
}

// ---------- French ----------

const FR_UNITS = ['zéro', 'un', 'deux', 'trois', 'quatre', 'cinq', 'six', 'sept', 'huit', 'neuf', 'dix', 'onze', 'douze', 'treize', 'quatorze', 'quinze', 'seize', 'dix-sept', 'dix-huit', 'dix-neuf']
const FR_TENS = ['', '', 'vingt', 'trente', 'quarante', 'cinquante', 'soixante']

function frBelow100(n: number): string {
  if (n < 20) return FR_UNITS[n]!
  const t = Math.floor(n / 10)
  const u = n % 10
  if (t <= 6) return u === 0 ? FR_TENS[t]! : u === 1 ? `${FR_TENS[t]} et un` : `${FR_TENS[t]}-${FR_UNITS[u]}`
  if (t === 7) return u === 1 ? 'soixante et onze' : `soixante-${FR_UNITS[10 + u]}`
  if (t === 8) return u === 0 ? 'quatre-vingts' : `quatre-vingt-${FR_UNITS[u]}`
  return `quatre-vingt-${FR_UNITS[10 + u]}`
}

function frBelow1000(n: number): string {
  const h = Math.floor(n / 100)
  const r = n % 100
  if (h === 0) return frBelow100(r)
  const hundreds = h === 1 ? 'cent' : `${FR_UNITS[h]} cent`
  if (r === 0) return h > 1 ? `${hundreds}s` : hundreds
  return `${hundreds} ${frBelow100(r)}`
}

/** "vingt" and "cent" keep their plural s only at the end of a number: "deux cents", but "deux cent mille". */
const frNoPlural = (words: string) => words.replace(/(vingt|cent)s$/, '$1')

function frNumber(n: number): string {
  if (n < 1000) return frBelow1000(n)
  const th = Math.floor(n / 1000)
  const r = n % 1000
  const thousands = th === 1 ? 'mille' : `${frNoPlural(frBelow1000(th))} mille`
  return r === 0 ? thousands : `${thousands} ${frBelow1000(r)}`
}

/** Before a feminine noun (heures, minutes) "un" is "une": "vingt et une heures". */
const frFeminine = (words: string) => words.replace(/\bun$/, 'une')

// ---------- Spanish ----------

const ES_UNITS = [
  'cero', 'uno', 'dos', 'tres', 'cuatro', 'cinco', 'seis', 'siete', 'ocho', 'nueve', 'diez', 'once', 'doce', 'trece', 'catorce', 'quince', 'dieciséis', 'diecisiete', 'dieciocho', 'diecinueve',
  'veinte', 'veintiuno', 'veintidós', 'veintitrés', 'veinticuatro', 'veinticinco', 'veintiséis', 'veintisiete', 'veintiocho', 'veintinueve',
]
const ES_TENS = ['', '', '', 'treinta', 'cuarenta', 'cincuenta', 'sesenta', 'setenta', 'ochenta', 'noventa']
const ES_HUNDREDS = ['', 'ciento', 'doscientos', 'trescientos', 'cuatrocientos', 'quinientos', 'seiscientos', 'setecientos', 'ochocientos', 'novecientos']

function esBelow100(n: number): string {
  if (n < 30) return ES_UNITS[n]!
  const u = n % 10
  return u === 0 ? ES_TENS[Math.floor(n / 10)]! : `${ES_TENS[Math.floor(n / 10)]} y ${ES_UNITS[u]}`
}

function esBelow1000(n: number): string {
  if (n === 100) return 'cien'
  const h = Math.floor(n / 100)
  const r = n % 100
  if (h === 0) return esBelow100(r)
  return r === 0 ? ES_HUNDREDS[h]! : `${ES_HUNDREDS[h]} ${esBelow100(r)}`
}

/** Before a noun (and before "mil") "uno" is "un": "veintiún euros", "treinta y un mil". */
const esApocope = (words: string) => words.replace(/veintiuno$/, 'veintiún').replace(/\buno$/, 'un')

function esNumber(n: number): string {
  if (n < 1000) return esBelow1000(n)
  const th = Math.floor(n / 1000)
  const r = n % 1000
  const thousands = th === 1 ? 'mil' : `${esApocope(esBelow1000(th))} mil`
  return r === 0 ? thousands : `${thousands} ${esBelow1000(r)}`
}

// ---------- English ----------

const EN_UNITS = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen']
const EN_TENS = ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety']

function enBelow100(n: number): string {
  if (n < 20) return EN_UNITS[n]!
  const u = n % 10
  return u === 0 ? EN_TENS[Math.floor(n / 10)]! : `${EN_TENS[Math.floor(n / 10)]}-${EN_UNITS[u]}`
}

function enBelow1000(n: number): string {
  const h = Math.floor(n / 100)
  const r = n % 100
  if (h === 0) return enBelow100(r)
  return r === 0 ? `${EN_UNITS[h]} hundred` : `${EN_UNITS[h]} hundred and ${enBelow100(r)}`
}

function enNumber(n: number): string {
  if (n < 1000) return enBelow1000(n)
  const th = Math.floor(n / 1000)
  const r = n % 1000
  const thousands = `${enBelow1000(th)} thousand`
  if (r === 0) return thousands
  return r < 100 ? `${thousands} and ${enBelow100(r)}` : `${thousands} ${enBelow1000(r)}`
}

/** A whole number from 0 to 999 999 in words. */
export function numberWords(language: TargetLanguage, n: number): string {
  if (!Number.isInteger(n) || n < 0 || n > 999_999) throw new RangeError(`no words for ${n}`)
  return language === 'fr' ? frNumber(n) : language === 'es' ? esNumber(n) : enNumber(n)
}

// ---------- Years ----------

/** A year (1000–2099) as it is said, and the other ways it can be written. */
export function yearWords(language: TargetLanguage, year: number): string[] {
  const plain = numberWords(language, year)
  if (language === 'fr') {
    // 1100–1999 can also be said in hundreds: "dix-neuf cent quatre-vingt-dix-neuf".
    if (year >= 1100 && year < 2000) {
      const hundreds = Math.floor(year / 100)
      const r = year % 100
      return [plain, r === 0 ? `${frNumber(hundreds)} cents` : `${frNumber(hundreds)} cent ${frBelow100(r)}`]
    }
    return [plain]
  }
  if (language === 'es') return [plain]
  // English splits a year in two: "nineteen ninety-nine", "nineteen oh five", "nineteen hundred", "twenty twenty-four".
  const first = Math.floor(year / 100)
  const r = year % 100
  if (year >= 2000 && year < 2010) return [plain]
  const split = r === 0 ? `${enBelow100(first)} hundred` : r < 10 ? `${enBelow100(first)} oh ${EN_UNITS[r]}` : `${enBelow100(first)} ${enBelow100(r)}`
  return [split, plain]
}

// ---------- Times ----------

/** A time of day said the way the language usually does: French in 24 hours, Spanish and English in 12. */
export function timeWords(language: TargetLanguage, hour: number, minute: number): string {
  if (language === 'fr') {
    const h = hour === 0 ? 'minuit' : hour === 12 && minute === 0 ? 'midi' : `${frFeminine(frNumber(hour))} ${hour === 1 ? 'heure' : 'heures'}`
    if (minute === 0) return `Il est ${h}.`
    return `Il est ${h} ${frFeminine(frNumber(minute))}.`
  }
  const h12 = hour % 12 === 0 ? 12 : hour % 12
  const next = (h12 % 12) + 1
  if (language === 'es') {
    const article = (h: number) => (h === 1 ? 'Es la una' : `Son las ${ES_UNITS[h]}`)
    if (minute === 0) return `${article(h12)} en punto.`
    if (minute === 15) return `${article(h12)} y cuarto.`
    if (minute === 30) return `${article(h12)} y media.`
    if (minute === 45) return `${article(next)} menos cuarto.`
    if (minute > 30 && minute % 5 === 0) return `${article(next)} menos ${esBelow100(60 - minute)}.`
    return `${article(h12)} y ${esBelow100(minute)}.`
  }
  if (minute === 0) return `It's ${EN_UNITS[h12] ?? enBelow100(h12)} o'clock.`
  if (minute === 15) return `It's quarter past ${enBelow100(h12)}.`
  if (minute === 30) return `It's half past ${enBelow100(h12)}.`
  if (minute === 45) return `It's quarter to ${enBelow100(next)}.`
  if (minute % 5 === 0) return minute < 30 ? `It's ${enBelow100(minute)} past ${enBelow100(h12)}.` : `It's ${enBelow100(60 - minute)} to ${enBelow100(next)}.`
  return `It's ${enBelow100(h12)} ${minute < 10 ? `oh ${EN_UNITS[minute]}` : enBelow100(minute)}.`
}

// ---------- Prices ----------

/** A price in cents said aloud: "douze euros cinquante", "doce euros con cincuenta", "twelve dollars and fifty cents". */
export function priceWords(language: TargetLanguage, cents: number): string {
  const whole = Math.floor(cents / 100)
  const part = cents % 100
  if (language === 'fr') {
    const euros = `${frNumber(whole)} ${whole === 1 ? 'euro' : 'euros'}`
    return part ? `${euros} ${frBelow100(part)}` : euros
  }
  if (language === 'es') {
    const euros = `${esApocope(esNumber(whole))} ${whole === 1 ? 'euro' : 'euros'}`
    return part ? `${euros} con ${esBelow100(part)}` : euros
  }
  const dollars = `${enNumber(whole)} ${whole === 1 ? 'dollar' : 'dollars'}`
  return part ? `${dollars} and ${enBelow100(part)} ${part === 1 ? 'cent' : 'cents'}` : dollars
}

// ---------- Dates ----------

const FR_MONTHS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre']
const ES_MONTHS = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre']
const EN_MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
const EN_ORDINAL: Record<string, string> = { one: 'first', two: 'second', three: 'third', five: 'fifth', eight: 'eighth', nine: 'ninth', twelve: 'twelfth' }

/** "twenty-first", "thirtieth", "twelfth". */
function enOrdinal(n: number): string {
  const words = enBelow100(n)
  const last = words.split('-').pop()!
  const ordinal = EN_ORDINAL[last] ?? (last.endsWith('y') ? `${last.slice(0, -1)}ieth` : `${last}th`)
  return words.slice(0, words.length - last.length) + ordinal
}

/** A day of a month as it is said: "le premier mai", "el tres de mayo", "the third of May". */
export function dateWords(language: TargetLanguage, day: number, month: number): string {
  if (language === 'fr') return `le ${day === 1 ? 'premier' : frNumber(day)} ${FR_MONTHS[month - 1]}`
  if (language === 'es') return `el ${esBelow100(day)} de ${ES_MONTHS[month - 1]}`
  return `the ${enOrdinal(day)} of ${EN_MONTHS[month - 1]}`
}

const DAYS_IN = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]

// ---------- Phone numbers ----------

/**
 * A phone number the way people read it out: French in pairs ("zéro six, douze, trente-quatre…"), Spanish a hundred and
 * then pairs ("seiscientos doce, treinta y cuatro…"), English digit by digit with "oh" for 0.
 */
export function phoneWords(language: TargetLanguage, digits: string): string {
  const pair = (p: string, zero: string, words: (n: number) => string) => (p[0] === '0' ? `${zero} ${words(Number(p[1]))}` : words(Number(p)))
  if (language === 'fr') return (digits.match(/\d{2}/g) ?? []).map((p) => pair(p, 'zéro', frNumber)).join(', ')
  if (language === 'es') {
    const pairs = (digits.slice(3).match(/\d{2}/g) ?? []).map((p) => pair(p, 'cero', esNumber))
    return [esNumber(Number(digits.slice(0, 3))), ...pairs].join(', ')
  }
  const say = (group: string) => [...group].map((d) => (d === '0' ? 'oh' : EN_UNITS[Number(d)])).join(' ')
  return [digits.slice(0, 5), digits.slice(5, 8), digits.slice(8)].map(say).join(', ')
}

/** The digits grouped as they are written: "06 12 34 56 78", "612 34 56 78", "07700 900 123". */
export function phoneDigits(language: TargetLanguage, digits: string): string {
  if (language === 'fr') return digits.replace(/(\d{2})(?=\d)/g, '$1 ')
  if (language === 'es') return `${digits.slice(0, 3)} ${digits.slice(3).replace(/(\d{2})(?=\d)/g, '$1 ')}`
  return `${digits.slice(0, 5)} ${digits.slice(5, 8)} ${digits.slice(8)}`
}

// ---------- Digits ----------

/** Digits grouped the language's way: "1 500" in French, "1.500" in Spanish, "1,500" in English. */
export function groupDigits(language: TargetLanguage, n: number): string {
  if (n < 10_000 && language === 'es') return String(n)
  const sep = language === 'fr' ? ' ' : language === 'es' ? '.' : ','
  return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, sep)
}

export function priceDigits(language: TargetLanguage, cents: number): string {
  const whole = Math.floor(cents / 100)
  const part = String(cents % 100).padStart(2, '0')
  if (language === 'en') return `$${groupDigits(language, whole)}.${part}`
  return `${groupDigits(language, whole)},${part} €`
}

/** "14h30" in French, "3:15" in Spanish and English. */
const timeDigits = (language: TargetLanguage, hour: number, minute: number) => `${hour}${language === 'fr' ? 'h' : ':'}${String(minute).padStart(2, '0')}`

// ---------- Questions ----------

const pick = <T>(rng: Rng, list: readonly T[]): T => list[Math.floor(rng() * list.length)]!
const between = (rng: Rng, lo: number, hi: number) => lo + Math.floor(rng() * (hi - lo + 1))

/**
 * A number of a kind, leaning to where the language is hard for a Turkish speaker: French 60–99 (soixante-dix,
 * quatre-vingt-dix), Spanish 11–29 and the irregular hundreds (quinientos, setecientos, novecientos), English
 * teens and tens (thirteen or thirty?).
 */
function numberOf(language: TargetLanguage, kind: NumberKind, rng: Rng): number {
  if (kind === 'small') {
    const hard = rng() < 0.6
    if (language === 'fr') return hard ? between(rng, 60, 99) : between(rng, 0, 100)
    if (language === 'es') return hard ? between(rng, 11, 29) : between(rng, 0, 100)
    return hard ? pick(rng, [13, 14, 15, 16, 17, 18, 19, 30, 40, 50, 60, 70, 80, 90]) : between(rng, 0, 100)
  }
  if (kind === 'year') return rng() < 0.5 ? between(rng, 1900, 1999) : between(rng, 2000, 2035)
  // Big numbers: hundreds, thousands, now and then a hundred thousands.
  const hundred = language === 'es' && rng() < 0.4 ? pick(rng, [5, 7, 9]) : between(rng, 1, 9)
  const shape = rng()
  if (shape < 0.35) return hundred * 100 + between(rng, 0, 99)
  if (shape < 0.8) return between(rng, 1, 9) * 1000 + hundred * 100 + (rng() < 0.5 ? between(rng, 0, 99) : 0)
  return between(rng, 10, 999) * 1000 + (rng() < 0.5 ? hundred * 100 : 0)
}

const CENTS = [0, 10, 20, 25, 30, 40, 45, 50, 60, 75, 80, 90, 95, 99]
const MINUTES = [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55, 7, 12, 18, 23, 38, 42, 53]

/** One question of a kind. */
export function numberQuestion(language: TargetLanguage, kind: NumberKind, rng: Rng): NumberQuestion {
  if (kind === 'date') {
    const month = between(rng, 1, 12)
    const day = rng() < 0.15 ? 1 : between(rng, 1, DAYS_IN[month - 1]!)
    const spoken = dateWords(language, day, month)
    return { kind, value: month * 100 + day, spoken, digits: `${String(day).padStart(2, '0')}/${String(month).padStart(2, '0')}`, written: [spoken] }
  }
  if (kind === 'phone') {
    const rest = (n: number) => Array.from({ length: n }, () => String(between(rng, 0, 9))).join('')
    const digits = language === 'fr' ? `0${pick(rng, ['6', '7', '1'])}${rest(8)}` : language === 'es' ? `${pick(rng, ['6', '7', '9'])}${rest(8)}` : `07${rest(9)}`
    const spoken = phoneWords(language, digits)
    return { kind, value: Number(digits), spoken, digits: phoneDigits(language, digits), written: [spoken], phone: digits }
  }
  if (kind === 'time') {
    const hour = language === 'fr' ? between(rng, 0, 23) : between(rng, 1, 12)
    const minute = pick(rng, MINUTES)
    const spoken = timeWords(language, hour, minute)
    return { kind, value: hour * 60 + minute, spoken, digits: timeDigits(language, hour, minute), written: [spoken] }
  }
  if (kind === 'price') {
    const whole = rng() < 0.7 ? between(rng, 1, 99) : between(rng, 100, 999)
    const cents = whole * 100 + pick(rng, CENTS)
    const spoken = priceWords(language, cents)
    return { kind, value: cents, spoken, digits: priceDigits(language, cents), written: [spoken] }
  }
  const value = numberOf(language, kind, rng)
  const written = kind === 'year' ? yearWords(language, value) : [numberWords(language, value)]
  return { kind, value, spoken: written[0]!, digits: kind === 'year' ? String(value) : groupDigits(language, value), written }
}

/** A round: of one kind, or mixed (each kind in turn, shuffled); no value twice. */
export function numberRound(language: TargetLanguage, kinds: readonly NumberKind[], rng: Rng, size = NUMBER_ROUND): NumberQuestion[] {
  const out: NumberQuestion[] = []
  const seen = new Set<string>()
  for (let tries = 0; out.length < size && tries < size * 20; tries++) {
    const q = numberQuestion(language, kinds[out.length % kinds.length]!, rng)
    const key = `${q.kind}|${q.value}`
    if (seen.has(key)) continue
    seen.add(key)
    out.push(q)
  }
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1))
    ;[out[i], out[j]] = [out[j]!, out[i]!]
  }
  return out
}

// ---------- Checking ----------

/** What was typed as digits, as the question's value (cents, minutes), or null when it cannot be read. */
export function readDigits(kind: NumberKind, raw: string): number | null {
  const text = raw.trim()
  if (!text) return null
  if (kind === 'time') {
    // "14:30", "14h30", "14 30", "1430", "2:30 pm".
    const plain = text.replace(/\s*[ap]\.?m\.?$/i, '')
    const pm = /^\s*p/i.test(text.slice(plain.length))
    const m = /^(\d{1,2})(?:\s*[:.h]\s*(\d{1,2})?|\s+(\d{2})|(\d{2}))?\s*$/i.exec(plain)
    if (!m) return null
    const hour = Number(m[1]) + (pm && Number(m[1]) < 12 ? 12 : 0)
    const minute = Number(m[2] ?? m[3] ?? m[4] ?? 0)
    return hour < 24 && minute < 60 ? hour * 60 + minute : null
  }
  if (kind === 'date') {
    const m = /^(\d{1,2})\s*[./\- ]\s*(\d{1,2})\.?$/.exec(text)
    if (!m) return null
    const day = Number(m[1])
    const month = Number(m[2])
    return month >= 1 && month <= 12 && day >= 1 && day <= DAYS_IN[month - 1]! + (month === 2 ? 1 : 0) ? month * 100 + day : null
  }
  if (kind === 'price') {
    // "12€50", "12 € 50": the euros, then the cents after the sign.
    const clean = text.replace(/(\d)\s*[€$]\s*(\d{1,2})\s*$/, '$1,$2').replace(/[€$\s\u202f]/g, '')
    // The last . or , with one or two digits after it is the decimal point; the others group thousands.
    const m = /^([\d.,]*?)(?:[.,](\d{1,2}))?$/.exec(clean)
    if (!m || !m[1] || /[.,]$/.test(m[1])) return null
    const whole = m[1].replace(/[.,]/g, '')
    if (!/^\d+$/.test(whole)) return null
    return Number(whole) * 100 + (m[2] ? Number(m[2].padEnd(2, '0')) : 0)
  }
  const digits = text.replace(/[\s .,']/g, '')
  return /^\d+$/.test(digits) ? Number(digits) : null
}

/** Is a value typed as digits the question's? A time in 12 hours is right either way (3:15 or 15:15) where the language said it in 12. */
export function digitsRight(language: TargetLanguage, q: NumberQuestion, raw: string): boolean {
  if (q.kind === 'phone') return raw.replace(/\D/g, '') === q.phone
  const v = readDigits(q.kind, raw)
  if (v === null) return false
  if (q.kind === 'time' && language !== 'fr') return v % 720 === q.value % 720
  return v === q.value
}

const words = (s: string, language: TargetLanguage) => {
  let t = s
    .toLowerCase()
    .replace(/[’']/g, ' ')
    .replace(/[-‐‑]/g, ' ')
    .replace(/[.,!?;:]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
  if (language === 'en') t = t.replace(/\band\b/g, ' ').replace(/\s+/g, ' ').trim()
  return t
}
const bare = (s: string) => s.normalize('NFD').replace(/\p{M}/gu, '')
/** Plural s on vingt/cent (and a stray one) dropped: "quatre-vingt" for "quatre-vingts" is near, not wrong. */
const looseFr = (s: string) => s.replace(/\b(vingt|cent)s\b/g, '$1')

/** A written answer: right, near (only an accent or a plural s), or wrong. */
export function checkWords(language: TargetLanguage, q: NumberQuestion, typed: string): 'right' | 'near' | 'wrong' {
  const answer = words(typed, language)
  if (!answer) return 'wrong'
  const forms = q.written.map((w) => words(w, language))
  if (forms.includes(answer)) return 'right'
  const loose = (s: string) => looseFr(bare(s))
  return forms.some((f) => loose(f) === loose(answer)) ? 'near' : 'wrong'
}

// ---------- Where the learner stands ----------

/** Right and wrong answers by kind, for one language (kept on the device). */
export type NumberTally = Partial<Record<NumberKind, { ok: number; wrong: number }>>

export function tallyAnswer(tally: NumberTally, kind: NumberKind, ok: boolean): NumberTally {
  const now = tally[kind] ?? { ok: 0, wrong: 0 }
  return { ...tally, [kind]: ok ? { ...now, ok: now.ok + 1 } : { ...now, wrong: now.wrong + 1 } }
}

/** The kind answered worst (at least 5 answers, under 75% right), among the ones a round can ask; it comes twice as often in a mixed round. */
export function weakestKind(tally: NumberTally, kinds: readonly NumberKind[]): NumberKind | null {
  let worst: { kind: NumberKind; share: number } | null = null
  for (const kind of kinds) {
    const t = tally[kind]
    if (!t || t.ok + t.wrong < 5) continue
    const share = t.ok / (t.ok + t.wrong)
    if (share < 0.75 && (!worst || share < worst.share)) worst = { kind, share }
  }
  return worst?.kind ?? null
}
