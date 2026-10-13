import { useState } from 'react'
import { localDate } from '../../engine/progress'
import { useAi } from '../aiContext'
import { CloseIcon } from '../icons'
import { MonkiFace } from './MonkiMascot'
import { askMonki } from './monkiBus'

const KEY = 'diloloji:monki-nudge'

const dismissedToday = () => {
  try {
    return localStorage.getItem(KEY) === localDate(new Date())
  } catch {
    return false
  }
}

/**
 * Today: Monki offers one thing, once a day: the open mistakes talked through when there are any,
 * otherwise a small quiz. Only with a YZ key; a tap on the cross puts it away until tomorrow.
 */
export function MonkiNudge({ openMistakes }: { openMistakes: number }) {
  const { apiKey } = useAi()
  const [gone, setGone] = useState(dismissedToday)
  if (!apiKey || gone) return null
  const mistakes = openMistakes > 0
  const dismiss = () => {
    try {
      localStorage.setItem(KEY, localDate(new Date()))
    } catch {
      // Private mode: it shows again on the next visit.
    }
    setGone(true)
  }
  const accept = () => {
    askMonki(mistakes ? { text: 'Hatalarımı sırayla inceleyelim', mode: 'mistakes', send: true } : { text: 'Kelimelerimden sor', mode: 'quiz', send: true })
    // Taken up: the next nudge in line (the day's mind seed) may have its turn.
    dismiss()
  }
  return (
    <section className="monki-nudge" aria-label="Monki">
      <span className="monki-nudge-face" aria-hidden>
        <MonkiFace face="wink" size={40} />
      </span>
      <p className="monki-nudge-text">
        {mistakes ? (
          <>
            <strong>{openMistakes} açık hatan var.</strong> Birlikte bakalım mı? Her biri için nedenini ve bir hafıza ipucunu konuşuruz.
          </>
        ) : (
          <>
            <strong>Küçük bir sınav ister misin?</strong> Monki kelimelerinden tek tek soru sorsun.
          </>
        )}
      </p>
      <button type="button" className="btn btn-sm" onClick={accept}>
        {mistakes ? 'Hatalarıma bak' : 'Sına beni'}
      </button>
      <button type="button" className="icon-btn" onClick={dismiss} aria-label="Bugünlük kapat" title="Bugünlük kapat">
        <CloseIcon size={16} />
      </button>
    </section>
  )
}
