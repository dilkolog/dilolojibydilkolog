import { useState } from 'react'
import { levelTitle } from '../engine/gamification'
import type { Profile, Settings } from '../data/db'
import { db } from '../data/instance'
import { Avatar } from './Avatar'
import { useGame } from './game'
import { FlameIcon, StarIcon } from './icons'
import { ImagePicker } from './ImagePicker'

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

  const save = (patch: Partial<Profile>) => onChange({ ...settings, profile: { ...profile, ...patch } })

  const setPhoto = async (blob: Blob | null) => {
    if (profile.photoId) await db.media.delete(profile.photoId)
    save({ photoId: blob ? await db.addMedia('image', blob) : undefined })
  }

  const nextTitle = game && LADDER.find(([l]) => l > game.level.level)

  return (
    <div className="stack">
      <section className="profile-hero">
        <button className="avatar-edit" onClick={() => setEditing((e) => !e)} aria-label="Avatarı düzenle">
          <Avatar profile={profile} size={104} />
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
          {game && (
            <p className="level-line">
              <span className="level-badge">Seviye {game.level.level}</span> {game.level.title}
            </p>
          )}
        </div>
      </section>

      {editing && (
        <section className="card stack">
          <h2 className="section-title">Avatar</h2>
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
            <button className="btn btn-quiet" onClick={() => setPicking(true)}>
              Fotoğraf kullan
            </button>
            {profile.photoId && (
              <button className="link small" onClick={() => setPhoto(null)}>
                Fotoğrafı kaldır
              </button>
            )}
          </div>
        </section>
      )}

      {game && (
        <>
          <section className="card stack level-card">
            <div className="row" style={{ justifyContent: 'space-between' }}>
              <h2 className="section-title">
                Seviye {game.level.level}: {game.level.title}
              </h2>
              <span className="muted small">{game.xp.total.toLocaleString('tr-TR')} XP toplam</span>
            </div>
            <div className="xp-bar" role="progressbar" aria-valuenow={Math.round(game.level.progress * 100)} aria-valuemin={0} aria-valuemax={100}>
              <div style={{ width: `${game.level.progress * 100}%` }} />
            </div>
            <p className="small muted">
              Sonraki seviyeye {(game.level.needed - game.level.into).toLocaleString('tr-TR')} XP kaldı.
              {nextTitle && ` ${nextTitle[0]}. seviyede unvanın "${nextTitle[1]}" olacak.`}
            </p>
          </section>

          <section className="stat-grid">
            <Stat value={<><FlameIcon className="icon-flame" size={22} /> {game.streak}</>} label="günlük seri" />
            <Stat value={game.stats.longestStreak} label="en uzun seri" />
            <Stat value={game.stats.wordsIntroduced} label="kelime" />
            <Stat value={<><StarIcon className="icon-star" size={20} /> {game.stats.mastered}</>} label="oturan kelime" />
            <Stat value={game.stats.totalAnswers.toLocaleString('tr-TR')} label="cevap" />
            <Stat value={game.stats.maxCombo} label="en uzun doğru serisi" />
          </section>

          <section className="stack">
            <h2 className="section-title">
              Rozetler <span className="muted small">({game.achievements.filter((a) => a.unlocked).length}/{game.achievements.length})</span>
            </h2>
            <div className="badge-grid">
              {[...game.achievements].sort((a, b) => Number(b.unlocked) - Number(a.unlocked)).map((a) => (
                <div key={a.id} className={`badge-card${a.unlocked ? ' is-unlocked' : ''}`} title={a.description}>
                  <span className="badge-icon">{a.icon}</span>
                  <strong>{a.title}</strong>
                  <span className="small muted">{a.description}</span>
                  {!a.unlocked && (
                    <span className="badge-progress">
                      <span style={{ width: `${(a.value / a.goal) * 100}%` }} />
                    </span>
                  )}
                  {!a.unlocked && (
                    <span className="small muted">
                      {a.value}/{a.goal}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </section>

          <section className="card stack">
            <h2 className="section-title">Unvan merdiveni</h2>
            <ol className="ladder">
              {LADDER.map(([l, title]) => (
                <li key={l} className={game.level.level >= l ? 'is-reached' : ''}>
                  <span className="level-badge">{l}</span> {title}
                </li>
              ))}
            </ol>
          </section>
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

function Stat({ value, label }: { value: React.ReactNode; label: string }) {
  return (
    <div className="stat">
      <span className="stat-value">{value}</span>
      <span className="stat-label">{label}</span>
    </div>
  )
}
