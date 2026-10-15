import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from 'react'
import { isDifficult, withDifficult } from '../../engine/difficult'
import { buildExercise, displayForm, evaluateTyped } from '../../engine/exercises'
import { requeue, type FlashGrade } from '../../engine/flashQueue'
import { createRng } from '../../engine/rng'
import { dealCards, SCOPE_NAME, selectStudyWords, type Card } from '../../engine/studySet'
import type { VocabularyEntry } from '../../engine/types'
import { db, scheduler } from '../../data/instance'
import { AccentBar } from '../AccentBar'
import { accentChange, insertAt } from '../accentCaret'
import { GameIcon } from '../GameIcon'
import { SpeakerIcon, StarIcon } from '../icons'
import { PosTag } from '../PosTag'
import { prefs } from '../prefs'
import { RichText } from '../RichText'
import { StudyOptionsPanel } from '../StudyOptions'
import { useStudyOptions } from '../studyOptionsStore'
import { sfx } from '../sounds'
import { playWord } from '../speech'
import { useMediaUrl } from '../useMedia'
import { type Props, recordPractice } from './shared'

/** How far a card must travel (px) to count as a decision. */
const SWIPE_COMMIT = 90
/** Flip the card and grade yourself, or type the word and let the app grade it. */
type Mode = 'flip' | 'write'
const MODE_KEY = 'diloloji:flash-mode'
const readMode = (): Mode => {
  try {
    return localStorage.getItem(MODE_KEY) === 'write' ? 'write' : 'flip'
  } catch {
    return 'flip'
  }
}

const GRADES: { grade: FlashGrade; label: string; className: string; hint: string }[] = [
  { grade: 0, label: 'Bilmiyorum', className: 'btn-bad', hint: 'Birkaç kart sonra yine gelir' },
  { grade: 1, label: 'Zorlandım', className: 'btn-near', hint: 'Bir kez daha gelir' },
  { grade: 2, label: 'Biliyorum', className: 'btn-ok', hint: 'Turdan çıkar' },
]

/**
 * Flashcards, the best of three: Quizlet's sets and "still learning / know" counts, Anki's own grade
 * after the card turns (didn't know, hard, knew it: 1 2 3), Memrise's loop (a card not known comes back a
 * few cards later until it is). Or, written: the meaning shows, the word is typed and checked. Swiping
 * still works: right "knew it", left "didn't".
 */
