import { useEffect, useRef, useState, type FormEvent } from 'react'
import type { TargetLanguage, Verdict } from '../../engine/types'
import { AccentBar } from '../shared/AccentBar'
import { accentChange, insertAt } from '../shared/accentCaret'

/**
 * After a missed typed answer: the right answer, typed once while it stays on screen (as in classic
 * Memrise). Supported copying, not recall: nothing here is saved or scored, and the word still comes
 * back later for an independent test. One try; an empty Enter goes on, as before.
 */
export function CopyStep({
  expected,
  language,
  check,
  onSkip,
  continueRef,
  ready = true,
}: {
  /** Devam can be pressed (a confident error holds it for a moment). */
  ready?: boolean
  expected: string
  language: TargetLanguage
  /** Grades what was typed with the question's own rules (accents that change the word still count). */
  check: (text: string) => Verdict
  /** Goes on without typing (an empty Enter). */
  onSkip: () => void
  continueRef: React.RefObject<HTMLButtonElement | null>
}) {
  const [text, setText] = useState('')
  const [outcome, setOutcome] = useState<Verdict | null>(null)
  const input = useRef<HTMLInputElement>(null)
  const composing = useRef(false)
  useEffect(() => input.current?.focus(), [])
  // Once checked, Enter (or the button) goes on.
  useEffect(() => {
    if (outcome && ready) continueRef.current?.focus()
  }, [outcome, ready, continueRef])

  const submit = (e: FormEvent) => {
    e.preventDefault()
    if (outcome || composing.current) return
    if (!text.trim()) return onSkip()
    setOutcome(check(text))
  }

  return (
    <form className="copy-step" onSubmit={submit}>
      <label className="small" htmlFor="copy-answer">
        Doğrusunu bir kez yaz <span className="muted">(istersen geç)</span>
      </label>
      <input
        id="copy-answer"
        ref={input}
        className={`input${outcome ? ` is-${outcome}` : ''}`}
        value={text}
        onChange={accentChange(language, setText)}
        onCompositionStart={() => (composing.current = true)}
        onCompositionEnd={() => (composing.current = false)}
        disabled={!!outcome}
        autoComplete="off"
        autoCapitalize="off"
        autoCorrect="off"
        spellCheck={false}
        enterKeyHint="done"
        lang={language}
      />
      {!outcome && <AccentBar language={language} onInsert={(ch) => input.current && setText(insertAt(input.current, ch))} />}
      {outcome && (
        <p className="small copy-result">
          {outcome === 'correct' ? (
            'Doğru yazdın.'
          ) : (
            <>
              {outcome === 'near' ? 'Neredeyse; doğrusu: ' : 'Tam tutmadı; doğrusu: '}
              <strong lang={language}>{expected}</strong>
              {outcome === 'wrong' && '. Devam edebilirsin.'}
            </>
          )}
        </p>
      )}
    </form>
  )
}
