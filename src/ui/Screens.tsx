import { useEffect, useMemo, useState, type ReactNode } from 'react'
import type { DailyPlan, NewWordsBlock, PlanReason } from '../engine/dailyPlan'
import type { SessionSummary } from '../engine/session'
import { SKILLS, TARGET_LANGUAGES, type Skill, type TargetLanguage, type VocabularyEntry } from '../engine/types'
import { displayForm } from '../engine/exercises'
import { MASTERY_STAGES } from '../engine/mastery'
import { DEFAULT_SETTINGS, type Settings } from '../data/db'
import { relativeTime } from './format'
import { AlertIcon, BookIcon, CheckIcon, FlameIcon, SparkleIcon, StarIcon, StoryIcon } from './icons'
import { ERROR_NAME, LANGUAGE_NAME, SKILL_NAME, STAGE_NAME } from './labels'
import { Plant } from './Plant'
import { RaceCard } from './Race'
import { CHALLENGE_XP } from '../engine/challenges'
import { InstallHint } from './InstallHint'
import { Ring } from './Ring'
import { useGame, type GameState } from './game'
import { sfx } from './sounds'

const MINUTE_OPTIONS = [5, 10, 15, 20, 30]

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
  const [minutes, setMinutes] = useState(DEFAULT_SETTINGS.dailyMinutes)
  const [name, setName] = useState('')
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
        <h2 className="section-title">Adın ne?</h2>
        <input className="input" style={{ maxWidth: '20rem' }} value={name} onChange={(e) => setName(e.target.value)} placeholder="Adın" aria-label="Adın" autoFocus />
      </div>
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
        <h2 className="section-title">Günde kaç dakika ayırabilirsin?</h2>
        <Chips label="Günlük süre" options={MINUTE_OPTIONS} value={minutes} onChange={setMinutes} format={(m) => `${m} dk`} />
      </div>
      <div className="section">
        <button
          className="btn btn-lg btn-block"
          onClick={() => onDone({ ...DEFAULT_SETTINGS, activeLanguage: language, dailyMinutes: minutes, profile: { ...DEFAULT_SETTINGS.profile, name: name.trim() } })}
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

