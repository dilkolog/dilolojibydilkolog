import type { RepairTarget } from './blindSpots'

/**
 * The weekly care round: one nudge that walks the learner through the three places their own data says
 * they are weakest (words missed this week, grammar questions due again, the top blind spot), one step at
 * a time. Offered on Friday to Sunday; what was done is remembered for the week (on the device).
 */
export type CareStep = 'words' | 'grammar' | 'spot'

export interface CareState {
  /** The Monday (local date) of the week this belongs to. */
  week: string
  done: CareStep[]
  dismissed?: boolean
}

export interface CareSpot {
  title: string
  target: RepairTarget
  action: string
}

export interface CareInput {
  /** Words answered wrong in the last seven days. */
  misses: number
  /** Grammar questions due again. */
  dueGrammar: number
  spot?: CareSpot
}

export interface CareItem {
  step: CareStep
  label: string
  detail: string
  /** Rough minutes, for the nudge. */
  minutes: number
}

/** A step is offered only when there is enough behind it to be worth the tap. */
export const MIN_MISSES = 3
export const MIN_DUE_GRAMMAR = 3
/** The round needs at least this many steps, else it is not a "round". */
export const MIN_STEPS = 2

const FRIDAY = 5

/** Local date of the Monday of the week `now` is in. */
export function weekKey(now: Date): string {
  const d = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 12)
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7))
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

/** Friday, Saturday and Sunday: the round is a look back at the week, so it comes at its end. */
export const careDay = (now: Date): boolean => now.getDay() === FRIDAY || now.getDay() === 6 || now.getDay() === 0

export function careSteps(input: CareInput): CareItem[] {
  const items: CareItem[] = []
  if (input.misses >= MIN_MISSES) items.push({ step: 'words', label: 'Bu haftaki yanlış kelimeler', detail: `${input.misses} kelime`, minutes: 4 })
  if (input.dueGrammar >= MIN_DUE_GRAMMAR) items.push({ step: 'grammar', label: 'Dilbilgisi tekrarı', detail: `${input.dueGrammar} soru bekliyor`, minutes: 3 })
  if (input.spot) items.push({ step: 'spot', label: input.spot.action, detail: input.spot.title, minutes: 3 })
  return items.length >= MIN_STEPS ? items : []
}

/** A state of another week (or none) is a fresh one. */
export const careOf = (stored: CareState | null | undefined, now: Date): CareState => (stored && stored.week === weekKey(now) ? stored : { week: weekKey(now), done: [] })

export const nextStep = (items: readonly CareItem[], state: CareState): CareItem | undefined => items.find((i) => !state.done.includes(i.step))

export const markDone = (state: CareState, step: CareStep): CareState => (state.done.includes(step) ? state : { ...state, done: [...state.done, step] })

export const careMinutes = (items: readonly CareItem[], state: CareState): number => items.filter((i) => !state.done.includes(i.step)).reduce((n, i) => n + i.minutes, 0)

/** Parses what was stored; anything unexpected is no state. */
export function cleanCare(raw: unknown): CareState | null {
  if (!raw || typeof raw !== 'object') return null
  const r = raw as Record<string, unknown>
  if (typeof r.week !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(r.week) || !Array.isArray(r.done)) return null
  const done = r.done.filter((s): s is CareStep => s === 'words' || s === 'grammar' || s === 'spot')
  return { week: r.week, done: [...new Set(done)], ...(r.dismissed === true ? { dismissed: true } : {}) }
}
