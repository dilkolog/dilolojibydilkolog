import { useEffect, useRef, useState } from 'react'
import { lessonScript } from '../data/guide/lessonScript'
import type { TopicLesson } from '../data/guide/lessonTypes'
import { SpeakerIcon } from './icons'
import { canSpeak, speakAsync, speakTurkishAsync, stopSpeaking } from './speech'

/**
 * "Dersi dinle": the whole lesson read aloud, part by part (the explanations in Turkish, the examples in their language),
 * so it can be heard on a walk. Tapping again stops it; leaving the lesson stops it too.
 */
export function LessonListen({ lesson, title }: { lesson: TopicLesson; title: string }) {
  const [at, setAt] = useState<number | null>(null)
  const run = useRef(0)
  useEffect(
    () => () => {
      run.current++
      stopSpeaking()
    },
    [],
  )
  if (!canSpeak()) return null
  const script = lessonScript(lesson, title)
  const stop = () => {
    run.current++
    stopSpeaking()
    setAt(null)
  }
  const play = async () => {
    const id = ++run.current
    for (let i = 0; i < script.length; i++) {
      if (run.current !== id) return
      setAt(i)
      const u = script[i]!
      await (u.lang === 'tr' ? speakTurkishAsync(u.text) : speakAsync(u.text, u.lang))
    }
    if (run.current === id) setAt(null)
  }
  return (
    <button type="button" className="btn btn-quiet" aria-pressed={at !== null} onClick={() => (at === null ? void play() : stop())}>
      <SpeakerIcon size={16} className="inline-icon" /> {at === null ? 'Dersi dinle' : `Durdur (${at + 1}/${script.length})`}
    </button>
  )
}
