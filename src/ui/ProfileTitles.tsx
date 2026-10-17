import type { Profile } from '../data/db'
import { levelTitle } from '../engine/gamification'
import { availableTitles, BADGE_TITLES, titleName, type Unlockables } from '../engine/profileStyle'
import type { GameState } from './game'
import { LockIcon, TrophyIcon } from './icons'
import { BadgeMedal } from './Medal'

const LEVELS = [1, 3, 5, 8, 11, 15, 20, 25, 30, 40, 50]

/**
 * Every title there is: the ladder of levels (what the next one asks for) and the ones a badge
 * opens. The ones reached can be shown beside the name with one tap.
 */
export function ProfileTitles({ profile, game, unlockables, save }: { profile: Profile; game: GameState; unlockables: Unlockables; save: (patch: Partial<Profile>) => void }) {
  const open = availableTitles(unlockables)
  const chosen = open.some((t) => t.id === profile.title) ? profile.title! : 'auto'
  const current = [...LEVELS].reverse().find((l) => l <= game.level.level)!
  const next = LEVELS.find((l) => l > game.level.level)
  // The title of the highest level reached is the "auto" one; lower ones are picked by level.
  const idOf = (l: number) => (l === current ? 'auto' : `level:${l}`)
  const xpToNext = game.level.needed - game.level.into
  const pick = (id: string) => save({ title: id === 'auto' ? undefined : id })
  const activeTitle = titleName(profile.title, unlockables)
  const totalTitles = LEVELS.length + BADGE_TITLES.length

  return (
    <section className="card stack titles-tab">
      <div className="titles-hero">
        <div className="titles-hero-main">
          <span className="small muted">Görünen unvanın</span>
          <strong className="titles-hero-current">{activeTitle}</strong>
        </div>
        <span className="titles-hero-count">
          {open.length} / {totalTitles} açık
        </span>
      </div>
      <div>
        <h2 className="section-title">Seviye unvanları</h2>
        <p className="small muted">Seviye atladıkça yeni bir unvan açılır; açılanlardan istediğini adının yanında gösterebilirsin.</p>
      </div>
      <ol className="titles-ladder">
        {LEVELS.map((l) => {
          const reached = game.level.level >= l
          const id = idOf(l)
          const on = reached && chosen === id
          return (
            <li key={l} className={`${reached ? 'is-reached' : ''}${l === current ? ' is-current' : ''}${on ? ' title-shown' : ''}`}>
              <span className="level-badge title-mark">{l}</span>
              <span className="title-text">
                <span className="title-name">
                  {levelTitle(l)} {l === current && <span className="title-tag">şu an</span>}
                </span>
                {l === next ? (
                  <span className="small muted">{xpToNext.toLocaleString('tr-TR')} XP kaldı</span>
                ) : (
                  !reached && <span className="small muted">{l}. seviyede açılır</span>
                )}
              </span>
              <span className="title-action">
                {reached ? (
                  <button type="button" className={`btn btn-sm ${on ? '' : 'btn-quiet'}`} aria-pressed={on} onClick={() => pick(id)}>
                    {on ? 'Gösteriliyor' : 'Göster'}
                  </button>
                ) : (
                  <LockIcon size={16} className="title-lock" />
                )}
              </span>
            </li>
          )
        })}
      </ol>
      <div>
        <h2 className="section-title">Rozet unvanları</h2>
        <p className="small muted">Bu unvanlar belirli rozetlerle açılır.</p>
      </div>
      <ul className="titles-ladder titles-ladder-badges">
        {BADGE_TITLES.map((t) => {
          const badge = game.achievements.find((a) => a.id === t.badge)
          const reached = unlockables.badges.has(t.badge)
          const on = reached && chosen === t.id
          return (
            <li key={t.id} className={`${reached ? 'is-reached' : ''}${on ? ' title-shown' : ''}`}>
              <span className="title-mark title-medal">
                {badge ? <BadgeMedal badge={badge} unlocked={reached} size={36} /> : <TrophyIcon size={16} />}
              </span>
              <span className="title-text">
                <span className="title-name">{t.name}</span>
                {!reached ? (
                  <span className="small muted">“{badge?.title}” rozetiyle açılır</span>
                ) : (
                  badge && <span className="small muted">“{badge.title}” rozeti</span>
                )}
              </span>
              <span className="title-action">
                {reached ? (
                  <button type="button" className={`btn btn-sm ${on ? '' : 'btn-quiet'}`} aria-pressed={on} onClick={() => pick(t.id)}>
                    {on ? 'Gösteriliyor' : 'Göster'}
                  </button>
                ) : (
                  <LockIcon size={16} className="title-lock" />
                )}
              </span>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
