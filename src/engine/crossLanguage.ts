import { levenshtein, normalize, splitArticle, stripDiacritics } from './answerCheck'
import type { TargetLanguage, VocabularyEntry } from './types'

/**
 * Links between the learner's three languages. Similar-looking words help when they share a
 * meaning (cognates: decision / décision / decisión) and hurt when they don't (false friends:
 * actually / actuellement). Cognates are found in the learner's own list; false friends come
 * from a curated list, because spelling alone can't tell the two apart.
 */

interface Side {
  lang: TargetLanguage
  word: string
  /** Turkish meaning of this side. */
  gloss: string
}

/** Each pair: two look-alike words whose meanings differ. Lemmas without articles. */
const PAIRS: [Side, Side][] = [
  // English ↔ French
  [{ lang: 'en', word: 'actually', gloss: 'aslında' }, { lang: 'fr', word: 'actuellement', gloss: 'şu anda' }],
  [{ lang: 'en', word: 'eventually', gloss: 'sonunda' }, { lang: 'fr', word: 'éventuellement', gloss: 'belki, gerekirse' }],
  [{ lang: 'en', word: 'library', gloss: 'kütüphane' }, { lang: 'fr', word: 'librairie', gloss: 'kitapçı' }],
  [{ lang: 'en', word: 'sensible', gloss: 'mantıklı' }, { lang: 'fr', word: 'sensible', gloss: 'hassas, duyarlı' }],
  [{ lang: 'en', word: 'attend', gloss: 'katılmak' }, { lang: 'fr', word: 'attendre', gloss: 'beklemek' }],
  [{ lang: 'en', word: 'assist', gloss: 'yardım etmek' }, { lang: 'fr', word: 'assister', gloss: 'hazır bulunmak, katılmak' }],
  [{ lang: 'en', word: 'deception', gloss: 'aldatma' }, { lang: 'fr', word: 'déception', gloss: 'hayal kırıklığı' }],
  [{ lang: 'en', word: 'journey', gloss: 'yolculuk' }, { lang: 'fr', word: 'journée', gloss: 'gün (boyunca)' }],
  [{ lang: 'en', word: 'lecture', gloss: 'konferans, ders' }, { lang: 'fr', word: 'lecture', gloss: 'okuma' }],
  [{ lang: 'en', word: 'injure', gloss: 'yaralamak' }, { lang: 'fr', word: 'injurier', gloss: 'hakaret etmek' }],
  [{ lang: 'en', word: 'sympathetic', gloss: 'anlayışlı, şefkatli' }, { lang: 'fr', word: 'sympathique', gloss: 'sevimli, cana yakın' }],
  [{ lang: 'en', word: 'preservative', gloss: 'koruyucu madde' }, { lang: 'fr', word: 'préservatif', gloss: 'prezervatif' }],
  [{ lang: 'en', word: 'cave', gloss: 'mağara' }, { lang: 'fr', word: 'cave', gloss: 'mahzen, kiler' }],
  [{ lang: 'en', word: 'college', gloss: 'yüksekokul, üniversite' }, { lang: 'fr', word: 'collège', gloss: 'ortaokul' }],
  [{ lang: 'en', word: 'demand', gloss: 'talep etmek' }, { lang: 'fr', word: 'demander', gloss: 'sormak, istemek' }],
  [{ lang: 'en', word: 'achieve', gloss: 'başarmak' }, { lang: 'fr', word: 'achever', gloss: 'bitirmek' }],
  [{ lang: 'en', word: 'location', gloss: 'konum' }, { lang: 'fr', word: 'location', gloss: 'kiralama' }],
  [{ lang: 'en', word: 'comprehensive', gloss: 'kapsamlı' }, { lang: 'fr', word: 'compréhensif', gloss: 'anlayışlı' }],
  [{ lang: 'en', word: 'fabric', gloss: 'kumaş' }, { lang: 'fr', word: 'fabrique', gloss: 'fabrika' }],
  [{ lang: 'en', word: 'issue', gloss: 'sorun, konu' }, { lang: 'fr', word: 'issue', gloss: 'çıkış, sonuç' }],
  [{ lang: 'en', word: 'large', gloss: 'büyük' }, { lang: 'fr', word: 'large', gloss: 'geniş' }],
  [{ lang: 'en', word: 'crayon', gloss: 'pastel boya' }, { lang: 'fr', word: 'crayon', gloss: 'kurşun kalem' }],
  [{ lang: 'en', word: 'tentative', gloss: 'deneme niteliğinde, geçici' }, { lang: 'fr', word: 'tentative', gloss: 'girişim, deneme' }],
  [{ lang: 'en', word: 'formidable', gloss: 'ürkütücü, zorlu' }, { lang: 'fr', word: 'formidable', gloss: 'harika' }],
  [{ lang: 'en', word: 'retire', gloss: 'emekli olmak' }, { lang: 'fr', word: 'retirer', gloss: 'geri çekmek, (para) çekmek' }],
  [{ lang: 'en', word: 'prune', gloss: 'kuru erik' }, { lang: 'fr', word: 'prune', gloss: 'erik' }],
  [{ lang: 'en', word: 'raisin', gloss: 'kuru üzüm' }, { lang: 'fr', word: 'raisin', gloss: 'üzüm' }],
  [{ lang: 'en', word: 'reunion', gloss: 'yeniden bir araya gelme' }, { lang: 'fr', word: 'réunion', gloss: 'toplantı' }],
  [{ lang: 'en', word: 'chair', gloss: 'sandalye' }, { lang: 'fr', word: 'chair', gloss: 'et, ten' }],
  [{ lang: 'en', word: 'pain', gloss: 'acı, ağrı' }, { lang: 'fr', word: 'pain', gloss: 'ekmek' }],
  [{ lang: 'en', word: 'coin', gloss: 'madeni para' }, { lang: 'fr', word: 'coin', gloss: 'köşe' }],
  [{ lang: 'en', word: 'luxurious', gloss: 'lüks, gösterişli' }, { lang: 'fr', word: 'luxurieux', gloss: 'şehvetli' }],
  [{ lang: 'en', word: 'grape', gloss: 'üzüm' }, { lang: 'fr', word: 'grappe', gloss: 'salkım' }],
  [{ lang: 'en', word: 'photograph', gloss: 'fotoğraf' }, { lang: 'fr', word: 'photographe', gloss: 'fotoğrafçı' }],
  // English ↔ Spanish
  [{ lang: 'en', word: 'embarrassed', gloss: 'utanmış, mahcup' }, { lang: 'es', word: 'embarazada', gloss: 'hamile' }],
  [{ lang: 'en', word: 'actually', gloss: 'aslında' }, { lang: 'es', word: 'actualmente', gloss: 'şu anda' }],
  [{ lang: 'en', word: 'eventually', gloss: 'sonunda' }, { lang: 'es', word: 'eventualmente', gloss: 'belki, olası durumda' }],
  [{ lang: 'en', word: 'library', gloss: 'kütüphane' }, { lang: 'es', word: 'librería', gloss: 'kitapçı' }],
  [{ lang: 'en', word: 'sensible', gloss: 'mantıklı' }, { lang: 'es', word: 'sensible', gloss: 'hassas, duyarlı' }],
  [{ lang: 'en', word: 'constipated', gloss: 'kabız' }, { lang: 'es', word: 'constipado', gloss: 'nezle olmuş' }],
  [{ lang: 'en', word: 'carpet', gloss: 'halı' }, { lang: 'es', word: 'carpeta', gloss: 'dosya, klasör' }],
  [{ lang: 'en', word: 'assist', gloss: 'yardım etmek' }, { lang: 'es', word: 'asistir', gloss: 'katılmak' }],
  [{ lang: 'en', word: 'attend', gloss: 'katılmak' }, { lang: 'es', word: 'atender', gloss: 'ilgilenmek, hizmet etmek' }],
  [{ lang: 'en', word: 'realize', gloss: 'farkına varmak' }, { lang: 'es', word: 'realizar', gloss: 'gerçekleştirmek' }],
  [{ lang: 'en', word: 'exit', gloss: 'çıkış' }, { lang: 'es', word: 'éxito', gloss: 'başarı' }],
  [{ lang: 'en', word: 'success', gloss: 'başarı' }, { lang: 'es', word: 'suceso', gloss: 'olay' }],
  [{ lang: 'en', word: 'molest', gloss: 'taciz etmek' }, { lang: 'es', word: 'molestar', gloss: 'rahatsız etmek' }],
  [{ lang: 'en', word: 'sympathetic', gloss: 'anlayışlı, şefkatli' }, { lang: 'es', word: 'simpático', gloss: 'sevimli, cana yakın' }],
  [{ lang: 'en', word: 'preservative', gloss: 'koruyucu madde' }, { lang: 'es', word: 'preservativo', gloss: 'prezervatif' }],
  [{ lang: 'en', word: 'rope', gloss: 'ip' }, { lang: 'es', word: 'ropa', gloss: 'giysi' }],
  [{ lang: 'en', word: 'fabric', gloss: 'kumaş' }, { lang: 'es', word: 'fábrica', gloss: 'fabrika' }],
  [{ lang: 'en', word: 'large', gloss: 'büyük' }, { lang: 'es', word: 'largo', gloss: 'uzun' }],
  [{ lang: 'en', word: 'record', gloss: 'kaydetmek' }, { lang: 'es', word: 'recordar', gloss: 'hatırlamak' }],
  [{ lang: 'en', word: 'introduce', gloss: 'tanıtmak' }, { lang: 'es', word: 'introducir', gloss: 'sokmak, içeri koymak' }],
  [{ lang: 'en', word: 'lecture', gloss: 'konferans, ders' }, { lang: 'es', word: 'lectura', gloss: 'okuma' }],
  [{ lang: 'en', word: 'casualty', gloss: 'kazazede, kayıp' }, { lang: 'es', word: 'casualidad', gloss: 'tesadüf' }],
  [{ lang: 'en', word: 'deception', gloss: 'aldatma' }, { lang: 'es', word: 'decepción', gloss: 'hayal kırıklığı' }],
  [{ lang: 'en', word: 'argument', gloss: 'tartışma' }, { lang: 'es', word: 'argumento', gloss: 'olay örgüsü, gerekçe' }],
  [{ lang: 'en', word: 'billion', gloss: 'milyar' }, { lang: 'es', word: 'billón', gloss: 'trilyon' }],
  [{ lang: 'en', word: 'compromise', gloss: 'uzlaşma' }, { lang: 'es', word: 'compromiso', gloss: 'taahhüt, nişan' }],
  [{ lang: 'en', word: 'resume', gloss: 'devam etmek' }, { lang: 'es', word: 'resumir', gloss: 'özetlemek' }],
  [{ lang: 'en', word: 'pretend', gloss: 'rol yapmak' }, { lang: 'es', word: 'pretender', gloss: 'amaçlamak' }],
  [{ lang: 'en', word: 'soap', gloss: 'sabun' }, { lang: 'es', word: 'sopa', gloss: 'çorba' }],
  [{ lang: 'en', word: 'parents', gloss: 'anne baba' }, { lang: 'es', word: 'parientes', gloss: 'akrabalar' }],
  [{ lang: 'en', word: 'college', gloss: 'yüksekokul, üniversite' }, { lang: 'es', word: 'colegio', gloss: 'okul' }],
  // French ↔ Spanish
  [{ lang: 'fr', word: 'attendre', gloss: 'beklemek' }, { lang: 'es', word: 'atender', gloss: 'ilgilenmek, hizmet etmek' }],
  [{ lang: 'fr', word: 'embarrassé', gloss: 'mahcup, sıkılmış' }, { lang: 'es', word: 'embarazada', gloss: 'hamile' }],
  [{ lang: 'fr', word: 'salir', gloss: 'kirletmek' }, { lang: 'es', word: 'salir', gloss: 'çıkmak' }],
  [{ lang: 'fr', word: 'rester', gloss: 'kalmak' }, { lang: 'es', word: 'restar', gloss: 'çıkarmak (matematik)' }],
  [{ lang: 'fr', word: 'large', gloss: 'geniş' }, { lang: 'es', word: 'largo', gloss: 'uzun' }],
  [{ lang: 'fr', word: 'tasse', gloss: 'fincan' }, { lang: 'es', word: 'tasa', gloss: 'oran' }],
  [{ lang: 'fr', word: 'carte', gloss: 'harita, kart' }, { lang: 'es', word: 'carta', gloss: 'mektup' }],
  [{ lang: 'fr', word: 'succès', gloss: 'başarı' }, { lang: 'es', word: 'suceso', gloss: 'olay' }],
  [{ lang: 'fr', word: 'quitter', gloss: 'ayrılmak, bırakmak' }, { lang: 'es', word: 'quitar', gloss: 'kaldırmak, almak' }],
]

