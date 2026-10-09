import { useEffect, useState } from 'react'
import { recentTranslations, translate, TranslateError } from '../data/translate'
import type { TranslationEntry } from '../engine/translationMemory'
import type { TargetLanguage } from '../engine/types'
import { PageHeader } from './PageHeader'
import { LANGUAGE_NAME } from './labels'
import { saveSentence } from './Sentences'
import { canSpeak, speak } from './speech'
import { useTranslationReady } from './useTranslationReady'
import { showToast } from './toast'
import { PlusIcon, SpeakerIcon } from './icons'
import { MAX_TOTAL, sentencesOf } from './translateSentences'

interface Pair {
  source: string
  translation: string
}

/**
 * Translation on demand: a sentence or a short text, from the language being learned into Turkish
 * or the other way, shown sentence by sentence side by side (the way a learner reads a
 * translation). A sentence in the learner's language can be heard and kept as a sentence card.
 * DeepL through the app's server; the same sentence is translated once.
 */
export function TranslateScreen({ language, onAdd }: { language: TargetLanguage; onAdd?: (word: string, meaning: string) => void }) {
  const ready = useTranslationReady()
  const [toTurkish, setToTurkish] = useState(true)
  const [text, setText] = useState('')
  const [pairs, setPairs] = useState<Pair[]>([])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [kept, setKept] = useState<ReadonlySet<string>>(new Set())
  const from = toTurkish ? language : 'tr'
  const to = toTurkish ? 'tr' : language
  const name = LANGUAGE_NAME[language]
  const tooLong = text.trim().length > MAX_TOTAL
  // The translation memory: what was translated before (here or anywhere in the app), newest first.
  const [recent, setRecent] = useState<TranslationEntry[]>([])
  const loadRecent = () =>
    void recentTranslations()
      .then((all) => setRecent(all.filter((e) => e.from === language || e.to === language).slice(0, 20)))
      .catch(() => undefined)
  useEffect(loadRecent, [language]) // eslint-disable-line react-hooks/exhaustive-deps

  const run = async () => {
    const parts = sentencesOf(text)
    if (!parts.length || tooLong || busy) return
    setBusy(true)
    setError('')
    const out: Pair[] = []
    try {
      for (const source of parts) {
        out.push({ source, translation: await translate(source, from, to) })
        setPairs([...out])
      }
    } catch (e) {
      setError(e instanceof TranslateError ? e.message : 'Çeviri şu an alınamadı.')
    } finally {
      setBusy(false)
      // The memory is written in the background: read it a moment later.
      setTimeout(loadRecent, 300)
    }
  }
  /** A single word (or a short phrase) in the learner's language, with its Turkish: one tap to the add form. */
  const single = pairs.length === 1 && (toTurkish ? pairs[0].source : pairs[0].translation).trim().split(/\s+/).length <= 3

  /** The pair as a sentence card: the learner's language as the sentence, Turkish as its meaning. */
  const keep = async (p: Pair) => {
    const sentence = toTurkish ? p.source : p.translation
    const meaning = toTurkish ? p.translation : p.source
    const ok = await saveSentence({ language, text: sentence, translation: meaning, source: 'Çeviri' })
    setKept((k) => new Set(k).add(sentence))
    showToast(ok ? 'Cümle kartı olarak kaydedildi: Oyunlar → Cümle kartları' : 'Bu cümle zaten kayıtlı', undefined, 3500, ok ? 'success' : 'info')
  }

  return (
    <div className="stack translate-screen">
      <PageHeader title="Çeviri" sub={`${name} bir cümle ya da kısa bir metin: cümle cümle, yan yana.`} />
      {!ready ? (
        <p className="note">Çeviri şu an kullanılamıyor (çevrimdışı ya da sunucuda kurulmamış).</p>
      ) : (
        <section className="card stack">
          <div className="segmented" role="group" aria-label="Yön">
            <button type="button" className="segmented-btn" aria-pressed={toTurkish} onClick={() => (setToTurkish(true), setPairs([]))}>
              {name} → Türkçe
            </button>
            <button type="button" className="segmented-btn" aria-pressed={!toTurkish} onClick={() => (setToTurkish(false), setPairs([]))}>
              Türkçe → {name}
            </button>
          </div>
          <textarea
            className="textarea"
            lang={from}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) void run()
            }}
            placeholder={toTurkish ? `${name} metni yaz ya da yapıştır` : 'Türkçe metni yaz ya da yapıştır'}
            aria-label="Çevrilecek metin"
          />
          <div className="row justify-between">
            <span className={`small ${tooLong ? 'error' : 'muted'}`}>
              {text.trim().length.toLocaleString('tr-TR')} / {MAX_TOTAL.toLocaleString('tr-TR')} karakter
            </span>
            <button type="button" className="btn" onClick={run} disabled={busy || !text.trim() || tooLong}>
              {busy ? 'Çevriliyor…' : 'Çevir'}
            </button>
          </div>
          {error && (
            <p className="error" role="status">
              {error}
            </p>
          )}
        </section>
      )}
      {pairs.length > 0 && (
        <section className="card stack" aria-label="Çeviri">
          <ol className="translate-pairs">
            {pairs.map((p, i) => {
              const sentence = toTurkish ? p.source : p.translation
              return (
                <li key={i}>
                  <p className="translate-source" lang={from}>
                    {p.source}
                  </p>
                  <p className="translate-target" lang={to}>
                    {p.translation}
                  </p>
                  <span className="row gap-2">
                    {canSpeak() && (
                      <button type="button" className="icon-btn icon-btn-sm" aria-label="Dinle" onClick={() => speak(sentence, language)}>
                        <SpeakerIcon size={15} />
                      </button>
                    )}
                    <button type="button" className="link small" disabled={kept.has(sentence)} onClick={() => keep(p)}>
                      <PlusIcon size={14} className="inline-icon" /> {kept.has(sentence) ? 'Kaydedildi' : 'Kart yap'}
                    </button>
                  </span>
                </li>
              )
            })}
          </ol>
          <div className="row">
            {single && onAdd && (
              <button
                type="button"
                className="btn btn-sm"
                onClick={() => (toTurkish ? onAdd(pairs[0].source, pairs[0].translation) : onAdd(pairs[0].translation, pairs[0].source))}
              >
                <PlusIcon size={16} /> Kelimelerime ekle
              </button>
            )}
            <button
              type="button"
              className="btn btn-quiet btn-sm"
              onClick={() => {
                void navigator.clipboard?.writeText(pairs.map((p) => p.translation).join(' '))
                showToast('Çeviri kopyalandı.')
              }}
            >
              Çeviriyi kopyala
            </button>
          </div>
        </section>
      )}
      {recent.length > 0 && (
        <section className="card stack" aria-label="Son çevirilerin">
          <h2 className="section-title">Son çevirilerin</h2>
          <p className="small muted">Bu cihazda saklanır, yedeğe ve eşitlemeye girer; aynı cümle bir daha çevrilmez.</p>
          <ol className="translate-pairs">
            {recent.map((e) => (
              <li key={`${e.at}${e.text}`}>
                <p className="translate-source" lang={e.from ?? undefined}>
                  {e.text}
                </p>
                <p className="translate-target" lang={e.to}>
                  {e.translation}
                </p>
              </li>
            ))}
          </ol>
        </section>
      )}
    </div>
  )
}
