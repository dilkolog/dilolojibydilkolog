import { useMemo, useState } from 'react'
import { TENSE_BRIDGE, TENSE_GUIDE } from '../../engine/tenseGuide'
import { FAMILIES, type FamilyId } from '../../engine/verbFamilies'
import { irregularForms, tenseSentence, verbParts, type Tense } from '../../engine/tenses'
import { labForms } from '../../engine/verbLab'
import { masteryLevel, labKey, verbMastery, type LabData } from '../../engine/labProgress'
import { canSpeak, speak } from '../speech'
import { BookIcon, CheckIcon, ChevronDownIcon, SpeakerIcon, StarIcon } from '../icons'
import { Popover, MenuItem } from '../Popover'
import { FormTable } from './FormTable'
import { MOODS, tenseName, verbEntry, type LabLanguage } from './labShared'

/** A menu of tenses by mood (the tense picker of the lab, also used on the learn tab). */
export function TensePicker({ language, tense, onPick, available }: { language: LabLanguage; tense: Tense; onPick: (t: Tense) => void; available: readonly Tense[] }) {
  return (
    <Popover
      button={
        <>
          <span lang={language}>{tenseName(tense)}</span>
          <ChevronDownIcon size={16} />
        </>
      }
      buttonClassName="btn btn-quiet lab-tense-btn" label="Zaman seç" kind="menu" align="start">
      {(close) =>
        MOODS[language].map((m) => {
          const own = m.tenses.filter((t) => available.includes(t))
          if (!own.length) return null
          return (
            <div key={m.label} role="group" aria-label={m.label} className="lab-mood">
              <p className="lab-mood-label">{m.label}</p>
              {own.map((t) => (
                <MenuItem
                  key={t}
                  icon={t === tense ? <CheckIcon size={16} /> : <span className="lab-tick-gap" />}
                  title={tenseName(t)}
                  hint={TENSE_GUIDE[t].tr}
                  onSelect={() => {
                    onPick(t)
                    close()
                  }}
                />
              ))}
            </div>
          )
        })
      }
    </Popover>
  )
}

/**
 * Learn: the verb in the chosen tense. Simple shows one table with what the tense is for; detailed
 * puts every tense side by side, by mood. Reflexive and negative forms are one tap away, and
 * memorise mode covers the forms until they are tapped.
 */
