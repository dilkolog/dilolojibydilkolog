import '../lazy.css'
import { useEffect, useMemo, useState } from 'react'
import { grammarExercises } from '../data/grammar'
import { KIND_NAME, KIND_ORDER, RESOURCES, SHARED_RESOURCES, type GuideResource } from '../data/guide/resources'
import { TOPIC_LESSONS, type GuideLevel, type TopicLesson } from '../data/guide/lessons'
import { db } from '../data/instance'
import { TENSE_LESSON } from '../data/tenseLesson'
import { topicStats, topicName } from '../engine/grammar'
import { LAB_TENSES, type Tense } from '../engine/tenses'
import { TENSE_BRIEF } from '../engine/tenseBrief'
import type { TargetLanguage } from '../engine/types'
import { CheckCircleIcon, ChevronLeftIcon, LinkIcon, SpeakerIcon } from './icons'
import { LANGUAGE_NAME } from './labels'
import { PageHeader } from './PageHeader'
import { speak } from './speech'
import { TenseLessonSheet } from './verbs/TenseLessonSheet'

/** Lessons marked as read, on this device. */
const READ_KEY = 'diloloji:guide-read'
const LEVELS: GuideLevel[] = ['A1', 'A2', 'B1', 'B2', 'C1']
type Tab = 'topics' | 'tenses' | 'links'

const readSet = (): Set<string> => {
  try {
    return new Set(JSON.parse(localStorage.getItem(READ_KEY) ?? '[]') as string[])
  } catch {
    return new Set()
  }
}

/**
 * The guide, the app's own school for the language: a short lesson for every grammar topic and the
 * basics (A1 to C1, read in order or looked up), each tense of the verb lab explained, and the best
 * places outside the app to practise, listen, read and prepare an exam. A lesson leads to its
 * questions; a tense to the verb lab.
 */
