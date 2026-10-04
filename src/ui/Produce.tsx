import { useEffect, useMemo, useRef, useState } from 'react'
import { AiError, chatTurn, reviewJournal, type ChatReply, type ChatTurn } from '../ai'
import { displayForm, PERSONAL_PROMPTS } from '../engine/exercises'
import { writingMistakes } from '../engine/mistakes'
import { creditUsage } from '../data/usage'
import { Fluency432 } from './Fluency432'
import { Dictogloss } from './Dictogloss'
import { bestStars, MISSIONS, missionStars, type Mission } from '../engine/missions'
import { pickAudioWords } from '../engine/practice'
import { createRng } from '../engine/rng'
import type { TargetLanguage, UserWordState, VocabularyEntry } from '../engine/types'
import type { JournalEntry, KelimeDB } from '../data/db'
import { scheduler } from '../data/instance'
import { AccentBar, accentChange, insertAt } from './AccentBar'
import { useAi } from './aiContext'
import { BrandMark, CheckCircleIcon, CheckIcon, MicIcon, SparkleIcon, SpeakerIcon, StarIcon, StopIcon } from './icons'
import { Glyph } from './Glyph'
import { LANGUAGE_NAME } from './labels'
import { canSpeak, speak } from './speech'
import { canListen, listen } from './speechInput'
import { EmptyState } from './EmptyState'
import { PageHeader } from './PageHeader'
import { correctionDiff } from '../engine/correctionDiff'

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
  const [tab, setTab] = useState<'journal' | 'chat' | 'mission' | 'fluency' | 'gloss'>('journal')
  const fluencyWords = usePracticeWords(p.vocabulary, p.states, 3)
  return (
    <div className="stack">
      <PageHeader title="Yaz & konuş" sub="Bildiğin kelimeleri kullanarak yaz ve konuş: asıl öğrenme burada pekişir." />
      <div className="page-tabs" role="tablist" aria-label="Bölüm">
        <button role="tab" className="page-tab" aria-selected={tab === 'journal'} onClick={() => setTab('journal')}>
          Günlük
        </button>
        <button role="tab" className="page-tab" aria-selected={tab === 'chat'} onClick={() => setTab('chat')}>
          Sohbet
        </button>
        <button role="tab" className="page-tab" aria-selected={tab === 'mission'} onClick={() => setTab('mission')}>
          Görevler
        </button>
        <button role="tab" className="page-tab" aria-selected={tab === 'fluency'} onClick={() => setTab('fluency')}>
          4/3/2
        </button>
        <button role="tab" className="page-tab" aria-selected={tab === 'gloss'} onClick={() => setTab('gloss')}>
          Dinle-yaz
        </button>
      </div>
      {tab === 'journal' ? (
        <Journal {...p} />
      ) : tab === 'chat' ? (
        <Chat key="chat" {...p} />
      ) : tab === 'mission' ? (
        <Chat key="mission" {...p} mission />
      ) : tab === 'fluency' ? (
        <Fluency432 language={p.language} words={fluencyWords} />
      ) : (
        <Dictogloss db={p.db} language={p.language} vocabulary={p.vocabulary} onChanged={p.onChanged} />
      )}
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
  const [credited, setCredited] = useState(0)
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
        // Practice words used correctly count as real production reviews.
        const usedEntries = words.filter((w) => review.usedWords.includes(displayForm(w)))
        const credited = await creditUsage(db, usedEntries)
        setCredited(credited.length)
        if (found.length || credited.length) onChanged()
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
          className="textarea journal-editor"
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
      {last?.review && credited > 0 && <p className="small notice"><SparkleIcon size={16} className="inline-icon" />{credited} kelimeyi kendiliğinden doğru kullandın; bunlar üretim tekrarı olarak işlendi.</p>}

      <section className="section stack">
        <h2 className="section-title">Önceki yazdıkların</h2>
        {entries.length === 0 ? (
          <EmptyState stage={1} title="İlk günlüğünü yaz">
            Her gün birkaç cümle yeter: yazmak, okumanın gösteremediği eksikleri ortaya çıkarır. Yazdıkların burada birikir.
          </EmptyState>
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
        <div className="stack gap-xs">
          <strong className="small">Düzeltilmiş hali</strong>
          <p className="diff-text" lang={language}>
            {correctionDiff(entry.text, r.corrected).map((part, i) =>
              part.kind === 'same' ? <span key={i}>{part.text}</span> : <span key={i} className={`diff-${part.kind}`}>{part.text}</span>,
            )}
          </p>
          <p className="small muted">
            <span className="diff-added">eklenen</span> · <span className="diff-removed">çıkarılan</span>
          </p>
        </div>
      )}
      {r.mistakes.length > 0 && (
        <ul className="plain stack gap-xs">
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
      {r.usedWords.length > 0 && <p className="small"><CheckIcon size={15} className="inline-icon" />Doğru kullandıkların: {r.usedWords.join(', ')}</p>}
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

function Chat({ db, language, vocabulary, states, onOpenSettings, onChanged, mission }: Props & { mission?: boolean }) {
  const { apiKey } = useAi()
  const words = usePracticeWords(vocabulary, states, mission ? 3 : 8)
  const [active, setActive] = useState<Mission | null>(null)
  const [goalsDone, setGoalsDone] = useState<Set<number>>(new Set())
  const [best, setBest] = useState<Record<string, number>>({})
  const [stars, setStars] = useState<number | null>(null)
  useEffect(() => {
    if (mission) void db.getMissions().then((r) => setBest(bestStars(r, language)))
  }, [db, language, mission])
  const [scenario, setScenario] = useState(SCENARIOS[0])
  const [custom, setCustom] = useState('')
  const [lines, setLines] = useState<Line[] | null>(null)
  const [draft, setDraft] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [voice, setVoice] = useState(true)
  const [hearing, setHearing] = useState(false)
  const [used, setUsed] = useState<Set<string>>(new Set())
  const [creditedCount, setCreditedCount] = useState(0)
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

  const topic = active ? active.scenario : custom.trim() || scenario
  // `m` is passed when starting, before the chosen mission has reached state.
  const ask = async (history: Line[], m: Mission | null = active) => {
    const topic = m ? m.scenario : custom.trim() || scenario
    setBusy(true)
    setError('')
    try {
      const r = await chatTurn(apiKey, {
        language,
        scenario: topic,
        words: words.map((w) => ({ lemma: displayForm(w), gloss: w.senses[0].gloss })),
        history,
        goals: m?.goals,
      })
      if (m) setGoalsDone((g) => new Set([...g, ...r.goalsDone.filter((i) => i >= 0 && i < m.goals.length)]))
      const withCorrection = history.map((l, i) => (i === history.length - 1 && l.role === 'user' ? { ...l, correction: r.correction } : l))
      setLines([...withCorrection, { role: 'assistant', text: r.reply }])
      if (r.usedWords.length) {
        setUsed((u) => new Set([...u, ...r.usedWords]))
        const credited = await creditUsage(db, words.filter((w) => r.usedWords.includes(displayForm(w))))
        if (credited.length) {
          setCreditedCount((n) => n + credited.length)
          onChanged()
        }
      }
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

  const begin = (m: Mission | null) => {
    setActive(m)
    setCreditedCount(0)
    setGoalsDone(new Set())
    setStars(null)
    setUsed(new Set())
    setEnded(false)
    setLines([])
    void ask([], m)
  }

  if (!lines && mission) {
    return (
      <div className="stack">
        <p className="small muted">
          Gerçek bir durumda, karşı tarafı AI oynar ve sana kolayca boyun eğmez. Hedefleri kendi cümlelerinle tamamla; şu kelimeleri de kullanman
          gerekiyor: <strong lang={language}>{words.map((w) => displayForm(w)).join(', ') || '(önce birkaç kelime öğren)'}</strong>.
        </p>
        <div className="mission-grid">
          {MISSIONS.map((m) => (
            <button key={m.id} className="mission-card" onClick={() => begin(m)}>
              <span className="mission-head">
                <span className="game-emoji" aria-hidden><Glyph emoji={m.emoji} size={22} /></span>
                <strong>{m.title}</strong>
                <Stars n={best[m.id] ?? 0} />
              </span>
              <span className="small muted">{m.scenario}</span>
              <ul className="mission-goals small">
                {m.goals.map((g) => (
                  <li key={g}>{g}</li>
                ))}
              </ul>
            </button>
          ))}
        </div>
      </div>
    )
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
            onClick={() => begin(null)}
          >
            Sohbeti başlat
          </button>
          <button className="chip chip-sm" aria-pressed={voice} onClick={() => setVoice(!voice)}>
            <SpeakerIcon size={15} className="inline-icon" />Cevapları sesli oku
          </button>
        </div>
      </section>
    )
  }

  const corrections = lines.filter((l) => l.correction)
  const wordsUsed = words.filter((w) => used.has(displayForm(w))).length
  const complete = !!active && goalsDone.size >= active.goals.length && wordsUsed >= words.length
  const finish = async () => {
    setEnded(true)
    if (!active || stars !== null) return
    const s = missionStars(goalsDone.size, active.goals.length, wordsUsed, words.length)
    setStars(s)
    await db.addMission({ mission: active.id, language, at: new Date().toISOString(), stars: s })
  }
  return (
    <div className="stack">
      {active ? (
        <section className="card stack mission-brief">
          <strong>
            {active.emoji} {active.title}
          </strong>
          <ul className="mission-check">
            {active.goals.map((g, i) => (
              <li key={g} className={goalsDone.has(i) ? 'is-done' : ''}>
                {goalsDone.has(i) ? <CheckCircleIcon size={16} className="inline-icon" solid /> : <span className="goal-dot" aria-hidden />}
                {g}
              </li>
            ))}
          </ul>
          {words.length > 0 && (
            <p className="small">
              Kullan:{' '}
              {words.map((w) => (
                <span key={w.id} className={`mission-word${used.has(displayForm(w)) ? ' is-done' : ''}`} lang={language} title={w.senses[0].gloss}>
                  {used.has(displayForm(w)) && <CheckIcon size={13} className="inline-icon" />}
                  {displayForm(w)}
                </span>
              ))}
            </p>
          )}
          {complete && !ended && (
            <p className="notice">
              <SparkleIcon size={16} className="inline-icon" />Bütün hedefler tamam!{' '}
              <button className="link" onClick={finish}>
                Görevi bitir
              </button>
            </p>
          )}
        </section>
      ) : (
        <p className="small muted">
          Konu: <strong>{topic}</strong>
        </p>
      )}
      <ul className="chat">
        {lines.map((l, i) => (
          <li key={i} className={`chat-line ${l.role}`}>
            {l.role === 'assistant' && (
              <span className="chat-avatar" aria-hidden>
                <BrandMark size={18} />
              </span>
            )}
            <div className="chat-bubble" lang={language}>
              {l.text}
              {l.role === 'assistant' && canSpeak() && (
                <button className="icon-btn" onClick={() => speak(l.text, language)} aria-label="Sesli dinle">
                  <SpeakerIcon size={16} />
                </button>
              )}
            </div>
            {l.correction && (
              <p className="small chat-correction" role="note">
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
          <strong>{active ? 'Görev bitti' : 'Sohbet bitti'}</strong>
          {active && stars !== null && (
            <p className="mission-result">
              <Stars n={stars} />{' '}
              {goalsDone.size}/{active.goals.length} hedef, {wordsUsed}/{words.length} kelime.{' '}
              {stars === 3 ? 'Kusursuz!' : stars === 2 ? 'Üç yıldız için kelimelerin hepsini de kullan.' : 'Kalan hedefleri tamamlamak için tekrar dene.'}
            </p>
          )}
          <p className="small">
            {lines.filter((l) => l.role === 'user').length} kez konuştun, {corrections.length} düzeltme.
            {used.size > 0 && ` Doğru kullandığın kelimeler: ${[...used].join(', ')}.`}
            {creditedCount > 0 && ` ${creditedCount} kelime üretim tekrarı olarak işlendi.`}
          </p>
          <div>
            <button className="btn" onClick={() => setLines(null)}>
              {active ? 'Başka görev' : 'Yeni sohbet'}
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
                {hearing ? <><StopIcon size={14} className="inline-icon" />Dinlemeyi bitir</> : <><MicIcon size={16} className="inline-icon" />Konuş</>}
              </button>
            )}
            <button className="link small" onClick={finish}>
              {active ? 'Görevi bitir' : 'Sohbeti bitir'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

/** A mission's result as three stars, earned ones filled. */
function Stars({ n }: { n: number }) {
  return (
    <span className="mission-stars" role="img" aria-label={`${n} yıldız`}>
      {[1, 2, 3].map((i) => (
        <StarIcon key={i} size={16} solid={i <= n} className={i <= n ? 'is-on' : ''} />
      ))}
    </span>
  )
}
