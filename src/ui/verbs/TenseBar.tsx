import { useEffect, useRef, useState } from 'react'
import type { Tense } from '../../engine/tenses'
import { TensePicker } from './LearnTab'
import { TenseInfoButton } from './TenseLessonSheet'
import { CORE_TENSES, stepTense, tenseName, type LabLanguage } from './labShared'

/**
 * The tense, right above the table: the four core tenses one tap away, the rest in a menu, and ←/→
 * to step through them all (when not typing). It sticks to the top while the table scrolls, so the
 * tense being read is never out of sight.
 */
export function TenseBar({ language, verb, tense, available, onTense }: { language: LabLanguage; verb: string; tense: Tense; available: readonly Tense[]; onTense: (t: Tense) => void }) {
  // Stuck to the top of the screen: the verb's name joins the bar (the heading has scrolled away).
  const sentinel = useRef<HTMLSpanElement>(null)
  const [stuck, setStuck] = useState(false)
  useEffect(() => {
    const el = sentinel.current
    if (!el || typeof IntersectionObserver === 'undefined') return
    const io = new IntersectionObserver(([e]) => setStuck(!e.isIntersecting && e.boundingClientRect.top < 0))
    io.observe(el)
    return () => io.disconnect()
  }, [])
  const core = CORE_TENSES[language].filter((t) => available.includes(t))
  const other = !core.includes(tense)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return
      if (e.metaKey || e.ctrlKey || e.altKey) return
      const el = e.target as HTMLElement | null
      if (el && (el.closest('input, textarea, select, [contenteditable="true"], [role="menu"], [role="tablist"], [role="slider"]') || el.isContentEditable)) return
      const next = stepTense(language, available, tense, e.key === 'ArrowRight' ? 1 : -1)
      if (!next) return
      e.preventDefault()
      onTense(next)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [language, available, tense, onTense])
  return (
    <>
      <span ref={sentinel} className="lab-tense-sentinel" aria-hidden />
      <div className={`lab-tense-bar${stuck ? ' is-stuck' : ''}`} role="group" aria-label="Zaman">
        {stuck && (
          <strong className="lab-tense-verb" lang={language}>
            {verb}
          </strong>
        )}
        {core.map((t) => (
          <button key={t} type="button" className="chip chip-sm" aria-pressed={t === tense} onClick={() => onTense(t)} lang={language}>
            {tenseName(t)}
          </button>
        ))}
        {other && (
          <button type="button" className="chip chip-sm" aria-pressed="true" lang={language}>
            {tenseName(tense)}
          </button>
        )}
        <TensePicker language={language} tense={tense} onPick={onTense} available={available} label="Diğer" buttonClassName="chip chip-sm lab-tense-more" />
        <TenseInfoButton language={language} tense={tense} />
      </div>
    </>
  )
}
