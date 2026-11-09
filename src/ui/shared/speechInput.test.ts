import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { listen } from './speechInput'

type Result = { isFinal: boolean; length: number; [i: number]: { transcript: string } }
const result = (isFinal: boolean, ...alts: string[]): Result => ({ isFinal, length: alts.length, ...Object.fromEntries(alts.map((t, i) => [i, { transcript: t }])) })

/** A stand-in for the browser's recognition, driven by hand. */
class FakeRecognition {
  static last: FakeRecognition
  lang = ''
  interimResults = false
  maxAlternatives = 1
  continuous = false
  onresult: ((e: { results: Result[]; resultIndex: number }) => void) | null = null
  onerror: ((e: { error: string }) => void) | null = null
  onend: (() => void) | null = null
  onspeechstart: (() => void) | null = null
  onnomatch: (() => void) | null = null
  started = 0
  stopped = 0
  aborted = 0
  constructor() {
    FakeRecognition.last = this
  }
  start() {
    this.started++
  }
  stop() {
    this.stopped++
    queueMicrotask(() => this.onend?.())
  }
  abort() {
    this.aborted++
    queueMicrotask(() => {
      this.onerror?.({ error: 'aborted' })
      this.onend?.()
    })
  }
  say(...results: Result[]) {
    this.onresult?.({ results, resultIndex: 0 })
  }
}

const handlers = () => ({ onInterim: vi.fn(), onFinal: vi.fn(), onError: vi.fn(), onEnd: vi.fn() })
const flush = () => new Promise((r) => setTimeout(r, 0))

beforeEach(() => {
  vi.stubGlobal('window', { webkitSpeechRecognition: FakeRecognition })
})
afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllGlobals()
})

describe('listening for one answer', () => {
  it('listens in the language of the word, and hands over the alternatives of a final result', () => {
    const h = handlers()
    listen('es', h)
    const rec = FakeRecognition.last
    expect(rec).toMatchObject({ lang: 'es-ES', interimResults: true, continuous: false, started: 1 })
    rec.say(result(false, 'gan'))
    expect(h.onInterim).toHaveBeenCalledWith('gan')
    rec.say(result(true, 'ganas', 'ganas '))
    expect(h.onFinal).toHaveBeenCalledWith(['ganas', 'ganas'])
  })

  it('when the browser ends without ever marking a result final, the last thing it heard is the answer', async () => {
    const h = handlers()
    listen('es', h)
    const rec = FakeRecognition.last
    rec.say(result(false, 'ganas'))
    rec.onend?.()
    expect(h.onFinal).toHaveBeenCalledTimes(1)
    expect(h.onFinal).toHaveBeenCalledWith(['ganas'])
    expect(h.onEnd).toHaveBeenCalled()
  })

  it('finishing by hand ends the listening and still delivers what was heard', async () => {
    const h = handlers()
    const listening = listen('fr', h)
    FakeRecognition.last.say(result(false, 'maison'))
    listening.finish()
    await flush()
    expect(FakeRecognition.last.stopped).toBe(1)
    expect(h.onFinal).toHaveBeenCalledWith(['maison'])
    expect(h.onError).not.toHaveBeenCalled()
  })

  it('stopping for good (the screen was left) delivers nothing and says nothing', async () => {
    const h = handlers()
    const stop = listen('fr', h)
    FakeRecognition.last.say(result(false, 'mais'))
    stop()
    await flush()
    expect(h.onFinal).not.toHaveBeenCalled()
    expect(h.onError).not.toHaveBeenCalled()
  })

  it('says in words why it failed, and an abort is no failure', () => {
    const h = handlers()
    listen('es', h)
    const rec = FakeRecognition.last
    rec.onerror?.({ error: 'language-not-supported' })
    expect(h.onError).toHaveBeenLastCalledWith(expect.stringContaining('Dikte'))
    rec.onerror?.({ error: 'aborted' })
    expect(h.onError).toHaveBeenCalledTimes(1)
    rec.onnomatch?.()
    expect(h.onError).toHaveBeenLastCalledWith(expect.stringContaining('anlayamadım'))
  })

  it('gives up with an explanation when nothing is heard for a while, instead of listening for ever', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] })
    const h = handlers()
    listen('es', h)
    vi.advanceTimersByTime(11_000)
    expect(h.onError).not.toHaveBeenCalled()
    vi.advanceTimersByTime(2_000)
    expect(FakeRecognition.last.aborted).toBe(1)
    expect(h.onError).toHaveBeenCalledWith(expect.stringContaining('Hiçbir şey duyulmadı'))
    expect(h.onEnd).toHaveBeenCalled()
  })

  it('does not give up while speech is coming in', () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] })
    const h = handlers()
    listen('es', h)
    FakeRecognition.last.onspeechstart?.()
    vi.advanceTimersByTime(30_000)
    expect(h.onError).not.toHaveBeenCalled()
  })

  it('says so when the browser has no speech recognition', () => {
    vi.stubGlobal('window', {})
    const h = handlers()
    const listening = listen('es', h)
    expect(h.onError).toHaveBeenCalledWith(expect.stringContaining('desteklemiyor'))
    expect(() => listening.finish()).not.toThrow()
  })
})
