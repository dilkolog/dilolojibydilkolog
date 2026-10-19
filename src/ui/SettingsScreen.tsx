import '../lazy.css'
import { useEffect, useRef, useState, type ReactNode } from 'react'
import type { Settings } from '../data/db'
import { AccountSettings } from './AccountSettings'
import { AnswerSettings } from './AnswerSettings'
import type { AuthMode } from './AuthScreen'
import { DataSettings } from './DataSettings'
import { HelpSettings } from './HelpSettings'
import { BellIcon, DataIcon, HelpIcon, PaletteIcon, PenIcon, SearchIcon, SpeakerIcon, TargetIcon, ToolIcon, UserIcon } from './icons'
import { LookSettings } from './LookSettings'
import { PageHeader } from './PageHeader'
import type { PushState } from './pushReminders'
import { NoticeSettings, ReminderSettings } from './ReminderSettings'
import { SETTINGS_ART } from './drawnArt'
import { PANE_KEY } from './settingsPane'
import { SoundSettings } from './SoundSettings'
import { StudySettings } from './StudySettings'
import { ToolsSettings } from './ToolsSettings'

type GroupId = 's-account' | 's-study' | 's-answers' | 's-sound' | 's-look' | 's-remind' | 's-tools' | 's-data' | 's-help'

interface Group {
  id: GroupId
  name: string
  sub: string
  icon: ReactNode
}

/** The settings in groups, one shown at a time (all of them while searching). */
const GROUP_LIST: Group[] = [
  { id: 's-account', name: 'Hesap', sub: 'Giriş ve cihazlar arası eşitleme', icon: <UserIcon size={18} /> },
  { id: 's-study', name: 'Çalışma', sub: 'Günlük tempo, yeni kelimeler ve tekrar takvimi', icon: <TargetIcon size={18} /> },
  { id: 's-answers', name: 'Sorular', sub: 'Yazma, ipuçları ve cevapların kontrolü', icon: <PenIcon size={18} /> },
  { id: 's-sound', name: 'Ses', sub: 'Seslendirme, sesler ve konuşarak cevap', icon: <SpeakerIcon size={18} /> },
  { id: 's-look', name: 'Görünüm', sub: 'Tema, yazı boyutu ve liste sıklığı', icon: <PaletteIcon size={18} /> },
  { id: 's-remind', name: 'Bildirimler', sub: 'Hatırlatma, takvim ve çan', icon: <BellIcon size={18} /> },
  { id: 's-tools', name: 'Araçlar', sub: 'Yapay zekâ, kısayollar ve çevrimdışı paket', icon: <ToolIcon size={18} /> },
  { id: 's-data', name: 'Veriler', sub: 'Yedek, dışa aktarma ve sıfırlama', icon: <DataIcon size={18} /> },
  { id: 's-help', name: 'Yardım', sub: 'Bize ulaş, sık sorulanlar ve gizlilik', icon: <HelpIcon size={18} /> },
]
const GROUP_BY_ID = Object.fromEntries(GROUP_LIST.map((g) => [g.id, g])) as Record<GroupId, Group>

function Pane({ group, active, children }: { group: Group; active: boolean; children: ReactNode }) {
  return (
    <div className="settings-pane" id={group.id} data-active={active || undefined}>
      <header className="settings-pane-head">
        {SETTINGS_ART[group.id] ? <img className="settings-pane-art" src={SETTINGS_ART[group.id]} alt="" height={48} /> : <span className="settings-pane-icon">{group.icon}</span>}
        <div>
          <h2 className="settings-pane-title">{group.name}</h2>
          <p className="small muted">{group.sub}</p>
        </div>
      </header>
      {children}
    </div>
  )
}

