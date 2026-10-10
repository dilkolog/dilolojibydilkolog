import { type KeyboardEvent, type ReactNode, useEffect, useState } from 'react'
import { MASTERY_STAGES, skillProfile } from '../engine/mastery'
import { localDate, progressStats, type DayActivity, type ProgressStats } from '../engine/progress'
import type { Scheduler } from '../engine/scheduler'
import { SKILLS, type ErrorType, type ReviewEvent, type TargetLanguage, type UserWordState, type VocabularyEntry } from '../engine/types'
import { displayForm } from '../engine/exercises'
import { calibration, recallCalibration, errorBreakdown, hardWords, reviewForecast, weakestSkill, weekReport } from '../engine/insights'
import { useGame } from './game'
import type { KelimeDB, VocabTestRecord } from '../data/db'
import { EXAM_INTERVAL_DAYS, type ExamResult } from '../engine/exam'
import { KnownWordsCard } from './KnownWords'
import { ErrorReportCard } from './ErrorReport'
import { EarMissesCard } from './EarMisses'
import { YearCalendar } from './YearCalendar'
import { BestHoursCard } from './BestHours'
import { FrequencyCoverageCard } from './FrequencyCoverage'
import { GroupToggle, JumpNav } from './JumpNav'
import { useGroups } from './useGroups'
import { TenseWeakness } from './TenseWeakness'
import { ERROR_NAME, LANGUAGE_NAME, SKILL_NAME, STAGE_NAME } from './labels'
import { PageHeader } from './PageHeader'
import { StreakFlame } from './StreakFlame'
import { BrainIcon, CalendarIcon, CheckIcon, LeafIcon, PulseIcon, StarIcon, TargetIcon } from './icons'

const DAYS = 14

const PROGRESS_GROUPS = [
  ['p-overview', 'Genel bakış'],
  ['p-tests', 'Testler'],
  ['p-memory', 'Tekrarlar'],
  ['p-activity', 'Çalışma düzenin'],
  ['p-skills', 'Beceriler ve hatalar'],
] as const

