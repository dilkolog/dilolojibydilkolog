import { useEffect, useMemo, useRef, useState } from 'react'
import { AiError, evaluateRetelling, writeEpisode, type RetellEvaluation } from '../ai'
import { displayForm } from '../engine/exercises'
import { xpForAnswer } from '../engine/gamification'
import { newWordState, processAttempt } from '../engine/review'
import { parseStoryText, pickStoryWords, type StoryPart } from '../engine/story'
import type { Mistake, TargetLanguage, UserWordState, VocabularyEntry } from '../engine/types'
import type { Settings, StoryEpisode } from '../data/db'
import { db, scheduler } from '../data/instance'
import { useAi } from './aiContext'
import { CheckIcon, SparkleIcon, SpeakerIcon } from './icons'
import { LANGUAGE_NAME } from './labels'
import { sfx } from './sounds'
import { speak } from './speech'

const GENRES = ['Bilim kurgu', 'Polisiye', 'Tarih', 'Macera', 'Romantik', 'Komedi', 'Fantastik', 'Gündelik hayat', 'İş dünyası', 'Seyahat', 'Gerilim', 'Spor']
const WRITING = ['Kalem açılıyor…', 'Karakterler toplanıyor…', 'Olay örgüsü kuruluyor…', 'Son cümle cilalanıyor…']
const WORDS_PER_EPISODE = 6

interface Props {
  language: TargetLanguage
  settings: Settings
  vocabulary: VocabularyEntry[]
  states: UserWordState[]
  mistakes: Mistake[]
  onSettings: (s: Settings) => void
  onChanged: () => void
  onOpenSettings: () => void
}

/**
 * Story mode: an ongoing serial written by the AI around the learner's weakest words. Filling the
 * blanks from the word bank is real practice (each first attempt is a review); curiosity about the
 * next episode is the motivation to come back.
 */
