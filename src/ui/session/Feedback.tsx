import { useEffect, useState } from 'react'
import { falseFriendsOf } from '../../engine/crossLanguage'
import { ruleFor } from '../../engine/genderRules'
import { displayForm } from '../../engine/exercises'
import { MASTERY_STAGES, type MasteryStage } from '../../engine/mastery'
import type { Confidence, VocabularyEntry } from '../../engine/types'
import { ERROR_HINT, genderRuleText, LANGUAGE_NAME, STAGE_NAME } from '../labels'
import { Plant } from '../Plant'
import { AlertIcon, BulbIcon, CheckIcon } from '../icons'
import type { Graded } from './shared'
import { modalOpen, ownsKey } from './keys'

const PRAISE = ['Harika!', 'Doğru!', 'Süper!', 'Aynen böyle!', 'Mükemmel!', 'Çok iyi!']

/** A confident error gets a moment of attention before moving on (hypercorrection). */
const CONFIDENT_ERROR_PAUSE_MS = 800

/** The sheet after an answer: verdict, the right answer, why it was wrong, and Devam. */
export function Feedback({
  ev,
  confidence,
  grew,
  entry,
  continueRef,
  onContinue,
  onOverride,
  xp,
  mnemonic,
  onMnemonic,
}: {
  xp?: number
  mnemonic?: 'offer' | 'open' | 'saved' | null
  onMnemonic?: () => void
  ev: Graded
  confidence?: Confidence
  /** The answer moved the word up a growth stage. */
  grew?: MasteryStage
  entry: VocabularyEntry
  continueRef: React.RefObject<HTMLButtonElement | null>
  onContinue: () => void
  onOverride?: () => void
}) {
  const [praise] = useState(() => PRAISE[Math.floor(Math.random() * PRAISE.length)])
  const cls = ev.verdict === 'correct' ? 'ok' : ev.verdict
  const confidentError = ev.verdict === 'wrong' && confidence === 'sure'
  const title = ev.verdict === 'correct' ? praise : ev.verdict === 'near' ? 'Çok yakın!' : 'Olsun, doğrusu:'
  // An intrusion gets its own, more specific note below.
  const hint = ev.errorType && ev.verdict !== 'correct' && !ev.intrusion ? ERROR_HINT[ev.errorType] : ''
  const btnClass = ev.verdict === 'correct' ? 'btn-ok' : ev.verdict === 'near' ? 'btn-near' : 'btn-bad'
  const [ready, setReady] = useState(!confidentError)
  useEffect(() => {
    if (ready) return
    const t = setTimeout(() => setReady(true), CONFIDENT_ERROR_PAUSE_MS)
    return () => clearTimeout(t)
  }, [ready])
  useEffect(() => {
    if (ready && confidentError) continueRef.current?.focus()
  }, [ready, confidentError, continueRef])
  // Enter continues even when focus wandered off the button; Alt+D: "my answer is right too".
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (modalOpen()) return
      if (e.key === 'Enter' && ready && !ownsKey(e.target)) {
        e.preventDefault()
        onContinue()
      } else if (e.altKey && e.code === 'KeyD' && onOverride) {
        e.preventDefault()
        onOverride()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [ready, onContinue, onOverride])
  const example = entry.senses[0].examples[0]
  return (
    <div className={`sheet ${cls}`} role="status">
      <div className="sheet-inner">
        <div className="sheet-text">
          <p className="sheet-title">
            {ev.verdict === 'correct' ? <CheckIcon size={24} /> : <AlertIcon size={24} />}
            {title}
            {xp !== undefined && xp > 0 && <span className="xp-pop">+{xp} XP</span>}
          </p>
          {ev.verdict !== 'correct' && (
            <p className="expected" lang={entry.language}>
              {ev.expected}
            </p>
          )}
          <div className="sheet-notes">
          {confidentError && (
            <div className="hyper">
              <p className="small">
                “Emin değilim” demeden yanlış cevapladın. Bildiğini sandığın bir kelimeyi düzeltmek, doğrusunu en kalıcı şekilde öğrenmeni sağlar. Farka
                bir bak:
              </p>
              {ev.given && (
                <p className="small">
                  <s>{ev.given}</s> → <strong>{ev.expected}</strong>
                </p>
              )}
              {example && <p className="small sentence-sm">{example.text}</p>}
            </div>
          )}
          {grew && (
            <p className="small grew-note">
              <Plant stage={MASTERY_STAGES.indexOf(grew)} size={26} /> Büyüdü: artık <strong>{STAGE_NAME[grew]}</strong>
            </p>
          )}
          {confidence === 'unsure' && (
            <p className="small">
              {ev.verdict === 'wrong'
                ? 'Emin olmadığını işaretlemiştin: tahmin olarak kaydedildi, kelime yakında tekrar gelecek.'
                : 'Emin değildin; doğru bilsen de tahmin sayıldı, kelime biraz daha erken tekrar gelecek.'}
            </p>
          )}
          {ev.feedback ? <p className="small">{ev.feedback}</p> : hint && <p className="small">{hint}</p>}
          {ev.errorType === 'gender' && ruleFor(entry) && <p className="small">{genderRuleText(ruleFor(entry)!, displayForm(entry))}</p>}
          {ev.intrusion && (
            <p className="small intrusion-note">
              “{ev.intrusion.word}” {LANGUAGE_NAME[ev.intrusion.language]} bir kelime
              {ev.intrusion.entry ? ` (${ev.intrusion.entry.senses[0].gloss})` : ''}. {LANGUAGE_NAME[entry.language]} doğrusu: <strong>{ev.expected}</strong>
            </p>
          )}
          {ev.errorType === 'false_friend' &&
            falseFriendsOf(entry).map((f) => (
              <p key={f.word} className="small">
                “{f.gloss}” {LANGUAGE_NAME[f.lang]} <em>{f.word}</em> demek. {displayForm(entry)} ise “{entry.senses[0].gloss}”.
              </p>
            ))}
          {ev.verdict !== 'correct' && entry.notes && <p className="small"><BulbIcon size={16} className="inline-icon" />{entry.notes}</p>}
          </div>
          <p className="sheet-gloss">
            <span lang={entry.language}>{displayForm(entry)}</span>
            {entry.ipa && <span className="ipa">{entry.ipa}</span>}
            {entry.senses[0].gloss}
          </p>
        </div>
        <div className="sheet-actions">
          {mnemonic === 'offer' && (
            <button className="btn btn-quiet" onClick={onMnemonic}>
              <BulbIcon size={18} /> Hafıza ipucu oluştur
            </button>
          )}
          {mnemonic === 'saved' && <span className="small"><BulbIcon size={16} className="inline-icon" />Not kaydedildi</span>}
          {onOverride && (
            <button className="link small" onClick={onOverride}>
              Cevabım da doğru
            </button>
          )}
          <button ref={continueRef} className={`btn btn-lg ${btnClass}`} onClick={onContinue} disabled={!ready}>
            Devam
          </button>
        </div>
      </div>
    </div>
  )
}