export function ProgressScreen({
  db,
  language,
  vocabularyCount,
  states,
  scheduler,
  vocabulary,
  onOpen,
  onVocabTest,
  onExam,
  onEarPractice,
}: {
  db: KelimeDB
  language: TargetLanguage
  vocabularyCount: number
  states: UserWordState[]
  scheduler: Scheduler
  vocabulary: VocabularyEntry[]
  onOpen: (entryId: string) => void
  onVocabTest: () => void
  onExam: () => void
  /** Opens the practice of the words missed in dictation. */
  onEarPractice?: () => void
}) {
  const [stats, setStats] = useState<ProgressStats | null>(null)
  const [tests, setTests] = useState<VocabTestRecord[]>([])
  const [exams, setExams] = useState<ExamResult[]>([])
  useEffect(() => {
    db.getVocabTests().then((all) => setTests(all.filter((t) => t.language === language)))
    db.getExams().then((all) => setExams(all.filter((t) => t.language === language)))
  }, [db, language])
  const [events, setEvents] = useState<ReviewEvent[]>([])
  const game = useGame()
  // The page is long, so on a phone only the overview starts open; a wide screen shows everything. User choices are remembered.
  const { isOpen, open, toggle } = useGroups(PROGRESS_GROUPS.map(([id]) => id), ['p-overview'], 'progress-groups')

  useEffect(() => {
    const now = new Date()
    // All of this language's history: hard words and the weekly report need more than 14 days.
    db.eventsSince(new Date(0), language).then((all) => {
      setEvents(all)
      setStats(progressStats({ vocabularyCount, states, events: all, scheduler, now, days: DAYS }))
    })
  }, [db, language, vocabularyCount, states, scheduler])

  if (!stats) return null
  const now = new Date()
  const report = weekReport(events, states.map((s) => s.introducedAt), game?.xp.byDay ?? new Map(), now)
  const forecast = reviewForecast(states, now, DAYS)
  const hard = hardWords(events, 8)
  const errors = Object.entries(errorBreakdown(events)) as [ErrorType, number][]
  const recallBins = recallCalibration(events)
  const calib = calibration(events.filter((e) => now.getTime() - e.timestamp.getTime() < 30 * 86_400_000))
  const pct = (c: { answers: number; correct: number }) => Math.round((c.correct / c.answers) * 100)
  const byId = new Map(vocabulary.map((v) => [v.id, v]))
  const profile = skillProfile(states, scheduler, new Date())
  const maxStage = Math.max(1, stats.notStarted, ...Object.values(stats.stageCounts))
  const weeks = lastWeeks(events, now, 6)
  // Chart titles state what the chart shows (the finding); a small label above says what it is.
  const forecastTotal = forecast.reduce((n, f) => n + f.count, 0)
  const busiest = forecast.reduce((a, b) => (b.count > a.count ? b : a), forecast[0])
  const topStage = [...MASTERY_STAGES].sort((a, b) => stats.stageCounts[b] - stats.stageCounts[a])[0]
  const knownSkills = SKILLS.filter((sk) => profile[sk] !== null && (sk !== 'gender' || profile.gender !== null)).sort((a, b) => (profile[b] ?? 0) - (profile[a] ?? 0))
  const recallTotal = recallBins.reduce((n, b) => n + b.answers, 0)
  const recallGap = recallTotal ? Math.round((recallBins.reduce((n, b) => n + (b.actual - b.predicted) * b.answers, 0) / recallTotal) * 100) : 0

  return (
    <div className="progress-page">
      <PageHeader title="İlerleme" sub="Ne kadar bildiğin, neyi unuttuğun ve nasıl çalıştığın." />
      {/* The page in four numbers, each with its last six weeks. */}
      <WeekHero
        report={report}
        events={events}
        now={now}
        weeks={weeks}
        streak={<><StreakFlame streak={game?.streak ?? 0} frozen={game?.frozenYesterday} size={18} /> {game?.streak ?? 0}</>}
        active={stats.activeVocabulary}
        focus={weakestSkill(skillProfile(states, scheduler, now))}
      />
      <JumpNav groups={PROGRESS_GROUPS} label="İlerleme bölümleri" onPick={open} />
      <GroupToggle id="p-overview" icon={<StarIcon size={18} />} open={isOpen('p-overview')} onToggle={() => toggle('p-overview')}>Genel bakış</GroupToggle>
      {isOpen('p-overview') && (
        <>
          <section className="section stack span-2 overview-grid">
            <KnownWordsCard db={db} language={language} vocabulary={vocabulary} states={states} />
            <FrequencyCoverageCard db={db} language={language} vocabulary={vocabulary} states={states} />
            <div className="hero-stat card">
              <span className="hero-number">{stats.activeVocabulary}</span>
              <span>
                <strong>aktif kelime</strong>
                <br />
                <span className="small muted">
                  İpucu olmadan cümlede üretebildiğin ve şu an hâlâ hatırladığın kelimeler. Asıl hedef bu sayının büyümesi.
                </span>
              </span>
            </div>
          </section>

        </>
      )}
      <GroupToggle id="p-tests" icon={<CheckIcon size={18} />} open={isOpen('p-tests')} onToggle={() => toggle('p-tests')}>Testler</GroupToggle>
      {isOpen('p-tests') && (
        <>
          <section className="section stack">
            <h2 className="section-title">Kelime dağarcığı</h2>
            {tests.length > 0 ? (
              <p>
                Son testte {LANGUAGE_NAME[language]} için yaklaşık <strong>{tests.at(-1)!.estimate.toLocaleString('tr-TR')}</strong> kelime (
                {new Date(tests.at(-1)!.at).toLocaleDateString('tr-TR')}).
                {tests.length > 1 && (
                  <span className="muted"> Önceki testler: {tests.slice(-4, -1).map((t) => t.estimate.toLocaleString('tr-TR')).join(' → ')}.</span>
                )}
              </p>
            ) : (
              <p className="small muted">Birkaç dakikalık bir testle {LANGUAGE_NAME[language]} kelime dağarcığının büyüklüğünü tahmin et; ilerlemeni zamanla buradan izle.</p>
            )}
            <div className="row">
              <button className="btn btn-quiet" onClick={onVocabTest}>
                {tests.length ? 'Testi tekrarla' : 'Testi yap'}
              </button>
            </div>
          </section>

          <section className="section stack">
            <h2 className="section-title">Hatırlama sınavı</h2>
            {exams.length > 0 ? (
              <p>
                Son sınavda <strong>%{Math.round(exams.at(-1)!.actual * 100)}</strong> hatırladın (model %{Math.round(exams.at(-1)!.predicted * 100)} tahmin
                etmişti). {exams.length > 1 && <span className="muted">Önceki: {exams.slice(-4, -1).map((e) => `%${Math.round(e.actual * 100)}`).join(' → ')}</span>}
              </p>
            ) : (
              <p className="small muted">Ayda bir, öğrendiğin kelimelerden habersiz 20 soru: ne kadarının gerçekten kaldığını ölçer.</p>
            )}
            {(() => {
              const days = exams.length ? Math.floor((Date.now() - new Date(exams.at(-1)!.at).getTime()) / 86_400_000) : Infinity
              return (
                <div className="row">
                  <button className={`btn${days >= EXAM_INTERVAL_DAYS ? '' : ' btn-quiet'}`} onClick={onExam}>
                    {exams.length ? 'Sınavı tekrarla' : 'Sınava gir'}
                  </button>
                  {days >= EXAM_INTERVAL_DAYS && exams.length > 0 && <span className="small">Aylık sınav zamanı geldi.</span>}
                </div>
              )
            })()}
          </section>

        </>
      )}
      <GroupToggle id="p-memory" icon={<CalendarIcon size={18} />} open={isOpen('p-memory')} onToggle={() => toggle('p-memory')}>Tekrarlar</GroupToggle>
      {isOpen('p-memory') && (
        <>

          <section className="section stack">
            <p className="eyebrow eyebrow-icon"><CalendarIcon size={16} /> Önümüzdeki {DAYS} günün tekrarları</p>
            <h2 className="section-title">
              {forecastTotal === 0 ? 'Yakında tekrar yok' : `${forecastTotal} tekrar; en yoğunu ${busiest === forecast[0] ? 'bugün' : dayLabel(busiest.date, { weekday: 'long' })} (${busiest.count})`}
            </h2>
            <p className="small muted">Her gün kaç kelimenin tekrar zamanının geleceği. Bugünkü sütun, gecikmiş olanları da içerir.</p>
            <ForecastChart forecast={forecast} />
          </section>

          {recallBins.reduce((n, b) => n + b.answers, 0) >= 30 && (
            <section className="section stack">
              <p className="eyebrow eyebrow-icon"><BrainIcon size={16} /> Model tahmini ve gerçek</p>
              <h2 className="section-title">
                {Math.abs(recallGap) <= 5
                  ? 'Tekrarlar doğru zamanda geliyor'
                  : recallGap < 0
                    ? `Tahminden ${-recallGap} puan az hatırlıyorsun`
                    : `Tahminden ${recallGap} puan fazla hatırlıyorsun`}
              </h2>
              <p className="small muted">
                Her tekrardan önce FSRS kelimeyi hatırlama ihtimalini tahmin eder. Halka tahmin, nokta gerçekte hatırladığın oran. İkisi yakınsa tekrarlar doğru
                zamanda geliyor demektir.
              </p>
              <div className="recall-chart" role="table" aria-label="Tahmin edilen ve gerçek hatırlama oranı">
                {recallBins.map((b) => (
                  <div className="recall-row" role="row" key={b.from}>
                    <span role="rowheader" className="small">
                      %{Math.round(b.from * 100)}–{Math.round(b.to * 100)}
                    </span>
                    <div className="recall-track" role="cell" aria-label={`Tahmin %${Math.round(b.predicted * 100)}, gerçek %${Math.round(b.actual * 100)}`}>
                      <span className="recall-pred" style={{ left: `${b.predicted * 100}%` }} title={`Tahmin %${Math.round(b.predicted * 100)}`} />
                      <span className="recall-act" style={{ left: `${b.actual * 100}%` }} title={`Gerçek %${Math.round(b.actual * 100)}`} />
                    </div>
                    <span role="cell" className="small muted recall-n">
                      %{Math.round(b.actual * 100)} · {b.answers}
                    </span>
                  </div>
                ))}
              </div>
            </section>
          )}

          {calib.sure.answers + calib.unsure.answers >= 10 && (
            <section className="section stack">
              <p className="eyebrow eyebrow-icon"><TargetIcon size={16} /> Ne kadar bildiğini ne kadar iyi biliyorsun?</p>
              <h2 className="section-title">
                {calib.sure.answers > 0 ? `Emin olduğun cevapların %${pct(calib.sure)}'i doğru` : `Emin olmadığın cevapların %${pct(calib.unsure)}'i doğru`}
              </h2>
              <div className="calib">
                {calib.sure.answers > 0 && (
                  <p>
                    <span className="calib-num">%{pct(calib.sure)}</span>
                    <span className="small muted">emin olduğun {calib.sure.answers} cevabın doğru</span>
                  </p>
                )}
                {calib.unsure.answers > 0 && (
                  <p>
                    <span className="calib-num">%{pct(calib.unsure)}</span>
                    <span className="small muted">emin olmadığın {calib.unsure.answers} cevabın doğru</span>
                  </p>
                )}
              </div>
              <p className="small muted">
                Son 30 gün.{' '}
                {calib.sure.answers >= 10 && pct(calib.sure) < 85
                  ? 'Emin olduğun cevapların fazlası yanlış çıkıyor: emin değilsen Shift ile işaretle, o kelimeler daha erken tekrar gelsin.'
                  : calib.unsure.answers >= 10 && pct(calib.unsure) > 85
                    ? 'Emin olmadığın cevapların çoğu doğru: kendine biraz daha güvenebilirsin.'
                    : 'Emin olduğunda neredeyse hep doğru biliyorsan, kendini iyi tanıyorsun demektir.'}
              </p>
            </section>
          )}

          <section className="section stack">
            <h2 className="section-title">Zorlandığın kelimeler</h2>
            {hard.length === 0 ? (
              <p className="muted">Henüz belirgin bir zorluk yok. En az 3 kez cevapladığın kelimeler burada sıralanır.</p>
            ) : (
              <ul className="word-list">
                {hard.map((h) => {
                  const e = byId.get(h.entryId)
                  if (!e) return null
                  return (
                    <li key={h.entryId}>
                      <button className="word-row" onClick={() => onOpen(h.entryId)}>
                        <span className="word-row-text">
                          <span className="w">{displayForm(e)}</span>
                          <span className="meta">{e.senses[0].gloss}</span>
                        </span>
                        <span className="small muted">
                          {h.wrong}/{h.total} yanlış
                        </span>
                        <span className="hard-rate" style={{ ['--rate' as string]: h.rate }}>
                          %{Math.round(h.rate * 100)}
                        </span>
                      </button>
                    </li>
                  )
                })}
              </ul>
            )}
            {errors.length > 0 && (
              <>
                <h3 className="field">
                  <label>Hata türleri</label>
                </h3>
                <div className="bars">
                  {errors
                    .sort((a, b) => b[1] - a[1])
                    .map(([t, n]) => (
                      <div className="bar-row" key={t}>
                        <span>{ERROR_NAME[t]}</span>
                        <div className="bar-track bar-track-plain">
                          <div className="bar-fill" style={{ width: `${(n / Math.max(...errors.map((x) => x[1]))) * 100}%`, background: 'var(--bad)' }} />
                        </div>
                        <span className="bar-value">{n}</span>
                      </div>
                    ))}
                </div>
              </>
            )}
          </section>

          <section className="section stack">
            <p className="eyebrow eyebrow-icon"><LeafIcon size={16} /> Kelimeler nerede?</p>
            <h2 className="section-title">
              {stats.stageCounts[topStage] > 0 ? `En çok kelime “${STAGE_NAME[topStage]}” aşamasında (${stats.stageCounts[topStage]})` : 'Henüz başlanmış kelime yok'}
            </h2>
            <div className="bars">
              {[...MASTERY_STAGES].reverse().map((stage) => {
                const i = MASTERY_STAGES.indexOf(stage)
                // The garden's colours: flower, growing, sprout (as in Kelimeler → Bahçe).
                return <StageBar key={stage} label={STAGE_NAME[stage]} value={stats.stageCounts[stage]} max={maxStage} tone={i === MASTERY_STAGES.length - 1 ? 'flower' : i === 0 ? 'sprout' : 'growing'} />
              })}
              <StageBar label="Başlanmadı" value={stats.notStarted} max={maxStage} tone="seed" muted />
            </div>
          </section>

        </>
      )}
      <GroupToggle id="p-activity" icon={<PulseIcon size={18} />} open={isOpen('p-activity')} onToggle={() => toggle('p-activity')}>Çalışma düzenin</GroupToggle>
      {isOpen('p-activity') && (
        <>
          <section className="section stack">
            <p className="eyebrow eyebrow-icon"><PulseIcon size={16} /> Son {DAYS} gün</p>
            <h2 className="section-title">{stats.daysPractised > 0 ? `${DAYS} günün ${stats.daysPractised} gününde çalıştın` : 'Bu dönemde henüz çalışma yok'}</h2>
            <p className="small muted">Günlük cevap sayısı; serbest pratik sayılmaz.</p>
            <ActivityChart activity={stats.activity} />
          </section>

          <YearCalendar db={db} />
          <BestHoursCard db={db} />

        </>
      )}
      <GroupToggle id="p-skills" icon={<TargetIcon size={18} />} open={isOpen('p-skills')} onToggle={() => toggle('p-skills')}>Beceriler ve hatalar</GroupToggle>
      {isOpen('p-skills') && (
        <>
          <section className="section stack">
            <p className="eyebrow eyebrow-icon"><StarIcon size={16} /> Beceriler</p>
            <h2 className="section-title">
              {knownSkills.length >= 2
                ? `En güçlü ${SKILL_NAME[knownSkills[0]].toLocaleLowerCase('tr-TR')} (%${profile[knownSkills[0]]}), en zayıf ${SKILL_NAME[knownSkills.at(-1)!].toLocaleLowerCase('tr-TR')} (%${profile[knownSkills.at(-1)!]})`
                : 'Beceriler çalıştıkça burada görünür'}
            </h2>
            <div className="bars">
              {SKILLS.filter((s) => s !== 'gender' || profile.gender !== null).map((s) => (
                <div className="bar-row" key={s}>
                  <span>{SKILL_NAME[s]}</span>
                  <div className="bar-track">
                    <div className="bar-fill" style={{ width: `${profile[s] ?? 0}%` }} />
                  </div>
                  <span className="bar-value">{profile[s] === null ? 'henüz yok' : `%${profile[s]}`}</span>
                </div>
              ))}
            </div>
            <p className="small muted">Yüzde, o beceride çalıştığın kelimeleri şu an hatırlama olasılığının ortalaması.</p>
          </section>
          {/* Beside the skills: conjugation by tense (French and Spanish), so the row isn't half empty. */}
          <TenseWeakness language={language} vocabulary={vocabulary} />
          <ErrorReportCard db={db} language={language} vocabulary={vocabulary} />
          <EarMissesCard language={language} onPractice={onEarPractice} />
        </>
      )}
    </div>
  )
}

