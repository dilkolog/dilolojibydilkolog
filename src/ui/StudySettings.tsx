import type { Settings } from '../data/db'
import { relativeWorkload } from '../engine/scheduler'
import { forecastWorkload, monthlyMinutes, recommendedNewWords } from '../engine/workloadForecast'
import { JumpNav } from './JumpNav'
import { MemoryModel } from './MemoryModel'
import { StudyCalendar } from './StudyCalendar'
import { Chips, Row, Toggle } from './settingsWidgets'

const MINUTES = [5, 10, 15, 20, 30, 45]
const NEW_WORDS = [0, 3, 5, 8, 12, 20]
const XP_GOALS = [30, 50, 100, 200, 300]
const SESSION_MAX = [0, 10, 20, 30, 50]
const RETENTIONS = [0.85, 0.88, 0.9, 0.93, 0.95]

/** The cards of the study group, for its row of shortcuts. */
const STUDY_CARDS = [
  ['st-goal', 'Günlük hedef'],
  ['st-words', 'Kelimeler'],
  ['st-memory', 'Hafıza modeli'],
  ['st-calendar', 'Takvim'],
] as const

/**
 * The pace's cost in plain sight, under the choice: what a day will take a month on, and when that
 * outgrows the daily minutes, the pace that fits (one tap). Too many new words a day is the most
 * common reason study stops feeling useful: reviews pile up and new words stop coming.
 */
function PaceNote({ settings: s, onApply }: { settings: Settings; onApply: (n: number) => void }) {
  if (!s.newWordsPerDay) return null
  const minutes = Math.round(monthlyMinutes(s.newWordsPerDay, s.retention, s.fsrsWeights))
  const fits = recommendedNewWords(NEW_WORDS, s.dailyMinutes, s.retention, s.fsrsWeights)
  if (minutes <= s.dailyMinutes)
    return <p className="small muted">Bu hızla bir ay sonra günlük çalışma yaklaşık {minutes} dakika sürer; {s.dailyMinutes} dakikana sığıyor.</p>
  return (
    <p className="note">
      Bu hızla bir ay sonra günlük çalışma yaklaşık {minutes} dakika sürer, günlük süren {s.dailyMinutes} dakika: tekrarlar birikir ve yeni kelimeler çoğu gün gelmez.
      {fits > 0 && fits !== s.newWordsPerDay && (
        <>
          {' '}Bu süreye günde {fits} yeni kelime sığar.{' '}
          <button type="button" className="link" onClick={() => onApply(fits)}>
            {fits} yap
          </button>
        </>
      )}
    </p>
  )
}

/** The pace's cost, so the choice is an informed one (as in FSRS's workload simulator). */
function newWordsHelp(s: Settings): string {
  const f = forecastWorkload(s.newWordsPerDay, s.retention, s.fsrsWeights)
  const reviews = Math.round(f.reviewsAt(30) / 5) * 5
  const minutes = Math.max(1, Math.round(f.minutesAt(30)))
  return `Tekrarlar birikmişse o gün yeni kelime gelmez. Bu hızla bir ay sonra yeni kelimelerden günde yaklaşık ${reviews} tekrar (~${minutes} dk) gelir; seçimini günlük süreyle dengele.`
}

