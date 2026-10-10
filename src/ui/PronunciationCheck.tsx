import { useEffect, useRef, useState } from 'react'
import type { KelimeDB } from '../data/db'
import { displayForm } from '../engine/exercises'
import type { TargetLanguage, VocabularyEntry } from '../engine/types'
import { playWord, speak } from './speech'
import { canRecord, recordingType } from './audioRecord'
import { MicIcon, PlayIcon, SpeakerIcon } from './icons'
import { assessPronunciation, type PronResult } from './pronunciation'
import { Ring } from './Ring'

/** Long enough for a sentence, within the API's 30 seconds. */
const MAX_MS = 12000

const tone = (accuracy: number) => (accuracy >= 80 ? 'is-good' : accuracy >= 60 ? 'is-near' : 'is-bad')
const verdict = (score: number) =>
  score >= 85 ? 'Çok iyi; anadili konuşana çok yakın.' : score >= 60 ? 'İyi. Turuncu ve kırmızı kelimelere dikkat: doğrusunu dinleyip onları tekrar söyle.' : 'Doğrusunu dinle, sonra yavaşça ve kelime kelime tekrar dene.'

/**
 * Say the text, get it scored (Azure): overall, accuracy, fluency, completeness, and each word
 * coloured by how close it was. Hearing the model and one's own attempt side by side is where
 * the feedback becomes usable, so both are a tap away.
 */
