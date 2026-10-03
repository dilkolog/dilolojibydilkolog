import { useEffect, useRef, useState } from 'react'
import { displayForm } from '../engine/exercises'
import { readingKey } from '../engine/reading'
import type { TargetLanguage, VocabularyEntry } from '../engine/types'
import { LANGUAGE_NAME } from './labels'
import { sfx } from './sounds'
import { canListen, listenContinuous } from './speechInput'

const TOPICS = [
  'Yaşadığın şehri ve en sevdiğin yerini anlat',
  'Son tatilini anlat: nereye gittin, ne yaptın?',
  'İşini ya da okulunu ve sıradan bir gününü anlat',
  'Sevdiğin bir film ya da diziyi anlat ve neden sevdiğini söyle',
  'Hayatını değiştiren bir kararı anlat',
  'Gelecek yıl için planlarını anlat',
  'Çocukluğundan bir anıyı anlat',
]

/** Normal: 4, 3, 2 minutes (Nation). Short: the same shrinking pattern for a quick go. */
const PLANS = { normal: [240, 180, 120], short: [120, 90, 60] } as const

interface RoundResult {
  seconds: number
  words: number
  wpm: number
  used: string[]
}

/**
 * 4/3/2: tell the same thing three times, in 4, then 3, then 2 minutes. Repeating the content
 * under growing time pressure turns it into fluent speech, and the gain carries over to new
 * talk (Nation 1989; de Jong & Perfetti 2011). Speech recognition measures words per minute and
 * the practice words used; without it, the timer alone still does the job.
 */
