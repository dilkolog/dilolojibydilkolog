import '../lazy.css'
import { useEffect, useMemo, useState } from 'react'
import { MASTERY_STAGES } from '../engine/mastery'
import { progressStats, type ProgressStats } from '../engine/progress'
import type { Scheduler } from '../engine/scheduler'
import { SKILLS, type ErrorType, type ReviewEvent, type TargetLanguage, type UserWordState, type VocabularyEntry } from '../engine/types'
import { skillProfile } from '../engine/mastery'
import { calibration, errorBreakdown, hardWords, recallCalibration, reviewForecast, weakestSkill, weekReport } from '../engine/insights'
import { useGame } from './game'
import type { KelimeDB, VocabTestRecord } from '../data/db'
import type { ExamResult } from '../engine/exam'
import { KnownWordsCard } from './KnownWords'
import { ErrorReportCard } from './ErrorReport'
import { EarMissesCard } from './EarMisses'
import { BlindSpotsCard } from './BlindSpots'
import type { RepairTarget } from '../engine/blindSpots'
import { YearCalendar } from './YearCalendar'
import { BestHoursCard } from './BestHours'
import { FrequencyCoverageCard } from './FrequencyCoverage'
import { GroupToggle, JumpNav } from './JumpNav'
import { useGroups } from './useGroups'
import { TenseWeakness } from './TenseWeakness'
import { SKILL_NAME } from './labels'
import { PageHeader } from './PageHeader'
import { StreakFlame } from './StreakFlame'
import { CalendarIcon, CheckIcon, PulseIcon, StarIcon, TargetIcon } from './icons'
import { ActivityChart, ForecastChart } from './ProgressCharts'
import { WeekHero } from './WeekHero'
import { ExamCard, VocabTestCard } from './ProgressTests'
import { HardWordsCard, MetacognitionCard, RecallCalibrationCard, StageDistributionCard } from './ProgressMemory'
import { dayLabel, lastWeeks } from './progressShared'

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
  onRepair,
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
  /** Opens the practice for a blind spot (a game, or the verb lab). */
  onRepair?: (target: RepairTarget) => void
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
  const errorsByType = useMemo(() => errorBreakdown(events), [events])
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
  const errors = Object.entries(errorsByType) as [ErrorType, number][]
  const recallBins = recallCalibration(events)
  const calib = calibration(events.filter((e) => now.getTime() - e.timestamp.getTime() < 30 * 86_400_000))
  const byId = new Map(vocabulary.map((v) => [v.id, v]))
  const profile = skillProfile(states, scheduler, new Date())
  const maxStage = Math.max(1, stats.notStarted, ...Object.values(stats.stageCounts))
  const weeks = lastWeeks(events, now, 6)
  // Chart titles state what the chart shows (the finding); a small label above says what it is.
  const forecastTotal = forecast.reduce((n, f) => n + f.count, 0)
  const busiest = forecast.reduce((a, b) => (b.count > a.count ? b : a), forecast[0])
  const topStage = [...MASTERY_STAGES].sort((a, b) => stats.stageCounts[b] - stats.stageCounts[a])[0]
  const knownSkills = SKILLS.filter((sk) => profile[sk] !== null && (sk !== 'gender' || profile.gender !== null)).sort((a, b) => (profile[b] ?? 0) - (profile[a] ?? 0))

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
        <section className="section stack span-2 overview-grid">
          {onRepair && <BlindSpotsCard language={language} errors={errorsByType} onRepair={onRepair} />}
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
      )}
      <GroupToggle id="p-tests" icon={<CheckIcon size={18} />} open={isOpen('p-tests')} onToggle={() => toggle('p-tests')}>Testler</GroupToggle>
      {isOpen('p-tests') && (
        <>
          <VocabTestCard language={language} tests={tests} onVocabTest={onVocabTest} />
          <ExamCard exams={exams} onExam={onExam} />
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
          <RecallCalibrationCard recallBins={recallBins} />
          <MetacognitionCard calib={calib} />
          <HardWordsCard hard={hard} byId={byId} errors={errors} onOpen={onOpen} />
          <StageDistributionCard stageCounts={stats.stageCounts} notStarted={stats.notStarted} maxStage={maxStage} topStage={topStage} />
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
