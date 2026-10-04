import { useEffect, useMemo, useRef, useState } from 'react'
import { exampleAudio, fetchListening, type ListeningSentence } from '../data/corpus'
import { gradeSentence } from '../engine/sentences'
import { shuffle, createRng } from '../engine/rng'
import type { TargetLanguage, UserWordState, VocabularyEntry } from '../engine/types'
import { wordDiff } from '../engine/wordDiff'
import { AccentBar, accentChange, insertAt } from './AccentBar'
import { MessageIcon, SpeakerIcon } from './icons'
import { LANGUAGE_NAME } from './labels'
import { saveSentence } from './Sentences'
import { sfx } from './sounds'

const ROUND = 10

/**
 * Dictation with real recordings: many native speakers, real speed, real accents, unlike any
 * synthetic voice. From sentences around your own words, or random ones for variety.
 */
export function NativeDictation({ language, vocabulary, states, onExit }: { language: TargetLanguage; vocabulary: VocabularyEntry[]; states: UserWordState[]; onExit: () => void }) {
  const [source, setSource] = useState<'mine' | 'mixed'>('mine')
  const [items, setItems] = useState<ListeningSentence[] | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Sentences of words being learned that have a recording.
  const mine = useMemo(() => {
    const learning = new Set(states.map((s) => s.entryId))
    const out: ListeningSentence[] = []
    for (const e of vocabulary) {
      if (!learning.has(e.id)) continue
      for (const x of e.corpus ?? []) {
        const audio = exampleAudio(x, language)
        if (audio && x.source) out.push({ id: x.source.id, text: x.text, translation: x.translation, audio })
      }
    }
    return out
  }, [vocabulary, states, language])

  const start = async () => {
    setError('')
    if (source === 'mine') {
      setItems(shuffle(mine, createRng(Date.now())).slice(0, ROUND))
      return
    }
    setLoading(true)
    try {
      setItems(await fetchListening(language, ROUND))
    } catch {
      setError('Cümleler alınamadı; internet bağlantını kontrol et.')
    } finally {
      setLoading(false)
    }
  }

  if (items) return <DictationRound items={items} language={language} onDone={() => setItems(null)} />

  return (
    <div className="stack">
      <button className="link" onClick={onExit}>
        ← Oyunlar
      </button>
      <h1 className="greeting">Gerçek seslerle dikte</h1>
      <p className="greeting-sub">
        {LANGUAGE_NAME[language]} konuşan insanların kendi sesleriyle okuduğu cümleler: her biri farklı bir ses, gerçek hız. Dinle, yaz; hangi kelimeleri
        kaçırdığını kelime kelime görürsün. Pratik sayılır, takvimi etkilemez. İnternet gerekir.
      </p>
      <div className="choice-row" role="group" aria-label="Cümleler">
        <button className="chip" aria-pressed={source === 'mine'} onClick={() => setSource('mine')} disabled={!mine.length}>
          Kelimelerimden ({mine.length})
        </button>
        <button className="chip" aria-pressed={source === 'mixed'} onClick={() => setSource('mixed')}>
          Karışık
        </button>
      </div>
      <div>
        <button className="btn btn-lg" onClick={start} disabled={loading || !navigator.onLine || (source === 'mine' && !mine.length)}>
          {loading ? 'Cümleler geliyor…' : `${ROUND} cümleyle başla`}
        </button>
      </div>
      {!mine.length && <p className="small muted">Çalıştığın kelimelerin sesli gerçek cümleleri geldikçe "Kelimelerimden" de açılır.</p>}
      {error && <p className="error">{error}</p>}
    </div>
  )
}

function DictationRound({ items, language, onDone }: { items: ListeningSentence[]; language: TargetLanguage; onDone: () => void }) {
  const [index, setIndex] = useState(0)
  const [text, setText] = useState('')
  const [checked, setChecked] = useState(false)
  const [score, setScore] = useState(0)
  const [saved, setSaved] = useState(false)
  const audio = useRef<HTMLAudioElement | null>(null)
  const input = useRef<HTMLInputElement>(null)
  const item = items[index]

  const play = (rate = 1) => {
    if (!item) return
    audio.current?.pause()
    const a = new Audio(item.audio)
    a.playbackRate = rate
    audio.current = a
    void a.play().catch(() => {})
  }

  useEffect(() => {
    setText('')
    setChecked(false)
    setSaved(false)
    play()
    return () => audio.current?.pause()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index])

  if (!item) {
    return (
      <div className="stack">
        <h1 className="greeting">Bitti</h1>
        <p className="greeting-sub">
          {items.length} cümleden {score} tanesini kusursuz yazdın.
        </p>
        <div>
          <button className="btn" onClick={onDone}>
            Tekrar
          </button>
        </div>
      </div>
    )
  }

  const verdict = checked ? gradeSentence({ kind: 'dictation', answer: item.text }, text) : null
  const check = () => {
    if (checked || !text.trim()) return
    setChecked(true)
    const v = gradeSentence({ kind: 'dictation', answer: item.text }, text)
    if (v === 'correct') {
      setScore((s) => s + 1)
      sfx.correct()
    } else if (v === 'near') sfx.near()
    else sfx.wrong()
  }

  return (
    <div className="stack sentence-review">
      <div className="row justify-between">
        <button className="link" onClick={onDone}>
          ← Bitir
        </button>
        <span className="small muted">
          {index + 1} / {items.length}
        </span>
      </div>
      <div className="row">
        <button className="speak speak-big" onClick={() => play()} aria-label="Tekrar dinle">
          <SpeakerIcon size={32} />
        </button>
        <button className="btn btn-sm btn-quiet" onClick={() => play(0.75)}>
          Yavaş
        </button>
      </div>
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
          disabled={checked}
          autoFocus
          autoComplete="off"
          autoCapitalize="off"
          autoCorrect="off"
          spellCheck={false}
          enterKeyHint="done"
          placeholder="Duyduğunu yaz"
        />
        {!checked && <AccentBar language={language} onInsert={(ch) => input.current && setText(insertAt(input.current, ch))} />}
      </form>
      {!checked ? (
        <div className="row">
          <button className="btn" onClick={check} disabled={!text.trim()}>
            Kontrol et
          </button>
          <button className="link small" onClick={() => setChecked(true)}>
            Göster
          </button>
        </div>
      ) : (
        <section className={`card stack sentence-result is-${verdict ?? 'wrong'}`}>
          <p className="dictation-diff" lang={language}>
            {(text.trim() ? wordDiff(text, item.text) : item.text.split(' ').map((w) => ({ word: w, status: 'missed' as const }))).map((p, i) => (
              <span key={i} className={`dd-${p.status}`}>
                {p.word}{' '}
              </span>
            ))}
          </p>
          {item.translation && <p className="small muted">{item.translation}</p>}
          <div className="row">
            <button className="btn" onClick={() => setIndex((i) => i + 1)} autoFocus>
              Devam
            </button>
            <button
              className="link small"
              disabled={saved}
              onClick={async () => {
                await saveSentence({ language, text: item.text, translation: item.translation, source: 'Tatoeba' })
                setSaved(true)
              }}
            >
              <MessageIcon size={16} className="inline-icon" />
                {saved ? 'Kaydedildi' : 'Cümle kartı yap'}
            </button>
          </div>
        </section>
      )}
    </div>
  )
}
