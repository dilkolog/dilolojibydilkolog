import { useEffect, useState } from 'react'
import type { KelimeDB, Settings } from '../data/db'
import type { TargetLanguage, CefrLevel } from '../engine/types'
import { CEFR_LEVELS, type LevelCoverage } from '../engine/cefrLevels'
import { calculateGoalProgress, type CefrGoal } from '../engine/goalPlanner'
import { AlertIcon, CalendarIcon, CheckCircleIcon, SparkleIcon, TargetIcon } from './icons'
import { showToast } from './toastFeed'

/** The levels a goal can be set for. */
const GOAL_LEVELS: readonly CefrLevel[] = CEFR_LEVELS.filter((l) => ['A1', 'A2', 'B1', 'B2'].includes(l))

const TIMEFRAMES = [
  { days: 30, label: '1 ay (30 gün)' },
  { days: 60, label: '2 ay (60 gün)' },
  { days: 90, label: '3 ay (90 gün)' },
  { days: 180, label: '6 ay (180 gün)' },
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
    return (
      <section className="card stack gap-2 goal-card" aria-label="Seviye Hedefi">
        <div className="cluster justify-between align-center">
          <div className="cluster gap-2 align-center">
            <TargetIcon size={20} className="goal-icon" />
            <h3 className="section-title m-0">{progress.level} Seviye Hedefi</h3>
          </div>
          {progress.isCompleted ? (
            <span className="chip chip-ok"><CheckCircleIcon size={14} /> Hedefe Ulaşıldı!</span>
          ) : progress.pace === 'ahead' ? (
            <span className="chip chip-ok"><SparkleIcon size={14} /> Hedefin Önündesin</span>
          ) : progress.pace === 'on_track' ? (
            <span className="chip"><TargetIcon size={14} /> Tam Tempodasın</span>
          ) : (
            <span className="chip chip-warn"><AlertIcon size={14} /> Geridesin</span>
          )}
        </div>

        <div className="goal-progress-wrap stack gap-1">
          <div className="cluster justify-between small muted">
            <span>İlerleme: %{progress.percent}</span>
            <span>{progress.wordsRemaining} kelime kaldı</span>
          </div>
          <div className="band-bar" role="progressbar" aria-valuenow={progress.percent} aria-valuemin={0} aria-valuemax={100}>
            <span className="bb-known" style={{ width: `${progress.percent}%` }} />
          </div>
        </div>

        <div className="goal-stats-grid">
          <div className="goal-stat">
            <span className="small muted">Hedef Tarih</span>
            <strong>{progress.targetDate}</strong>
            <span className="tiny muted">{progress.daysRemaining} gün kaldı</span>
          </div>
          <div className="goal-stat">
            <span className="small muted">Önerilen Kota</span>
            <strong>Günde {progress.suggestedDailyNew} kelime</strong>
            <span className="tiny muted">Şu anki: {settings.newWordsPerDay}</span>
          </div>
        </div>

        {progress.unrealistic && !progress.isOverdue && (
          <p className="small muted m-0">
            Bu tarihe yetişmek için günde {progress.neededDailyNew} yeni kelime gerekiyor; bu çok fazla. Tarihi ileri almayı düşün.
          </p>
        )}
        {progress.isOverdue && <p className="small muted m-0">Hedef tarih geçti. Yeni bir tarih seçmek için hedefi düzenle.</p>}
        {!progress.isCompleted && !progress.isOverdue && settings.newWordsPerDay !== progress.suggestedDailyNew && progress.suggestedDailyNew > 0 && (
          <button
            type="button"
            className="btn btn-sm btn-quiet align-self-start"
            onClick={() => applySuggestedQuota(progress.suggestedDailyNew)}
          >
            Günlük kotayı {progress.suggestedDailyNew} yap
          </button>
        )}

        <div className="cluster gap-3 pt-1">
          <button type="button" className="link small" onClick={() => setIsEditing(true)}>
            Hedefi düzenle
          </button>
          <button type="button" className="link small text-warn" onClick={removeGoal}>
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
    <section className="card stack gap-2 goal-card-form" aria-label="Seviye Hedefi Planla">
      <div className="cluster gap-2 align-center">
        <TargetIcon size={20} className="goal-icon" />
        <h3 className="section-title m-0">Seviye Hedefi Belirle</h3>
      </div>
      <p className="small muted m-0">
        Ulaşmak istediğin CEFR seviyesini ve hedef tarihini seç; kalan kelimelerine göre günlük çalışma kotan otomatik hesaplansın.
      </p>

      <div className="stack gap-1">
        <label className="small font-bold" htmlFor="goal-level-select">Hedef Seviye</label>
        <div className="segmented" role="group" aria-label="Hedef Seviye">
          {GOAL_LEVELS.map((lvl) => (
            <button
              key={lvl}
              type="button"
              className="segmented-btn"
              aria-pressed={selectedLevel === lvl}
              onClick={() => setSelectedLevel(lvl)}
            >
              {lvl}
            </button>
          ))}
        </div>
      </div>

      <div className="stack gap-1">
        <span className="small font-bold">Hedef Süre</span>
        <div className="cluster gap-1">
          {TIMEFRAMES.map((tf) => (
            <button
              key={tf.days}
              type="button"
              className={`chip ${selectedDays === tf.days && !customDate ? 'chip-active' : ''}`}
              onClick={() => {
                setSelectedDays(tf.days)
                setCustomDate('')
              }}
            >
              <CalendarIcon size={14} />
              <span>{tf.label}</span>
            </button>
          ))}
        </div>
        <div className="cluster align-center gap-2 pt-1">
          <span className="small muted">Veya özel tarih:</span>
          <input
            type="date"
            aria-label="Özel hedef tarihi"
            className="input input-sm"
            min={todayIso()}
            value={customDate}
            onChange={(e) => setCustomDate(e.target.value)}
          />
        </div>
      </div>

      <div className="note goal-preview-note">
        <span className="small">
          🎯 <strong>{selectedLevel}</strong> için ~<strong>{previewProgress.wordsRemaining}</strong> yeni kelime gerekiyor.
          Hedef tarihe ({effectiveTargetDate}) kadar günde <strong>{previewProgress.neededDailyNew}</strong> yeni kelime gerekir
          {previewProgress.unrealistic ? '; bu çok fazla, daha uzak bir tarih seç.' : '.'}
        </span>
      </div>

      <div className="cluster gap-2 pt-1">
        <button
          type="button"
          className="btn btn-sm"
          onClick={() => saveGoal(selectedLevel, effectiveTargetDate)}
        >
          Hedefi Kaydet
        </button>
        {activeGoal && (
          <button
            type="button"
            className="btn btn-sm btn-quiet"
            onClick={() => setIsEditing(false)}
          >
            Vazgeç
          </button>
        )}
      </div>
    </section>
  )
}
