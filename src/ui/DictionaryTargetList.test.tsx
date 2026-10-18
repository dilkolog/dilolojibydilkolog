// @vitest-environment happy-dom
import 'fake-indexeddb/auto'
import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { db } from '../data/instance'
import { DictionaryScreen } from './Dictionary'
import type { WordList } from '../engine/types'

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true
vi.stubGlobal('fetch', async () => new Response('[]', { status: 200, headers: { 'Content-Type': 'application/json' } }))

vi.mock('../data/translate', () => ({ translationReady: async () => false, translate: vi.fn() }))
vi.mock('../data/wordpack', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../data/wordpack')>()
  return {
    ...actual,
    loadPack: vi.fn(async () => ({
      w: {
        bonjour: { t: ['merhaba', 'günaydın'], p: 8 },
        merci: { t: ['teşekkürler'], p: 8 },
      },
    })),
  }
})

describe('DictionaryScreen target list picker', () => {
  let el: HTMLDivElement
  let root: ReturnType<typeof createRoot>

  const sampleLists: WordList[] = [
    {
      id: 'travel-fr',
      name: 'Seyahat',
      language: 'fr',
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-01T00:00:00Z',
      levels: [
        { id: 'airport', name: 'Havalimanı' },
        { id: 'hotel', name: 'Otel' },
      ],
    },
    {
      id: 'work-fr',
      name: 'İş Hayatı',
      language: 'fr',
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-01T00:00:00Z',
    },
  ]

  beforeEach(async () => {
    localStorage.clear()
    await db.vocabulary.clear()
    await db.meta.clear()
    await db.meta.put({ key: 'wordLists', value: sampleLists })
    el = document.createElement('div')
    document.body.append(el)
    root = createRoot(el)
  })

  afterEach(() => {
    act(() => root.unmount())
    el.remove()
  })

  const mount = async (query = '') => {
    await act(async () =>
      root.render(
        <DictionaryScreen
          language="fr"
          vocabulary={[]}
          lists={sampleLists}
          initialQuery={query}
          onOpenWord={() => {}}
          onAdd={() => {}}
        />,
      ),
    )
    await act(async () => new Promise((r) => setTimeout(r, 60)))
  }

  it('renders target list bar defaulting to Listesiz when no list is remembered', async () => {
    await mount()
    const targetBar = el.querySelector('.dict-target-bar')
    expect(targetBar).toBeDefined()
    expect(targetBar?.textContent).toContain('Hedef liste:')
    expect(targetBar?.textContent).toContain('Listesiz (Genel havuz)')
  })

  it('opens popover menu and switches target list when clicked', async () => {
    await mount()
    const btn = el.querySelector('.dict-target-btn') as HTMLButtonElement
    expect(btn).toBeDefined()

    // Open popover
    await act(async () => btn.click())
    const menuItems = [...el.querySelectorAll<HTMLButtonElement>('[role=menuitem]')]
    expect(menuItems.some((m) => m.textContent?.includes('Seyahat'))).toBe(true)
    expect(menuItems.some((m) => m.textContent?.includes('İş Hayatı'))).toBe(true)

    // Click on "İş Hayatı"
    const workItem = menuItems.find((m) => m.textContent?.includes('İş Hayatı'))
    await act(async () => workItem?.click())

    // Button label updates
    expect(btn.textContent).toContain('İş Hayatı')
    // Remembered in localStorage
    expect(localStorage.getItem('kelime-koc:last-list:fr')).toBe('work-fr')
  })

  it('adds words to the selected target list', async () => {
    await mount('bonjour')
    const btn = el.querySelector('.dict-target-btn') as HTMLButtonElement

    // Pick "Seyahat › Havalimanı"
    await act(async () => btn.click())
    const airportItem = [...el.querySelectorAll<HTMLButtonElement>('[role=menuitem]')].find((m) => m.textContent?.includes('Havalimanı'))
    await act(async () => airportItem?.click())
    expect(btn.textContent).toContain('Seyahat › Havalimanı')

    // Verify WordCard shows target tag
    const targetTag = el.querySelector('.word-hero-target-tag')
    expect(targetTag?.textContent).toContain('Seyahat › Havalimanı')

    // Click "Kelimelerime ekle"
    const addBtn = [...el.querySelectorAll<HTMLButtonElement>('button')].find((b) => b.textContent?.includes('Kelimelerime ekle'))
    await act(async () => addBtn?.click())
    await act(async () => new Promise((r) => setTimeout(r, 50)))

    // Check database
    const saved = await db.vocabulary.get('fr:bonjour')
    expect(saved).toBeDefined()
    expect(saved?.listId).toBe('travel-fr')
    expect(saved?.levelId).toBe('airport')
  })

  it('adds words as unlisted when Listesiz is chosen', async () => {
    // Pre-set a remembered list
    localStorage.setItem('kelime-koc:last-list:fr', 'work-fr')
    await mount('merci')

    const btn = el.querySelector('.dict-target-btn') as HTMLButtonElement
    expect(btn.textContent).toContain('İş Hayatı')

    // Switch to Listesiz
    await act(async () => btn.click())
    const noneItem = [...el.querySelectorAll<HTMLButtonElement>('[role=menuitem]')].find((m) => m.textContent?.includes('Listesiz'))
    await act(async () => noneItem?.click())
    expect(btn.textContent).toContain('Listesiz (Genel havuz)')

    // Click "Kelimelerime ekle"
    const addBtn = [...el.querySelectorAll<HTMLButtonElement>('button')].find((b) => b.textContent?.includes('Kelimelerime ekle'))
    await act(async () => addBtn?.click())
    await act(async () => new Promise((r) => setTimeout(r, 50)))

    const saved = await db.vocabulary.get('fr:merci')
    expect(saved).toBeDefined()
    expect(saved?.listId).toBeUndefined()
    expect(saved?.levelId).toBeUndefined()
  })
})
