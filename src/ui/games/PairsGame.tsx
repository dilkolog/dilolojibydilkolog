import { useEffect, useRef, useState } from 'react'
import { GameResult } from './GameResult'
import { MINIMAL_PAIRS, pairRound, type PairQuestion } from '../../engine/listening'
import { nativeRecordings } from '../../data/wordInfo'
import { createRng } from '../../engine/rng'
import { db } from '../../data/instance'
import { SpeakerIcon } from '../icons'
import { sfx } from '../sounds'
import { speakAsync } from '../speech'
import type { Props } from './shared'

const PAIR_ROUND = 12

/**
 * Hear one word of a minimal pair and pick it. Every answer gets immediate feedback and the
 * chance to hear both words back to back; voices vary between questions.
 */
export function PairsGame({ language, best, recordKey, onExit }: Props & { best?: number; recordKey: string; onExit: () => void }) {
  const [round, setRound] = useState<PairQuestion[]>(() => pairRound(language, PAIR_ROUND, createRng(Date.now())))
  const [index, setIndex] = useState(0)
  const [answers, setAnswers] = useState<{ q: PairQuestion; ok: boolean }[]>([])
  const [chosen, setChosen] = useState<'a' | 'b' | null>(null)
  const [record, setRecord] = useState(false)
  const q = round[index] as PairQuestion | undefined
  const done = index >= round.length
  // Real recordings by many speakers (high-variability training); the device voice fills gaps.
  const [voices, setVoices] = useState<Map<string, string[]> | null>(null)
  const lastVoice = useRef('')
  useEffect(() => {
    if (!navigator.onLine) return setVoices(new Map())
    const words = MINIMAL_PAIRS[language].flatMap((p) => [p.a.word, p.b.word])
    void nativeRecordings(words, language).then(setVoices, () => setVoices(new Map()))
  }, [language])
  const say = (word: string): Promise<void> => {
    const urls = voices?.get(word) ?? []
    if (!urls.length) return speakAsync(word, language)
    const choices = urls.length > 1 ? urls.filter((u) => u !== lastVoice.current) : urls
    const url = choices[Math.floor(Math.random() * choices.length)]
    lastVoice.current = url
    return new Promise((resolve) => {
      const a = new Audio(url)
      a.onended = () => resolve()
      a.onerror = () => void speakAsync(word, language).then(resolve)
      void a.play().catch(() => void speakAsync(word, language).then(resolve))
    })
  }
  const recorded = voices ? MINIMAL_PAIRS[language].filter((p) => voices.has(p.a.word) && voices.has(p.b.word)).length : 0

  useEffect(() => {
    if (q && chosen === null && voices) void say(q.pair[q.answer].word)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, chosen, language, voices])

  const choose = (side: 'a' | 'b') => {
    if (!q || chosen) return
    const ok = side === q.answer
    if (ok) sfx.correct()
    else sfx.wrong()
    setChosen(side)
    setAnswers((a) => [...a, { q, ok }])
  }

  const next = async () => {
    setChosen(null)
    if (index + 1 >= round.length) {
      const pct = Math.round(((answers.filter((a) => a.ok).length) / round.length) * 100)
      if (pct > (best ?? 0)) {
        await db.saveRecord(recordKey, pct)
        setRecord(true)
      }
      sfx.levelUp()
    }
    setIndex((i) => i + 1)
  }

  const both = async () => {
    if (!q) return
    await say(q.pair.a.word)
    await new Promise((r) => setTimeout(r, 400))
    await say(q.pair.b.word)
  }

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (done || !q) return
      if (e.code === 'Space') {
        e.preventDefault()
        void say(q.pair[q.answer].word)
      }
      if (!chosen && (e.key === '1' || e.key === '2')) choose(q.order[Number(e.key) - 1])
      if (chosen && e.key === 'Enter') void next()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  const right = answers.filter((a) => a.ok).length
  const missed = new Map<string, number>()
  for (const a of answers) if (!a.ok) missed.set(a.q.pair.contrast, (missed.get(a.q.pair.contrast) ?? 0) + 1)
  const worst = [...missed.entries()].sort((a, b) => b[1] - a[1])[0]

  return (
    <div className="stack">
      <div className="game-top">
        <button className="link" onClick={onExit}>
          ← Oyunlar
        </button>
        {!done && (
          <span className="game-timer">
            {index + 1} / {round.length}
          </span>
        )}
        <span className="small muted">{best ? `Rekor: %${best}` : ''}</span>
      </div>

      {!done && q && (
        <div className="stack">
          <div className="row">
            <button className="speak speak-big" onClick={() => void say(q.pair[q.answer].word)} aria-label="Tekrar dinle">
              <SpeakerIcon size={36} />
            </button>
            <span className="small muted">Hangisini duydun? Boşluk: tekrar dinle · 1–2: seç · Fark: {q.pair.contrast}</span>
          </div>
          <p className="small muted">
            {voices === null
              ? 'Gerçek ses kayıtları aranıyor…'
              : recorded
                ? `${recorded} çiftte ana dili konuşanların kayıtları var; her seferinde başka bir ses çalar (çok sesle eğitim kulağı en iyi eğitiyor).`
                : 'Gerçek kayıt bulunamadı; cihaz sesi kullanılıyor.'}
          </p>
          <div className="options">
            {q.order.map((side, i) => {
              const w = q.pair[side]
              const state = chosen ? (side === q.answer ? ' is-correct' : side === chosen ? ' is-wrong' : ' is-dim') : ''
              return (
                <button key={side} className={`option${state}`} disabled={!!chosen} onClick={() => choose(side)}>
                  <span className="key">{i + 1}</span>
                  <span>
                    <span className="option-serif" lang={language}>
                      {w.word}
                    </span>{' '}
                    <span className="small muted">{w.gloss}</span>
                  </span>
                </button>
              )
            })}
          </div>
          {chosen && (
            <div className="row">
              <button className="btn btn-quiet" onClick={both}>
                İkisini art arda dinle
              </button>
              <button className="btn" onClick={next} autoFocus>
                Devam
              </button>
            </div>
          )}
        </div>
      )}

      {done && (
        <GameResult
          record={record}
          title={record ? 'Yeni rekor!' : 'Tur bitti'}
          headline={`${right} / ${round.length} doğru`}
          accuracy={round.length ? right / round.length : 0}
          note={worst ? `En çok karıştırdığın ses farkı: ${worst[0]}. Bu çiftleri tekrar dinlemek kulağını alıştırır.` : 'Hiç karıştırmadın; kulağın bu farklara alışmış.'}
          onAgain={() => {
            setRound(pairRound(language, PAIR_ROUND, createRng(Date.now())))
            setIndex(0)
            setAnswers([])
            setRecord(false)
          }}
          onExit={onExit}
        />
      )}
    </div>
  )
}
