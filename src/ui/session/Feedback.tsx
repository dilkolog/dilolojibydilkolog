import { RichText } from '../RichText'
import { useEffect, useState } from 'react'
import { falseFriendsOf } from '../../engine/crossLanguage'
import { ruleFor } from '../../engine/genderRules'
import { displayForm } from '../../engine/exercises'
import { MASTERY_STAGES, type MasteryStage } from '../../engine/mastery'
import type { Confidence, VocabularyEntry } from '../../engine/types'
import { ERROR_HINT, genderRuleText, LANGUAGE_NAME, STAGE_NAME } from '../labels'
import { Plant } from '../Plant'
import { BulbIcon, CheckIcon, CloseIcon, NearIcon, PenIcon } from '../icons'
import { PosTag } from '../PosTag'
import { WrittenForm } from '../WrittenForm'
import type { Graded } from './shared'
import { modalOpen, ownsKey } from './keys'

/** After a miss: kind, short, and true (the word is asked once more in a moment). */
const SOFT = ['Olur böyle.', 'Hata, öğrenmenin yarısı.', 'Beynin bunu şimdi kaydetti.', 'Bir sonrakinde sende.']

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
  onDiscard,
  xp,
  mnemonic,
  onMnemonic,
  onEdit,
  forgot,
  typeName,
  onTypePref,
}: {
  /** "Unuttum": the answer is shown as a lesson, not as a mistake (no red, no scolding). */
  forgot?: boolean
  /** The kind of question just answered (when it can be tuned) and what turns its share down or off: offered after a miss, when a kind is a struggle. */
  typeName?: string
  onTypePref?: (level: 'less' | 'off') => void
  xp?: number
  mnemonic?: 'offer' | 'open' | 'saved' | null
  onMnemonic?: () => void
  /** Fix a typo in the word or its meaning without leaving the session. */
  onEdit?: () => void
  ev: Graded
  confidence?: Confidence
  /** The answer moved the word up a growth stage. */
  grew?: MasteryStage
  entry: VocabularyEntry
  continueRef: React.RefObject<HTMLButtonElement | null>
  onContinue: () => void
  onOverride?: () => void
  /** A choice answered by a slip of the finger is taken back, not counted. */
  onDiscard?: () => void
}) {
  const [praise] = useState(() => PRAISE[Math.floor(Math.random() * PRAISE.length)])
  const [soft] = useState(() => SOFT[Math.floor(Math.random() * SOFT.length)])
  const cls = forgot ? 'forgot' : ev.verdict === 'correct' ? 'ok' : ev.verdict
  const confidentError = ev.verdict === 'wrong' && confidence === 'sure' && !forgot
  const title = forgot ? 'Unuttun, olur. İşte cevap:' : ev.verdict === 'correct' ? praise : ev.verdict === 'near' ? 'Çok yakın!' : 'Olsun, doğrusu:'
  // An intrusion gets its own, more specific note below.
  const hint = ev.errorType && ev.verdict !== 'correct' && !ev.intrusion && !forgot ? ERROR_HINT[ev.errorType] : ''
  const btnClass = forgot ? '' : ev.verdict === 'correct' ? 'btn-ok' : ev.verdict === 'near' ? 'btn-near' : 'btn-bad'
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
      } else if (e.key.toLowerCase() === 'e' && !e.altKey && !e.metaKey && !e.ctrlKey && onEdit && !ownsKey(e.target)) {
        e.preventDefault()
        onEdit()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [ready, onContinue, onOverride, onEdit])
  const example = entry.senses[0].examples[0]
  return (
    <div className={`sheet ${cls}`} role="status">
      <div className="sheet-inner">
        <div className="sheet-text">
          <p className="sheet-title">
            <span className="verdict-badge" aria-hidden>
              {forgot ? <BulbIcon size={20} /> : ev.verdict === 'correct' ? <CheckIcon size={20} /> : ev.verdict === 'near' ? <NearIcon size={20} /> : <CloseIcon size={20} />}
            </span>
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
                ? 'Emin olmadığını işaretlemiştin: tahmin olarak kaydedildi.'
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
          {ev.verdict === 'wrong' && !confidentError && !forgot && (
            <p className="small return-note">
              <Plant stage={1} size={26} live /> {soft} Bu kelimeyi birazdan bir kez daha soracağım.
            </p>
          )}
          {ev.verdict !== 'correct' && entry.notes && <p className="small"><BulbIcon size={16} className="inline-icon" /><RichText text={entry.notes} /></p>}
          {ev.verdict !== 'correct' && !forgot && (example || entry.collocations.length > 0) && (
            // The word in use, a tap away: a miss is the moment its sentence and its usual company help most.
            <details className="why-more small">
              <summary>Örnek ve kalıplar</summary>
              {example && (
                <p lang={entry.language} className="why-example">
                  {example.text}
                  {example.translation && <span className="muted"> — {example.translation}</span>}
                </p>
              )}
              {entry.collocations.slice(0, 2).map((c) => (
                <p key={c.phrase} className="why-colloc">
                  <em lang={entry.language}>{c.phrase}</em>
                  {c.translation && <span className="muted"> — {c.translation}</span>}
                </p>
              ))}
            </details>
          )}
          {ev.verdict !== 'correct' && typeName && onTypePref && (
            <p className="small muted type-pref">
              “{typeName}” soruları zor geliyorsa:{' '}
              <button type="button" className="link small" onClick={() => onTypePref('less')}>
                daha az sor
              </button>{' '}
              ·{' '}
              <button type="button" className="link small" onClick={() => onTypePref('off')}>
                bir daha sorma
              </button>
            </p>
          )}
          </div>
        </div>
        <p className="sheet-gloss">
          <span lang={entry.language}><WrittenForm entry={entry} /></span>
          {entry.partOfSpeech !== 'other' && <PosTag pos={entry.partOfSpeech} />}
          {entry.ipa && <span className="ipa">{entry.ipa}</span>}
          {entry.senses[0].gloss}
        </p>
        {(onOverride || onDiscard || onEdit) && (
          <span className="sheet-links">
            {onOverride && (
              <button className="link small" onClick={onOverride}>
                Cevabım da doğru
              </button>
            )}
            {onDiscard && (
              <button className="link small" onClick={onDiscard} title="Bu cevap sayılmaz, kelime olduğu gibi kalır">
                Yanlış dokundum, sayma
              </button>
            )}
            {onEdit && (
              <button className="link small" onClick={onEdit} title="Kelimeyi düzelt (E)">
                <PenIcon size={14} className="inline-icon" />
                Kelimeyi düzelt
              </button>
            )}
          </span>
        )}
        <div className="sheet-actions">
          {mnemonic === 'offer' && (
            <button className="btn btn-quiet" onClick={onMnemonic}>
              <BulbIcon size={18} /> Hafıza ipucu oluştur
            </button>
          )}
          {mnemonic === 'saved' && <span className="small"><BulbIcon size={16} className="inline-icon" />Not kaydedildi</span>}
          <button ref={continueRef} className={`btn btn-lg ${btnClass}`} onClick={onContinue} disabled={!ready}>
            Devam
          </button>
        </div>
      </div>
    </div>
  )
}
