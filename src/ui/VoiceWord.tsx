import { useEffect, useRef, useState } from 'react'
import { AiError, enrichWords, type WordInfo } from '../ai'
import type { KelimeDB } from '../data/db'
import type { TargetLanguage, VocabularyEntry } from '../engine/types'
import { addWordInfos } from './addWordInfos'
import { useAi } from './aiContext'
import { LANGUAGE_NAME } from './labels'
import { canListen, listen, type Listening } from './speechInput'

/** The words a recognised phrase may be: one word or a short expression, not a sentence. */
const MAX_WORDS = 4

/**
 * A word by voice: say it into the microphone in the language being learned, check what was heard (the other
 * guesses of the browser are offered too), and the AI prepares the card (lemma, meanings, example). Nothing is
 * added until the learner presses "Ekle".
 */
export function VoiceWord({ db, language, vocabulary, onAdded }: { db: KelimeDB; language: TargetLanguage; vocabulary: VocabularyEntry[]; onAdded: () => void }) {
  const { apiKey, needsApproval } = useAi()
  const [listening, setListening] = useState(false)
  const [heard, setHeard] = useState('')
  const [guesses, setGuesses] = useState<string[]>([])
  const [card, setCard] = useState<WordInfo | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState<{ word: string; listName?: string } | null>(null)
  const stop = useRef<Listening | null>(null)

  useEffect(() => () => stop.current?.(), [])
  // Another language, another word.
  useEffect(() => {
    stop.current?.()
    setListening(false)
    setHeard('')
    setGuesses([])
    setCard(null)
    setError('')
  }, [language])

  const say = () => {
    if (listening) {
      stop.current?.finish()
      return
    }
    setError('')
    setDone(null)
    setCard(null)
    setHeard('')
    setGuesses([])
    setListening(true)
    stop.current = listen(language, {
      onInterim: setHeard,
      onFinal: (alts) => {
        const clean = alts.map((a) => a.replace(/[.!?¿¡,;:]+/g, '').trim()).filter((a) => a && a.split(/\s+/).length <= MAX_WORDS)
        if (!clean.length) {
          setError('Tek bir kelime ya da kısa bir kalıp söyle.')
          setHeard('')
          return
        }
        setHeard(clean[0])
        setGuesses([...new Set(clean.slice(1))])
      },
      onError: (message) => setError(message),
      onEnd: () => setListening(false),
    })
  }

  const prepare = async () => {
    if (!apiKey || !heard.trim()) return
    setBusy(true)
    setError('')
    setCard(null)
    try {
      const word = heard.trim()
      const out = await enrichWords(apiKey, language, [{ word }])
      const info = out.get(word.toLocaleLowerCase()) ?? [...out.values()][0]
      if (!info || !info.meanings.length) setError('Bu söz için bir kart hazırlanamadı. Yeniden söylemeyi dene.')
      else if (vocabulary.some((v) => v.language === language && v.lemma.toLocaleLowerCase(language) === info.lemma.toLocaleLowerCase(language))) setError(`“${info.lemma}” zaten kelimelerinde var.`)
      else setCard(info)
    } catch (e) {
      setError(e instanceof AiError ? e.message : 'Kart hazırlanamadı.')
    } finally {
      setBusy(false)
    }
  }

  const add = async () => {
    if (!card) return
    const result = await addWordInfos(db, language, vocabulary, [card])
    if (result.added) setDone({ word: card.lemma, listName: result.listName })
    else setError('Kart eklenemedi.')
    setCard(null)
    setHeard('')
    setGuesses([])
    onAdded()
  }

  if (!canListen()) return null
  return (
    <details className="card voice-word">
      <summary>Sesle kelime ekle</summary>
      <div className="stack mt-3">
        <p className="small muted">
          Mikrofona bir {LANGUAGE_NAME[language]} kelimesi söyle; YZ kartını hazırlasın (anlam, örnek cümle). Eklemeden önce sen onaylarsın.
        </p>
        {!apiKey && <p className="small muted">{needsApproval ? 'YZ özellikleri hesabının onaylanmasını bekliyor.' : 'Bunun için Ayarlar → YZ yardımcısı bölümünde bir anahtar gerekiyor.'}</p>}
        <div className="row">
          <button type="button" className="btn btn-quiet" onClick={say} disabled={!apiKey || busy} aria-pressed={listening}>
            {listening ? 'Dinliyorum… (bitirmek için dokun)' : 'Söyle'}
          </button>
        </div>
        {(heard || guesses.length > 0) && (
          <div className="stack gap-2">
            <label className="stack gap-1">
              <span className="small muted">Duyduğum</span>
              <input className="input" value={heard} lang={language} onChange={(e) => setHeard(e.target.value)} disabled={listening || busy} />
            </label>
            {guesses.length > 0 && !listening && (
              <div className="choice-row" role="group" aria-label="Diğer olasılıklar" lang={language}>
                {guesses.map((g) => (
                  <button key={g} type="button" className="chip chip-sm" onClick={() => setHeard(g)}>
                    {g}
                  </button>
                ))}
              </div>
            )}
            {!listening && (
              <div className="row">
                <button type="button" className="btn btn-sm" onClick={() => void prepare()} disabled={busy || !heard.trim()}>
                  {busy ? 'Kart hazırlanıyor…' : 'Kartı hazırla'}
                </button>
              </div>
            )}
          </div>
        )}
        {error && <p className="error" role="alert">{error}</p>}
        {done && (
          <p className="small" role="status">
            “{done.word}” eklendi{done.listName ? ` (“${done.listName}” listesine)` : ''}.
          </p>
        )}
        {card && (
          <div className="stack gap-2" aria-label="Hazırlanan kart">
            <p>
              <strong lang={language}>{card.lemma}</strong> <span className="muted">{card.meanings.join(', ')}</span>
              <br />
              <span className="small muted" lang={language}>
                {card.example.replace(/\*/g, '')}
              </span>
            </p>
            <div className="row">
              <button type="button" className="btn btn-sm" onClick={() => void add()}>
                Ekle
              </button>
              <button type="button" className="link small" onClick={() => setCard(null)}>
                Vazgeç
              </button>
            </div>
          </div>
        )}
      </div>
    </details>
  )
}
