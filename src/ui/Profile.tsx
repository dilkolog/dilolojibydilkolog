import '../lazy.css'
import { useEffect, useState } from 'react'
import { BADGE_CATEGORIES, badgeCategory, badgeSeries, levelTitle, medalTier, type BadgeSeries } from '../engine/gamification'
import type { Profile, Settings } from '../data/db'
import { db } from '../data/instance'
import { Avatar } from './Avatar'
import { DRAWN_AVATARS, DRAWN_AVATAR_IDS, drawnAvatarName } from './avatarArt'
import { ProgressCardButton } from './ProgressCard'
import { useGame } from './game'
import { CheckCircleIcon, CloseIcon, GearIcon, PaletteIcon, SmileIcon, SproutIcon, StarIcon } from './icons'
import { ImagePicker } from './ImagePicker'
import { TIER_NAME } from './badgeTier'
import { Medal } from './Medal'
import { StreakFlame } from './StreakFlame'
import { localDate } from '../engine/progress'
import { bannerOf, daysUntil, frameOf, pinnedBadges, titleName, type Unlockables } from '../engine/profileStyle'
import { timeOf } from '../engine/types'
import { ProfileCustomizer } from './ProfileCustomizer'
import { useTabIndicator } from './useTabIndicator'
import { ProfileTitles } from './ProfileTitles'
import { CATEGORY_EMBLEM, EMBLEM, drawnMedal, levelMonki } from './drawnArt'

/** The glyph avatars; the animals Monki's set draws (fox, panda, owl, octopus, penguin, koala) are not repeated as emoji. */
const EMOJIS = ['🦁', '🐢', '🐬', '🦄', '🐝', '🦋', '🌵', '🚀', '📚', '🎧', '☕', '🌍', '🎨', '⚡']
const COLORS = ['#2563eb', '#db2777', '#f59e0b', '#10b981', '#8b5cf6', '#ef4444', '#0ea5e9', '#475569']
const LADDER: [number, string][] = [1, 3, 5, 8, 11, 15, 20, 25, 30, 40, 50].map((l) => [l, levelTitle(l)])

