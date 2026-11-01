import { State } from 'ts-fsrs'
import type { PlanItem } from './dailyPlan'
import type { Rng } from './rng'
import { shuffle } from './rng'
import { exerciseTypesFor } from './exercises'
import { pickExerciseType, startOfDay, unlockedSkills } from './selection'
import type { EngineOptions, ReviewEvent, Skill, UserWordState, VocabularyEntry } from './types'
import { timeOf } from './types'

/**
 * Measurement probes (docs/KISISEL-ALGORITMA.md, Aşama 0).
 *
 * The scheduler only ever asks a card when it is due, that is when the model expects about 90 % recall, so the
 * model's forecasts are only ever tested in that one spot. A probe is a card picked AT RANDOM among those not due
 * yet, asked in practice mode (the schedule is untouched). Its answer shows whether the forecast also holds at other
 * ages of the memory, and because the pick is random with a known chance, the answers stand for all the eligible
 * cards, not only for the ones the plan happens to choose.
 *
 * Asking a card early is itself a (small) extra review: the probe is a real test, tagged as such, and the
 * analysis keeps it apart (ReviewEvent.ctx.probe).
 */
export const PROBES_A_DAY = 2
/** Fewer eligible cards than this and a "random sample" is just the whole pool: no probes. */
export const MIN_ELIGIBLE = 10
/** A probe is a card at least this many days past its last review. */
export const MIN_ELAPSED_DAYS = 2
const DAY_MS = 86_400_000

export interface ProbeCard {
  entryId: string
  skill: Skill
  elapsedDays: number
}

/**
 * The cards a probe may pick: one per word (the skill left longest since its review), reviewed at least twice and
 * holding (Review state), not due today, not met today, not retired, and not a word already in today's session.
 * Unit of sampling = word, so a word cannot be picked twice and every word has the same chance.
 */
export function probeCards(
  states: readonly UserWordState[],
  catalog: ReadonlyMap<string, VocabularyEntry>,
  now: Date,
  skip: ReadonlySet<string> = new Set(),
  opts: EngineOptions = {},
): ProbeCard[] {
  const endOfToday = startOfDay(now).getTime() + DAY_MS
  const out: ProbeCard[] = []
  for (const state of states) {
    const entry = catalog.get(state.entryId)
    if (!entry || state.retired || skip.has(state.entryId)) continue
    if (timeOf(state.introducedAt) >= startOfDay(now).getTime()) continue
    let best: ProbeCard | undefined
    for (const skill of unlockedSkills(state, entry, opts)) {
      const card = state.skills[skill]
      if (!card || card.reps < 2 || card.state !== State.Review || !card.last_review) continue
      if (card.due.getTime() < endOfToday) continue
      if (!exerciseTypesFor(skill, entry, opts).length) continue
      const elapsedDays = (now.getTime() - new Date(card.last_review).getTime()) / DAY_MS
      if (elapsedDays < MIN_ELAPSED_DAYS) continue
      if (!best || elapsedDays > best.elapsedDays) best = { entryId: state.entryId, skill, elapsedDays }
    }
    if (best) out.push(best)
  }
  return out
}

/** How many probes today's session may still hold: the day's quota less the probes already answered today. */
export function probesLeft(events: readonly ReviewEvent[], now: Date, quota = PROBES_A_DAY): number {
  const from = startOfDay(now).getTime()
  const done = events.filter((e) => e.ctx?.probe !== undefined && timeOf(e.timestamp) >= from).length
  return Math.max(0, quota - done)
}

/** `k` of the cards, uniformly at random without replacement; each had the same chance, k / n (returned alongside). */
export function sampleProbes(cards: readonly ProbeCard[], k: number, rng: Rng): { cards: ProbeCard[]; inclusion: number } {
  if (k <= 0 || cards.length < MIN_ELIGIBLE) return { cards: [], inclusion: 0 }
  const take = Math.min(k, cards.length)
  return { cards: shuffle(cards, rng).slice(0, take), inclusion: take / cards.length }
}

/**
 * The day's items with the probes among them: at random places in the middle of the session (not first, where the
 * learner is still warming up, and not in the last tenth), never beside the same word.
 */
export function withProbes(
  items: readonly PlanItem[],
  picked: { cards: readonly ProbeCard[]; inclusion: number },
  catalog: ReadonlyMap<string, VocabularyEntry>,
  states: ReadonlyMap<string, UserWordState>,
  rng: Rng,
  opts: EngineOptions = {},
): PlanItem[] {
  if (!picked.cards.length || items.length < 4) return [...items]
  const out = [...items]
  for (const card of picked.cards) {
    const entry = catalog.get(card.entryId)
    if (!entry) continue
    let exerciseType
    try {
      exerciseType = pickExerciseType(card.skill, entry, states.get(card.entryId), rng, opts)
    } catch {
      continue
    }
    const low = Math.max(1, Math.floor(out.length * 0.25))
    const high = Math.max(low + 1, Math.floor(out.length * 0.9))
    const at = low + Math.floor(rng() * (high - low))
    out.splice(at, 0, { kind: 'exercise', entryId: card.entryId, reason: 'practice', skill: card.skill, exerciseType, probe: picked.inclusion })
  }
  return out
}
