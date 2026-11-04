import { useEffect, useMemo, useRef, useState } from 'react'
import { useNumberKeys } from '../useNumberKeys'
import { SLIP_CLEAR, openSlips, slipNeeds, type LabData } from '../../engine/labProgress'
import { createRng } from '../../engine/rng'
import { conjugateTense, subjectLabel, withSubject } from '../../engine/tenses'
import { AccentBar } from '../AccentBar'
import { accentChange, insertAt } from '../accentCaret'
import { CheckIcon, CloseIcon } from '../icons'
import { Sticker } from '../Sticker'
import { sfx } from '../sounds'
import monkiSlipsCleared from '../../assets/art/monki-slips-cleared.webp'
import { Diagnosis } from './Diagnosis'
import { judge, tenseName, verbEntry, type LabLanguage } from './labShared'
import type { RunCheck } from './ReviewTab'
import { SLIP_ROUND, slipOptions, slipRound, type SlipQuestion } from './slipRound'

/**
 * Hatalarım: every form answered wrong in the lab is kept here and asked again, mixed, until it has
 * been answered right twice in a row. A form that was just missed is chosen from options, one that
 * has been right once is typed.
 */
export function SlipsTab({ language, lab, onCheck, onOpen }: { language: LabLanguage; lab: LabData; onCheck: RunCheck; onOpen: (verb: string) => void }) {
  const open = openSlips(lab)
  const [seed, setSeed] = useState<number | null>(null)
  if (seed !== null) return <SlipRun key={seed} language={language} lab={lab} seed={seed} onCheck={onCheck} onOpen={onOpen} onClose={() => setSeed(null)} />
  if (!open.length)
    return (
      <div className="stack lab-review-empty center">
        <img src={monkiSlipsCleared} width={112} height={112} alt="" className="sticker-lead" draggable={false} />
        <h2>Açık hatan yok</h2>
        <p className="muted">Alıştırmada yanlış yaptığın her çekim buraya kaydolur. Üst üste {SLIP_CLEAR} kez doğru yapınca hatalarından çıkar.</p>
      </div>
    )
  return (
    <div className="stack lab-slips">
      <p className="muted">
        Yanlış yaptığın her çekim burada bekler. Karışık sorulur; bir çekimi <strong>üst üste {SLIP_CLEAR} kez</strong> doğru yapınca listeden çıkar, yanlış yaparsan sayaç sıfırlanır.
      </p>
      <ul className="lab-slip-list" aria-label="Hata listesi">
        {open.slice(0, 12).map((s) => (
          <li key={`${s.verb}|${s.tense}|${s.person}`} className="lab-slip-row">
            <span lang={language}>
              <strong>{subjectLabel(language, s.tense, s.person)}</strong> · {s.verb}
            </span>
            <span className="small muted">
              {tenseName(s.tense)} · {s.wrong}× yanlış · {slipNeeds(s)} doğru kaldı
            </span>
          </li>
        ))}
      </ul>
      {open.length > 12 && <p className="small muted">…ve {open.length - 12} çekim daha.</p>}
      <div className="row">
        <button type="button" className="btn btn-lg" onClick={() => setSeed(Date.now())}>
          Karışık sor ({Math.min(open.length, SLIP_ROUND)})
        </button>
      </div>
    </div>
  )
}