export function ProfileScreen({ settings, onChange, onOpenSettings }: { settings: Settings; onChange: (s: Settings) => void; onOpenSettings?: () => void }) {
  const game = useGame()
  const profile = settings.profile
  const [name, setName] = useState(profile.name)
  const [motto, setMotto] = useState(profile.motto)
  const [editing, setEditing] = useState(false)
  const [customizing, setCustomizing] = useState(false)
  const [picking, setPicking] = useState(false)
  const [tab, setTab] = useState<'badges' | 'titles' | 'share'>('badges')
  const tabsRef = useTabIndicator(tab)
  const [openBadge, setOpenBadge] = useState<BadgeSeries | null>(null)
  const [timelineAll, setTimelineAll] = useState(false)

  const save = (patch: Partial<Profile>) => onChange({ ...settings, profile: { ...profile, ...patch } })

  const setPhoto = async (blob: Blob | null) => {
    if (profile.photoId) await db.media.delete(profile.photoId)
    save({ photoId: blob ? await db.addMedia('image', blob) : undefined })
  }

  const nextTitle = game && LADDER.find(([l]) => l > game.level.level)
  // What the profile's styles ask for: progress, never a purchase.
  const unlockables: Unlockables | null = game ? { level: game.level.level, stats: game.stats, badges: new Set(game.achievements.filter((a) => a.unlocked).map((a) => a.id)) } : null

  const unlocked = game ? game.achievements.filter((a) => a.unlocked) : []
  // One card per series (50, 100, 250… words is one badge with steps).
  const series = game ? badgeSeries(game.achievements) : []
  const progressOf = (s: BadgeSeries) => (s.next ? s.next.value / s.next.goal : 1)
  // The series closest to their next step: something concrete to go for next.
  const nextBadges = series
    .filter((s) => s.next)
    .sort((a, b) => progressOf(b) - progressOf(a))
    .slice(0, 3)
  const earnedSeries = series.filter((s) => s.earned > 0)
  const locked = series.filter((s) => s.earned === 0 && !nextBadges.includes(s))
  // The badges with a date, newest first: the way here, step by step.
  const dated = unlocked.filter((a) => a.unlockedAt).sort((a, b) => timeOf(b.unlockedAt) - timeOf(a.unlockedAt))

  return (
    <div className="stack profile">
      <section className="card profile-card" data-banner={bannerOf(profile.banner)} style={{ ['--pcolor' as string]: profile.color }}>
        {onOpenSettings && (
          <button className="icon-btn profile-settings" onClick={onOpenSettings} aria-label="Ayarlar" title="Ayarlar">
            <GearIcon size={18} />
          </button>
        )}
        {/* The name is an input, so the page's heading is for screen readers only. */}
        <h1 className="sr-only">Profil</h1>
        <div className="profile-hero">
          <button className="avatar-edit" onClick={() => setEditing((e) => !e)} aria-label="Avatarı düzenle" aria-expanded={editing}>
            <span className="avatar-ring" data-frame={frameOf(profile.frame)} style={{ ['--ring' as string]: `${(game?.level.progress ?? 0) * 100}%` }}>
              <Avatar profile={profile} size={88} />
              {game && <span className="avatar-level">{game.level.level}</span>}
            </span>
            <span className="avatar-edit-badge"><SmileIcon size={16} /></span>
          </button>
          <div className="profile-fields">
            <input
              className="profile-name"
              value={name}
              placeholder="Adın"
              aria-label="Adın"
              onChange={(e) => setName(e.target.value)}
              onBlur={() => name !== profile.name && save({ name: name.trim() })}
              onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
            />
            <input
              className="profile-motto"
              value={motto}
              placeholder="Hedefin (ör. Paris'te rahat konuşmak)"
              aria-label="Motto"
              onChange={(e) => setMotto(e.target.value)}
              onBlur={() => motto !== profile.motto && save({ motto: motto.trim() })}
              onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
            />
          </div>
        </div>
        {game && (
          <div className="profile-level">
            <div className="row justify-between">
              <span className="grown-line">
                <img className="grown-monki" src={levelMonki(game.level.level)} alt="" width={40} height={48} />
                <span className="level-badge">Seviye {game.level.level}</span> <strong>{unlockables ? titleName(profile.title, unlockables) : game.level.title}</strong>
              </span>
              <span className="muted small">{game.xp.total.toLocaleString('tr-TR')} XP</span>
            </div>
            <div className="xp-bar" role="progressbar" aria-label="Sonraki seviyeye ilerleme" aria-valuenow={Math.round(game.level.progress * 100)} aria-valuemin={0} aria-valuemax={100}>
              <div style={{ width: `${game.level.progress * 100}%` }} />
            </div>
            <p className="small muted">
              Sonraki seviyeye {(game.level.needed - game.level.into).toLocaleString('tr-TR')} XP.
              {nextTitle && ` ${nextTitle[0]}. seviyede unvanın "${nextTitle[1]}".`}
            </p>
          </div>
        )}
        {game && unlockables && <ProfileAbout profile={profile} game={game} unlockables={unlockables} onOpenBadge={(a) => setOpenBadge(series.find((x) => x.stat === a.stat) ?? null)} onCustomize={() => setCustomizing((c) => !c)} customizing={customizing} />}
        {editing && (
          <div className="stack avatar-editor">
            <div className="emoji-grid">
              {[...DRAWN_AVATAR_IDS, ...EMOJIS].map((e) => (
                <button key={e} className="emoji-btn" aria-pressed={!profile.photoId && profile.emoji === e} onClick={() => (profile.photoId ? setPhoto(null).then(() => save({ emoji: e })) : save({ emoji: e }))}>
                  {DRAWN_AVATARS[e] ? <img className="emoji-monki" src={DRAWN_AVATARS[e]} alt={drawnAvatarName(e)} /> : e}
                </button>
              ))}
            </div>
            <div className="choice-row">
              {COLORS.map((c) => (
                <button key={c} className="swatch" style={{ background: c }} aria-label={`Renk ${c}`} aria-pressed={profile.color === c} onClick={() => save({ color: c })} />
              ))}
            </div>
            <div className="row">
              <button className="btn btn-sm btn-quiet" onClick={() => setPicking(true)}>
                Fotoğraf kullan
              </button>
              {profile.photoId && (
                <button className="link small" onClick={() => setPhoto(null)}>
                  Fotoğrafı kaldır
                </button>
              )}
              <button className="link small" onClick={() => setEditing(false)}>
                Bitti
              </button>
            </div>
          </div>
        )}
      </section>

      {customizing && game && unlockables && (
        <section className="card" aria-label="Profili özelleştir">
          <ProfileCustomizer profile={profile} game={game} unlockables={unlockables} save={save} />
        </section>
      )}

      {game && (
        <>
          <div className="profile-overview">
            <section className="stat-grid profile-stats">
              <Stat value={<><StreakFlame streak={game.streak} frozen={game.frozenYesterday} /> {game.streak}</>} label="günlük seri" />
              <Stat value={<><StarIcon className="icon-star" size={20} /> {game.stats.mastered}</>} label="oturan kelime" />
              <Stat value={<><SproutIcon className="stat-icon is-sprout" size={20} /> {game.stats.wordsIntroduced}</>} label="öğrenilen kelime" />
              <Stat value={<><CheckCircleIcon className="stat-icon is-answers" size={20} /> {game.stats.totalAnswers.toLocaleString('tr-TR')}</>} label="cevap" />
            </section>
            <ActivityMini
              byDay={game.xp.byDay}
              records={[
                [`${game.stats.longestStreak} gün`, 'en uzun seri'],
                [`${game.stats.maxCombo}`, 'üst üste doğru'],
                [`${unlocked.length}/${game.achievements.length}`, 'rozet'],
              ]}
            />
          </div>

          <div className="page-tabs ind-line" role="tablist" aria-label="Profil" ref={tabsRef}>
            {(['badges', 'titles', 'share'] as const).map((t) => (
              <button key={t} role="tab" className="page-tab" aria-selected={tab === t} onClick={() => setTab(t)}>
                {t === 'badges' ? 'Rozetler' : t === 'titles' ? 'Unvanlar' : 'Paylaş'}
              </button>
            ))}
          </div>

          {tab === 'badges' && (
            <section className="badges-tab">
              <div className="badge-summary">
                <div className="badge-summary-count">
                  <strong>{earnedSeries.length}</strong>
                  <span className="muted">
                    / {series.length} rozet · {unlocked.length}/{game.achievements.length} kademe
                  </span>
                </div>
                <span className="badge-progress" aria-hidden>
                  <span style={{ width: `${(unlocked.length / Math.max(1, game.achievements.length)) * 100}%` }} />
                </span>
                <div className="badge-tiers">
                  {(['bronze', 'silver', 'gold', 'special'] as const).map((t) => (
                    <span key={t} className={`badge-tier tier-${t}`}>
                      {TIER_NAME[t]} {unlocked.filter((x) => medalTier(x) === t).length}
                    </span>
                  ))}
                </div>
              </div>
              {nextBadges.length > 0 && (
                <div className="badge-block">
                  <h2 className="subhead">Sıradakiler</h2>
                  <div className="badge-grid badge-grid-next">
                    {nextBadges.map((s) => (
                      <Badge key={s.stat} s={s} onOpen={setOpenBadge} />
                    ))}
                  </div>
                </div>
              )}
              {dated.length > 0 && (
                <div className="badge-block">
                  <h2 className="subhead">Son kazandıkların</h2>
                  <ol className="badge-timeline">
                    {dated.slice(0, timelineAll ? undefined : 5).map((a) => (
                      <li key={a.id}>
                        <Medal icon={a.icon} tier={medalTier(a)} unlocked size={36} />
                        <span>
                          <strong>{a.title}</strong> <span className="small muted">· {a.description}</span>
                        </span>
                        <time className="small muted" dateTime={a.unlockedAt}>
                          {fmtDay(a.unlockedAt!)}
                        </time>
                      </li>
                    ))}
                  </ol>
                  {dated.length > 5 && (
                    <button type="button" className="link small" onClick={() => setTimelineAll((v) => !v)}>
                      {timelineAll ? 'Daha az göster' : `Tümünü göster (${dated.length})`}
                    </button>
                  )}
                </div>
              )}
              {earnedSeries.length > 0 && (
                <div className="badge-block">
                  <h2 className="subhead">
                    <img className="cat-emblem" src={EMBLEM.trophy} alt="" width={26} height={26} draggable={false} />
                    Kazandıkların
                  </h2>
                  <div className="badge-case">
                    {earnedSeries.map((s) => (
                      <Badge key={s.stat} s={s} compact onOpen={setOpenBadge} />
                    ))}
                  </div>
                </div>
              )}
              {locked.length > 0 && (
                <details className="badge-block">
                  <summary className="small">Diğer rozetler ({locked.length})</summary>
                  {/* By what they count, so seventy badges read as five shelves. */}
                  {BADGE_CATEGORIES.map((c) => {
                    const shelf = locked.filter((s) => badgeCategory(s.steps[0]) === c.id)
                    return (
                      shelf.length > 0 && (
                        <div key={c.id} className="badge-shelf-group">
                          <h3 className="subhead">
                            <img className="cat-emblem" src={CATEGORY_EMBLEM[c.id]} alt="" width={26} height={26} draggable={false} />
                            {c.name} <span className="muted small">({shelf.length})</span>
                          </h3>
                          <div className="badge-case is-locked">
                            {shelf.map((s) => (
                              <Badge key={s.stat} s={s} compact onOpen={setOpenBadge} />
                            ))}
                          </div>
                        </div>
                      )
                    )
                  })}
                </details>
              )}
            </section>
          )}

          {tab === 'titles' && unlockables && <ProfileTitles profile={profile} game={game} unlockables={unlockables} save={save} />}

          {tab === 'share' && <ProgressCardButton settings={settings} game={game} />}
        </>
      )}

      {openBadge && <BadgeDialog s={openBadge} onClose={() => setOpenBadge(null)} />}

      {picking && (
        <ImagePicker
          initialQuery=""
          onClose={() => setPicking(false)}
          onPick={async (img) => {
            await setPhoto(img.blob)
            setPicking(false)
          }}
        />
      )}
    </div>
  )
}

