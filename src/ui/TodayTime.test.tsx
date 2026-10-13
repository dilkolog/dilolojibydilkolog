// @vitest-environment happy-dom
;(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true
import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { KelimeDB } from '../data/db'
import { localDate } from '../engine/progress'
import { timeKey, type TimeLog } from '../engine/studyTime'
import { TodayTime } from './TodayTime'

describe('TodayTime', () => {
  let container: HTMLDivElement
  let root: ReturnType<typeof createRoot>
  const today = localDate(new Date())
  const show = async (log: TimeLog, goal?: number, onOpen = () => {}) => {
    const db = { getTimeLog: async () => log } as unknown as KelimeDB
    await act(async () => root.render(<TodayTime db={db} language="fr" goal={goal} onOpen={onOpen} />))
  }
  beforeEach(() => {
    container = document.createElement('div')
    document.body.appendChild(container)
    root = createRoot(container)
  })
  afterEach(() => {
    act(() => root.unmount())
    container.remove()
  })

  it('says nothing while there is no time this week and no goal', async () => {
    await show({})
    expect(container.textContent).toBe('')
  })

  it("shows today's time and the week's", async () => {
    await show({ [timeKey('read', 'fr', today)]: 600, [timeKey('listen', 'fr', today)]: 300 })
    expect(container.textContent).toContain('15 dk')
    expect(container.textContent).toContain('bu hafta')
    expect(container.querySelector('[role="progressbar"]')).toBeNull()
  })

  it('counts only the language on screen', async () => {
    await show({ [timeKey('read', 'es', today)]: 3600 })
    expect(container.textContent).toBe('')
  })

  it('with a goal it shows the progress, even before any time', async () => {
    await show({}, 60)
    expect(container.textContent).toContain('Bugün yok')
    expect(container.querySelector('[role="progressbar"]')?.getAttribute('aria-valuenow')).toBe('0')
    await show({ [timeKey('read', 'fr', today)]: 1800 }, 60)
    expect(container.querySelector('[role="progressbar"]')?.getAttribute('aria-valuenow')).toBe('50')
    expect(container.textContent).toContain('30 dk kaldı')
  })

  it('opens the progress screen', async () => {
    const open = vi.fn()
    await show({ [timeKey('read', 'fr', today)]: 60 }, undefined, open)
    act(() => container.querySelector<HTMLButtonElement>('button')!.click())
    expect(open).toHaveBeenCalled()
  })
})
