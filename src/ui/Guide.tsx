import '../lazy.css'
import { useEffect, useMemo, useRef, useState } from 'react'
import { grammarExercises } from '../data/grammar'
import { KIND_NAME, KIND_ORDER, RESOURCES, SHARED_RESOURCES, type GuideResource, type ResourceKind } from '../data/guide/resources'
import podcastArt from '../assets/art/src-podcast.webp'
import storybookArt from '../assets/art/src-storybook.webp'
import wikiArt from '../assets/art/src-wiki.webp'
import { GAME_ART } from './gameArt'
import { type GuideLevel, type TopicLesson } from '../data/guide/lessons'
import { checkFor, englishTenseLessons, lessonFor, lessonsOf, lessonTense, lessonTitle } from '../data/guide/lessonOf'
import { db } from '../data/instance'
import { PASS_RIGHT, type GuideMarks } from '../engine/guideReview'
import { TENSE_LESSON } from '../data/tenseLesson'
import { topicStats } from '../engine/grammar'
import { LAB_TENSES, type Tense } from '../engine/tenses'
import { TENSE_BRIEF } from '../engine/tenseBrief'
import type { TargetLanguage } from '../engine/types'
import { CheckCircleIcon, ChevronLeftIcon, ChevronRightIcon, LinkIcon, SearchIcon, SpeakerIcon } from './icons'
import { LANGUAGE_NAME } from './labels'
import { PageHeader } from './PageHeader'
import { speak } from './speech'
import { LessonCheck } from './LessonCheck'
import { loadMarks, markChecked, markRead as withRead, saveMarks } from './guideProgress'
import { TenseLessonSheet } from './verbs/TenseLessonSheet'

const LEVELS: GuideLevel[] = ['A1', 'A2', 'B1', 'B2', 'C1']
type Tab = 'topics' | 'tenses' | 'links'

/**
 * The guide, the app's own school for the language: a short lesson for every grammar topic and the
 * basics (A1 to C1, read in order or looked up), each tense of the verb lab explained, and the best
 * places outside the app to practise, listen, read and prepare an exam. A lesson leads to its
 * questions; a tense to the verb lab.
 */
