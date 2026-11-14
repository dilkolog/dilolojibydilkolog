import { useEffect, useMemo, useRef, useState } from 'react'
import { blankParts, PTE_RULES, type PteAsq, type PteFib, type PteRa, type PteRs, type PteWfd } from '../../../data/pte'
import { scoreBlanks, scoreDictation, scoreReadAloud, scoreRepeat, scoreShortAnswer } from '../../../engine/pteScore'
import { createRng, shuffle } from '../../../engine/rng'
import { canRecord, recordingType } from '../audioRecord'
import { assessPronunciation, azureEnabled } from '../pronunciation'
import { KeyboardIcon, MicIcon } from '../../shared/icons'
import { Select } from '../../shared/Select'
import { canSpeak } from '../../shared/speech'
import { canListen, listenContinuous } from '../../shared/speechInput'
import { useCountdown, usePteAudio, watchSilence } from './pteHooks'
import type { PteItemProps } from './pteMode'
import { PteClock, PteListen } from './pteShared'

/** The pronunciation service scores at most about this much speech (pronunciation.ts). */
const PRON_MAX_SECONDS = 30

/** Once the pronunciation check has failed (its daily allowance used up, no connection), the rest of the visit uses the words said. */
let pronOff = false

/** A line to type the answer on, submitted with Enter. */
function AnswerLine({ value, onChange, onSubmit, label, placeholder, disabled }: { value: string; onChange: (v: string) => void; onSubmit: () => void; label: string; placeholder: string; disabled?: boolean }) {
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        onSubmit()
      }}
    >
      <input
        className="answer-input"
        lang="en"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        autoComplete="off"
        autoCapitalize="off"
        autoCorrect="off"
        spellCheck={false}
        enterKeyHint="done"
        placeholder={placeholder}
        aria-label={label}
        autoFocus
      />
    </form>
  )
}

// ---------------------------------------------------------------------------
// Write from dictation

