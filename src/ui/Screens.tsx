import { useMemo, useState } from 'react'
import type { DailyPlan, PlanReason } from '../engine/dailyPlan'
import type { SessionSummary } from '../engine/session'
import { CEFR_LEVELS, SKILLS, TARGET_LANGUAGES, type CefrLevel, type Skill, type TargetLanguage, type VocabularyEntry } from '../engine/types'
import { displayForm } from '../engine/exercises'
import { DEFAULT_SETTINGS, exportBackup, parseBackup, restoreBackup, type KelimeDB, type Settings } from '../data/db'
import { relativeTime } from './format'
import { AlertIcon, BookIcon, CheckIcon, FlameIcon, SparkleIcon, StarIcon } from './icons'
import { ERROR_NAME, LANGUAGE_NAME, SKILL_NAME } from './labels'
import { Ring } from './Ring'

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

const HELLO: Record<TargetLanguage, string> = { en: 'Hello!', fr: 'Bonjour !', es: '¡Hola!' }
const CARD_COLOR: Record<TargetLanguage, string> = { en: 'var(--en)', fr: 'var(--fr)', es: 'var(--es-deep)' }

export function Onboarding({ onDone }: { onDone: (s: Settings) => void }) {
  const [language, setLanguage] = useState<TargetLanguage>('en')
  const [level, setLevel] = useState<CefrLevel>('B1')
  const [minutes, setMinutes] = useState(DEFAULT_SETTINGS.dailyMinutes)
  return (
    <div className="stack" data-lang={language}>
      <div className="brand" style={{ cursor: 'default' }}>
        <span className="brand-mark">k</span> Kelime Koçu
      </div>
      <h1 className="greeting" style={{ marginTop: '2rem' }}>
        Kelimeleri gerçekten kullanabileceğin şekilde öğren
      </h1>
      <p className="muted">
        Her gün sana özel kısa bir çalışma hazırlar, unutmak üzere olduğun kelimeleri tam zamanında geri getirir.
      </p>

      <div className="section stack">
        <h2 className="section-title">Hangi dille başlayalım?</h2>
        <div className="lang-cards" role="group" aria-label="Dil">
          {TARGET_LANGUAGES.map((l) => (
            <button
              key={l}
              type="button"
              className="lang-card"
              aria-pressed={l === language}
              style={{ ['--card-color' as string]: CARD_COLOR[l] }}
              onClick={() => setLanguage(l)}
            >
              <span className="hello">{HELLO[l]}</span>
              <span className="muted">{LANGUAGE_NAME[l]}</span>
            </button>
          ))}
        </div>
        <p className="small muted">Diğer dilleri sonra üstteki düğmelerden açabilirsin.</p>
      </div>
      <div className="section stack">
        <h2 className="section-title">Bu dildeki seviyen</h2>
        <Chips label="Seviye" options={CEFR_LEVELS} value={level} onChange={setLevel} />
      </div>
      <div className="section stack">
        <h2 className="section-title">Günde kaç dakika ayırabilirsin?</h2>
        <Chips label="Günlük süre" options={MINUTE_OPTIONS} value={minutes} onChange={setMinutes} format={(m) => `${m} dk`} />
      </div>
      <div className="section">
        <button
          className="btn btn-lg btn-block"
          onClick={() => onDone({ ...DEFAULT_SETTINGS, activeLanguage: language, levels: { [language]: level }, dailyMinutes: minutes })}
        >
          Başlayalım
        </button>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------

const REASON_CHIP: Record<PlanReason, (n: number) => string> = {
  forgotten: (n) => `${n} unutulmak üzere`,
  mistake: (n) => `${n} hatalı`,
  weak: (n) => `${n} zayıf`,
  due: (n) => `${n} tekrar`,
  new: (n) => `${n} yeni`,
  practice: (n) => `${n} pratik`,
}
const REASONS: PlanReason[] = ['forgotten', 'mistake', 'weak', 'due', 'new']

function greeting(now: Date): string {
  const h = now.getHours()
  if (h >= 5 && h < 12) return 'Günaydın'
  if (h >= 12 && h < 18) return 'İyi günler'
  if (h >= 18 && h < 23) return 'İyi akşamlar'
  return 'İyi geceler'
}

export function Home({
  language,
  plan,
  profile,
  vocabularyCount,
  learningCount,
  activeVocabulary,
  streak,
  answeredToday,
  nextReview,
  openMistakeWords,
  canPractice,
  onStart,
  onAddWords,
  onPracticeMistakes,
  onFreePractice,
}: {
  language: TargetLanguage
  plan: DailyPlan
  profile: Record<Skill, number | null>
  vocabularyCount: number
  learningCount: number
  activeVocabulary: number
  streak: number
  answeredToday: number
  nextReview?: Date
  openMistakeWords: number
  canPractice: boolean
  onStart: () => void
  onAddWords: () => void
  onPracticeMistakes: () => void
  onFreePractice: () => void
}) {
  const now = new Date()
  const remaining = plan.items.filter((i) => i.kind === 'exercise').length
  // Today's goal = what was already answered + what is still planned, so the ring fills as you go.
  const goal = answeredToday + remaining
  const progress = goal ? answeredToday / goal : 0

  if (vocabularyCount === 0) {
    return (
      <div className="stack">
        <h1 className="greeting">{greeting(now)}!</h1>
        <div className="hero">
          <div className="hero-body">
            <h2 className="hero-title">{LANGUAGE_NAME[language]} için ilk kelimelerini ekle</h2>
            <p className="hero-sub">Öğrenmek istediğin kelimeleri yaz ya da bir listeyi yapıştır. Denemek için örnek kelimeler de var.</p>
            <button className="btn btn-lg" onClick={onAddWords}>
              Kelime ekle
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div>
      <h1 className="greeting">{greeting(now)}!</h1>
      <p className="greeting-sub">
        {streak > 1 ? `${streak} gündür aralıksız çalışıyorsun. Seriyi bozma!` : `Bugün ${LANGUAGE_NAME[language].toLocaleLowerCase('tr-TR')} çalışıyoruz.`}
      </p>

      <div className="hero">
        <Ring value={remaining === 0 && answeredToday > 0 ? 1 : progress} doneLabel={<CheckIcon size={40} />} />
        <div className="hero-body">
          {remaining > 0 ? (
            <>
              <h2 className="hero-title">{answeredToday > 0 ? 'Güzel gidiyor, devam!' : 'Bugünün görevi'}</h2>
              <p className="hero-sub">
                {remaining} soru, yaklaşık {plan.estimatedMinutes} dakika
              </p>
              <ul className="mission">
                {REASONS.filter((r) => plan.counts[r] > 0).map((r) => (
                  <li key={r}>{REASON_CHIP[r](plan.counts[r])}</li>
                ))}
              </ul>
              <button className="btn btn-lg" onClick={onStart} autoFocus>
                {answeredToday > 0 ? 'Devam et' : 'Başla'}
              </button>
            </>
          ) : (
            <>
              <h2 className="hero-title">{answeredToday > 0 ? 'Bugünün görevi tamam!' : 'Bugün tekrar yok'}</h2>
              <p className="hero-sub">
                {nextReview ? `Sıradaki tekrar ${relativeTime(nextReview)}. ` : ''}
                {answeredToday > 0 ? `Bugün ${answeredToday} soru cevapladın.` : 'Yeni kelime ekleyerek devam edebilirsin.'}
              </p>
              <button className="btn btn-quiet" onClick={onAddWords}>
                Kelime ekle
              </button>
            </>
          )}
        </div>
      </div>

      <div className="stats">
        <div className="stat">
          <span className="stat-value">
            <FlameIcon className="icon-flame" size={22} /> {streak}
          </span>
          <span className="stat-label">günlük seri</span>
        </div>
        <div className="stat">
          <span className="stat-value">
            <StarIcon className="icon-star" size={22} /> {activeVocabulary}
          </span>
          <span className="stat-label">aktif kelime</span>
        </div>
        <div className="stat">
          <span className="stat-value">
            <BookIcon className="icon-book" size={22} /> {learningCount}
            <span className="small muted" style={{ fontWeight: 500 }}>/{vocabularyCount}</span>
          </span>
          <span className="stat-label">kelime öğreniliyor</span>
        </div>
      </div>

      {(openMistakeWords > 0 || canPractice) && (
        <section className="section stack">
          <h2 className="section-title">Ek çalışma</h2>
          <div className="tiles">
            {openMistakeWords > 0 && (
              <button className="tile" onClick={onPracticeMistakes}>
                <span className="tile-icon bad">
                  <AlertIcon size={22} />
                </span>
                <span>
                  <strong>Hatalarını düzelt</strong>
                  <span className="small muted">{openMistakeWords} kelimede açık hata</span>
                </span>
              </button>
            )}
            {canPractice && (
              <button className="tile" onClick={onFreePractice}>
                <span className="tile-icon">
                  <SparkleIcon size={22} />
                </span>
                <span>
                  <strong>Serbest pratik</strong>
                  <span className="small muted">Stressiz, hiçbir şeyi etkilemez</span>
                </span>
              </button>
            )}
          </div>
        </section>
      )}

      <section className="section stack">
        <h2 className="section-title">Beceriler</h2>
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
        <p className="small muted">Yüzde, o becerideki kelimeleri şu an hatırlama olasılığın.</p>
      </section>
    </div>
  )
}

// ---------------------------------------------------------------------------

const BURST_COLORS = ['var(--lang)', 'var(--ok)', 'var(--gold)', 'var(--flame)', 'var(--fr)', 'var(--en)']

/** One orchestrated celebration: a confetti burst behind the result ring. */
function Burst() {
  const pieces = useMemo(
    () =>
      Array.from({ length: 28 }, (_, i) => {
        const angle = (i / 28) * Math.PI * 2
        const dist = 90 + ((i * 37) % 70)
        return {
          x: `${Math.cos(angle) * dist * 1.6}px`,
          y: `${Math.sin(angle) * dist - 30}px`,
          r: `${(i * 47) % 360}deg`,
          color: BURST_COLORS[i % BURST_COLORS.length],
          delay: `${(i % 5) * 30}ms`,
        }
      }),
    [],
  )
  return (
    <div className="burst" aria-hidden>
      {pieces.map((p, i) => (
        <span
          key={i}
          style={{ background: p.color, animationDelay: p.delay, ['--x' as string]: p.x, ['--y' as string]: p.y, ['--r' as string]: p.r }}
        />
      ))}
    </div>
  )
}

function headline(accuracy: number, practice?: boolean): string {
  if (accuracy >= 0.9) return 'Muhteşem bir oturum!'
  if (accuracy >= 0.7) return 'Çok iyi gidiyorsun!'
  if (practice) return 'Pratik bunun için var!'
  return 'Her hata bir adım. Devam!'
}

export function Summary({
  summary,
  byId,
  practice,
  streak,
  onDone,
}: {
  summary: SessionSummary
  byId: Map<string, VocabularyEntry>
  practice?: boolean
  streak: number
  onDone: () => void
}) {
  const name = (id: string) => {
    const e = byId.get(id)
    return e ? displayForm(e) : id
  }
  const accuracy = summary.answered ? summary.correct / summary.answered : 0
  const errors = Object.entries(summary.errors) as [keyof typeof ERROR_NAME, number][]
  return (
    <div className="stack">
      <div className="celebrate">
        {accuracy >= 0.7 && <Burst />}
        <Ring value={accuracy} size={140} stroke={14} label={`%${Math.round(accuracy * 100)}`} doneLabel="%100" />
        <h1>{headline(accuracy, practice)}</h1>
        <p className="muted" style={{ marginTop: '0.5rem' }}>
          {summary.answered} sorudan {summary.correct} tanesini doğru bildin.
          {practice && ' Serbest pratikti: takvimin ve hata listen değişmedi.'}
        </p>
      </div>

      <div className="summary-stats">
        <div className="stat">
          <span className="stat-value">
            <FlameIcon className="icon-flame" size={22} /> {streak}
          </span>
          <span className="stat-label">günlük seri</span>
        </div>
        <div className="stat">
          <span className="stat-value">
            <SparkleIcon className="icon-book" size={22} /> {summary.introduced.length}
          </span>
          <span className="stat-label">yeni kelime</span>
        </div>
        <div className="stat">
          <span className="stat-value">
            <StarIcon className="icon-star" size={22} /> {practice ? 0 : summary.strengthened.length}
          </span>
          <span className="stat-label">güçlenen</span>
        </div>
      </div>

      {summary.introduced.length > 0 && (
        <p>
          <strong>Yeni tanıştıkların:</strong> <span className="target">{summary.introduced.map(name).join(', ')}</span>
        </p>
      )}
      {!practice && summary.strengthened.length > 0 && (
        <p>
          <strong>Bir üst seviyeye çıkanlar:</strong> <span className="target">{summary.strengthened.map(name).join(', ')}</span>
        </p>
      )}
      {summary.struggling.length > 0 && (
        <p>
          <strong>Biraz zorlandıkların:</strong> <span className="target">{summary.struggling.map(name).join(', ')}</span>.
          {!practice && <span className="muted"> Yakında tekrar karşına çıkacaklar.</span>}
        </p>
      )}
      {errors.length > 0 && (
        <p className="small muted">Hata türleri: {errors.map(([t, n]) => `${ERROR_NAME[t]} (${n})`).join(', ')}</p>
      )}
      <div className="section">
        <button className="btn btn-lg btn-block" onClick={onDone} autoFocus>
          Devam
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
      <section className="stack">
        <h1 className="greeting">Ayarlar</h1>
        <div className="card stack">
          <h2 className="section-title">Günlük süre</h2>
          <Chips label="Günlük süre" options={MINUTE_OPTIONS} value={settings.dailyMinutes} onChange={(m) => onChange({ ...settings, dailyMinutes: m })} format={(m) => `${m} dk`} />
        </div>
        <div className="card stack">
          <h2 className="section-title">Günde en fazla yeni kelime</h2>
          <Chips label="Yeni kelime" options={NEW_WORD_OPTIONS} value={settings.newWordsPerDay} onChange={(n) => onChange({ ...settings, newWordsPerDay: n })} />
          <p className="small muted">Tekrarlar birikmişse o gün yeni kelime gelmez.</p>
        </div>
        <div className="card stack">
          <h2 className="section-title">{LANGUAGE_NAME[settings.activeLanguage]} seviyen</h2>
          <Chips
            label="Seviye"
            options={CEFR_LEVELS}
            value={level}
            onChange={(l) => onChange({ ...settings, levels: { ...settings.levels, [settings.activeLanguage]: l } })}
          />
          <p className="small muted">Yalnızca örnek kelimelerin sırasını etkiler. Kendi eklediklerin her zaman önce gelir.</p>
        </div>
      </section>

      <section className="section card stack">
        <h2 className="section-title">Yedek</h2>
        <p className="small muted">Veriler yalnızca bu cihazda duruyor. Yedeği indirip başka bir cihazda geri yükleyerek taşıyabilirsin.</p>
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
