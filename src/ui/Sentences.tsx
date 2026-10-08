import { useEffect, useMemo, useRef, useState } from 'react'
import { Rating } from 'ts-fsrs'
import { db, scheduler } from '../data/instance'
import { createRng } from '../engine/rng'
import { dueSentences, gradeSentence, newSentence, sentenceExercise, type SentenceCard, type SentenceExercise, type SentenceVerdict } from '../engine/sentences'
import type { TargetLanguage } from '../engine/types'
import { AccentBar, accentChange, insertAt } from './AccentBar'
import { PlusIcon, SpeakerIcon } from './icons'
import { LANGUAGE_NAME } from './labels'
import { sfx } from './sounds'
import { canSpeak, speak } from './speech'
import { undoable } from './toast'
import { EmptyState } from './EmptyState'
import { PageHeader } from './PageHeader'

/** Saves a sentence met while reading (or sent from the browser extension). */
export async function saveSentence(input: { language: TargetLanguage; text: string; translation?: string; focus?: string; source?: string }) {
  const all = await db.getSentences()
  const text = input.text.replace(/\s+/g, ' ').trim()
  if (!text || all.some((s) => s.language === input.language && s.text === text)) return false
  await db.saveSentence(newSentence({ ...input, text }, scheduler, new Date()))
  return true
}

/**
 * Sentence cards: the list (add, translate, delete) and a review of the due ones. Each review
 * rotates between filling the key word, writing it from dictation and translating it back.
 */
export function SentencesGame({ language, onExit }: { language: TargetLanguage; onExit: () => void }) {
  const [all, setAll] = useState<SentenceCard[] | null>(null)
  const [reviewing, setReviewing] = useState(false)
  const reload = () => void db.getSentences().then(setAll)
  useEffect(reload, [])

  if (!all) return null
  const mine = all.filter((s) => s.language === language)
  const due = dueSentences(all, language, new Date())

  if (reviewing) return <SentenceReview cards={due} onDone={() => (setReviewing(false), reload())} />

  return (
    <div className="stack">
      <button className="link" onClick={onExit}>
        ← Oyunlar
      </button>
      <PageHeader title="Cümle kartları" sub="Kaydettiğin cümleleri bütün olarak tekrar et: boşluk doldurma, dikte ve çeviri." />
      <div className="row">
        <button className="btn btn-lg" disabled={!due.length} onClick={() => setReviewing(true)}>
          {due.length ? `${due.length} cümle tekrar bekliyor` : 'Şu an tekrar bekleyen cümle yok'}
        </button>
      </div>
      <AddSentence language={language} onAdded={reload} />
      {mine.length > 0 && (
        <section className="section stack">
          <h2 className="section-title">Cümlelerin ({mine.length})</h2>
          <ul className="sentence-list">
            {mine.map((s) => (
              <SentenceRow key={s.id} sentence={s} onChanged={reload} />
            ))}
          </ul>
        </section>
      )}
      {!mine.length && (
        <EmptyState
          art="sentences"
          title="Henüz cümle yok"
          action={
            <button className="btn btn-quiet" onClick={() => document.querySelector<HTMLTextAreaElement>('textarea[aria-label="Cümle"]')?.focus()}>
              <PlusIcon size={18} /> Cümle ekle
            </button>
          }
        >
          Okurken bir kelimeye dokunup “Cümleyi kaydet” de ya da aşağıya bir cümle yapıştır. Cümleler bütün olarak, takvimli tekrar edilir.
        </EmptyState>
      )}
    </div>
  )
}

function AddSentence({ language, onAdded }: { language: TargetLanguage; onAdded: () => void }) {
  const [text, setText] = useState('')
  const [translation, setTranslation] = useState('')
  const [note, setNote] = useState('')
  return (
    <details className="card">
      <summary>Cümle ekle</summary>
      <form
        className="stack"
        onSubmit={async (e) => {
          e.preventDefault()
          const ok = await saveSentence({ language, text, translation })
          setNote(ok ? 'Eklendi.' : 'Bu cümle zaten var.')
          if (ok) {
            setText('')
            setTranslation('')
            onAdded()
          }
        }}
      >
        <textarea className="textarea textarea-sm" lang={language} value={text} onChange={(e) => setText(e.target.value)} placeholder={`${LANGUAGE_NAME[language]} bir cümle`} aria-label="Cümle" />
        <input className="input" value={translation} onChange={(e) => setTranslation(e.target.value)} placeholder="Türkçesi (isteğe bağlı: çeviri alıştırmasını açar)" aria-label="Türkçesi" />
        <div className="row">
          <button className="btn" type="submit" disabled={!text.trim()}>
            Ekle
          </button>
          {note && <span className="small notice">{note}</span>}
        </div>
      </form>
    </details>
  )
}

function SentenceRow({ sentence, onChanged }: { sentence: SentenceCard; onChanged: () => void }) {
  const [editing, setEditing] = useState(false)
  const [translation, setTranslation] = useState(sentence.translation)
  const due = new Date(sentence.card.due)
  return (
    <li>
      <p className="sentence-sm" lang={sentence.language}>
        {sentence.text}
      </p>
      {editing ? (
        <form
          className="row"
          onSubmit={async (e) => {
            e.preventDefault()
            await db.saveSentence({ ...sentence, translation: translation.trim() })
            setEditing(false)
            onChanged()
          }}
        >
          <input className="input sentence-trans-input" value={translation} onChange={(e) => setTranslation(e.target.value)} placeholder="Türkçesi" autoFocus aria-label="Türkçesi" />
          <button className="btn btn-sm" type="submit">
            Kaydet
          </button>
        </form>
      ) : (
        <p className="small muted">
          {sentence.translation || 'Çevirisi yok'} ·{' '}
          <button className="link small" onClick={() => setEditing(true)}>
            {sentence.translation ? 'Düzenle' : 'Çeviri ekle'}
          </button>{' '}
          · {sentence.card.reps ? `sıradaki tekrar ${due.toLocaleDateString('tr-TR')}` : 'henüz çalışılmadı'} ·{' '}
          <button
            className="link small"
            onClick={async () => {
              await db.deleteSentence(sentence.id)
              onChanged()
              undoable('Cümle silindi', async () => {
                await db.restoreSentence(sentence)
                onChanged()
              })
            }}
          >
            Sil
          </button>
        </p>
      )}
    </li>
  )
}