function SlipRun({ language, lab, seed, onCheck, onOpen, onClose }: { language: LabLanguage; lab: LabData; seed: number; onCheck: RunCheck; onOpen: (verb: string) => void; onClose: () => void }) {
  // The queue is fixed when the sitting starts; the answers change `lab` under it.
  const queue = useMemo<SlipQuestion[]>(() => slipRound(lab, language, seed), []) // eslint-disable-line react-hooks/exhaustive-deps
  const [index, setIndex] = useState(0)
  const [typed, setTyped] = useState('')
  const [shown, setShown] = useState<{ ok: boolean; picked: string; cleared: boolean } | null>(null)
  const [right, setRight] = useState(0)
  const [cleared, setCleared] = useState(0)
  const input = useRef<HTMLInputElement>(null)
  const optionKeys = useRef<HTMLDivElement>(null)
  useNumberKeys(optionKeys)
  const asked = queue[index]
  const slip = asked?.slip
  const forms = slip ? conjugateTense(verbEntry(language, slip.verb), slip.tense) : undefined
  const options = useMemo(() => (asked?.format === 'choose' ? slipOptions(language, asked.slip, createRng(seed + index)) : []), [asked, index]) // eslint-disable-line react-hooks/exhaustive-deps

  const answer = (ok: boolean, given: string) => {
    if (!slip || !forms || shown) return
    const out = ok && slip.streak + 1 >= SLIP_CLEAR
    setShown({ ok, picked: given, cleared: out })
    if (ok) {
      setRight((n) => n + 1)
      sfx.correct()
    } else sfx.wrong()
    if (out) setCleared((n) => n + 1)
    onCheck(slip.verb, slip.tense, ok, given, forms[slip.person], slip.person)
  }
  const next = () => {
    setShown(null)
    setTyped('')
    setIndex((i) => i + 1)
    requestAnimationFrame(() => input.current?.focus())
  }
  useEffect(() => {
    if (index >= queue.length && queue.length) sfx.finish()
  }, [index, queue.length])

  if (!queue.length) {
    return (
      <div className="stack lab-review-empty center">
        <p className="muted">Sorulacak çekim kalmadı.</p>
        <button type="button" className="btn" onClick={onClose}>
          Geri dön
        </button>
      </div>
    )
  }
  if (index >= queue.length) {
    const left = openSlips(lab).length
    return (
      <section className="stack lab-result center" role="status">
        {left === 0 ? (
          <img src={monkiSlipsCleared} width={100} height={100} alt="" className="sticker-lead" draggable={false} />
        ) : (
          <Sticker name="thumbs" size={88} className="sticker-lead" />
        )}
        <h2>Hatalarım bitti</h2>
        <p className="lab-score">
          {right} / {queue.length}
        </p>
        <p className="muted">
          {cleared > 0 ? `${cleared} çekim hatalarından çıktı. ` : ''}
          {left > 0 ? `Listede ${left} çekim kaldı.` : 'Listede hiç çekim kalmadı: harika!'}
        </p>
        <div className="row">
          {left > 0 && (
            <button type="button" className="btn" onClick={() => onClose()}>
              Listeye dön
            </button>
          )}
          {left === 0 && (
            <button type="button" className="btn" onClick={onClose}>
              Tamam
            </button>
          )}
        </div>
      </section>
    )
  }

  const forceType = asked.format === 'type'
  return (
    <div className="stack lab-review-run">
      <div className="lab-practice-top">
        <span className="small muted">
          {index + 1} / {queue.length}
        </span>
        <button type="button" className="link small" onClick={() => onOpen(slip.verb)}>
          Fiili aç
        </button>
      </div>
      <div className="lab-bar" aria-hidden>
        <span style={{ width: `${(index / queue.length) * 100}%` }} />
      </div>
      <p className="prompt-label">
        <span lang={language}>{tenseName(slip.tense)}</span>
      </p>
      <p className="prompt-text" lang={language}>
        {subjectLabel(language, slip.tense, slip.person)} · {slip.verb}
      </p>
      <p className="small muted">
        {slip.wrong}× yanlış yaptın · hatadan çıkmak için {slipNeeds(slip)} doğru daha
      </p>
      {asked.format === 'choose' ? (
        <div ref={optionKeys} className="lab-options" role="group" aria-label="Seçenekler" lang={language}>
          {options.map((o) => (
            <button
              key={o}
              type="button"
              className={`lab-option${shown ? (o === forms?.[slip.person] ? ' is-right' : o === shown.picked ? ' is-wrong' : '') : ''}`}
              disabled={!!shown}
              onClick={() => answer(o === forms?.[slip.person], o)}
            >
              {o}
            </button>
          ))}
        </div>
      ) : (
        <form
          className="stack"
          onSubmit={(e) => {
            e.preventDefault()
            if (shown) next()
            else if (typed.trim()) answer(judge(language, slip.verb, slip.tense, slip.person, typed), typed.trim())
          }}
        >
          <input
            ref={input}
            className={`input answer-input${shown ? (shown.ok ? ' is-correct' : ' is-wrong') : ''}`}
            lang={language}
            value={typed}
            onChange={accentChange(language, setTyped)}
            autoFocus={forceType}
            autoComplete="off"
            autoCapitalize="off"
            autoCorrect="off"
            spellCheck={false}
            disabled={!!shown}
            aria-label="Cevap"
            placeholder="Çekimi yaz"
          />
          <AccentBar language={language} disabled={!!shown} onInsert={(ch) => input.current && setTyped(insertAt(input.current, ch))} />
          {!shown && (
            <div className="row">
              <button type="submit" className="btn" disabled={!typed.trim()}>
                Kontrol et
              </button>
            </div>
          )}
        </form>
      )}
      {shown && (
        <div className={`accent-result lab-feedback is-${shown.ok ? 'correct' : 'wrong'}`}>
          <div className="lab-feedback-main" role="status">
            <span className="lab-verdict">
              {shown.ok ? <CheckIcon size={20} /> : <CloseIcon size={20} />}
              {shown.ok ? (shown.cleared ? 'Doğru: hatalarından çıktı!' : 'Doğru! Bir doğru daha gerek') : 'Yanlış: sayaç sıfırlandı'}
            </span>
            {!shown.ok && forms && (
              <span className="lab-truth">
                Doğrusu: <strong lang={language}>{withSubject(language, slip.tense, slip.person, forms[slip.person])}</strong>
              </span>
            )}
          </div>
          <button type="button" className="btn lab-next" onClick={next} autoFocus>
            {index + 1 >= queue.length ? 'Bitir' : 'Devam'} <kbd className="kbd-key">↵</kbd>
          </button>
          {!shown.ok && asked.format === 'type' && (
            <div className="lab-feedback-more">
              <Diagnosis language={language} verb={slip.verb} tense={slip.tense} person={slip.person} typed={shown.picked} />
            </div>
          )}
        </div>
      )}
    </div>
  )
}
