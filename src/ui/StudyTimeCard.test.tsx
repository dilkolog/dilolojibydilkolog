import 'fake-indexeddb/auto'
// @vitest-environment happy-dom
;(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true
import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { describe, expect, it, vi } from 'vitest'
import { KelimeDB } from '../data/db'
import { StudyTimeCard } from './StudyTimeCard'

const flush = () => act(async () => void (await new Promise((r) => setTimeout(r, 30))))

describe('StudyTimeCard', () => {
  it('shows the week, the split and the goal progress, and reports a chosen goal', async () => {
    const db = new KelimeDB('t-time-card')
    await db.addStudyTime('read', 'fr', 600)
    await db.addStudyTime('listen', 'fr', 300)
    const onGoal = vi.fn()
    const el = document.createElement('div')
    document.body.appendChild(el)
    const root = createRoot(el)
    act(() => root.render(<StudyTimeCard db={db} language="fr" goal={30} onGoal={onGoal} />))
    await flush()
    expect(el.textContent).toContain('15 dk')
    expect(el.textContent).toContain('Okuma 10 dk · Dinleme 5 dk')
    expect(el.textContent).toContain('Hedefe 15 dk kaldı.')
    expect(el.querySelector('[role=progressbar]')?.getAttribute('aria-valuenow')).toBe('50')
    const radios = [...el.querySelectorAll<HTMLButtonElement>('[role=radio]')]
    expect(radios.find((b) => b.getAttribute('aria-checked') === 'true')?.textContent).toBe('30 dk')
    act(() => radios.find((b) => b.textContent === '1 sa')!.click())
    expect(onGoal).toHaveBeenCalledWith(60)
    act(() => radios.find((b) => b.textContent === 'Yok')!.click())
    expect(onGoal).toHaveBeenLastCalledWith(undefined)
    act(() => root.unmount())
    el.remove()
  })

  it('says so when nothing was read or heard this week, in another language too', async () => {
    const db = new KelimeDB('t-time-card-empty')
    await db.addStudyTime('read', 'es', 100)
    const el = document.createElement('div')
    document.body.appendChild(el)
    const root = createRoot(el)
    act(() => root.render(<StudyTimeCard db={db} language="fr" goal={undefined} onGoal={() => {}} />))
    await flush()
    expect(el.textContent).toContain('Son 7 günde bu dilde okuma, dinleme ya da konuşma yok')
    expect(el.querySelector('[role=progressbar]')).toBeNull()
    act(() => root.unmount())
    el.remove()
  })
})
