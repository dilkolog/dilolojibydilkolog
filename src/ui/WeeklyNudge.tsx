import { useState } from 'react'
import { ChartIcon, CloseIcon } from './icons'

const KEY = 'kelime-koc:week-seen'

/** The Monday that starts the week of `d` (local), as a key: the line is dismissed for one week. */
const weekKey = (d: Date) => {
  const monday = new Date(d)
  monday.setDate(d.getDate() - ((d.getDay() + 6) % 7))
  return monday.toDateString()
}

/**
 * The week in one line on Today, on Sunday and Monday (the week's end and the next one's start):
 * days studied, answers and how many were right, new words, readings, the verb met most.
 */
export function WeeklyNudge({ line, now, onOpen }: { line: string; now: Date; onOpen: () => void }) {
  const [hidden, setHidden] = useState(() => {
    try {
      return localStorage.getItem(KEY) === weekKey(now)
    } catch {
      return false
    }
  })
  const day = now.getDay()
  if (!line || hidden || (day !== 0 && day !== 1)) return null
  return (
    <div className="habit-nudge weekly-nudge">
      <button type="button" className="habit-nudge-main" onClick={onOpen}>
        <ChartIcon size={18} />
        <span>
          <strong>Haftan:</strong> <span className="muted">{line}</span>
        </span>
        <span className="habit-nudge-cta">İlerleme</span>
      </button>
      <button
        type="button"
        className="icon-btn icon-btn-sm"
        aria-label="Bu hafta gösterme"
        title="Bu hafta gösterme"
        onClick={() => {
          try {
            localStorage.setItem(KEY, weekKey(now))
          } catch {
            // Hidden for now only.
          }
          setHidden(true)
        }}
      >
        <CloseIcon size={16} />
      </button>
    </div>
  )
}
