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
}

export class WordInputError extends Error {}

const GENDER_BY_ARTICLE: Record<string, Gender> = { le: 'm', un: 'm', el: 'm', la: 'f', une: 'f', una: 'f' }

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
  const partOfSpeech = input.partOfSpeech ?? (keepArticle ? 'noun' : 'other')

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
    tags: [],
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

export function importWords(
  text: string,
  language: TargetLanguage,
  existingIds: ReadonlySet<string>,
  now: Date,
): ImportResult {
  const rows = parseDelimited(text)
  const result: ImportResult = { entries: [], errors: [], duplicates: [] }
  const seen = new Set(existingIds)
  rows.forEach((cells, i) => {
    const line = i + 1
    if (i === 0 && ['kelime', 'word'].includes(normalize(cells[0] ?? ''))) return
    const [word, meaning, example, exampleTranslation, collocations, confusables] = cells.map((c) => c.trim())
    try {
      // Spread `now` by row so the file order is kept as the introduction order.
      const entry = createEntry(
        { word, meaning, example, exampleTranslation, collocations, confusables },
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
