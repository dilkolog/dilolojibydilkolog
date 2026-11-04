import { useEffect, useRef, useState } from 'react'
import { useStudyClock } from './useStudyClock'
import { drivenEmbed, nextStop, PLAYING, youtubeController, type YoutubeController } from './youtubePlayer'

const RATES = [0.75, 1]
/** How often the text is told where the video is. */
const TICK_MS = 200
/** No word from the player by then: the text cannot follow (the embed did not load, or is blocked). */
const SILENT_MS = 10_000
const SMALL_KEY = 'diloloji:video-small'

const readSmall = () => {
  try {
    return localStorage.getItem(SMALL_KEY) === '1'
  } catch {
    return false
  }
}

/**
 * A YouTube video above its transcript, read along: the sentence heard is lit in the text (as with a recording),
 * a sentence can be played on its own, and the video can stop after every sentence. Pinned to the top while
 * scrolling, and can be made small to leave room for the text.
 */
export function VideoPanel({
  id,
  title,
  onTime,
  onDuration,
  seekRef,
  rangeRef,
  pauseRef,
  stops,
  still = false,
  onListened,
}: {
  id: string
  title: string
  onTime?: (seconds: number) => void
  onDuration?: (seconds: number) => void
  /** Set to a function that jumps to a time and plays (a sentence's start). */
  seekRef?: { current: ((seconds: number) => void) | null }
  /** Set to a function that plays one stretch and stops (dictation, shadowing: one sentence). */
  rangeRef?: { current: ((from: number, to: number, slow?: boolean) => Promise<void>) | null }
  /** Set to a function that pauses the video (a word was tapped). */
  pauseRef?: { current: (() => void) | null }
  /** Where each sentence starts: "sentence by sentence" waits at the next one. */
  stops?: readonly number[] | null
  still?: boolean
  onListened?: (seconds: number) => void
}) {
  const frame = useRef<HTMLIFrameElement>(null)
  const panel = useRef<HTMLElement>(null)
  const player = useRef<YoutubeController | null>(null)
  const [playing, setPlaying] = useState(false)
  const [silent, setSilent] = useState(false)
  const [rate, setRate] = useState(1)
  const [eachSentence, setEachSentence] = useState(false)
  const [small, setSmall] = useState(readSmall)
  useStudyClock({ active: playing && !!onListened, needsActivity: false, record: onListened })

  // The latest props for the player's callbacks and the tick (they change every render).
  const live = useRef({ onTime, onDuration, stops, eachSentence })
  useEffect(() => {
    live.current = { onTime, onDuration, stops, eachSentence }
  })
  const durationSent = useRef(0)
  /** Where playing (re)started: "sentence by sentence" waits at the first sentence start after it. */
  const playedFrom = useRef(0)

  useEffect(() => {
    const el = frame.current
    if (!el) return
    let wasPlaying = false
    const p = youtubeController(el, (info) => {
      const now = info.state === PLAYING
      if (now && !wasPlaying) playedFrom.current = info.time
      wasPlaying = now
      setPlaying(now)
      if (info.duration && info.duration !== durationSent.current) {
        durationSent.current = info.duration
        live.current.onDuration?.(info.duration)
      }
      live.current.onTime?.(info.time)
    })
    player.current = p
    const silence = setTimeout(() => setSilent(!p.answered()), SILENT_MS)
    const tick = setInterval(() => {
      if (p.info().state !== PLAYING) return
      const t = p.now()
      live.current.onTime?.(t)
      const { stops: s, eachSentence: each } = live.current
      const stop = each && s ? nextStop(s, playedFrom.current) : undefined
      if (stop !== undefined && t >= stop - 0.15) {
        p.pause()
        playedFrom.current = stop
      }
    }, TICK_MS)
    return () => {
      clearTimeout(silence)
      clearInterval(tick)
      p.dispose()
      player.current = null
    }
  }, [id])

  useEffect(() => {
    if (seekRef)
      seekRef.current = (seconds) => {
        const p = player.current
        if (!p) return
        p.seek(Math.max(0, seconds - 0.15))
        playedFrom.current = seconds - 0.15
        p.play()
      }
    if (pauseRef) pauseRef.current = () => player.current?.pause()
    return () => {
      if (seekRef) seekRef.current = null
      if (pauseRef) pauseRef.current = null
    }
  }, [seekRef, pauseRef])

  const rateRef = useRef(rate)
  rateRef.current = rate
  useEffect(() => {
    if (!rangeRef) return
    let watch: ReturnType<typeof setInterval> | undefined
    let finish: (() => void) | null = null
    rangeRef.current = (from, to, slow = false) =>
      new Promise<void>((resolve) => {
        const p = player.current
        if (!p) return resolve()
        clearInterval(watch)
        finish?.()
        const done = () => {
          clearInterval(watch)
          p.setRate(rateRef.current)
          finish = null
          resolve()
        }
        finish = done
        p.setRate(slow ? 0.75 : rateRef.current)
        p.seek(Math.max(0, from - 0.1))
        playedFrom.current = to
        p.play()
        const began = Date.now()
        watch = setInterval(() => {
          const info = p.info()
          // Stopped by hand, or never started (no answer from the player): the stretch is over.
          if ((info.state !== PLAYING && Date.now() - began > 2500) || Date.now() - began > (to - from) * 2000 + 8000) return done()
          if (info.state === PLAYING && p.now() >= to - 0.05) {
            p.pause()
            done()
          }
        }, 50)
      })
    return () => {
      clearInterval(watch)
      finish?.()
      rangeRef.current = null
    }
  }, [rangeRef])

  useEffect(() => {
    player.current?.setRate(rate)
  }, [rate])

  // The panel's height, for what is pinned under it and for keeping the heard sentence clear of it.
  useEffect(() => {
    const el = panel.current
    if (!el || still || typeof ResizeObserver === 'undefined') return
    const root = document.documentElement
    const set = () => root.style.setProperty('--audio-h', `${Math.ceil(el.getBoundingClientRect().height)}px`)
    set()
    const ro = new ResizeObserver(set)
    ro.observe(el)
    return () => {
      ro.disconnect()
      root.style.removeProperty('--audio-h')
    }
  }, [still])

  const toggleSmall = () => {
    setSmall((s) => {
      try {
        localStorage.setItem(SMALL_KEY, s ? '0' : '1')
      } catch {
        // Only a convenience.
      }
      return !s
    })
  }

  return (
    <section ref={panel} className={`card stack audio-panel video-panel${still ? ' is-still' : ''}${small ? ' video-small' : ''}`} aria-label="Video">
      <div className="video-frame">
        <iframe
          ref={frame}
          src={drivenEmbed(id)}
          title={title}
          allow="autoplay; encrypted-media; picture-in-picture"
          allowFullScreen
          referrerPolicy="strict-origin-when-cross-origin"
        />
      </div>
      <div className="row video-controls">
        <div className="choice-row" role="group" aria-label="Hız">
          {RATES.map((r) => (
            <button key={r} type="button" className="chip chip-sm" aria-pressed={rate === r} onClick={() => setRate(r)}>
              {r === 1 ? 'Normal' : `${r}×`}
            </button>
          ))}
        </div>
        {!!stops?.length && (
          <button type="button" className="chip chip-sm" aria-pressed={eachSentence} onClick={() => setEachSentence((e) => !e)} title="Her cümlenin sonunda durur; devam etmek için oynat">
            Cümle cümle
          </button>
        )}
        <button type="button" className="link small video-size" onClick={toggleSmall}>
          {small ? 'Videoyu büyüt' : 'Videoyu küçült'}
        </button>
      </div>
      {silent && <p className="small muted">Video metinle eşleşemedi; videoyu yine izleyebilir, metni ayrıca okuyabilirsin.</p>}
    </section>
  )
}