export function PronunciationCheck({ text, language, onModel, onScore }: { text: string; language: TargetLanguage; onModel: () => void; onScore?: (score: number) => void }) {
  const [state, setState] = useState<'idle' | 'recording' | 'checking' | 'done'>('idle')
  const [result, setResult] = useState<PronResult | null>(null)
  const [error, setError] = useState('')
  const [url, setUrl] = useState<string>()
  const recorder = useRef<MediaRecorder | null>(null)
  const timer = useRef<number>(undefined)
  useEffect(() => () => {
    if (url) URL.revokeObjectURL(url)
  }, [url])
  // A new text starts over.
  useEffect(() => {
    setState('idle')
    setResult(null)
    setError('')
  }, [text])

  const start = async () => {
    setError('')
    setResult(null)
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const rec = new MediaRecorder(stream, { mimeType: recordingType() })
      const chunks: Blob[] = []
      rec.ondataavailable = (e) => e.data.size && chunks.push(e.data)
      rec.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop())
        const blob = new Blob(chunks, { type: rec.mimeType })
        if (!blob.size) {
          setError('Kayıt boş geldi; mikrofonun açık olduğundan emin olup tekrar dene.')
          setState('idle')
          return
        }
        setUrl(URL.createObjectURL(blob))
        setState('checking')
        try {
          const r = await assessPronunciation(blob, text, language)
          setResult(r)
          onScore?.(r.score)
          setState('done')
        } catch (e) {
          setError(e instanceof Error ? e.message : 'Değerlendirilemedi.')
          setState('idle')
        }
      }
      recorder.current = rec
      rec.start()
      setState('recording')
      timer.current = window.setTimeout(stop, MAX_MS)
    } catch {
      setError('Mikrofona erişilemedi; tarayıcının mikrofon iznini kontrol et.')
    }
  }
  const stop = () => {
    window.clearTimeout(timer.current)
    if (recorder.current?.state === 'recording') recorder.current.stop()
  }

  if (!canRecord()) return <p className="small muted">Bu tarayıcı ses kaydını desteklemiyor.</p>

  return (
    <div className="stack gap-3 pron-check">
      <div className="row">
        {state === 'recording' ? (
          <button type="button" className="btn btn-bad" onClick={stop}>
            <span className="rec-dot" aria-hidden /> Bitir
          </button>
        ) : (
          <button type="button" className="btn" onClick={start} disabled={state === 'checking'}>
            <MicIcon size={16} className="inline-icon" />
            {state === 'checking' ? 'Değerlendiriliyor…' : result ? 'Tekrar söyle' : 'Söyle ve puanla'}
          </button>
        )}
        <button type="button" className="btn btn-quiet" onClick={onModel}>
          <SpeakerIcon size={16} className="inline-icon" />
          Doğrusunu dinle
        </button>
        {url && state !== 'recording' && (
          <button type="button" className="btn btn-quiet" onClick={() => void new Audio(url).play()}>
            <PlayIcon size={14} className="inline-icon" />
            Kaydım
          </button>
        )}
      </div>
      {state === 'recording' && <p className="small muted">Dinliyorum… “{text}” de, sonra Bitir'e bas.</p>}
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      {result && (
        <div className="pron-result" aria-live="polite">
          <Ring value={result.score / 100} size={84} stroke={9} label={String(result.score)} />
          <div className="stack gap-2">
            <p className="pron-verdict">{verdict(result.score)}</p>
            <dl className="pron-scores">
              <div>
                <dt>Doğruluk</dt>
                <dd>{result.accuracy}</dd>
              </div>
              <div>
                <dt>Akıcılık</dt>
                <dd>{result.fluency}</dd>
              </div>
              <div>
                <dt>Eksiksizlik</dt>
                <dd>{result.completeness}</dd>
              </div>
              {result.prosody !== undefined && (
                <div>
                  <dt>Tonlama</dt>
                  <dd>{result.prosody}</dd>
                </div>
              )}
            </dl>
            {result.words.length > 0 && (
              <ul className="pron-words" lang={language} aria-label="Kelime kelime">
                {result.words.map((w, i) => (
                  <li key={i} className={w.error === 'Omission' ? 'is-omitted' : w.error === 'Insertion' ? 'is-inserted' : tone(w.accuracy)} title={w.error === 'Omission' ? 'atlandı' : w.error === 'Insertion' ? 'metinde yok' : `${w.accuracy}/100`}>
                    {w.word}
                    <span className="sr-only">{w.error === 'Omission' ? ' atlandı' : w.error === 'Insertion' ? ' metinde yok' : ` ${w.accuracy} puan`}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

/** On the word page: the word or its first example, scored, with the last and best scores. */
export function WordPronunciation({ db, entry }: { db: KelimeDB; entry: VocabularyEntry }) {
  const example = entry.senses[0].examples[0]?.text.replace(/\*/g, '')
  const [what, setWhat] = useState<'word' | 'sentence'>('word')
  const [scores, setScores] = useState<{ at: string; score: number }[]>([])
  useEffect(() => {
    void db.getPronScores(entry.id).then(setScores)
  }, [db, entry.id])
  const text = what === 'sentence' && example ? example : displayForm(entry)
  const best = scores.length ? Math.max(...scores.map((s) => s.score)) : null
  return (
    <section className="section stack">
      <h2 className="section-title">Söyle ve puanla</h2>
      <p className="small muted">
        Söylediğin, ana dili konuşanların telaffuzuyla karşılaştırılır; her kelime ne kadar yakın olduğuna göre renklenir.
        {scores.length > 0 && ` Son puanın ${scores[scores.length - 1].score}, en iyisi ${best} (${scores.length} deneme).`}
      </p>
      {example && (
        <div className="seg-group" role="radiogroup" aria-label="Ne söylenecek">
          <button type="button" role="radio" className="seg-btn" aria-checked={what === 'word'} onClick={() => setWhat('word')}>
            Kelime
          </button>
          <button type="button" role="radio" className="seg-btn" aria-checked={what === 'sentence'} onClick={() => setWhat('sentence')}>
            Örnek cümle
          </button>
        </div>
      )}
      <p className="pron-target" lang={entry.language}>
        {text}
      </p>
      <PronunciationCheck
        text={text}
        language={entry.language}
        onModel={() => (what === 'word' ? playWord(entry) : speak(text, entry.language))}
        onScore={(score) => {
          // Only the word itself makes the word's history.
          if (what !== 'word') return
          void db.addPronScore(entry.id, score).then(() => db.getPronScores(entry.id).then(setScores))
        }}
      />
    </section>
  )
}