export function GuideScreen({
  language,
  initialLesson,
  initialTense,
  review,
  onPractice,
  onVerbs,
}: {
  language: TargetLanguage
  /** A lesson to open at once (its topic, or a grammar topic it teaches): from a mistake, or Today's review. */
  initialLesson?: string
  /** A tense of the verb lab to explain at once. */
  initialTense?: string
  /** Opened for the lesson's review: its check starts at once. */
  review?: boolean
  onPractice: (topic: string) => void
  onVerbs: (tense?: string) => void
}) {
  const [tab, setTab] = useState<Tab>(initialTense ? 'tenses' : 'topics')
  const [level, setLevel] = useState<GuideLevel | null>(null)
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState<TopicLesson | null>(() => (initialLesson ? (lessonFor(language, initialLesson) ?? null) : null))
  const [tense, setTense] = useState<Tense | null>(() => (initialTense && language !== 'en' && TENSE_LESSON[initialTense as Tense] ? (initialTense as Tense) : null))
  const [marks, setMarks] = useState<GuideMarks>(loadMarks)
  const [stats, setStats] = useState<Map<string, { accuracy: number; answered: number }>>(new Map())
  const read = useMemo(() => new Set(Object.keys(marks)), [marks])

  const lessons = useMemo(() => lessonsOf(language), [language])
  const enTenses = useMemo(() => (language === 'en' ? englishTenseLessons() : []), [language])
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
  const change = (next: GuideMarks) => {
    setMarks(next)
    saveMarks(next)
  }
  const markRead = (topic: string, on = true) => change(withRead(marks, topic, on))

  const q = query.trim().toLocaleLowerCase('tr')
  const shown = lessons.filter((l) => (!level || l.level === level) && (!q || `${l.title} ${l.summary} ${l.rules.join(' ')}`.toLocaleLowerCase('tr').includes(q)))
  const doneCount = lessons.filter((l) => read.has(l.topic)).length
  const learnedCount = lessons.filter((l) => marks[l.topic]?.learned).length
  // The way through: the first lesson not read yet, the easier levels first.
  const ordered = useMemo(() => LEVELS.flatMap((lv) => lessons.filter((l) => l.level === lv)), [lessons])
  const next = ordered.find((l) => !read.has(l.topic))

  if (open) {
    const practice = open.practice ?? open.topic
    const targetTense = lessonTense(open)
    const idx = ordered.findIndex((l) => l.topic === open.topic)
    const following = idx >= 0 ? ordered[idx + 1] : undefined
    return (
      <LessonView
        key={open.topic}
        lesson={open}
        language={language}
        read={read.has(open.topic)}
        learned={!!marks[open.topic]?.learned}
        review={review && open.topic === lessonFor(language, initialLesson ?? '')?.topic}
        questions={questions.get(practice) ?? 0}
        nextLesson={following}
        onBack={() => setOpen(null)}
        onNext={following ? () => setOpen(following) : undefined}
        onRead={(on) => markRead(open.topic, on)}
        onChecked={(right, size) => change(markChecked(marks, open.topic, right >= Math.min(PASS_RIGHT, size)))}
        onPractice={() => onPractice(practice)}
        onVerbs={() => onVerbs(targetTense)}
      />
    )
  }

  return (
    <div className="stack guide">
      <PageHeader art="guide" title="Rehber" sub={`${LANGUAGE_NAME[language]} okulun: konu anlatımları, zamanlar ve dışarıdaki en iyi kaynaklar.`} />
      <div className="guide-tabs" role="tablist" aria-label="Rehber bölümleri">
        <button type="button" role="tab" aria-selected={tab === 'topics'} className="guide-tab-btn" onClick={() => setTab('topics')}>
          <span>Konular</span> <span className="guide-tab-count">{lessons.length}</span>
        </button>
        {tenses.length + enTenses.length > 0 && (
          <button type="button" role="tab" aria-selected={tab === 'tenses'} className="guide-tab-btn" onClick={() => setTab('tenses')}>
            <span>Zamanlar</span> <span className="guide-tab-count">{tenses.length + enTenses.length}</span>
          </button>
        )}
        <button type="button" role="tab" aria-selected={tab === 'links'} className="guide-tab-btn" onClick={() => setTab('links')}>
          <span>Dış kaynaklar</span>
        </button>
      </div>

      {tab === 'topics' && (
        <>
          <div className="card guide-progress">
            <div className="guide-progress-head">
              <div className="guide-progress-stat">
                <span className="guide-progress-title">Genel İlerleme</span>
                <span className="guide-progress-numbers">
                  <strong>{doneCount}</strong> / {lessons.length} konu okundu
                  {learnedCount > 0 && (
                    <span className="guide-progress-learned"> · <strong>{learnedCount}</strong> öğrenildi</span>
                  )}
                </span>
              </div>
              <span className="guide-progress-pill">
                %{lessons.length ? Math.round((doneCount / lessons.length) * 100) : 0}
              </span>
            </div>
            <span className="guide-bar">
              <span style={{ width: `${lessons.length ? (doneCount / lessons.length) * 100 : 0}%` }} />
            </span>
            <p className="guide-progress-hint small muted">
              Dersin sonundaki üç soruyu geç, konu öğrenildi sayılsın.
            </p>
          </div>
          {next && !q && !level && (
            <button type="button" className="card guide-next" onClick={() => setOpen(next)}>
              <div className="guide-next-lead">
                <span className="guide-hero-badge">
                  {doneCount ? '🎯 Sıradaki dersin' : '✨ Buradan başla'}
                </span>
                <span className="guide-level-badge">{next.level}</span>
              </div>
              <div className="guide-next-content">
                <div className="guide-next-text">
                  <span className="small muted guide-next-eyebrow">
                    {doneCount ? 'Öğrenme yolunda devam et' : 'Dil yolculuğuna ilk adım'}
                  </span>
                  <strong>{titleOf(next)}</strong>
                  <span className="small muted">{next.summary}</span>
                </div>
                <span className="guide-next-btn" aria-hidden="true">
                  <ChevronRightIcon size={20} className="guide-next-arrow" />
                </span>
              </div>
            </button>
          )}
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
            <div className="guide-search-box">
              <SearchIcon size={16} className="guide-search-icon" />
              <input
                className="input guide-search"
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Konu ara (ör. subjonctif, edat)"
                aria-label="Konu ara"
              />
              {query && (
                <button
                  type="button"
                  className="guide-search-clear"
                  onClick={() => setQuery('')}
                  aria-label="Aramayı temizle"
                >
                  ✕
                </button>
              )}
            </div>
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
                      <LessonCard
                        key={l.topic}
                        lesson={l}
                        read={read.has(l.topic)}
                        learned={!!marks[l.topic]?.learned}
                        foot={n > 0 ? (s && s.answered > 0 ? `${n} soru · %${Math.round(s.accuracy * 100)} doğru` : `${n} soru`) : 'Temel konu'}
                        onOpen={() => setOpen(l)}
                      />
                    )
                  })}
                </div>
              </section>
            )
          })}
          {!shown.length && <p className="muted">Bu aramaya uyan konu yok.</p>}
        </>
      )}

      {tab === 'tenses' && enTenses.length > 0 && (
        <section className="stack gap-2">
          <p className="small muted">İngilizcenin zamanları, öğrenme sırasıyla: ne zaman kullanılır, nasıl kurulur, nerede karışır.</p>
          <div className="guide-grid">
            {enTenses.map((l) => (
              <LessonCard key={l.topic} lesson={l} read={read.has(l.topic)} learned={!!marks[l.topic]?.learned} foot={l.level} onOpen={() => setOpen(l)} />
            ))}
          </div>
        </section>
      )}

      {tab === 'tenses' && tenses.length > 0 && (
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
          {tense && (
            <TenseLessonSheet
              language={language as 'fr' | 'es'}
              tense={tense}
              onClose={() => setTense(null)}
              onVerbs={() => {
                setTense(null)
                onVerbs(tense)
              }}
            />
          )}
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
                <h2 className="section-title source-title">
                  <img className="source-art" src={KIND_ART[kind]} alt="" width={36} height={36} draggable={false} />
                  <span>{KIND_NAME[kind]}</span>
                </h2>
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

/** A drawing for each kind of outside resource: the reading sources' covers and the games' signs. */
const KIND_ART: Record<ResourceKind, string | undefined> = {
  grammar: GAME_ART.grammar,
  listening: podcastArt,
  reading: storybookArt,
  dictionary: wikiArt,
  pronunciation: GAME_ART.pron,
  exam: GAME_ART.test,
}

const LEVEL_NAME: Record<GuideLevel, string> = { A1: 'Başlangıç', A2: 'Temel', B1: 'Orta', B2: 'İleri orta', C1: 'İleri' }
const titleOf = lessonTitle

function LessonCard({ lesson, read, learned, foot, onOpen }: { lesson: TopicLesson; read: boolean; learned: boolean; foot: string; onOpen: () => void }) {
  return (
    <button type="button" className={`guide-card${learned ? ' guide-learned' : read ? ' guide-read' : ''}`} onClick={onOpen}>
      <span className="guide-card-head">
        <strong>{titleOf(lesson)}</strong>
        {learned ? (
          <span className="guide-check-wrap guide-check-learned" title="Öğrenildi">
            <CheckCircleIcon size={18} className="guide-check" />
          </span>
        ) : read ? (
          <span className="guide-check-wrap guide-check-read" title="Okundu">
            <CheckCircleIcon size={18} className="guide-check" />
          </span>
        ) : null}
      </span>
      <span className="small muted guide-card-summary">{lesson.summary}</span>
      <span className="guide-card-foot small">
        <span className="guide-card-stat">{foot}</span>
        {learned && <span className="guide-tag guide-tag-learned">Öğrenildi</span>}
      </span>
    </button>
  )
}

function ResourceCard({ r }: { r: GuideResource }) {
  return (
    <a className="guide-card guide-link" href={r.url} target="_blank" rel="noopener noreferrer">
      <span className="guide-card-head">
        <strong>{r.name}</strong>
        <span className="guide-link-btn" aria-hidden="true">
          <LinkIcon size={15} className="guide-link-icon" />
        </span>
      </span>
      <span className="small muted guide-card-summary">{r.note}</span>
      <span className="guide-card-foot small">
        <span className="guide-card-stat">{r.levels}</span>
        {r.open && <span className="guide-tag guide-tag-open">Açık lisans</span>}
        {r.paid && <span className="guide-tag guide-tag-paid">Kısmen ücretli</span>}
      </span>
    </a>
  )
}

function LessonView({
  lesson,
  language,
  read,
  learned,
  review,
  questions,
  nextLesson,
  onBack,
  onNext,
  onRead,
  onChecked,
  onPractice,
  onVerbs,
}: {
  lesson: TopicLesson
  language: TargetLanguage
  read: boolean
  learned: boolean
  review?: boolean
  questions: number
  nextLesson?: TopicLesson
  onBack: () => void
  onNext?: () => void
  onRead: (on: boolean) => void
  onChecked: (right: number, size: number) => void
  onPractice: () => void
  onVerbs: () => void
}) {
  // Picked once a visit: the questions do not change while the lesson is read.
  const check = useMemo(() => checkFor(lesson), [lesson])
  const [checking, setChecking] = useState(!!review && check.length > 0)
  const checkRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (checking && review) checkRef.current?.scrollIntoView({ block: 'start' })
    else window.scrollTo({ top: 0 })
  }, [lesson]) // eslint-disable-line react-hooks/exhaustive-deps
  const verbTopic = !!lessonTense(lesson) || /present|passe|imparfait|preterito|futur|subj|conditionnel/.test(lesson.topic)
  return (
    <article className="stack guide-lesson">
      <button type="button" className="link guide-back-btn" onClick={onBack}>
        <ChevronLeftIcon size={16} className="inline-icon" /> Rehber
      </button>
      <header className="stack gap-1 guide-lesson-header">
        <div className="row items-center gap-2">
          <span className="guide-level-badge">{lesson.level}</span>
          {learned ? (
            <span className="guide-tag guide-tag-learned">Öğrenildi</span>
          ) : read ? (
            <span className="guide-tag">Okundu</span>
          ) : null}
        </div>
        <h1 className="greeting">{titleOf(lesson)}</h1>
        <p className="greeting-sub">{lesson.summary}</p>
      </header>
      <section className="card stack gap-2 guide-rules-card">
        <h2 className="section-title">Kurallar</h2>
        <ol className="guide-rules">
          {lesson.rules.map((r, i) => (
            <li key={i}>
              <span className="guide-rule-text">{r}</span>
            </li>
          ))}
        </ol>
      </section>
      <section className="card stack gap-2 guide-examples-card">
        <h2 className="section-title">Örnekler</h2>
        <ul className="guide-examples">
          {lesson.examples.map((x, i) => (
            <li key={i} className="guide-example-item">
              <button
                type="button"
                className="icon-btn icon-btn-sm guide-speak-btn"
                onClick={() => speak(x.text, language)}
                aria-label={`Dinle: ${x.text}`}
              >
                <SpeakerIcon size={16} />
              </button>
              <div className="guide-example-content">
                <span className="guide-ex" lang={language}>
                  {x.text}
                </span>
                <span className="small muted">{x.tr}</span>
              </div>
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
      {check.length > 0 && (
        <div ref={checkRef}>
          {checking ? (
            <LessonCheck items={check} language={language} review={review} onDone={(right) => onChecked(right, check.length)} />
          ) : (
            <button type="button" className="card guide-next lesson-check-start" onClick={() => setChecking(true)}>
              <div className="guide-next-content">
                <div className="guide-next-text">
                  <span className="small muted guide-next-eyebrow">{learned ? 'Öğrenildi · tekrar et' : 'Kendini dene'}</span>
                  <strong>{check.length} soruluk kısa sınav</strong>
                  <span className="small muted">{learned ? 'Kural hâlâ yerinde mi, bir bak.' : `${Math.min(PASS_RIGHT, check.length)} doğru yeterli: ders öğrenildi sayılır ve birkaç gün sonra tekrarı gelir.`}</span>
                </div>
                <span className="guide-next-btn" aria-hidden="true">
                  <ChevronRightIcon size={20} className="guide-next-arrow" />
                </span>
              </div>
            </button>
          )}
        </div>
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
      {nextLesson && onNext && (
        <button type="button" className="card guide-next" onClick={onNext}>
          <div className="guide-next-lead">
            <span className="guide-level-badge">{nextLesson.level}</span>
          </div>
          <div className="guide-next-content">
            <div className="guide-next-text">
              <span className="small muted guide-next-eyebrow">Sıradaki ders</span>
              <strong>{titleOf(nextLesson)}</strong>
              <span className="small muted">{nextLesson.summary}</span>
            </div>
            <span className="guide-next-btn" aria-hidden="true">
              <ChevronRightIcon size={20} className="guide-next-arrow" />
            </span>
          </div>
        </button>
      )}
    </article>
  )
}