export function Fluency432({ language, words }: { language: TargetLanguage; words: VocabularyEntry[] }) {
  const [topic, setTopic] = useState(TOPICS[0])
  const [custom, setCustom] = useState('')
  const [plan, setPlan] = useState<keyof typeof PLANS>('normal')
  const [round, setRound] = useState<number | null>(null)
  const [left, setLeft] = useState(0)
  const [text, setText] = useState({ final: '', interim: '' })
  const [results, setResults] = useState<RoundResult[]>([])
  const [error, setError] = useState('')
  const stop = useRef<() => void>(() => {})
  const startedAt = useRef(0)
  const targets = words.slice(0, 3)
  const listening = canListen()

  useEffect(() => () => stop.current(), [])

  const begin = (r: number) => {
    setError('')
    setText({ final: '', interim: '' })
    setRound(r)
    setLeft(PLANS[plan][r])
    startedAt.current = performance.now()
    if (listening) stop.current = listenContinuous(language, (final, interim) => setText({ final, interim }), setError)
  }

  const used = (said: string) => {
    const keys = new Set([...said.matchAll(/[\p{L}'’-]+/gu)].map((m) => readingKey(m[0], language)))
    return targets.filter((w) => keys.has(readingKey(w.lemma, language))).map((w) => displayForm(w))
  }

  const finishRound = () => {
    stop.current()
    stop.current = () => {}
    const seconds = Math.max(1, Math.round((performance.now() - startedAt.current) / 1000))
    const said = `${text.final} ${text.interim}`.trim()
    const count = said ? said.split(/\s+/).length : 0
    sfx.correct()
    setResults((r) => [...r, { seconds, words: count, wpm: Math.round((count / seconds) * 60), used: used(said) }])
    setRound(null)
  }

  useEffect(() => {
    if (round === null) return
    const t = setInterval(() => {
      const remaining = PLANS[plan][round] - Math.floor((performance.now() - startedAt.current) / 1000)
      setLeft(Math.max(0, remaining))
      if (remaining <= 0) finishRound()
    }, 250)
    return () => clearInterval(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [round, plan, text])

  const subject = custom.trim() || topic
  const fmt = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`

  if (round !== null) {
    return (
      <section className="card stack fluency-run">
        <div className="row" style={{ justifyContent: 'space-between' }}>
          <strong>
            {round + 1}. tur · {subject}
          </strong>
          <span className="fluency-timer">{fmt(left)}</span>
        </div>
        <p className="small muted">
          {round === 0 ? 'Rahatça anlat; bütün süreyi kullan.' : 'Aynı şeyleri anlat, bu sefer daha az zamanda: kısaltma, daha hızlı ve akıcı söyle.'}
          {targets.length > 0 && ` Şunları kullanmaya çalış: ${targets.map((w) => displayForm(w)).join(', ')}.`}
        </p>
        {listening ? (
          <p className="fluency-transcript" lang={language}>
            {text.final} <span className="muted">{text.interim}</span>
            {!text.final && !text.interim && <span className="muted">Konuşmaya başla…</span>}
          </p>
        ) : (
          <p className="small muted">Bu tarayıcıda konuşma tanıma yok; süre yine işler, sadece kelimeler sayılmaz.</p>
        )}
        <div>
          <button className="btn btn-quiet" onClick={finishRound}>
            Turu bitir
          </button>
        </div>
        {error && <p className="error small">{error}</p>}
      </section>
    )
  }

  const done = results.length === 3
  return (
    <section className="stack">
      <p className="small muted">
        Aynı konuyu üç kez anlatırsın: önce {PLANS[plan][0] / 60}, sonra {PLANS[plan][1] / 60}, en son {PLANS[plan][2] / 60} dakikada. İçerik aynı kalıp süre
        kısaldıkça konuşma akıcılaşır ve bu kazanım yeni konulara da taşınır (Nation 1989). {LANGUAGE_NAME[language]} konuş.
      </p>
      {results.length === 0 && (
        <>
          <div className="choice-row">
            {TOPICS.map((t) => (
              <button key={t} className="chip chip-sm" aria-pressed={!custom.trim() && topic === t} onClick={() => (setTopic(t), setCustom(''))}>
                {t}
              </button>
            ))}
          </div>
          <input className="input" value={custom} onChange={(e) => setCustom(e.target.value)} placeholder="Ya da kendi konun" aria-label="Kendi konun" />
          <div className="choice-row" role="group" aria-label="Süre">
            <button className="chip chip-sm" aria-pressed={plan === 'normal'} onClick={() => setPlan('normal')}>
              4 / 3 / 2 dakika
            </button>
            <button className="chip chip-sm" aria-pressed={plan === 'short'} onClick={() => setPlan('short')}>
              Kısa: 2 / 1,5 / 1
            </button>
          </div>
        </>
      )}
      {results.length > 0 && (
        <table className="data-table fluency-table">
          <thead>
            <tr>
              <th>Tur</th>
              <th>Süre</th>
              {listening && <th>Kelime</th>}
              {listening && <th>Kelime/dk</th>}
              {targets.length > 0 && listening && <th>Hedef kelimeler</th>}
            </tr>
          </thead>
          <tbody>
            {results.map((r, i) => (
              <tr key={i}>
                <td>{i + 1}</td>
                <td>{fmt(r.seconds)}</td>
                {listening && <td>{r.words}</td>}
                {listening && <td>{r.wpm}</td>}
                {targets.length > 0 && listening && <td>{r.used.length ? r.used.join(', ') : '—'}</td>}
              </tr>
            ))}
          </tbody>
        </table>
      )}
      {done && listening && results[0].wpm > 0 && (
        <p className="notice">
          Konuşma hızın ilk turdan son tura {results[2].wpm >= results[0].wpm ? `%${Math.round(((results[2].wpm - results[0].wpm) / results[0].wpm) * 100)} arttı` : 'düştü; bir dahaki sefer son turda daha kısa cümleler dene'}.
        </p>
      )}
      <div className="row">
        {done ? (
          <button className="btn" onClick={() => setResults([])}>
            Yeni konu
          </button>
        ) : (
          <button className="btn btn-lg" onClick={() => begin(results.length)}>
            {results.length === 0 ? `1. turu başlat (${PLANS[plan][0] / 60} dk)` : `${results.length + 1}. tur (${PLANS[plan][results.length] / 60} dk)`}
          </button>
        )}
      </div>
    </section>
  )
}
