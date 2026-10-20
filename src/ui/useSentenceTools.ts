import { useState, type MutableRefObject } from 'react'

import type { KelimeDB, ReadingText } from '../data/db'
import { type TargetLanguage } from '../engine/types'
import { speakAsync } from './speech'
import { showToast } from './toastFeed'

/** What the screen takes from `useListenFollow` for the tools below. */
interface Follow {
  audioDuration: number | null | undefined
  rangeRef: MutableRefObject<((from: number, to: number, slow?: boolean) => Promise<void>) | null>
  sentencesFlat: string[]
  paragraphStart: number[]
  times: number[] | null
  heardAt: MutableRefObject<number>
}

/**
 * Tools that work on the sentences of the open text: playing one (from the recording when its subtitles time it
 * exactly, else the device voice), pinning the audio's follow to the sentence being heard, and scrolling to a
 * sentence and lighting it.
 */
export function useSentenceTools({
  db,
  language,
  current,
  setCurrent,
  setLibrary,
  follow,
}: {
  db: KelimeDB
  language: TargetLanguage
  current: ReadingText | null
  setCurrent: (text: ReadingText) => void
  setLibrary: (update: (library: ReadingText[] | null) => ReadingText[]) => void
  follow: Follow
}) {
  const { audioDuration, rangeRef, sentencesFlat, paragraphStart, times, heardAt } = follow
  // A sentence the learner asked to be shown (from the forms list), lit for a moment.
  const [flash, setFlash] = useState<number | null>(null)

  // Dictation plays a sentence from the text's own recording when its subtitles time it exactly,
  // else the device reads it (approximate times would cut sentences in the middle).
  const recorded = !!(current?.audio && current.cues?.length && times)
  const sentenceEnd = (i: number) => (times ? (times[i + 1] ?? audioDuration ?? times[i] + 10) : 0)
  const playSentence = (i: number, slow: boolean): Promise<void> => {
    if (recorded && times && rangeRef.current) return rangeRef.current(times[i], sentenceEnd(i), slow)
    return speakAsync(sentencesFlat[i], language, slow ? 0.7 : undefined)
  }

  /** Saves a text with new follow pins (the audio's follow is fitted to them), in the library too. */
  const setAnchors = async (anchors: { sentence: number; time: number }[]) => {
    if (!current) return
    const updated: ReadingText = { ...current, syncAnchors: anchors.length ? anchors : undefined }
    await db.saveText(updated)
    setCurrent(updated)
    setLibrary((lib) => (lib ?? []).map((t) => (t.id === updated.id ? updated : t)))
  }

  /** The sentence of the open word card is the one being heard now: the follow shifts to fit. */
  const pinHeard = (at: string) => {
    const [pi, si] = at.split('.').map(Number)
    const sentence = paragraphStart[pi] + si
    if (!(heardAt.current > 0) || !Number.isFinite(sentence)) return showToast('Önce sesi çal; sonra duyduğun cümleye dokun.', undefined, 3500, 'info')
    void setAnchors([...(current?.syncAnchors ?? []).filter((a) => a.sentence !== sentence), { sentence, time: heardAt.current }])
    showToast('Takip ayarlandı: bu cümle şimdi okunan cümle.')
  }

  /** Scrolls the text to a sentence and lights it for a moment. */
  const showSentence = (index: number) => {
    document.querySelector<HTMLElement>(`.reader [data-s="${index}"]`)?.scrollIntoView({ block: 'center', behavior: 'smooth' })
    setFlash(index)
    setTimeout(() => setFlash((f) => (f === index ? null : f)), 2200)
  }

  return { recorded, sentenceEnd, playSentence, setAnchors, pinHeard, flash, showSentence }
}
