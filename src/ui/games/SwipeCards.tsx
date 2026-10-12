import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { displayForm } from '../../engine/exercises'
import { createRng } from '../../engine/rng'
import { dealCards, selectStudyWords, type Card } from '../../engine/studySet'
import { scheduler } from '../../data/instance'
import { CheckIcon, CloseIcon, SpeakerIcon } from '../icons'
import { prefs } from '../prefs'
import { StudyOptionsPanel } from '../StudyOptions'
import { useStudyOptions } from '../studyOptionsStore'
import { sfx } from '../sounds'
import { playWord } from '../speech'
import { type Props, recordPractice } from './shared'

/** How far a card must travel (px) to count as a decision. */
const SWIPE_COMMIT = 90

/**
 * Quick one-handed review (Drops/Tinder style): think of the meaning, tap to check, swipe right
 * for "knew it", left for "didn't". Missed cards come back once at the end of the round.
 */
export function SwipeCards({ language, vocabulary, states, onExit, onChanged }: Props & { onExit: () => void }) {
  const [options, setOptions] = useStudyOptions('flashcards')
  // How many words the choice has, to say on the start button (the round itself is dealt when it starts).
  const available = useMemo(() => selectStudyWords(vocabulary, states, scheduler, new Date(), { ...options, size: 0 }, createRng(1)).length, [vocabulary, states, options])
  const stateById = useMemo(() => new Map(states.map((s) => [s.entryId, s])), [states])
  const [deck, setDeck] = useState<Card[]>([])
  const [roundSize, setRoundSize] = useState(0)
  const [started, setStarted] = useState(false)
  const [flipped, setFlipped] = useState(false)
  const [dx, setDx] = useState(0)
  const [leaving, setLeaving] = useState<'left' | 'right' | null>(null)
  const [knew, setKnew] = useState<string[]>([])
  const [missed, setMissed] = useState<string[]>([])
  const drag = useRef<{ x: number; moved: boolean } | null>(null)
  const shownAt = useRef(0)
  const retried = useRef(new Set<string>())
  const current = deck[0]
  const card = current?.entry

  const start = () => {
    const rng = createRng(Date.now())
    const cards = dealCards(selectStudyWords(vocabulary, states, scheduler, new Date(), options, rng), options.direction, rng)
    setDeck(cards)
    setRoundSize(cards.length)
    setKnew([])
    setMissed([])
    retried.current = new Set()
    setStarted(true)
  }

  useEffect(() => {
    setFlipped(false)
    setDx(0)
    shownAt.current = performance.now()
    // Meaning first hides the word: saying it now would give it away.
    if (current && !current.reverse && prefs.autoPlay) playWord(current.entry)
  }, [current])

  const decide = useCallback(
    (ok: boolean) => {
      if (!card || leaving) return
      setLeaving(ok ? 'right' : 'left')
      if (ok) sfx.correct()
      else sfx.wrong()
      // Meaning first is recalling the word, word first is recognising the meaning.
      void recordPractice(card, stateById.get(card.id), current.reverse ? 'typed_translation' : 'mc_meaning', ok, performance.now() - shownAt.current)
      setTimeout(() => {
        setLeaving(null)
        if (ok) setKnew((k) => (k.includes(card.id) ? k : [...k, card.id]))
        else setMissed((m) => (m.includes(card.id) ? m : [...m, card.id]))
        setDeck((d) => {
          const rest = d.slice(1)
          // A missed card comes back once, after the others.
          if (!ok && !retried.current.has(card.id)) {
            retried.current.add(card.id)
            return [...rest, current]
          }
          return rest
        })
      }, 220)
    },
    [card, current, leaving, stateById],
  )

  useEffect(() => {
    if (!started || !card) return
    const onKey = (e: KeyboardEvent) => {
      if (e.code === 'Space') setFlipped((f) => !f)
      else if (e.key === 'ArrowRight') decide(true)
      else if (e.key === 'ArrowLeft') decide(false)
      else if (e.key === 'Escape') onExit()
      else return
      e.preventDefault()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [started, card, decide, onExit])

  useEffect(() => {
    if (started && !card) onChanged()
  }, [started, card, onChanged])

  if (!started) {
    return (
      <div className="stack">
        <button className="link" onClick={onExit}>← Oyunlar</button>
        <h1 className="greeting">Kaydırmalı kartlar</h1>
        <p className="greeting-sub">Kelimeyi gör, anlamını aklından geçir, karta dokunup kontrol et. Bildiysen sağa, bilmediysen sola kaydır. Bilmediklerin turun sonunda bir kez daha gelir.</p>
        <StudyOptionsPanel value={options} onChange={setOptions} language={language} vocabulary={vocabulary} states={states} />
        <button className="btn btn-lg" disabled={!available} onClick={start}>
          {available ? `${options.size > 0 ? Math.min(options.size, available) : available} kartla başla` : 'Bu grupta kelime yok'}
        </button>
        <p className="small muted kbd"><kbd>Boşluk</kbd> çevir · <kbd>→</kbd> biliyorum · <kbd>←</kbd> bilmiyorum</p>
      </div>
    )
  }

  if (!card) {
    const byId = new Map(vocabulary.map((v) => [v.id, v]))
    const still = missed.filter((id) => !knew.includes(id))
    return (
      <div className="stack">
        <h1 className="greeting">Tur bitti</h1>
        <p className="greeting-sub">
          {knew.length} kelimeyi bildin{missed.length ? `, ${missed.length} kelimede takıldın` : ', hiç takılmadın'}.
        </p>
        {still.length > 0 && (
          <section className="card stack">
            <strong>İkinci seferde de zorlananlar</strong>
            <ul className="swipe-missed">
              {still.map((id) => byId.get(id)).filter(Boolean).map((e) => (
                <li key={e!.id}>
                  <span lang={language}>{displayForm(e!)}</span> <span className="muted">{e!.senses[0].gloss}</span>
                </li>
              ))}
            </ul>
          </section>
        )}
        <div className="row">
          <button className="btn" onClick={start}>Bir tur daha</button>
          <button className="btn btn-quiet" onClick={onExit}>Oyunlara dön</button>
        </div>
      </div>
    )
  }

  const ex = card.senses[0].examples[0] ?? card.corpus?.find((x) => x.translation)
  const total = roundSize + retried.current.size
  const offset = leaving === 'right' ? 600 : leaving === 'left' ? -600 : dx
  return (
    <div className="stack swipe">
      <div className="row justify-between">
        <button className="link" onClick={onExit}>← Bitir</button>
        <span className="small muted">{total - deck.length + 1} / {total}</span>
      </div>
      <div className="swipe-stage">
        {deck[1] && <div className="swipe-card swipe-next" aria-hidden />}
        <div
          className={`swipe-card${flipped ? ' is-flipped' : ''}${drag.current ? '' : ' is-settling'}`}
          style={{ transform: `translateX(${offset}px) rotate(${offset / 18}deg)` }}
          role="button"
          tabIndex={0}
          aria-label={flipped ? 'Kartı çevir' : current.reverse ? 'Kelimeyi göster' : 'Anlamı göster'}
          onPointerDown={(e) => {
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
            const moved = drag.current?.moved
            drag.current = null
            if (Math.abs(dx) >= SWIPE_COMMIT) decide(dx > 0)
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
          <span className="swipe-stamp swipe-yes" style={{ opacity: Math.max(0, offset) / SWIPE_COMMIT }}>Biliyorum</span>
          <span className="swipe-stamp swipe-no" style={{ opacity: Math.max(0, -offset) / SWIPE_COMMIT }}>Bilmiyorum</span>
          {current.reverse ? <strong className="swipe-word">{card.senses[0].gloss}</strong> : <strong className="swipe-word" lang={language}>{displayForm(card)}</strong>}
          {flipped ? (
            <div className="swipe-back">
              {current.reverse ? <p className="swipe-gloss" lang={language}>{displayForm(card)}</p> : <p className="swipe-gloss">{card.senses[0].gloss}</p>}
              {ex && (
                <>
                  <p className="sentence-sm" lang={language}>{ex.text}</p>
                  {ex.translation && <p className="small muted">{ex.translation}</p>}
                </>
              )}
            </div>
          ) : (
            <p className="small muted">{current.reverse ? 'Kelimesi için dokun' : 'Anlamı için dokun'}</p>
          )}
        </div>
      </div>
      <div className="swipe-actions">
        <button className="btn btn-bad" onClick={() => decide(false)} aria-label="Bilmiyorum"><CloseIcon size={22} /></button>
        <button className="speak" onClick={() => playWord(card)} aria-label="Dinle"><SpeakerIcon size={22} /></button>
        <button className="btn btn-ok" onClick={() => decide(true)} aria-label="Biliyorum"><CheckIcon size={22} /></button>
      </div>
    </div>
  )
}