/** Why no (more) new words today, said plainly so the plan never looks stuck. */
const NEW_BLOCK_TEXT: Record<NewWordsBlock, (n: number) => string> = {
  limit: (n) => `Günlük yeni kelime sınırına ulaştın; ${n} kelime sırada bekliyor.`,
  backlog: (n) => `Önce biriken tekrarlar bitsin; ${n} yeni kelime sırada.`,
  budget: (n) => `Günlük süren doldu; ${n} yeni kelime sırada.`,
  none_left: () => '',
}

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
  name,
  dailyXpGoal,
  answeredToday,
  nextReview,
  openMistakeWords,
  canPractice,
  onStart,
  onAddWords,
  onProfile,
  onStory,
  onGames,
  onExtraNew,
  onPracticeMistakes,
  onFreePractice,
  extra,
}: {
  language: TargetLanguage
  plan: DailyPlan
  profile: Record<Skill, number | null>
  vocabularyCount: number
  learningCount: number
  activeVocabulary: number
  name: string
  dailyXpGoal: number
  answeredToday: number
  nextReview?: Date
  openMistakeWords: number
  canPractice: boolean
  onStart: () => void
  onAddWords: () => void
  onProfile: () => void
  onStory?: () => void
  onGames?: () => void
  onExtraNew: () => void
  onPracticeMistakes: () => void
  onFreePractice: () => void
  /** Habit nudges shown under the day's mission. */
  extra?: ReactNode
}) {
  const now = new Date()
  const game = useGame()
  const streak = game?.streak ?? 0
  const hello = `${greeting(now)}${name ? `, ${name}` : ''}!`
  const remaining = plan.items.filter((i) => i.kind === 'exercise').length
  // Today's goal = what was already answered + what is still planned, so the ring fills as you go.
  const goal = answeredToday + remaining
  const progress = goal ? answeredToday / goal : 0

  if (vocabularyCount === 0) {
    return (
      <div className="stack">
        <h1 className="greeting">{hello}</h1>
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
              {plan.newBlockedBy && plan.waitingNew > 0 && (
                <p className="small muted" style={{ marginTop: '0.75rem' }}>
                  {plan.newEntryIds.length > 0 && plan.newBlockedBy === 'limit'
                    ? `${plan.waitingNew} kelime daha sırada; günlük sınırı Ayarlar'dan artırabilirsin.`
                    : NEW_BLOCK_TEXT[plan.newBlockedBy](plan.waitingNew)}
                </p>
              )}
            </>
          ) : (
            <>
              <h2 className="hero-title">{answeredToday > 0 ? 'Bugünün görevi tamam!' : 'Bugün tekrar yok'}</h2>
              <p className="hero-sub">
                {answeredToday > 0 && `Bugün ${answeredToday} soru cevapladın. `}
                {nextReview && `Sıradaki tekrar ${relativeTime(nextReview)}. `}
                {plan.waitingNew > 0 && NEW_BLOCK_TEXT[plan.newBlockedBy ?? 'limit'](plan.waitingNew)}
              </p>
              {plan.waitingNew > 0 ? (
                <button className="btn btn-lg" onClick={onExtraNew}>
                  +{Math.min(5, plan.waitingNew)} yeni kelime öğren
                </button>
              ) : (
                <button className="btn btn-quiet" onClick={onAddWords}>
                  Kelime ekle
                </button>
              )}
            </>
          )}
        </div>
      </div>

      {extra}

      {game && (
        <button className="level-strip" onClick={onProfile}>
          <span className="level-badge">Sv. {game.level.level}</span>
          <span className="level-strip-body">
            <span className="level-strip-top">
              <strong>{game.level.title}</strong>
              <span className="small muted">
                {game.level.into.toLocaleString('tr-TR')} / {game.level.needed.toLocaleString('tr-TR')} XP
              </span>
            </span>
            <span className="xp-bar xp-bar-sm">
              <span style={{ width: `${game.level.progress * 100}%` }} />
            </span>
          </span>
          <span className={`daily-goal${game.xp.today >= dailyXpGoal ? ' is-done' : ''}`}>
            <span className="small muted">Bugün</span>
            <strong>
              {game.xp.today}/{dailyXpGoal} XP
            </strong>
          </span>
        </button>
      )}

      <InstallHint />
      {game && <RaceCard game={game} />}

      {game && (
        <section className="quests">
          <h2 className="section-title">Günün görevleri</h2>
          <ul className="quest-list">
            {game.quests.map((q) => (
              <li key={q.id} className={q.done ? 'is-done' : ''}>
                <span className="quest-icon">{q.done ? '✅' : q.icon}</span>
                <span className="quest-body">
                  <span className="quest-top">
                    <strong>{q.title}</strong>
                    <span className="small muted">
                      {q.value}/{q.target}
                    </span>
                  </span>
                  <span className="quest-bar">
                    <span style={{ width: `${(q.value / q.target) * 100}%` }} />
                  </span>
                </span>
                <span className="quest-xp">+{q.xp} XP</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {game && game.weekly.length > 0 && (
        <section className="quests">
          <h2 className="section-title">Haftanın meydan okumaları</h2>
          <ul className="quest-list">
            {game.weekly.map((q) => (
              <li key={q.id} className={q.done ? 'is-done' : ''}>
                <span className="quest-icon">{q.done ? '🏅' : q.icon}</span>
                <span className="quest-body">
                  <span className="quest-top">
                    <strong>{q.title}</strong>
                    <span className="small muted">
                      {q.value}/{q.target}
                    </span>
                  </span>
                  <span className="quest-bar">
                    <span style={{ width: `${(q.value / q.target) * 100}%` }} />
                  </span>
                </span>
                <span className="quest-xp">+{CHALLENGE_XP} XP</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <div className="stats">
        <div className="stat">
          <span className="stat-value">
            <FlameIcon className="icon-flame" size={22} /> {streak}
            {(game?.freezes ?? 0) > 0 && (
              <span className="freeze" title="Seri dondurma: çalışamadığın bir günde serini otomatik korur. 7 günlük her seride bir tane kazanırsın.">
                ❄️{game!.freezes}
              </span>
            )}
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

      {(openMistakeWords > 0 || canPractice || onStory || onGames) && (
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
            {onStory && (
              <button className="tile" onClick={onStory}>
                <span className="tile-icon">
                  <StoryIcon size={22} />
                </span>
                <span>
                  <strong>Hikayenin yeni bölümü</strong>
                  <span className="small muted">Zorlandığın kelimelerle yazılır</span>
                </span>
              </button>
            )}
            {onGames && (
              <button className="tile" onClick={onGames}>
                <span className="tile-icon">
                  <span style={{ fontSize: '1.25rem' }}>🧩</span>
                </span>
                <span>
                  <strong>Oyunlar</strong>
                  <span className="small muted">Eşleştirme ve 60 saniye</span>
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

/** Answers after which a session counts as long enough to suggest splitting it. */
const LONG_SESSION = 40

export function Summary({
  summary,
  byId,
  practice,
  before,
  after,
  onDone,
}: {
  summary: SessionSummary
  byId: Map<string, VocabularyEntry>
  practice?: boolean
  before: GameState | null
  after: GameState | null
  onDone: () => void
}) {
  const name = (id: string) => {
    const e = byId.get(id)
    return e ? displayForm(e) : id
  }
  const accuracy = summary.answered ? summary.correct / summary.answered : 0
  const errors = Object.entries(summary.errors) as [keyof typeof ERROR_NAME, number][]
  const leveledUp = !!before && !!after && after.level.level > before.level.level
  const newBadges = before && after ? after.achievements.filter((a) => a.unlocked && !before.achievements.find((b) => b.id === a.id)?.unlocked) : []

  useEffect(() => {
    if (leveledUp || newBadges.length) sfx.levelUp()
    // Play once when the summary opens.
  }, [])

  return (
    <div className="stack">
      <div className="celebrate">
        {(accuracy >= 0.7 || leveledUp) && <Burst />}
        <Ring value={accuracy} size={140} stroke={14} label={`%${Math.round(accuracy * 100)}`} doneLabel="%100" />
        <h1>{headline(accuracy, practice)}</h1>
        <p className="muted" style={{ marginTop: '0.5rem' }}>
          {summary.answered} sorudan {summary.correct} tanesini doğru bildin.
          {practice && ' Serbest pratikti: takvimin ve hata listen değişmedi.'}
        </p>
        <p className="xp-gain">+{summary.xp} XP</p>
      </div>

      {leveledUp && after && (
        <div className="level-up">
          <span className="level-badge" style={{ fontSize: '1.25rem', height: '2.5rem', minWidth: '3rem' }}>
            {after.level.level}
          </span>
          <div>
            <strong>Seviye atladın!</strong>
            <p className="small">
              Artık {after.level.level}. seviyedesin: <strong>{after.level.title}</strong>
            </p>
          </div>
        </div>
      )}

      {newBadges.length > 0 && (
        <div className="stack">
          <h2 className="section-title">Yeni rozet{newBadges.length > 1 ? 'ler' : ''}!</h2>
          <div className="badge-grid">
            {newBadges.map((a) => (
              <div key={a.id} className="badge-card is-unlocked">
                <span className="badge-icon">{a.icon}</span>
                <strong>{a.title}</strong>
                <span className="small muted">{a.description}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {after && (
        <div className="summary-stats">
          <div className="stat">
            <span className="stat-value">
              <FlameIcon className="icon-flame" size={22} /> {after.streak}
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
      )}

      {summary.words.length > 0 && (
        <section className="section stack">
          <h2 className="section-title">Bu oturumda çalıştıkların</h2>
          <ul className="garden">
            {summary.words.map((w) => {
              const e = byId.get(w.entryId)
              const before = w.stageBefore ? MASTERY_STAGES.indexOf(w.stageBefore) : -1
              const after = w.stageAfter ? MASTERY_STAGES.indexOf(w.stageAfter) : before
              const grew = !practice && after > before
              return (
                <li key={w.entryId} className={grew ? 'grew' : ''}>
                  <Plant stage={after} size={40} />
                  <span className="garden-text">
                    <span className="target">{name(w.entryId)}</span>
                    {e && <span className="small muted">{e.senses[0].gloss}</span>}
                    <span className="small">
                      {w.correct > 0 && <span className="garden-ok">✓ {w.correct}</span>} {w.wrong > 0 && <span className="garden-bad">✗ {w.wrong}</span>}
                      {grew && w.stageAfter && <span className="garden-grew"> 🌱 {STAGE_NAME[w.stageAfter]} oldu</span>}
                      {!grew && w.wrong > 0 && !practice && <span className="muted"> · yakında tekrar</span>}
                    </span>
                  </span>
                </li>
              )
            })}
          </ul>
        </section>
      )}
      {errors.length > 0 && <p className="small muted">Hata türleri: {errors.map(([t, n]) => `${ERROR_NAME[t]} (${n})`).join(', ')}</p>}
      {summary.answered >= LONG_SESSION && (
        <p className="habit-tip">
          ⏱️ Uzun bir oturumdu. Aynı süreyi gün içine yayılmış 2–3 kısa tura bölmek daha kalıcı öğretir (dağıtılmış pratik): bir sonraki turu birkaç saat sonra
          yap.
        </p>
      )}
      <div className="section">
        <button className="btn btn-lg btn-block" onClick={onDone} autoFocus>
          Devam
        </button>
      </div>
    </div>
  )
}