export function PteDictation({ item, mode, onAnswer }: PteItemProps<PteWfd>) {
  const audio = usePteAudio(item.text, mode, PTE_RULES.wfd.listens)
  const [text, setText] = useState('')
  const check = () => onAnswer({ score: scoreDictation(text, item.text), given: text })
  return (
    <div className="stack">
      <p className="small muted">Cümleyi dinle ve duyduğun gibi yaz. Her doğru kelime bir puan.</p>
      <PteListen audio={audio} mode={mode} />
      <AnswerLine value={text} onChange={setText} onSubmit={check} label="Duyduğun cümle" placeholder="Duyduğun cümleyi yaz" />
      <div className="row">
        <button type="button" className="btn" onClick={check} disabled={!text.trim()}>
          Kontrol et
        </button>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Speaking: recognition, with what was heard so far

/**
 * Recognition, with what was heard so far. With `silenceSeconds` (exam mode) listening closes by itself after that long
 * without anything new heard, from the moment the microphone opens (the exam's rule), and `onSilence` gets what was said.
 */
function useSpeaking(onError: (message: string) => void, silenceSeconds: number | null = null, onSilence?: (said: string) => void) {
  const [heard, setHeard] = useState('')
  const [on, setOn] = useState(false)
  const stop = useRef<(() => void) | null>(null)
  const text = useRef('')
  const quiet = useRef<number>(undefined)
  const silent = useRef(onSilence)
  silent.current = onSilence
  useEffect(
    () => () => {
      window.clearTimeout(quiet.current)
      stop.current?.()
    },
    [],
  )
  /** Ends listening and gives everything heard. */
  const finish = () => {
    window.clearTimeout(quiet.current)
    stop.current?.()
    stop.current = null
    setOn(false)
    return text.current
  }
  const arm = () => {
    window.clearTimeout(quiet.current)
    if (silenceSeconds) quiet.current = window.setTimeout(() => stop.current && silent.current?.(finish()), silenceSeconds * 1000)
  }
  const start = () => {
    text.current = ''
    setHeard('')
    setOn(true)
    arm()
    stop.current = listenContinuous(
      'en',
      (final, interim) => {
        const now = `${final} ${interim}`.trim()
        if (now !== text.current) arm()
        text.current = now
        setHeard(now)
      },
      (message) => {
        window.clearTimeout(quiet.current)
        stop.current?.()
        stop.current = null
        setOn(false)
        onError(message)
      },
    )
  }
  return { start, finish, heard, on }
}

/** Typed instead of said: for a device without recognition, or when the microphone is refused. */
function TypeInstead({ onDone, placeholder }: { onDone: (text: string) => void; placeholder: string }) {
  const [text, setText] = useState('')
  return (
    <div className="stack gap-2">
      <AnswerLine value={text} onChange={setText} onSubmit={() => text.trim() && onDone(text)} label="Yazarak cevap" placeholder={placeholder} />
      <div className="row">
        <button type="button" className="btn" onClick={() => onDone(text)} disabled={!text.trim()}>
          Kontrol et
        </button>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Repeat sentence

export function PteRepeat({ item, mode, onAnswer }: PteItemProps<PteRs>) {
  const [typing, setTyping] = useState(!canListen())
  const [error, setError] = useState('')
  const done = (said: string) => onAnswer({ score: scoreRepeat(said, item.text), given: said })
  const speaking = useSpeaking(
    (message) => {
      setError(message)
      setTyping(true)
    },
    mode === 'exam' ? PTE_RULES.rs.silenceSeconds : null,
    done,
  )
  const startSaying = () => {
    setError('')
    speaking.start()
  }
  // The exam opens the microphone as soon as the recording ends.
  const audio = usePteAudio(item.text, mode, PTE_RULES.rs.listens, () => {
    if (mode === 'exam' && !typing && !speaking.on) startSaying()
  })
  const left = useCountdown(mode === 'exam' ? PTE_RULES.rs.answerSeconds : null, speaking.on, () => done(speaking.finish()))
  return (
    <div className="stack">
      <p className="small muted">
        Cümleyi dinle, sonra aynen tekrar et.{' '}
        {mode === 'exam' ? `Kayıt bitince mikrofon açılır; ${PTE_RULES.rs.answerSeconds} saniyen var, ${PTE_RULES.rs.silenceSeconds} saniye sessiz kalırsan kayıt kapanır.` : ''} Puan içeriğe göre 0–3: hepsi doğru sırada 3, en az yarısı 2, yarısından azı 1.
      </p>
      <PteListen audio={audio} mode={mode} />
      {typing ? (
        <>
          {error && <p className="small cross-warn">{error}</p>}
          <TypeInstead onDone={done} placeholder="Duyduğun cümleyi yaz" />
        </>
      ) : (
        <>
          <div className="row">
            {speaking.on ? (
              <button type="button" className="btn btn-bad" onClick={() => done(speaking.finish())}>
                <span className="rec-dot" aria-hidden /> Bitir
              </button>
            ) : (
              <button type="button" className="btn btn-quiet" onClick={startSaying} disabled={audio.playing || (mode === 'exam' && audio.canPlay && audio.plays === 0)}>
                <MicIcon size={16} className="inline-icon" /> Söylemeye başla
              </button>
            )}
            {speaking.on && <PteClock left={left} />}
            <button type="button" className="link small" onClick={() => setTyping(true)}>
              <KeyboardIcon size={14} className="inline-icon" /> Yazarak dene
            </button>
          </div>
          {speaking.on && (
            <p className="small muted" aria-live="polite">
              {speaking.heard ? <span lang="en">{speaking.heard}</span> : 'Dinliyorum…'}
            </p>
          )}
        </>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Read aloud

type ReadPhase = 'prep' | 'reading' | 'checking'

export function PteReadAloud({ item, mode, onAnswer, onSkip }: PteItemProps<PteRa>) {
  const [usePron, setUsePron] = useState(() => azureEnabled() && canRecord() && !pronOff)
  const [phase, setPhase] = useState<ReadPhase>('prep')
  const [note, setNote] = useState('')
  const recorder = useRef<MediaRecorder | null>(null)
  const exam = mode === 'exam'
  const speaking = useSpeaking(
    (message) => {
      setNote(message)
      setPhase('prep')
    },
    exam ? PTE_RULES.ra.silenceSeconds : null,
    (said) => onAnswer({ score: scoreReadAloud(item.text, { heard: said }), given: said }),
  )
  const unwatch = useRef<(() => void) | null>(null)
  useEffect(
    () => () => {
      unwatch.current?.()
      if (recorder.current?.state === 'recording') recorder.current.stop()
    },
    [],
  )
  const canDo = usePron || canListen()
  const answerSeconds = usePron ? Math.min(PTE_RULES.ra.answerSeconds, PRON_MAX_SECONDS) : PTE_RULES.ra.answerSeconds

  const begin = async () => {
    setNote('')
    if (!usePron) {
      speaking.start()
      setPhase('reading')
      return
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const rec = new MediaRecorder(stream, { mimeType: recordingType() })
      const chunks: Blob[] = []
      rec.ondataavailable = (e) => e.data.size && chunks.push(e.data)
      rec.onstop = async () => {
        unwatch.current?.()
        unwatch.current = null
        stream.getTracks().forEach((t) => t.stop())
        const blob = new Blob(chunks, { type: rec.mimeType })
        setPhase('checking')
        try {
          if (!blob.size) throw new Error('empty')
          const result = await assessPronunciation(blob, item.text, 'en')
          onAnswer({ score: scoreReadAloud(item.text, { pronunciation: result.score }), given: result.heard, pronunciation: true })
        } catch {
          // The daily allowance is used up, or the service could not be reached: the words said decide instead.
          pronOff = true
          setUsePron(false)
          setNote(canListen() ? 'Telaffuz denetimi şu an kullanılamıyor (günlük hakkın bitmiş olabilir). Bu kez söylediğin kelimelerle puanlanacak: metni bir daha oku.' : 'Telaffuz denetimi şu an kullanılamıyor (günlük hakkın bitmiş olabilir).')
          setPhase('prep')
        }
      }
      recorder.current = rec
      rec.start()
      // The exam's rule: 3 s without speech closes the recording.
      if (exam) unwatch.current = watchSilence(stream, PTE_RULES.ra.silenceSeconds, () => rec.state === 'recording' && rec.stop())
      setPhase('reading')
    } catch {
      setNote('Mikrofona erişilemedi; tarayıcının mikrofon iznini kontrol et.')
      setPhase('prep')
    }
  }
  const end = () => {
    if (usePron) {
      if (recorder.current?.state === 'recording') recorder.current.stop()
      return
    }
    const said = speaking.finish()
    onAnswer({ score: scoreReadAloud(item.text, { heard: said }), given: said })
  }
  // Exam: the preparation runs out and the recording starts; the answer time runs out and it stops.
  const prepLeft = useCountdown(exam && canDo && !note ? PTE_RULES.ra.prepSeconds : null, phase === 'prep', () => void begin())
  const readLeft = useCountdown(exam ? answerSeconds : null, phase === 'reading', end)

  return (
    <div className="stack">
      <p className="small muted">
        Metni sesli oku.{' '}
        {exam
          ? `Önce ${PTE_RULES.ra.prepSeconds} saniye hazırlan; kayıt kendiliğinden başlar, en çok ${answerSeconds} saniye sürer ve ${PTE_RULES.ra.silenceSeconds} saniye sessiz kalırsan kapanır.`
          : 'Hazır olunca kaydı başlat; süre yok.'}{' '}
        {usePron ? 'Telaffuz denetimi puanlar.' : 'Söylediğin kelimeler metinle karşılaştırılır.'}
      </p>
      <p className="examtask-text pte-text" lang="en">
        {item.text}
      </p>
      {note && <p className="small cross-warn">{note}</p>}
      {!canDo ? (
        <div className="stack gap-2">
          <p className="small muted">Bu tarayıcıda konuşma tanıma da telaffuz denetimi de yok; sesli okuma için Chrome ya da Safari'yi dene.</p>
          <div className="row">
            <button type="button" className="btn btn-quiet" onClick={onSkip}>
              Bu metni geç
            </button>
          </div>
        </div>
      ) : (
        <div className="row">
          {phase === 'prep' && (
            <>
              <button type="button" className="btn" onClick={() => void begin()}>
                <MicIcon size={16} className="inline-icon" /> {exam ? 'Hemen başla' : 'Okumaya başla'}
              </button>
              {exam && <PteClock left={prepLeft} label="Hazırlık" />}
            </>
          )}
          {phase === 'reading' && (
            <>
              <button type="button" className="btn btn-bad" onClick={end}>
                <span className="rec-dot" aria-hidden /> Bitir
              </button>
              {exam && <PteClock left={readLeft} />}
            </>
          )}
          {phase === 'checking' && <span className="small muted">Değerlendiriliyor…</span>}
        </div>
      )}
      {phase === 'reading' && !usePron && (
        <p className="small muted" aria-live="polite">
          {speaking.heard ? <span lang="en">{speaking.heard}</span> : 'Dinliyorum…'}
        </p>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Fill in the blanks (dropdown)

export function PteBlanks({ item, onAnswer }: PteItemProps<PteFib>) {
  const parts = useMemo(() => blankParts(item.text), [item.text])
  // The choices in an order of their own (the content lists the answer first), the same each time for an item.
  const options = useMemo(() => {
    const rng = createRng([...item.id].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7))
    return item.blanks.map((b) => shuffle(b.options, rng))
  }, [item])
  const [chosen, setChosen] = useState<(string | undefined)[]>(() => item.blanks.map(() => undefined))
  const check = () => onAnswer({ score: scoreBlanks(chosen, item.blanks), chosen })
  return (
    <div className="stack">
      <p className="small muted">Her boşluk için listeden doğru kelimeyi seç. Her doğru boşluk bir puan.</p>
      <div className="examtask-text pte-text pte-paragraph" lang="en">
        {parts.map((p, i) =>
          'text' in p ? (
            <span key={i}>{p.text}</span>
          ) : (
            <span key={i} className="pte-blank">
              <Select value={chosen[p.blank]} options={options[p.blank].map((o) => ({ value: o, label: o }))} onChange={(v) => setChosen((c) => c.map((x, k) => (k === p.blank ? v : x)))} label={`${p.blank + 1}. boşluk`} placeholder={`${p.blank + 1}`} />
            </span>
          ),
        )}
      </div>
      <div className="row">
        <button type="button" className="btn" onClick={check} disabled={chosen.every((c) => !c)}>
          Kontrol et
        </button>
        <span className="small muted">
          {chosen.filter(Boolean).length} / {item.blanks.length} boşluk dolu
        </span>
      </div>
    </div>
  )
}

/** The paragraph with its answers in place: the right ones green, a wrong choice next to its answer. */
export function PteBlanksAnswer({ item, chosen }: { item: PteFib; chosen: readonly (string | undefined)[] }) {
  return (
    <p className="dictation-diff pte-answer-text" lang="en">
      {blankParts(item.text).map((p, i) => {
        if ('text' in p) return <span key={i}>{p.text}</span>
        const answer = item.blanks[p.blank].answer
        const given = chosen[p.blank]
        return given === answer ? (
          <span key={i} className="dd-ok">
            {answer}
          </span>
        ) : (
          <span key={i}>
            {given && <span className="dd-extra">{given}</span>} <span className="dd-missed">{answer}</span>
          </span>
        )
      })}
    </p>
  )
}

// ---------------------------------------------------------------------------
// Answer short question

export function PteShort({ item, mode, onAnswer }: PteItemProps<PteAsq>) {
  const [text, setText] = useState('')
  const [heard, setHeard] = useState(mode !== 'exam' || !canSpeak())
  const answer = useRef(text)
  answer.current = text
  const check = () => onAnswer({ score: scoreShortAnswer(answer.current, item), given: answer.current })
  const audio = usePteAudio(item.question, mode, PTE_RULES.asq.listens, () => setHeard(true))
  // Exam: the clock starts when the question has been heard; what is typed when it runs out is the answer.
  const left = useCountdown(mode === 'exam' ? PTE_RULES.asq.answerSeconds : null, mode === 'exam' && heard, check)
  return (
    <div className="stack">
      <p className="small muted">Soruyu dinle ve tek kelimeyle ya da kısa bir ifadeyle cevapla.{mode === 'exam' ? ` Soru bitince ${PTE_RULES.asq.answerSeconds} saniyen var.` : ''}</p>
      <PteListen audio={audio} mode={mode} />
      <p className="prompt-label pte-text" lang="en">
        {item.question}
      </p>
      <AnswerLine value={text} onChange={setText} onSubmit={() => text.trim() && check()} label="Cevabın" placeholder="Cevabın" />
      <div className="row">
        <button type="button" className="btn" onClick={check} disabled={!text.trim()}>
          Kontrol et
        </button>
        {mode === 'exam' && heard && <PteClock left={left} />}
      </div>
    </div>
  )
}
