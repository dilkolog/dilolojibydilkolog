import { masteryStage, MASTERY_STAGES, type MasteryStage } from './mastery'
import { newWordState, processAttempt } from './review'
import { createScheduler } from './scheduler'
import type { Mistake, ReviewEvent, UserWordState, VocabularyEntry } from './types'

/**
 * A word's story: where it came from, when it was met, how it grew (and slipped), the mistakes
 * along the way. Growth dates come from replaying the word's answers in order.
 */
export type JourneyStep =
  | { kind: 'added'; at: Date; source?: string }
  | { kind: 'first_met'; at: Date; where: string; sentence?: string }
  | { kind: 'introduced'; at: Date }
  | { kind: 'stage'; at: Date; stage: MasteryStage; up: boolean }
  | { kind: 'mistake'; at: Date; given: string; expected: string }
  | { kind: 'seen'; at: Date; where: string }

const plain = createScheduler({ fuzz: false })

/** "Kaynak: https://…" in the notes (bookmarklet, extension, reading) → its host. */
export function sourceOf(entry: VocabularyEntry): string | undefined {
  const url = entry.notes?.match(/Kaynak:\s*(\S+)/)?.[1]
  if (!url) return undefined
  try {
    return new URL(url).hostname.replace(/^www\./, '')
  } catch {
    return url
  }
}

export function wordJourney(
  entry: VocabularyEntry,
  state: UserWordState | undefined,
  events: readonly ReviewEvent[],
  mistakes: readonly Mistake[],
  sightings: readonly { at: string; host: string }[] = [],
  firstEncounter?: { title: string; sentence?: string; at: string },
): JourneyStep[] {
  const steps: JourneyStep[] = []
  if (entry.addedAt) steps.push({ kind: 'added', at: new Date(entry.addedAt), source: sourceOf(entry) })
  if (firstEncounter) steps.push({ kind: 'first_met', at: new Date(firstEncounter.at), where: firstEncounter.title, sentence: firstEncounter.sentence })
  if (state) {
    steps.push({ kind: 'introduced', at: new Date(state.introducedAt) })
    let s = newWordState(entry, new Date(state.introducedAt))
    let stage = MASTERY_STAGES.indexOf(masteryStage(s))
    const real = events.filter((e) => e.mode === 'normal').sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
    for (const e of real) {
      s = processAttempt(s, { exerciseType: e.exerciseType, verdict: e.verdict, responseMs: e.responseMs, hintsUsed: e.hintsUsed, maxHints: 3, at: new Date(e.timestamp), mode: 'normal' }, [], plain, () => e.id).state
      const now = MASTERY_STAGES.indexOf(masteryStage(s))
      if (now !== stage) steps.push({ kind: 'stage', at: new Date(e.timestamp), stage: MASTERY_STAGES[now], up: now > stage })
      stage = now
    }
  }
  // The first time each distinct mistake was made (the three most repeated).
  for (const m of [...mistakes].filter((m) => m.entryId === entry.id).sort((a, b) => b.count - a.count).slice(0, 3)) {
    steps.push({ kind: 'mistake', at: new Date(m.firstAt), given: m.given, expected: m.expected })
  }
  // Web sightings: the first on each site.
  const sites = new Map<string, string>()
  for (const x of sightings) if (!sites.has(x.host) || x.at < sites.get(x.host)!) sites.set(x.host, x.at)
  for (const [host, at] of [...sites.entries()].slice(0, 5)) steps.push({ kind: 'seen', at: new Date(at), where: host })
  return steps.sort((a, b) => a.at.getTime() - b.at.getTime())
}
