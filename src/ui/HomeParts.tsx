import { useCountUp } from './useCountUp'
import { Glyph } from './Glyph'
import { dayPart } from './dayPart'
import { CheckCircleIcon, CheckIcon, ChevronDownIcon, TargetIcon } from './icons'
import type { GameState } from './game'
import { QUEST_ART } from './drawnArt'
import type { Home } from './Screens'

/**
 * Where today's new words come from, and the place to change it: "Yeni kelimeler: [Seyahat ▾]".
 * The menu offers every list (and all the words); with a list in focus, its level and how far
 * along it is, and a way to its page. Reviews come from every list whatever is chosen.
 */
export function FocusLine({
  focus,
  done,
  lists,
  focusListId,
  onFocusList,
  onOpenList,
  onOpenLists,
}: {
  focus?: NonNullable<Parameters<typeof Home>[0]['focus']>
  done: boolean
  lists: readonly { id: string; name: string; count: number }[]
  focusListId?: string
  onFocusList?: (listId: string | null) => void
  onOpenList?: (listId: string) => void
  onOpenLists?: () => void
}) {
  if (!focus && !lists.length) return null
  // A native menu: the hero clips what spills out of it, and the system's list opens above everything.
  const picker =
    onFocusList && lists.length > 0 ? (
      <span className="hero-list-pick">
        <select
          className="hero-list-select"
          aria-label="Yeni kelimeler hangi listeden"
          value={focusListId ?? ''}
          onChange={(e) => onFocusList(e.target.value || null)}
        >
          <option value="">tüm kelimelerin</option>
          {lists.map((l) => (
            <option key={l.id} value={l.id}>
              {l.name} ({l.count})
            </option>
          ))}
        </select>
        <ChevronDownIcon size={14} className="hero-list-chev" />
      </span>
    ) : (
      <span className="hero-list-pick">“{focus?.name}”</span>
    )
  const meta = [focus?.level ? `“${focus.level}” seviyesi` : '', focus?.total ? `${focus.met}/${focus.total} tanıştın` : ''].filter(Boolean).join(' · ')
  return (
    <div className="small hero-focus">
      {focus && done ? (
        <span className="hero-focus-note">“{focus.name}” listesinin bütün kelimeleriyle tanıştın; yeni kelimeler için başka bir liste seç:</span>
      ) : (
        <span className="hero-focus-label">
          <TargetIcon size={14} className="inline-icon" />
          Yeni kelimeler
        </span>
      )}
      {picker}
      {meta && !done && <span className="hero-focus-meta">{meta}</span>}
      {focusListId && onOpenList ? (
        <button type="button" className="link hero-focus-open" onClick={() => onOpenList(focusListId)}>
          Listeyi aç ›
        </button>
      ) : (
        !onFocusList &&
        onOpenLists && (
          <button type="button" className="link hero-focus-open" onClick={onOpenLists}>
            Listeler ›
          </button>
        )
      )}
    </div>
  )
}

import { type WeatherInfo, weatherConditionName, weatherOrDayScene } from '../data/weather'

/** The light of the hour or live weather beside the greeting. */
export function DayMark({ now, weather }: { now: Date; weather?: WeatherInfo | null }) {
  const part = dayPart(now)
  const scene = weatherOrDayScene(weather ?? null, part)
  const label = weather ? `${weather.city ? `${weather.city} · ` : ''}${weather.temperature}°C, ${weatherConditionName(weather.condition, weather.isDay)}` : undefined

  return (
    <span className={`day-mark is-${part}${weather ? ` is-weather-${weather.condition}` : ''}`} title={label} aria-label={label}>
      <img className="day-scene" src={scene} alt={label ?? ''} width={52} height={40} draggable={false} />
      {weather && (
        <span className="weather-badge-pill" aria-hidden>
          {weather.temperature}°
        </span>
      )}
    </span>
  )
}

/** A quest's picture: the drawn icon for what it counts, a check once it is done. */
export function QuestIcon({ quest }: { quest: { id: string; icon: string; done: boolean } }) {
  return (
    <span className="quest-icon">
      {QUEST_ART[quest.id] ? <img className="quest-art" src={QUEST_ART[quest.id]} alt="" width={28} height={28} /> : <Glyph emoji={quest.icon} size={22} />}
      {/* Done: the picture stays, a green check sits on its corner. */}
      {quest.done && (
        <span className="quest-check">
          <CheckCircleIcon size={16} solid />
        </span>
      )}
    </span>
  )
}

/** Level and today's XP; both count up to their new values when you come back from a session. */
export function LevelStrip({ game, dailyXpGoal, onProfile }: { game: GameState; dailyXpGoal: number; onProfile: () => void }) {
  const into = useCountUp(game.level.into, `into:${game.level.level}`)
  const today = useCountUp(game.xp.today, 'today')
  const progress = game.level.needed ? into / game.level.needed : 0
  return (
    <button className="level-strip" onClick={onProfile}>
      <span className="level-badge">Sv. {game.level.level}</span>
      <span className="level-strip-body">
        <span className="level-strip-top">
          <strong>{game.level.title}</strong>
          <span className="small muted">
            {Math.round(into).toLocaleString('tr-TR')} / {game.level.needed.toLocaleString('tr-TR')} XP
          </span>
        </span>
        <span className="xp-bar xp-bar-sm">
          <span style={{ width: `${Math.min(1, progress) * 100}%` }} />
        </span>
      </span>
      {/* Once the day's goal is met a green seal stands by the day's XP (no "done" word beside a tick); the goal stays below it. */}
      {today >= dailyXpGoal ? (
        <span className="daily-goal is-done">
          <span className="small muted">Bugün</span>
          <strong>
            <span className="daily-check" aria-hidden>
              <CheckIcon size={12} />
            </span>
            {Math.round(today)} XP
          </strong>
          <span className="small muted">
            <span className="sr-only">Günlük hedef tamam, </span>hedef {dailyXpGoal}
          </span>
        </span>
      ) : (
        <span className="daily-goal">
          <span className="small muted">Bugün</span>
          <strong>
            {Math.round(today)}/{dailyXpGoal} XP
          </strong>
        </span>
      )}
    </button>
  )
}
