// @vitest-environment happy-dom
;(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true
import { act } from 'react'
import { createRoot } from 'react-dom/client'
import 'fake-indexeddb/auto'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { db } from '../data/instance'
import { localDate } from '../engine/progress'
import '../data/guide/lessonOf'
import { GuideLessonNudge } from './GuideLessonNudge'

let root: ReturnType<typeof createRoot> | undefined
afterEach(async () => {
  act(() => root?.unmount())
  document.body.innerHTML = ''
  localStorage.clear()
  await db.meta.clear()
})

async function mount(goal?: number) {
  const onOpen = vi.fn()
  const host = document.createElement('div')
  document.body.append(host)
  root = createRoot(host)
  await act(async () => root!.render(<GuideLessonNudge language="fr" goal={goal} onOpen={onOpen} />))
  await act(() => new Promise((r) => setTimeout(r, 50)))
  return { host, onOpen }
}

describe('GuideLessonNudge', () => {
  it('stays away from someone who has not used the guide and set no goal', async () => {
    const { host } = await mount()
    expect(host.querySelector('.habit-nudge')).toBeNull()
  })

  it('offers the next lesson with its minutes and the week so far, and opens it', async () => {
    await db.saveGuideMarks({ basics_fr_etre_avoir: { read: '2020-01-01' } })
    const { host, onOpen } = await mount(3)
    const main = host.querySelector<HTMLButtonElement>('.habit-nudge-main')
    expect(main?.textContent).toContain('Bugünün dersi')
    expect(main?.textContent).toMatch(/~\d+ dk/)
    expect(main?.textContent).toContain('bu hafta 0/3')
    await act(async () => main!.click())
    expect(onOpen).toHaveBeenCalledTimes(1)
  })

  it('shows to someone with a goal who has read nothing yet', async () => {
    const { host } = await mount(2)
    expect(host.querySelector('.habit-nudge-main')).not.toBeNull()
  })

  it('hides once a lesson was read today or the weekly goal is reached', async () => {
    await db.saveGuideMarks({ basics_fr_etre_avoir: { read: localDate(new Date()) } })
    const { host } = await mount(5)
    expect(host.querySelector('.habit-nudge')).toBeNull()
  })

  it('is put off for the day', async () => {
    const { host } = await mount(2)
    await act(async () => host.querySelector<HTMLButtonElement>('button[aria-label="Bugün değil"]')!.click())
    expect(host.querySelector('.habit-nudge')).toBeNull()
    act(() => root?.unmount())
    const again = await mount(2)
    expect(again.host.querySelector('.habit-nudge')).toBeNull()
  })
})
