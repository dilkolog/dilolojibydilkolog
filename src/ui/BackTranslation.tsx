import { useEffect, useRef, useState } from 'react'
import { Rating } from 'ts-fsrs'
import { db, scheduler } from '../data/instance'
import { loadBackItems } from '../data/backItems'
import { BACK_ROUND, type BackItem } from '../engine/backTranslation'
import { gradeSentence, newSentence, type SentenceVerdict } from '../engine/sentences'
import type { TargetLanguage } from '../engine/types'
import { wordDiff } from '../engine/wordDiff'
import { AccentBar, accentChange, insertAt } from './AccentBar'
import { SpeakerIcon } from './icons'
import { LANGUAGE_NAME } from './labels'
import { PageHeader } from './PageHeader'
import { sfx } from './sounds'
import { canSpeak, speak } from './speech'

const RATING: Record<SentenceVerdict, Rating.Again | Rating.Hard | Rating.Good> = { correct: Rating.Good, near: Rating.Hard, wrong: Rating.Again }

/**
 * Back-translation: sentences translated while reading (or on the translation screen) come back
 * as their Turkish, to be written in the language learned. Producing the sentence yourself, then
 * seeing word by word where it differs, teaches more than reading it again. Each sentence tried
 * becomes a sentence card with that first grade, so it returns on the review schedule.
 */
export function BackTranslation({ language, onExit }: { language: TargetLanguage; onExit: () => void }) {
  const [items, setItems] = useState<BackItem[] | null>(null)
  const [index, setIndex] = useState(0)
  const [text, setText] = useState('')
  const [verdict, setVerdict] = useState<SentenceVerdict | null>(null)
  const [right, setRight] = useState(0)
  const [left, setLeft] = useState(0)
  const input = useRef<HTMLInputElement>(null)
  const name = LANGUAGE_NAME[language]

  const load = () =>
    void loadBackItems(language).then((all) => {
      setItems(all.slice(0, BACK_ROUND))
      setLeft(Math.max(0, all.length - BACK_ROUND))
      setIndex(0)
      setRight(0)
    })
  useEffect(load, [language]) // eslint-disable-line react-hooks/exhaustive-deps

  const item = items?.[index]
  useEffect(() => {
    setText('')
    setVerdict(null)
  }, [item])

  const back = (
    <button className="link" onClick={onExit}>
      ← Oyunlar
    </button>
  )
  if (!items) return null
  if (!items.length)
    return (
      <div className="stack">
        {back}
        <PageHeader title="Geri çeviri" sub={`Çevirdiğin cümlelerin Türkçesini görür, ${name} kendin yazarsın.`} />
        <p className="note">
          Henüz çevrilmiş cümlen yok. Okurken bir kelimeye dokunup “Cümlenin Türkçesi”ne bas ya da Çeviri ekranını kullan: çevirdiğin cümleler burada seni bekler.
        </p>
      </div>
    )

  if (!item)
    return (
      <div className="stack">
        <h1 className="greeting">Bitti</h1>
        <p className="greeting-sub">
          {items.length} cümleden {right} tanesini doğru yazdın. Hepsi cümle kartı oldu; tekrar zamanı gelince Cümle kartları’nda karşına çıkar.
        </p>
        <div className="row">
          {left > 0 && (
            <button className="btn" onClick={load}>
              Bir tur daha ({left} cümle kaldı)
            </button>
          )}
          <button className={left > 0 ? 'btn btn-quiet' : 'btn'} onClick={onExit}>
            Oyunlara dön
          </button>
        </div>
      </div>
    )

  const check = () => {
    if (verdict || !text.trim()) return
    const v = gradeSentence({ kind: 'translate', prompt: item.turkish, answer: item.text }, text)
    setVerdict(v)
    if (v === 'correct') sfx.correct()
    else if (v === 'near') sfx.near()
    else sfx.wrong()
  }
  const save = async (v: SentenceVerdict) => {
    const now = new Date()
    const card = newSentence({ language, text: item.text, translation: item.turkish, source: 'Geri çeviri' }, scheduler, now)
    await db.saveSentence({ ...card, card: scheduler.review(card.card, RATING[v], now) })
    if (v === 'correct') setRight((r) => r + 1)
    setIndex((i) => i + 1)
  }

  return (
    <div className="stack sentence-review">
      <div className="row justify-between">
        <button className="link" onClick={onExit}>
          ← Bitir
        </button>
        <span className="small muted">
          {index + 1} / {items.length}
        </span>
      </div>
      <p className="muted">{name} yaz</p>
      <p className="prompt-text" lang="tr">
        {item.turkish}
      </p>
      <form
        onSubmit={(e) => {
          e.preventDefault()
          check()
        }}
      >
        <input
          ref={input}
          className="answer-input"
          lang={language}
          value={text}
          onChange={accentChange(language, setText)}
          disabled={!!verdict}
          autoFocus
          autoComplete="off"
          autoCapitalize="off"
          autoCorrect="off"
          spellCheck={false}
          enterKeyHint="done"
          placeholder="Cümleyi yaz"
          aria-label="Cevabın"
        />
        {!verdict && <AccentBar language={language} onInsert={(ch) => input.current && setText(insertAt(input.current, ch))} />}
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
          <strong>{verdict === 'correct' ? 'Doğru!' : 'Örnek çeviri'}</strong>
          <p className="dictation-diff" lang={language}>
            {(text.trim() ? wordDiff(text, item.text) : item.text.split(' ').map((w) => ({ word: w, status: 'missed' as const }))).map((p, i) => (
              <span key={i} className={`dd-${p.status}`}>
                {p.word}{' '}
              </span>
            ))}
            {canSpeak() && (
              <button type="button" className="icon-btn icon-btn-sm" aria-label="Dinle" onClick={() => speak(item.text, language)}>
                <SpeakerIcon size={15} />
              </button>
            )}
          </p>
          {verdict === 'correct' ? (
            <div className="row">
              <button className="btn" onClick={() => save('correct')} autoFocus>
                Devam
              </button>
            </div>
          ) : (
            <>
              <p className="small muted">Kırmızılar örnekte olup senin yazmadıkların, üstü çizililer fazlalar. Aynı anlamı başka sözcüklerle de kurmuş olabilirsin; sen karar ver:</p>
              <div className="row">
                <button className="btn btn-sm btn-ok" onClick={() => save('correct')}>
                  Doğru sayılır
                </button>
                <button className="btn btn-sm" onClick={() => save('near')}>
                  Yakındı
                </button>
                <button className="btn btn-sm btn-bad" onClick={() => save('wrong')} autoFocus>
                  Yanlıştı
                </button>
              </div>
            </>
          )}
        </section>
      )}
    </div>
  )
}