const key = (lang: TargetLanguage, word: string) => `${lang}:${normalize(word).toLocaleLowerCase()}`

const BY_WORD = new Map<string, { own: Side; other: Side }[]>()
for (const [a, b] of PAIRS) {
  for (const [own, other] of [
    [a, b],
    [b, a],
  ]) {
    const k = key(own.lang, own.word)
    BY_WORD.set(k, [...(BY_WORD.get(k) ?? []), { own, other }])
  }
}

export interface FalseFriend {
  /** The look-alike in another language. */
  lang: TargetLanguage
  word: string
  /** What the look-alike means, i.e. the wrong meaning a learner is tempted to give. */
  gloss: string
}

/** Look-alikes in the other languages whose meaning differs from this word's. */
export function falseFriendsOf(entry: Pick<VocabularyEntry, 'language' | 'lemma'>): FalseFriend[] {
  const lemma = splitArticle(normalize(entry.lemma).toLocaleLowerCase(), entry.language).rest
  return (BY_WORD.get(key(entry.language, lemma)) ?? []).map(({ other }) => ({ lang: other.lang, word: other.word, gloss: other.gloss }))
}

/** Wrong meanings a false friend invites; used as the most tempting distractors. */
export function trapGlosses(entry: VocabularyEntry): string[] {
  const own = new Set([entry.senses[0].gloss, ...(entry.senses[0].altGlosses ?? [])].map((g) => normalize(g)))
  return [...new Set(falseFriendsOf(entry).map((f) => f.gloss))].filter((g) => !own.has(normalize(g)))
}