export function GuideScreen({ language, onPractice, onVerbs }: { language: TargetLanguage; onPractice: (topic: string) => void; onVerbs: (tense?: string) => void }) {
  const [tab, setTab] = useState<Tab>('topics')
  const [level, setLevel] = useState<GuideLevel | null>(null)
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState<TopicLesson | null>(null)
  const [tense, setTense] = useState<Tense | null>(null)
  const [read, setRead] = useState<Set<string>>(readSet)
  const [stats, setStats] = useState<Map<string, { accuracy: number; answered: number }>>(new Map())

  const lessons = useMemo(() => TOPIC_LESSONS.filter((l) => l.language === language), [language])
  const exercises = useMemo(() => grammarExercises(language), [language])
  const questions = useMemo(() => {
    const n = new Map<string, number>()
    for (const e of exercises) n.set(e.topic, (n.get(e.topic) ?? 0) + 1)
    return n
  }, [exercises])
  const tenses = useMemo(() => (language === 'en' ? [] : (LAB_TENSES[language] as Tense[]).filter((t) => TENSE_LESSON[t])), [language])

  useEffect(() => {
    let live = true
    void db.getGrammarLog().then((log) => {
      if (!live) return
      setStats(new Map(topicStats(log, exercises).map((s) => [s.topic, s])))
    })
    return () => {
      live = false
    }
  }, [exercises])
  useEffect(() => {
    setOpen(null)
    setLevel(null)
    if (language === 'en' && tab === 'tenses') setTab('topics')
  }, [language]) // eslint-disable-line react-hooks/exhaustive-deps

  const markRead = (topic: string, on = true) => {
    const next = new Set(read)
    if (on) next.add(topic)
    else next.delete(topic)
    setRead(next)
    try {
      localStorage.setItem(READ_KEY, JSON.stringify([...next]))
    } catch {
      // Not remembered on this device.
    }
  }

  const q = query.trim().toLocaleLowerCase('tr')
  const shown = lessons.filter((l) => (!level || l.level === level) && (!q || `${l.title} ${l.summary} ${l.rules.join(' ')}`.toLocaleLowerCase('tr').includes(q)))
  const doneCount = lessons.filter((l) => read.has(l.topic)).length

  if (open) return <LessonView lesson={open} language={language} read={read.has(open.topic)} questions={questions.get(open.topic) ?? 0} onBack={() => setOpen(null)} onRead={(on) => markRead(open.topic, on)} onPractice={() => onPractice(open.topic)} onVerbs={() => onVerbs()} />

  return (
    <div className="stack guide">
      <PageHeader art="look" title="Rehber" sub={`${LANGUAGE_NAME[language]} okulun: konu anlatımları, zamanlar ve dışarıdaki en iyi kaynaklar.`} />
      <div className="guide-tabs" role="tablist" aria-label="Rehber bölümleri">
        <button type="button" role="tab" aria-selected={tab === 'topics'} className="chip" onClick={() => setTab('topics')}>
          Konular <span className="muted small">{lessons.length}</span>
        </button>
        {tenses.length > 0 && (
          <button type="button" role="tab" aria-selected={tab === 'tenses'} className="chip" onClick={() => setTab('tenses')}>
            Zamanlar <span className="muted small">{tenses.length}</span>
          </button>
        )}
        <button type="button" role="tab" aria-selected={tab === 'links'} className="chip" onClick={() => setTab('links')}>
          Dış kaynaklar
        </button>
      </div>

      {tab === 'topics' && (
        <>
          <div className="card guide-progress">
            <div className="row justify-between small">
              <span>
                <strong>{doneCount}</strong> / {lessons.length} konu okundu
              </span>
              <span className="muted">Okuduğun konunun sorularını çöz, kural yerine otursun.</span>
            </div>
            <span className="guide-bar">
              <span style={{ width: `${lessons.length ? (doneCount / lessons.length) * 100 : 0}%` }} />
            </span>
          </div>
          <div className="guide-filters">
            <div className="choice-row" role="group" aria-label="Seviye">
              <button type="button" className="chip chip-sm" aria-pressed={!level} onClick={() => setLevel(null)}>
                Hepsi
              </button>
              {LEVELS.filter((lv) => lessons.some((l) => l.level === lv)).map((lv) => (
                <button key={lv} type="button" className="chip chip-sm" aria-pressed={level === lv} onClick={() => setLevel(level === lv ? null : lv)}>
                  {lv}
                </button>
              ))}
            </div>
            <input className="input guide-search" type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Konu ara (ör. subjonctif, edat)" aria-label="Konu ara" />
          </div>
          {LEVELS.map((lv) => {
            const list = shown.filter((l) => l.level === lv)
            if (!list.length) return null
            return (
              <section key={lv} className="stack gap-2">
                <h2 className="section-title guide-level">
                  <span className="guide-level-badge">{lv}</span> {LEVEL_NAME[lv]}
                </h2>
                <div className="guide-grid">
                  {list.map((l) => {
                    const s = stats.get(l.topic)
                    const n = questions.get(l.topic) ?? 0
                    return (
                      <button key={l.topic} type="button" className={`guide-card${read.has(l.topic) ? ' guide-read' : ''}`} onClick={() => setOpen(l)}>
                        <span className="guide-card-head">
                          <strong>{titleOf(l)}</strong>
                          {read.has(l.topic) && <CheckCircleIcon size={18} className="guide-check" />}
                        </span>
                        <span className="small muted">{l.summary}</span>
                        <span className="guide-card-foot small">
                          {n > 0 ? (s && s.answered > 0 ? `${n} soru · %${Math.round(s.accuracy * 100)} doğru` : `${n} soru`) : 'Temel konu'}
                        </span>
                      </button>
                    )
                  })}
                </div>
              </section>
            )
          })}
          {!shown.length && <p className="muted">Bu aramaya uyan konu yok.</p>}
        </>
      )}

      {tab === 'tenses' && (
        <section className="stack gap-2">
          <p className="small muted">Fiil laboratuvarındaki her zamanın anlatımı: ne zaman kullanılır, nasıl kurulur, nerede karışır.</p>
          <div className="guide-grid">
            {tenses.map((t) => (
              <button key={t} type="button" className="guide-card" onClick={() => setTense(t)}>
                <span className="guide-card-head">
                  <strong lang={language}>{TENSE_BRIEF[t].name}</strong>
                </span>
                <span className="small muted">{TENSE_LESSON[t]!.summary}</span>
              </button>
            ))}
          </div>
          {tense && <TenseLessonSheet language={language as 'fr' | 'es'} tense={tense} onClose={() => setTense(null)} />}
        </section>
      )}

      {tab === 'links' && (
        <section className="stack">
          <p className="small muted">Uygulamanın dışında, dilin kendi sitelerinde çalışmak için. Bağlantılar yeni sekmede açılır; içerikler o sitelerindir.</p>
          {KIND_ORDER.map((kind) => {
            const list = [...RESOURCES[language], ...SHARED_RESOURCES].filter((r) => r.kind === kind)
            if (!list.length) return null
            return (
              <section key={kind} className="stack gap-2">
                <h2 className="section-title">{KIND_NAME[kind]}</h2>
                <div className="guide-grid">
                  {list.map((r) => (
                    <ResourceCard key={r.url} r={r} />
                  ))}
                </div>
              </section>
            )
          })}
        </section>
      )}
    </div>
  )
}

