import { describe, expect, it } from 'vitest'
import { Rating } from 'ts-fsrs'
import { createScheduler } from '../scheduler'
import { balanceCard, balanceWindow, dayWeight, NORMAL_WEEK, type Workload } from '../workload'
import { streakWithFreezes } from '../insights'
import { localDate } from '../progress'

const DAY = 86_400_000
// A Wednesday morning.
const now = new Date(2026, 9, 7, 9)
const at = (d: number) => localDate(new Date(now.getTime() + d * DAY))
const card = (days: number) => ({ ...createScheduler({ fuzz: false }).newCard(now), due: new Date(now.getTime() + days * DAY), scheduled_days: days, reps: 3 })

describe('workload balancing', () => {
  const normal: Workload = { dayWeights: NORMAL_WEEK, vacation: null }

  it('leaves short intervals alone and widens the window for long ones', () => {
    expect(balanceWindow(1)).toBe(0)
    expect(balanceWindow(5)).toBe(1)
    expect(balanceWindow(20)).toBe(3)
    expect(balanceWindow(200)).toBe(10)
  })

  it('moves a review to the lightest nearby day', () => {
    const load = new Map([[at(8), 20], [at(9), 25], [at(10), 30], [at(11), 2], [at(12), 9]])
    const out = balanceCard(card(10), now, load, normal)
    expect(out.scheduled_days).toBe(11)
    expect(localDate(out.due)).toBe(at(11))
    expect(load.get(at(11))).toBe(3)
  })

  it('keeps the original day when loads are equal', () => {
    expect(balanceCard(card(10), now, new Map(), normal).scheduled_days).toBe(10)
  })

  it('never schedules on a rest day or during a holiday when another day is possible', () => {
    // Day 4 from Wednesday is Sunday.
    const restSunday: Workload = { dayWeights: [0, 1, 1, 1, 1, 1, 1], vacation: null }
    expect(new Date(now.getTime() + 4 * DAY).getDay()).toBe(0)
    expect(balanceCard(card(4), now, new Map(), restSunday).scheduled_days).not.toBe(4)
    const holiday: Workload = { dayWeights: NORMAL_WEEK, vacation: { from: at(18), to: at(22) } }
    const out = balanceCard(card(20), now, new Map(), holiday)
    expect(localDate(out.due) < at(18) || localDate(out.due) > at(22)).toBe(true)
  })

  it('prefers normal days over light ones', () => {
    const lightThursday: Workload = { dayWeights: [1, 1, 1, 1, 0.5, 1, 1], vacation: null }
    // Day 1 is Thursday: a 2-day interval may move to 1–3; Thursday counts double.
    const load = new Map([[at(1), 4], [at(2), 6], [at(3), 6]])
    expect(dayWeight(new Date(now.getTime() + DAY), lightThursday)).toBe(0.5)
    expect(balanceCard(card(2), now, load, lightThursday).scheduled_days).not.toBe(1)
  })

  it('books load when the balanced scheduler reviews, and the plain copy does not', () => {
    const load = new Map<string, number>()
    const s = createScheduler({ balance: { load, workload: normal } })
    let c = s.newCard(now)
    for (let i = 0; i < 3; i++) c = s.review(c, Rating.Good, new Date(c.due.getTime() + 3_600_000))
    const total = [...load.values()].reduce((a, b) => a + b, 0)
    expect(total).toBe(1)
    s.plain!().review(c, Rating.Good, c.due)
    expect([...load.values()].reduce((a, b) => a + b, 0)).toBe(1)
  })
})

describe('streak with rest days', () => {
  it('a holiday or rest day neither breaks nor counts', () => {
    const days = ['2026-10-01', '2026-10-02', '2026-10-06', '2026-10-07']
    const today = new Date(2026, 9, 7, 20)
    expect(streakWithFreezes(days, today).streak).toBe(2)
    const holiday = (d: string) => d >= '2026-10-03' && d <= '2026-10-05'
    expect(streakWithFreezes(days, today, holiday).streak).toBe(4)
  })
})
