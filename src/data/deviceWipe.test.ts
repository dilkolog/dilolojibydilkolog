// @vitest-environment happy-dom
import { beforeEach, describe, expect, it, vi } from 'vitest'

const close = vi.fn()
vi.mock('./instance', () => ({ db: { close } }))
const { wipeDevice } = await import('./deviceWipe')

describe('wipeDevice', () => {
  beforeEach(() => {
    close.mockClear()
    localStorage.clear()
    sessionStorage.clear()
  })

  it('closes and deletes the database and clears the app keys, not other sites\' keys', async () => {
    const deleted: string[] = []
    vi.stubGlobal('indexedDB', {
      deleteDatabase: (name: string) => {
        deleted.push(name)
        const request: { onsuccess?: () => void } = {}
        setTimeout(() => request.onsuccess?.(), 0)
        return request
      },
    })
    localStorage.setItem('diloloji:monki:fr', 'x')
    localStorage.setItem('kelime-koc:last-list:fr', 'y')
    localStorage.setItem('unrelated', 'z')
    sessionStorage.setItem('diloloji:duel-in', 'k')
    await wipeDevice()
    expect(close).toHaveBeenCalled()
    expect(deleted).toEqual(['kelime-koc'])
    expect(Object.keys(localStorage)).toEqual(['unrelated'])
    expect(sessionStorage.length).toBe(0)
    vi.unstubAllGlobals()
  })

  it('does not hang when another tab blocks the deletion', async () => {
    vi.stubGlobal('indexedDB', {
      deleteDatabase: () => {
        const request: { onblocked?: () => void } = {}
        setTimeout(() => request.onblocked?.(), 0)
        return request
      },
    })
    await expect(wipeDevice()).resolves.toBeUndefined()
    vi.unstubAllGlobals()
  })
})
