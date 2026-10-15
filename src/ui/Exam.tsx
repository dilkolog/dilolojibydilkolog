import '../lazy.css'
import { useEffect, useMemo, useRef, useState } from 'react'
import { loadCefr } from '../data/cefr'
import { cefrOf } from '../engine/cefrLevels'
import { buildExam, estimateLevel, scoreExam, weakestLevel, type ExamItem, type ExamResult } from '../engine/exam'
import { buildExercise, displayForm, evaluateTyped, type Exercise } from '../engine/exercises'
import { newWordState, processAttempt } from '../engine/review'
import { createRng } from '../engine/rng'
import type { TargetLanguage, UserWordState, VocabularyEntry } from '../engine/types'
import type { KelimeDB } from '../data/db'
import { scheduler } from '../data/instance'
import { SAMPLE_WORDS } from '../data/seed'
import { AccentBar } from './AccentBar'
import { accentChange, insertAt } from './accentCaret'
import { LANGUAGE_NAME } from './labels'
import { REPAIR_MIN_SCORE, repairKey, type RepairOffer } from '../engine/streakRepair'
import { markRepairTried } from './repairTry'
import { StreakPicture } from './StreakFlame'
import { PageHeader } from './PageHeader'

const pct = (x: number) => `%${Math.round(x * 100)}`

/**
 * The monthly retention exam: 20 surprise questions, no hints; results kept for comparison. Taken to win a
 * lost streak back (`repair`), it mends the missed days when it goes well (REPAIR_MIN_SCORE); one try per break.
 */