export function StoryScreen(p: Props) {
  const { apiKey } = useAi()
  const [episodes, setEpisodes] = useState<StoryEpisode[] | null>(null)
  const [viewing, setViewing] = useState<string | null>(null)
  const [writing, setWriting] = useState(false)
  const [tick, setTick] = useState(0)
  const [error, setError] = useState('')
  const [custom, setCustom] = useState(p.settings.story.custom)

  const load = async () => {
    const list = await db.stories.where('language').equals(p.language).sortBy('createdAt')
    setEpisodes(list)
    return list
  }

  useEffect(() => {
    void load().then((list) => setViewing(list.at(-1)?.id ?? null))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [p.language])

  useEffect(() => {
    if (!writing) return
    const t = setInterval(() => setTick((n) => n + 1), 1800)
    return () => clearInterval(t)
  }, [writing])

  const story = p.settings.story
  const toggleGenre = (g: string) =>
    p.onSettings({ ...p.settings, story: { ...story, interests: story.interests.includes(g) ? story.interests.filter((x) => x !== g) : [...story.interests, g] } })

  const learnedCount = p.states.filter((s) => s.language === p.language).length
  const current = episodes?.find((e) => e.id === viewing) ?? null
  const latest = episodes?.at(-1)

  const write = async () => {
    if (!apiKey || !episodes) return
    setError('')
    setWriting(true)
    try {
      const recentlyUsed = new Set(episodes.slice(-2).flatMap((e) => e.wordIds))
      const words = pickStoryWords({
        language: p.language,
        catalog: p.vocabulary,
        states: p.states,
        mistakes: p.mistakes,
        scheduler,
        now: new Date(),
        recentlyUsed,
        count: WORDS_PER_EPISODE,
      })
      const draft = await writeEpisode(apiKey, {
        language: p.language,
        interests: story.interests,
        custom: story.custom,
        words: words.map((w) => ({ lemma: displayForm(w), gloss: w.senses[0].gloss })),
        previous: episodes.slice(-3).map((e) => ({ number: e.number, title: e.title, recap: e.recap })),
      })
      const blanks = draft.paragraphs.reduce((n, para) => n + parseStoryText(para.text, words, n).next - n, 0)
      if (blanks === 0) throw new Error('Bölümde çalışılacak kelime bulunamadı. Tekrar dene.')
      const ep: StoryEpisode = {
        id: crypto.randomUUID(),
        language: p.language,
        number: (latest?.number ?? 0) + 1,
        title: draft.title,
        paragraphs: draft.paragraphs,
        wordIds: words.map((w) => w.id),
        recap: draft.recap,
        createdAt: new Date(),
        answers: {},
      }
      await db.stories.add(ep)
      await load()
      setViewing(ep.id)
    } catch (e) {
      setError(e instanceof AiError || e instanceof Error ? e.message : 'Bölüm yazılamadı.')
    } finally {
      setWriting(false)
    }
  }

  // Without AI, existing episodes can still be read and finished; only writing needs it.
  if (!apiKey && episodes?.length === 0) {
    return (
      <div className="stack">
        <h1 className="greeting">Hikayen</h1>
        <div className="hero">
          <div className="hero-body">
            <h2 className="hero-title">Kelimelerinle yazılan bir dizi</h2>
            <p className="hero-sub">
              AI, zorlandığın kelimeleri kullanarak ilgi alanlarına göre her gün devam eden bir hikaye yazar. Boşlukları sen
              doldurursun; her boşluk bir tekrar sayılır. Bunun için AI yardımcısını açman gerekiyor.
            </p>
            <button className="btn btn-lg" onClick={p.onOpenSettings}>
              AI'ı Ayarlar'dan aç
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (!episodes) return null

  return (
    <div className="stack">
      <h1 className="greeting">Hikayen</h1>
      <p className="greeting-sub">
        {LANGUAGE_NAME[p.language]} dizin{episodes.length ? `: ${episodes.length} bölüm` : ''}. Her bölüm zorlandığın {WORDS_PER_EPISODE} kelimeyle yazılır.
      </p>

      <details className="card" open={episodes.length === 0}>
        <summary>Neyi seversin? {story.interests.length > 0 && <span className="small muted">({story.interests.join(', ')})</span>}</summary>
        <div className="stack">
          <div className="choice-row">
            {GENRES.map((g) => (
              <button key={g} className="chip chip-sm" aria-pressed={story.interests.includes(g)} onClick={() => toggleGenre(g)}>
                {g}
              </button>
            ))}
          </div>
          <div className="field">
            <label htmlFor="story-custom">Ya da kendi isteğin</label>
            <input
              id="story-custom"
              className="input"
              placeholder="Örn. Lizbon'da geçen, bir aşçının başından geçenler"
              value={custom}
              onChange={(e) => setCustom(e.target.value)}
              onBlur={() => custom !== story.custom && p.onSettings({ ...p.settings, story: { ...story, custom: custom.trim() } })}
            />
          </div>
        </div>
      </details>

      {!apiKey ? (
        <p className="small muted">
          Yeni bölüm yazmak için AI yardımcısı gerekiyor.{' '}
          <button className="link" onClick={p.onOpenSettings}>
            Ayarlar'dan aç
          </button>
        </p>
      ) : learnedCount < 3 ? (
        <p className="muted">Hikaye için önce birkaç kelime öğrenmen gerekiyor (en az 3). Bugünkü görevini yap, sonra gel!</p>
      ) : (
        (!latest || latest.completedAt) && (
          <div className="row">
            <button className="btn btn-lg" onClick={write} disabled={writing}>
              <SparkleIcon size={20} />
              {writing ? WRITING[tick % WRITING.length] : latest ? `${latest.number + 1}. bölümü yaz` : 'İlk bölümü yaz'}
            </button>
          </div>
        )
      )}
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}

      {current && (
        <Episode
          key={current.id}
          episode={current}
          language={p.language}
          vocabulary={p.vocabulary}
          states={p.states}
          mistakes={p.mistakes}
          onUpdated={async () => {
            await load()
            p.onChanged()
          }}
        />
      )}

      {episodes.length > 1 && (
        <section className="section stack">
          <h2 className="section-title">Bölümler</h2>
          <ol className="episode-list">
            {[...episodes].reverse().map((e) => (
              <li key={e.id}>
                <button className={`episode-link${e.id === viewing ? ' is-current' : ''}`} onClick={() => setViewing(e.id)}>
                  <span className="level-badge">{e.number}</span>
                  <span>{e.title}</span>
                  {e.completedAt ? <CheckIcon size={16} /> : <span className="small muted">devam ediyor</span>}
                </button>
              </li>
            ))}
          </ol>
        </section>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------

function Episode({
  episode,
  language,
  vocabulary,
  states,
  mistakes,
  onUpdated,
}: {
  episode: StoryEpisode
  language: TargetLanguage
  vocabulary: VocabularyEntry[]
  states: UserWordState[]
  mistakes: Mistake[]
  onUpdated: () => void
}) {
  const words = useMemo(
    () => episode.wordIds.map((id) => vocabulary.find((v) => v.id === id)).filter((v): v is VocabularyEntry => !!v),
    [episode.wordIds, vocabulary],
  )
  const paragraphs = useMemo(
    () =>
      episode.paragraphs.reduce<{ list: { parts: StoryPart[]; translation: string; plain: string }[]; next: number }>(
        (acc, para) => {
          const { parts, next } = parseStoryText(para.text, words, acc.next)
          acc.list.push({ parts, translation: para.translation, plain: para.text.replace(/\{\{([^{}]+)\}\}/g, '$1') })
          return { list: acc.list, next }
        },
        { list: [], next: 0 },
      ).list,
    [episode.paragraphs, words],
  )
  const blanks = paragraphs.flatMap((p) => p.parts.filter((x): x is Extract<StoryPart, { kind: 'blank' }> => x.kind === 'blank').map((x) => x.blank))

  const done = episode.completedAt !== undefined
  const [filled, setFilled] = useState<Set<number>>(() => new Set(done ? blanks.map((b) => b.index) : []))
  const [active, setActive] = useState<number | null>(() => (done ? null : (blanks[0]?.index ?? null)))
  const [shake, setShake] = useState<number | null>(null)
  const [showTr, setShowTr] = useState<Set<number>>(new Set())
  const [xp, setXp] = useState(0)
  // First-attempt result per blank.
  const [answers, setAnswers] = useState<Record<number, boolean>>(() => ({ ...episode.answers }))
  const since = useRef(performance.now())
  const bank = useRef(mistakes)
  const stateOf = useRef(new Map(states.map((s) => [s.entryId, s])))

  /** First attempt per blank is a real review (recognition in context). */
  const record = async (entryId: string, correct: boolean) => {
    const entry = words.find((w) => w.id === entryId)!
    const before = stateOf.current.get(entryId) ?? newWordState(entry, new Date())
    const responseMs = Math.min(60_000, Math.round(performance.now() - since.current))
    const result = processAttempt(
      before,
      { exerciseType: 'mc_context', verdict: correct ? 'correct' : 'wrong', errorType: correct ? undefined : 'meaning', responseMs, hintsUsed: 0, maxHints: 0, at: new Date() },
      bank.current,
      scheduler,
    )
    stateOf.current.set(entryId, result.state)
    bank.current = result.mistakes
    await db.saveReview(result)
    setXp((x) => x + xpForAnswer({ exerciseType: 'mc_context', verdict: correct ? 'correct' : 'wrong', hintsUsed: 0, responseMs, mode: 'normal', combo: 0 }))
  }

  const choose = async (entryId: string) => {
    if (active === null) return
    const blank = blanks.find((b) => b.index === active)!
    const correct = blank.entryId === entryId
    const first = answers[blank.index] === undefined
    const nextAnswers = first ? { ...answers, [blank.index]: correct } : answers
    if (first) {
      setAnswers(nextAnswers)
      void record(blank.entryId, correct)
    }
    if (correct) {
      sfx.correct()
      const nextFilled = new Set(filled).add(blank.index)
      setFilled(nextFilled)
      since.current = performance.now()
      const nextBlank = blanks.find((b) => !nextFilled.has(b.index))
      setActive(nextBlank?.index ?? null)
      if (!nextBlank) {
        await db.stories.update(episode.id, { completedAt: new Date(), answers: nextAnswers })
        sfx.levelUp()
        onUpdated()
      } else {
        await db.stories.update(episode.id, { answers: nextAnswers })
      }
    } else {
      sfx.wrong()
      setShake(blank.index)
      setTimeout(() => setShake(null), 400)
    }
  }

  const firstTry = blanks.filter((b) => answers[b.index] === true).length

  return (
    <article className="story card">
      <header className="story-head">
        <span className="level-badge">{episode.number}. bölüm</span>
        <h2 className="story-title">{episode.title}</h2>
      </header>

      {!done && (
        <div className="word-bank" aria-label="Kelime bankası">
          {words.map((w) => {
            const used = blanks.filter((b) => b.entryId === w.id).every((b) => filled.has(b.index))
            return (
              <button key={w.id} className={`bank-word${used ? ' is-used' : ''}`} disabled={used || active === null} onClick={() => choose(w.id)} title={w.senses[0].gloss}>
                {displayForm(w)}
              </button>
            )
          })}
        </div>
      )}

      {paragraphs.map((para, i) => (
        <div key={i} className="story-para">
          <p className="story-text" lang={language}>
            {para.parts.map((part, j) =>
              part.kind === 'text' ? (
                <span key={j}>{part.text}</span>
              ) : filled.has(part.blank.index) ? (
                <span key={j} className={`story-filled${answers[part.blank.index] === false ? ' was-wrong' : ''}`}>
                  {part.blank.answer}
                </span>
              ) : (
                <button
                  key={j}
                  className={`story-blank${active === part.blank.index ? ' is-active' : ''}${shake === part.blank.index ? ' is-wrong' : ''}`}
                  onClick={() => setActive(part.blank.index)}
                  aria-label={`Boşluk ${part.blank.index + 1}`}
                >
                  {part.blank.index + 1}
                </button>
              ),
            )}
          </p>
          <div className="story-tools">
            <button className="icon-btn" onClick={() => speak(para.plain, language)} aria-label="Paragrafı dinle">
              <SpeakerIcon size={18} />
            </button>
            <button
              className="link small"
              onClick={() => setShowTr((s) => (s.has(i) ? new Set([...s].filter((x) => x !== i)) : new Set(s).add(i)))}
            >
              {showTr.has(i) ? 'Çeviriyi gizle' : 'Çeviri'}
            </button>
          </div>
          {showTr.has(i) && <p className="story-tr">{para.translation}</p>}
        </div>
      ))}

      {done ? (
        <>
          <div className="story-done">
            <CheckIcon size={22} />
            <span>
              Bölüm tamamlandı: {blanks.length} boşluğun {firstTry} tanesini ilk denemede bildin.
              {xp > 0 && <strong className="xp-pop">+{xp} XP</strong>}
            </span>
          </div>
          <Retell language={language} story={paragraphs.map((p) => p.plain).join('\n')} words={words} />
        </>
      ) : (
        <p className="small muted">
          Bir boşluğa tıkla, sonra yukarıdan uyan kelimeyi seç. Bankada sözlük hali var; metne doğru biçimi yerleşir. Her boşluğun ilk
          denemesi tekrar olarak sayılır.
        </p>
      )}
    </article>
  )
}

/**
 * Retell the episode in your own words (pushed output, Swain): producing the story shows which
 * words you can actually use, not just recognise. The AI checks each practice word.
 */
function Retell({ language, story, words }: { language: TargetLanguage; story: string; words: VocabularyEntry[] }) {
  const { apiKey } = useAi()
  const [text, setText] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [result, setResult] = useState<RetellEvaluation | null>(null)
  if (!apiKey) return null

  const check = async () => {
    setBusy(true)
    setError('')
    try {
      setResult(
        await evaluateRetelling(apiKey, {
          language,
          story,
          words: words.map((w) => ({ lemma: displayForm(w), gloss: w.senses[0].gloss })),
          retelling: text.trim(),
        }),
      )
    } catch (e) {
      setError(e instanceof AiError ? e.message : 'Değerlendirilemedi.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="stack retell">
      <h3 className="section-title">Kendi cümlelerinle anlat</h3>
      <p className="small muted">
        Bölümü {LANGUAGE_NAME[language]} birkaç cümleyle özetle; mümkün olduğunca bölümün kelimelerini kullan. Kullanmak, tanımaktan çok daha kalıcı öğretir.
      </p>
      <textarea className="textarea" lang={language} value={text} onChange={(e) => setText(e.target.value)} aria-label="Özetin" placeholder="Bu bölümde…" />
      <div className="row">
        <button className="btn" onClick={check} disabled={busy || text.trim().split(/\s+/).length < 5}>
          {busy ? 'Değerlendiriliyor…' : 'Değerlendir'}
        </button>
        <span className="small muted">En az 5 kelime.</span>
      </div>
      {error && <p className="error">{error}</p>}
      {result && (
        <div className="stack" role="status">
          <p>{result.feedback}</p>
          {result.corrected.trim() !== text.trim() && (
            <p className="small">
              <strong>Düzeltilmiş hali:</strong> <span lang={language}>{result.corrected}</span>
            </p>
          )}
          <div className="row gap-2">
            {result.words.map((w) => (
              <span key={w.lemma} className={`pill ${w.correct ? 'stage-5' : w.used ? 'stage-3' : ''}`}>
                {w.correct ? '✓' : w.used ? '~' : '–'} {w.lemma}
              </span>
            ))}
          </div>
          <p className="small muted">✓ doğru kullandın · ~ kullandın ama düzeltilmeli · – kullanmadın</p>
        </div>
      )}
    </section>
  )
}
