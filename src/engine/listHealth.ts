import { levenshtein, normalize, stripDiacritics } from './answerCheck'
import type { Mistake, UserWordState, VocabularyEntry } from './types'

/**
 * A check-up of the word list: what's doubled, what keeps failing, what's missing. Each finding
 * comes with the entries it concerns, so the screen can offer the fix next to it.
 */
export interface ListHealth {
  /** The same word entered twice (or once with a typo): groups of two or more. */
  duplicates: VocabularyEntry[][]
  /** Words that keep failing (leeches): better relearned from scratch, given a mnemonic, or dropped. */
  leeches: VocabularyEntry[]
  /** No example sentence at all (own or real): exercises in context can't be made. */
  noExample: VocabularyEntry[]
  /** French/Spanish nouns without a gender: the article exercise can't be made. */
  noGender: VocabularyEntry[]
  /** Added long ago and never started: still wanted? */
  stale: VocabularyEntry[]
}

const STALE_DAYS = 60

const key = (e: VocabularyEntry) => stripDiacritics(normalize(e.lemma))

export function isLeech(state: UserWordState, mistakes: readonly Mistake[] = []): boolean {
  return leech(state, mistakes.filter((m) => m.entryId === state.entryId).length)
}

function leech(state: UserWordState, mistakeCount: number): boolean {
  const { reviews, wrong, consecutiveWrong } = state.stats
  const lapses = Object.values(state.skills).reduce((n, c) => n + c.lapses, 0)
  return consecutiveWrong >= 3 || lapses >= 5 || (reviews >= 6 && wrong / reviews >= 0.5) || mistakeCount >= 4
}

export function listHealth(vocabulary: readonly VocabularyEntry[], states: readonly UserWordState[], mistakes: readonly Mistake[], now: Date): ListHealth {
  const own = vocabulary.filter((e) => e.source !== 'sample')
  const stateById = new Map(states.map((s) => [s.entryId, s]))

  // Same word: same letters (accents aside), or a typo apart (one letter; two in long words,
  // e.g. swapped letters) with the same meaning.
  // Words are bucketed by spelling and by meaning first, so only likely pairs are compared: a list
  // of thousands stays fast (comparing every pair took seconds at 2,000 words).
  const keys = own.map(key)
  const glosses = own.map((e) => normalize(e.senses[0].gloss))
  const bucket = (m: Map<string, number[]>, k: string, i: number) => m.set(k, [...(m.get(k) ?? []), i])
  const byKey = new Map<string, number[]>()
  const byGloss = new Map<string, number[]>()
  own.forEach((e, i) => {
    bucket(byKey, `${e.language}|${keys[i]}`, i)
    bucket(byGloss, `${e.language}|${glosses[i]}`, i)
  })
  const groups: VocabularyEntry[][] = []
  const seen = new Set<string>()
  own.forEach((e, i) => {
    if (seen.has(e.id)) return
    const k = keys[i]
    const typo = k.length > 4 ? (byGloss.get(`${e.language}|${glosses[i]}`) ?? []).filter((j) => levenshtein(keys[j], k) <= (k.length >= 7 ? 2 : 1)) : []
    const group = [...new Set([...(byKey.get(`${e.language}|${k}`) ?? []), ...typo])]
      .sort((a, b) => a - b)
      .map((j) => own[j])
      .filter((o) => !seen.has(o.id))
    if (group.length > 1) {
      groups.push(group)
      for (const g of group) seen.add(g.id)
    }
  })
  const mistakeCount = new Map<string, number>()
  for (const m of mistakes) mistakeCount.set(m.entryId, (mistakeCount.get(m.entryId) ?? 0) + 1)

  return {
    duplicates: groups,
    leeches: own.filter((e) => {
      const s = stateById.get(e.id)
      return !!s && leech(s, mistakeCount.get(e.id) ?? 0)
    }),
    noExample: own.filter((e) => !e.senses.some((s) => s.examples.length) && !e.corpus?.length && e.partOfSpeech !== 'phrase'),
    noGender: own.filter((e) => e.language !== 'en' && e.partOfSpeech === 'noun' && !e.gender),
    stale: own.filter((e) => !stateById.has(e.id) && e.addedAt && now.getTime() - new Date(e.addedAt).getTime() > STALE_DAYS * 86_400_000),
  }
}

/** The copy to keep when merging duplicates: the one with more practice behind it. */
export function keeperOf(group: readonly VocabularyEntry[], states: readonly UserWordState[]): VocabularyEntry {
  const reviews = (e: VocabularyEntry) => states.find((s) => s.entryId === e.id)?.stats.reviews ?? -1
  return [...group].sort((a, b) => reviews(b) - reviews(a))[0]
}

/** Folds the others' examples, tags, notes and meanings into the keeper. */
export function mergeEntries(keeper: VocabularyEntry, others: readonly VocabularyEntry[]): VocabularyEntry {
  const sense = keeper.senses[0]
  const examples = [...sense.examples]
  const glosses = new Set([sense.gloss, ...(sense.altGlosses ?? [])].map((g) => normalize(g)))
  const alt = [...(sense.altGlosses ?? [])]
  for (const o of others) {
    for (const x of o.senses[0].examples) if (!examples.some((y) => y.text === x.text)) examples.push(x)
    for (const g of [o.senses[0].gloss, ...(o.senses[0].altGlosses ?? [])]) {
      if (!glosses.has(normalize(g))) {
        glosses.add(normalize(g))
        alt.push(g)
      }
    }
  }
  const notes = [keeper.notes, ...others.map((o) => o.notes)].filter((n): n is string => !!n?.trim())
  return {
    ...keeper,
    senses: [{ ...sense, examples, altGlosses: alt.length ? alt : undefined }, ...keeper.senses.slice(1)],
    tags: [...new Set([...keeper.tags, ...others.flatMap((o) => o.tags)])],
    notes: [...new Set(notes)].join('\n') || undefined,
    gender: keeper.gender ?? others.find((o) => o.gender)?.gender,
    article: keeper.article ?? others.find((o) => o.article)?.article,
  }
}
