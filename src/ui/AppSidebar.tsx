import type { RefObject } from 'react'
import type { Settings } from '../data/db'
import { TARGET_LANGUAGES, type TargetLanguage } from '../engine/types'
import { NAV, type NavScreen, type Screen } from '../appNav'
import { Avatar } from './Avatar'
import type { GameState } from './game'
import { ChevronLeftIcon, ChevronRightIcon, GearIcon, LogoutIcon, SearchIcon, UserIcon } from './icons'
import { MenuItem, Popover } from './Popover'
import { signOutThisDevice } from './signOut'
import { useHasAccount } from './useHasAccount'
import { LANGUAGE_NAME, LANGUAGE_SHORT } from './labels'
import { AccessBadge } from './AccessBadge'
import { NoticeBell } from './NoticeBell'
import { OfflineBadge } from './OfflineBadge'
import { StreakFlame } from './StreakFlame'
import { BrandLogo } from './BrandLogo'

export type NavMark = { top: number; left: number; width: number; height: number; ready: boolean }

interface NavProps {
  navBadge: Partial<Record<NavScreen, number>>
  badgeLabel: Partial<Record<NavScreen, string>>
  current: (n: NavScreen) => boolean
  goPlace: (n: NavScreen) => () => void
}

/** The side menu (wide screens and tablets): brand, language, search, the five places, settings, profile. */
export function Sidebar({
  settings,
  game,
  rail,
  onToggleRail,
  dueByLanguage,
  onLanguage,
  onOpenPalette,
  navRef,
  navMark,
  navBadge,
  badgeLabel,
  current,
  goPlace,
  go,
  inSettings,
  onProfilePage,
}: NavProps & {
  settings: Settings
  game: GameState | null
  rail: boolean
  onToggleRail: () => void
  dueByLanguage: Partial<Record<TargetLanguage, number>>
  onLanguage: (l: TargetLanguage) => void
  onOpenPalette: () => void
  navRef: RefObject<HTMLElement | null>
  navMark: NavMark | null
  go: (s: Screen) => () => void
  inSettings: boolean
  onProfilePage: boolean
}) {
  const hasAccount = useHasAccount()
  return (
    <aside className="sidebar">
      <div className="brand-row">
        <button className="brand" onClick={go({ name: 'home' })} title="Diloloji">
          <BrandLogo />
          <span className="brand-name">Diloloji</span>
        </button>
        <OfflineBadge />
        <AccessBadge onOpen={go({ name: 'settings' })} />
        <div className="brand-bell">
          <NoticeBell onOpen={(target) => go({ name: target })()} />
        </div>
        <button className="icon-btn rail-toggle" onClick={onToggleRail} aria-label={rail ? 'Menüyü aç' : 'Menüyü daralt'} title={rail ? 'Menüyü aç' : 'Menüyü daralt'}>
          {rail ? <ChevronRightIcon size={18} /> : <ChevronLeftIcon size={18} />}
        </button>
      </div>
      <div className="langs" role="group" aria-label="Dil" style={{ ['--i' as string]: TARGET_LANGUAGES.indexOf(settings.activeLanguage) }}>
        <span className="langs-thumb" aria-hidden />
        {TARGET_LANGUAGES.map((l) => (
          <button
            key={l}
            className="lang-btn"
            aria-pressed={l === settings.activeLanguage}
            aria-label={`${LANGUAGE_NAME[l]}${l !== settings.activeLanguage && dueByLanguage[l] ? `, ${dueByLanguage[l]} tekrar bekliyor` : ''}`}
            title={l !== settings.activeLanguage && dueByLanguage[l] ? `${dueByLanguage[l]} tekrar bekliyor` : undefined}
            onClick={() => onLanguage(l)}
          >
            {LANGUAGE_SHORT[l]}
            {l !== settings.activeLanguage && !!dueByLanguage[l] && <span className="lang-dot" aria-hidden />}
          </button>
        ))}
      </div>
      <button className="palette-trigger" onClick={onOpenPalette} aria-label="Ara ya da git (⌘K)" title="Ara ya da git (⌘K)">
        <SearchIcon size={18} />
        <span className="palette-trigger-label">Ara ya da git…</span>
        <kbd className="palette-trigger-kbd">⌘K</kbd>
      </button>
      <div className="top-profile">
        <Popover
          kind="menu"
          align="end"
          label="Hesap menüsü"
          buttonClassName="top-profile-btn"
          buttonProps={{ 'aria-label': 'Hesap menüsü', title: 'Hesap menüsü' }}
          button={<Avatar profile={settings.profile} size={32} />}
        >
          {(close) => <AccountMenuItems close={close} go={go} hasAccount={hasAccount} />}
        </Popover>
      </div>
      <nav className={`nav${navMark ? ' has-indicator' : ''}`} ref={navRef}>
        {navMark && (
          <span
            className={`nav-indicator${navMark.ready ? ' is-ready' : ''}`}
            aria-hidden
            style={{ transform: `translate(${navMark.left}px, ${navMark.top}px)`, width: navMark.width, height: navMark.height }}
          />
        )}
        {NAV.map((n) => (
          <button
            key={n.screen}
            className={`nav-btn${n.screen === 'home' ? ' nav-home' : ''}`}
            aria-current={current(n.screen) ? 'page' : undefined}
            onClick={goPlace(n.screen)}
            title={rail ? n.label : undefined}
          >
            <n.icon size={20} />
            <span className="nav-label">{n.label}</span>
            {!!navBadge[n.screen] && (
              <span className={`nav-badge nav-badge-${n.screen}`} aria-label={`${navBadge[n.screen]} ${badgeLabel[n.screen]}`}>
                {navBadge[n.screen]! > 99 ? '99+' : navBadge[n.screen]}
              </span>
            )}
          </button>
        ))}
      </nav>
      <button className="nav-btn sidebar-settings" aria-current={inSettings ? 'page' : undefined} onClick={go({ name: 'settings' })} title={rail ? 'Ayarlar' : undefined}>
        <GearIcon size={20} />
        <span className="nav-label">Ayarlar</span>
      </button>
      <div className="sidebar-foot" aria-current={onProfilePage ? 'page' : undefined}>
        {/* The account menu: you, settings, sign out (the same avatar opens the profile on a phone). */}
        <Popover
          kind="menu"
          label="Hesap menüsü"
          buttonClassName="sidebar-foot-btn"
          buttonProps={{ 'aria-label': 'Hesap menüsü', title: 'Hesap menüsü' }}
          button={
            <>
              <Avatar profile={settings.profile} size={40} />
              <span className="sidebar-who">
                <strong>{settings.profile.name || 'Profilin'}</strong>
                {game && (
                  <span className="small muted">
                    Seviye {game.level.level} · <StreakFlame streak={game.streak} frozen={game.frozenYesterday} size={13} /> {game.streak}
                    {(game.freezes ?? 0) > 0 ? ` · 🛡️${game.freezes}` : ''}
                  </span>
                )}
                {game && (
                  <span className="sidebar-level" aria-hidden>
                    <span style={{ width: `${game.level.progress * 100}%` }} />
                  </span>
                )}
              </span>
            </>
          }
        >
          {(close) => <AccountMenuItems close={close} go={go} hasAccount={hasAccount} />}
        </Popover>
        <div
          className="sidebar-foot-bell"
          onClick={(e) => e.stopPropagation()}
          onKeyDown={(e) => e.stopPropagation()}
        >
          <NoticeBell onOpen={(target) => go({ name: target })()} />
        </div>
      </div>
    </aside>
  )
}

