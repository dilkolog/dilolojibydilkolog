// @vitest-environment happy-dom
;(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true
import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { Settings } from '../data/db'
import type { NavScreen } from '../appNav'
import { Sidebar, TabBar } from './AppSidebar'

const defaultSettings: Settings = {
  activeLanguage: 'fr',
  profile: { name: 'Ali' },
} as Settings

describe('AppSidebar and TabBar', () => {
  let rootEl: HTMLDivElement
  let root: ReturnType<typeof createRoot>

  beforeEach(() => {
    rootEl = document.createElement('div')
    document.body.appendChild(rootEl)
    root = createRoot(rootEl)
  })

  afterEach(() => {
    act(() => {
      root.unmount()
    })
    rootEl.remove()
  })

  describe('Sidebar', () => {
    it('marks current navigation item with aria-current="page"', () => {
      const current = (s: NavScreen) => s === 'words'
      const goPlace = vi.fn((_s: NavScreen) => vi.fn())

      act(() => {
        root.render(
          <Sidebar
            settings={defaultSettings}
            game={null}
            rail={false}
            onToggleRail={() => {}}
            dueByLanguage={{}}
            onLanguage={() => {}}
            onOpenPalette={() => {}}
            navRef={{ current: null }}
            navMark={null}
            navBadge={{}}
            badgeLabel={{}}
            current={current}
            goPlace={goPlace}
            go={() => vi.fn()}
            inSettings={false}
            onProfilePage={false}
          />,
        )
      })

      const wordsBtn = Array.from(rootEl.querySelectorAll<HTMLButtonElement>('.nav-btn')).find((b) =>
        b.textContent?.includes('Kelimeler'),
      )
      expect(wordsBtn?.getAttribute('aria-current')).toBe('page')

      const practiceBtn = Array.from(rootEl.querySelectorAll<HTMLButtonElement>('.nav-btn')).find((b) =>
        b.textContent?.includes('Pratik'),
      )
      expect(practiceBtn?.getAttribute('aria-current')).toBeNull()

      act(() => {
        wordsBtn?.click()
      })
      expect(goPlace).toHaveBeenCalledWith('words')
    })

    it('renders badge count and 99+ cap with accessible labels', () => {
      const navBadge: Partial<Record<NavScreen, number>> = {
        practice: 12,
        words: 150,
      }
      const badgeLabel: Partial<Record<NavScreen, string>> = {
        practice: 'tekrar',
        words: 'yeni',
      }

      act(() => {
        root.render(
          <Sidebar
            settings={defaultSettings}
            game={null}
            rail={false}
            onToggleRail={() => {}}
            dueByLanguage={{}}
            onLanguage={() => {}}
            onOpenPalette={() => {}}
            navRef={{ current: null }}
            navMark={null}
            navBadge={navBadge}
            badgeLabel={badgeLabel}
            current={() => false}
            goPlace={() => vi.fn()}
            go={() => vi.fn()}
            inSettings={false}
            onProfilePage={false}
          />,
        )
      })

      const practiceBadge = rootEl.querySelector('.nav-badge-practice')
      expect(practiceBadge?.textContent?.trim()).toBe('12')
      expect(practiceBadge?.getAttribute('aria-label')).toBe('12 tekrar')

      const wordsBadge = rootEl.querySelector('.nav-badge-words')
      expect(wordsBadge?.textContent?.trim()).toBe('99+')
      expect(wordsBadge?.getAttribute('aria-label')).toBe('150 yeni')
    })

    it('handles active language button, language switching, and due dots', () => {
      const onLanguage = vi.fn()
      const dueByLanguage = {
        es: 7,
      }

      act(() => {
        root.render(
          <Sidebar
            settings={defaultSettings} // active: 'fr'
            game={null}
            rail={false}
            onToggleRail={() => {}}
            dueByLanguage={dueByLanguage}
            onLanguage={onLanguage}
            onOpenPalette={() => {}}
            navRef={{ current: null }}
            navMark={null}
            navBadge={{}}
            badgeLabel={{}}
            current={() => false}
            goPlace={() => vi.fn()}
            go={() => vi.fn()}
            inSettings={false}
            onProfilePage={false}
          />,
        )
      })

      const frBtn = Array.from(rootEl.querySelectorAll<HTMLButtonElement>('.lang-btn')).find((b) =>
        b.textContent?.includes('FR'),
      )
      const esBtn = Array.from(rootEl.querySelectorAll<HTMLButtonElement>('.lang-btn')).find((b) =>
        b.textContent?.includes('ES'),
      )

      expect(frBtn?.getAttribute('aria-pressed')).toBe('true')
      expect(esBtn?.getAttribute('aria-pressed')).toBe('false')

      // Inactive language with due items displays dot and notice in aria-label
      expect(esBtn?.querySelector('.lang-dot')).not.toBeNull()
      expect(esBtn?.getAttribute('aria-label')).toContain('7 tekrar bekliyor')

      act(() => {
        esBtn?.click()
      })
      expect(onLanguage).toHaveBeenCalledWith('es')
    })

    it('triggers rail toggle, search palette, and settings clicks', () => {
      const onToggleRail = vi.fn()
      const onOpenPalette = vi.fn()
      const goSettings = vi.fn()
      const go = vi.fn((screen: { name: string }) => (screen.name === 'settings' ? goSettings : vi.fn()))

      act(() => {
        root.render(
          <Sidebar
            settings={defaultSettings}
            game={null}
            rail={false}
            onToggleRail={onToggleRail}
            dueByLanguage={{}}
            onLanguage={() => {}}
            onOpenPalette={onOpenPalette}
            navRef={{ current: null }}
            navMark={null}
            navBadge={{}}
            badgeLabel={{}}
            current={() => false}
            goPlace={() => vi.fn()}
            go={go}
            inSettings={true}
            onProfilePage={false}
          />,
        )
      })

      const railBtn = rootEl.querySelector<HTMLButtonElement>('.rail-toggle')
      act(() => {
        railBtn?.click()
      })
      expect(onToggleRail).toHaveBeenCalled()

      const searchBtn = rootEl.querySelector<HTMLButtonElement>('.palette-trigger')
      act(() => {
        searchBtn?.click()
      })
      expect(onOpenPalette).toHaveBeenCalled()

      const settingsBtn = rootEl.querySelector<HTMLButtonElement>('.sidebar-settings')
      expect(settingsBtn?.getAttribute('aria-current')).toBe('page')
      act(() => {
        settingsBtn?.click()
      })
      expect(goSettings).toHaveBeenCalled()
    })
  })

  describe('TabBar', () => {
    it('renders bottom navigation tabs with aria-current and badge dots', () => {
      const current = (s: NavScreen) => s === 'reading'
      const goPlace = vi.fn((_s: NavScreen) => vi.fn())
      const navBadge: Partial<Record<NavScreen, number>> = {
        practice: 3,
      }
      const badgeLabel: Partial<Record<NavScreen, string>> = {
        practice: 'tekrar',
      }

      act(() => {
        root.render(
          <TabBar
            navBadge={navBadge}
            badgeLabel={badgeLabel}
            current={current}
            goPlace={goPlace}
          />,
        )
      })

      const readTab = Array.from(rootEl.querySelectorAll<HTMLButtonElement>('.tab')).find((b) =>
        b.textContent?.includes('Okuma'),
      )
      expect(readTab?.getAttribute('aria-current')).toBe('page')

      const practiceTab = Array.from(rootEl.querySelectorAll<HTMLButtonElement>('.tab')).find((b) =>
        b.textContent?.includes('Pratik'),
      )
      expect(practiceTab?.getAttribute('aria-current')).toBeNull()

      const dot = practiceTab?.querySelector('.tab-dot')
      expect(dot).not.toBeNull()
      expect(dot?.getAttribute('aria-label')).toBe('3 tekrar')

      act(() => {
        readTab?.click()
      })
      expect(goPlace).toHaveBeenCalledWith('reading')
    })
  })
})
