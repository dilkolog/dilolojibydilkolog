import { Fragment, useMemo, useRef, useState } from 'react'
import { tenseSentencePool, type Tense } from '../../engine/tenses'
import { AccentBar } from '../shared/AccentBar'
import { accentChange, insertAt } from '../shared/accentCaret'
import { CheckIcon, CloseIcon } from '../shared/icons'
import { sfx } from '../shared/sounds'
import { tenseName, type LabLanguage } from './labShared'
import { clozeRight } from './sentenceCloze'
import { sheetRows, type SheetRow } from './tenseSheetRows'

/**
 * A worksheet of sentences in one tense (or mixed): every sentence with its verb in brackets and a gap,
 * all written first and checked together, the way a grammar book's exercise goes.
 */
export function TenseSheet({
  language,
  verb,
  tense,
  verbs,
  onAnswer,
}: {
  language: LabLanguage
  verb: string
  tense: Tense
  /** The learner's own verbs, then the most common ones. */
  verbs: readonly string[]
  onAnswer?: (verb: string, tense: Tense, ok: boolean, given: string, expected: string) => void
}) {
  // Without sentences in this tense (French has none in the present) the sheet starts mixed.
  const none = tenseSentencePool(language, tense).length < 5
  const [chosen, setChosen] = useState<boolean | null>(null)
  const mixed = chosen ?? none
  const setMixed = setChosen
  const [round, setRound] = useState(0)
  const rows = useMemo(() => sheetRows(language, verb, tense, mixed, verbs, 1000 + round * 7919 + tense.length), [language, verb, tense, mixed, round]) // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <TenseSheetBody
      key={`${verb}|${tense}|${mixed}|${round}`}
      language={language}
      rows={rows}
      tense={tense}
      mixed={mixed}
      noSentences={none}
      onMixed={setMixed}
      onNew={() => setRound((r) => r + 1)}
      onAnswer={onAnswer}
    />
  )
}

function TenseSheetBody({
  language,
  rows,
  tense,
  mixed,
  noSentences,
  onMixed,
  onNew,
  onAnswer,
}: {
  language: LabLanguage
  rows: SheetRow[]
  tense: Tense
  mixed: boolean
  /** This tense has too few sentences to fill a sheet. */
  noSentences: boolean
  onMixed: (mixed: boolean) => void
  onNew: () => void
  onAnswer?: (verb: string, tense: Tense, ok: boolean, given: string, expected: string) => void
}) {
  const [typed, setTyped] = useState<string[]>(() => rows.map(() => ''))
  const [marks, setMarks] = useState<boolean[] | null>(null)
  const inputs = useRef<(HTMLInputElement | null)[]>([])
  const [focused, setFocused] = useState(0)
  const right = marks?.filter(Boolean).length ?? 0
  const check = () => {
    if (marks) return
    const next = rows.map((r, i) => clozeRight({ verb: r.verb, tense: r.tense, before: '', form: r.form, after: '', translation: r.translation ?? '' }, typed[i] ?? '', language))
    setMarks(next)
    if (next.every(Boolean)) sfx.finish()
    else sfx.wrong()
    rows.forEach((r, i) => onAnswer?.(r.verb, r.tense, next[i], (typed[i] ?? '').trim(), r.form))
  }
  const intro = mixed ? 'Parantez içindeki fiili, yanındaki zamanda çekimle.' : `Parantez içindeki fiili ${tenseName(tense)} zamanında çekimle.`

  return (
    <form
      className="stack lab-sheet"
      onSubmit={(e) => {
        e.preventDefault()
        check()
      }}
    >
      <div className="row justify-between items-center wrap gap-2">
        <p className="small muted">{intro}</p>
        <div className="segmented" role="group" aria-label="Zaman">
          <button type="button" className="segmented-btn" aria-pressed={!mixed} disabled={noSentences} title={noSentences ? 'Bu zaman için yeterli cümle yok' : undefined} onClick={() => onMixed(false)}>
            {tenseName(tense)}
          </button>
          <button type="button" className="segmented-btn" aria-pressed={mixed} onClick={() => onMixed(true)}>
            Karışık zamanlar
          </button>
        </div>
      </div>
      {rows.length === 0 ? (
        <p className="muted">Bu zaman için cümle bulunamadı: başka bir zaman seç ya da “Karışık zamanlar”ı dene.</p>
      ) : (
        <ol className="lab-sheet-list">
          {rows.map((r, i) => {
            const [before, after] = r.text.split('___')
            const mark = marks?.[i]
            return (
              <li key={`${r.verb}|${r.tense}`} className={`lab-sheet-row${marks ? (mark ? ' is-ok' : ' is-bad') : ''}`}>
                <p className="lab-sheet-text" lang={language}>
                  {before}
                  <span className="lab-sheet-verb">
                    ({r.verb}
                    {mixed ? ` · ${tenseName(r.tense).toLocaleLowerCase('tr')}` : ''})
                  </span>{' '}
                  <input
                    ref={(el) => {
                      inputs.current[i] = el
                    }}
                    className="input lab-sheet-input"
                    style={{ width: `${Math.max(6, r.form.length + 3)}ch` }}
                    lang={language}
                    value={typed[i] ?? ''}
                    disabled={!!marks}
                    autoComplete="off"
                    autoCapitalize="off"
                    autoCorrect="off"
                    spellCheck={false}
                    autoFocus={i === 0}
                    aria-label={`${i + 1}. cümle: ${r.verb}`}
                    onFocus={() => setFocused(i)}
                    onChange={accentChange(language, (v) => setTyped((t) => t.map((x, j) => (j === i ? v : x))))}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && i < rows.length - 1) {
                        e.preventDefault()
                        inputs.current[i + 1]?.focus()
                      }
                    }}
                  />
                  {after}
                  {marks && (
                    <Fragment>
                      {' '}
                      {mark ? <CheckIcon size={16} className="lab-sheet-mark ok" aria-label="Doğru" /> : <CloseIcon size={16} className="lab-sheet-mark bad" aria-label="Yanlış" />}
                    </Fragment>
                  )}
                </p>
                {marks && (
                  <p className="small lab-sheet-note">
                    {!mark && (
                      <>
                        Doğrusu: <strong lang={language}>{r.form}</strong>
                        {r.translation ? ' · ' : ''}
                      </>
                    )}
                    <span className="muted">{r.translation}</span>
                  </p>
                )}
              </li>
            )
          })}
        </ol>
      )}
      {!marks && rows.length > 0 && <AccentBar language={language} onInsert={(ch) => inputs.current[focused] && setTyped((t) => t.map((x, j) => (j === focused ? insertAt(inputs.current[focused] as HTMLInputElement, ch) : x)))} />}
      <div className="row gap-2 wrap">
        {!marks && rows.length > 0 && (
          <button type="submit" className="btn" disabled={typed.every((t) => !t.trim())}>
            Hepsini kontrol et
          </button>
        )}
        {(marks || rows.length === 0) && (
          <>
            {marks && (
              <p role="status" className="lab-sheet-score">
                {right} / {rows.length} doğru
              </p>
            )}
            <button type="button" className="btn" onClick={onNew} autoFocus>
              Yeni cümleler
            </button>
          </>
        )}
      </div>
    </form>
  )
}
