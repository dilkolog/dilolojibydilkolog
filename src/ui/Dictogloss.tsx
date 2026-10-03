import { useEffect, useMemo, useState } from 'react'
import type { KelimeDB } from '../data/db'
import { STOP } from '../engine/extract'
import { readingKey } from '../engine/reading'
import type { TargetLanguage } from '../engine/types'
import { LANGUAGE_NAME } from './labels'
import { canSpeak, speakAsync, speechPrefs, stopSpeaking } from './speech'

/** Paragraphs of a comfortable dictogloss length, from the learner's reading library. */
export function glossParagraphs(texts: readonly string[]): string[] {
  return texts.flatMap((t) => t.split(/\n\s*\n/)).map((p) => p.replace(/\s+/g, ' ').trim()).filter((p) => {
    const n = p.split(' ').length
    return n >= 30 && n <= 90
  })
}

/** Content words of the original and whether the reconstruction brought each back. */
export function recallCheck(original: string, attempt: string, language: TargetLanguage): { token: string; content: boolean; recalled: boolean }[] {
  const have = new Set([...attempt.matchAll(/[\p{L}'’-]+/gu)].map((m) => readingKey(m[0], language)))
  return original.split(/(\s+)/).map((token) => {
    const word = token.replace(/^[^\p{L}]+|[^\p{L}]+$/gu, '')
    const content = word.length >= 3 && !STOP[language].has(word.toLocaleLowerCase(language))
    return { token, content, recalled: content && have.has(readingKey(word, language)) }
  })
}

/**
 * Dictogloss: a short paragraph is read aloud twice; you note key words, then rebuild the text
 * in your own sentences and compare. Rebuilding makes you notice exactly which words and forms
 * you were missing (Wajnryb 1990; Kowal & Swain 1994).
 */
export function Dictogloss({ db, language }: { db: KelimeDB; language: TargetLanguage }) {
  const [paragraphs, setParagraphs] = useState<string[] | null>(null)
  const [index, setIndex] = useState(0)
  const [plays, setPlays] = useState(0)
  const [playing, setPlaying] = useState(false)
  const [notes, setNotes] = useState('')
  const [attempt, setAttempt] = useState('')
  const [checked, setChecked] = useState(false)

  useEffect(() => {
    void db.getLibrary(language).then((lib) => {
      const all = glossParagraphs(lib.map((t) => t.text))
      setParagraphs(all.sort(() => Math.random() - 0.5))
    })
    return () => stopSpeaking()
  }, [db, language])

  const paragraph = paragraphs?.[index]
  const result = useMemo(() => (checked && paragraph ? recallCheck(paragraph, attempt, language) : null), [checked, paragraph, attempt, language])

  if (!canSpeak()) return <p className="muted">Bu tarayıcıda sesli okuma yok; dinle-yaz için sesli okuma gerekiyor.</p>
  if (!paragraphs) return null
  if (!paragraph) return <p className="muted">Önce Okuma'dan birkaç {LANGUAGE_NAME[language].toLocaleLowerCase('tr-TR')} metin ekle (haber, kitap, dinleme): paragraflar oradan seçilir.</p>

  const listen = async () => {
    setPlaying(true)
    await speakAsync(paragraph, language, speechPrefs.rate * 0.92)
    setPlaying(false)
    setPlays((n) => n + 1)
  }
  const next = () => {
    setIndex((i) => (i + 1) % paragraphs.length)
    setPlays(0)
    setNotes('')
    setAttempt('')
    setChecked(false)
  }

  const content = result?.filter((t) => t.content) ?? []
  const recalled = content.filter((t) => t.recalled).length
  return (
    <section className="stack">
      <p className="small muted">
        Okuma kütüphanendeki bir paragraf iki kez okunur. Dinlerken anahtar kelimeleri not al, sonra metni kendi cümlelerinle yeniden kur. Birebir aynısı
        gerekmez; karşılaştırınca hangi kelimeleri kaçırdığını görürsün.
      </p>
      <div className="row">
        <button className="btn" onClick={listen} disabled={playing || plays >= 2 || checked}>
          {playing ? 'Okunuyor…' : plays === 0 ? '▶ Dinle (1/2)' : plays === 1 ? '▶ Bir kez daha (2/2)' : 'İki kez dinledin'}
        </button>
        <button className="link small" onClick={next}>
          Başka paragraf
        </button>
      </div>
      <label className="field">
        <span className="small">Notların (yalnızca sana)</span>
        <textarea className="textarea textarea-sm" lang={language} value={notes} onChange={(e) => setNotes(e.target.value)} disabled={checked} placeholder="anahtar kelimeler, isimler, sayılar…" />
      </label>
      {plays >= 1 && (
        <label className="field">
          <span className="small">Metni yeniden kur</span>
          <textarea className="textarea" lang={language} value={attempt} onChange={(e) => setAttempt(e.target.value)} disabled={checked} autoCapitalize="off" autoCorrect="off" spellCheck={false} />
        </label>
      )}
      {plays >= 1 && !checked && (
        <div>
          <button className="btn" onClick={() => (stopSpeaking(), setChecked(true))} disabled={attempt.trim().split(/\s+/).length < 5}>
            Karşılaştır
          </button>
        </div>
      )}
      {result && (
        <section className="card stack">
          <p>
            İçerik kelimelerinin <strong>%{Math.round((recalled / Math.max(1, content.length)) * 100)}</strong>'ini geri getirdin ({recalled}/{content.length}).
          </p>
          <p className="dictogloss-original" lang={language}>
            {result.map((t, i) => (
              <span key={i} className={t.content ? (t.recalled ? 'dg-hit' : 'dg-miss') : undefined}>
                {t.token}
              </span>
            ))}
          </p>
          <p className="small muted">
            <span className="dg-hit">yeşil</span>: senin metninde var · <span className="dg-miss">kırmızı</span>: kaçırdığın. Kırmızılardan tanımadıklarını okuma ekranında
            işaretleyip ekleyebilirsin.
          </p>
          <div>
            <button className="btn" onClick={next}>
              Sıradaki paragraf
            </button>
          </div>
        </section>
      )}
    </section>
  )
}
