import { useEffect, useMemo, useRef, useState } from 'react'
import { AiError, chatTurn, reviewJournal, type ChatReply, type ChatTurn } from '../ai'
import { displayForm, PERSONAL_PROMPTS } from '../engine/exercises'
import { writingMistakes } from '../engine/mistakes'
import { pickAudioWords } from '../engine/practice'
import { createRng } from '../engine/rng'
import type { TargetLanguage, UserWordState, VocabularyEntry } from '../engine/types'
import type { JournalEntry, KelimeDB } from '../data/db'
import { scheduler } from '../data/instance'
import { AccentBar, accentChange, insertAt } from './AccentBar'
import { useAi } from './aiContext'
import { SpeakerIcon } from './icons'
import { LANGUAGE_NAME } from './labels'
import { canSpeak, speak } from './speech'
import { canListen, listen } from './speechInput'

interface Props {
  db: KelimeDB
  language: TargetLanguage
  vocabulary: VocabularyEntry[]
  states: UserWordState[]
  onChanged: () => void
  onOpenSettings: () => void
}

/** Words to weave into writing and conversation: the weakest learned ones. */
function usePracticeWords(vocabulary: VocabularyEntry[], states: UserWordState[], count: number) {
  return useMemo(() => pickAudioWords(vocabulary, states, scheduler, new Date(), 'weak', createRng(1), count), [vocabulary, states, count])
}

/**
 * Pushed output (Swain): writing and speaking show what you can actually use, not just
 * recognise. Journal works without AI (entries are kept); feedback and conversation need it.
 */
