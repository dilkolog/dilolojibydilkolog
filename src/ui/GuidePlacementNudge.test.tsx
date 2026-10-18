// @vitest-environment happy-dom
;(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true
import { act } from 'react'
import { createRoot } from 'react-dom/client'
import 'fake-indexeddb/auto'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { db } from '../data/instance'
import { savePlacement } from './guidePlacementStore'
import { GuidePlacementNudge } from './GuidePlacementNudge'

let root: ReturnType<typeof createRoot> | undefined
afterEach(async () => {
  act(() => root?.unmount())
  document.body.innerHTML = ''
  localStorage.clear()
  await db.meta.clear()
})

async function mount(props: { words?: number; goal?: number } = {}) {
  const onOpen = vi.fn()
  const host = document.createElement('div')
  document.body.append(host)
  root = createRoot(host)
  await act(async () => root!.render(<GuidePlacementNudge language="fr" words={props.words ?? 10} goal={props.goal} onOpen={onOpen} />))
  await act(() => new Promise((r) => setTimeout(r, 50)))
  return { host, onOpen }
}

describe('GuidePlacementNudge', () => {
  it('offers the placement test to someone who has not used the guide, and opens it', async () => {
    const { host, onOpen } = await mount()
    const main = host.querySelector<HTMLButtonElement>('.habit-nudge-main')
    expect(main?.textContent).toContain('Seviyeni bul')
    await act(async () => main!.click())
    expect(onOpen).toHaveBeenCalledTimes(1)
  })

  it('waits until the learner has a few words of their own', async () => {
    expect((await mount({ words: 2 })).host.querySelector('.habit-nudge')).toBeNull()
  })

  it('stays away from someone who reads the guide, has a goal or a result already', async () => {
    await db.saveGuideMarks({ basics_fr_articles: { read: '2026-10-01' } })
    expect((await mount()).host.querySelector('.habit-nudge')).toBeNull()
    await db.meta.clear()
    expect((await mount({ goal: 2 })).host.querySelector('.habit-nudge')).toBeNull()
    act(() => root?.unmount())
    savePlacement('fr', { start: 'A2', day: '2026-10-01' })
    expect((await mount()).host.querySelector('.habit-nudge')).toBeNull()
  })

  it('is asked once: "not now" ends it for the language', async () => {
    const { host } = await mount()
    await act(async () => host.querySelector<HTMLButtonElement>('button[aria-label="Şimdi değil"]')!.click())
    expect(host.querySelector('.habit-nudge')).toBeNull()
    act(() => root?.unmount())
    expect((await mount()).host.querySelector('.habit-nudge')).toBeNull()
  })
})
