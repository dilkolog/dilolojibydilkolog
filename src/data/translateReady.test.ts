import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const accessFetch = vi.fn()
vi.mock('./access', () => ({ accessFetch: (...a: unknown[]) => accessFetch(...a), APPROVAL_MESSAGE: '', isApprovalRefusal: () => false }))
vi.mock('./instance', () => ({ db: {} }))

beforeEach(() => {
  vi.stubGlobal('navigator', { onLine: true })
})

afterEach(() => {
  vi.unstubAllGlobals()
  vi.useRealTimers()
  accessFetch.mockReset()
})

describe('translationReady after a refusal', () => {
  it('does not ask the server again for a minute', async () => {
    vi.resetModules()
    const { translationReady } = await import('./translate')
    accessFetch.mockResolvedValue(new Response('{}', { status: 403 }))
    expect(await translationReady()).toBe(false)
    expect(await translationReady()).toBe(false)
    expect(await translationReady()).toBe(false)
    expect(accessFetch).toHaveBeenCalledTimes(1)
  })

  it('asks again later, and a yes is kept', async () => {
    vi.resetModules()
    vi.useFakeTimers()
    const { translationReady } = await import('./translate')
    accessFetch.mockResolvedValueOnce(new Response('{}', { status: 403 }))
    expect(await translationReady()).toBe(false)
    vi.advanceTimersByTime(61_000)
    accessFetch.mockResolvedValueOnce(new Response(JSON.stringify({ count: 1, limit: 100 }), { status: 200 }))
    expect(await translationReady()).toBe(true)
    expect(await translationReady()).toBe(true)
    expect(accessFetch).toHaveBeenCalledTimes(2)
  })
})