/** Who is signed in to this device's profile, a tap away from the profile page. */
export function SettingsScreen({
  settings,
  onChange,
  onDataChanged,
  pushState,
  onOpenAuth,
}: {
  settings: Settings
  onChange: (s: Settings) => void
  onDataChanged: () => void
  pushState: PushState
  onOpenAuth?: (mode: AuthMode) => void
}) {
  const [active, setActive] = useState<GroupId>(() => {
    try {
      const saved = localStorage.getItem(PANE_KEY) as GroupId | null
      return saved && saved in GROUP_BY_ID ? saved : 's-study'
    } catch {
      return 's-study'
    }
  })
  const choose = (id: GroupId) => {
    setActive(id)
    try {
      localStorage.setItem(PANE_KEY, id)
    } catch {
      // Remembering the group is only a convenience.
    }
    // Back to the top only if the page was scrolled down; never past the page title.
    if (window.scrollY > 0) window.scrollTo({ top: 0 })
  }

  // Search: looks through every group and hides the settings (rows, then whole cards and groups)
  // that don't match; without a query, only the chosen group shows.
  const root = useRef<HTMLDivElement>(null)
  const [query, setQuery] = useState('')
  const [noMatch, setNoMatch] = useState(false)
  useEffect(() => {
    const el = root.current
    if (!el) return
    const q = query.trim().toLocaleLowerCase('tr-TR')
    const has = (n: Element) => (n.textContent ?? '').toLocaleLowerCase('tr-TR').includes(q)
    let any = false
    for (const pane of el.querySelectorAll<HTMLElement>('.settings-pane')) {
      let paneHit = false
      for (const card of pane.querySelectorAll<HTMLElement>(':scope > section, :scope > .card, :scope > div.card')) {
        const rows = [...card.querySelectorAll<HTMLElement>('.setting-row, .toggle-row')]
        const title = card.querySelector('.section-title')
        const titleHit = !q || (title ? has(title) : false)
        let cardHit = titleHit || (!rows.length && has(card))
        for (const r of rows) {
          const hit = !q || titleHit || has(r)
          r.hidden = !hit
          if (hit) cardHit = true
        }
        card.hidden = !cardHit
        // A card kept closed (instructions) opens when the search lands in it.
        if (q && cardHit && card instanceof HTMLDetailsElement) card.open = true
        if (cardHit) paneHit = true
      }
      pane.hidden = q ? !paneHit : pane.id !== active
      if (q && paneHit) any = true
    }
    setNoMatch(!!q && !any)
  }, [query, active])

  const searching = !!query.trim()
  const pane = (id: GroupId) => ({ group: GROUP_BY_ID[id], active: searching || active === id })

  return (
    <div className={`settings-page${searching ? ' is-searching' : ''}`} ref={root}>
      <PageHeader
        art="settings"
        title="Ayarlar"
        action={
          <label className="settings-search">
            <SearchIcon size={18} />
            <input className="input" type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Ayar ara" aria-label="Ayar ara" />
          </label>
        }
      />
      <div className="settings-layout">
        <aside className="settings-side">
          <nav className="settings-menu" aria-label="Ayar grupları">
            {GROUP_LIST.map((g) => (
              <button
                key={g.id}
                type="button"
                className="settings-menu-item"
                aria-current={!searching && active === g.id ? 'page' : undefined}
                onClick={() => {
                  setQuery('')
                  choose(g.id)
                }}
              >
                {SETTINGS_ART[g.id] ? <img className="settings-menu-art" src={SETTINGS_ART[g.id]} alt="" height={32} /> : <span className="settings-menu-icon">{g.icon}</span>}
                <span>{g.name}</span>
              </button>
            ))}
          </nav>
        </aside>

        <div className="settings-content">
          {searching && noMatch && <p className="muted">“{query.trim()}” ile eşleşen bir ayar yok.</p>}

          <Pane {...pane('s-account')}>
            <AccountSettings onOpenAuth={onOpenAuth} />
          </Pane>

          <Pane {...pane('s-study')}>
            <StudySettings settings={settings} onChange={onChange} searching={searching} />
          </Pane>

          <Pane {...pane('s-answers')}>
            <AnswerSettings settings={settings} onChange={onChange} />
          </Pane>

          <Pane {...pane('s-sound')}>
            <SoundSettings settings={settings} onChange={onChange} />
          </Pane>

          <Pane {...pane('s-look')}>
            <LookSettings settings={settings} onChange={onChange} />
          </Pane>

          <Pane {...pane('s-remind')}>
            <ReminderSettings settings={settings} onChange={onChange} pushState={pushState} />
            <NoticeSettings settings={settings} onChange={onChange} />
          </Pane>

          <Pane {...pane('s-tools')}>
            <ToolsSettings settings={settings} onChange={onChange} onDataChanged={onDataChanged} />
          </Pane>

          <Pane {...pane('s-data')}>
            <DataSettings language={settings.activeLanguage} onDataChanged={onDataChanged} />
          </Pane>

          <Pane {...pane('s-help')}>
            <HelpSettings />
          </Pane>
        </div>
      </div>
    </div>
  )
}
