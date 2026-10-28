import '../lazy.css'
import { useEffect, useState } from 'react'
import { BADGE_CATEGORIES, badgeCategory, badgeSeries, levelTitle, medalTier, type BadgeSeries } from '../engine/gamification'
import type { Profile, Settings } from '../data/db'
import { db } from '../data/instance'
import { Avatar } from './Avatar'
import { DRAWN_AVATARS, DRAWN_AVATAR_IDS, EARNED_AVATARS, avatarNeed, drawnAvatarName } from './avatarArt'
import { ProgressCardButton } from './ProgressCard'
import { useGame } from './game'
import { CheckCircleIcon, CloseIcon, GearIcon, LockIcon, PaletteIcon, PinIcon, PlusIcon, SmileIcon, SparkleIcon } from './icons'
import { ImagePicker } from './ImagePicker'
import { TIER_NAME } from './badgeTier'
import { BadgeMedal } from './Medal'
import { StreakPicture } from './StreakFlame'
import { localDate } from '../engine/progress'
import { bannerOf, daysUntil, frameOf, PIN_LIMIT, pinnedBadges, titleName, toggleLimited, type Unlockables } from '../engine/profileStyle'
import { timeOf } from '../engine/types'
import { ProfileCustomizer } from './ProfileCustomizer'
import { useTabIndicator } from './useTabIndicator'
import { ProfileTitles } from './ProfileTitles'
import { CATEGORY_EMBLEM, EMBLEM, STAT_ART } from './drawnArt'
import { showToast } from './toastFeed'
import { resolveCoordinates } from '../data/weather'

/** The glyph avatars; the animals Monki's set draws (fox, panda, owl, octopus, penguin, koala) are not repeated as emoji. */
const COLORS = ['#2563eb', '#db2777', '#f59e0b', '#10b981', '#8b5cf6', '#ef4444', '#0ea5e9', '#475569']
const LADDER: [number, string][] = [1, 3, 5, 8, 11, 15, 20, 25, 30, 40, 50].map((l) => [l, levelTitle(l)])

