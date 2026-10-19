import { useState } from 'react'
import { checkGrammar, GrammarError, LANGUAGETOOL_URL } from '../data/grammarCheck'
import { applyFix, markIssues, type GrammarIssue } from '../engine/grammarIssues'
import type { TargetLanguage } from '../engine/types'
import { classifyIssue, WRITING_LABEL, writingRows } from '../engine/writingErrors'
import { CheckIcon } from './icons'
import { noteWriting } from './writingNote'

const KIND: Record<GrammarIssue['kind'], string> = { spelling: 'Yazım', grammar: 'Dil bilgisi', style: 'Üslup' }

/**
 * "Denetle": the text checked for spelling and grammar (LanguageTool), without AI. The flagged
 * stretches are marked in the text; a suggestion is one tap and goes straight into the text.
 * The text leaves the device only when the learner taps.
 */
export function GrammarCheck({ text, language, onChange }: { text: string; language: TargetLanguage; onChange: (text: string) => void }) {
  const [result, setResult] = useState<{ text: string; issues: GrammarIssue[]; found: number } | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  // What this check added to the writing error notebook: the kinds it found, with how many times each has come up in all.
  const [noted, setNoted] = useState<string[]>([])
  // Typed on since the check: the marks no longer fit the text.
  const current = result && result.text === text ? result : null

  const run = async () => {
    setBusy(true)
    setError('')
    try {
      const issues = await checkGrammar(text, language)
      setResult({ text, issues, found: issues.length })
      setNoted([])
      void noteWriting(language, text, issues).then((log) => {
        if (!log) return
        const kinds = new Set(issues.map((i) => classifyIssue(i, language, text)))
        setNoted(writingRows(log, language).filter((r) => kinds.has(r.kind) && r.kind !== 'punctuation').slice(0, 3).map((r) => `${WRITING_LABEL[r.kind]} ×${r.n}`))
      })
    } catch (e) {
      setError(e instanceof GrammarError ? e.message : 'Denetim şu an yapılamadı.')
    } finally {
      setBusy(false)
    }
  }
  const fix = (issue: GrammarIssue, replacement: string) => {
    if (!current) return
    const next = applyFix(current.text, current.issues, issue, replacement)
    setResult({ ...next, found: current.found })
    onChange(next.text)
  }
  const ignore = (issue: GrammarIssue) => current && setResult({ ...current, issues: current.issues.filter((i) => i !== issue) })

  return (
    <div className="stack gap-2 grammar-check">
      {!current && (
        <span className="row gap-2">
          <button type="button" className="link small" onClick={run} disabled={busy || text.trim().split(/\s+/).length < 2}>
            <CheckIcon size={16} className="inline-icon" /> {busy ? 'Denetleniyor…' : 'Yazım ve dil bilgisini denetle'}
          </button>
          {error && (
            <span className="small error" role="status">
              {error}
            </span>
          )}
        </span>
      )}
      {current && (
        <section className="card stack gap-2" aria-label="Denetim">
          {current.issues.length === 0 ? (
            <p className="small notice">{current.found ? 'Kalan hata yok.' : 'Hata bulunmadı.'}</p>
          ) : (
            <>
              <p className="gc-text" lang={language}>
                {markIssues(current.text, current.issues).map((p, i) =>
                  p.issue ? (
                    <mark key={i} className={`gc-mark gc-${p.issue.kind}`} title={p.issue.message}>
                      {p.text}
                    </mark>
                  ) : (
                    <span key={i}>{p.text}</span>
                  ),
                )}
              </p>
              <ul className="plain stack gap-2 gc-list">
                {current.issues.map((issue) => (
                  <li key={`${issue.offset}-${issue.message}`}>
                    <span className="small">
                      <strong>{KIND[issue.kind]}:</strong> <span lang={language}>“{current.text.slice(issue.offset, issue.offset + issue.length)}”</span> · {issue.message}
                    </span>
                    <span className="row gap-2">
                      {issue.replacements.map((r) => (
                        <button key={r} type="button" className="chip chip-sm" lang={language} onClick={() => fix(issue, r)}>
                          {r || '(sil)'}
                        </button>
                      ))}
                      <button type="button" className="link small" onClick={() => ignore(issue)}>
                        Yok say
                      </button>
                    </span>
                  </li>
                ))}
              </ul>
            </>
          )}
          {noted.length > 0 && (
            <p className="small muted gc-noted">
              Yazı hata defterine işlendi: {noted.join(' · ')}. İlerleme → “Yazı hata defterim”.
            </p>
          )}
          <p className="small muted">
            <a className="link" href={LANGUAGETOOL_URL} target="_blank" rel="noreferrer">
              LanguageTool
            </a>{' '}
            ile denetlendi; her hata gerçek hata olmayabilir, sen karar ver.
          </p>
        </section>
      )}
    </div>
  )
}
