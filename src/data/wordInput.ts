import { normalize, splitArticle } from '../engine/answerCheck'
import type {
  CefrLevel,
  Collocation,
  EntrySource,
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
  /**
   * Example sentence. The word inside it may be marked with *asterisks* ("She *abandoned* it")
   * when it appears in a different form than typed and can't be found automatically.
   */
  example?: string
  exampleTranslation?: string
  /** One per line or ";": "make a decision = karar vermek (do a decision, give a decision)" */
  collocations?: string
  /** Lemmas of words this one is easily confused with (same language). */
  confusables?: string
  /** Personal note / mnemonic. */
  notes?: string
  /** Comma-separated labels, e.g. "iş, seyahat". */
  tags?: string
}

export class WordInputError extends Error {}

const GENDER_BY_ARTICLE: Record<string, Gender> = { le: 'm', un: 'm', el: 'm', la: 'f', une: 'f', una: 'f' }

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

  const examples = []
  if (input.example?.trim()) {
    const form = findForm(input.example, lemma)
    if (!form) {
      throw new WordInputError(
        `Örnek cümlede "${lemma}" bulunamadı. Cümlede kelimeyi *yıldız* içine al: "She *abandoned* it".`,
      )
    }
    examples.push({
      text: input.example.replace(/\*/g, '').trim(),
      translation: input.exampleTranslation?.trim() ?? '',
      form,
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
    frequencyRank: 0,
    register: 'neutral',
    senses: [{ id: `${id}#1`, gloss: meanings[0], altGlosses: meanings.slice(1), examples }],
    collocations: parseCollocations(input.collocations),
    relations,
    wordFamily: [],
    tags: splitList(input.tags, /,/),
    notes: input.notes?.trim() || undefined,
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
    rows = lines.map((l) => {
      const m = re ? l.match(re) : null
      const i = re ? (m?.index ?? -1) : l.indexOf(sep)
      const len = re ? (m?.[0].length ?? 0) : sep.length
      // "breeze -" (meaning left empty): drop the dangling separator from the word.
      return i < 0 ? [l.replace(/\s*([-–—=:;|]|\t)\s*$/, '')] : [l.slice(0, i), l.slice(i + len)]
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
  const result: ImportResult = { entries: [], errors: [], duplicates: [] }
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
  const example = ex && findForm(ex.text, entry.lemma) !== ex.form ? ex.text.replace(ex.form, `*${ex.form}*`) : ex?.text
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
    tags: entry.tags.join(', '),
  }
}

/**
 * Applies form edits to an existing entry. The id never changes, so learning history stays
 * attached; data the form doesn't show (word family, other senses, extra examples) is kept.
 */
export function updateEntry(existing: VocabularyEntry, input: WordInput): VocabularyEntry {
  const edited = createEntry(input, existing.language, existing.addedAt ?? new Date(), existing.source)
  const [oldSense, ...otherSenses] = existing.senses
  const newExample = edited.senses[0].examples[0]
  const otherExamples = oldSense.examples.slice(1)
  return {
    ...existing,
    lemma: edited.lemma,
    partOfSpeech: input.partOfSpeech ? edited.partOfSpeech : existing.partOfSpeech,
    gender: edited.gender,
    article: edited.article,
    cefr: input.level ?? existing.cefr,
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
    tags: edited.tags,
  }
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
