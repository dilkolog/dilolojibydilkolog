import { useEffect, useRef, useState } from 'react'
import { checkWords, digitsRight, NUMBER_KINDS, numberRound, WRITABLE_KINDS, type NumberKind, type NumberQuestion } from '../../engine/numbers'
import { createRng } from '../../engine/rng'
import type { TargetLanguage } from '../../engine/types'
import { db } from '../../data/instance'
import { AccentBar } from '../AccentBar'
import { accentChange, insertAt } from '../accentCaret'
import { SlowIcon, SpeakerIcon } from '../icons'
import { LANGUAGE_NAME } from '../labels'
import { sfx } from '../sounds'
import { canSpeak, speak, speechPrefs } from '../speech'
import { GameResult } from './GameResult'

type Mode = 'listen' | 'write'
type Pick = NumberKind | 'mixed'

const PREFS_KEY = 'diloloji:numbers'

const KIND_NAME: Record<Pick, string> = { mixed: 'Karışık', small: '0–100', big: 'Büyük sayılar', time: 'Saatler', price: 'Fiyatlar', year: 'Yıllar' }
const KIND_HINT: Record<NumberKind, string> = {
  small: 'sayıyı rakamla',
  big: 'sayıyı rakamla',
  time: 'saati rakamla (14:30)',
  price: 'fiyatı rakamla (12,50)',
  year: 'yılı rakamla',
}
/** Where the language's numbers trip a Turkish speaker up, said once on the start screen. */
const LANGUAGE_NOTE: Record<TargetLanguage, string> = {
  fr: 'Fransızcada 70 “altmış on” (soixante-dix), 80 “dört yirmi” (quatre-vingts), 90 “dört yirmi on” (quatre-vingt-dix) diye söylenir; saat 24 saatlik söylenir (quatorze heures).',
  es: 'İspanyolcada 16–29 tek kelimedir (dieciséis, veintidós), 500, 700 ve 900 düzensizdir (quinientos, setecientos, novecientos); saatte “menos cuarto” bir sonraki saate çeyrek kala demektir.',
  en: 'İngilizcede “thirteen” ile “thirty” kulakta karışır: vurgu -teen’de sondadır, -ty’de baştadır; yıllar ikiye bölünerek söylenir (nineteen ninety-nine).',
}

function loadPrefs(): { mode: Mode; kind: Pick } {
  try {
    const raw = JSON.parse(localStorage.getItem(PREFS_KEY) ?? '{}') as { mode?: unknown; kind?: unknown }
    const kind = raw.kind === 'mixed' || NUMBER_KINDS.includes(raw.kind as NumberKind) ? (raw.kind as Pick) : 'mixed'
    return { mode: raw.mode === 'write' ? 'write' : 'listen', kind }
  } catch {
    return { mode: 'listen', kind: 'mixed' }
  }
}

function savePrefs(prefs: { mode: Mode; kind: Pick }) {
  try {
    localStorage.setItem(PREFS_KEY, JSON.stringify(prefs))
  } catch {
    // The choice is just not kept.
  }
}

/** The kinds a round asks: one, or every kind the mode can ask. */
const kindsOf = (mode: Mode, kind: Pick): readonly NumberKind[] => {
  const allowed = mode === 'write' ? WRITABLE_KINDS : NUMBER_KINDS
  return kind === 'mixed' ? allowed : allowed.includes(kind) ? [kind] : allowed
}

/**
 * Numbers, times, prices and years: hear one and type the digits, or see the digits and write the words. Nothing is
 * kept but the best result; the numbers are not the learner's words.
 */