// ---------------------------------------------------------------------------
// Cognates / translations in the learner's own list
// ---------------------------------------------------------------------------

const glossesOf = (e: VocabularyEntry) =>
  new Set([e.senses[0].gloss, ...(e.senses[0].altGlosses ?? [])].map((g) => normalize(g).toLocaleLowerCase('tr')))

const bare = (e: VocabularyEntry) => stripDiacritics(normalize(e.lemma).toLocaleLowerCase())

/** Spelled nearly the same once accents are ignored: decision / décision / decisión. */
export function looksAlike(a: VocabularyEntry, b: VocabularyEntry): boolean {
  const x = bare(a)
  const y = bare(b)
  if (Math.min(x.length, y.length) < 4) return x === y
  return levenshtein(x, y) / Math.max(x.length, y.length) <= 0.3
}

export interface CrossLink {
  entry: VocabularyEntry
  /** Same meaning and nearly the same spelling. */
  cognate: boolean
}

/**
 * The same concept in the learner's other languages: words that share a Turkish meaning.
 * Knowing one is a bridge to the other, most of all when they are cognates.
 */
export function crossLanguageLinks(entry: VocabularyEntry, others: readonly VocabularyEntry[]): CrossLink[] {
  const mine = glossesOf(entry)
  return others
    .filter((o) => o.language !== entry.language && [...glossesOf(o)].some((g) => mine.has(g)))
    .map((o) => ({ entry: o, cognate: looksAlike(entry, o) }))
    .sort((a, b) => Number(b.cognate) - Number(a.cognate) || a.entry.language.localeCompare(b.entry.language))
}