export function ExamScreen({
  db,
  language,
  vocabulary,
  states,
  onDone,
  repair,
  onRepair,
}: {
  db: KelimeDB
  language: TargetLanguage
  vocabulary: VocabularyEntry[]
  states: UserWordState[]
  onDone: () => void
  repair?: RepairOffer | null
  onRepair?: (days: string[]) => void
}) {
  const [items] = useState<ExamItem[]>(() => buildExam(vocabulary, states, scheduler, new Date(), createRng(Date.now())))
  const byId = useMemo(() => new Map(vocabulary.map((v) => [v.id, v])), [vocabulary])
  const pool = useMemo(() => {
    const own = new Set(vocabulary.map((v) => v.id))
    return [...vocabulary, ...SAMPLE_WORDS[language].filter((w) => !own.has(w.id))]
  }, [vocabulary, language])
  const rng = useRef(createRng(Date.now() + 1))
  const [index, setIndex] = useState(0)
  const [answers, setAnswers] = useState<boolean[]>([])
  const [text, setText] = useState('')
  const [shown, setShown] = useState<{ ok: boolean; expected: string } | null>(null)
  const [result, setResult] = useState<{ score: ExamResult; history: ExamResult[] } | null>(null)
  const input = useRef<HTMLInputElement>(null)
  const startedAt = useRef(performance.now())
  // The try is spent once the exam starts (leaving half-way does not give another).
  const repairing = !!repair && items.length >= 5
  useEffect(() => {
    if (repair && repairing) markRepairTried(repairKey(repair))
  }, [repair, repairing])

  const item = items[index]
  const entry = item && byId.get(item.entryId)
  const ex = useMemo<Exercise | null>(() => (entry ? buildExercise(item.type, entry, pool, rng.current) : null), [entry, item, pool])

  const answer = (ok: boolean, expected: string) => {
    if (shown || !entry || !ex) return
    // Kept as practice: the exam measures memory without changing the schedule.
    const state = states.find((s) => s.entryId === entry.id) ?? newWordState(entry, new Date())
    const r = processAttempt(state, { exerciseType: ex.type, verdict: ok ? 'correct' : 'wrong', responseMs: performance.now() - startedAt.current, hintsUsed: 0, maxHints: 0, at: new Date(), mode: 'practice' }, [], scheduler)
    void db.events.add(r.event)
    setAnswers((a) => [...a, ok])
    setShown({ ok, expected })
  }

  const next = async () => {
    setShown(null)
    setText('')
    startedAt.current = performance.now()
    if (index + 1 < items.length) return setIndex(index + 1)
    const list = await loadCefr(language).catch(() => null)
    const levelOf = list ? (id: string) => (byId.get(id) ? cefrOf(byId.get(id)!, list) : undefined) : undefined
    const score = scoreExam(language, items, answers, new Date(), levelOf)
    const history = (await db.getExams()).filter((e) => e.language === language)
    await db.addExam(score)
    if (repair && repairing && score.actual >= REPAIR_MIN_SCORE) onRepair?.(repair.days)
    setResult({ score, history })
  }

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (shown && e.key === 'Enter') {
        e.preventDefault()
        return void next()
      }
      if (!shown && ex?.kind === 'choice') {
        const i = Number(e.key) - 1
        if (i >= 0 && i < ex.options.length) answer(ex.options[i].id === ex.correctOptionId, ex.options.find((o) => o.id === ex.correctOptionId)!.label)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  if (items.length < 5) {
    return (
      <div className="stack">
        <h1 className="greeting">Hatırlama sınavı</h1>
        <p className="muted">Sınav için en az birkaç gün önce öğrenmeye başladığın 5 kelime gerekiyor (şu an {items.length}).</p>
        <div>
          <button className="btn" onClick={onDone}>
            İlerleme’ye dön
          </button>
        </div>
      </div>
    )
  }

  if (result) {
    const { score, history } = result
    const prev = history.at(-1)
    return (
      <div className="stack">
        <PageHeader art="exam" title="Sınav sonucu" />
        {repair && repairing && (
          // The streak first: it is what this exam was taken for.
          score.actual >= REPAIR_MIN_SCORE ? (
            <p className="note repair-note is-won">
              <StreakPicture streak={repair.lost} size={40} /> <span>Serin geri geldi: <strong>{repair.lost} gün</strong>. Kaçırdığın gün artık seriyi bozmuyor.</span>
            </p>
          ) : (
            <p className="note repair-note">
              <StreakPicture streak={0} size={40} /> <span>Seriyi kurtarmak için {pct(REPAIR_MIN_SCORE)} gerekiyordu, sen {pct(score.actual)} yaptın. Seri bugün yeniden başlar; bu kopuş için tek hak vardı.</span>
            </p>
          )
        )}
        <div className="hero-stat card">
          <span className="hero-number">{pct(score.actual)}</span>
          <span>
            <strong>hatırladın</strong>
            <br />
            <span className="small muted">
              Hatırlama (yazarak) {score.recall.right}/{score.recall.n} · tanıma {score.recognition.right}/{score.recognition.n}
            </span>
          </span>
        </div>
        <p>
          Model {pct(score.predicted)} tahmin etmişti, sen {pct(score.actual)} hatırladın.{' '}
          {Math.abs(score.actual - score.predicted) <= 0.08
            ? 'Tahminler gerçeğe yakın: tekrarlar doğru zamanda geliyor.'
            : score.actual < score.predicted
              ? 'Tahminden az: Ayarlar → Hafıza modeli bölümünden modeli kendine göre ayarlamak ya da hedef hatırlama oranını yükseltmek iyi olabilir.'
              : 'Tahminden fazla: kelimelerin sandığından sağlam; istersen hedef hatırlama oranını biraz düşürüp daha az tekrarla aynı sonucu alabilirsin.'}
        </p>
        <LevelBreakdown score={score} />
        {score.missed && score.missed.length > 0 && (
          <p className="small">
            <strong>Unuttukların:</strong>{' '}
            {score.missed.map((id) => byId.get(id)).filter((e): e is VocabularyEntry => !!e).map((e) => displayForm(e)).join(', ')}
          </p>
        )}
        {prev && (
          <p className="small muted">
            Önceki sınav ({new Date(prev.at).toLocaleDateString('tr-TR')}): {pct(prev.actual)}.
          </p>
        )}
        <div>
          <button className="btn btn-lg" onClick={onDone} autoFocus>
            Tamam
          </button>
        </div>
      </div>
    )
  }

  if (!entry || !ex) return null
  return (
    <div className="stack exam">
      <div className="row justify-between">
        <h1 className="greeting">Hatırlama sınavı</h1>
        <span className="game-timer">
          {index + 1} / {items.length}
        </span>
      </div>
      <p className="small muted">İpucu yok, tahmin yok: bildiğin gibi cevapla. Bu sınav takvimi değiştirmez, sadece ölçer.</p>
      {repairing && repair && (
        <p className="small repair-goal">
          Seri kurtarma: {pct(REPAIR_MIN_SCORE)} ve üstü yaparsan {repair.lost} günlük serin geri gelir.
        </p>
      )}
      {ex.kind === 'choice' ? (
        <>
          <h2 className="word" lang={language}>
            {displayForm(entry)}
          </h2>
          <div className="options">
            {ex.options.map((o, i) => (
              <button
                key={o.id}
                className={`option${shown ? (o.id === ex.correctOptionId ? ' is-correct' : ' is-dim') : ''}`}
                disabled={!!shown}
                onClick={() => answer(o.id === ex.correctOptionId, ex.options.find((x) => x.id === ex.correctOptionId)!.label)}
              >
                <span className="key">{i + 1}</span>
                <span>{o.label}</span>
              </button>
            ))}
          </div>
        </>
      ) : (
        <form
          className="stack"
          onSubmit={(e) => {
            e.preventDefault()
            if (!text.trim() || shown) return
            const ev = evaluateTyped(ex, text, entry, pool)
            answer(ev.verdict !== 'wrong', ex.accepted[0])
          }}
        >
          <p className="muted small">{LANGUAGE_NAME[language]} karşılığını yaz</p>
          <p className="prompt-text">{ex.prompt}</p>
          <input
            ref={input}
            className="answer-input"
            value={text}
            onChange={accentChange(language, setText)}
            disabled={!!shown}
            autoFocus
            lang={language}
            autoComplete="off"
            autoCapitalize="off"
            autoCorrect="off"
            spellCheck={false}
            enterKeyHint="done"
            placeholder="Cevabını yaz"
          />
          {!shown && <AccentBar language={language} onInsert={(ch) => input.current && setText(insertAt(input.current, ch))} />}
        </form>
      )}
      {shown && (
        <div className="row">
          <p className={shown.ok ? 'notice' : 'error'}>{shown.ok ? 'Doğru' : `Doğrusu: ${shown.expected}`}</p>
          <button className="btn" onClick={next} autoFocus>
            {index + 1 < items.length ? 'Sonraki' : 'Sonucu gör'}
          </button>
        </div>
      )}
    </div>
  )
}

/** Which CEFR bands of the learner's own words held up in the exam, with a rough level estimate. */
function LevelBreakdown({ score }: { score: ExamResult }) {
  if (!score.levels || score.levels.length === 0) return null
  const level = estimateLevel(score.levels)
  const weak = weakestLevel(score.levels)
  return (
    <section className="card stack gap-2">
      <h2 className="section-title">Seviyelere göre</h2>
      <ul className="word-list">
        {score.levels.map((l) => (
          <li key={l.level} className="row justify-between">
            <strong>{l.level}</strong>
            <span>
              {l.right}/{l.n} · {pct(l.right / l.n)}
            </span>
          </li>
        ))}
      </ul>
      {level && (
        <p>
          Kelime hatırlamana göre kaba tahmin: <strong>{level}</strong>.{weak ? ` ${weak} kelimelerinde en çok zorlandın.` : ''}
        </p>
      )}
      <p className="small muted">Resmî bir seviye sınavı değil; yalnızca çalıştığın kelimelerin hangi seviyede kaldığını gösterir. Az soruyla oynak olabilir.</p>
    </section>
  )
}
