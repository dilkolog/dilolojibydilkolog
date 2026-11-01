import { useState } from 'react'
import type { TargetLanguage, UserWordState, VocabularyEntry } from '../engine/types'
import { masteryStage } from '../engine/mastery'
import { nextReviewAt } from '../engine/review'
import { isDifficult } from '../engine/difficult'
import { scheduler } from '../data/instance'
import { STAGE_NAME, POS_NAME } from './labels'
import { relativeTime } from './format'
import { collocations } from '../data/collocations'
import { collocationsOf } from '../engine/collocations'

export function DictionaryStatus({ own, state }: { own: VocabularyEntry; state?: UserWordState }) {
  const next = state && nextReviewAt(state)
  const cards = Object.values(state?.skills ?? {}).filter(c => c.reps > 0)
  const recall = cards.length ? Math.round(Math.min(...cards.map(c => scheduler.retrievability(c, new Date()))) * 100) : null
  const hard = isDifficult(own) || (state?.stats.consecutiveWrong ?? 0) >= 2
  return <div className="dict-learning-status note note-soft" aria-label="Öğrenme durumu">
    <strong>{hard ? 'Zor kelime' : state ? STAGE_NAME[masteryStage(state)] : 'Kelimelerinde · henüz çalışılmadı'}</strong>
    {next && <span> · Sıradaki tekrar {relativeTime(next)}</span>}
    {recall !== null && <span> · En zayıf beceride hatırlama %{recall}</span>}
    {!!state?.stats.wrong && <span> · {state.stats.wrong} yanlış cevap</span>}
  </div>
}

export function DictionaryPatterns({ language, word }: { language: TargetLanguage; word: string }) {
  const items = collocationsOf(collocations, language, word, 4)
  if (!items.length) return null
  return <section className="section stack" aria-label="Kalıplar">
    <h3 className="section-title">Kalıplar · nasıl kullanılır?</h3>
    <ul className="example-list">{items.map(c => <li key={c.id}>
      <div><strong className="chip chip-sm" lang={language}>{c.pattern}</strong>
        <p className="sentence" lang={language}>{c.example}</p><p className="sentence-tr">{c.tr}</p>
        <p className="small muted">Kaynak: {c.source}</p></div>
    </li>)}</ul>
  </section>
}

export function DictionarySentence({ onSave }: { onSave: (text: string) => Promise<void> }) {
  const [text, setText] = useState('')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  return <form className="dict-personal-sentence stack gap-2" onSubmit={async e => {
    e.preventDefault()
    if (!text.trim() || busy) return
    setBusy(true); setMessage('')
    try { await onSave(text.trim()); setText(''); setMessage('Kendi cümlen kelime kartına kaydedildi.') }
    catch (error) { setMessage(error instanceof Error ? error.message : 'Cümle kaydedilemedi. Tekrar dene.') }
    finally { setBusy(false) }
  }}>
    <label className="small" htmlFor="dict-personal-sentence"><strong>Kendi cümleni yaz</strong></label>
    <div className="row nowrap"><input id="dict-personal-sentence" className="input" value={text} maxLength={2000} onChange={e => setText(e.target.value)} placeholder="Bu kelimeyle kendi hayatından bir cümle…" required disabled={busy} />
      <button className="btn btn-sm" disabled={busy || !text.trim()}>{busy ? 'Kaydediliyor…' : 'Kaydet'}</button></div>
    <p className="small muted">Kelime listende değilse cümlenle birlikte eklenir.</p>
    {message && <p className="small" role="status">{message}</p>}
  </form>
}

const familyKey = (language: TargetLanguage, word: string) => `diloloji:dictionary-family:${language}:${word}`
function cachedFamily(language: TargetLanguage, word: string): string[] {
  try { const value: unknown = JSON.parse(localStorage.getItem(familyKey(language, word)) ?? '[]'); return Array.isArray(value) ? value.filter((x): x is string => typeof x === 'string') : [] } catch { return [] }
}
export function DictionaryFamily({ own, language, word, onPick }: { own?: VocabularyEntry; language: TargetLanguage; word: string; onPick: (word: string) => void }) {
  const [family, setFamily] = useState(() => cachedFamily(language, word))
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const members = [...new Set([...(own?.wordFamily.map(m => m.lemma) ?? []), ...(own?.familyCandidates ?? []), ...family])].filter(w => w !== word).slice(0, 8)
  return <section className="section stack" aria-label="Kelime ailesi">
    <h3 className="section-title">Kelime ailesi</h3>
    {members.length > 0 && <div className="dict-family-chain" role="group" aria-label={`${word} ve türevleri`}>
      <strong lang={language}>{word}</strong><span aria-hidden>→</span>{members.map(w => {
        const member = own?.wordFamily.find(m => m.lemma === w)
        return <button key={w} type="button" className="chip chip-sm" lang={language} onClick={() => onPick(w)}>{w}{member && <span className="small muted"> · {POS_NAME[member.partOfSpeech]}</span>}</button>
      })}
    </div>}
    <button type="button" className="link small" disabled={busy} onClick={async () => {
      setBusy(true); setMessage('')
      try {
        const { lookUpWords } = await import('../data/wordInfo')
        const items = (await lookUpWords([word], language)).get(word)?.family ?? []
        setFamily(items)
        if (!items.length) setMessage('Kelime ailesi verisi bulunamadı. Çevrimdışıysan daha sonra tekrar deneyebilirsin.')
        else { try { localStorage.setItem(familyKey(language, word), JSON.stringify(items)) } catch { /* Optional device cache. */ } }
      } catch { setMessage('Kelime ailesi şu an alınamadı; daha sonra tekrar dene.') }
      finally { setBusy(false) }
    }}>{busy ? 'Aranıyor…' : members.length ? 'Vikisözlük’ten güncelle' : 'Kelime ailesini getir'}</button>
    {message && <p className="small muted" role="status">{message}</p>}
    {family.length > 0 && <p className="small muted">Kaynak: Vikisözlük · CC BY-SA</p>}
  </section>
}

/** Root relationships are shown only when Wiktionary supplies a shared source word. */
export function DictionaryRoots({ language, word }: { language: TargetLanguage; word: string }) {
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  return <section className="section stack" aria-label="Diller arası ortak kök">
    <h3 className="section-title">Diller arası köprü</h3>
    <p className="small muted">Karttaki diğer dil karşılıklarını birlikte hatırla. Ortak kök bilgisi için kaynağı kontrol edebilirsin.</p>
    <button type="button" className="link small" disabled={busy} onClick={async () => {
      setBusy(true); setMessage('')
      try {
        const { findEquivalents, sourceName } = await import('../data/wiktionary')
        const equivalents = await findEquivalents(word, language)
        setMessage(equivalents?.shared ? `${equivalents.forms.map(f => f.word).join(' ↔ ')} · Ortak kök: ${sourceName(equivalents.shared.lang)} ${equivalents.shared.word} (Vikisözlük, CC BY-SA)` : 'Bu sözcük için doğrulanmış ortak kök bilgisi bulunamadı. Çeviri karşılıklarını kartın üstünde görebilirsin.')
      } catch { setMessage('Kök bilgisi şu an alınamadı; daha sonra tekrar dene.') }
      finally { setBusy(false) }
    }}>{busy ? 'Kontrol ediliyor…' : 'Ortak kökü kontrol et'}</button>
    {message && <p className="small" role="status">{message}</p>}
  </section>
}
