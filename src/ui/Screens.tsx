import { useState } from 'react'
import type { DailyPlan, PlanReason } from '../engine/dailyPlan'
import type { SessionSummary } from '../engine/session'
import { CEFR_LEVELS, SKILLS, TARGET_LANGUAGES, type CefrLevel, type Skill, type TargetLanguage, type VocabularyEntry } from '../engine/types'
import { displayForm } from '../engine/exercises'
import { DEFAULT_SETTINGS, exportBackup, parseBackup, restoreBackup, type KelimeDB, type Settings } from '../data/db'
import { ERROR_NAME, LANGUAGE_NAME, REASON_TEXT, SKILL_NAME } from './labels'

const MINUTE_OPTIONS = [5, 10, 15, 20, 30]
const NEW_WORD_OPTIONS = [0, 3, 5, 8, 12]

function Chips<T extends string | number>({
  options,
  value,
  onChange,
  label,
  format = String,
}: {
  options: readonly T[]
  value: T
  onChange: (v: T) => void
  label: string
  format?: (v: T) => string
}) {
  return (
    <div className="choice-row" role="group" aria-label={label}>
      {options.map((o) => (
        <button key={o} type="button" className="chip" aria-pressed={o === value} onClick={() => onChange(o)}>
          {format(o)}
        </button>
      ))}
    </div>
  )
}

// ---------------------------------------------------------------------------

