import { useEffect, useMemo, useRef, useState, type TouchEvent } from 'react'
import { TENSE_BRIDGE, TENSE_GUIDE } from '../../engine/tenseGuide'
import { FAMILIES, type FamilyId } from '../../engine/verbFamilies'
import { irregularForms, personsOf, reflexiveLemma, tenseSentence, verbParts, withSubject, type Tense } from '../../engine/tenses'
import { labForms } from '../../engine/verbLab'
import { turkishForms, turkishTenseOf } from '../../engine/turkishVerb'
import { masteryLevel, labKey, verbMastery, weakPersons, type LabData } from '../../engine/labProgress'
import { canSpeak, speak } from '../speech'
import { BookIcon, CheckIcon, ChevronDownIcon, MoreIcon, PlusIcon, SpeakerIcon, StarIcon } from '../icons'
import { db } from '../../data/instance'
import { createEntry } from '../../data/wordInput'
import { loadPack, packRecord } from '../../data/wordpack'
import { showToast } from '../toastFeed'
import { Popover, MenuItem } from '../Popover'
import { openPrint } from '../printWindow'
import { verbSheetHtml } from './printVerb'
import { CompareTab } from './CompareTab'
import { FormTable } from './FormTable'
import { TwinTense } from './TwinTense'
import { recordVisit } from '../screenUsage'
import { CORE_TENSES, MOODS, stepTense, tenseName, verbEntry, type LabLanguage } from './labShared'
import { placeNew } from '../listMemory'

