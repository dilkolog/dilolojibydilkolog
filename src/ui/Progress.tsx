import { type ReactNode, useEffect, useState } from 'react'
import { MASTERY_STAGES, skillProfile } from '../engine/mastery'
import { progressStats, type DayActivity, type ProgressStats } from '../engine/progress'
import type { Scheduler } from '../engine/scheduler'
import { SKILLS, type ErrorType, type ReviewEvent, type TargetLanguage, type UserWordState, type VocabularyEntry } from '../engine/types'
import { displayForm } from '../engine/exercises'
import { calibration, recallCalibration, errorBreakdown, hardWords, reviewForecast, weakestSkill, weekReport } from '../engine/insights'
import { useGame } from './game'
import type { KelimeDB, VocabTestRecord } from '../data/db'
import { EXAM_INTERVAL_DAYS, type ExamResult } from '../engine/exam'
import { KnownWordsCard } from './KnownWords'
import { ErrorReportCard } from './ErrorReport'
import { YearCalendar } from './YearCalendar'
import { BestHoursCard } from './BestHours'
import { FrequencyCoverageCard } from './FrequencyCoverage'
import { GroupTitle, JumpNav } from './JumpNav'
import { ERROR_NAME, LANGUAGE_NAME, SKILL_NAME, STAGE_NAME } from './labels'
import { PageHeader } from './PageHeader'
import { StreakFlame } from './StreakFlame'

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
      <div className="kpi-strip span-2" role="list">
        <Kpi label="aktif kelime" value={stats.activeVocabulary} hint="cümlede üretebildiğin" />
        <Kpi label="bu hafta cevap" value={report.thisWeek.answers} spark={weeks.map((w) => w.answers)} />
        <Kpi label="doğruluk, bu hafta" value={report.thisWeek.answers ? `%${Math.round(report.thisWeek.accuracy * 100)}` : '—'} spark={weeks.map((w) => (w.answers ? w.accuracy : null))} />
        <Kpi label="günlük seri" value={game?.streak ?? 0} icon={<StreakFlame streak={game?.streak ?? 0} frozen={game?.frozenYesterday} size={18} />} />
      </div>
      <JumpNav groups={PROGRESS_GROUPS} label="İlerleme bölümleri" />
      <GroupTitle id="p-overview">Genel bakış</GroupTitle>
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

      <GroupTitle id="p-tests">Testler</GroupTitle>
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

      <GroupTitle id="p-memory">Bu hafta ve tekrarlar</GroupTitle>
      <WeekCard report={report} focus={weakestSkill(skillProfile(states, scheduler, now))} />

      <section className="section stack">
        <p className="eyebrow">Önümüzdeki {DAYS} günün tekrarları</p>
        <h2 className="section-title">
          {forecastTotal === 0 ? 'Yakında tekrar yok' : `${forecastTotal} tekrar; en yoğunu ${busiest === forecast[0] ? 'bugün' : dayLabel(busiest.date, { weekday: 'long' })} (${busiest.count})`}
        </h2>
        <p className="small muted">Her gün kaç kelimenin tekrar zamanının geleceği. Bugünkü sütun, gecikmiş olanları da içerir.</p>
        <ForecastChart forecast={forecast} />
      </section>

      {recallBins.reduce((n, b) => n + b.answers, 0) >= 30 && (
        <section className="section stack">
          <p className="eyebrow">Model tahmini ve gerçek</p>
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
          <p className="eyebrow">Ne kadar bildiğini ne kadar iyi biliyorsun?</p>
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
        <p className="eyebrow">Kelimeler nerede?</p>
        <h2 className="section-title">
          {stats.stageCounts[topStage] > 0 ? `En çok kelime “${STAGE_NAME[topStage]}” aşamasında (${stats.stageCounts[topStage]})` : 'Henüz başlanmış kelime yok'}
        </h2>
        <div className="bars">
          {[...MASTERY_STAGES].reverse().map((stage) => (
            <StageBar key={stage} label={STAGE_NAME[stage]} value={stats.stageCounts[stage]} max={maxStage} />
          ))}
          <StageBar label="Başlanmadı" value={stats.notStarted} max={maxStage} muted />
        </div>
      </section>

      <GroupTitle id="p-activity">Çalışma düzenin</GroupTitle>
      <section className="section stack">
        <p className="eyebrow">Son {DAYS} gün</p>
        <h2 className="section-title">{stats.daysPractised > 0 ? `${DAYS} günün ${stats.daysPractised} gününde çalıştın` : 'Bu dönemde henüz çalışma yok'}</h2>
        <p className="small muted">Günlük cevap sayısı; serbest pratik sayılmaz.</p>
        <ActivityChart activity={stats.activity} />
      </section>

      <YearCalendar db={db} />
      <BestHoursCard db={db} />

      <GroupTitle id="p-skills">Beceriler ve hatalar</GroupTitle>
      <section className="section stack">
        <p className="eyebrow">Beceriler</p>
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
      <ErrorReportCard db={db} language={language} vocabulary={vocabulary} />
    </div>
  )
}

