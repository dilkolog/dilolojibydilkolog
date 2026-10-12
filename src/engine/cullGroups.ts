import type { UserWordState, VocabularyEntry } from './types'
import { addedTime } from './types'

/**
 * Quick groups for sorting out a long word list (Kelimeler → Seç): the words that are most often
 * not worth keeping, found for the learner so they do not have to scan hundreds of rows by eye.
 */
export interface CullGroup {
  id: 'struggling' | 'untouched' | 'rare' | 'samples'
  label: string
  /** Why these words are worth a look, in a line. */
  hint: string
  matches: (entry: VocabularyEntry, state: UserWordState | undefined, now: Date) => boolean
}

const DAY_MS = 86_400_000
/** Ranks past this (or not in the frequency list at all) are words most learners will hardly meet. */
export const RARE_RANK = 20_000
/** A word never asked after this long on the list has been passed over every time. */
export const UNTOUCHED_DAYS = 7

export const CULL_GROUPS: CullGroup[] = [
  {
    id: 'struggling',
    label: 'Hep yanlış yaptıkların',
    hint: 'En az 2 kez yanlış, doğrusundan fazla yanlış: bu kelime sana şu an fazla zor ya da gereksiz olabilir.',
    matches: (_e, s) => !!s && s.stats.wrong >= 2 && s.stats.wrong > s.stats.correct,
  },
  {
    id: 'untouched',
    label: 'Hiç sorulmamışlar',
    hint: `${UNTOUCHED_DAYS} günden uzun süredir listede olup bir kez bile çalışılmamış kelimeler.`,
    matches: (e, s, now) => (!s || s.stats.reviews === 0) && now.getTime() - addedTime(e) > UNTOUCHED_DAYS * DAY_MS,
  },
  {
    id: 'rare',
    label: 'Çok nadir kelimeler',
    hint: 'Sık kullanılan 20.000 kelimenin dışındakiler: günlük dilde nadiren karşına çıkar.',
    matches: (e) => e.frequencyRank >= RARE_RANK || e.frequencyRank === -1,
  },
  {
    id: 'samples',
    label: 'Örnek kelimeler',
    hint: 'Uygulamayı denemen için yüklenen kelimeler.',
    matches: (e) => e.source === 'sample',
  },
]

/** The ids of each group among `entries`, in the groups' order. */
export function cullIds(entries: readonly VocabularyEntry[], stateById: ReadonlyMap<string, UserWordState>, now: Date): Record<CullGroup['id'], string[]> {
  const out = { struggling: [], untouched: [], rare: [], samples: [] } as Record<CullGroup['id'], string[]>
  for (const g of CULL_GROUPS) out[g.id] = entries.filter((e) => g.matches(e, stateById.get(e.id), now)).map((e) => e.id)
  return out
}