export function SwipeCards({ language, vocabulary, states, onExit, onChanged }: Props & { onExit: () => void }) {
  const [options, setOptions] = useStudyOptions('flashcards')
  const [mode, setModeState] = useState<Mode>(readMode)
  const setMode = (m: Mode) => {
    setModeState(m)
    try {
      localStorage.setItem(MODE_KEY, m)
    } catch {
      // The choice simply isn't remembered.
    }
  }
  // How many words the choice has, to say on the start button (the round itself is dealt when it starts).
  const available = useMemo(() => selectStudyWords(vocabulary, states, scheduler, new Date(), { ...options, size: 0 }, createRng(1)).length, [vocabulary, states, options])
  const stateById = useMemo(() => new Map(states.map((s) => [s.entryId, s])), [states])
  const byId = useMemo(() => new Map(vocabulary.map((v) => [v.id, v])), [vocabulary])
  const [deck, setDeck] = useState<Card[]>([])
  const [roundIds, setRoundIds] = useState<string[]>([])
  const [started, setStarted] = useState(false)
  const [flipped, setFlipped] = useState(false)
  const [dx, setDx] = useState(0)
  const [leaving, setLeaving] = useState<'left' | 'right' | null>(null)
  /** Every grade given in this round, by word, in order. */
  const [grades, setGrades] = useState<Record<string, FlashGrade[]>>({})
  const [typed, setTyped] = useState('')
  const [checked, setChecked] = useState<{ grade: FlashGrade; expected: string } | null>(null)
  const [starred, setStarred] = useState<ReadonlySet<string>>(() => new Set(vocabulary.filter(isDifficult).map((v) => v.id)))
  const returns = useRef(new Map<string, number>())
  const drag = useRef<{ x: number; moved: boolean } | null>(null)
  const shownAt = useRef(0)
  const input = useRef<HTMLInputElement>(null)
  const current = deck[0]
  const card = current?.entry
  const picture = useMediaUrl(card?.imageId)
  // Written: the meaning shows and the word is typed, whatever the side chosen.
  const reverse = mode === 'write' || !!current?.reverse
  const ex = useMemo(() => (mode === 'write' && card ? buildExercise('typed_translation', card, vocabulary, createRng(card.id.length)) : null), [mode, card, vocabulary])

  const begin = (cards: Card[]) => {
    setDeck(cards)
    setRoundIds([...new Set(cards.map((c) => c.entry.id))])
    setGrades({})
    returns.current = new Map()
    setStarted(true)
  }
  const start = () => {
    const rng = createRng(Date.now())
    begin(dealCards(selectStudyWords(vocabulary, states, scheduler, new Date(), options, rng), options.direction, rng))
  }
  /** Just the given words again (the ones not known at once). */
  const studyAgain = (ids: string[]) => {
    const rng = createRng(Date.now())
    begin(dealCards(ids.map((id) => byId.get(id)).filter((e): e is VocabularyEntry => !!e), options.direction, rng))
  }

  useEffect(() => {
    setFlipped(false)
    setDx(0)
    setTyped('')
    setChecked(null)
    shownAt.current = performance.now()
    // Meaning first hides the word: saying it now would give it away.
    if (current && !reverse && prefs.autoPlay) playWord(current.entry)
    if (current && mode === 'write') requestAnimationFrame(() => input.current?.focus())
  }, [current]) // eslint-disable-line react-hooks/exhaustive-deps

  const grade = useCallback(
    (g: FlashGrade, sound = true) => {
      if (!card || leaving) return
      setLeaving(g === 0 ? 'left' : 'right')
      if (sound) (g === 0 ? sfx.wrong : g === 1 ? sfx.near : sfx.correct)()
      // Meaning first (or typed) is recalling the word, word first is recognising the meaning; "hard" is a right answer given unsure.
      void recordPractice(card, stateById.get(card.id), reverse ? 'typed_translation' : 'mc_meaning', g > 0, performance.now() - shownAt.current, {
        ...(checked ? { given: typed, expected: checked.expected } : {}),
        ...(g === 1 ? { confidence: 'unsure' as const } : {}),
      })
      setTimeout(() => {
        setLeaving(null)
        setGrades((gs) => ({ ...gs, [card.id]: [...(gs[card.id] ?? []), g] }))
        const back = returns.current.get(card.id) ?? 0
        setDeck((d) => {
          const next = requeue(d, g, back)
          if (next.length === d.length) returns.current.set(card.id, back + 1)
          return next
        })
      }, 220)
    },
    [card, leaving, stateById, reverse, checked, typed],
  )

  /** Written: the typed word checked like any typed answer (a slip of an accent is "hard", not wrong). */
  const check = () => {
    if (!card || !ex || ex.kind !== 'typed' || !typed.trim() || checked) return
    const ev = evaluateTyped(ex, typed, card, vocabulary)
    const g: FlashGrade = ev.verdict === 'correct' ? 2 : ev.verdict === 'near' ? 1 : 0
    ;(g === 0 ? sfx.wrong : g === 1 ? sfx.near : sfx.correct)()
    setChecked({ grade: g, expected: ex.accepted[0] ?? displayForm(card) })
    setFlipped(true)
  }

  const toggleStar = async () => {
    if (!card) return
    const on = !starred.has(card.id)
    const fresh = (await db.vocabulary.get(card.id)) ?? card
    await db.vocabulary.put(withDifficult(fresh, on))
    setStarred((s) => {
      const n = new Set(s)
      if (on) n.add(card.id)
      else n.delete(card.id)
      return n
    })
  }

  useEffect(() => {
    if (!started || !card) return
    const onKey = (e: KeyboardEvent) => {
      const typing = e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement
      if (e.key === 'Escape') onExit()
      else if (typing) return
      else if (mode === 'write') {
        if (e.key === 'Enter' && checked) grade(checked.grade, false)
        else return
      } else if (e.code === 'Space') setFlipped((f) => !f)
      else if (e.key === 'ArrowRight') grade(2)
      else if (e.key === 'ArrowLeft') grade(0)
      else if (flipped && ['1', '2', '3'].includes(e.key)) grade((Number(e.key) - 1) as FlashGrade)
      else if (e.key.toLowerCase() === 's') void toggleStar()
      else return
      e.preventDefault()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  useEffect(() => {
    if (started && !card) onChanged()
  }, [started, card, onChanged])

  if (!started) {
    const count = available ? (options.size > 0 ? Math.min(options.size, available) : available) : 0
    return (
      <div className="stack flash-setup">
        <button className="link" onClick={onExit}>
          ← Oyunlar
        </button>
        <header className="flash-hero">
          <GameIcon id="swipe" emoji="👆" size={64} />
          <div>
            <h1 className="greeting">Kaydırmalı kartlar</h1>
            <p className="greeting-sub">Bilmediğin kart birkaç kart sonra yine gelir, bilene kadar. Bildiklerin turdan çıkar.</p>
          </div>
        </header>
        <div className="flash-modes" role="radiogroup" aria-label="Nasıl çalışalım?">
          <button type="button" role="radio" aria-checked={mode === 'flip'} className="flash-mode" onClick={() => setMode('flip')}>
            <strong>Çevirerek</strong>
            <span className="small muted">Kartı çevir, kendin notla: Bilmiyorum · Zorlandım · Biliyorum</span>
          </button>
          <button type="button" role="radio" aria-checked={mode === 'write'} className="flash-mode" onClick={() => setMode('write')}>
            <strong>Yazarak</strong>
            <span className="small muted">Anlamı gör, kelimeyi yaz; uygulama kontrol eder</span>
          </button>
        </div>
        <section className="card">
          <StudyOptionsPanel value={options} onChange={setOptions} language={language} vocabulary={vocabulary} states={states} directions={mode === 'flip'} />
        </section>
        <div className="flash-go">
          <button className="btn btn-lg" disabled={!available} onClick={start}>
            {available ? `${count} kartla başla` : 'Bu grupta kelime yok'}
          </button>
          {available > 0 && <span className="small muted">{SCOPE_NAME[options.scope]}</span>}
        </div>
        <p className="small muted kbd">
          {mode === 'flip' ? (
            <>
              <kbd>Boşluk</kbd> çevir · <kbd>1</kbd> <kbd>2</kbd> <kbd>3</kbd> notla · <kbd>←</kbd> <kbd>→</kbd> kaydır · <kbd>S</kbd> zor işaretle
            </>
          ) : (
            <>
              <kbd>Enter</kbd> kontrol et, sonra devam
            </>
          )}
        </p>
      </div>
    )
  }

  if (!card) {
    const total = roundIds.length
    const firstTry = roundIds.filter((id) => grades[id]?.[0] === 2).length
    const stumbled = roundIds.filter((id) => (grades[id] ?? []).some((g) => g < 2))
    const percent = total ? Math.round((firstTry / total) * 100) : 0
    return (
      <div className="stack flash-done">
        <h1 className="greeting">Tur bitti</h1>
        <div className="flash-result card">
          <span className="flash-ring" style={{ '--p': `${percent}%` } as CSSProperties} role="img" aria-label={`İlk seferde %${percent}`}>
            <b>%{percent}</b>
          </span>
          <div className="stack gap-1">
            <strong>
              {total} kartın {firstTry} tanesini ilk seferde bildin
            </strong>
            <span className="small muted">{stumbled.length ? `${stumbled.length} kartta takıldın; hepsi tur bitmeden en az bir kez bilindi ya da sona kaldı.` : 'Hiç takılmadın.'}</span>
          </div>
        </div>
        {stumbled.length > 0 && (
          <section className="card stack">
            <strong>Takıldıkların</strong>
            <ul className="swipe-missed">
              {stumbled
                .map((id) => byId.get(id))
                .filter((e): e is VocabularyEntry => !!e)
                .map((e) => (
                  <li key={e.id}>
                    <span lang={language}>{displayForm(e)}</span> <span className="muted">{e.senses[0]?.gloss}</span>
                  </li>
                ))}
            </ul>
          </section>
        )}
        <div className="row">
          {stumbled.length > 0 && (
            <button className="btn" onClick={() => studyAgain(stumbled)}>
              Takıldıklarını çalış ({stumbled.length})
            </button>
          )}
          <button className={stumbled.length ? 'btn btn-quiet' : 'btn'} onClick={start}>
            Bir tur daha
          </button>
          <button className="btn btn-quiet" onClick={onExit}>
            Oyunlara dön
          </button>
        </div>
      </div>
    )
  }

  const known = roundIds.filter((id) => (grades[id]?.at(-1) ?? -1) >= 1).length
  const learning = roundIds.filter((id) => grades[id]?.at(-1) === 0).length
  const offset = leaving === 'right' ? 600 : leaving === 'left' ? -600 : dx
  const ex0 = card.senses[0]?.examples[0] ?? card.corpus?.find((x) => x.translation)
  const front = reverse ? card.senses[0]?.gloss : displayForm(card)
  const back = reverse ? displayForm(card) : card.senses[0]?.gloss
  return (
    <div className="stack swipe flash-play">
      <div className="flash-top">
        <button className="link" onClick={onExit}>
          ← Bitir
        </button>
        <span className="flash-counts" aria-live="polite">
          <span className="flash-count flash-learning">Öğreniliyor {learning}</span>
          <span className="flash-count flash-known">Biliniyor {known}</span>
          <span className="flash-count">Kalan {deck.length}</span>
        </span>
      </div>
      <div className="bar-track swipe-progress" role="progressbar" aria-label="Bilinen kartlar" aria-valuemin={0} aria-valuemax={roundIds.length} aria-valuenow={known}>
        <div className="bar-fill" style={{ width: `${(known / Math.max(1, roundIds.length)) * 100}%` }} />
      </div>
      <div className="flash-stage">
        {deck[1] && <div className="flash-card flash-next" aria-hidden />}
        <div
          className={`flash-card${drag.current ? '' : ' flash-settling'}`}
          style={{ transform: `translateX(${offset}px) rotate(${offset / 18}deg)` }}
          role="button"
          tabIndex={0}
          aria-label={mode === 'write' ? 'Kart' : flipped ? 'Kartı çevir' : reverse ? 'Kelimeyi göster' : 'Anlamı göster'}
          onPointerDown={(e) => {
            if (mode === 'write') return
            drag.current = { x: e.clientX, moved: false }
            e.currentTarget.setPointerCapture(e.pointerId)
          }}
          onPointerMove={(e) => {
            if (!drag.current) return
            const d = e.clientX - drag.current.x
            if (Math.abs(d) > 6) drag.current.moved = true
            setDx(d)
          }}
          onPointerUp={() => {
            if (!drag.current) return
            const moved = drag.current.moved
            drag.current = null
            if (Math.abs(dx) >= SWIPE_COMMIT) grade(dx > 0 ? 2 : 0)
            else {
              setDx(0)
              if (!moved) setFlipped((f) => !f)
            }
          }}
          onPointerCancel={() => {
            drag.current = null
            setDx(0)
          }}
        >
          <span className="swipe-stamp swipe-yes" style={{ opacity: Math.max(0, offset) / SWIPE_COMMIT }}>
            Biliyorum
          </span>
          <span className="swipe-stamp swipe-no" style={{ opacity: Math.max(0, -offset) / SWIPE_COMMIT }}>
            Bilmiyorum
          </span>
          <div className={`flash-inner${flipped ? ' flash-flipped' : ''}`}>
            <div className="flash-face flash-front" aria-hidden={flipped}>
              <div className="flash-tools" onPointerDown={(e) => e.stopPropagation()} onPointerUp={(e) => e.stopPropagation()}>
                {!reverse ? (
                  <button type="button" className="icon-btn" onClick={() => playWord(card)} aria-label="Dinle">
                    <SpeakerIcon size={20} />
                  </button>
                ) : (
                  <span />
                )}
                <button type="button" className={`icon-btn flash-star${starred.has(card.id) ? ' flash-star-on' : ''}`} onClick={() => void toggleStar()} aria-pressed={starred.has(card.id)} aria-label="Zor diye işaretle">
                  <StarIcon size={20} solid={starred.has(card.id)} />
                </button>
              </div>
              {picture && !reverse && <img className="flash-picture" src={picture} alt="" draggable={false} />}
              <strong className="swipe-word flash-word" lang={reverse ? 'tr' : language}>
                {front}
              </strong>
              {!reverse && (
                <span className="flash-meta">
                  <PosTag pos={card.partOfSpeech} label />
                  {card.ipa && <span className="ipa">{card.ipa}</span>}
                </span>
              )}
              {mode === 'flip' && <span className="swipe-hint">{reverse ? 'Kelimesi için dokun' : 'Anlamı için dokun'}</span>}
            </div>
            <div className="flash-face flash-back" aria-hidden={!flipped}>
              {checked && (
                <p className={`flash-verdict flash-g${checked.grade}`}>
                  {checked.grade === 2 ? 'Doğru' : checked.grade === 1 ? 'Neredeyse: küçük bir yazım farkı' : `Senin cevabın: ${typed}`}
                </p>
              )}
              <span className="flash-back-front" lang={reverse ? 'tr' : language}>
                {front}
              </span>
              <p className="swipe-gloss flash-word" lang={reverse ? language : 'tr'}>
                {back}
              </p>
              {picture && reverse && <img className="flash-picture" src={picture} alt="" draggable={false} />}
              {ex0 && (
                <div className="flash-example">
                  <p className="sentence-sm" lang={language}>
                    {ex0.text}
                  </p>
                  {ex0.translation && <p className="small muted">{ex0.translation}</p>}
                </div>
              )}
              {card.notes && (
                <p className="small">
                  <RichText text={card.notes} />
                </p>
              )}
              {card.extras?.map((x, i) => (
                <p key={i} className="small">
                  <strong>{x.label}:</strong> <RichText text={x.text} />
                </p>
              ))}
            </div>
          </div>
        </div>
      </div>
      {mode === 'write' ? (
        checked ? (
          <div className="flash-grades flash-after">
            {checked.grade < 2 && (
              <button type="button" className="btn btn-quiet" onClick={() => grade(2, false)}>
                Aslında doğruydu
              </button>
            )}
            <button type="button" className="btn btn-lg" onClick={() => grade(checked.grade, false)} autoFocus>
              Devam
            </button>
          </div>
        ) : (
          <form
            className="stack gap-2 flash-write"
            onSubmit={(e) => {
              e.preventDefault()
              check()
            }}
          >
            <input
              ref={input}
              className="input answer-input"
              lang={language}
              value={typed}
              onChange={accentChange(language, setTyped)}
              autoComplete="off"
              autoCapitalize="off"
              autoCorrect="off"
              spellCheck={false}
              aria-label="Kelimeyi yaz"
              placeholder="Kelimeyi yaz"
            />
            <AccentBar language={language} onInsert={(ch) => input.current && setTyped(insertAt(input.current, ch))} />
            <div className="row">
              <button type="submit" className="btn" disabled={!typed.trim()}>
                Kontrol et
              </button>
              <button type="button" className="link" onClick={() => grade(0)}>
                Bilmiyorum
              </button>
            </div>
          </form>
        )
      ) : flipped ? (
        <div className="flash-grades" role="group" aria-label="Ne kadar bildin?">
          {GRADES.map((g) => (
            <button key={g.grade} type="button" className={`btn flash-grade ${g.className}`} onClick={() => grade(g.grade)} title={g.hint}>
              <kbd aria-hidden>{g.grade + 1}</kbd> {g.label}
            </button>
          ))}
        </div>
      ) : (
        <div className="flash-grades">
          <button type="button" className="btn btn-lg flash-turn" onClick={() => setFlipped(true)}>
            Çevir <kbd aria-hidden>Boşluk</kbd>
          </button>
        </div>
      )}
    </div>
  )
}