export function StudySettings({
  settings,
  onChange,
  searching,
}: {
  settings: Settings
  onChange: (s: Settings) => void
  searching: boolean
}) {
  const set = <K extends keyof Settings>(key: K, value: Settings[K]) => onChange({ ...settings, [key]: value })

  return (
    <>
      {/* Four cards, one thing each, with a row of shortcuts: the group was one long list. */}
      {!searching && <JumpNav groups={STUDY_CARDS} label="Çalışma ayarları" />}
      <section className="card stack" id="st-goal">
        <h2 className="section-title">Günlük hedef</h2>
        <Row label="Günlük süre" help="Günlük görev bu süreye sığacak şekilde hazırlanır.">
          <Chips options={MINUTES} value={settings.dailyMinutes} onChange={(v) => set('dailyMinutes', v)} format={(m) => `${m} dk`} />
        </Row>
        <Row label="Günde en fazla yeni kelime" help={newWordsHelp(settings)}>
          <Chips options={NEW_WORDS} value={settings.newWordsPerDay} onChange={(v) => set('newWordsPerDay', v)} />
        </Row>
        <PaceNote settings={settings} onApply={(n) => set('newWordsPerDay', n)} />
        <Row label="Günlük XP hedefi" help="Ana sayfada hedef çubuğu olarak görünür.">
          <Chips options={XP_GOALS} value={settings.dailyXpGoal} onChange={(v) => set('dailyXpGoal', v)} format={(x) => `${x} XP`} />
        </Row>
        <Row label="Bir oturumda en fazla" help="Uzun görevleri parçalara böler; kalanı sonraki oturuma kalır.">
          <Chips options={SESSION_MAX} value={settings.sessionMax} onChange={(v) => set('sessionMax', v)} format={(n) => (n ? `${n} soru` : 'Sınırsız')} />
        </Row>
        {!settings.sessionMax && (
          <Toggle
            label="Uzun günü ikiye böl"
            help="Günün görevi 15 dakikayı aşınca ilk oturum yarıda biter, kalanı Bugün'de bekler. Aynı çalışma iki oturuma yayılınca daha kalıcı olur ve ikinci yarı yorgun yapılmaz."
            checked={settings.splitLongDays ?? true}
            onChange={(v) => set('splitLongDays', v)}
          />
        )}
        <Row label="Çalışma planın" help="Ne zaman ve nerede çalışacağını önceden belirlemek, alışkanlığa dönüşmesini belirgin şekilde kolaylaştırır. Hatırlatma bildiriminde de görünür.">
          <input className="input" value={settings.studyPlan} onChange={(e) => onChange({ ...settings, studyPlan: e.target.value, studyPlanAsked: true })} placeholder="Sabah kahvemi içerken" />
        </Row>
      </section>
      <section className="card stack" id="st-words">
        <h2 className="section-title">Kelimeler ve hatırlama</h2>
        <Row
          label="Hedef hatırlama oranı"
          help={`Tekrar geldiğinde kelimeyi hatırlıyor olma ihtimalin. Yüksek oran daha sağlam ama daha çok tekrar demek. ${
            settings.retention === 0.9
              ? 'Varsayılan, çoğu kişi için en iyi denge.'
              : `Tekrar yükü varsayılanın yaklaşık ${relativeWorkload(settings.retention).toFixed(1).replace('.', ',')} katı.`
          }`}
        >
          <Chips options={RETENTIONS} value={settings.retention} onChange={(v) => set('retention', v)} format={(r) => `%${Math.round(r * 100)}`} />
        </Row>
        <Toggle
          label="Yeni kelimeleri sık olanlardan başlat"
          help="Açıkken eklediğin kelimeler eklenme sırası yerine sıklığa göre tanıtılır (önce en sık olanlar). Sıklık verisi: FrequencyWords (Hermit Dave), OpenSubtitles 2018, CC BY-SA 4.0."
          checked={settings.frequencyFirst}
          onChange={(v) => set('frequencyFirst', v)}
        />
        <Toggle
          label="Çok iyi bildiğin kelimeleri emekliye ayır"
          help="Tamamen öğrendiğin ve aylarca akılda kalacak kelimeler rutin tekrarlardan çıkar; günde en fazla 2 sürpriz kontrol gelir, yanılırsan kelime geri döner. Kelime sayfasından elle de yapabilirsin."
          checked={settings.autoRetire}
          onChange={(v) => set('autoRetire', v)}
        />
      </section>
      <MemoryModel settings={settings} onChange={onChange} id="st-memory" />
      <StudyCalendar settings={settings} onChange={onChange} id="st-calendar" />
    </>
  )
}
