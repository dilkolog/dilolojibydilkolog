import { shuffle, type Rng } from './rng'

/**
 * Vocabulary size test (yes/no format, Meara 1992; LexTALE, Lemhöfer & Broersma 2012).
 * Real words are sampled from each frequency band and mixed with invented words that look
 * like the language. "I know it" on an invented word shows how much the learner overclaims,
 * and each band's score is corrected for that before it is scaled up to the band's size.
 */

export const BAND_SIZE = 2000
export const BANDS = 10 // ranks 1–20 000
export const WORDS_PER_BAND = 6
export const PSEUDO_WORDS = 15

export interface TestItem {
  word: string
  /** Frequency band index (0 = ranks 1–2000); undefined for an invented word. */
  band?: number
}

const LETTERS = /^[\p{Ll}]+$/u

/**
 * An invented word: the start of one real word joined to the end of another, kept only if the
 * result is not a word in the list. Joining at vowel–consonant boundaries keeps it pronounceable.
 */
function inventWord(words: readonly string[], listed: ReadonlySet<string>, rng: Rng): string | undefined {
  const vowel = /[aeiouyàâäéèêëîïôöùûüáíóúñ]/
  for (let tries = 0; tries < 40; tries++) {
    const a = words[Math.floor(rng() * words.length)]
    const b = words[Math.floor(rng() * words.length)]
    if (a === b || a.length < 5 || b.length < 5) continue
    const cutA = 2 + Math.floor(rng() * (a.length - 3))
    const cutB = 1 + Math.floor(rng() * (b.length - 3))
    // Join after a vowel of `a` and before a consonant of `b`.
    if (!vowel.test(a[cutA - 1]) || vowel.test(b[cutB])) continue
    const w = a.slice(0, cutA) + b.slice(cutB)
    if (w.length >= 5 && w.length <= 11 && !listed.has(w) && LETTERS.test(w)) return w
  }
  return undefined
}

/**
 * `list`: words by frequency, most frequent first (index 0 = rank 1). `exclude`: words of the
 * other languages, so an invented word is never a real word the learner knows from elsewhere.
 */
export function buildVocabTest(list: readonly string[], rng: Rng, exclude: Iterable<string> = []): TestItem[] {
  const listed = new Set([...list, ...exclude])
  const items: TestItem[] = []
  for (let band = 0; band < BANDS; band++) {
    const slice = list.slice(band * BAND_SIZE, (band + 1) * BAND_SIZE).filter((w) => w.length >= 3 && LETTERS.test(w))
    for (const word of shuffle(slice, rng).slice(0, WORDS_PER_BAND)) items.push({ word, band })
  }
  // Invented words are built from mid-frequency words, so they look like ordinary vocabulary.
  const base = list.slice(1000, 12000).filter((w) => LETTERS.test(w))
  const invented = new Set<string>()
  while (invented.size < PSEUDO_WORDS) {
    const w = inventWord(base, listed, rng)
    if (!w) break
    invented.add(w)
  }
  for (const word of invented) items.push({ word })
  return shuffle(items, rng)
}

export interface VocabResult {
  /** Estimated number of words known among the 20 000 most frequent. */
  estimate: number
  /** Share of invented words claimed as known. */
  falseAlarms: number
  /** Corrected share known per band. */
  bands: number[]
}

/**
 * `skipped`: words the learner marked as a name or a foreign word (subtitle lists contain
 * both); they don't count either way.
 */
export function scoreVocabTest(items: readonly TestItem[], known: ReadonlySet<string>, skipped: ReadonlySet<string> = new Set()): VocabResult {
  items = items.filter((i) => !skipped.has(i.word))
  const fakes = items.filter((i) => i.band === undefined)
  const falseAlarms = fakes.length ? fakes.filter((i) => known.has(i.word)).length / fakes.length : 0
  const bands = Array.from({ length: BANDS }, (_, b) => {
    const real = items.filter((i) => i.band === b)
    if (!real.length) return 0
    const hits = real.filter((i) => known.has(i.word)).length / real.length
    // Correct for guessing: what is left of the hit rate once overclaiming is taken out.
    return falseAlarms >= 1 ? 0 : Math.max(0, Math.min(1, (hits - falseAlarms) / (1 - falseAlarms)))
  })
  return { estimate: Math.round(bands.reduce((s, x) => s + x * BAND_SIZE, 0)), falseAlarms, bands }
}

/** A rough CEFR reading of a vocabulary size (words known among the 20 000 most frequent): not an exam, a place to start from. */
export interface LevelAdvice {
  level: 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2'
  /** What to do next, in a sentence. */
  advice: string
  /** New words a day that suit this stage (what Settings suggests as "daily new words"). */
  newPerDay: number
}

const STAGES: { below: number; advice: LevelAdvice }[] = [
  { below: 800, advice: { level: 'A1', newPerDay: 10, advice: 'En sık kullanılan kelimelerle başla: günlük 10 yeni kelime ve kolay resimli hikâyeler iyi gider.' } },
  { below: 1800, advice: { level: 'A2', newPerDay: 10, advice: 'Temel kelimeler oturuyor. Kısa metin ve dinlemelerle kelimeleri cümle içinde gör.' } },
  { below: 3500, advice: { level: 'B1', newPerDay: 8, advice: 'Orta düzeydesin: okuma ve dinlemede bilmediğin kelimeleri listene ekleyerek ilerle, yeni kelimeyi 8 civarında tut.' } },
  { below: 6000, advice: { level: 'B2', newPerDay: 6, advice: 'Haber ve sesli kitaplar artık erişilebilir. Yeni kelimeyi azaltıp tekrarlara ve dilbilgisi sorularına ağırlık ver.' } },
  { below: 9000, advice: { level: 'C1', newPerDay: 5, advice: 'İleri düzeydesin: deyimler, eşdizimler ve kayıt farkı (günlük/resmî) en çok kazandıran alanlar.' } },
  { below: Infinity, advice: { level: 'C2', newPerDay: 4, advice: 'Çok geniş bir dağarcığın var: nadir kelimeler, deyimler ve kendi yazdığın metinler kalıyor.' } },
]

export function adviceFor(estimate: number): LevelAdvice {
  return STAGES.find((s) => estimate < s.below)!.advice
}
