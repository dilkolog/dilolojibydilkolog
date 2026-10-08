import { normalize, splitArticle } from '../engine/answerCheck'
import type {
  CefrLevel,
  Collocation,
  EntrySource,
  Example,
  Gender,
  PartOfSpeech,
  TargetLanguage,
  VocabularyEntry,
  WordRelation,
} from '../engine/types'

/**
 * What the user types when adding a word. Only `word` and `meaning` are required; everything
 * else unlocks more exercise types (examples → context/cloze, collocations → collocation).
 */
export interface WordInput {
  /** "decision", or with article for FR/ES nouns: "la décision", "el año". */
  word: string
  /** Turkish meaning; several separated by commas or "/". */
  meaning: string
  partOfSpeech?: PartOfSpeech
  /** Needed only when the article doesn't show it (l'arbre). */
  gender?: Gender
  level?: CefrLevel
  /** Frequency rank (see FREQUENCY_BANDS); 0 or absent = unknown. */
  frequencyRank?: number
  /**
   * Example sentence. The word inside it may be marked with *asterisks* ("She *abandoned* it")
   * when it appears in a different form than typed and can't be found automatically.
   */
  example?: string
  exampleTranslation?: string
  /** Title of the reading text the example sentence was saved from. */
  exampleMetIn?: string
  /** One per line or ";": "make a decision = karar vermek (do a decision, give a decision)" */
  collocations?: string
  /** Lemmas of words this one is easily confused with (same language). */
  confusables?: string
  /** Personal note / mnemonic. */
  notes?: string
  /** Comma-separated labels, e.g. "iş, seyahat". */
  tags?: string
  /** Idioms: word-for-word meaning. */
  literal?: string
}

export class WordInputError extends Error {}

/**
 * Frequency bands. High-frequency words pay back far more per word learned (Nation 2006), so the
 * band is shown with each word and can order new words. A band is stored as a representative rank.
 */
export const FREQUENCY_BANDS = [
  { id: 'top1000', label: 'Çok sık (ilk 1000)', short: 'ilk 1000', rank: 500, max: 1000 },
  { id: 'top3000', label: 'Sık (ilk 3000)', short: 'ilk 3000', rank: 2000, max: 3000 },
  { id: 'top10000', label: 'Orta (ilk 10.000)', short: 'ilk 10.000', rank: 6000, max: 10000 },
  { id: 'rare', label: 'Nadir', short: 'nadir', rank: 20000, max: Infinity },
] as const

export type FrequencyBand = (typeof FREQUENCY_BANDS)[number]['id']

/**
 * Band of a rank. 0 = not looked up yet; -1 = not in the frequency list (rarer than its 20 000
 * words); -2 = can't be ranked (a phrase).
 */
export function bandOf(rank: number | undefined): (typeof FREQUENCY_BANDS)[number] | undefined {
  if (!rank || rank < -1) return undefined
  if (rank === -1) return FREQUENCY_BANDS[3]
  return FREQUENCY_BANDS.find((b) => rank <= b.max)
}

const GENDER_BY_ARTICLE: Record<string, Gender> = { le: 'm', un: 'm', el: 'm', la: 'f', une: 'f', una: 'f', los: 'm', unos: 'm', las: 'f', unas: 'f' }