export function NumbersGame({ language, best, recordKey, onExit }: { language: TargetLanguage; best?: number; recordKey: string; onExit: () => void }) {
  const speaks = canSpeak()
  const [prefs, setPrefsState] = useState(loadPrefs)
  const mode: Mode = speaks ? prefs.mode : 'write'
  const setPrefs = (next: { mode: Mode; kind: Pick }) => {
    setPrefsState(next)
    savePrefs(next)
  }
  const [phase, setPhase] = useState<'intro' | 'play' | 'over'>('intro')
  const [round, setRound] = useState<NumberQuestion[]>([])
  const [index, setIndex] = useState(0)
  const [text, setText] = useState('')
  const [verdict, setVerdict] = useState<'right' | 'near' | 'wrong' | null>(null)
  const [results, setResults] = useState<{ q: NumberQuestion; ok: boolean }[]>([])
  const [record, setRecord] = useState(false)
  const input = useRef<HTMLInputElement>(null)
  const q = round[index]

  const start = () => {
    setRound(numberRound(language, kindsOf(mode, prefs.kind), createRng(Date.now())))
    setIndex(0)
    setResults([])
    setText('')
    setVerdict(null)
    setRecord(false)
    setPhase('play')
  }

  // A new question in listening mode is heard at once.
  useEffect(() => {
    if (phase === 'play' && q && mode === 'listen') speak(q.spoken, language)
  }, [phase, q, mode, language])

  const check = () => {
    if (!q || verdict || !text.trim()) return
    const v = mode === 'listen' ? (digitsRight(language, q, text) ? 'right' : 'wrong') : checkWords(language, q, text)
    const ok = v !== 'wrong'
    if (ok) sfx.correct()
    else sfx.wrong()
    setVerdict(v)
    setResults((r) => [...r, { q, ok }])
  }

  const next = () => {
    if (index + 1 < round.length) {
      setIndex(index + 1)
      setText('')
      setVerdict(null)
      return
    }
    const right = results.filter((r) => r.ok).length
    const pct = Math.round((right / Math.max(1, results.length)) * 100)
    if (pct > (best ?? 0)) {
      setRecord(best !== undefined)
      void db.saveRecord(recordKey, pct)
    }
    setPhase('over')
  }

  useEffect(() => {
    if (!verdict) input.current?.focus()
  }, [verdict, index])

  const missed = results.filter((r) => !r.ok)
  const allowed = mode === 'write' ? WRITABLE_KINDS : NUMBER_KINDS
  // A kind the mode cannot ask (a time to write in words) shows as mixed.
  const shownKind: Pick = prefs.kind !== 'mixed' && allowed.includes(prefs.kind) ? prefs.kind : 'mixed'

  return (
    <div className="stack numbers-game">
      <div className="game-top">
        <button className="link" onClick={onExit}>
          ← Oyunlar
        </button>
        {phase === 'play' && (
          <span className="game-timer">
            {index + 1} / {round.length}
          </span>
        )}
        <span className="small muted" />
      </div>

      {phase === 'intro' && (
        <div className="stack">
          <h1 className="greeting">Sayılar ve saatler</h1>
          <p className="muted">
            {LANGUAGE_NAME[language]}da sayı, saat, fiyat ve yıllar. <strong>Dinle ve yaz</strong>da duyduğunu rakamla yazarsın; <strong>Gör ve yaz</strong>da rakamları kelimeyle yazarsın.
          </p>
          <p className="small muted">{LANGUAGE_NOTE[language]}</p>
          <div className="choice-row" role="group" aria-label="Nasıl">
            <button type="button" className="chip" aria-pressed={mode === 'listen'} disabled={!speaks} onClick={() => setPrefs({ ...prefs, mode: 'listen' })}>
              Dinle ve yaz
            </button>
            <button type="button" className="chip" aria-pressed={mode === 'write'} onClick={() => setPrefs({ ...prefs, mode: 'write' })}>
              Gör ve yaz
            </button>
          </div>
          <div className="choice-row" role="group" aria-label="Ne çalışılsın">
            {(['mixed', ...NUMBER_KINDS] as const).map((k) => (
              <button key={k} type="button" className="chip" aria-pressed={shownKind === k} disabled={k !== 'mixed' && !allowed.includes(k)} onClick={() => setPrefs({ ...prefs, kind: k })}>
                {KIND_NAME[k]}
              </button>
            ))}
          </div>
          {!speaks && <p className="small muted">Bu tarayıcıda sesli okuma yok: yalnızca “Gör ve yaz”.</p>}
          {best !== undefined && <p className="small muted">Rekorun: %{best}</p>}
          <div className="row">
            <button className="btn btn-lg" onClick={start} autoFocus>
              10 soruluk tura başla
            </button>
          </div>
        </div>
      )}

      {phase === 'play' && q && (
        <div className="stack">
          {mode === 'listen' ? (
            <>
              <p className="prompt-label">Duyduğun {KIND_HINT[q.kind]} yaz</p>
              <div className="row">
                <button type="button" className="btn" onClick={() => speak(q.spoken, language)}>
                  <SpeakerIcon size={18} /> Dinle
                </button>
                <button type="button" className="btn btn-quiet" onClick={() => speak(q.spoken, language, speechPrefs.rate * 0.7)}>
                  <SlowIcon size={18} /> Yavaş
                </button>
              </div>
            </>
          ) : (
            <>
              <p className="prompt-label">Kelimeyle yaz</p>
              <p className="numbers-digits" lang={language}>
                {q.digits}
              </p>
            </>
          )}
          <form
            className="stack"
            onSubmit={(e) => {
              e.preventDefault()
              if (verdict) next()
              else check()
            }}
          >
            <input
              ref={input}
              className={`answer-input${verdict === 'right' ? ' is-correct' : verdict === 'near' ? ' is-near' : verdict === 'wrong' ? ' is-wrong' : ''}`}
              lang={mode === 'write' ? language : undefined}
              inputMode={mode === 'listen' ? (q.kind === 'time' ? 'text' : 'decimal') : 'text'}
              autoFocus
              autoComplete="off"
              autoCapitalize="off"
              autoCorrect="off"
              spellCheck={false}
              enterKeyHint="done"
              readOnly={!!verdict}
              placeholder={mode === 'listen' ? (q.kind === 'time' ? '14:30' : q.kind === 'price' ? '12,50' : '123') : 'Kelimeyle'}
              aria-label={mode === 'listen' ? 'Rakamla cevap' : 'Kelimeyle cevap'}
              value={text}
              onChange={mode === 'write' ? accentChange(language, setText) : (e) => setText(e.target.value)}
            />
            {mode === 'write' && !verdict && <AccentBar language={language} onInsert={(ch) => input.current && setText(insertAt(input.current, ch))} />}
            {verdict ? (
              <div className="stack gap-2" role="status">
                <p className={verdict === 'wrong' ? 'error' : 'notice'}>{verdict === 'right' ? 'Doğru' : verdict === 'near' ? 'Neredeyse: yazımına bak' : 'Yanlış'}</p>
                <p className="numbers-answer">
                  <strong>{q.digits}</strong> ={' '}
                  <span lang={language}>{q.written[0]}</span>
                  {speaks && (
                    <button type="button" className="icon-btn icon-btn-sm" aria-label="Dinle" onClick={() => speak(q.spoken, language)}>
                      <SpeakerIcon size={15} />
                    </button>
                  )}
                </p>
                {q.written.length > 1 && (
                  <p className="small muted">
                    Ya da: <span lang={language}>{q.written.slice(1).join(' · ')}</span>
                  </p>
                )}
                <div className="row">
                  <button type="submit" className="btn">
                    {index + 1 < round.length ? 'Devam' : 'Sonucu gör'}
                  </button>
                </div>
              </div>
            ) : (
              <div className="row">
                <button type="submit" className="btn" disabled={!text.trim()}>
                  Kontrol et
                </button>
              </div>
            )}
          </form>
        </div>
      )}

      {phase === 'over' && (
        <GameResult
          record={record}
          title="Tur bitti"
          headline={`${round.length - missed.length} / ${round.length} doğru`}
          accuracy={round.length ? (round.length - missed.length) / round.length : 0}
          missed={missed.map((m) => `${m.q.digits} = ${m.q.written[0]}`)}
          missedLabel="Tekrar bakmaya değer"
          language={language}
          onAgain={start}
          onExit={onExit}
        />
      )}
    </div>
  )
}
