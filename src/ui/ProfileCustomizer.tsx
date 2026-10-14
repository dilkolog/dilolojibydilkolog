import { useState } from 'react'
import type { Profile } from '../data/db'
import {
  availableTitles,
  BANNERS,
  bannerOf,
  FRAMES,
  frameOf,
  GOAL_LEVELS,
  INTEREST_LIMIT,
  INTERESTS,
  isUnlocked,
  PIN_LIMIT,
  toggleLimited,
  type StyleOption,
  type Unlockables,
} from '../engine/profileStyle'
import type { GameState } from './game'
import { LockIcon } from './icons'
import { BadgeMedal } from './Medal'

/**
 * Everything about how the profile looks and says: banner, avatar frame, title, the badges on the
 * card, interests and a goal. Styles open with progress (a streak, a level, settled words), so a
 * locked one says what opens it.
 */
export function ProfileCustomizer({ profile, game, unlockables, save }: { profile: Profile; game: GameState; unlockables: Unlockables; save: (patch: Partial<Profile>) => void }) {
  const banner = bannerOf(profile.banner)
  const frame = frameOf(profile.frame)
  const titles = availableTitles(unlockables)
  const earned = game.achievements.filter((a) => a.unlocked)
  const pinned = (profile.pinned ?? []).filter((id) => unlockables.badges.has(id))
  const interests = profile.interests ?? []
  // One line under each row of styles: the chosen one's name, or what a locked one opens with (hovered, focused or tapped).
  const [hint, setHint] = useState<{ row: string; text: string } | null>(null)
  const caption = (row: string, chosenName: string) => (hint?.row === row ? hint.text : chosenName)

  return (
    <div className="stack customizer">
      <Group title="Afiş" note="Kartının üst kısmı.">
        <div className="style-grid" role="radiogroup" aria-label="Afiş" onMouseLeave={() => setHint(null)}>
          {BANNERS.map((b) => (
            <StyleTile key={b.id} option={b} unlockables={unlockables} chosen={banner === b.id} onPick={() => save({ banner: b.id })} onShow={(text) => setHint({ row: 'banner', text })} onHide={() => setHint(null)}>
              <span className="style-swatch banner-preview" data-banner={b.id} style={{ ['--pcolor' as string]: profile.color }} />
            </StyleTile>
          ))}
        </div>
        <p className="style-caption small muted" aria-live="polite">{caption('banner', BANNERS.find((b) => b.id === banner)?.name ?? '')}</p>
      </Group>

      <Group title="Avatar çerçevesi" note="Fotoğrafının ya da emojinin çevresi.">
        <div className="style-grid" role="radiogroup" aria-label="Avatar çerçevesi" onMouseLeave={() => setHint(null)}>
          {FRAMES.map((f) => (
            <StyleTile key={f.id} option={f} unlockables={unlockables} chosen={frame === f.id} onPick={() => save({ frame: f.id })} onShow={(text) => setHint({ row: 'frame', text })} onHide={() => setHint(null)}>
              <span className="avatar-ring frame-preview" data-frame={f.id} style={{ ['--ring' as string]: '62%' }}>
                <span className="frame-dot" style={{ background: profile.color }} />
              </span>
            </StyleTile>
          ))}
        </div>
        <p className="style-caption small muted" aria-live="polite">{caption('frame', FRAMES.find((f) => f.id === frame)?.name ?? '')}</p>
      </Group>

      <Group title="Unvan" note="Adının yanında görünür; seviyeyle ve rozetlerle yenileri açılır.">
        <div className="choice-row" role="radiogroup" aria-label="Unvan">
          {titles.map((t) => (
            <button key={t.id} type="button" role="radio" aria-checked={(profile.title ?? 'auto') === t.id} className="chip chip-sm" aria-pressed={(profile.title ?? 'auto') === t.id} onClick={() => save({ title: t.id === 'auto' ? undefined : t.id })}>
              {t.name}
            </button>
          ))}
        </div>
      </Group>

      <Group title="Rozet vitrini" note={`Kartında göstereceğin rozetler (${pinned.length}/${PIN_LIMIT}).`}>
        {earned.length === 0 ? (
          <p className="small muted">İlk rozetini kazanınca burada seçebilirsin.</p>
        ) : (
          <div className="pin-grid">
            {earned.map((a) => {
              const on = pinned.includes(a.id)
              const full = !on && pinned.length >= PIN_LIMIT
              return (
                <button key={a.id} type="button" className={`pin-tile${on ? ' is-on' : ''}`} aria-pressed={on} disabled={full} title={full ? `En çok ${PIN_LIMIT} rozet` : a.title} onClick={() => save({ pinned: toggleLimited(pinned, a.id, PIN_LIMIT) })}>
                  <BadgeMedal badge={a} unlocked size={40} />
                  <span className="small">{a.title}</span>
                </button>
              )
            })}
          </div>
        )}
      </Group>

      <Group title="İlgi alanların" note={`En çok ${INTEREST_LIMIT} tane (${interests.length}/${INTEREST_LIMIT}). Kartında görünür.`}>
        <div className="choice-row">
          {INTERESTS.map((i) => {
            const on = interests.includes(i)
            return (
              <button key={i} type="button" className="chip chip-sm" aria-pressed={on} disabled={!on && interests.length >= INTEREST_LIMIT} onClick={() => save({ interests: toggleLimited(interests, i, INTEREST_LIMIT) })}>
                {i}
              </button>
            )
          })}
        </div>
      </Group>

      <Group title="Hedefin" note="Ulaşmak istediğin seviye ve, istersen bir tarih.">
        <div className="row">
          <div className="choice-row" role="radiogroup" aria-label="Hedef seviye">
            {GOAL_LEVELS.map((l) => (
              <button key={l} type="button" role="radio" aria-checked={profile.goalLevel === l} className="chip chip-sm" aria-pressed={profile.goalLevel === l} onClick={() => save({ goalLevel: profile.goalLevel === l ? undefined : l })}>
                {l}
              </button>
            ))}
          </div>
          <label className="field goal-date">
            <span className="small">Tarih (isteğe bağlı)</span>
            <input type="date" className="input" value={profile.goalDate ?? ''} onChange={(e) => save({ goalDate: e.target.value || undefined })} />
          </label>
        </div>
      </Group>
    </div>
  )
}

function Group({ title, note, children }: { title: string; note: string; children: React.ReactNode }) {
  return (
    <section className="customizer-group">
      <h3 className="subhead">{title}</h3>
      <p className="small muted">{note}</p>
      {children}
    </section>
  )
}

function StyleTile({ option, unlockables, chosen, onPick, onShow, onHide, children }: { option: StyleOption; unlockables: Unlockables; chosen: boolean; onPick: () => void; onShow: (text: string) => void; onHide: () => void; children: React.ReactNode }) {
  const open = isUnlocked(option, unlockables)
  const text = open ? option.name : `${option.name}: ${option.unlock!.text}`
  return (
    <button
      type="button"
      role="radio"
      aria-checked={chosen}
      aria-disabled={!open || undefined}
      aria-label={open ? option.name : `${option.name}, kilitli: ${option.unlock!.text}`}
      className={`style-tile${chosen ? ' is-chosen' : ''}${open ? '' : ' is-locked'}`}
      onClick={() => (open ? onPick() : onShow(text))}
      onMouseEnter={() => onShow(text)}
      onFocus={() => onShow(text)}
      onBlur={onHide}
    >
      {children}
      {!open && <LockIcon size={16} className="style-lock" />}
    </button>
  )
}
