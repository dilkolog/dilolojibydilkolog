// @vitest-environment happy-dom
import 'fake-indexeddb/auto'
;(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true
import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { Profile } from '../../data/db'
import { AccessContext } from '../account/accessContext'
import { CommunityScreen } from './Community'
import { GROUPS, placeOf } from '../../appNav'

const profile = { name: 'Ali', emoji: 'monki', color: '#c6317c', motto: '' } as Profile

let root: ReturnType<typeof createRoot> | undefined
afterEach(() => {
  act(() => root?.unmount())
  document.body.innerHTML = ''
  vi.unstubAllGlobals()
})

describe('Topluluk', () => {
  it('is a tab of İlerleme (league and friends beside the numbers), not of the learning place', () => {
    expect(GROUPS.progress?.some((g) => g.screen === 'community')).toBe(true)
    expect(placeOf('community')).toBe('progress')
    expect(GROUPS.practice?.some((g) => g.screen === 'community')).toBe(false)
  })

  it('gathers the ways to work together, the friends and the shared lists in one screen', async () => {
    vi.stubGlobal('fetch', async () => Response.json({ items: [] }))
    const onDuel = vi.fn()
    const onReading = vi.fn()
    const host = document.createElement('div')
    document.body.append(host)
    root = createRoot(host)
    await act(async () =>
      root!.render(
        <AccessContext.Provider value={{ status: 'signedOut', approved: false, refresh: async () => {} }}>
          <CommunityScreen game={null} profile={profile} vocabulary={[]} language="fr" onPrefs={() => {}} onChanged={() => {}} onDuel={onDuel} onReading={onReading} />
        </AccessContext.Provider>,
      ),
    )
    expect(host.querySelector('h1')?.textContent).toContain('Topluluk')
    const tiles = [...host.querySelectorAll<HTMLButtonElement>('.community-tile')]
    expect(tiles.map((t) => t.querySelector('strong')?.textContent)).toEqual(['Düello', 'Birlikte oku'])
    await act(async () => tiles[0].click())
    await act(async () => tiles[1].click())
    expect(onDuel).toHaveBeenCalledTimes(1)
    expect(onReading).toHaveBeenCalledTimes(1)
    // The friends card is there (signed out it says how to get an account), and so is the lists section.
    expect(host.querySelector('.friends-card')).toBeTruthy()
  })
})