function StageBar({ label, value, max, muted, tone }: { label: string; value: number; max: number; muted?: boolean; tone: 'seed' | 'sprout' | 'growing' | 'flower' }) {
  return (
    <div className="bar-row">
      <span className={muted ? 'muted' : ''}>{label}</span>
      <div className="bar-track bar-track-plain">
        {value > 0 && <div className={`bar-fill stage-fill is-${tone}`} style={{ width: `${(value / max) * 100}%` }} />}
      </div>
      <span className="bar-value">{value}</span>
    </div>
  )
}

const dayLabel = (iso: string, opts: Intl.DateTimeFormatOptions) =>
  new Date(`${iso}T12:00:00`).toLocaleDateString('tr-TR', opts)

/**
 * A column chart is one stop for the keyboard: arrows move between the days (Home/End to the ends)
 * and the readout above says the day's numbers. The columns aren't buttons, so a pointer only hovers
 * them and there are no tiny targets to hit.
 */
function columnKeys(count: number, hover: number | null, setHover: (i: number | null) => void) {
  return {
    tabIndex: 0,
    onFocus: () => setHover(hover ?? count - 1),
    onBlur: () => setHover(null),
    onMouseLeave: () => setHover(null),
    onKeyDown: (e: KeyboardEvent) => {
      const at = hover ?? count - 1
      const next = { ArrowLeft: at - 1, ArrowRight: at + 1, Home: 0, End: count - 1 }[e.key]
      if (next === undefined) return
      e.preventDefault()
      setHover(Math.max(0, Math.min(count - 1, next)))
    },
  }
}

