import { useEffect, useState } from 'react'
import { translate, translationReady, TranslateError, type TranslateLang } from '../data/translate'
import { GlobeIcon } from './icons'

/** Whether sentence translation is on (the server has a key); false until known. */
export function useTranslationReady(): boolean {
  const [ready, setReady] = useState(false)
  useEffect(() => {
    let live = true
    void translationReady().then((r) => live && setReady(r))
    return () => {
      live = false
    }
  }, [])
  return ready
}

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
 */
export function SentenceTranslation({ sentence, from }: { sentence: string; from: TranslateLang }) {
  const [shown, setShown] = useState('')
  if (shown)
    return (
      <p className="small muted sentence-tr" lang="tr">
        {shown}
      </p>
    )
  return <TranslateButton text={sentence} from={from} onTranslated={setShown} label="Cümlenin Türkçesi" />
}