/** A menu of tenses by mood (the tense picker of the lab, also used on the learn tab). */
export function TensePicker({
  language,
  tense,
  onPick,
  available,
  label,
  exclude = [],
  buttonClassName = 'btn btn-quiet lab-tense-btn',
}: {
  language: LabLanguage
  tense: Tense
  onPick: (t: Tense) => void
  available: readonly Tense[]
  /** The button's text instead of the tense's name (e.g. "Diğer zamanlar" next to the core ones). */
  label?: string
  /** Tenses left out of the menu (the ones already shown as buttons next to it). */
  exclude?: readonly Tense[]
  buttonClassName?: string
}) {
  return (
    <Popover
      button={
        <>
          {label ?? <span lang={language}>{tenseName(tense)}</span>}
          <ChevronDownIcon size={16} />
        </>
      }
      buttonClassName={buttonClassName} label="Zaman seç" kind="menu" align="start">
      {(close) =>
        MOODS[language].map((m) => {
          const own = m.tenses.filter((t) => available.includes(t) && !exclude.includes(t))
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

/** The six forms with their subjects as one utterance, a pause between each. */
const sayAll = (language: LabLanguage, tense: Tense, forms: readonly string[]) =>
  personsOf(language, tense)
    .filter((p) => forms[p])
    .map((p) => withSubject(language, tense, p, forms[p]))
    .join('. ')

/** The verb's Turkish meaning from the word pack, for a verb in neither the list nor the common ones. */
function usePackGloss(language: LabLanguage, verb: string, wanted: boolean): string | undefined {
  const [gloss, setGloss] = useState<string | undefined>()
  useEffect(() => {
    setGloss(undefined)
    if (!wanted) return
    let live = true
    void loadPack(language).then((pack) => live && setGloss(packRecord(pack, verb, language)?.t?.slice(0, 2).join(', ')))
    return () => {
      live = false
    }
  }, [language, verb, wanted])
  return gloss
}

const BRIDGE_SEEN = 'kelime-koc:bridge-seen'

/** Tenses whose Turkish counterpart the learner has already been shown open (per device). */
function bridgeSeen(): Set<string> {
  try {
    return new Set(JSON.parse(localStorage.getItem(BRIDGE_SEEN) ?? '[]') as string[])
  } catch {
    return new Set()
  }
}

/**
 * The tense from the Turkish side: open the first time a tense is studied, after that one line
 * (its Turkish ending in the summary) that opens on request, so it doesn't push the page down.
 */
function TenseBridge({ tense }: { tense: Tense }) {
  const [open] = useState(() => !bridgeSeen().has(tense))
  useEffect(() => {
    const seen = bridgeSeen()
    if (seen.has(tense)) return
    seen.add(tense)
    try {
      localStorage.setItem(BRIDGE_SEEN, JSON.stringify([...seen]))
    } catch {
      // Shown open again next time; harmless.
    }
  }, [tense])
  const b = TENSE_BRIDGE[tense]
  return (
    <details className="lab-bridge" open={open} aria-label="Türkçedeki karşılığı">
      <summary>
        <span className="lab-bridge-kicker">Türkçedeki karşılığı</span> <strong>{b.suffix}</strong>
      </summary>
      <p>{b.note}</p>
      {b.trap && <p className="lab-bridge-trap">Dikkat: {b.trap}</p>}
    </details>
  )
}

/**
 * Learn: the verb in the chosen tense. Simple shows one table with what the tense is for; compare
 * puts three chosen tenses side by side; detailed
 * puts every tense side by side, by mood. Reflexive and negative forms are one tap away, and
 * memorise mode covers the forms until they are tapped.
 */
export function LearnTab({
  language,
  verb,
  tense,
  available,
  gloss,
  inList = true,
  onAdded,
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
  onMemorised,
  found,
}: {
  language: LabLanguage
  verb: string
  tense: Tense
  /** The person of a searched form in this tense, marked in the table. */
  found?: number
  available: readonly Tense[]
  gloss?: string
  /** The verb is already in the learner's word list. */
  inList?: boolean
  /** Added to the word list from here (the app reloads the words). */
  onAdded?: () => void
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
  /** Memorise mode marked through for the plain verb: counted toward mastery. */
  onMemorised?: (tense: Tense, results: { person: number; ok: boolean }[]) => void
}) {
  const [view, setView] = useState<'simple' | 'detail' | 'compare'>('simple')
  const [reflexive, setReflexive] = useState(false)
  const [negative, setNegative] = useState(false)
  const [memorise, setMemorise] = useState(false)
  // A memorise round marked through: its score, and a new round (all covered again) on request.
  const [memo, setMemo] = useState<{ key: string; right: number; total: number } | null>(null)
  const [memoRound, setMemoRound] = useState(0)
  useEffect(() => setMemo(null), [memorise])
  const [added, setAdded] = useState(false)
  const packGloss = usePackGloss(language, verb, !gloss)
  const meaning = gloss ?? packGloss
  const entry = verbEntry(language, verb)
  // E: memorise mode; A: on to practice. Not while typing, nor with a modifier.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return
      const el = e.target as HTMLElement | null
      if (el && (el.closest('input, textarea, select, [contenteditable="true"]') || el.isContentEditable)) return
      const key = e.key.toLocaleLowerCase('tr')
      if (key === 'e') setMemorise((m) => !m)
      else if (key === 'a') onPractice()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onPractice])
  const addToList = async () => {
    if (!meaning) return
    try {
      // The sentence on the page goes with the verb (any tense's, when this one has none): the form marked, with its Turkish.
      // The plain verb's sentence: the reflexive one would not fit the word added.
      const shown = tenseSentence(entry, tense) ?? available.map((t) => tenseSentence(entry, t)).find((x) => !!x)
      const example = shown ? shown.text.replace('___', `*${shown.form}*`) : undefined
      const placed = await placeNew(db, language, [createEntry({ word: verb, meaning, partOfSpeech: 'verb', example, exampleTranslation: shown?.translation }, language, new Date())])
      await db.vocabulary.bulkPut(placed.entries)
      setAdded(true)
      showToast(placed.listName ? `${verb} “${placed.listName}” listesine eklendi.` : `${verb} kelimelerine eklendi.`)
      onAdded?.()
    } catch {
      showToast('Eklenemedi.', undefined, 4000, 'info')
    }
  }
  const parts = useMemo(() => verbParts(entry), [language, verb]) // eslint-disable-line react-hooks/exhaustive-deps
  const guide = TENSE_GUIDE[tense]
  const forms = labForms(entry, tense, { reflexive, negative })
  // The Turkish beside each form (bekliyorum), for the plain verb in a core tense; none when unsure.
  const trTense = turkishTenseOf(tense)
  const turkish = meaning && trTense && !reflexive && !negative ? turkishForms(meaning, trTense) : undefined
  const odd = !reflexive && !negative ? irregularForms(entry, tense) : []
  // Reflexive forms on: the reflexive verb's own sentence (stored as "se lever", "s'évader").
  const sentence = tenseSentence(reflexive ? { language, lemma: reflexiveLemma(language, verb) } : entry, tense)
  // Mastery counts the four tenses learned first; a percentage over all fourteen would stay near zero for months.
  const core = CORE_TENSES[language].filter((t) => available.includes(t))
  const advanced = available.filter((t) => !core.includes(t))
  const tried = (ts: readonly Tense[]) => ts.filter((t) => masteryLevel(lab.records[labKey(verb, t)]) !== 'new').length
  const mastery = verbMastery(lab, verb, core)
  const swipe = useTenseSwipe((dir) => {
    const next = stepTense(language, available, tense, dir)
    if (next) onTense(next)
    return !!next
  })
  const weak = useMemo(() => (reflexive || negative ? {} : weakPersons(lab, tense)), [lab, tense, reflexive, negative])
  if (!forms) return null
  return (
    <div className="stack lab-learn">
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
        {meaning && <span className="lab-gloss">{meaning}</span>}
        {!inList && !added && meaning && (
          <button type="button" className="chip chip-sm" onClick={addToList}>
            <PlusIcon size={14} /> <span className="lab-wide">Kelimelerime </span>ekle
          </button>
        )}
        {view === 'simple' && (
          <button type="button" className="chip chip-sm" aria-pressed={memorise} onClick={() => setMemorise((m) => !m)} title="Biçimleri gizler; dokundukça açılır (E)">
            Ezber
          </button>
        )}
        <Popover button={<MoreIcon size={18} />} buttonClassName="icon-btn lab-more" buttonProps={{ 'aria-label': 'Diğer seçenekler' }} label="Diğer seçenekler" kind="menu" align="end">
          {(close) => (
            <>
              {view === 'simple' && canSpeak() && (
                <MenuItem
                  icon={<SpeakerIcon size={16} />}
                  title="Altısını dinle"
                  hint="Biçimler zamirleriyle sırayla"
                  onSelect={() => {
                    close()
                    speak(sayAll(language, tense, forms), language)
                  }}
                />
              )}
              {(
                [
                  ['compare', 'Kıyasla', 'Üç zaman yan yana'],
                  ['detail', 'Detaylı', 'Bütün zamanlar, kiplere göre'],
                ] as const
              ).map(([id, title, hint]) => (
                <MenuItem
                  key={id}
                  icon={view === id ? <CheckIcon size={16} /> : <span className="lab-tick-gap" />}
                  title={title}
                  hint={hint}
                  onSelect={() => {
                    close()
                    setView(view === id ? 'simple' : id)
                    if (view !== id) recordVisit(`verbs:learn:${id}`)
                  }}
                />
              ))}
              <MenuItem icon={reflexive ? <CheckIcon size={16} /> : <span className="lab-tick-gap" />} title="Dönüşlü" hint="se laver / lavarse" onSelect={() => (setReflexive((r) => !r), close())} />
              <MenuItem icon={negative ? <CheckIcon size={16} /> : <span className="lab-tick-gap" />} title="Olumsuz" hint="ne… pas / no…" onSelect={() => (setNegative((n) => !n), close())} />
              <MenuItem
                icon={<span className="lab-tick-gap" />}
                title="Yazdır"
                hint="Tüm çekimi kâğıda ya da PDF'e"
                onSelect={() => {
                  close()
                  // A page of its own (the whole conjugation, not the screen as it is): printed or saved as a PDF.
                  if (!openPrint(verbSheetHtml({ language, verb, entry, meaning, available, reflexive, negative }))) showToast('Yazdırma penceresi engellendi: tarayıcıda açılır pencereye izin ver.', undefined, 5000, 'info')
                }}
              />
            </>
          )}
        </Popover>
      </div>

      {view !== 'simple' && (
        <button type="button" className="link lab-back" onClick={() => setView('simple')}>
          ← Basit görünüm
        </button>
      )}
      {view === 'compare' ? (
        <CompareTab language={language} verb={verb} available={available} />
      ) : view === 'simple' ? (
        <>
          {/* The table first: it is what the learner came for. */}
          {(reflexive || negative) && <p className="small muted lab-table-head">{[reflexive && 'Dönüşlü', negative && 'olumsuz'].filter(Boolean).join(', ')} biçim</p>}
          <div onTouchStart={swipe.start} onTouchEnd={swipe.end}>
            <FormTable
              language={language}
              tense={tense}
              forms={forms}
              irregular={odd}
              hide={memorise}
              weak={weak}
              turkish={turkish}
              found={reflexive || negative ? undefined : found}
              onMemorised={
                onMemorised && !reflexive && !negative
                  ? (results) => {
                      onMemorised(tense, results)
                      setMemo({ key: `${verb}|${tense}`, right: results.filter((r) => r.ok).length, total: results.length })
                    }
                  : undefined
              }
              key={`${verb}${tense}${reflexive}${negative}${memorise}${memoRound}`}
            />
          </div>
          {memorise && memo?.key === `${verb}|${tense}` && (
            <p className="small lab-memo-result" role="status">
              {memo.right}/{memo.total} bildin; ustalığa sayıldı.{' '}
              <button
                type="button"
                className="link"
                onClick={() => {
                  setMemo(null)
                  setMemoRound((r) => r + 1)
                }}
              >
                Yeniden kapat
              </button>
            </p>
          )}
          {swipe.hint && <p className="small muted lab-swipe-hint">Tabloyu sola ya da sağa kaydırarak zamanı değiştirebilirsin.</p>}
          {Object.keys(weak).length > 0 && <p className="small muted lab-weak-note">Turuncu çizgili kişiler bu zamanda en çok yanlış yaptıkların; onlara ayrıca dikkat et.</p>}
          {odd.some(Boolean) && (
            <p className="small muted">
              <mark className="conj-odd">Altı çizili</mark> biçimler kuralın dışında; bunlara ayrıca dikkat et.
            </p>
          )}

          {/* A real sentence right after the table: the forms in use, before any explanation. */}
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
          {/* One line about the verb: its pattern (a link to it), or regular/irregular, and its non-finite forms. */}
          {parts && (
            <p className="lab-parts small muted" lang={language}>
              {families.length > 0 ? (
                <span className="lab-families">
                  {families.map((f) => (
                    <button key={f} type="button" className="chip chip-sm" onClick={() => onFamily(f)} title={FAMILIES[f].rule}>
                      {FAMILIES[f].name}
                    </button>
                  ))}
                </span>
              ) : (
                <span className={parts.irregular ? 'lab-kind is-odd' : 'lab-kind'}>{parts.irregular ? 'Düzensiz' : 'Kurallı'}</span>
              )}
              <span>
                Mastar: <strong>{parts.infinitive}</strong>
              </span>
              {parts.gerund && (
                <span>
                  Ulaç: <strong>{parts.gerund}</strong>
                </span>
              )}
              {parts.participle && (
                <span>
                  Geçmiş ortaç: <strong>{parts.participle}</strong>
                </span>
              )}
            </p>
          )}

          <div className="lab-progress-line">
            <span className="small">
              <strong>%{mastery}</strong> <span className="muted">temel zamanlarda · {tried(core)}/{core.length} denendi{advanced.length > 0 && `, ileri ${tried(advanced)}/${advanced.length}`}</span>
            </span>
            <span className="lab-bar" role="progressbar" aria-label="Temel zamanlarda bu fiili ne kadar biliyorsun" title={core.map(tenseName).join(', ')} aria-valuemin={0} aria-valuemax={100} aria-valuenow={mastery}>
              <span style={{ width: `${mastery}%` }} />
            </span>
            <span className="row gap-2">
              <button type="button" className="btn btn-quiet btn-sm" onClick={onAddReview} disabled={inReview >= reviewable}>
                {inReview >= reviewable ? 'Tekrar listende' : inReview ? 'Hepsini tekrar listeme ekle' : 'Tekrar listeme ekle'}
              </button>
              <button type="button" className="btn btn-sm" onClick={onPractice}>
                <BookIcon size={16} /> Alıştır <kbd className="lab-kbd">A</kbd>
              </button>
            </span>
          </div>

          <p className="conj-lead">
            <strong>
              <span lang={language}>{guide.name}</span> · {guide.tr}.
            </strong>{' '}
            {guide.short}
          </p>
          <p className="lab-uses" lang={language}>
            <span className="small muted">Sık birlikte:</span>
            {guide.markers.map((m) => (
              <span key={m} className="pill">
                {m}
              </span>
            ))}
          </p>
          <TenseBridge key={tense} tense={tense} />
          <TwinTense language={language} verb={verb} tense={tense} />
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

const SWIPED_KEY = 'kelime-koc:lab-swiped'

/**
 * A sideways swipe over the table steps the tense (left: the next one, right: the one before), as
 * ←/→ do on a keyboard. Only clearly sideways and quick, so scrolling the page is left alone. On a
 * touch screen a line says so until the first swipe.
 */
function useTenseSwipe(step: (dir: 1 | -1) => boolean) {
  const from = useRef<{ x: number; y: number; at: number } | null>(null)
  const [hint, setHint] = useState(() => {
    try {
      return typeof matchMedia !== 'undefined' && matchMedia('(pointer: coarse)').matches && !localStorage.getItem(SWIPED_KEY)
    } catch {
      return false
    }
  })
  const start = (e: TouchEvent) => {
    const t = e.touches[0]
    from.current = e.touches.length === 1 && t ? { x: t.clientX, y: t.clientY, at: Date.now() } : null
  }
  const end = (e: TouchEvent) => {
    const f = from.current
    const t = e.changedTouches[0]
    from.current = null
    if (!f || !t) return
    const dx = t.clientX - f.x
    const dy = t.clientY - f.y
    if (Math.abs(dx) < 50 || Math.abs(dx) < 1.5 * Math.abs(dy) || Date.now() - f.at > 800) return
    if (step(dx < 0 ? 1 : -1) && hint) {
      setHint(false)
      try {
        localStorage.setItem(SWIPED_KEY, '1')
      } catch {
        // Storage off: the hint comes back next time.
      }
    }
  }
  return { start, end, hint }
}