export interface Concept {
  /** The Turkish meaning the words share. */
  gloss: string
  words: Partial<Record<TargetLanguage, VocabularyEntry[]>>
  languages: number
  /** Some of the words are cognates. */
  cognate: boolean
}

/**
 * Concepts across the three languages: words joined by a shared Turkish meaning (directly or
 * through each other). Only concepts present in at least two languages are returned.
 */
export function conceptGroups(all: readonly VocabularyEntry[]): Concept[] {
  const parent = all.map((_, i) => i)
  const find = (i: number): number => (parent[i] === i ? i : (parent[i] = find(parent[i])))
  const firstWithGloss = new Map<string, number>()
  all.forEach((e, i) => {
    for (const g of glossesOf(e)) {
      const j = firstWithGloss.get(g)
      if (j === undefined) firstWithGloss.set(g, i)
      else parent[find(i)] = find(j)
    }
  })
  const groups = new Map<number, VocabularyEntry[]>()
  all.forEach((e, i) => groups.set(find(i), [...(groups.get(find(i)) ?? []), e]))
  const out: Concept[] = []
  for (const members of groups.values()) {
    const languages = new Set(members.map((m) => m.language))
    if (languages.size < 2) continue
    const counts = new Map<string, number>()
    for (const m of members) for (const g of glossesOf(m)) counts.set(g, (counts.get(g) ?? 0) + 1)
    const gloss = [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'tr'))[0][0]
    const words: Concept['words'] = {}
    for (const m of members) words[m.language] = [...(words[m.language] ?? []), m]
    const cognate = members.some((a) => members.some((b) => a.language !== b.language && looksAlike(a, b)))
    out.push({ gloss, words, languages: languages.size, cognate })
  }
  return out.sort((a, b) => b.languages - a.languages || a.gloss.localeCompare(b.gloss, 'tr'))
}
