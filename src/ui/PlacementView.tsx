import { useEffect, useMemo, useState } from 'react'
import type { PlacementQuestion } from '../data/guide/placementData'
import type { GuideLevel, TopicLesson } from '../data/guide/lessonTypes'
import { lessonTitle } from '../data/guide/lessonOf'
import { endsHere, levelScores, missedLessons, placeLevel, PLACEMENT_LEVELS, type PlacementAnswer } from '../engine/guidePlacement'
import { CheckCircleIcon, ChevronLeftIcon } from './icons'
import { NEW_ART } from './drawnArt'
import { sfx } from './sounds'

const shuffle = <T,>(list: T[]): T[] => {
  const out = [...list]
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[out[i], out[j]] = [out[j]!, out[i]!]
  }
  return out
}

/** Options in a new order each time, unless one of them depends on its place ("hepsi", "a ve b"). */
const POSITIONAL = /^(hepsi|hiçbiri|yukarıdakilerin|a ve b|b ve c)/i
function withShuffledOptions(q: PlacementQuestion): PlacementQuestion {
  if (q.options.some((o) => POSITIONAL.test(o.trim()))) return q
  const right = q.options[q.answer]
  const options = shuffle(q.options)
  return { ...q, options, answer: options.indexOf(right!) }
}

/**
 * The placement test: grammar questions from the easiest level up, stopping once a level is not passed. The result is
 * the level to start from, the lessons to look at first, and the choice to mark the easier lessons as known.
 */