export function ProfileScreen({ settings, onChange, onOpenSettings }: { settings: Settings; onChange: (s: Settings) => void; onOpenSettings?: () => void }) {
  const game = useGame()
  const profile = settings.profile
  const [name, setName] = useState(profile.name)
  const [motto, setMotto] = useState(profile.motto)
  const [location, setLocation] = useState(profile.location ?? '')
  const [locating, setLocating] = useState(false)
  const [editing, setEditing] = useState(false)
  const [customizing, setCustomizing] = useState(false)
  const [picking, setPicking] = useState(false)
  const [tab, setTab] = useState<'badges' | 'titles' | 'share'>('badges')
  const tabsRef = useTabIndicator(tab)
  const [openBadge, setOpenBadge] = useState<BadgeSeries | null>(null)
  const [timelineAll, setTimelineAll] = useState(false)
  const [catFilter, setCatFilter] = useState<string>('all')

  const save = (patch: Partial<Profile>) => onChange({ ...settings, profile: { ...profile, ...patch } })

  const saveLocation = async (raw: string) => {
    const loc = raw.trim()
    if (!loc) {
      save({ location: undefined, coordinates: undefined })
      return
    }
    const resolved = await resolveCoordinates(loc)
    save({
      location: resolved ? resolved.name : loc,
      coordinates: resolved ? { lat: resolved.lat, lon: resolved.lon } : undefined,
    })
    if (resolved) {
      setLocation(resolved.name)
      showToast(`Konum ayarlandı: ${resolved.name}`)
    }
  }

  const detectLocation = () => {
    if (!navigator.geolocation) {
      showToast('Tarayıcınız konum servisini desteklemiyor.')
      return
    }
    setLocating(true)
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude
        const lon = pos.coords.longitude
        const name = `${lat.toFixed(1)}°, ${lon.toFixed(1)}°`
        setLocation(name)
        save({ location: name, coordinates: { lat, lon } })
        setLocating(false)
        showToast('Konumun belirlendi.')
      },
      () => {
        setLocating(false)
        showToast('Konum izni alınamadı, şehri elle yazabilirsin.')
      },
      { timeout: 8000 }
    )
  }

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
        <div className="profile-card-actions">
          {unlockables && (
            <button
              type="button"
              className="icon-btn profile-tool profile-customize-btn"
              aria-label="Özelleştir"
              title={customizing ? 'Özelleştirmeyi kapat' : 'Özelleştir: kapak, çerçeve, unvan'}
              aria-expanded={customizing}
              onClick={() => setCustomizing((c) => !c)}
            >
              <PaletteIcon size={18} />
            </button>
          )}
          {onOpenSettings && (
            <button className="icon-btn profile-tool profile-settings" onClick={onOpenSettings} aria-label="Ayarlar" title="Ayarlar">
              <GearIcon size={18} />
            </button>
          )}
        </div>
        {/* The name is an input, so the page's heading is for screen readers only. */}
        <h1 className="sr-only">Profil</h1>
        <div className="profile-hero">
          <button className="avatar-edit" onClick={() => setEditing((e) => !e)} aria-label="Avatarı düzenle" title="Avatarı düzenle" aria-expanded={editing}>
            <span className="avatar-ring" data-frame={frameOf(profile.frame)} style={{ ['--ring' as string]: `${(game?.level.progress ?? 0) * 100}%` }}>
              <Avatar profile={profile} size={88} />
              {game && <span className="avatar-level" aria-hidden="true">{game.level.level}</span>}
            </span>
            <span className="avatar-edit-badge" aria-hidden="true"><SmileIcon size={16} /></span>
          </button>
          <div className="profile-fields">
            <div className="profile-name-row">
              <input
                className="profile-name"
                value={name}
                placeholder="Adın"
                aria-label="Adın"
                onChange={(e) => setName(e.target.value)}
                onBlur={() => name !== profile.name && save({ name: name.trim() })}
                onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
              />
              {game && (
                <span className="profile-badge-pill" title="Seviye ve unvan">
                  <span className="level-badge">Seviye {game.level.level}</span>
                  <strong className="profile-title-text">{unlockables ? titleName(profile.title, unlockables) : game.level.title}</strong>
                </span>
              )}
            </div>
            <input
              className="profile-motto"
              value={motto}
              placeholder="Hedefin (ör. Paris'te rahat konuşmak)"
              aria-label="Motto"
              onChange={(e) => setMotto(e.target.value)}
              onBlur={() => motto !== profile.motto && save({ motto: motto.trim() })}
              onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
            />
            <div className="profile-loc-row">
              <span className="profile-loc-pin" aria-hidden><PinIcon size={14} /></span>
              <input
                className="profile-location"
                value={location}
                placeholder="Konumun (ör. İstanbul, Paris, İzmir...)"
                aria-label="Konumun"
                onChange={(e) => setLocation(e.target.value)}
                onBlur={() => location !== (profile.location ?? '') && saveLocation(location)}
                onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
              />
              <button
                type="button"
                className="profile-loc-btn"
                title="Şu anki konumu otomatik bul"
                aria-label="Şu anki konumu bul"
                disabled={locating}
                onClick={detectLocation}
              >
                {locating ? '…' : 'Bul'}
              </button>
            </div>
          </div>
        </div>
        {game && (
          <div className="profile-level-box">
            <div className="profile-level-top">
              <span className="profile-level-label">
                <SparkleIcon size={15} className="inline-icon" />
                <strong>Seviye İlerlemesi</strong>
              </span>
              <span className="profile-xp-readout">
                <strong>{game.xp.total.toLocaleString('tr-TR')}</strong>
                <span className="muted"> / {game.level.needed.toLocaleString('tr-TR')} XP</span>
              </span>
            </div>
            <div className="xp-bar" role="progressbar" aria-label="Sonraki seviyeye ilerleme" aria-valuenow={Math.round(game.level.progress * 100)} aria-valuemin={0} aria-valuemax={100}>
              <div style={{ width: `${game.level.progress * 100}%` }} />
            </div>
            <div className="profile-level-meta small muted">
              <span>Sonraki seviyeye {(game.level.needed - game.level.into).toLocaleString('tr-TR')} XP</span>
              {nextTitle && <span>{nextTitle[0]}. seviyede unvanın “{nextTitle[1]}”</span>}
            </div>
          </div>
        )}
        {game && unlockables && (
          <ProfileAbout
            profile={profile}
            game={game}
            unlockables={unlockables}
            onOpenBadge={(a) => setOpenBadge(series.find((x) => x.stat === a.stat) ?? null)}
            onCustomize={() => setCustomizing(true)}
          />
        )}
        {editing && (
          <div className="stack avatar-editor">
            <div className="emoji-grid">
              {/* Only the drawn ones: an emoji chosen before stays on the profile until another is picked. */}
              {DRAWN_AVATAR_IDS.map((e) => (
                <button key={e} className="emoji-btn" aria-pressed={!profile.photoId && profile.emoji === e} onClick={() => (profile.photoId ? setPhoto(null).then(() => save({ emoji: e })) : save({ emoji: e }))}>
                  <img className="emoji-monki" src={DRAWN_AVATARS[e]} alt={drawnAvatarName(e)} />
                </button>
              ))}
            </div>
            {/* The ones to earn: open by level, streak, bosses and settled words; a locked one says what it takes. */}
            {game && (
              <div className="stack gap-2">
                <span className="section-title small">Kazanılan avatarlar</span>
                <div className="emoji-grid earned-avatars">
                  {EARNED_AVATARS.map((a) => {
                    const have = game.stats[a.stat] ?? 0
                    const open = have >= a.goal
                    const need = avatarNeed(a)
                    return (
                      <button
                        key={a.id}
                        className={`emoji-btn earned-avatar${open ? '' : ' is-locked'}`}
                        aria-pressed={!profile.photoId && profile.emoji === a.id}
                        aria-disabled={!open}
                        title={open ? a.name : `${a.name}: ${need} ile açılır (şu an ${have.toLocaleString('tr-TR')})`}
                        onClick={() => {
                          if (!open) return showToast(`${a.name}: ${need} ile açılır. Şu an ${have.toLocaleString('tr-TR')}.`)
                          void (profile.photoId ? setPhoto(null).then(() => save({ emoji: a.id })) : save({ emoji: a.id }))
                        }}
                      >
                        <img className="emoji-monki" src={a.art} alt={a.name} />
                        {!open && (
                          <span className="earned-lock" aria-hidden>
                            <LockIcon size={12} />
                          </span>
                        )}
                      </button>
                    )
                  })}
                </div>
              </div>
            )}
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
              <Stat value={<><StreakPicture streak={game.streak} size={24} /> {game.streak}</>} label="günlük seri" />
              <Stat value={<><img className="stat-art-img" src={STAT_ART.star} alt="" height={22} width={22} draggable={false} /> {game.stats.mastered}</>} label="oturan kelime" />
              <Stat value={<><img className="stat-art-img" src={STAT_ART.sprout} alt="" height={22} width={22} draggable={false} /> {game.stats.wordsIntroduced}</>} label="öğrenilen kelime" />
              <Stat value={<><img className="stat-art-img" src={STAT_ART.check} alt="" height={22} width={22} draggable={false} /> {game.stats.totalAnswers.toLocaleString('tr-TR')}</>} label="cevap" />
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

          {tab === 'badges' && (() => {
            const filteredEarned = catFilter === 'all' ? earnedSeries : earnedSeries.filter((s) => badgeCategory(s.steps[0]) === catFilter)
            const filteredLocked = catFilter === 'all' ? locked : locked.filter((s) => badgeCategory(s.steps[0]) === catFilter)
            const totalPct = Math.round((unlocked.length / Math.max(1, game.achievements.length)) * 100)
            return (
              <section className="badges-tab">
                <div className="badge-summary">
                  <img className="badge-summary-emblem" src={EMBLEM.trophy} alt="" width={42} height={42} draggable={false} />
                  <div className="badge-summary-main">
                    <div className="badge-summary-head">
                      <div className="badge-summary-count">
                        <strong>{earnedSeries.length}</strong>
                        <span className="muted">
                          / {series.length} rozet · {unlocked.length}/{game.achievements.length} kademe
                        </span>
                      </div>
                      <span className="badge-summary-pct">%{totalPct}</span>
                    </div>
                    <span className="badge-progress" aria-hidden>
                      <span style={{ width: `${(unlocked.length / Math.max(1, game.achievements.length)) * 100}%` }} />
                    </span>
                  </div>
                  <div className="badge-tiers">
                    {(['bronze', 'silver', 'gold', 'special'] as const).map((t) => (
                      <span key={t} className={`badge-tier tier-${t}`}>
                        <i className="badge-tier-dot" aria-hidden />
                        {TIER_NAME[t]} <strong>{unlocked.filter((x) => medalTier(x) === t).length}</strong>
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
                        <li key={a.id} onClick={() => setOpenBadge(series.find((x) => x.stat === a.stat) ?? null)}>
                          <BadgeMedal badge={a} unlocked size={36} />
                          <span className="badge-timeline-text">
                            <strong>{a.title}</strong> <span className="small muted">· {a.description}</span>
                          </span>
                          <time className="small muted badge-timeline-date" dateTime={a.unlockedAt}>
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
                <div className="badge-filter-bar" role="group" aria-label="Rozet kategorisi">
                  <button
                    type="button"
                    className="chip chip-sm"
                    aria-pressed={catFilter === 'all'}
                    onClick={() => setCatFilter('all')}
                  >
                    Tümü ({series.length})
                  </button>
                  {BADGE_CATEGORIES.map((c) => {
                    const count = series.filter((s) => badgeCategory(s.steps[0]) === c.id).length
                    return (
                      <button
                        key={c.id}
                        type="button"
                        className="chip chip-sm badge-cat-chip"
                        aria-pressed={catFilter === c.id}
                        onClick={() => setCatFilter(catFilter === c.id ? 'all' : c.id)}
                      >
                        <img src={CATEGORY_EMBLEM[c.id]} alt="" width={16} height={16} draggable={false} />
                        {c.name} ({count})
                      </button>
                    )
                  })}
                </div>
                {filteredEarned.length > 0 && (
                  <div className="badge-block">
                    <h2 className="subhead">
                      <img className="cat-emblem" src={EMBLEM.trophy} alt="" width={26} height={26} draggable={false} />
                      Kazandıkların <span className="muted small">({filteredEarned.length})</span>
                    </h2>
                    <div className="badge-case">
                      {filteredEarned.map((s) => (
                        <Badge key={s.stat} s={s} compact onOpen={setOpenBadge} />
                      ))}
                    </div>
                  </div>
                )}
                {filteredLocked.length > 0 && (
                  <details className="badge-block" open={catFilter !== 'all' ? true : undefined}>
                    <summary className="small">Diğer rozetler ({filteredLocked.length})</summary>
                    {/* By what they count, so seventy badges read as five shelves. */}
                    {BADGE_CATEGORIES.map((c) => {
                      const shelf = filteredLocked.filter((s) => badgeCategory(s.steps[0]) === c.id)
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
            )
          })()}

          {tab === 'titles' && unlockables && <ProfileTitles profile={profile} game={game} unlockables={unlockables} save={save} />}

          {tab === 'share' && <ProgressCardButton settings={settings} game={game} />}
        </>
      )}

      {openBadge && (
        <BadgeDialog
          s={openBadge}
          pinned={unlockables ? (profile.pinned ?? []).filter((id) => unlockables.badges.has(id)) : []}
          onTogglePin={(id) => {
            if (!unlockables) return
            const cur = (profile.pinned ?? []).filter((x) => unlockables.badges.has(x))
            const nextPinned = toggleLimited(cur, id, PIN_LIMIT)
            save({ pinned: nextPinned })
            showToast(nextPinned.includes(id) ? 'Rozet vitrinine eklendi.' : 'Rozet vitrininden çıkarıldı.')
          }}
          onClose={() => setOpenBadge(null)}
        />
      )}

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
  const pct = next ? Math.min(100, Math.round((next.value / next.goal) * 100)) : 100
  const near = !compact && !!next && pct >= 75
  return (
    <button
      type="button"
      className={`badge-card${s.earned ? ' is-unlocked' : ''}${compact ? ' is-compact' : ''}${near ? ' is-near' : ''}`}
      onClick={() => onOpen(s)}
    >
      <BadgeMedal badge={a} unlocked={a.unlocked} progress={a.value / a.goal} size={compact ? 44 : 60} />
      <strong className="badge-title">{a.title}</strong>
      <Stars s={s} />
      {!compact && <span className="small muted badge-desc">{next ? next.description : a.description}</span>}
      {next && !compact && (
        <span className="badge-foot">
          <span className="badge-progress">
            <span style={{ width: `${Math.min(100, (next.value / next.goal) * 100)}%` }} />
          </span>
          <span className="badge-foot-meta small muted">
            <span>{next.value}/{next.goal}</span>
            <span className="badge-foot-pct">%{pct}</span>
          </span>
        </span>
      )}
      {near && <span className="badge-near-pill">Çok yakın</span>}
      <span className="sr-only"> ({s.earned ? `${s.earned}/${s.steps.length} kademe kazanıldı` : `${a.value}/${a.goal}`}. Ayrıntı için dokun.)</span>
    </button>
  )
}

const fmtDay = (iso: unknown) => {
  const ms = timeOf(iso)
  return ms ? new Date(ms).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' }) : ''
}

/** A badge up close: the medal of its highest step, what it is for, and every step with its date or how far along. */
function BadgeDialog({ s, pinned = [], onTogglePin, onClose }: { s: BadgeSeries; pinned?: string[]; onTogglePin?: (id: string) => void; onClose: () => void }) {
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
  const pinnedStepId = s.steps.find((st) => pinned.includes(st.id))?.id
  const isPinned = !!pinnedStepId
  const pinTargetId = pinnedStepId ?? s.top?.id
  return (
    <div className="dialog-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="dialog badge-dialog" role="dialog" aria-modal="true" aria-labelledby="badge-title">
        {/* Focus starts at the top: focusing "Tamam" at the bottom scrolled a long badge's dialog past its medal. */}
        <button className="icon-btn badge-dialog-close" onClick={onClose} aria-label="Kapat" autoFocus>
          <CloseIcon size={18} />
        </button>
        <div className={`badge-dialog-medal tier-${tier}`}>
          <BadgeMedal badge={a} unlocked={a.unlocked} progress={a.value / a.goal} size={104} />
        </div>
        <span className={`badge-tier tier-${tier}`}>{TIER_NAME[tier]} rozet</span>
        <h2 id="badge-title" className="badge-dialog-title">
          {a.title}
        </h2>
        <Stars s={s} />
        <p className="muted">{a.description}</p>
        {s.steps.length > 1 ? (
          <ol className="badge-steps">
            {s.steps.map((step, idx) => {
              const isNext = step === next
              return (
                <li key={step.id} className={step.unlocked ? 'is-done' : isNext ? 'step-next' : 'step-locked'}>
                  <span className="badge-step-mark" aria-hidden>
                    {step.unlocked ? <CheckCircleIcon size={15} /> : isNext ? idx + 1 : <LockIcon size={13} />}
                  </span>
                  <span className="badge-step-body">
                    <strong>{step.title}</strong> <span className="muted small">· {step.description}</span>
                  </span>
                  <span className="small muted badge-step-right">
                    {step.unlocked ? (step.unlockedAt ? fmtDay(step.unlockedAt) : 'kazandın') : `${step.value.toLocaleString('tr-TR')}/${step.goal.toLocaleString('tr-TR')}`}
                  </span>
                </li>
              )
            })}
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
        <div className="badge-dialog-actions">
          {pinTargetId && onTogglePin && (
            <button
              type="button"
              className={`btn btn-quiet badge-pin-btn${isPinned ? ' badge-pinned' : ''}`}
              disabled={!isPinned && pinned.length >= PIN_LIMIT}
              title={!isPinned && pinned.length >= PIN_LIMIT ? `En çok ${PIN_LIMIT} rozet sabitlenebilir` : undefined}
              onClick={() => onTogglePin(pinTargetId)}
            >
              <PinIcon size={15} className="inline-icon" />
              {isPinned ? 'Vitrinde ✓' : 'Vitrine sabitle'}
            </button>
          )}
          <button className="btn" onClick={onClose}>
            Tamam
          </button>
        </div>
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

/** Under the level: the badges on show, interests and the goal. */
function ProfileAbout({
  profile,
  game,
  unlockables,
  onOpenBadge,
  onCustomize,
}: {
  profile: Profile
  game: NonNullable<ReturnType<typeof useGame>>
  unlockables: Unlockables
  onOpenBadge: (a: Achievement) => void
  onCustomize: () => void
}) {
  const shown = pinnedBadges(profile.pinned, unlockables.badges)
    .map((id) => game.achievements.find((a) => a.id === id)!)
    .filter(Boolean)
  const left = daysUntil(profile.goalDate, new Date())
  const interests = profile.interests ?? []

  return (
    <div className="profile-about">
      {shown.length > 0 && (
        <div className="profile-showcase-box">
          <div className="profile-showcase-head">
            <span className="small muted font-semibold">Öne Çıkan Rozetler ({shown.length}/{PIN_LIMIT})</span>
          </div>
          <ul className="profile-showcase" aria-label="Rozet vitrini">
            {shown.map((a) => (
              <li key={a.id}>
                <button
                  type="button"
                  className="showcase-badge"
                  onClick={() => onOpenBadge(a)}
                  aria-label={`${a.title}: ayrıntı`}
                  title={a.title}
                >
                  <BadgeMedal badge={a} unlocked size={46} />
                </button>
              </li>
            ))}
            {Array.from({ length: Math.max(0, PIN_LIMIT - shown.length) }).map((_, idx) => (
              <li key={`empty-${idx}`}>
                <button
                  type="button"
                  className="showcase-empty-slot"
                  onClick={onCustomize}
                  aria-label="Rozet sabitle"
                  title="Vitrini özelleştir"
                >
                  <PlusIcon size={16} />
                </button>
              </li>
            ))}
          </ul>
        </div>
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
    </div>
  )
}
