// @vitest-environment happy-dom
import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const notify = vi.hoisted(() => vi.fn(async () => undefined))
const showToast = vi.hoisted(() => vi.fn())
vi.mock('./noticeCenter', () => ({ notify }))
vi.mock('../shared/toastFeed', () => ({ showToast }))

let Announcements: typeof import('./Announcements').Announcements
/** A fresh module: the component asks once per visit. */
const resetAnnouncements = async () => {
  vi.resetModules()
  Announcements = (await import('./Announcements')).Announcements
}
;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

const flush = () => act(() => new Promise((r) => setTimeout(r, 0)))
const show = async (signedIn = true) => {
  const host = document.createElement('div')
  document.body.append(host)
  const root = createRoot(host)
  await act(async () => root.render(<Announcements signedIn={signedIn} />))
  await flush()
  await flush()
  act(() => root.unmount())
}
const answer = (announcement: unknown) => vi.stubGlobal('fetch', vi.fn(async () => Response.json({ announcement })))

beforeEach(async () => {
  vi.clearAllMocks()
  await resetAnnouncements()
  localStorage.clear()
})
afterEach(() => vi.unstubAllGlobals())

describe('Announcements', () => {
  it('puts the announcement in the bell and says it once', async () => {
    answer({ id: 'a-1', text: 'Bakım var.', at: '2026-11-04T10:00:00Z' })
    await show()
    expect(notify).toHaveBeenCalledWith({ id: 'announce|a-1', kind: 'announce', text: 'Duyuru: Bakım var.', at: '2026-11-04T10:00:00Z' })
    expect(showToast).toHaveBeenCalledTimes(1)
    await resetAnnouncements()
    await show()
    expect(notify).toHaveBeenCalledTimes(2)
    expect(showToast).toHaveBeenCalledTimes(1)
  })

  it('asks nothing when signed out, and does nothing without an announcement', async () => {
    answer(null)
    await show(false)
    expect(fetch).not.toHaveBeenCalled()
    await show()
    expect(fetch).toHaveBeenCalledTimes(1)
    expect(notify).not.toHaveBeenCalled()
  })
})