// Closed word classes are short lists; open classes are guessed from articles and suffixes.
const CLOSED: Record<TargetLanguage, Partial<Record<PartOfSpeech, string[]>>> = {
  en: {
    pronoun: ['i', 'you', 'he', 'she', 'it', 'we', 'they', 'me', 'him', 'her', 'us', 'them', 'myself', 'yourself', 'himself', 'herself', 'itself', 'ourselves', 'themselves', 'someone', 'anyone', 'everyone', 'nobody', 'something', 'anything', 'everything', 'nothing', 'whoever', 'whatever'],
    preposition: ['in', 'on', 'at', 'by', 'for', 'with', 'about', 'against', 'between', 'into', 'through', 'during', 'before', 'after', 'above', 'below', 'from', 'up', 'down', 'of', 'off', 'over', 'under', 'among', 'beyond', 'despite', 'towards', 'toward', 'upon', 'within', 'without', 'throughout', 'beneath', 'beside', 'besides', 'via'],
    conjunction: ['and', 'but', 'or', 'nor', 'so', 'yet', 'because', 'although', 'though', 'unless', 'whereas', 'while', 'whether', 'since', 'once', 'whenever', 'wherever', 'nevertheless', 'moreover', 'furthermore', 'however', 'therefore', 'hence', 'thus'],
    adverb: ['very', 'often', 'always', 'never', 'seldom', 'soon', 'already', 'still', 'almost', 'quite', 'rather', 'perhaps', 'maybe', 'indeed', 'too', 'also', 'again', 'here', 'there', 'now', 'then', 'yesterday', 'tomorrow', 'today', 'abroad', 'ahead', 'afterwards', 'meanwhile', 'otherwise', 'somewhat'],
  },
  fr: {
    pronoun: ['je', 'tu', 'il', 'elle', 'on', 'nous', 'vous', 'ils', 'elles', 'me', 'te', 'se', 'lui', 'leur', 'eux', 'moi', 'toi', 'soi', 'quelqu\'un', 'personne', 'rien', 'chacun', 'chacune', 'quelque chose', 'celui', 'celle', 'ceux', 'celles', 'dont', 'lequel', 'laquelle'],
    preposition: ['à', 'de', 'en', 'dans', 'sur', 'sous', 'avec', 'sans', 'pour', 'par', 'chez', 'vers', 'entre', 'contre', 'depuis', 'pendant', 'avant', 'après', 'malgré', 'selon', 'parmi', 'envers', 'dès', 'durant', 'hormis', 'outre'],
    conjunction: ['et', 'ou', 'mais', 'donc', 'or', 'ni', 'car', 'que', 'quand', 'lorsque', 'puisque', 'quoique', 'cependant', 'pourtant', 'toutefois', 'néanmoins', 'ainsi', 'alors', 'bien que', 'parce que', 'tandis que'],
    adverb: ['très', 'souvent', 'toujours', 'jamais', 'déjà', 'encore', 'bientôt', 'ici', 'là', 'maintenant', 'hier', 'demain', 'aujourd\'hui', 'trop', 'assez', 'beaucoup', 'peu', 'presque', 'plutôt', 'peut-être', 'ensuite', 'enfin', 'aussi', 'vite', 'tard', 'tôt', 'partout', 'ailleurs', 'davantage', 'environ'],
  },
  es: {
    pronoun: ['yo', 'tú', 'él', 'ella', 'usted', 'nosotros', 'nosotras', 'vosotros', 'vosotras', 'ellos', 'ellas', 'ustedes', 'me', 'te', 'se', 'nos', 'os', 'le', 'les', 'lo', 'mí', 'ti', 'alguien', 'nadie', 'algo', 'nada', 'cualquiera', 'quienquiera'],
    preposition: ['a', 'ante', 'bajo', 'con', 'contra', 'de', 'desde', 'durante', 'en', 'entre', 'hacia', 'hasta', 'mediante', 'para', 'por', 'según', 'sin', 'sobre', 'tras'],
    conjunction: ['y', 'e', 'o', 'u', 'pero', 'sino', 'ni', 'que', 'porque', 'aunque', 'cuando', 'mientras', 'pues', 'sin embargo', 'no obstante', 'así que', 'ya que', 'puesto que'],
    adverb: ['muy', 'siempre', 'nunca', 'jamás', 'ya', 'todavía', 'aún', 'pronto', 'aquí', 'allí', 'ahí', 'ahora', 'ayer', 'mañana', 'hoy', 'demasiado', 'bastante', 'mucho', 'poco', 'casi', 'quizás', 'quizá', 'también', 'tampoco', 'luego', 'después', 'antes', 'despacio', 'tarde', 'temprano'],
  },
}

