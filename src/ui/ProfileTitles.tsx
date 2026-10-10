import type { Profile } from '../data/db'
import { levelTitle } from '../engine/gamification'
import { availableTitles, BADGE_TITLES, type Unlockables } from '../engine/profileStyle'
import type { GameState } from './game'
import { LockIcon } from './icons'

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

  return (
    <section className="card stack titles-tab">
      <div>
        <h2 className="section-title">Seviye unvanları</h2>
        <p className="small muted">Seviye atladıkça yeni bir unvan açılır; açılanlardan istediğini adının yanında gösterebilirsin.</p>
      </div>
      <ol className="ladder titles-ladder">
        {LEVELS.map((l) => {
          const reached = game.level.level >= l
          const id = idOf(l)
          const on = reached && chosen === id
          return (
            <li key={l} className={`${reached ? 'is-reached' : ''}${l === current ? ' is-current' : ''}`}>
              <span className="level-badge">{l}</span>
              <span className="title-name">{levelTitle(l)}</span>
              {l === current && <span className="title-tag">şu an</span>}
              {l === next && <span className="small muted">{xpToNext.toLocaleString('tr-TR')} XP kaldı</span>}
              {!reached && l !== next && (
                <span className="small muted title-lock">
                  <LockIcon size={14} className="inline-icon" />
                  {l}. seviye
                </span>
              )}
              {reached && (
                <button type="button" className={`btn btn-sm ${on ? '' : 'btn-quiet'}`} aria-pressed={on} onClick={() => pick(id)}>
                  {on ? 'Gösteriliyor' : 'Göster'}
                </button>
              )}
            </li>
          )
        })}
      </ol>
      <div>
        <h2 className="section-title">Rozet unvanları</h2>
        <p className="small muted">Bu unvanlar belirli rozetlerle açılır.</p>
      </div>
      <ul className="ladder titles-ladder">
        {BADGE_TITLES.map((t) => {
          const badge = game.achievements.find((a) => a.id === t.badge)
          const reached = unlockables.badges.has(t.badge)
          const on = reached && chosen === t.id
          return (
            <li key={t.id} className={reached ? 'is-reached' : ''}>
              <span className="title-name">{t.name}</span>
              {reached ? (
                <button type="button" className={`btn btn-sm ${on ? '' : 'btn-quiet'}`} aria-pressed={on} onClick={() => pick(t.id)}>
                  {on ? 'Gösteriliyor' : 'Göster'}
                </button>
              ) : (
                <span className="small muted title-lock">
                  <LockIcon size={14} className="inline-icon" />“{badge?.title}” rozetiyle açılır
                </span>
              )}
            </li>
          )
        })}
      </ul>
    </section>
  )
}