export function PlacementView({
  language,
  languageName,
  questions,
  lessons,
  levelNames,
  known,
  onFinish,
  onKnown,
  onUndoKnown,
  onOpenLesson,
  onBack,
}: {
  language: string
  languageName: string
  questions: PlacementQuestion[]
  lessons: TopicLesson[]
  levelNames: Record<GuideLevel, string>
  /** Lessons already read: the ones the test would mark are the others. */
  known: ReadonlySet<string>
  onFinish: (start: GuideLevel) => void
  onKnown: (topics: string[]) => void
  onUndoKnown: () => void
  onOpenLesson: (lesson: TopicLesson) => void
  onBack: () => void
}) {
  const [asked, setAsked] = useState<PlacementQuestion[]>(() => questions.map(withShuffledOptions))
  const [started, setStarted] = useState(false)
  const [index, setIndex] = useState(0)
  const [given, setGiven] = useState<number | 'skip' | null>(null)
  const [answers, setAnswers] = useState<PlacementAnswer[]>([])
  const [done, setDone] = useState(false)
  // How many lessons were marked known (null: not yet); kept apart from `known`, which grows as they are marked.
  const [marked, setMarked] = useState<number | null>(null)

  const perLevel = useMemo(() => {
    const n = Object.fromEntries(PLACEMENT_LEVELS.map((l) => [l, 0])) as Record<GuideLevel, number>
    for (const q of questions) n[q.level] += 1
    return n
  }, [questions])
  const current = asked[index]
  const inSentence = !!current?.prompt.includes('___')

  const answer = (choice: number | 'skip') => {
    if (given !== null || !current) return
    setGiven(choice)
    const right = choice === current.answer
    if (right) sfx.correct()
    else if (choice !== 'skip') sfx.wrong()
    setAnswers((a) => [...a, { level: current.level, lesson: current.lesson, right }])
  }
  const next = () => {
    if (endsHere(answers, perLevel) || index + 1 >= asked.length) {
      setDone(true)
      onFinish(placeLevel(answers).start)
      return
    }
    setIndex(index + 1)
    setGiven(null)
  }
  const restart = () => {
    setAsked(questions.map(withShuffledOptions))
    setStarted(true)
    setIndex(0)
    setGiven(null)
    setAnswers([])
    setDone(false)
    setMarked(null)
  }

  useEffect(() => {
    if (!started || done || !current) return
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return
      const target = e.target as HTMLElement | null
      if (target?.closest?.('input, textarea, select')) return
      const n = Number(e.key)
      if (given === null && n >= 1 && n <= current.options.length) {
        e.preventDefault()
        answer(n - 1)
      } else if (given !== null && e.key === 'Enter' && !target?.closest?.('button, a')) {
        e.preventDefault()
        next()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  const back = (
    <button type="button" className="link guide-back-btn" onClick={onBack}>
      <ChevronLeftIcon size={16} className="inline-icon" /> Rehber
    </button>
  )

  if (!questions.length) {
    return (
      <article className="stack guide-level-quiz">
        {back}
        <div className="card stack gap-2 text-center p-4">
          <p className="muted">{languageName} için seviye testi henüz hazır değil.</p>
        </div>
      </article>
    )
  }

  if (!started) {
    return (
      <article className="stack guide-level-quiz">
        {back}
        <section className="card stack gap-2 lesson-check" aria-label="Seviyeni bul">
          <img className="lesson-check-art" src={NEW_ART.guideTeach} alt="" height={112} draggable={false} />
          <h2 className="section-title">Seviyeni bul</h2>
          <p>
            {languageName} gramerinde hangi seviyeden başlaman gerektiğini bulalım. En çok {questions.length} soru, yaklaşık 5 dakika: kolaydan zora gidiyoruz ve bir seviyede zorlanırsan test orada biter.
          </p>
          <p className="small muted">Tahmin etme: bilmiyorsan “Bilmiyorum” de, sonucun daha doğru çıkar. Sonuçta işine yarayacak dersleri sana göstereceğiz.</p>
          <div className="row">
            <button type="button" className="btn btn-lg" onClick={() => setStarted(true)} autoFocus>
              Teste başla
            </button>
          </div>
        </section>
      </article>
    )
  }

  if (done) {
    const placement = placeLevel(answers)
    const scores = levelScores(answers)
    const missed = missedLessons(answers).map((t) => lessons.find((l) => l.topic === t)).filter((l): l is TopicLesson => !!l)
    const easier = lessons.filter((l) => placement.passed.includes(l.level) && !known.has(l.topic))
    const first = lessons.find((l) => l.level === placement.start && !known.has(l.topic)) ?? lessons.find((l) => l.level === placement.start)
    return (
      <article className="stack guide-level-quiz">
        {back}
        <section className="card stack gap-2 lesson-check lesson-check-done" aria-label="Seviye testi sonucu">
          <img className="lesson-check-art" src={placement.passed.length ? NEW_ART.guideLearned : NEW_ART.guideReview} alt="" height={112} draggable={false} />
          <h2 className="section-title">{placement.all ? 'Her seviyeyi geçtin' : `${placement.start} seviyesinden başla`}</h2>
          <p className={placement.passed.length ? 'lesson-check-score' : 'lesson-check-score muted'}>
            {placement.passed.length > 0 && <CheckCircleIcon size={18} className="inline-icon" />}{' '}
            {placement.all
              ? `${languageName} dersleri senin için zaten tanıdık; istediğin konuya gidip pekiştirebilirsin.`
              : placement.passed.length
                ? `${placement.passed.join(', ')} sorularını geçtin. ${placement.start} (${levelNames[placement.start]}) konularında takıldın.`
                : `Temelden başlamak sana iyi gelecek: ${placement.start} (${levelNames[placement.start]}) dersleri tam sana göre.`}
          </p>
          <ul className="placement-scores" aria-label="Seviye puanları">
            {PLACEMENT_LEVELS.filter((l) => scores[l].total > 0).map((l) => (
              <li key={l}>
                <span className="guide-level-badge">{l}</span> {scores[l].right}/{scores[l].total}
              </li>
            ))}
          </ul>
          <div className="row gap-2 guide-actions">
            {first && (
              <button type="button" className="btn btn-lg" onClick={() => onOpenLesson(first)}>
                Buradan başla: {lessonTitle(first)}
              </button>
            )}
            {easier.length > 0 && marked === null && (
              <button
                type="button"
                className="btn btn-quiet"
                onClick={() => {
                  onKnown(easier.map((l) => l.topic))
                  setMarked(easier.length)
                }}
              >
                {placement.passed.join(' ve ')} derslerini biliyorum say ({easier.length} ders)
              </button>
            )}
            {marked !== null && (
              <span className="small" role="status">
                <CheckCircleIcon size={16} className="inline-icon" /> {marked} ders okundu işaretlendi.{' '}
                <button
                  type="button"
                  className="link"
                  onClick={() => {
                    onUndoKnown()
                    setMarked(null)
                  }}
                >
                  Geri al
                </button>
              </span>
            )}
          </div>
          {missed.length > 0 && (
            <div className="stack gap-1">
              <p className="small muted">Yanlış ya da bilmediğin sorulardan ilk bakacakların:</p>
              <div className="choice-row">
                {missed.slice(0, 6).map((l) => (
                  <button key={l.topic} type="button" className="chip chip-sm" onClick={() => onOpenLesson(l)}>
                    {lessonTitle(l)}
                  </button>
                ))}
              </div>
            </div>
          )}
          <div className="row">
            <button type="button" className="btn btn-quiet" onClick={restart}>
              Testi yeniden yap
            </button>
          </div>
        </section>
      </article>
    )
  }

  if (!current) return null
  return (
    <article className="stack guide-level-quiz">
      {back}
      <section className="card stack gap-2 lesson-check" aria-label="Seviye testi">
        <div className="row justify-between">
          <h2 className="section-title">Seviyeni bul</h2>
          <span className="small muted">Soru {index + 1}</span>
        </div>
        <p className="lesson-check-prompt" lang={inSentence ? language : undefined}>
          {current.prompt}
        </p>
        <div className="options" role="group" aria-label="Seçenekler">
          {current.options.map((o, i) => (
            <button
              key={o}
              type="button"
              className={`option${given === null ? '' : i === current.answer ? ' is-correct' : given === i ? ' is-wrong' : ' is-dim'}`}
              disabled={given !== null}
              onClick={() => answer(i)}
            >
              <span className="key">{i + 1}</span>
              <span lang={inSentence ? language : undefined}>{o}</span>
            </button>
          ))}
        </div>
        {given === null ? (
          <div className="row">
            <button type="button" className="btn btn-quiet" onClick={() => answer('skip')}>
              Bilmiyorum
            </button>
          </div>
        ) : (
          <div className="stack gap-2" role="status">
            <p className={given === current.answer ? 'small' : 'cross-warn'}>
              <strong>{given === current.answer ? 'Doğru!' : given === 'skip' ? 'Sorun değil.' : 'Olmadı.'}</strong> {current.why}
            </p>
            <div className="row">
              <button type="button" className="btn" onClick={next} autoFocus>
                {endsHere(answers, perLevel) || index + 1 >= asked.length ? 'Sonucu gör' : 'Sonraki'}
              </button>
            </div>
          </div>
        )}
      </section>
    </article>
  )
}