export function ProduceScreen(p: Props) {
  const [tab, setTab] = useState<'journal' | 'chat'>('journal')
  return (
    <div className="stack">
      <h1 className="greeting">Yaz & konuş</h1>
      <div className="segmented" role="tablist" aria-label="Bölüm">
        <button role="tab" className="segmented-btn" aria-selected={tab === 'journal'} onClick={() => setTab('journal')}>
          Günlük
        </button>
        <button role="tab" className="segmented-btn" aria-selected={tab === 'chat'} onClick={() => setTab('chat')}>
          Sohbet
        </button>
      </div>
      {tab === 'journal' ? <Journal {...p} /> : <Chat {...p} />}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Journal
// ---------------------------------------------------------------------------

function Journal({ db, language, vocabulary, states, onChanged, onOpenSettings }: Props) {
  const { apiKey } = useAi()
  const words = usePracticeWords(vocabulary, states, 3)
  const prompt = PERSONAL_PROMPTS[Math.floor(Date.now() / 86_400_000) % PERSONAL_PROMPTS.length]
  const [text, setText] = useState('')
  const [entries, setEntries] = useState<JournalEntry[]>([])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [last, setLast] = useState<JournalEntry | null>(null)
  const [added, setAdded] = useState(0)
  const area = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    db.getJournal(language).then(setEntries)
  }, [db, language])

  const save = async () => {
    const t = text.trim()
    if (!t) return
    setBusy(true)
    setError('')
    let entry: JournalEntry = { id: crypto.randomUUID(), language, at: new Date().toISOString(), text: t }
    try {
      if (apiKey) {
        const review = await reviewJournal(apiKey, { language, text: t, words: words.map((w) => ({ lemma: displayForm(w), gloss: w.senses[0].gloss })) })
        entry = { ...entry, review }
        const found = writingMistakes(review.mistakes, vocabulary, new Date())
        await db.addWritingMistakes(found)
        setAdded(found.length)
        if (found.length) onChanged()
      }
      await db.saveJournal(entry)
      setEntries((e) => [entry, ...e])
      setLast(entry)
      setText('')
    } catch (e) {
      setError(e instanceof AiError ? e.message : 'Değerlendirilemedi; metnin duruyor, tekrar deneyebilirsin.')
    } finally {
      setBusy(false)
    }
  }

  const thisMonth = entries.filter((e) => e.at.slice(0, 7) === new Date().toISOString().slice(0, 7))
  const days = new Set(thisMonth.map((e) => e.at.slice(0, 10))).size
  const wordsCount = text.trim() ? text.trim().split(/\s+/).length : 0

  return (
    <div className="stack">
      <section className="card stack">
        <p>
          <strong>Bugünün konusu:</strong> {prompt}
        </p>
        {words.length > 0 && (
          <p className="small">
            Kullanmayı dene:{' '}
            {words.map((w, i) => (
              <span key={w.id}>
                {i > 0 && ', '}
                <span className="target" lang={language}>
                  {displayForm(w)}
                </span>{' '}
                <span className="muted">({w.senses[0].gloss})</span>
              </span>
            ))}
          </p>
        )}
        <textarea
          ref={area}
          className="textarea"
          lang={language}
          value={text}
          onChange={accentChange(language, setText)}
          placeholder={`${LANGUAGE_NAME[language]} 3–5 cümle…`}
          aria-label="Günlük"
        />
        <AccentBar language={language} onInsert={(ch) => area.current && setText(insertAt(area.current, ch))} />
        <div className="row">
          <button className="btn" onClick={save} disabled={busy || wordsCount < 3}>
            {busy ? 'Düzeltiliyor…' : apiKey ? 'Kaydet ve düzelt' : 'Kaydet'}
          </button>
          <span className="small muted">{wordsCount} kelime</span>
          {!apiKey && (
            <button className="link small" onClick={onOpenSettings}>
              Düzeltme için AI'ı aç
            </button>
          )}
        </div>
        {error && <p className="error">{error}</p>}
      </section>

      {last?.review && <Review entry={last} language={language} added={added} />}

      <section className="section stack">
        <h2 className="section-title">Önceki yazdıkların</h2>
        {entries.length === 0 ? (
          <p className="small muted">Her gün birkaç cümle: yazmak, okumanın gösteremediği eksikleri ortaya çıkarır.</p>
        ) : (
          <>
            <p className="small muted">Bu ay {days} gün yazdın.</p>
            <ul className="plain stack journal-list">
              {entries.slice(0, 20).map((e) => (
                <li key={e.id}>
                  <details>
                    <summary>
                      <span className="small muted">{new Date(e.at).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long' })}</span> {e.text.slice(0, 70)}
                      {e.text.length > 70 ? '…' : ''}
                      {e.review && <span className="small muted"> · {e.review.mistakes.length} düzeltme</span>}
                    </summary>
                    <p lang={language}>{e.text}</p>
                    {e.review && <Review entry={e} language={language} />}
                  </details>
                </li>
              ))}
            </ul>
          </>
        )}
      </section>
    </div>
  )
}

function Review({ entry, language, added }: { entry: JournalEntry; language: TargetLanguage; added?: number }) {
  const r = entry.review!
  return (
    <section className="card stack journal-review">
      <p>{r.feedback}</p>
      {r.corrected.trim() !== entry.text.trim() && (
        <div>
          <strong className="small">Düzeltilmiş hali</strong>
          <p lang={language}>{r.corrected}</p>
        </div>
      )}
      {r.mistakes.length > 0 && (
        <ul className="plain stack" style={{ gap: '0.375rem' }}>
          {r.mistakes.map((m, i) => (
            <li key={i} className="small">
              <span className="strike">{m.original}</span> → <span className="target">{m.correction}</span> <span className="muted">{m.explanation}</span>
            </li>
          ))}
        </ul>
      )}
      {r.suggestions.length > 0 && (
        <div className="small">
          <strong>Şuralarda kelimelerini kullanabilirdin:</strong>
          <ul className="plain">
            {r.suggestions.map((s, i) => (
              <li key={i} lang={language}>
                <span className="target">{s.lemma}</span>: {s.sentence}
              </li>
            ))}
          </ul>
        </div>
      )}
      {r.usedWords.length > 0 && <p className="small">✓ Doğru kullandıkların: {r.usedWords.join(', ')}</p>}
      {added !== undefined && added > 0 && <p className="small muted">{added} hata kelimelerinin hata bankasına eklendi; tekrarlarda karşına çıkacak.</p>}
    </section>
  )
}

// ---------------------------------------------------------------------------
// Conversation partner
// ---------------------------------------------------------------------------

const SCENARIOS = [
  'Kafede sipariş vermek',
  'Arkadaşla hafta sonu planı yapmak',
  'Otelde oda ayırtmak',
  'Sokakta yol tarifi almak',
  'İş görüşmesi',
  'Doktora derdini anlatmak',
  'Bir dizi ya da film üzerine sohbet',
]

interface Line extends ChatTurn {
  correction?: ChatReply['correction']
}

function Chat({ language, vocabulary, states, onOpenSettings }: Props) {
  const { apiKey } = useAi()
  const words = usePracticeWords(vocabulary, states, 8)
  const [scenario, setScenario] = useState(SCENARIOS[0])
  const [custom, setCustom] = useState('')
  const [lines, setLines] = useState<Line[] | null>(null)
  const [draft, setDraft] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [voice, setVoice] = useState(true)
  const [hearing, setHearing] = useState(false)
  const [used, setUsed] = useState<Set<string>>(new Set())
  const [ended, setEnded] = useState(false)
  const stopListening = useRef<() => void>(() => {})
  const input = useRef<HTMLTextAreaElement>(null)
  useEffect(() => () => stopListening.current(), [])

  if (!apiKey) {
    return (
      <section className="card stack">
        <p>Sohbet partneri için AI gerekiyor: seçtiğin bir senaryoda seninle {LANGUAGE_NAME[language]} konuşur ve zayıf kelimelerini sohbete yerleştirir.</p>
        <div>
          <button className="btn btn-quiet" onClick={onOpenSettings}>
            AI'ı Ayarlar'dan aç
          </button>
        </div>
      </section>
    )
  }

  const topic = custom.trim() || scenario
  const ask = async (history: Line[]) => {
    setBusy(true)
    setError('')
    try {
      const r = await chatTurn(apiKey, { language, scenario: topic, words: words.map((w) => ({ lemma: displayForm(w), gloss: w.senses[0].gloss })), history })
      const withCorrection = history.map((l, i) => (i === history.length - 1 && l.role === 'user' ? { ...l, correction: r.correction } : l))
      setLines([...withCorrection, { role: 'assistant', text: r.reply }])
      if (r.usedWords.length) setUsed((u) => new Set([...u, ...r.usedWords]))
      if (voice && canSpeak()) speak(r.reply, language)
    } catch (e) {
      setError(e instanceof AiError ? e.message : 'Cevap alınamadı.')
      setLines(history)
    } finally {
      setBusy(false)
    }
  }

  const send = () => {
    const t = draft.trim()
    if (!t || !lines || busy) return
    setDraft('')
    void ask([...lines, { role: 'user', text: t }])
  }

  const talk = () => {
    if (hearing) return stopListening.current()
    setHearing(true)
    stopListening.current = listen(language, {
      onInterim: (t) => setDraft(t),
      onFinal: (alts) => setDraft(alts[0] ?? ''),
      onError: () => setHearing(false),
      onEnd: () => setHearing(false),
    })
  }

  if (!lines) {
    return (
      <section className="card stack">
        <p className="small muted">Bir senaryo seç; partner ilk cümleyi söyler. Yazarak ya da mikrofonla cevap verirsin, küçük hatalarını yanında düzeltir.</p>
        <div className="choice-row">
          {SCENARIOS.map((s) => (
            <button key={s} className="chip chip-sm" aria-pressed={!custom.trim() && scenario === s} onClick={() => (setScenario(s), setCustom(''))}>
              {s}
            </button>
          ))}
        </div>
        <input className="input" value={custom} onChange={(e) => setCustom(e.target.value)} placeholder="Ya da kendi konunu yaz: Paris'te ev aramak…" aria-label="Kendi konun" />
        {words.length > 0 && (
          <p className="small muted">
            Sohbete yerleştirilecek kelimeler: {words.map((w) => displayForm(w)).join(', ')}
          </p>
        )}
        <div className="row">
          <button
            className="btn"
            onClick={() => {
              setUsed(new Set())
              setEnded(false)
              setLines([])
              void ask([])
            }}
          >
            Sohbeti başlat
          </button>
          <button className="chip chip-sm" aria-pressed={voice} onClick={() => setVoice(!voice)}>
            🔊 Cevapları sesli oku
          </button>
        </div>
      </section>
    )
  }

  const corrections = lines.filter((l) => l.correction)
  return (
    <div className="stack">
      <p className="small muted">
        Konu: <strong>{topic}</strong>
      </p>
      <ul className="chat">
        {lines.map((l, i) => (
          <li key={i} className={`chat-line ${l.role}`}>
            <div className="chat-bubble" lang={language}>
              {l.text}
              {l.role === 'assistant' && canSpeak() && (
                <button className="icon-btn" onClick={() => speak(l.text, language)} aria-label="Sesli dinle">
                  <SpeakerIcon size={16} />
                </button>
              )}
            </div>
            {l.correction && (
              <p className="small chat-correction">
                <span className="strike">{l.correction.original}</span> → <span className="target">{l.correction.corrected}</span>{' '}
                <span className="muted">{l.correction.note}</span>
              </p>
            )}
          </li>
        ))}
        {busy && <li className="chat-line assistant small muted">…</li>}
      </ul>
      {error && <p className="error">{error}</p>}
      {ended ? (
        <section className="card stack">
          <strong>Sohbet bitti</strong>
          <p className="small">
            {lines.filter((l) => l.role === 'user').length} kez konuştun, {corrections.length} düzeltme.
            {used.size > 0 && ` Doğru kullandığın kelimeler: ${[...used].join(', ')}.`}
          </p>
          <div>
            <button className="btn" onClick={() => setLines(null)}>
              Yeni sohbet
            </button>
          </div>
        </section>
      ) : (
        <div className="stack chat-input">
          <textarea
            ref={input}
            className="textarea textarea-sm"
            lang={language}
            value={draft}
            onChange={accentChange(language, setDraft)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                send()
              }
            }}
            placeholder="Cevabını yaz ya da mikrofona bas…"
            aria-label="Mesajın"
          />
          <AccentBar language={language} onInsert={(ch) => input.current && setDraft(insertAt(input.current, ch))} />
          <div className="row">
            <button className="btn" onClick={send} disabled={busy || !draft.trim()}>
              Gönder
            </button>
            {canListen() && (
              <button className={`btn btn-quiet${hearing ? ' is-on' : ''}`} onClick={talk}>
                {hearing ? '⏹ Dinlemeyi bitir' : '🎤 Konuş'}
              </button>
            )}
            <button className="link small" onClick={() => setEnded(true)}>
              Sohbeti bitir
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
