import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { ReadingText } from '../data/db'
import { sentenceAt, sentenceTimes } from '../engine/listenFollow'
import type { analyzeText } from '../engine/reading'

/**
 * Listening while reading: which sentence is being heard (lit in the text and kept in view), where
 * each sentence starts in the recording, and the refs the audio panel fills in to seek and to play
 * a range. `followTime` is what the panel calls as the audio plays.
 */
export function useListenFollow(current: ReadingText | null, analysis: ReturnType<typeof analyzeText> | null) {
  const [audioDuration, setAudioDuration] = useState<number>()
  const [heard, setHeard] = useState(-1)
  const seekRef = useRef<((seconds: number) => void) | null>(null)
  const rangeRef = useRef<((from: number, to: number, slow?: boolean) => Promise<void>) | null>(null)
  const sentencesFlat = useMemo(() => (analysis ? analysis.paragraphs.flatMap((p) => p.map((s) => s.text)) : []), [analysis])
  const paragraphStart = useMemo(() => (analysis ? analysis.paragraphs.map((_, i) => analysis.paragraphs.slice(0, i).reduce((n, p) => n + p.length, 0)) : []), [analysis])
  // Which sentences open a paragraph (a story's page turn is a pause in the reading).
  const paragraphStarts = useMemo(() => sentencesFlat.map((_, i) => paragraphStart.includes(i)), [sentencesFlat, paragraphStart])
  const times = useMemo(
    () => (current?.audio ? sentenceTimes(sentencesFlat, current.cues, audioDuration, { paragraphStarts, anchors: current.syncAnchors }) : null),
    [current, sentencesFlat, audioDuration, paragraphStarts],
  )
  const heardAt = useRef(0)
  const timesRef = useRef(times)
  timesRef.current = times
  const followTime = useCallback((t: number) => {
    heardAt.current = t
    const i = timesRef.current && t > 0 ? sentenceAt(timesRef.current, t) : -1
    setHeard((h) => (h === i ? h : i))
  }, [])
  // New times (the audio's length arrived, a pin was set or reset): the lit sentence follows at once,
  // even when the audio is paused and no time update is coming.
  useEffect(() => {
    if (times && heardAt.current > 0) followTime(heardAt.current)
  }, [times, followTime])
  // The heard sentence kept in view while listening (only when it has left the screen).
  useEffect(() => {
    if (heard < 0) return
    const el = document.querySelector<HTMLElement>(`[data-s="${heard}"]`)
    if (!el) return
    const r = el.getBoundingClientRect()
    if (r.top < 80 || r.bottom > innerHeight - 40) el.scrollIntoView({ block: 'center', behavior: 'smooth' })
  }, [heard])
  return { audioDuration, setAudioDuration, heard, seekRef, rangeRef, sentencesFlat, paragraphStart, times, heardAt, followTime }
}
