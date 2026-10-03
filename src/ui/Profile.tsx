import { useState } from 'react'
import { levelTitle, medalTier } from '../engine/gamification'
import type { Profile, Settings } from '../data/db'
import { db } from '../data/instance'
import { Avatar } from './Avatar'
import { ProgressCardButton } from './ProgressCard'
import { useGame } from './game'
import { StarIcon } from './icons'
import { ImagePicker } from './ImagePicker'
import { Medal } from './Medal'
import { StreakFlame } from './StreakFlame'

const EMOJIS = ['🦊', '🐼', '🦉', '🐙', '🦁', '🐢', '🐬', '🦄', '🐝', '🐧', '🦋', '🐨', '🌵', '🚀', '📚', '🎧', '☕', '🌍', '🎨', '⚡']
const COLORS = ['#2563eb', '#db2777', '#f59e0b', '#10b981', '#8b5cf6', '#ef4444', '#0ea5e9', '#475569']
const LADDER: [number, string][] = [1, 3, 5, 8, 11, 15, 20, 25, 30, 40, 50].map((l) => [l, levelTitle(l)])

export function ProfileScreen({ settings, onChange }: { settings: Settings; onChange: (s: Settings) => void }) {
  const game = useGame()
  const profile = settings.profile
  const [name, setName] = useState(profile.name)
  const [motto, setMotto] = useState(profile.motto)
  const [editing, setEditing] = useState(false)
  const [picking, setPicking] = useState(false)
  const [tab, setTab] = useState<'badges' | 'titles' | 'share'>('badges')

  const save = (patch: Partial<Profile>) => onChange({ ...settings, profile: { ...profile, ...patch } })

  const setPhoto = async (blob: Blob | null) => {
    if (profile.photoId) await db.media.delete(profile.photoId)
    save({ photoId: blob ? await db.addMedia('image', blob) : undefined })
  }

  const nextTitle = game && LADDER.find(([l]) => l > game.level.level)

  const unlocked = game ? game.achievements.filter((a) => a.unlocked) : []
  // The badges closest to being earned: something concrete to go for next.
  const nextBadges = game
    ? game.achievements
        .filter((a) => !a.unlocked)
        .sort((a, b) => b.value / b.goal - a.value / a.goal)
        .slice(0, 3)
    : []
  const locked = game ? game.achievements.filter((a) => !a.unlocked && !nextBadges.includes(a)) : []

  return (
    <div className="stack profile">
      <section className="card profile-card">
        <div className="profile-hero">
          <button className="avatar-edit" onClick={() => setEditing((e) => !e)} aria-label="Avatarı düzenle" aria-expanded={editing}>
            <Avatar profile={profile} size={88} />
            <span className="avatar-edit-badge">✎</span>
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
              placeholder="Motton ya da hedefin (ör. Yazın Paris'te rahat konuşmak)"
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
              <span>
                <span className="level-badge">Seviye {game.level.level}</span> <strong>{game.level.title}</strong>
              </span>
              <span className="muted small">{game.xp.total.toLocaleString('tr-TR')} XP</span>
            </div>
            <div className="xp-bar" role="progressbar" aria-valuenow={Math.round(game.level.progress * 100)} aria-valuemin={0} aria-valuemax={100}>
              <div style={{ width: `${game.level.progress * 100}%` }} />
            </div>
            <p className="small muted">
              Sonraki seviyeye {(game.level.needed - game.level.into).toLocaleString('tr-TR')} XP.
              {nextTitle && ` ${nextTitle[0]}. seviyede unvanın "${nextTitle[1]}".`}
            </p>
          </div>
        )}
        {editing && (
          <div className="stack avatar-editor">
            <div className="emoji-grid">
              {EMOJIS.map((e) => (
                <button key={e} className="emoji-btn" aria-pressed={!profile.photoId && profile.emoji === e} onClick={() => (profile.photoId ? setPhoto(null).then(() => save({ emoji: e })) : save({ emoji: e }))}>
                  {e}
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

      {game && (
        <>
          <section className="stat-grid stat-grid-4">
            <Stat value={<><StreakFlame streak={game.streak} frozen={game.frozenYesterday} /> {game.streak}</>} label="günlük seri" />
            <Stat value={<><StarIcon className="icon-star" size={20} /> {game.stats.mastered}</>} label="oturan kelime" />
            <Stat value={game.stats.wordsIntroduced} label="öğrenilen kelime" />
            <Stat value={game.stats.totalAnswers.toLocaleString('tr-TR')} label="cevap" />
          </section>
          <p className="small muted records-line">
            Rekorların: en uzun seri {game.stats.longestStreak} gün · üst üste {game.stats.maxCombo} doğru · {unlocked.length}/{game.achievements.length} rozet
          </p>

          <div className="segmented" role="tablist" aria-label="Profil">
            {(['badges', 'titles', 'share'] as const).map((t) => (
              <button key={t} role="tab" className="segmented-btn" aria-selected={tab === t} onClick={() => setTab(t)}>
                {t === 'badges' ? 'Rozetler' : t === 'titles' ? 'Unvanlar' : 'Paylaş'}
              </button>
            ))}
          </div>

          {tab === 'badges' && (
            <section className="stack">
              {nextBadges.length > 0 && (
                <>
                  <h2 className="subhead">Sıradakiler</h2>
                  <div className="badge-grid">
                    {nextBadges.map((a) => (
                      <Badge key={a.id} a={a} />
                    ))}
                  </div>
                </>
              )}
              {unlocked.length > 0 && (
                <>
                  <h2 className="subhead">Kazandıkların ({unlocked.length})</h2>
                  <div className="badge-grid badge-grid-compact">
                    {unlocked.map((a) => (
                      <Badge key={a.id} a={a} compact />
                    ))}
                  </div>
                </>
              )}
              {locked.length > 0 && (
                <details>
                  <summary className="small">Diğer rozetler ({locked.length})</summary>
                  <div className="badge-grid badge-grid-compact mt-3">
                    {locked.map((a) => (
                      <Badge key={a.id} a={a} compact />
                    ))}
                  </div>
                </details>
              )}
            </section>
          )}

          {tab === 'titles' && (
            <section className="card stack">
              <ol className="ladder">
                {LADDER.map(([l, title]) => (
                  <li key={l} className={game.level.level >= l ? 'is-reached' : ''}>
                    <span className="level-badge">{l}</span> {title}
                  </li>
                ))}
              </ol>
            </section>
          )}

          {tab === 'share' && <ProgressCardButton settings={settings} game={game} />}
        </>
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

function Badge({ a, compact = false }: { a: Achievement; compact?: boolean }) {
  return (
    <div className={`badge-card${a.unlocked ? ' is-unlocked' : ''}${compact ? ' is-compact' : ''}`} title={a.description}>
      <Medal icon={a.icon} tier={medalTier(a)} unlocked={a.unlocked} progress={a.value / a.goal} size={compact ? 44 : 60} />
      <strong>{a.title}</strong>
      {!compact && <span className="small muted">{a.description}</span>}
      {!a.unlocked && (
        <>
          <span className="badge-progress">
            <span style={{ width: `${Math.min(100, (a.value / a.goal) * 100)}%` }} />
          </span>
          <span className="small muted">
            {a.value}/{a.goal}
          </span>
        </>
      )}
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