const RATING: Record<SentenceVerdict, Rating.Again | Rating.Hard | Rating.Good> = { correct: Rating.Good, near: Rating.Hard, wrong: Rating.Again }

function SentenceReview({ cards, onDone }: { cards: SentenceCard[]; onDone: () => void }) {
  const rng = useRef(createRng(Date.now()))
  const [index, setIndex] = useState(0)
  const [text, setText] = useState('')
  const [verdict, setVerdict] = useState<SentenceVerdict | null>(null)
  const [right, setRight] = useState(0)
  const input = useRef<HTMLInputElement>(null)
  const card = cards[index]
  const ex: SentenceExercise | null = useMemo(() => (card ? sentenceExercise(card, rng.current, canSpeak()) : null), [card])

  useEffect(() => {
    setText('')
    setVerdict(null)
    if (ex?.kind === 'dictation' && card) speak(card.text, card.language)
  }, [ex, card])

  if (!card || !ex) {
    return (
      <div className="stack">
        <h1 className="greeting">Bitti</h1>
        <p className="greeting-sub">
          {cards.length} cümleden {right} tanesini doğru yaptın.
        </p>
        <div>
          <button className="btn" onClick={onDone}>
            Cümlelere dön
          </button>
        </div>
      </div>
    )
  }

  const save = async (v: SentenceVerdict) => {
    await db.saveSentence({ ...card, card: scheduler.review(card.card, RATING[v], new Date()) })
    if (v === 'correct') setRight((r) => r + 1)
    setIndex((i) => i + 1)
  }

  const check = () => {
    if (verdict || !text.trim()) return
    const v = gradeSentence(ex, text)
    setVerdict(v)
    if (v === 'correct') sfx.correct()
    else if (v === 'near') sfx.near()
    else sfx.wrong()
  }

  return (
    <div className="stack sentence-review">
      <div className="row justify-between">
        <button className="link" onClick={onDone}>
          ← Bitir
        </button>
        <span className="small muted">
          {index + 1} / {cards.length}
        </span>
      </div>
      {ex.kind === 'cloze' && (
        <>
          <p className="muted">Boşluğa gelen kelimeyi yaz</p>
          <p className="sentence" lang={card.language}>
            {ex.shown}
          </p>
          {card.translation && <p className="small muted">{card.translation}</p>}
        </>
      )}
      {ex.kind === 'dictation' && (
        <div className="row">
          <p className="muted">Duyduğun cümleyi yaz</p>
          <button className="speak speak-big" onClick={() => speak(card.text, card.language)} aria-label="Tekrar dinle">
            <SpeakerIcon size={32} />
          </button>
          <button className="link small" onClick={() => speak(card.text, card.language, 0.7)}>
            Yavaş
          </button>
        </div>
      )}
      {ex.kind === 'translate' && (
        <>
          <p className="muted">{LANGUAGE_NAME[card.language]} yaz</p>
          <p className="prompt-text">{ex.prompt}</p>
        </>
      )}
      <form
        onSubmit={(e) => {
          e.preventDefault()
          check()
        }}
      >
        <input
          ref={input}
          className="answer-input"
          lang={card.language}
          value={text}
          onChange={accentChange(card.language, setText)}
          disabled={!!verdict}
          autoFocus
          autoComplete="off"
          autoCapitalize="off"
          autoCorrect="off"
          spellCheck={false}
          enterKeyHint="done"
          placeholder="Cevabını yaz"
        />
        {!verdict && <AccentBar language={card.language} onInsert={(ch) => input.current && setText(insertAt(input.current, ch))} />}
      </form>
      {!verdict ? (
        <div className="row">
          <button className="btn" onClick={check} disabled={!text.trim()}>
            Kontrol et
          </button>
          <button className="link small" onClick={() => setVerdict('wrong')}>
            Bilmiyorum
          </button>
        </div>
      ) : (
        <section className={`card stack sentence-result is-${verdict}`}>
          <strong>{verdict === 'correct' ? 'Doğru!' : verdict === 'near' ? 'Neredeyse' : 'Doğrusu'}</strong>
          <p className="sentence-sm" lang={card.language}>
            {card.text}
          </p>
          <div className="row">
            {ex.kind === 'translate' && verdict !== 'correct' ? (
              <>
                <span className="small muted">Çevirinin başka doğru biçimleri olabilir; sen karar ver:</span>
                <button className="btn btn-sm btn-ok" onClick={() => save('correct')}>
                  Doğru sayılır
                </button>
                <button className="btn btn-sm btn-bad" onClick={() => save('wrong')}>
                  Yanlıştı
                </button>
              </>
            ) : (
              <button className="btn" onClick={() => save(verdict)} autoFocus>
                Devam
              </button>
            )}
          </div>
        </section>
      )}
    </div>
  )
}