type Achievement = NonNullable<ReturnType<typeof useGame>>['achievements'][number]


/** The steps of a series as stars: earned ones filled. Nothing for a badge of one step. */
function Stars({ s }: { s: BadgeSeries }) {
  if (s.steps.length < 2) return null
  return (
    <span className="badge-stars" role="img" aria-label={`${s.earned}/${s.steps.length} kademe`}>
      {s.steps.map((step) => (
        <i key={step.id} className={step.unlocked ? 'is-on' : undefined} />
      ))}
    </span>
  )
}

/** One series on the shelf: the highest step earned (else the first to earn), its stars, the way to the next. */
function Badge({ s, compact = false, onOpen }: { s: BadgeSeries; compact?: boolean; onOpen: (s: BadgeSeries) => void }) {
  const a = s.top ?? s.next ?? s.steps[0]
  const next = s.next
  return (
    <button
      type="button"
      className={`badge-card${s.earned ? ' is-unlocked' : ''}${compact ? ' is-compact' : ''}`}
      onClick={() => onOpen(s)}
      aria-label={`${a.title}: ${s.earned ? `${s.earned}/${s.steps.length} kademe kazanıldı` : `${a.value}/${a.goal}`}. Ayrıntı için dokun.`}
    >
      <Medal icon={a.icon} tier={medalTier(a)} unlocked={a.unlocked} progress={a.value / a.goal} size={compact ? 44 : 60} />
      <strong className="badge-title">{a.title}</strong>
      <Stars s={s} />
      {!compact && <span className="small muted badge-desc">{next ? next.description : a.description}</span>}
      {next && !compact && (
        <span className="badge-foot">
          <span className="badge-progress">
            <span style={{ width: `${Math.min(100, (next.value / next.goal) * 100)}%` }} />
          </span>
          <span className="small muted">
            {next.value}/{next.goal}
          </span>
        </span>
      )}
    </button>
  )
}