function StageBar({ label, value, max, muted }: { label: string; value: number; max: number; muted?: boolean }) {
  return (
    <div className="bar-row">
      <span className={muted ? 'muted' : ''}>{label}</span>
      <div className="bar-track bar-track-plain">
        {value > 0 && <div className={muted ? 'bar-fill bar-fill-muted' : 'bar-fill'} style={{ width: `${(value / max) * 100}%` }} />}
      </div>
      <span className="bar-value">{value}</span>
    </div>
  )
}

const dayLabel = (iso: string, opts: Intl.DateTimeFormatOptions) =>
  new Date(`${iso}T12:00:00`).toLocaleDateString('tr-TR', opts)

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
      <div className="columns" onMouseLeave={() => setHover(null)}>
        {activity.map((a, i) => (
          <button
            key={a.date}
            type="button"
            className="column-hit"
            aria-label={`${dayLabel(a.date, { day: 'numeric', month: 'long' })}: ${a.answers} cevap`}
            onMouseEnter={() => setHover(i)}
            onFocus={() => setHover(i)}
            onBlur={() => setHover(null)}
          >
            <span
              className={`column${hover === i ? ' is-active' : ''}${a.answers === max && a.answers > 0 ? ' is-peak' : ''}`}
              data-value={a.answers}
              style={{ height: a.answers ? `${Math.max(4, (a.answers / max) * 100)}%` : 0 }}
            />
          </button>
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
function WeekCard({ report, focus }: { report: ReturnType<typeof weekReport>; focus: string | null }) {
  const t = report.thisWeek
  const l = report.lastWeek
  return (
    <section className="section card stack">
      <p className="eyebrow">Bu hafta</p>
      <h2 className="section-title">
        {l.answers === 0
          ? `${t.answers} cevap, ${t.daysStudied} gün`
          : t.answers >= l.answers
            ? `Geçen haftadan %${Math.round(((t.answers - l.answers) / l.answers) * 100)} daha fazla cevap`
            : `Geçen haftanın %${Math.round((t.answers / l.answers) * 100)}'i kadar cevap`}
      </h2>
      <div className="week-grid">
        <div>
          <strong>{t.xp}</strong> XP <span className="small muted">(tüm diller)</span> <Delta now={t.xp} before={l.xp} />
        </div>
        <div>
          <strong>{t.answers}</strong> cevap <Delta now={t.answers} before={l.answers} />
        </div>
        <div>
          <strong>%{Math.round(t.accuracy * 100)}</strong> doğruluk <Delta now={t.accuracy * 100} before={l.accuracy * 100} suffix=" puan" />
        </div>
        <div>
          <strong>{t.newWords}</strong> yeni kelime <Delta now={t.newWords} before={l.newWords} />
        </div>
        <div>
          <strong>{t.daysStudied}</strong>/7 gün <Delta now={t.daysStudied} before={l.daysStudied} />
        </div>
      </div>
      {focus && FOCUS_TEXT[focus] && <p className="small">🎯 Önerilen odak: {FOCUS_TEXT[focus]}</p>}
    </section>
  )
}

function ForecastChart({ forecast }: { forecast: { date: string; count: number }[] }) {
  const [hover, setHover] = useState<number | null>(null)
  const max = Math.max(1, ...forecast.map((f) => f.count))
  const shown = hover !== null ? forecast[hover] : null
  return (
    <div>
      <p className="chart-readout small">
        {shown
          ? `${dayLabel(shown.date, { day: 'numeric', month: 'long', weekday: 'short' })}: ${shown.count} kelime`
          : `Toplam ${forecast.reduce((s, f) => s + f.count, 0)} kelime`}
      </p>
      <div className="columns" onMouseLeave={() => setHover(null)}>
        {forecast.map((f, i) => (
          <button key={f.date} type="button" className="column-hit" onMouseEnter={() => setHover(i)} onFocus={() => setHover(i)} aria-label={`${f.date}: ${f.count} kelime`}>
            <span
              className={`column${hover === i ? ' is-active' : ''}${f.count === max && f.count > 0 ? ' is-peak' : ''}`}
              data-value={f.count}
              style={{ height: f.count ? `${Math.max(4, (f.count / max) * 100)}%` : 0, background: i === 0 ? 'var(--flame)' : undefined }}
            />
          </button>
        ))}
      </div>
      <div className="columns-axis small muted">
        <span>bugün</span>
        <span>{dayLabel(forecast.at(-1)!.date, { day: 'numeric', month: 'short' })}</span>
      </div>
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

function Kpi({ label, value, hint, spark, icon }: { label: string; value: ReactNode; hint?: string; spark?: (number | null)[]; icon?: ReactNode }) {
  return (
    <div className="kpi" role="listitem">
      <span className="kpi-value">
        {icon}
        {value}
      </span>
      <span className="kpi-label">{label}</span>
      {spark && spark.some((v) => v) ? <Sparkline values={spark} /> : hint ? <span className="small muted">{hint}</span> : null}
    </div>
  )
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