/** Answers per day as thin columns; hover (or focus) shows the exact numbers. */
function ActivityChart({ activity }: { activity: DayActivity[] }) {
  const [hover, setHover] = useState<number | null>(null)
  const max = Math.max(1, ...activity.map((a) => a.answers))
  const shown = hover !== null ? activity[hover] : null

  return (
    <div>
      <p className="chart-readout small" aria-live="polite">
        {shown
          ? `${dayLabel(shown.date, { day: 'numeric', month: 'long', weekday: 'short' })}: ${shown.answers} cevap${
              shown.answers ? `, ${shown.correct} doğru` : ''
            }`
          : `En yoğun gün: ${max} cevap`}
      </p>
      <div className="columns" role="group" aria-label="Günlük cevaplar; ok tuşlarıyla günler arasında gez" {...columnKeys(activity.length, hover, setHover)}>
        {activity.map((a, i) => (
          <span key={a.date} className="column-hit" onMouseEnter={() => setHover(i)}>
            <span
              className={`column${hover === i ? ' is-active' : ''}${a.answers === max && a.answers > 0 ? ' is-peak' : ''}`}
              data-value={a.answers}
              style={{ height: a.answers ? `${Math.max(4, (a.answers / max) * 100)}%` : 0 }}
            />
          </span>
        ))}
      </div>
      <div className="columns-axis small muted">
        <span>{dayLabel(activity[0].date, { day: 'numeric', month: 'short' })}</span>
        <span>bugün</span>
      </div>
      <details className="small mt-3">
        <summary>Tablo olarak göster</summary>
        <table className="data-table">
          <thead>
            <tr>
              <th scope="col">Gün</th>
              <th scope="col">Cevap</th>
              <th scope="col">Doğru</th>
            </tr>
          </thead>
          <tbody>
            {activity.map((a) => (
              <tr key={a.date}>
                <td>{dayLabel(a.date, { day: 'numeric', month: 'short', weekday: 'short' })}</td>
                <td>{a.answers}</td>
                <td>{a.correct}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </div>
  )
}

function Delta({ now, before, suffix = '' }: { now: number; before: number; suffix?: string }) {
  if (before === 0 && now === 0) return null
  const diff = now - before
  if (diff === 0) return <span className="delta">=</span>
  return (
    <span className={`delta ${diff > 0 ? 'up' : 'down'}`}>
      {diff > 0 ? '▲' : '▼'} {Math.abs(Math.round(diff))}
      {suffix}
    </span>
  )
}

const FOCUS_TEXT: Record<string, string> = {
  recognition: 'Tanıma zayıf: yeni kelimeleri daha sık tekrar et.',
  recall: 'Hatırlama zayıf: yazarak hatırlama sorularına ağırlık ver; ipucunu geç aç.',
  production: 'Üretme zayıf: boşluk doldurma ve kendi cümleni kurma alıştırmaları yap.',
  listening: 'Dinleme zayıf: dikte ve dinleme sorularıyla kulağını alıştır.',
  collocation: 'Kalıplar zayıf: kelimeleri birlikte kullanıldıkları kelimelerle çalış.',
}

/** This week against last week, with a suggested focus. */

function ForecastChart({ forecast }: { forecast: { date: string; count: number }[] }) {
  const [hover, setHover] = useState<number | null>(null)
  const max = Math.max(1, ...forecast.map((f) => f.count))
  const shown = hover !== null ? forecast[hover] : null
  return (
    <div>
      <p className="chart-readout small" aria-live="polite">
        {shown
          ? `${dayLabel(shown.date, { day: 'numeric', month: 'long', weekday: 'short' })}: ${shown.count} kelime`
          : `Toplam ${forecast.reduce((s, f) => s + f.count, 0)} kelime`}
      </p>
      <div className="columns" role="group" aria-label="Önümüzdeki günlerin tekrarları; ok tuşlarıyla günler arasında gez" {...columnKeys(forecast.length, hover, setHover)}>
        {forecast.map((f, i) => (
          <span key={f.date} className="column-hit" onMouseEnter={() => setHover(i)}>
            <span
              className={`column${hover === i ? ' is-active' : ''}${f.count === max && f.count > 0 ? ' is-peak' : ''}`}
              data-value={f.count}
              style={{ height: f.count ? `${Math.max(4, (f.count / max) * 100)}%` : 0, background: i === 0 ? 'var(--flame)' : undefined }}
            />
          </span>
        ))}
      </div>
      <div className="columns-axis small muted">
        <span>bugün</span>
        <span>{dayLabel(forecast.at(-1)!.date, { day: 'numeric', month: 'short' })}</span>
      </div>
      <ul className="chart-legend small muted">
        <li>
          <span className="chart-key is-today" aria-hidden /> bugün, gecikmişler dahil
        </li>
        <li>
          <span className="chart-key" aria-hidden /> sonraki günler
        </li>
      </ul>
    </div>
  )
}

/** Answers and accuracy per week, oldest first, for the KPI sparklines. */
function lastWeeks(events: readonly ReviewEvent[], now: Date, count: number): { answers: number; accuracy: number }[] {
  const WEEK = 7 * 86_400_000
  const out = Array.from({ length: count }, () => ({ answers: 0, correct: 0 }))
  for (const e of events) {
    if (e.mode === 'practice') continue
    const i = count - 1 - Math.floor((now.getTime() - e.timestamp.getTime()) / WEEK)
    if (i < 0 || i >= count) continue
    out[i].answers++
    if (e.correct) out[i].correct++
  }
  return out.map((w) => ({ answers: w.answers, accuracy: w.answers ? w.correct / w.answers : 0 }))
}


/** A thin trend line; the last point (this week) is marked. */
function Sparkline({ values }: { values: (number | null)[] }) {
  const nums = values.map((v) => v ?? 0)
  const max = Math.max(...nums, 1e-9)
  const W = 96
  const H = 24
  const pts = nums.map((v, i) => [(i / Math.max(1, nums.length - 1)) * W, H - 2 - (v / max) * (H - 4)] as const)
  const last = pts[pts.length - 1]
  return (
    <svg className="sparkline" width={W} height={H} viewBox={`0 0 ${W} ${H}`} aria-hidden>
      <polyline points={pts.map(([x, y]) => `${x},${y}`).join(' ')} fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
      <circle cx={last[0]} cy={last[1]} r="3" fill="currentColor" />
    </svg>
  )
}

const WEEKDAY = ['Pz', 'Pt', 'Sa', 'Ça', 'Pe', 'Cu', 'Ct']

/**
 * The page opens on the week: a sentence on how it compares with the last one, the seven days as
 * dots, the figures with their change, and the one thing to focus on.
 */
function WeekHero({
  report,
  events,
  now,
  weeks,
  streak,
  active,
  focus,
}: {
  report: ReturnType<typeof weekReport>
  events: readonly ReviewEvent[]
  now: Date
  weeks: { answers: number; accuracy: number }[]
  streak: ReactNode
  active: number
  focus: string | null
}) {
  const t = report.thisWeek
  const l = report.lastWeek
  const studied = new Set(events.filter((e) => e.mode === 'normal').map((e) => localDate(e.timestamp)))
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(now)
    d.setHours(12, 0, 0, 0)
    d.setDate(d.getDate() - (6 - i))
    return { key: localDate(d), label: WEEKDAY[d.getDay()], today: i === 6 }
  })
  const headline =
    t.answers === 0
      ? 'Bu hafta henüz çalışmadın'
      : l.answers === 0
        ? `Bu hafta ${t.answers} cevap verdin`
        : t.answers >= l.answers
          ? `Geçen haftadan %${Math.round(((t.answers - l.answers) / l.answers) * 100)} daha fazla cevap`
          : `Geçen haftanın %${Math.round((t.answers / l.answers) * 100)}'i kadar cevap`
  return (
    <section className="week-hero span-2">
      <div className="week-hero-main">
        <span className="small week-hero-kicker">Son 7 gün</span>
        <h2 className="week-hero-title">{headline}</h2>
        <ol className="week-dots" aria-label={`7 günün ${t.daysStudied} gününde çalıştın`}>
          {days.map((d) => (
            <li key={d.key} className={`${studied.has(d.key) ? 'is-on' : ''}${d.today ? ' is-today' : ''}`}>
              <span className="week-dot" aria-hidden />
              <span className="small">{d.label}</span>
            </li>
          ))}
        </ol>
        {focus && FOCUS_TEXT[focus] && (
          <p className="small week-hero-focus">
            <TargetIcon size={15} className="inline-icon" />
            {FOCUS_TEXT[focus]}
          </p>
        )}
      </div>
      <dl className="week-hero-figures">
        <div>
          <dt>cevap</dt>
          <dd>
            {t.answers} <Delta now={t.answers} before={l.answers} />
          </dd>
          {weeks.some((w) => w.answers) && <Sparkline values={weeks.map((w) => w.answers)} />}
        </div>
        <div>
          <dt>doğruluk</dt>
          <dd>
            {t.answers ? `%${Math.round(t.accuracy * 100)}` : '—'} {t.answers > 0 && <Delta now={t.accuracy * 100} before={l.accuracy * 100} />}
          </dd>
        </div>
        <div>
          <dt>yeni kelime</dt>
          <dd>
            {t.newWords} <Delta now={t.newWords} before={l.newWords} />
          </dd>
        </div>
        <div>
          <dt>XP</dt>
          <dd>
            {t.xp} <Delta now={t.xp} before={l.xp} />
          </dd>
        </div>
        <div>
          <dt>günlük seri</dt>
          <dd>{streak}</dd>
        </div>
        <div>
          <dt>aktif kelime</dt>
          <dd>{active}</dd>
        </div>
      </dl>
    </section>
  )
}