const fmtDay = (iso: unknown) => {
  const ms = timeOf(iso)
  return ms ? new Date(ms).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' }) : ''
}

/** A badge up close: the medal of its highest step, what it is for, and every step with its date or how far along. */
function BadgeDialog({ s, onClose }: { s: BadgeSeries; onClose: () => void }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopImmediatePropagation()
        onClose()
      }
    }
    window.addEventListener('keydown', onKey, true)
    return () => window.removeEventListener('keydown', onKey, true)
  }, [onClose])
  const a = s.top ?? s.next ?? s.steps[0]
  const tier = medalTier(a)
  const next = s.next
  const pct = next ? Math.min(100, Math.round((next.value / next.goal) * 100)) : 100
  return (
    <div className="dialog-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="dialog badge-dialog" role="dialog" aria-modal="true" aria-labelledby="badge-title">
        <button className="icon-btn badge-dialog-close" onClick={onClose} aria-label="Kapat">
          <CloseIcon size={18} />
        </button>
        <div className={`badge-dialog-medal tier-${tier}`}>
          {a.unlocked && drawnMedal(a.stat) ? <img className="drawn-medal" src={drawnMedal(a.stat)} alt="" width={104} height={104} draggable={false} /> : <Medal icon={a.icon} tier={tier} unlocked={a.unlocked} progress={a.value / a.goal} size={104} />}
        </div>
        <span className={`badge-tier tier-${tier}`}>{TIER_NAME[tier]} rozet</span>
        <h2 id="badge-title" className="badge-dialog-title">
          {a.title}
        </h2>
        <Stars s={s} />
        <p className="muted">{a.description}</p>
        {s.steps.length > 1 ? (
          <ol className="badge-steps">
            {s.steps.map((step) => (
              <li key={step.id} className={step.unlocked ? 'is-done' : undefined}>
                <span>
                  <strong>{step.title}</strong> <span className="muted small">· {step.description}</span>
                </span>
                <span className="small muted">
                  {step.unlocked ? (step.unlockedAt ? fmtDay(step.unlockedAt) : 'kazandın') : `${step.value.toLocaleString('tr-TR')}/${step.goal.toLocaleString('tr-TR')}`}
                </span>
              </li>
            ))}
          </ol>
        ) : a.unlocked ? (
          <p className="badge-dialog-status is-done">
            <CheckCircleIcon size={18} /> {a.unlockedAt ? `${fmtDay(a.unlockedAt)} günü kazandın` : 'Kazandın'}
          </p>
        ) : null}
        {next && (
          <div className="badge-dialog-progress">
            <div className="row justify-between small">
              <span className="muted">{s.steps.length > 1 ? `Sonraki kademe: ${next.title}` : 'İlerleme'}</span>
              <strong>
                {next.value.toLocaleString('tr-TR')} / {next.goal.toLocaleString('tr-TR')}
              </strong>
            </div>
            <span className="badge-progress">
              <span style={{ width: `${pct}%` }} />
            </span>
            <p className="small muted">{next.goal - next.value > 0 ? `Kazanmana ${(next.goal - next.value).toLocaleString('tr-TR')} kaldı.` : 'Neredeyse!'}</p>
          </div>
        )}
        <button className="btn" onClick={onClose} autoFocus>
          Tamam
        </button>
      </div>
    </div>
  )
}

