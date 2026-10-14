import '../lazy.css'
import { useEffect, useMemo, useState } from 'react'
import { recentTranslations, translate, TranslateError } from '../data/translate'
import type { TranslationEntry } from '../engine/translationMemory'
import type { TargetLanguage } from '../engine/types'
import { PageHeader } from './PageHeader'
import { LANGUAGE_NAME } from './labels'
import { saveSentence } from './saveSentence'
import { canSpeak, speak } from './speech'
import { useTranslationReady } from './useTranslationReady'
import { showToast } from './toastFeed'
import { ClipboardIcon, CloseIcon, CopyIcon, GlobeIcon, PlusIcon, SpeakerIcon, SwapIcon } from './icons'
import { MAX_TOTAL, sentencesOf, stripLabel, uniquePairs } from './translateSentences'
import { timeOf } from '../engine/types'

/** Entries of the memory shown before "more". */
const RECENT_SHOWN = 5
/**
 * When this device's list of recent translations was last cleared. Clearing only hides them here:
 * the translations stay in the memory (no sentence is sent to be translated again, and back
 * translation still has them).
 */
const CLEARED_KEY = 'diloloji:translate-cleared'
const clearedAt = () => {
  try {
    return localStorage.getItem(CLEARED_KEY) ?? ''
  } catch {
    return ''
  }
}
const setClearedAt = (at: string) => {
  try {
    if (at) localStorage.setItem(CLEARED_KEY, at)
    else localStorage.removeItem(CLEARED_KEY)
  } catch {
    // Not kept: the list shows again next time.
  }
}

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
  const [allRecent, setAllRecent] = useState(false)
  const loadRecent = () =>
    void recentTranslations()
      .then((all) => setRecent(uniquePairs(all.filter((e) => (e.from === language || e.to === language) && timeOf(e.at) > timeOf(clearedAt()))).slice(0, 30)))
      .catch(() => undefined)
  const shownRecent = useMemo(() => (allRecent ? recent : recent.slice(0, RECENT_SHOWN)), [recent, allRecent])
  /** What is still waiting for its translation while a text is being translated: grey lines in its place. */
  const [waiting, setWaiting] = useState(0)
  useEffect(loadRecent, [language]) // eslint-disable-line react-hooks/exhaustive-deps

  const run = async () => {
    // A label pasted with the sentence ("Örnek: …") is dropped, and a sentence repeated in the text is asked once.
    const parts = sentencesOf(text).map(stripLabel).filter(Boolean)
    if (!parts.length || tooLong || busy) return
    setBusy(true)
    setError('')
    setWaiting(parts.length)
    const out: Pair[] = []
    const done = new Map<string, string>()
    try {
      for (const source of parts) {
        const translation = done.get(source) ?? (await translate(source, from, to))
        done.set(source, translation)
        out.push({ source, translation })
        setPairs([...out])
        setWaiting(parts.length - out.length)
      }
    } catch (e) {
      setError(e instanceof TranslateError ? e.message : 'Çeviri şu an alınamadı.')
    } finally {
      setBusy(false)
      setWaiting(0)
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

  /** The other direction; with a result on screen, its translation becomes the new text to translate. */
  const swap = () => {
    if (pairs.length) setText(pairs.map((p) => p.translation).join(' '))
    setToTurkish(!toTurkish)
    setPairs([])
  }
  const paste = async () => {
    try {
      const clip = await navigator.clipboard.readText()
      if (clip.trim()) setText(clip)
    } catch {
      showToast('Panoya erişilemedi; metni elle yapıştır.', undefined, 3500, 'info')
    }
  }
  const copy = (value: string, done: string) => {
    void navigator.clipboard?.writeText(value)
    showToast(done)
  }
  const reuse = (e: TranslationEntry) => {
    const fromLearned = e.from === language
    setToTurkish(fromLearned)
    setText(e.text)
    setPairs([{ source: e.text, translation: e.translation }])
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const tag = (e: TranslationEntry) => `${e.from === 'tr' ? 'TR' : (e.from ?? '').toUpperCase() || '?'} → ${e.to.toUpperCase()}`
  const hasResult = pairs.length > 0 || busy

  return (
    <div className="stack translate-screen">
      <PageHeader art="translate" title="Çeviri" sub={`${name} bir cümle ya da kısa bir metin: cümle cümle, yan yana.`} />
      {!ready ? (
        <p className="note">Çeviri şu an kullanılamıyor (çevrimdışı ya da sunucuda kurulmamış).</p>
      ) : (
        <div className={`translate-grid${hasResult ? ' has-result' : ''}`}>
          <section className="card stack translate-input" aria-label="Metin girişi">
            <div className="translate-dir" role="group" aria-label="Yön">
              <span className="translate-lang" lang={from}>
                {toTurkish ? name : 'Türkçe'}
              </span>
              <button type="button" className="icon-btn translate-swap" onClick={swap} aria-label="Yönü değiştir" title={pairs.length ? 'Yönü değiştir ve çeviriyi yeni metin yap' : 'Yönü değiştir'}>
                <SwapIcon size={18} />
              </button>
              <span className="translate-lang" lang={to}>
                {toTurkish ? 'Türkçe' : name}
              </span>
            </div>
            <div className="translate-field">
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
              {text ? (
                <button type="button" className="icon-btn icon-btn-sm translate-clear" onClick={() => (setText(''), setPairs([]))} aria-label="Metni temizle">
                  <CloseIcon size={14} />
                </button>
              ) : (
                <button type="button" className="btn btn-quiet btn-sm translate-paste" onClick={paste}>
                  <ClipboardIcon size={15} className="inline-icon" /> Yapıştır
                </button>
              )}
            </div>
            <div className="row justify-between translate-foot">
              <span className={`small ${tooLong ? 'error' : 'muted'}`}>
                {text.trim().length.toLocaleString('tr-TR')} / {MAX_TOTAL.toLocaleString('tr-TR')} karakter
                {!tooLong && text.trim() && (
                  <span className="translate-hint">
                    {' · '}
                    <kbd>⌘</kbd> <kbd>Enter</kbd>
                  </span>
                )}
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

          {hasResult ? (
            <section className="card stack translate-result" aria-label="Çeviri">
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
                      <span className="row gap-2 translate-actions">
                        {canSpeak() && (
                          <button type="button" className="icon-btn icon-btn-sm" aria-label="Dinle" title="Dinle" onClick={() => speak(sentence, language)}>
                            <SpeakerIcon size={15} />
                          </button>
                        )}
                        <button type="button" className="icon-btn icon-btn-sm" aria-label="Çeviriyi kopyala (cümle)" title="Bu cümlenin çevirisini kopyala" onClick={() => copy(p.translation, 'Cümlenin çevirisi kopyalandı.')}>
                          <CopyIcon size={15} />
                        </button>
                        <button type="button" className="link small" disabled={kept.has(sentence)} onClick={() => keep(p)}>
                          <PlusIcon size={14} className="inline-icon" /> {kept.has(sentence) ? 'Kaydedildi' : 'Kart yap'}
                        </button>
                      </span>
                    </li>
                  )
                })}
                {Array.from({ length: waiting }, (_, i) => (
                  <li key={`wait-${i}`} className="translate-wait" aria-hidden>
                    <span className="sk sk-line" />
                    <span className="sk sk-line" />
                  </li>
                ))}
              </ol>
              {pairs.length > 0 && (
                <div className="row translate-all">
                  {single && onAdd && (
                    <button
                      type="button"
                      className="btn btn-sm"
                      onClick={() => (toTurkish ? onAdd(pairs[0].source, pairs[0].translation) : onAdd(pairs[0].translation, pairs[0].source))}
                    >
                      <PlusIcon size={16} /> Kelimelerime ekle
                    </button>
                  )}
                  <button type="button" className="btn btn-quiet btn-sm" onClick={() => copy(pairs.map((p) => p.translation).join(' '), 'Çeviri kopyalandı.')}>
                    <CopyIcon size={15} className="inline-icon" /> Çeviriyi kopyala
                  </button>
                </div>
              )}
            </section>
          ) : (
            <section className="card translate-placeholder" aria-hidden>
              <GlobeIcon size={28} />
              <p className="muted">Çeviri burada görünür: her cümle yanında kendi çevirisiyle, dinlenebilir ve cümle kartı yapılabilir.</p>
            </section>
          )}
        </div>
      )}
      {shownRecent.length > 0 && (
        <section className="card stack" aria-label="Son çevirilerin">
          <div className="row justify-between items-baseline gap-2">
            <h2 className="section-title">Son çevirilerin</h2>
            <button
              type="button"
              className="link small"
              onClick={() => {
                const before = clearedAt()
                const hidden = recent
                setClearedAt(new Date().toISOString())
                setRecent([])
                showToast('Geçmiş temizlendi.', {
                  label: 'Geri al',
                  run: () => {
                    setClearedAt(before)
                    setRecent(hidden)
                  },
                })
              }}
            >
              Geçmişi temizle
            </button>
          </div>
          <p className="small muted">Bu cihazda saklanır, yedeğe ve eşitlemeye girer; aynı cümle bir daha çevrilmez. Birine dokununca yeniden açılır.</p>
          <ol className="translate-pairs translate-recent">
            {shownRecent.map((e) => (
              <li key={`${e.at}${e.text}`}>
                <button type="button" className="translate-recent-btn" onClick={() => reuse(e)}>
                  <span className="pill translate-dirtag">{tag(e)}</span>
                  <span className="translate-source" lang={e.from ?? undefined}>
                    {e.text}
                  </span>
                  <span className="translate-target" lang={e.to}>
                    {e.translation}
                  </span>
                </button>
              </li>
            ))}
          </ol>
          {recent.length > RECENT_SHOWN && (
            <button type="button" className="link small" onClick={() => setAllRecent((a) => !a)} aria-expanded={allRecent}>
              {allRecent ? 'Daha az göster' : `Hepsini göster (${recent.length})`}
            </button>
          )}
        </section>
      )}
    </div>
  )
}