export function Onboarding({ onDone }: { onDone: (s: Settings) => void }) {
  const [language, setLanguage] = useState<TargetLanguage>('en')
  const [level, setLevel] = useState<CefrLevel>('B1')
  const [minutes, setMinutes] = useState(DEFAULT_SETTINGS.dailyMinutes)
  return (
    <div className="stack" data-lang={language}>
      <h1 className="word">Kelime Koçu</h1>
      <p className="muted">
        Kelimeleri doğru zamanda tekrar eder, hangi beceride zorlandığını izler ve her gün sana göre bir çalışma hazırlar.
      </p>
      <div className="section stack">
        <h2 className="field"><label>Hangi dille başlayalım?</label></h2>
        <Chips label="Dil" options={TARGET_LANGUAGES} value={language} onChange={setLanguage} format={(l) => LANGUAGE_NAME[l]} />
        <p className="small muted">Diğer dilleri sonra üst menüden açabilirsin.</p>
      </div>
      <div className="stack">
        <h2 className="field"><label>Bu dildeki seviyen</label></h2>
        <Chips label="Seviye" options={CEFR_LEVELS} value={level} onChange={setLevel} />
      </div>
      <div className="stack">
        <h2 className="field"><label>Günde kaç dakika?</label></h2>
        <Chips label="Günlük süre" options={MINUTE_OPTIONS} value={minutes} onChange={setMinutes} format={(m) => `${m} dk`} />
      </div>
      <div className="section">
        <button
          className="btn"
          onClick={() => onDone({ ...DEFAULT_SETTINGS, activeLanguage: language, levels: { [language]: level }, dailyMinutes: minutes })}
        >
          Başla
        </button>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------

const REASONS: PlanReason[] = ['forgotten', 'mistake', 'weak', 'due', 'new']

export function Home({
  language,
  plan,
  profile,
  vocabularyCount,
  learningCount,
  nextReview,
  onStart,
  onAddWords,
}: {
  language: TargetLanguage
  plan: DailyPlan
  profile: Record<Skill, number | null>
  vocabularyCount: number
  learningCount: number
  nextReview?: Date
  onStart: () => void
  onAddWords: () => void
}) {
  const today = new Date().toLocaleDateString('tr-TR', { weekday: 'long', day: 'numeric', month: 'long' })
  const exercises = plan.items.filter((i) => i.kind === 'exercise').length

  if (vocabularyCount === 0) {
    return (
      <div className="stack">
        <h1 className="today-title">{LANGUAGE_NAME[language]} için henüz kelimen yok</h1>
        <p className="muted">Öğrenmek istediğin kelimeleri ekle ya da bir listeyi yapıştır. Denemek için örnek kelimeler de yükleyebilirsin.</p>
        <div>
          <button className="btn" onClick={onAddWords}>
            Kelime ekle
          </button>
        </div>
      </div>
    )
  }

  return (
    <div>
      <section className="section stack">
        <p className="muted">{today}</p>
        {exercises > 0 ? (
          <>
            <h1 className="today-title">Bugünkü çalışman yaklaşık {plan.estimatedMinutes} dakika</h1>
            <ul className="mission">
              {REASONS.filter((r) => plan.counts[r] > 0).map((r) => (
                <li key={r}>{REASON_TEXT[r](plan.counts[r])}</li>
              ))}
            </ul>
            <div>
              <button className="btn" onClick={onStart} autoFocus>
                Başla
              </button>
            </div>
          </>
        ) : (
          <>
            <h1 className="today-title">Bugünlük bu kadar</h1>
            <p className="muted">
              {nextReview ? `Sıradaki tekrar ${relativeTime(nextReview)}.` : 'Yeni kelime ekleyerek devam edebilirsin.'}
            </p>
            <div>
              <button className="btn btn-quiet" onClick={onAddWords}>
                Kelime ekle
              </button>
            </div>
          </>
        )}
      </section>

      <section className="section stack">
        <h2 className="today-title">Beceriler</h2>
        <p className="small muted">
          {vocabularyCount} kelimenin {learningCount} tanesi çalışılıyor. Yüzde, şu an hatırlama olasılığın.
        </p>
        <div className="bars">
          {SKILLS.map((s) => (
            <div className="bar-row" key={s}>
              <span>{SKILL_NAME[s]}</span>
              <div className="bar-track">
                <div className="bar-fill" style={{ width: `${profile[s] ?? 0}%` }} />
              </div>
              <span className="bar-value">{profile[s] === null ? 'henüz yok' : `%${profile[s]}`}</span>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}

/** "bugün 14:47", "yarın 09:00", "cumartesi 10:15", "12 Ekim" */
export function relativeTime(d: Date, now = new Date()): string {
  const day = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime()
  const diff = Math.round((day(d) - day(now)) / 86_400_000)
  const time = d.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })
  if (diff <= 0) return `bugün ${time}`
  if (diff === 1) return `yarın ${time}`
  if (diff < 7) return `${d.toLocaleDateString('tr-TR', { weekday: 'long' }).toLocaleLowerCase('tr-TR')} ${time}`
  return d.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long' })
}

// ---------------------------------------------------------------------------

export function Summary({
  summary,
  byId,
  onDone,
}: {
  summary: SessionSummary
  byId: Map<string, VocabularyEntry>
  onDone: () => void
}) {
  const name = (id: string) => {
    const e = byId.get(id)
    return e ? displayForm(e) : id
  }
  const errors = Object.entries(summary.errors) as [keyof typeof ERROR_NAME, number][]
  return (
    <div className="stack">
      <h1 className="today-title">
        {summary.answered} sorudan {summary.correct} tanesi doğru
      </h1>
      {summary.introduced.length > 0 && (
        <p>
          <strong>Yeni:</strong> {summary.introduced.map(name).join(', ')}
        </p>
      )}
      {summary.strengthened.length > 0 && (
        <p>
          <strong>Güçlenen:</strong> {summary.strengthened.map(name).join(', ')}
        </p>
      )}
      {summary.struggling.length > 0 && (
        <p>
          <strong>Zorlandığın:</strong> {summary.struggling.map(name).join(', ')}. Yakında tekrar gelecekler.
        </p>
      )}
      {errors.length > 0 && (
        <p>
          <strong>Hata türleri:</strong> {errors.map(([t, n]) => `${ERROR_NAME[t]} (${n})`).join(', ')}
        </p>
      )}
      <div className="section">
        <button className="btn" onClick={onDone} autoFocus>
          Ana sayfaya dön
        </button>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------

export function SettingsScreen({
  db,
  settings,
  onChange,
  onRestored,
}: {
  db: KelimeDB
  settings: Settings
  onChange: (s: Settings) => void
  onRestored: () => void
}) {
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  const download = async () => {
    const json = await exportBackup(db)
    const url = URL.createObjectURL(new Blob([json], { type: 'application/json' }))
    const a = document.createElement('a')
    a.href = url
    a.download = `kelime-kocu-yedek-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(url)
    setMessage('Yedek indirildi.')
  }

  const restore = async (file: File) => {
    setError('')
    setMessage('')
    try {
      const backup = parseBackup(await file.text())
      const when = new Date(backup.exportedAt).toLocaleString('tr-TR')
      if (!confirm(`Bu cihazdaki tüm veriler ${when} tarihli yedekle değiştirilecek. Devam edilsin mi?`)) return
      await restoreBackup(db, backup)
      setMessage(`Yedek geri yüklendi: ${backup.vocabulary.length} kelime.`)
      onRestored()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Dosya okunamadı.')
    }
  }

  const level = settings.levels[settings.activeLanguage] ?? 'B1'

  return (
    <div>
      <section className="section stack">
        <h1 className="today-title">Ayarlar</h1>
        <div className="stack">
          <h2 className="field"><label>Günlük süre</label></h2>
          <Chips label="Günlük süre" options={MINUTE_OPTIONS} value={settings.dailyMinutes} onChange={(m) => onChange({ ...settings, dailyMinutes: m })} format={(m) => `${m} dk`} />
        </div>
        <div className="stack">
          <h2 className="field"><label>Günde en fazla yeni kelime</label></h2>
          <Chips label="Yeni kelime" options={NEW_WORD_OPTIONS} value={settings.newWordsPerDay} onChange={(n) => onChange({ ...settings, newWordsPerDay: n })} />
          <p className="small muted">Tekrarlar birikmişse o gün yeni kelime gelmez.</p>
        </div>
        <div className="stack">
          <h2 className="field"><label>{LANGUAGE_NAME[settings.activeLanguage]} seviyen</label></h2>
          <Chips
            label="Seviye"
            options={CEFR_LEVELS}
            value={level}
            onChange={(l) => onChange({ ...settings, levels: { ...settings.levels, [settings.activeLanguage]: l } })}
          />
          <p className="small muted">Yalnızca örnek kelimelerin sırasını etkiler. Kendi eklediklerin her zaman önce gelir.</p>
        </div>
      </section>

      <section className="section stack">
        <h2 className="today-title">Yedek</h2>
        <p className="small muted">
          Veriler yalnızca bu cihazda duruyor. Yedeği indirip başka bir cihazda geri yükleyerek taşıyabilirsin.
        </p>
        <div className="row">
          <button className="btn btn-quiet" onClick={download}>
            Yedeği indir
          </button>
          <label className="btn btn-quiet">
            Yedekten geri yükle
            <input type="file" accept=".json,application/json" className="sr-only" onChange={(e) => e.target.files?.[0] && restore(e.target.files[0])} />
          </label>
        </div>
        {message && <p className="notice" role="status">{message}</p>}
        {error && <p className="error" role="alert">{error}</p>}
      </section>
    </div>
  )
}