type SuffixRule = [RegExp, PartOfSpeech]
const SUFFIXES: Record<TargetLanguage, SuffixRule[]> = {
  en: [
    [/(tion|sion|ment|ness|ity|ship|hood|ance|ence|ism|dom|ure|ery|cy)$/, 'noun'],
    [/(ward|wise)$/, 'adverb'],
    [/(ize|ise|ify)$/, 'verb'],
    [/(ous|ful|less|able|ible|ive|ic|ical|ish|ary|ant|ent|al)$/, 'adjective'],
    // -ly is usually an adverb, but friendly, likely, costly… are adjectives: the AI corrects those.
    [/ly$/, 'adverb'],
  ],
  fr: [
    [/ment$/, 'adverb'],
    [/(er|ir|re|oir)$/, 'verb'],
    [/(eux|euse|able|ible|if|ive|ique|al|ale|aire|el|elle|ant|ente)$/, 'adjective'],
    [/(tion|sion|té|ence|ance|isme|age|ure|eur|esse)$/, 'noun'],
  ],
  es: [
    [/mente$/, 'adverb'],
    [/(ar|er|ir|arse|erse|irse)$/, 'verb'],
    [/(oso|osa|able|ible|ivo|iva|ico|ica|al|ante|ente)$/, 'adjective'],
    [/(ción|sión|dad|tad|ez|eza|ismo|miento|aje|ura|or)$/, 'noun'],
  ],
}

/**
 * Best guess at a word's part of speech from its shape alone: an article or "to", closed-class
 * word lists and typical suffixes. Returns undefined when nothing points anywhere; the AI (when
 * available) gives the definitive answer.
 */
