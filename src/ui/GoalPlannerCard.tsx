import { useEffect, useState } from 'react'
import type { KelimeDB, Settings } from '../data/db'
import type { TargetLanguage, CefrLevel } from '../engine/types'
import { CEFR_LEVELS, type LevelCoverage } from '../engine/cefrLevels'
import { calculateGoalProgress, type CefrGoal } from '../engine/goalPlanner'
import { CalendarIcon, TargetIcon } from './icons'
import { showToast } from './toastFeed'

/** The levels a goal can be set for. */
const GOAL_LEVELS: readonly CefrLevel[] = CEFR_LEVELS.filter((l) => ['A1', 'A2', 'B1', 'B2'].includes(l))

const TIMEFRAMES = [
  { days: 30, label: '1 ay' },
  { days: 60, label: '2 ay' },
  { days: 90, label: '3 ay' },
  { days: 180, label: '6 ay' },
]

function dateAfterDays(days: number): string {
  const d = new Date(Date.now() + days * 86_400_000)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function todayIso(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export function GoalPlannerCard({
  db,
  language,
  levels,
  onSettingsChange,
}: {
  db: KelimeDB
  language: TargetLanguage
  levels: LevelCoverage[]
  /** Saves the settings through the app (so its own copy and the daily plan follow); without it the card saves directly. */
  onSettingsChange?: (settings: Settings) => Promise<void> | void
}) {
  const [settings, setSettings] = useState<Settings | null>(null)
  const [isEditing, setIsEditing] = useState(false)
  const [selectedLevel, setSelectedLevel] = useState<CefrLevel>('A2')
  const [selectedDays, setSelectedDays] = useState(90)
  const [customDate, setCustomDate] = useState('')

  useEffect(() => {
    void db.getSettings().then((s) => {
      if (!s) return
      setSettings(s)
      const existing = s.cefrGoals?.[language]
      if (existing) {
        setSelectedLevel(existing.level)
      } else {
        // Pick the first incomplete level the form offers as default
        const next = levels.find((l) => GOAL_LEVELS.includes(l.level) && l.known / Math.max(1, l.total) < 0.85)
        if (next) setSelectedLevel(next.level)
      }
    })
  }, [db, language, levels])

  if (!settings || !levels.length) return null

  const activeGoal = settings.cefrGoals?.[language]

  // Every change starts from the stored settings, not this card's copy: a sync or another screen may have changed them since.
  const change = async (edit: (s: Settings) => Settings) => {
    const updated = edit((await db.getSettings()) ?? settings)
    if (onSettingsChange) await onSettingsChange(updated)
    else await db.saveSettings(updated)
    setSettings(updated)
  }

  const saveGoal = async (level: CefrLevel, targetDate: string) => {
    const newGoal: CefrGoal = {
      level,
      targetDate,
      createdAt: activeGoal?.createdAt ?? todayIso(),
    }
    await change((s) => ({ ...s, cefrGoals: { ...s.cefrGoals, [language]: newGoal } }))
    setIsEditing(false)
    showToast(`${level} hedefi kaydedildi.`)
  }

  const removeGoal = async () => {
    await change((s) => {
      const goals = { ...s.cefrGoals }
      delete goals[language]
      return { ...s, cefrGoals: goals }
    })
    setIsEditing(false)
    showToast('Hedef kaldırıldı.')
  }

  const applySuggestedQuota = async (quota: number) => {
    await change((s) => ({ ...s, newWordsPerDay: quota }))
    showToast(`Günlük yeni kelime ${quota} olarak güncellendi.`)
  }

  if (activeGoal && !isEditing) {
    const progress = calculateGoalProgress(activeGoal, levels, settings.newWordsPerDay)
    const [badge, badgeClass] = progress.isCompleted
      ? ['Hedefe ulaştın', 'is-ok']
      : progress.isOverdue
        ? ['Tarih geçti', 'is-behind']
        : progress.pace === 'ahead'
          ? ['Önündesin', 'is-ok']
          : progress.pace === 'on_track'
            ? ['Tempodasın', '']
            : ['Geridesin', 'is-behind']
    return (
      <section className="goal-panel stack" aria-label="Seviye hedefi">
        <div className="goal-panel-head">
          <TargetIcon size={20} className="goal-icon" />
          <h3 className="goal-panel-title">{progress.level} seviye hedefi</h3>
          <span className={`pill goal-pace ${badgeClass}`}>{badge}</span>
        </div>

        <div className="stack goal-progress">
          <div className="goal-progress-line small muted">
            <span>%{progress.percent}</span>
            <span>{progress.wordsRemaining.toLocaleString('tr')} kelime kaldı</span>
          </div>
          <div className="band-bar" role="progressbar" aria-label="Hedefe ilerleme" aria-valuenow={progress.percent} aria-valuemin={0} aria-valuemax={100}>
            <span className="bb-known" style={{ width: `${progress.percent}%` }} />
          </div>
        </div>

        <div className="goal-stats-grid">
          <div className="goal-stat">
            <span className="small muted">Hedef tarih</span>
            <strong>{dateText(progress.targetDate)}</strong>
            <span className="small muted">{progress.isOverdue ? 'geçti' : `${progress.daysRemaining} gün kaldı`}</span>
          </div>
          <div className="goal-stat">
            <span className="small muted">Önerilen</span>
            <strong>Günde {progress.suggestedDailyNew} kelime</strong>
            <span className="small muted">Şu an: {settings.newWordsPerDay}</span>
          </div>
        </div>

        {progress.unrealistic && !progress.isOverdue && (
          <p className="small muted">
            Bu tarihe yetişmek için günde {progress.neededDailyNew} yeni kelime gerekiyor; bu çok fazla. Tarihi ileri almayı düşün.
          </p>
        )}
        {progress.isOverdue && <p className="small muted">Hedef tarih geçti. Yeni bir tarih seçmek için hedefi düzenle.</p>}

        <div className="row goal-actions">
          {!progress.isCompleted && !progress.isOverdue && settings.newWordsPerDay !== progress.suggestedDailyNew && progress.suggestedDailyNew > 0 && (
            <button type="button" className="btn btn-sm" onClick={() => applySuggestedQuota(progress.suggestedDailyNew)}>
              Günlük kotayı {progress.suggestedDailyNew} yap
            </button>
          )}
          <button type="button" className="link small" onClick={() => setIsEditing(true)}>
            Hedefi düzenle
          </button>
          <button type="button" className="link small" onClick={removeGoal}>
            Hedefi kaldır
          </button>
        </div>
      </section>
    )
  }

  // Form to set or edit goal
  const effectiveTargetDate = customDate.trim() || dateAfterDays(selectedDays)
  const previewProgress = calculateGoalProgress(
    { level: selectedLevel, targetDate: effectiveTargetDate, createdAt: todayIso() },
    levels,
    settings.newWordsPerDay,
  )

  return (
    <section className="goal-panel stack" aria-label="Seviye hedefi planla">
      <div className="goal-panel-head">
        <TargetIcon size={20} className="goal-icon" />
        <h3 className="goal-panel-title">Seviye hedefi belirle</h3>
      </div>
      <p className="small muted">
        Ulaşmak istediğin seviyeyi ve tarihi seç; kalan kelimelere göre günde kaç yeni kelime gerektiğini hesaplayalım.
      </p>

      <div className="stack goal-field">
        <strong className="small">Seviye</strong>
        <div className="segmented" role="group" aria-label="Hedef seviye">
          {GOAL_LEVELS.map((lvl) => (
            <button key={lvl} type="button" className="segmented-btn" aria-pressed={selectedLevel === lvl} onClick={() => setSelectedLevel(lvl)}>
              {lvl}
            </button>
          ))}
        </div>
      </div>

      <div className="stack goal-field">
        <strong className="small">Süre</strong>
        <div className="choice-row" role="group" aria-label="Hedef süre">
          {TIMEFRAMES.map((tf) => (
            <button
              key={tf.days}
              type="button"
              className="chip chip-sm"
              aria-pressed={selectedDays === tf.days && !customDate}
              title={`${tf.days} gün`}
              onClick={() => {
                setSelectedDays(tf.days)
                setCustomDate('')
              }}
            >
              {tf.label}
            </button>
          ))}
        </div>
        <label className="goal-date small muted">
          <CalendarIcon size={16} />
          <span>ya da tarih seç</span>
          <input type="date" aria-label="Özel hedef tarihi" className="input" min={todayIso()} value={customDate} onChange={(e) => setCustomDate(e.target.value)} />
        </label>
      </div>

      <p className="note small goal-preview-note">
        <strong>{selectedLevel}</strong> için yaklaşık <strong>{previewProgress.wordsRemaining.toLocaleString('tr')}</strong> kelime daha gerekiyor.{' '}
        {dateText(effectiveTargetDate)} tarihine kadar günde <strong>{previewProgress.neededDailyNew}</strong> yeni kelime
        {previewProgress.unrealistic ? '; bu çok fazla, daha uzak bir tarih seç.' : '.'}
      </p>

      <div className="row">
        <button type="button" className="btn btn-sm" onClick={() => saveGoal(selectedLevel, effectiveTargetDate)}>
          Hedefi kaydet
        </button>
        {activeGoal && (
          <button type="button" className="btn btn-sm btn-quiet" onClick={() => setIsEditing(false)}>
            Vazgeç
          </button>
        )}
      </div>
    </section>
  )
}

/** "19 Ocak 2027" for a stored yyyy-mm-dd day; anything else as it is. */
function dateText(day: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(day)
  if (!m) return day
  return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' })
}
