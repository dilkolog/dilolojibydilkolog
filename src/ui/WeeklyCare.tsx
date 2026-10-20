import { useEffect, useState } from 'react'
import { db } from '../data/instance'
import type { RepairTarget } from '../engine/blindSpots'
import { errorBreakdown } from '../engine/insights'
import { careDay, careMinutes, careOf, careSteps, cleanCare, markDone, nextStep, type CareItem, type CareState, type CareStep } from '../engine/weeklyCare'
import type { ReviewEvent, TargetLanguage } from '../engine/types'
import { CheckIcon, CloseIcon } from './icons'
import { TILE_ART } from './drawnArt'

const key = (language: string) => `diloloji:weekly-care:${language}`

const read = (language: string, now: Date): CareState => {
  try {
    const raw = localStorage.getItem(key(language))
    return careOf(raw ? cleanCare(JSON.parse(raw)) : null, now)
  } catch {
    return careOf(null, now)
  }
}
const write = (language: string, state: CareState) => {
  try {
    localStorage.setItem(key(language), JSON.stringify(state))
  } catch {
    // Not remembered: the step shows as not done next time.
  }
}

/**
 * Friday to Sunday: one nudge for the week's care round. It lists up to three steps from what the learner's
 * own data says (words missed this week, grammar questions due again, the top blind spot) and opens the next
 * undone one; a step counts as done once it was opened. Device-only (nothing synced), one round a week.
 */
export function WeeklyCare({
  language,
  misses,
  events,
  now,
  onWords,
  onGrammar,
  onRepair,
}: {
  language: TargetLanguage
  /** How many words were answered wrong in the last seven days. */
  misses: number
  events: readonly ReviewEvent[]
  now: Date
  onWords: () => void
  onGrammar: () => void
  onRepair: (target: RepairTarget) => void
}) {
  const [items, setItems] = useState<(CareItem & { target?: RepairTarget })[]>([])
  const [state, setState] = useState<CareState>(() => read(language, now))
  const open = careDay(now)

  useEffect(() => {
    setState(read(language, now))
    setItems([])
    if (!open) return
    let live = true
    void (async () => {
      // Loaded now, on the days it is shown: the grammar data and the findings are not for every start.
      const [{ loadBlindSpots }, { dueGrammar }, { grammarExercises }, log] = await Promise.all([import('./loadBlindSpots'), import('../engine/grammar'), import('../data/grammar'), db.getGrammarLog()])
      const [spots] = await Promise.all([loadBlindSpots(language, errorBreakdown(events))])
      const spot = spots.find((s) => s.target !== 'grammar')
      const due = dueGrammar(grammarExercises(language), log, now).length
      const steps = careSteps({ misses, dueGrammar: due, spot: spot && { title: spot.title, target: spot.target, action: spot.action } })
      if (live) setItems(steps.map((s) => (s.step === 'spot' && spot ? { ...s, target: spot.target } : s)))
    })().catch(() => {})
    return () => {
      live = false
    }
    // The round is worked out once per language and day, not on every answer.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [language, open, misses > 0, now.toDateString()])

  const next = nextStep(items, state)
  if (!open || state.dismissed || !items.length || !next) return null

  const go = (item: CareItem & { target?: RepairTarget }) => {
    const done = markDone(state, item.step)
    setState(done)
    write(language, done)
    if (item.step === 'words') onWords()
    else if (item.step === 'grammar') onGrammar()
    else if (item.target) onRepair(item.target)
  }
  const dismiss = () => {
    const off = { ...state, dismissed: true }
    setState(off)
    write(language, off)
  }
  const stepIcon = (s: CareStep) => (state.done.includes(s) ? <CheckIcon size={12} /> : null)
  return (
    <div className="habit-nudge weekly-care">
      <button type="button" className="habit-nudge-main" onClick={() => go(next)}>
        <img className="nudge-art" src={TILE_ART.weekMisses} alt="" width={30} height={30} draggable={false} />
        <span>
          <strong>Haftalık bakım:</strong>{' '}
          <span className="muted">
            {next.label} · {next.detail} · kalan ~{careMinutes(items, state)} dk
          </span>
          <span className="care-steps small muted" aria-label="Adımlar">
            {items.map((i) => (
              <span key={i.step} className={`care-step${state.done.includes(i.step) ? ' done' : ''}`}>
                {stepIcon(i.step)} {i.label}
              </span>
            ))}
          </span>
        </span>
        <span className="habit-nudge-cta">Başla</span>
      </button>
      <button type="button" className="icon-btn icon-btn-sm" aria-label="Bu hafta değil" title="Bu hafta değil" onClick={dismiss}>
        <CloseIcon size={16} />
      </button>
    </div>
  )
}
