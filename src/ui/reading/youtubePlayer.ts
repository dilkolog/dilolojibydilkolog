/**
 * A YouTube embed driven from the page without YouTube's own script: the embed (with `enablejsapi=1`) speaks the
 * same small postMessage protocol its IFrame API uses. The page says it is listening, the player answers with its
 * state (time, length, playing or not), and takes commands (play, pause, seek, speed). Nothing outside the embed is
 * loaded, so the page's script policy stays as it is.
 */

export const EMBED_ORIGIN = 'https://www.youtube-nocookie.com'

/** The embed's address for a video the page drives (captions off: the text is the transcript). */
export function drivenEmbed(id: string, origin = location.origin): string {
  return `${EMBED_ORIGIN}/embed/${id}?enablejsapi=1&playsinline=1&rel=0&cc_load_policy=0&iv_load_policy=3&origin=${encodeURIComponent(origin)}`
}

/** A moment of a video as an embed that plays it once, from a little before to a little after. */
export function clipEmbed(id: string, start: number, end: number): string {
  return `${EMBED_ORIGIN}/embed/${id}?playsinline=1&rel=0&cc_load_policy=0&iv_load_policy=3&autoplay=1&start=${Math.max(0, Math.floor(start - 0.5))}&end=${Math.ceil(end + 0.5)}`
}

/** YouTube's player states. */
export const PLAYING = 1
export const PAUSED = 2
export const ENDED = 0

export interface PlayerInfo {
  /** Seconds into the video, as of the player's last word (see `now` for between its words). */
  time: number
  duration: number
  state: number
  rate: number
}

export interface YoutubeController {
  /** The time now: the last reported time, run on while playing. */
  now: () => number
  info: () => PlayerInfo
  /** Whether the player has answered at all (else it is not loaded, or not a driven embed). */
  answered: () => boolean
  play: () => void
  pause: () => void
  seek: (seconds: number) => void
  setRate: (rate: number) => void
  dispose: () => void
}

const fromYoutube = (origin: string) => /^https:\/\/(www\.)?youtube(-nocookie)?\.com$/.test(origin)

/** Drives one embed; `onChange` hears every change the player reports. */
export function youtubeController(frame: HTMLIFrameElement, onChange: (info: PlayerInfo) => void, clock: () => number = () => performance.now()): YoutubeController {
  const id = Math.random().toString(36).slice(2)
  const info: PlayerInfo = { time: 0, duration: 0, state: -1, rate: 1 }
  let stamp = clock()
  let heard = false
  const post = (message: object) => frame.contentWindow?.postMessage(JSON.stringify({ ...message, id, channel: 'widget' }), EMBED_ORIGIN)
  const command = (func: string, args: unknown[] = []) => post({ event: 'command', func, args })

  const onMessage = (e: MessageEvent) => {
    if (e.source !== frame.contentWindow || !fromYoutube(e.origin)) return
    let data: unknown
    try {
      data = typeof e.data === 'string' ? JSON.parse(e.data) : e.data
    } catch {
      return
    }
    if (!data || typeof data !== 'object') return
    const { event, info: got } = data as { event?: string; info?: unknown }
    heard = true
    if (event === 'onReady') post({ event: 'listening' })
    if ((event !== 'infoDelivery' && event !== 'initialDelivery') || !got || typeof got !== 'object') return
    const i = got as Partial<Record<'currentTime' | 'duration' | 'playerState' | 'playbackRate', unknown>>
    if (typeof i.currentTime === 'number' && Number.isFinite(i.currentTime)) {
      info.time = i.currentTime
      stamp = clock()
    }
    if (typeof i.duration === 'number' && i.duration > 0) info.duration = i.duration
    if (typeof i.playerState === 'number') {
      // The time stands still from this moment on (paused) or starts to run (playing).
      if (info.state === PLAYING && i.playerState !== PLAYING && typeof i.currentTime !== 'number') info.time = now()
      if (i.playerState === PLAYING && info.state !== PLAYING) stamp = clock()
      info.state = i.playerState
    }
    if (typeof i.playbackRate === 'number' && i.playbackRate > 0) info.rate = i.playbackRate
    onChange({ ...info })
  }
  const now = () => (info.state === PLAYING ? info.time + ((clock() - stamp) / 1000) * info.rate : info.time)

  window.addEventListener('message', onMessage)
  // Said until the player hears it (it may not be loaded yet); then once more is enough.
  post({ event: 'listening' })
  const hello = setInterval(() => {
    if (heard) clearInterval(hello)
    else post({ event: 'listening' })
  }, 250)

  return {
    now,
    info: () => ({ ...info, time: now() }),
    answered: () => heard,
    play: () => command('playVideo'),
    pause: () => command('pauseVideo'),
    seek: (seconds) => {
      info.time = Math.max(0, seconds)
      stamp = clock()
      command('seekTo', [Math.max(0, seconds), true])
    },
    setRate: (rate) => {
      info.rate = rate
      command('setPlaybackRate', [rate])
    },
    dispose: () => {
      clearInterval(hello)
      window.removeEventListener('message', onMessage)
    },
  }
}

/** The next sentence start after `from` (a sentence-by-sentence pause waits there), or undefined. */
export function nextStop(stops: readonly number[], from: number): number | undefined {
  return stops.find((s) => s > from + 0.3)
}
