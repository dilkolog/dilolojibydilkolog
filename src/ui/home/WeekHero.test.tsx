// @vitest-environment happy-dom
import 'fake-indexeddb/auto'
;(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true
import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, describe, expect, it } from 'vitest'
import { WeekHero } from './WeekHero'

let root: ReturnType<typeof createRoot> | undefined
afterEach(() => {
  act(() => root?.unmount())
  document.body.innerHTML = ''
})

const wait = () => act(async () => void (await new Promise((r) => setTimeout(r, 40))))

describe('WeekHero', () => {
  it('renders weekly headline, 7 day dots, delta indicators, and metrics', async () => {
    const mockReport = {
      thisWeek: {
        answers: 120,
        correct: 108,
        accuracy: 0.9,
        newWords: 15,
        xp: 340,
        daysStudied: 5,
      },
      lastWeek: {
        answers: 100,
        correct: 85,
        accuracy: 0.85,
        newWords: 10,
        xp: 280,
        daysStudied: 4,
      },
      days: [],
    }

    const now = new Date('2026-10-18T12:00:00Z')
    const mockEvents = [
      {
        id: '1',
        entryId: 'e1',
        timestamp: new Date('2026-10-18T10:00:00Z'),
        mode: 'normal' as const,
        skill: 'recall' as const,
        grade: 'good' as const,
        elapsedMs: 2000,
      },
    ]

    const mockWeeks = [
      { answers: 80, accuracy: 0.8 },
      { answers: 100, accuracy: 0.85 },
      { answers: 120, accuracy: 0.9 },
    ]

    const host = document.createElement('div')
    document.body.append(host)
    root = createRoot(host)

    await act(async () => {
      root!.render(
        <WeekHero
          report={mockReport as never}
          events={mockEvents as unknown as Parameters<typeof WeekHero>[0]['events']}
          now={now}
          weeks={mockWeeks}
          streak="🔥 7"
          active={42}
          focus="recall"
        />,
      )
    })
    await wait()

    expect(host.textContent).toContain('Son 7 Günlük Ritim')
    expect(host.textContent).toContain('Geçen haftadan %20 daha fazla cevap')

    // Today is marked
    const todayLi = host.querySelector('.week-dots li.is-today')
    expect(todayLi).toBeTruthy()

    // Studied day is marked
    const studiedLi = host.querySelector('.week-dots li.is-on')
    expect(studiedLi).toBeTruthy()

    // Focus message rendered
    expect(host.textContent).toContain('Hatırlama zayıf')

    // Metric figures
    expect(host.textContent).toContain('120')
    expect(host.textContent).toContain('▲ 20')
    expect(host.textContent).toContain('%90')
    expect(host.textContent).toContain('42')
    expect(host.textContent).toContain('🔥 7')
  })
})
