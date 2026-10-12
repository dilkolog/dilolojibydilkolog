import { interleave, type PlanItem } from './dailyPlan'
import { EXERCISES, exerciseTypesFor } from './exercises'
import type { QuestMetric } from './quests'
import { isDueFor } from './practice'
import { pick, shuffle, type Rng } from './rng'
import { unlockedSkills } from './selection'
import type { EngineOptions, Skill, UserWordState, VocabularyEntry } from './types'

/** Skills a typing quest takes its questions from, in order of preference. */
const TYPED_SKILLS: Skill[] = ['recall', 'production', 'collocation', 'listening']

/**
 * A round aimed at one of the day's quests that counts answers of one kind: questions answered by
 * typing, or listening questions. Words due now come first, then the rest of the words being learned;
 * each gets one question of the wanted kind (none when it has no such question). Normal mode, so the
 * answers count towards the quest like any other of the day.
 */
export function buildQuestPlan(
  metric: Extract<QuestMetric, 'typedCorrect' | 'listenCorrect'>,
  remaining: number,
  { catalog, states, rng, now, options = {} }: { catalog: readonly VocabularyEntry[]; states: readonly UserWordState[]; rng: Rng; now: Date; options?: EngineOptions },
): PlanItem[] {
  // A few more questions than are left: some will be answered wrong.
  const want = Math.min(30, Math.max(8, Math.ceil(remaining * 1.5)))
  const byId = new Map(catalog.map((e) => [e.id, e]))
  const learning = states.filter((s) => byId.has(s.entryId) && Object.keys(s.skills).length > 0)
  const isDue = (s: UserWordState) => Object.keys(s.skills).some((sk) => isDueFor(s, sk as Skill, now))
  const ordered = [...shuffle(learning.filter(isDue), rng), ...shuffle(learning.filter((s) => !isDue(s)), rng)]
  const skills = metric === 'listenCorrect' ? (['listening'] as Skill[]) : TYPED_SKILLS
  const items: PlanItem[] = []
  for (const state of ordered) {
    const entry = byId.get(state.entryId)!
    const open = unlockedSkills(state, entry, options)
    for (const skill of skills) {
      if (!open.includes(skill)) continue
      const types = exerciseTypesFor(skill, entry, options).filter((t) => metric === 'listenCorrect' || EXERCISES[t].input === 'typed')
      if (!types.length) continue
      items.push({ kind: 'exercise', entryId: entry.id, reason: isDue(state) ? 'due' : 'weak', skill, exerciseType: pick(types, rng) })
      break
    }
    if (items.length >= want) break
  }
  return interleave(items, rng)
}
