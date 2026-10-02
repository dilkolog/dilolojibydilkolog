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
  const { reviews, wrong, consecutiveWrong } = state.stats
  const lapses = Object.values(state.skills).reduce((n, c) => n + c.lapses, 0)
  return consecutiveWrong >= 3 || lapses >= 5 || (reviews >= 6 && wrong / reviews >= 0.5) || mistakes.filter((m) => m.entryId === state.entryId).length >= 4
}

export function listHealth(vocabulary: readonly VocabularyEntry[], states: readonly UserWordState[], mistakes: readonly Mistake[], now: Date): ListHealth {
  const own = vocabulary.filter((e) => e.source !== 'sample')
  const stateById = new Map(states.map((s) => [s.entryId, s]))

  // Same word: same letters (accents aside), or a typo apart (one letter; two in long words,
  // e.g. swapped letters) with the same meaning.
  const groups: VocabularyEntry[][] = []
  const seen = new Set<string>()
  for (const e of own) {
    if (seen.has(e.id)) continue
    const group = own.filter(
      (o) =>
        o.language === e.language &&
        !seen.has(o.id) &&
        (key(o) === key(e) || (key(e).length > 4 && levenshtein(key(o), key(e)) <= (key(e).length >= 7 ? 2 : 1) && normalize(o.senses[0].gloss) === normalize(e.senses[0].gloss))),
    )
    if (group.length > 1) {
      groups.push(group)
      for (const g of group) seen.add(g.id)
    }
  }

  return {
    duplicates: groups,
    leeches: own.filter((e) => {
      const s = stateById.get(e.id)
      return !!s && isLeech(s, mistakes)
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
