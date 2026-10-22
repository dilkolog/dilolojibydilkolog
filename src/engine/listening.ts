import { pickWeighted, type GrammarLog } from './grammar'
import { pick, type Rng } from './rng'
import type { TargetLanguage } from './types'

/**
 * Listening speed follows how well the word is held: new words are spoken a little slower,
 * well-known ones faster, up to natural speech and beyond, so recognition keeps up with real
 * conversation instead of the slowed-down classroom voice.
 */
export function listeningRate(base: number, stabilityDays?: number): number {
  const factor = stabilityDays === undefined || stabilityDays < 3 ? 0.9 : stabilityDays < 14 ? 1 : stabilityDays < 45 ? 1.1 : 1.2
  return Math.round(Math.min(1.4, Math.max(0.6, base * factor)) * 100) / 100
}

export interface MinimalPair {
  a: { word: string; gloss: string }
  b: { word: string; gloss: string }
  /** The contrast being trained, e.g. "u / ou". */
  contrast: string
}

const p = (a: string, ga: string, b: string, gb: string, contrast: string): MinimalPair => ({ a: { word: a, gloss: ga }, b: { word: b, gloss: gb }, contrast })

/**
 * Word pairs that differ in a single sound a Turkish speaker tends to merge. Hearing them
 * apart and getting immediate feedback sharpens the perception of that contrast (high-variability
 * phonetic training: Logan, Lively & Pisoni 1991; Thomson 2018).
 */
