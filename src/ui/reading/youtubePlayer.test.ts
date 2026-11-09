// @vitest-environment happy-dom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { clipEmbed, drivenEmbed, nextStop, youtubeController, type PlayerInfo } from './youtubePlayer'

/** An iframe stand-in: what the page posts to it is kept; `say` is the player answering. */
function fakeFrame() {
  const sent: { data: Record<string, unknown>; origin: string }[] = []
  const win = { postMessage: (data: string, origin: string) => sent.push({ data: JSON.parse(data) as Record<string, unknown>, origin }) }
  const frame = { contentWindow: win } as unknown as HTMLIFrameElement
  const say = (data: object, origin = 'https://www.youtube-nocookie.com', source: unknown = win) =>
    window.dispatchEvent(new MessageEvent('message', { data: JSON.stringify(data), origin, source: source as Window }))
  return { frame, sent, say }
}

afterEach(() => vi.useRealTimers())

describe('a driven YouTube embed', () => {
  it('the embed address asks for the page’s commands and no captions', () => {
    expect(drivenEmbed('abcdefghijk', 'https://diloloji.com')).toBe('https://www.youtube-nocookie.com/embed/abcdefghijk?enablejsapi=1&playsinline=1&rel=0&cc_load_policy=0&iv_load_policy=3&origin=https%3A%2F%2Fdiloloji.com')
    expect(clipEmbed('abcdefghijk', 12.4, 15.2)).toContain('autoplay=1&start=11&end=16')
  })

  it('says it listens until the player answers, then follows its time and runs it on while playing', () => {
    vi.useFakeTimers()
    let t = 1000
    const seen: PlayerInfo[] = []
    const { frame, sent, say } = fakeFrame()
    const p = youtubeController(frame, (i) => seen.push(i), () => t)
    vi.advanceTimersByTime(600)
    expect(sent.filter((m) => m.data.event === 'listening').length).toBeGreaterThanOrEqual(3)
    expect(sent.every((m) => m.origin === 'https://www.youtube-nocookie.com')).toBe(true)
    say({ event: 'infoDelivery', info: { currentTime: 10, duration: 120, playerState: 1, playbackRate: 1 } })
    expect(p.answered()).toBe(true)
    expect(seen.at(-1)).toMatchObject({ time: 10, duration: 120, state: 1 })
    t += 1500
    expect(p.now()).toBeCloseTo(11.5)
    const before = sent.length
    vi.advanceTimersByTime(1000)
    expect(sent.length).toBe(before)
    say({ event: 'infoDelivery', info: { playerState: 2 } })
    t += 5000
    expect(p.now()).toBeCloseTo(11.5)
    p.dispose()
  })

  it('sends commands, and pays no heed to other windows or sites', () => {
    const seen: PlayerInfo[] = []
    const { frame, sent, say } = fakeFrame()
    const p = youtubeController(frame, (i) => seen.push(i))
    p.seek(42)
    p.play()
    p.setRate(0.75)
    p.pause()
    expect(sent.filter((m) => m.data.event === 'command').map((m) => [m.data.func, m.data.args])).toEqual([['seekTo', [42, true]], ['playVideo', []], ['setPlaybackRate', [0.75]], ['pauseVideo', []]])
    say({ event: 'infoDelivery', info: { currentTime: 99 } }, 'https://evil.example')
    say({ event: 'infoDelivery', info: { currentTime: 99 } }, 'https://www.youtube-nocookie.com', {})
    expect(seen).toEqual([])
    expect(p.now()).toBe(42)
    p.dispose()
  })

  it('the next sentence start to wait at', () => {
    expect(nextStop([0, 4, 9], 0)).toBe(4)
    expect(nextStop([0, 4, 9], 3.9)).toBe(9)
    expect(nextStop([0, 4, 9], 9)).toBeUndefined()
  })
})
