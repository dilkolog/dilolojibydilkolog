import { useEffect, useState } from 'react'

export interface LessonStep {
  /** Id of the section the step leads to. */
  id: string
  label: string
}

/**
 * The steps of a lesson (learn, see, try, check) as a small bar that stays in view: it shows which part is on the
 * screen and takes the learner to another one. The sections carry the ids; nothing here changes the lesson.
 */
export function LessonSteps({ steps }: { steps: LessonStep[] }) {
  const [active, setActive] = useState(steps[0]?.id ?? '')
  useEffect(() => {
    if (typeof IntersectionObserver === 'undefined') return
    const inView = new Set<string>()
    const pick = () => {
      // The first of the sections on the band of the screen where the eye is; none on it keeps the last one.
      const first = steps.find((s) => inView.has(s.id))
      if (first) setActive(first.id)
    }
    const watcher = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) inView.add(e.target.id)
          else inView.delete(e.target.id)
        }
        pick()
      },
      { rootMargin: '-30% 0px -55% 0px' },
    )
    for (const s of steps) {
      const el = document.getElementById(s.id)
      if (el) watcher.observe(el)
    }
    return () => watcher.disconnect()
  }, [steps])

  const go = (id: string) => {
    setActive(id)
    const calm = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches
    document.getElementById(id)?.scrollIntoView({ behavior: calm ? 'auto' : 'smooth', block: 'start' })
  }

  return (
    <nav className="lesson-steps" aria-label="Ders adımları">
      <ol>
        {steps.map((s, i) => (
          <li key={s.id}>
            <button type="button" className="lesson-step" aria-current={active === s.id ? 'step' : undefined} onClick={() => go(s.id)}>
              <span className="lesson-step-no" aria-hidden="true">
                {i + 1}
              </span>
              {s.label}
            </button>
          </li>
        ))}
      </ol>
    </nav>
  )
}