function Stat({ value, label }: { value: React.ReactNode; label: string }) {
  return (
    <div className="stat">
      <span className="stat-value">{value}</span>
      <span className="stat-label">{label}</span>
    </div>
  )
}

/**
 * Recent weeks as small squares, darker the more XP that day. The span grows with the history
 * (8 weeks at first, up to 26), so a new learner sees a few lively weeks, not a grey block.
 */
function ActivityMini({ byDay, records }: { byDay: Map<string, number>; records: [string, string][] }) {
  const today = new Date()
  today.setHours(12, 0, 0, 0)
  const first = [...byDay.keys()].filter((k) => (byDay.get(k) ?? 0) > 0).sort()[0]
  const weeksSince = first ? Math.ceil((today.getTime() - new Date(`${first}T12:00:00`).getTime()) / (7 * 86_400_000)) + 1 : 0
  const weeks = Math.min(26, Math.max(8, weeksSince + 1))
  // Start on a Monday (weeks - 1) full weeks back, so columns are weeks.
  const start = new Date(today)
  start.setDate(start.getDate() - ((start.getDay() + 6) % 7) - (weeks - 1) * 7)
  const days: { key: string; xp: number; future: boolean }[] = []
  for (let d = new Date(start); days.length < weeks * 7; d.setDate(d.getDate() + 1)) {
    const key = localDate(d)
    days.push({ key, xp: byDay.get(key) ?? 0, future: d > today })
  }
  const max = Math.max(1, ...days.map((d) => d.xp))
  const active = days.filter((d) => d.xp > 0).length
  return (
    <section className="card activity-mini">
      <div className="row justify-between items-center">
        <strong>{weeks >= 26 ? 'Son 6 ay' : `Son ${weeks} hafta`}</strong>
        <span className="small muted">{active ? `${active} gün çalıştın` : 'İlk çalıştığın gün burada renklenir'}</span>
      </div>
      <div className="activity-grid" role="img" aria-label={`Son ${weeks} haftada ${active} gün çalıştın`}>
        {/* The first column names the weekdays (Mon, Wed, Fri), so a square can be read as a day. */}
        {['Pzt', '', 'Çar', '', 'Cum', '', ''].map((label, i) => (
          <span key={`day${i}`} className="activity-day" aria-hidden>
            {label}
          </span>
        ))}
        {days.map((d) => (
          <span
            key={d.key}
            className={`activity-cell${d.future ? ' is-future' : ''}`}
            style={{ ['--level' as string]: d.xp ? 0.25 + 0.75 * (d.xp / max) : 0 }}
            title={d.future ? undefined : `${new Date(`${d.key}T12:00:00`).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long' })}: ${d.xp} XP`}
          />
        ))}
      </div>
      <dl className="profile-records">
        {records.map(([value, label]) => (
          <div key={label}>
            <dt className="small muted">{label}</dt>
            <dd>{value}</dd>
          </div>
        ))}
      </dl>
    </section>
  )
}

