import { useState } from 'react'
import { translate, TranslateError, type TranslateLang } from '../data/translate'
import { GlobeIcon, SpeakerIcon } from './icons'
import { speakAsync, speakTurkishAsync } from './speech'
import { useTranslationReady } from './useTranslationReady'

/**
 * "Çevir": fills a Turkish translation field from the sentence (DeepL through the app's server).
 * Hidden when translation is off or there is nothing to translate.
 */
export function TranslateButton({ text, from, onTranslated, label = 'Çevir' }: { text: string; from: TranslateLang; onTranslated: (translation: string) => void; label?: string }) {
  const ready = useTranslationReady()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  if (!ready || !text.trim()) return null
  return (
    <span className="translate-btn">
      <button
        type="button"
        className="link small"
        disabled={busy}
        onClick={async () => {
          setBusy(true)
          setError('')
          try {
            onTranslated(await translate(text, from))
          } catch (e) {
            setError(e instanceof TranslateError ? e.message : 'Çeviri şu an alınamadı.')
          } finally {
            setBusy(false)
          }
        }}
      >
        <GlobeIcon size={14} className="inline-icon" /> {busy ? 'Çevriliyor…' : label}
      </button>
      {error && (
        <span className="small error" role="status">
          {error}
        </span>
      )}
    </span>
  )
}

/**
 * A sentence's Turkish on request, right under it (reading: the sentence of the word looked up).
 * One tap; the answer comes from the translation memory when the sentence was translated before.
 * Once there, it can be heard: the Turkish alone, or the sentence and then its Turkish.
 */
export function SentenceTranslation({ sentence, from }: { sentence: string; from: TranslateLang }) {
  const [shown, setShown] = useState('')
  const [playing, setPlaying] = useState(false)
  const play = async (both: boolean) => {
    setPlaying(true)
    try {
      if (both && from !== 'tr') await speakAsync(sentence, from)
      await speakTurkishAsync(shown)
    } catch {
      // No voice for it on this device: the text is still there.
    } finally {
      setPlaying(false)
    }
  }
  if (shown)
    return (
      <>
        <p className="small muted sentence-tr" lang="tr">
          {shown}
        </p>
        <p className="small sentence-tr-listen">
          <button type="button" className="link small" disabled={playing} onClick={() => void play(false)}>
            <SpeakerIcon size={14} className="inline-icon" /> Türkçesini dinle
          </button>
          {from !== 'tr' && (
            <>
              {' '}
              <button type="button" className="link small" disabled={playing} onClick={() => void play(true)}>
                Cümle, sonra Türkçesi
              </button>
            </>
          )}
        </p>
      </>
    )
  return <TranslateButton text={sentence} from={from} onTranslated={setShown} label="Cümlenin Türkçesi" />
}