/** The bottom tab bar (phones). */
export function TabBar({ navBadge, badgeLabel, current, goPlace }: NavProps) {
  return (
    <nav className="tabbar" aria-label="Ana menü">
      {NAV.map((n) => (
        <button key={n.screen} className="tab" aria-current={current(n.screen) ? 'page' : undefined} onClick={goPlace(n.screen)}>
          <span className="tab-icon">
            <n.icon size={22} />
            {!!navBadge[n.screen] && <span className="tab-dot" aria-label={`${navBadge[n.screen]} ${badgeLabel[n.screen]}`} />}
          </span>
          <span>{n.label}</span>
        </button>
      ))}
    </nav>
  )
}

/** What the avatar opens (the side menu's foot on a computer, the top bar's avatar on a phone): you, settings, sign out. */
function AccountMenuItems({ close, go, hasAccount }: { close: () => void; go: (s: Screen) => () => void; hasAccount: boolean }) {
  return (
    <>
      <MenuItem
        icon={<UserIcon size={18} />}
        title="Profil"
        hint="Seviye ve rozetlerin"
        onSelect={() => {
          close()
          go({ name: 'profile' })()
        }}
      />
      <MenuItem
        icon={<GearIcon size={18} />}
        title="Ayarlar"
        onSelect={() => {
          close()
          go({ name: 'settings' })()
        }}
      />
      {hasAccount && (
        <>
          <div className="menu-sep" role="separator" />
          <MenuItem
            icon={<LogoutIcon size={18} />}
            title="Çıkış yap"
            hint="Kelimelerin bu cihazda kalır"
            onSelect={() => {
              close()
              void signOutThisDevice()
            }}
          />
        </>
      )}
    </>
  )
}