/** Under the level: the badges on show, interests and the goal, and the way into the customizer. */
function ProfileAbout({ profile, game, unlockables, onOpenBadge, onCustomize, customizing }: { profile: Profile; game: NonNullable<ReturnType<typeof useGame>>; unlockables: Unlockables; onOpenBadge: (a: Achievement) => void; onCustomize: () => void; customizing: boolean }) {
  const shown = pinnedBadges(profile.pinned, unlockables.badges).map((id) => game.achievements.find((a) => a.id === id)!).filter(Boolean)
  const left = daysUntil(profile.goalDate, new Date())
  const interests = profile.interests ?? []
  return (
    <div className="profile-about">
      {shown.length > 0 && (
        <ul className="profile-showcase" aria-label="Rozet vitrini">
          {shown.map((a) => (
            <li key={a.id}>
              <button type="button" className="showcase-badge" onClick={() => onOpenBadge(a)} aria-label={`${a.title}: ayrıntı`} title={a.title}>
                <Medal icon={a.icon} tier={medalTier(a)} unlocked size={46} />
              </button>
            </li>
          ))}
        </ul>
      )}
      {(interests.length > 0 || profile.goalLevel) && (
        <div className="profile-tags">
          {profile.goalLevel && (
            <span className="goal-chip">
              Hedef {profile.goalLevel}
              {left !== null && (left > 0 ? ` · ${left} gün kaldı` : left === 0 ? ' · bugün' : ' · tarih geçti')}
            </span>
          )}
          {interests.map((i) => (
            <span key={i} className="interest-chip">
              {i}
            </span>
          ))}
        </div>
      )}
      <button type="button" className="btn btn-sm btn-quiet profile-customize-btn" aria-expanded={customizing} onClick={onCustomize}>
        <PaletteIcon size={16} className="inline-icon" />
        {customizing ? 'Özelleştirmeyi kapat' : 'Özelleştir'}
      </button>
    </div>
  )
}