export function guessPartOfSpeech(word: string, language: TargetLanguage): PartOfSpeech | undefined {
  const w = normalize(word).toLocaleLowerCase()
  if (!w) return undefined
  for (const [pos, list] of Object.entries(CLOSED[language]) as [PartOfSpeech, string[]][]) {
    if (list.includes(w)) return pos
  }
  // Reflexive infinitives: se souvenir, s'asseoir.
  if (language === 'fr' && /^(se |s['’])\S+$/.test(w)) return 'verb'
  const { article, rest } = splitArticle(w, language)
  if (article && rest) {
    if (rest.includes(' ')) return 'phrase'
    return language === 'en' && article === 'to' ? 'verb' : 'noun'
  }
  if (/\s/.test(w)) return 'phrase'
  return SUFFIXES[language].find(([re]) => re.test(w))?.[1]
}

/** Marks the first occurrence of `word` in `sentence` with asterisks, as the add-word form expects. */
export function markWord(sentence: string, word: string): string {
  if (!word) return sentence
  const i = sentence.toLowerCase().indexOf(word.toLowerCase())
  return i < 0 ? sentence : `${sentence.slice(0, i)}*${sentence.slice(i, i + word.length)}*${sentence.slice(i + word.length)}`
}

/** Finds the surface form of `lemma` inside `sentence`, e.g. "decided" for "decide". */
export function findForm(sentence: string, lemma: string): string | undefined {
  const marked = sentence.match(/\*([^*]+)\*/)
  if (marked) return marked[1]
  // Apostrophes split tokens so elided articles (j', l', d') don't stick to the word.
  const tokens = sentence.match(/[\p{L}-]+/gu) ?? []
  const target = normalize(lemma)
  const exact = tokens.find((t) => normalize(t) === target)
  if (exact) return exact
  // Inflected forms usually share a long prefix with the lemma (decide → decided, improve → improving).
  const minPrefix = Math.max(3, Math.min(target.length - 1, 4))
  let best: { token: string; len: number } | undefined
  for (const t of tokens) {
    const n = normalize(t)
    let i = 0
    while (i < n.length && i < target.length && n[i] === target[i]) i++
    if (i >= minPrefix && (!best || i > best.len)) best = { token: t, len: i }
  }
  return best?.token
}

function splitList(s: string | undefined, separators: RegExp): string[] {
  return (s ?? '')
    .split(separators)
    .map((x) => x.trim())
    .filter(Boolean)
}

/** "make a decision = karar vermek (do a decision, give a decision)" */
export function parseCollocations(s: string | undefined): Collocation[] {
  return splitList(s, /\n|;/).map((line) => {
    const wrong = line.match(/\(([^)]*)\)\s*$/)
    const body = wrong ? line.slice(0, wrong.index).trim() : line
    const [phrase, translation = ''] = body.split('=').map((x) => x.trim())
    const wrongVariants = splitList(wrong?.[1], /,/)
    return { phrase, translation, wrongVariants: wrongVariants.length ? wrongVariants : undefined }
  })
}

export function wordId(language: TargetLanguage, lemma: string): string {
  return `${language}:${normalize(lemma)}`
}

export function createEntry(
  input: WordInput,
  language: TargetLanguage,
  now: Date,
  source: EntrySource = 'user',
): VocabularyEntry {
  // Typographic apostrophes (l’arbre) work like the plain one, so the article is still split off.
  input = { ...input, word: input.word.replace(/[’‘´`]/g, "'") }
  const raw = normalize(input.word)
  if (!raw) throw new WordInputError('Kelime boş olamaz.')
  const meanings = splitList(input.meaning, /,|\//)
  if (!meanings.length) throw new WordInputError('Türkçe anlamı yaz.')

  // English articles aren't part of the lemma; FR/ES articles carry the noun's gender.
  const { article, rest } = splitArticle(input.word.trim().toLowerCase(), language)
  const lemma = article && rest ? rest.trim() : input.word.trim()
  const keepArticle = language !== 'en' && article ? article : undefined
  const gender = input.gender ?? (keepArticle ? GENDER_BY_ARTICLE[keepArticle] : undefined)
  const partOfSpeech = input.partOfSpeech ?? (keepArticle ? 'noun' : (guessPartOfSpeech(input.word, language) ?? 'other'))

  const examples: Example[] = []
  if (input.example?.trim()) {
    const form = findForm(input.example, lemma)
    // "l'aïus" with "un long laïus" in the sentence: the apostrophe was a slip, the word is "laïus".
    if (!form && keepArticle?.endsWith("'") && findForm(input.example, keepArticle.slice(0, -1) + lemma)) {
      return createEntry({ ...input, word: keepArticle.slice(0, -1) + lemma }, language, now, source)
    }
    // A sentence without the word is still kept (to read and to write from dictation); with no form
    // to blank out, it stays out of the fill-in-the-blank questions.
    examples.push({
      text: input.example.replace(/\*/g, '').trim(),
      translation: input.exampleTranslation?.trim() ?? '',
      form: form ?? '',
      ...(input.exampleMetIn ? { metIn: input.exampleMetIn } : {}),
    })
  }

  const relations: WordRelation[] = splitList(input.confusables, /,|;/).map((l) => ({
    type: 'confusable',
    targetId: wordId(language, splitArticle(normalize(l), language).rest),
  }))

  const id = wordId(language, lemma)
  return {
    id,
    language,
    lemma,
    partOfSpeech,
    gender,
    article: keepArticle,
    cefr: input.level ?? 'B1',
    frequencyRank: input.frequencyRank ?? 0,
    register: 'neutral',
    senses: [{ id: `${id}#1`, gloss: meanings[0], altGlosses: meanings.slice(1), examples }],
    collocations: parseCollocations(input.collocations),
    relations,
    wordFamily: [],
    tags: splitList(input.tags, /,/),
    notes: input.notes?.trim() || undefined,
    literal: input.literal?.trim() || undefined,
    source,
    addedAt: now,
  }
}

// ---------------------------------------------------------------------------
// Bulk import (CSV / TSV pasted from a spreadsheet)
// ---------------------------------------------------------------------------

/** Column order of the import format. Shown to the user in the import screen. */
export const IMPORT_COLUMNS = [
  'kelime',
  'anlam',
  'örnek cümle',
  'örnek çevirisi',
  "collocation'lar",
  'karıştırılan kelimeler',
] as const

/** Minimal CSV parser: handles quoted cells, doubled quotes and newlines inside quotes. */
export function parseDelimited(text: string): string[][] {
  const firstLine = text.split('\n', 1)[0]
  const delimiter = firstLine.includes('\t') ? '\t' : firstLine.includes(';') ? ';' : ','
  const rows: string[][] = []
  let row: string[] = []
  let cell = ''
  let quoted = false
  for (let i = 0; i < text.length; i++) {
    const ch = text[i]
    if (quoted) {
      if (ch === '"' && text[i + 1] === '"') {
        cell += '"'
        i++
      } else if (ch === '"') quoted = false
      else cell += ch
    } else if (ch === '"' && cell === '') quoted = true
    else if (ch === delimiter) {
      row.push(cell)
      cell = ''
    } else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && text[i + 1] === '\n') i++
      row.push(cell)
      rows.push(row)
      row = []
      cell = ''
    } else cell += ch
  }
  if (cell || row.length) {
    row.push(cell)
    rows.push(row)
  }
  return rows.filter((r) => r.some((c) => c.trim()))
}

export interface ImportResult {
  entries: VocabularyEntry[]
  errors: { line: number; message: string }[]
  /** Words already in the vocabulary (or repeated in the file); skipped. */
  duplicates: string[]
  /** Rows added with a note, e.g. a sentence the word isn't found in. */
  warnings: { line: number; message: string }[]
}

/** How a pasted word list is laid out (Quizlet-style options). */
export type TermSeparator = 'auto' | 'tab' | 'comma' | 'semicolon' | 'dash' | 'equals' | 'colon' | 'custom'
export type RowSeparator = 'newline' | 'semicolon' | 'custom'

export interface ListFormat {
  term: TermSeparator
  row: RowSeparator
  customTerm?: string
  customRow?: string
  /** Meaning comes first ("karar - decision"). */
  swap?: boolean
  /** Tags added to every imported word. */
  tags?: string
}

export const DEFAULT_FORMAT: ListFormat = { term: 'auto', row: 'newline' }

const TERM_SEP: Record<Exclude<TermSeparator, 'auto' | 'custom'>, string> = {
  tab: '\t',
  comma: ',',
  semicolon: ';',
  dash: ' - ',
  equals: '=',
  colon: ':',
}

/** Picks the separator used on most lines: tab first, then the common word-list notations. */
export function detectTermSeparator(lines: string[]): Exclude<TermSeparator, 'auto' | 'custom'> {
  const candidates: [Exclude<TermSeparator, 'auto' | 'custom'>, RegExp][] = [
    ['tab', /\t/],
    ['dash', /\s[-–—]\s/],
    ['equals', /=/],
    ['colon', /:/],
    ['semicolon', /;/],
    ['comma', /,/],
  ]
  for (const [name, re] of candidates) {
    if (lines.length && lines.filter((l) => re.test(l)).length >= Math.ceil(lines.length * 0.6)) return name
  }
  return 'tab'
}

const stripHtml = (s: string) => s.replace(/<br\s*\/?>/gi, ' ').replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&')

/** Rows of cells from a pasted list, JSON array, CSV/TSV or Anki export. */
/** At least three words, or ends like a sentence: a third column is an example, not more meaning. */
function looksLikeSentence(t: string): boolean {
  const x = t.trim()
  return x.split(/\s+/).length >= 3 || /[.!?…]$/.test(x)
}

export function parseWordList(text: string, fmt: ListFormat = DEFAULT_FORMAT): string[][] {
  const trimmed = text.trim()
  // JSON: [{word, meaning, …}] or Quizlet-like [{term, definition}].
  if (trimmed.startsWith('[')) {
    try {
      const data = JSON.parse(trimmed) as Record<string, unknown>[]
      const str = (v: unknown) => (typeof v === 'string' ? v : '')
      return data.map((o) => [
        str(o.word ?? o.term ?? o.front),
        str(o.meaning ?? o.definition ?? o.back),
        str(o.example),
        str(o.exampleTranslation),
        str(o.collocations),
        str(o.confusables),
      ])
    } catch {
      // Not JSON after all; fall through to text parsing.
    }
  }
  const rowSep = fmt.row === 'semicolon' ? ';' : fmt.row === 'custom' && fmt.customRow ? fmt.customRow : '\n'
  const lines = text
    .replace(/\r/g, '')
    .split(rowSep)
    .filter((l) => l.trim() && !l.startsWith('#')) // Anki exports start with "#separator:tab" headers.
  const term = fmt.term === 'auto' ? detectTermSeparator(lines) : fmt.term
  let rows: string[][]
  if (term === 'tab' || term === 'comma') {
    // Spreadsheet-like: full CSV/TSV parsing with quotes, all columns kept.
    rows = term === 'tab' ? lines.map((l) => l.split('\t')) : parseDelimited(lines.join('\n'))
  } else {
    // Word-list notations split on the FIRST separator only, so meanings may contain it.
    const sep = term === 'custom' ? fmt.customTerm || '\t' : TERM_SEP[term]
    const re = term === 'dash' ? /\s[-–—]\s/ : null
    const cut = (l: string): [string, string] | null => {
      const m = re ? l.match(re) : null
      const i = re ? (m?.index ?? -1) : l.indexOf(sep)
      const len = re ? (m?.[0].length ?? 0) : sep.length
      return i < 0 ? null : [l.slice(0, i), l.slice(i + len)]
    }
    rows = lines.map((l) => {
      const first = cut(l)
      // "breeze -" (meaning left empty): drop the dangling separator from the word.
      if (!first) return [l.replace(/\s*([-–—=:;|]|\t)\s*$/, '')]
      const [word, rest] = first
      // "word - meaning - sentence it was met in [- its translation]": a third part that reads like a
      // sentence becomes the example; otherwise the separator stays part of the meaning.
      const second = cut(rest)
      if (!second || !looksLikeSentence(second[1].split(re ?? sep)[0] ?? '')) return [word, rest]
      const third = cut(second[1])
      return third && looksLikeSentence(third[1]) ? [word, second[0], third[0], third[1]] : [word, second[0], second[1]]
    })
  }
  rows = rows.map((r) => r.map((c) => stripHtml(c).trim()))
  return fmt.swap ? rows.map(([a = '', b = '', ...rest]) => [b, a, ...rest]) : rows
}

export function importWords(
  text: string,
  language: TargetLanguage,
  existingIds: ReadonlySet<string>,
  now: Date,
  fmt: ListFormat = DEFAULT_FORMAT,
): ImportResult {
  const rows = parseWordList(text, fmt)
  const result: ImportResult = { entries: [], errors: [], duplicates: [], warnings: [] }
  const seen = new Set(existingIds)
  rows.forEach((cells, i) => {
    const line = i + 1
    if (i === 0 && ['kelime', 'word', 'term', 'anlam', 'meaning'].includes(normalize(cells[0] ?? ''))) return
    const [word, meaning, example, exampleTranslation, collocations, confusables] = cells.map((c) => c.trim())
    try {
      // Spread `now` by row so the file order is kept as the introduction order.
      const entry = createEntry(
        { word, meaning, example, exampleTranslation, collocations, confusables, tags: fmt.tags },
        language,
        new Date(now.getTime() + i),
        'import',
      )
      if (seen.has(entry.id)) {
        result.duplicates.push(entry.lemma)
        return
      }
      seen.add(entry.id)
      result.entries.push(entry)
      if (entry.senses[0].examples[0]?.form === '') {
        result.warnings.push({ line, message: `"${entry.lemma}" cümlede geçmiyor; cümle yine eklenir ama boşluk doldurmada çıkmaz. Çekimli hâliyse *yıldız* içine al.` })
      }
    } catch (e) {
      result.errors.push({ line, message: e instanceof Error ? e.message : String(e) })
    }
  })
  return result
}

// ---------------------------------------------------------------------------
// Editing
// ---------------------------------------------------------------------------

/** Turns an entry back into form fields; the inverse of `createEntry` for the editable parts. */
export function entryToInput(entry: VocabularyEntry): WordInput {
  const sense = entry.senses[0]
  const ex = sense.examples[0]
  // Only mark the form with asterisks when automatic detection wouldn't find it again.
  const example = ex && ex.form && findForm(ex.text, entry.lemma) !== ex.form ? ex.text.replace(ex.form, `*${ex.form}*`) : ex?.text
  const article = entry.article ? (entry.article.endsWith("'") ? entry.article : `${entry.article} `) : ''
  return {
    word: `${article}${entry.lemma}`,
    meaning: [sense.gloss, ...(sense.altGlosses ?? [])].join(', '),
    partOfSpeech: entry.partOfSpeech,
    gender: entry.gender,
    level: entry.cefr,
    example: example ?? '',
    exampleTranslation: ex?.translation ?? '',
    collocations: entry.collocations
      .map((c) => `${c.phrase} = ${c.translation}${c.wrongVariants?.length ? ` (${c.wrongVariants.join(', ')})` : ''}`)
      .join('\n'),
    confusables: entry.relations
      .filter((r) => r.type === 'confusable')
      .map((r) => r.targetId.slice(r.targetId.indexOf(':') + 1))
      .join(', '),
    notes: entry.notes ?? '',
    literal: entry.literal ?? '',
    tags: entry.tags.join(', '),
    frequencyRank: entry.frequencyRank,
  }
}

/**
 * Applies form edits to an existing entry. The id never changes, so learning history stays
 * attached; data the form doesn't show (word family, other senses, extra examples) is kept.
 */
export function updateEntry(existing: VocabularyEntry, input: WordInput): VocabularyEntry {
  const edited = createEntry(input, existing.language, existing.addedAt ?? new Date(), existing.source)
  const [oldSense, ...otherSenses] = existing.senses
  const oldExample = oldSense.examples[0]
  // The same sentence keeps what the form doesn't show (where it was met, a personal mark).
  const newExample =
    edited.senses[0].examples[0] && oldExample && normalize(edited.senses[0].examples[0].text) === normalize(oldExample.text)
      ? { ...oldExample, ...edited.senses[0].examples[0] }
      : edited.senses[0].examples[0]
  const otherExamples = oldSense.examples.slice(1)
  return {
    ...existing,
    lemma: edited.lemma,
    partOfSpeech: input.partOfSpeech ? edited.partOfSpeech : existing.partOfSpeech,
    gender: edited.gender,
    article: edited.article,
    cefr: input.level ?? existing.cefr,
    frequencyRank: input.frequencyRank ?? existing.frequencyRank,
    senses: [
      {
        ...oldSense,
        gloss: edited.senses[0].gloss,
        altGlosses: edited.senses[0].altGlosses,
        examples: newExample ? [newExample, ...otherExamples] : otherExamples,
      },
      ...otherSenses,
    ],
    collocations: edited.collocations,
    relations: [...existing.relations.filter((r) => r.type !== 'confusable'), ...edited.relations],
    notes: edited.notes,
    literal: edited.literal,
    tags: edited.tags,
  }
}

/** Most example sentences kept per word: enough variety, without a wall of text. */
export const MAX_EXAMPLES = 8

/**
 * Adds another example sentence to the word's main sense. Seeing a word in varied contexts
 * builds a flexible memory instead of one tied to a single sentence (encoding variability).
 */
export function addExample(entry: VocabularyEntry, text: string, translation = '', personal = false): VocabularyEntry {
  const sense = entry.senses[0]
  const clean = text.replace(/\*/g, '').trim()
  if (!clean) throw new WordInputError('Cümle boş olamaz.')
  if (sense.examples.some((e) => normalize(e.text) === normalize(clean))) throw new WordInputError('Bu cümle zaten var.')
  if (sense.examples.length >= MAX_EXAMPLES) throw new WordInputError(`En fazla ${MAX_EXAMPLES} örnek cümle eklenebilir.`)
  const form = findForm(text, entry.lemma) ?? (personal ? undefined : '')
  // The learner's own sentence is about using the word, so it has to be in it; any other may lack it.
  if (form === undefined) {
    throw new WordInputError(`Cümlede "${entry.lemma}" bulunamadı. Cümlede kelimeyi *yıldız* içine al: "She *abandoned* it".`)
  }
  const example = { text: clean, translation: translation.trim(), form, ...(personal ? { personal: true } : {}) }
  return { ...entry, senses: [{ ...sense, examples: [...sense.examples, example] }, ...entry.senses.slice(1)] }
}

export function removeExample(entry: VocabularyEntry, index: number): VocabularyEntry {
  const sense = entry.senses[0]
  return { ...entry, senses: [{ ...sense, examples: sense.examples.filter((_, i) => i !== index) }, ...entry.senses.slice(1)] }
}

/** Keys that identify a word for duplicate checks: its id and the id its current lemma would get. */
export function wordKeys(entries: readonly VocabularyEntry[]): Set<string> {
  const keys = new Set<string>()
  for (const e of entries) {
    keys.add(e.id)
    keys.add(wordId(e.language, e.lemma))
  }
  return keys
}