export function LearnTab({
  language,
  verb,
  tense,
  available,
  gloss,
  lab,
  favorite,
  onTense,
  onFavorite,
  inReview,
  reviewable,
  families,
  onFamily,
  onAddReview,
  onPractice,
}: {
  language: LabLanguage
  verb: string
  tense: Tense
  available: readonly Tense[]
  gloss?: string
  lab: LabData
  favorite: boolean
  onTense: (t: Tense) => void
  onFavorite: () => void
  /** How many of the verb's forms are in the review queue already. */
  inReview: number
  /** How many forms can be put in the queue (the tenses the questions use). */
  reviewable: number
  /** The families the verb belongs to, and the way to open one. */
  families: FamilyId[]
  onFamily: (id: FamilyId) => void
  onAddReview: () => void
  onPractice: () => void
}) {
  const [detail, setDetail] = useState(false)
  const [reflexive, setReflexive] = useState(false)
  const [negative, setNegative] = useState(false)
  const [memorise, setMemorise] = useState(false)
  const entry = verbEntry(language, verb)
  const parts = useMemo(() => verbParts(entry), [language, verb]) // eslint-disable-line react-hooks/exhaustive-deps
  const guide = TENSE_GUIDE[tense]
  const forms = labForms(entry, tense, { reflexive, negative })
  const odd = !reflexive && !negative ? irregularForms(entry, tense) : []
  const sentence = tenseSentence(entry, tense)
  const known = available.filter((t) => masteryLevel(lab.records[labKey(verb, t)]) !== 'new').length
  const mastery = verbMastery(lab, verb, available)
  if (!forms) return null
  return (
    <div className="stack lab-learn">
      <p className="lab-uses" lang={language}>
        <span className="small muted">{tenseName(tense)} ile kullanılır:</span>
        {guide.markers.map((m) => (
          <span key={m} className="pill">
            {m}
          </span>
        ))}
      </p>

      <div className="lab-verb-head">
        <h2 className="lab-verb" lang={language}>
          {verb[0].toLocaleUpperCase(language) + verb.slice(1)}
        </h2>
        <button type="button" className="icon-btn" aria-pressed={favorite} aria-label={favorite ? 'Favorilerden çıkar' : 'Favorilere ekle'} onClick={onFavorite}>
          <StarIcon size={20} className={favorite ? 'lab-star is-on' : 'lab-star'} />
        </button>
        {canSpeak() && (
          <button type="button" className="icon-btn" aria-label={`Dinle: ${verb}`} onClick={() => speak(verb, language)}>
            <SpeakerIcon size={20} />
          </button>
        )}
        {gloss && <span className="lab-gloss">{gloss}</span>}
        <div className="segmented lab-detail-toggle" role="group" aria-label="Görünüm">
          <button type="button" className="segmented-btn" aria-pressed={!detail} onClick={() => setDetail(false)}>
            Basit
          </button>
          <button type="button" className="segmented-btn" aria-pressed={detail} onClick={() => setDetail(true)}>
            Detaylı
          </button>
        </div>
      </div>

      {families.length > 0 && (
        <p className="lab-families small">
          <span className="muted">Kalıp:</span>
          {families.map((f) => (
            <button key={f} type="button" className="chip chip-sm" onClick={() => onFamily(f)} title={FAMILIES[f].rule}>
              {FAMILIES[f].name}
            </button>
          ))}
        </p>
      )}

      {parts && (
        <p className="lab-parts small muted" lang={language}>
          <span>
            Mastar: <strong>{parts.infinitive}</strong>
          </span>
          {parts.gerund && (
            <span>
              {language === 'fr' ? 'Ulaç' : 'Ulaç'}: <strong>{parts.gerund}</strong>
            </span>
          )}
          {parts.participle && (
            <span>
              Geçmiş ortaç: <strong>{parts.participle}</strong>
            </span>
          )}
          <span className={parts.irregular ? 'lab-kind is-odd' : 'lab-kind'}>{parts.irregular ? 'Düzensiz' : 'Kurallı'}</span>
        </p>
      )}

      <div className="lab-tools">
        {!detail && <TensePicker language={language} tense={tense} onPick={onTense} available={available} />}
        <button type="button" className="btn btn-quiet btn-sm" aria-pressed={memorise} onClick={() => setMemorise((m) => !m)}>
          {memorise ? 'Formları göster' : 'Ezber modu'}
        </button>
        <span className="lab-alt">
          <span className="small muted">Alternatif:</span>
          <button type="button" className="chip chip-sm" aria-pressed={reflexive} onClick={() => setReflexive((r) => !r)}>
            Dönüşlü
          </button>
          <button type="button" className="chip chip-sm" aria-pressed={negative} onClick={() => setNegative((n) => !n)}>
            Olumsuz
          </button>
        </span>
        <button type="button" className="btn btn-quiet btn-sm lab-print" onClick={() => window.print()}>
          Yazdır
        </button>
      </div>

      <section className="lab-progress" aria-label="Bu fiili ne kadar biliyorsun">
        <div className="lab-progress-top">
          <strong>Bu fiilin çekimlerini ne kadar biliyorsun?</strong>
          <span className="lab-pct">%{mastery}</span>
        </div>
        <div className="lab-bar" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={mastery}>
          <span style={{ width: `${mastery}%` }} />
        </div>
        <div className="lab-progress-foot">
          <p className="small muted">
            {known}/{available.length} çekim denendi
          </p>
          <span className="row gap-2">
            <button type="button" className="btn btn-quiet btn-sm" onClick={onAddReview} disabled={inReview >= reviewable}>
              {inReview >= reviewable ? 'Tekrar listende' : inReview ? 'Hepsini tekrar listeme ekle' : 'Tekrar listeme ekle'}
            </button>
            <button type="button" className="btn btn-sm" onClick={onPractice}>
              <BookIcon size={16} /> Alıştırmaya geç
            </button>
          </span>
        </div>
      </section>

      {!detail ? (
        <>
          <p className="conj-lead">
            <strong>
              <span lang={language}>{guide.name}</span> · {guide.tr}.
            </strong>{' '}
            {guide.short}
          </p>
          <section className="lab-bridge" aria-label="Türkçedeki karşılığı">
            <span className="lab-bridge-kicker">Türkçedeki karşılığı</span>
            <p>
              <strong>{TENSE_BRIDGE[tense].suffix}</strong>
            </p>
            <p>{TENSE_BRIDGE[tense].note}</p>
            {TENSE_BRIDGE[tense].trap && <p className="lab-bridge-trap">Dikkat: {TENSE_BRIDGE[tense].trap}</p>}
          </section>
          <FormTable language={language} tense={tense} forms={forms} irregular={odd} hide={memorise} key={`${verb}${tense}${reflexive}${negative}${memorise}`} />
          {odd.some(Boolean) && (
            <p className="small muted">
              <mark className="conj-odd">Altı çizili</mark> biçimler kuralın dışında; bunlara ayrıca dikkat et.
            </p>
          )}
          {sentence && (
            <div className="lab-example">
              <span className="lab-example-kicker">Örnek</span>
              <p lang={language}>
                {sentence.text.split('___')[0]}
                <strong>{sentence.form}</strong>
                {sentence.text.split('___')[1]}
              </p>
              {sentence.translation && <p className="muted small">{sentence.translation}</p>}
              {canSpeak() && (
                <button type="button" className="icon-btn icon-btn-sm" aria-label="Cümleyi dinle" onClick={() => speak(sentence.text.replace('___', sentence.form), language)}>
                  <SpeakerIcon size={15} />
                </button>
              )}
            </div>
          )}
          <details className="conj-how">
            <summary>Nasıl kurulur?</summary>
            <div className="stack">
              <p className="small">{guide.formation}</p>
              <ul className="conj-examples">
                {guide.examples.map(([s, tr]) => (
                  <li key={s}>
                    <span lang={language}>{s}</span> <span className="muted">{tr}</span>
                  </li>
                ))}
              </ul>
            </div>
          </details>
        </>
      ) : (
        <div className="stack lab-all">
          {MOODS[language].map((m) => {
            const own = m.tenses.filter((t) => available.includes(t))
            if (!own.length) return null
            return (
              <section key={m.label} className="stack gap-2">
                <h3 className="lab-mood-title">{m.label}</h3>
                <div className="lab-cards">
                  {own.map((t) => {
                    const f = labForms(entry, t, { reflexive, negative })
                    if (!f) return null
                    return (
                      <article key={t} className={`lab-card${t === tense ? ' is-current' : ''}`}>
                        <header>
                          <h4 lang={language}>{tenseName(t)}</h4>
                          <button type="button" className="link small" onClick={() => onTense(t)} aria-label={`${tenseName(t)} zamanını aç`}>
                            Aç
                          </button>
                        </header>
                        <p className="small muted">{TENSE_GUIDE[t].tr}</p>
                        <FormTable language={language} tense={t} forms={f} irregular={!reflexive && !negative ? irregularForms(entry, t) : []} layout="single" hide={memorise} speakable={false} key={`${verb}${t}${reflexive}${negative}${memorise}`} />
                      </article>
                    )
                  })}
                </div>
              </section>
            )
          })}
        </div>
      )}
    </div>
  )
}