const LEVEL_NAME: Record<GuideLevel, string> = { A1: 'Başlangıç', A2: 'Temel', B1: 'Orta', B2: 'İleri orta', C1: 'İleri' }
/** A grammar topic is named as its questions name it; a basic lesson by its own title. */
const titleOf = (l: TopicLesson) => (l.topic.startsWith('basics_') ? l.title : topicName(l.topic) || l.title)

function ResourceCard({ r }: { r: GuideResource }) {
  return (
    <a className="guide-card guide-link" href={r.url} target="_blank" rel="noopener noreferrer">
      <span className="guide-card-head">
        <strong>{r.name}</strong>
        <LinkIcon size={16} className="guide-link-icon" />
      </span>
      <span className="small muted">{r.note}</span>
      <span className="guide-card-foot small">
        {r.levels}
        {r.open && <span className="guide-tag">Açık lisans</span>}
        {r.paid && <span className="guide-tag">Kısmen ücretli</span>}
      </span>
    </a>
  )
}

function LessonView({
  lesson,
  language,
  read,
  questions,
  onBack,
  onRead,
  onPractice,
  onVerbs,
}: {
  lesson: TopicLesson
  language: TargetLanguage
  read: boolean
  questions: number
  onBack: () => void
  onRead: (on: boolean) => void
  onPractice: () => void
  onVerbs: () => void
}) {
  useEffect(() => {
    window.scrollTo({ top: 0 })
  }, [lesson])
  const verbTopic = /present|passe|imparfait|preterito|futur|subj|conditionnel|basics_(fr|es)_(present|presente|passe_compose|preterito)/.test(lesson.topic)
  return (
    <article className="stack guide-lesson">
      <button type="button" className="link" onClick={onBack}>
        <ChevronLeftIcon size={16} className="inline-icon" /> Rehber
      </button>
      <header className="stack gap-1">
        <span className="guide-level-badge">{lesson.level}</span>
        <h1 className="greeting">{titleOf(lesson)}</h1>
        <p className="greeting-sub">{lesson.summary}</p>
      </header>
      <section className="card stack gap-2">
        <h2 className="section-title">Kurallar</h2>
        <ol className="guide-rules">
          {lesson.rules.map((r, i) => (
            <li key={i}>{r}</li>
          ))}
        </ol>
      </section>
      <section className="card stack gap-2">
        <h2 className="section-title">Örnekler</h2>
        <ul className="guide-examples">
          {lesson.examples.map((x, i) => (
            <li key={i}>
              <button type="button" className="icon-btn icon-btn-sm" onClick={() => speak(x.text, language)} aria-label={`Dinle: ${x.text}`}>
                <SpeakerIcon size={16} />
              </button>
              <span>
                <span className="guide-ex" lang={language}>
                  {x.text}
                </span>
                <span className="small muted">{x.tr}</span>
              </span>
            </li>
          ))}
        </ul>
      </section>
      {lesson.watch.length > 0 && (
        <section className="card stack gap-2 guide-watch">
          <h2 className="section-title">Dikkat</h2>
          <ul>
            {lesson.watch.map((w, i) => (
              <li key={i}>{w}</li>
            ))}
          </ul>
        </section>
      )}
      {lesson.tip && (
        <p className="note">
          <strong>İpucu:</strong> {lesson.tip}
        </p>
      )}
      <div className="row guide-actions">
        {questions > 0 && (
          <button type="button" className="btn btn-lg" onClick={onPractice}>
            Bu konuda {questions} soru çöz
          </button>
        )}
        {verbTopic && language !== 'en' && (
          <button type="button" className="btn btn-quiet" onClick={onVerbs}>
            Fiil laboratuvarında çalış
          </button>
        )}
        <button type="button" className="btn btn-quiet" aria-pressed={read} onClick={() => onRead(!read)}>
          {read ? (
            <>
              <CheckCircleIcon size={16} className="inline-icon" /> Okundu
            </>
          ) : (
            'Okudum olarak işaretle'
          )}
        </button>
      </div>
    </article>
  )
}