export const MINIMAL_PAIRS: Record<TargetLanguage, MinimalPair[]> = {
  en: [
    p('ship', 'gemi', 'sheep', 'koyun', 'kısa i / uzun i'),
    p('live', 'yaşamak', 'leave', 'ayrılmak', 'kısa i / uzun i'),
    p('sit', 'oturmak', 'seat', 'koltuk', 'kısa i / uzun i'),
    p('full', 'dolu', 'fool', 'aptal', 'kısa u / uzun u'),
    p('pull', 'çekmek', 'pool', 'havuz', 'kısa u / uzun u'),
    p('bad', 'kötü', 'bed', 'yatak', 'æ / e'),
    p('cat', 'kedi', 'cut', 'kesmek', 'æ / ʌ'),
    p('hat', 'şapka', 'hut', 'kulübe', 'æ / ʌ'),
    p('thin', 'ince', 'tin', 'teneke', 'th / t'),
    p('three', 'üç', 'tree', 'ağaç', 'th / t'),
    p('think', 'düşünmek', 'sink', 'lavabo', 'th / s'),
    p('walk', 'yürümek', 'work', 'çalışmak', 'ɔː / ɜː'),
    p('fan', 'vantilatör', 'van', 'minibüs', 'f / v'),
    p('berry', 'dut', 'very', 'çok', 'b / v'),
    p('cheap', 'ucuz', 'chip', 'cips', 'uzun i / kısa i'),
    p('heat', 'sıcaklık', 'hit', 'vurmak', 'uzun i / kısa i'),
    p('bat', 'yarasa', 'bet', 'bahis', 'æ / e'),
    p('pen', 'kalem', 'pan', 'tava', 'e / æ'),
    p('luck', 'şans', 'lock', 'kilit', 'ʌ / ɒ'),
    p('sip', 'yudum', 'ship', 'gemi', 's / ʃ'),
    p('chair', 'sandalye', 'share', 'paylaşmak', 'tʃ / ʃ'),
    p('rice', 'pirinç', 'lice', 'bitler', 'r / l'),
    p('right', 'doğru', 'light', 'ışık', 'r / l'),
    p('west', 'batı', 'vest', 'yelek', 'w / v'),
    p('wine', 'şarap', 'vine', 'asma', 'w / v'),
    p('bus', 'otobüs', 'buzz', 'vızıltı', 's / z'),
    p('pack', 'paket', 'back', 'arka', 'p / b'),
    p('coat', 'ceket', 'caught', 'yakaladı', 'əʊ / ɔː'),
    p('thirteen', 'on üç', 'thirty', 'otuz', '-teen (vurgu sonda) / -ty (vurgu başta)'),
    p('fourteen', 'on dört', 'forty', 'kırk', '-teen (vurgu sonda) / -ty (vurgu başta)'),
    p('fifteen', 'on beş', 'fifty', 'elli', '-teen (vurgu sonda) / -ty (vurgu başta)'),
    p('sixteen', 'on altı', 'sixty', 'altmış', '-teen (vurgu sonda) / -ty (vurgu başta)'),
  ],
  fr: [
    p('dessus', 'üstünde', 'dessous', 'altında', 'u / ou'),
    p('tu', 'sen', 'tout', 'hepsi', 'u / ou'),
    p('rue', 'sokak', 'roue', 'tekerlek', 'u / ou'),
    p('vu', 'görülmüş', 'vous', 'siz', 'u / ou'),
    p('pur', 'saf', 'pour', 'için', 'u / ou'),
    p('lu', 'okunmuş', 'loup', 'kurt', 'u / ou'),
    p('vent', 'rüzgar', 'vin', 'şarap', 'an / in'),
    p('lent', 'yavaş', 'lin', 'keten', 'an / in'),
    p('blanc', 'beyaz', 'blond', 'sarışın', 'an / on'),
    p('temps', 'zaman', 'thon', 'ton balığı', 'an / on'),
    p('poisson', 'balık', 'poison', 'zehir', 'ss / s'),
    p('dessert', 'tatlı', 'désert', 'çöl', 'ss / s'),
    p('beau', 'güzel', 'bout', 'uç', 'o / ou'),
    p('le', 'eril artikel', 'les', 'çoğul artikel', 'e / é'),
    p('bu', 'içilmiş', 'boue', 'çamur', 'u / ou'),
    p('sous', 'altında', 'su', 'bilinen', 'u / ou'),
    p('jeu', 'oyun', 'joue', 'yanak', 'eu / ou'),
    p('bon', 'iyi', 'banc', 'bank', 'on / an'),
    p('vin', 'şarap', 'vont', 'gidiyorlar', 'in / on'),
    p('sans', 'olmadan', 'son', 'onun', 'an / on'),
    p('cousin', 'kuzen', 'coussin', 'yastık', 'z / s'),
  ],
  es: [
    p('pero', 'ama', 'perro', 'köpek', 'r / rr'),
    p('caro', 'pahalı', 'carro', 'araba', 'r / rr'),
    p('cero', 'sıfır', 'cerro', 'tepe', 'r / rr'),
    p('para', 'için', 'parra', 'asma', 'r / rr'),
    p('coro', 'koro', 'corro', 'koşuyorum', 'r / rr'),
    p('ahora', 'şimdi', 'ahorra', 'biriktirir', 'r / rr'),
    p('pena', 'keder', 'peña', 'kaya', 'n / ñ'),
    p('cana', 'ak saç', 'caña', 'kamış', 'n / ñ'),
    p('polo', 'kutup', 'pollo', 'tavuk', 'l / ll'),
    p('casa', 'ev', 'caza', 'av', 's / z (İspanya)'),
    p('vez', 'kez', 'ves', 'görürsün', 's / z (İspanya)'),
    p('papa', 'patates', 'papá', 'baba', 'vurgu'),
    p('esta', 'bu', 'está', 'bulunuyor', 'vurgu'),
    p('termino', 'bitiriyorum', 'terminó', 'bitirdi', 'vurgu'),
    p('hablo', 'konuşuyorum', 'habló', 'konuştu', 'vurgu'),
    p('peso', 'ağırlık', 'beso', 'öpücük', 'p / b'),
    p('pata', 'ayak (hayvan)', 'bata', 'önlük', 'p / b'),
    p('vino', 'şarap', 'pino', 'çam', 'b / p'),
    p('mar', 'deniz', 'bar', 'bar', 'm / b'),
  ],
}

export interface PairQuestion {
  pair: MinimalPair
  /** Which word is spoken. */
  answer: 'a' | 'b'
  /** Options in display order. */
  order: ('a' | 'b')[]
}

/** The key of a pair in the learner's log. */
export const pairKey = (language: TargetLanguage, pair: MinimalPair) => `${language}:${pair.a.word}|${pair.b.word}`

/** A round of questions: pairs never tried or often missed come first (see pickWeighted), each pair once before any repeats. */
export function pairRound(language: TargetLanguage, count: number, rng: Rng, log: GrammarLog = {}): PairQuestion[] {
  const pool = MINIMAL_PAIRS[language].map((pair) => ({ id: pairKey(language, pair), pair }))
  const order = pickWeighted(pool, log, rng, pool.length).map((x) => x.pair)
  return Array.from({ length: count }, (_, i) => {
    const pair = i < order.length ? order[i] : pick(order, rng)
    return { pair, answer: rng() < 0.5 ? 'a' : 'b', order: rng() < 0.5 ? ['a', 'b'] : ['b', 'a'] }
  })
}
