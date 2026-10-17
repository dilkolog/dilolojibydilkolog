// @vitest-environment happy-dom
import 'fake-indexeddb/auto'
;(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true
import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { AccessContext } from './accessContext'
import { FriendsCard } from './FriendsCard'
import type { GameState } from './game'
import type { Profile } from '../data/db'
import { db } from '../data/instance'
import type { VocabularyEntry } from '../engine/types'

const card = (code: string, name: string, today: number, week: number) => ({ code, name, avatar: 'fox', color: '#2f6de6', today, week, streak: 3, level: 4, days: { '2026-10-15': today }, at: '2026-10-15T10:00:00Z' })
const game = { xp: { total: 300, today: 40, maxCombo: 0, byDay: new Map([['2026-10-15', 40]]) }, streak: 3, level: { level: 4 } } as unknown as GameState
const profile = { name: 'Ali', emoji: 'monki', color: '#c6317c', motto: '' } as Profile

let root: ReturnType<typeof createRoot> | undefined
afterEach(() => {
  act(() => root?.unmount())
  document.body.innerHTML = ''
  vi.unstubAllGlobals()
  localStorage.clear()
})

async function mount(approved: boolean, friends = [card('BBBBBBBB', 'Veli', 90, 120)], inbox: unknown[] = [], extra: { vocabulary?: VocabularyEntry[]; language?: 'fr'; onChanged?: () => void } = {}) {
  const calls: { url: string; body?: unknown }[] = []
  vi.stubGlobal('fetch', async (url: string, init?: RequestInit) => {
    const body = init?.body ? JSON.parse(String(init.body)) : undefined
    calls.push({ url, body })
    if (String(url).includes('inbox=1')) return Response.json({ items: inbox })
    if (body?.action === 'friends-send' || body?.action === 'friends-inbox-clear') return Response.json({ ok: true })
    if (body?.action === 'friends-add') return Response.json({ error: 'unknown' }, { status: 400 })
    if (body?.action === 'friends-publish') return Response.json({ me: card('AAAAAAAA', 'Ali', 40, 300) })
    return Response.json({ me: card('AAAAAAAA', 'Ali', 40, 300), friends })
  })
  const host = document.createElement('div')
  document.body.append(host)
  root = createRoot(host)
  await act(async () => root!.render(<AccessContext.Provider value={{ status: approved ? 'approved' : 'signedOut', approved, refresh: async () => {} }}><FriendsCard game={game} profile={profile} {...extra} /></AccessContext.Provider>))
  await act(() => new Promise((r) => setTimeout(r, 30)))
  return { host, calls }
}

describe('FriendsCard', () => {
  it('publishes the own card, then ranks the learner and the friends by today or this week', async () => {
    const { host, calls } = await mount(true)
    expect(calls.some((c) => (c.body as { action?: string } | undefined)?.action === 'friends-publish')).toBe(true)
    const names = () => [...host.querySelectorAll('.friends-name')].map((n) => n.textContent!.replace(/\d+$/, '').trim())
    expect(names()).toEqual(['Veli', 'Sen'])
    await act(async () => [...host.querySelectorAll('button')].find((b) => b.textContent === 'Bu hafta')!.click())
    expect(names()).toEqual(['Sen', 'Veli'])
    expect(host.querySelector('.friends-code code')!.textContent).toBe('AAAA-AAAA')
  })

  it('an unchanged card is not sent again', async () => {
    await mount(true)
    act(() => root?.unmount())
    const { calls } = await mount(true)
    expect(calls.some((c) => (c.body as { action?: string } | undefined)?.action === 'friends-publish')).toBe(false)
  })

  it('without an account it says how to get one, and asks the server nothing', async () => {
    const { host, calls } = await mount(false)
    expect(host.textContent).toContain('bir hesap aç')
    expect(calls).toEqual([])
  })

  it('allows renaming a friend with a nickname and shows "✎ İsim ver" when name is "Arkadaş"', async () => {
    const { host } = await mount(true, [card('BBBBBBBB', 'Arkadaş', 90, 120)])
    const renameBtn = host.querySelector('.friends-rename-btn') as HTMLButtonElement
    expect(renameBtn).toBeTruthy()
    expect(renameBtn.textContent).toBe('✎ İsim ver')
    expect(renameBtn.classList.contains('friends-rename-highlight')).toBe(true)

    // Click rename button to open inline edit form
    await act(async () => {
      renameBtn.click()
    })
    const input = host.querySelector('.friends-edit-input') as HTMLInputElement
    expect(input).toBeTruthy()

    // Type a custom nickname and submit
    const nativeSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')?.set
    await act(async () => {
      nativeSetter?.call(input, 'Merve')
      input.dispatchEvent(new Event('input', { bubbles: true }))
    })
    const submitBtn = host.querySelector('.friends-edit-inline button[type="submit"]') as HTMLButtonElement
    await act(async () => {
      submitBtn.click()
    })

    const names = () => [...host.querySelectorAll('.friends-name')].map((n) => n.textContent!.replace(/\d+$/, '').trim())
    expect(names()).toEqual(['Merve', 'Sen'])
    expect(JSON.parse(localStorage.getItem('diloloji:friend-nicknames') || '{}')).toEqual({ BBBBBBBB: 'Merve' })
  })

  it('shows what friends sent and takes a message away when it is dismissed', async () => {
    const { host, calls } = await mount(true, [card('BBBBBBBB', 'Veli', 90, 120)], [
      { id: 'm1', kind: 'cheer', from: { code: 'BBBBBBBB', name: 'Veli' }, at: '2026-10-15T09:00:00Z' },
      { id: 'm2', kind: 'nudge', from: { code: 'CCCCCCCC', name: 'Ece' }, at: '2026-10-15T08:00:00Z' },
    ])
    const items = [...host.querySelectorAll('.friends-inbox li')].map((li) => li.textContent)
    expect(items[0]).toContain('Veli seni tebrik etti')
    expect(items[1]).toContain('Ece seni dürttü')
    await act(async () => (host.querySelector('.friends-inbox button[aria-label="Tamam"]') as HTMLButtonElement).click())
    expect(host.querySelectorAll('.friends-inbox li')).toHaveLength(1)
    expect(calls.some((c) => (c.body as { action?: string; ids?: string[] } | undefined)?.action === 'friends-inbox-clear' && (c.body as { ids: string[] }).ids[0] === 'm1')).toBe(true)
  })

  it('a friend\'s name opens their page, where a cheer is sent; a nudge waits for a day they have not studied', async () => {
    const { host, calls } = await mount(true, [card('BBBBBBBB', 'Veli', 0, 20)])
    await act(async () => (host.querySelector('.friends-name-btn') as HTMLButtonElement).click())
    const sheet = host.querySelector('.friend-sheet')!
    expect(sheet.textContent).toContain('Veli')
    expect(sheet.textContent).toContain('bugün henüz çalışmadı')
    expect(sheet.querySelectorAll('.friend-bar')).toHaveLength(14)
    await act(async () => [...sheet.querySelectorAll('button')].find((b) => b.textContent?.includes('Tebrik et'))!.click())
    expect(calls.some((c) => (c.body as { action?: string; kind?: string; code?: string } | undefined)?.action === 'friends-send' && (c.body as { kind: string }).kind === 'cheer' && (c.body as { code: string }).code === 'BBBBBBBB')).toBe(true)
    expect(sheet.textContent).toContain('Tebrik gitti')
    // Esc closes the page.
    await act(async () => void window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })))
    expect(host.querySelector('.friend-sheet')).toBeNull()
  })

  it('no nudge for a friend who already studied today', async () => {
    const { host } = await mount(true, [card('BBBBBBBB', 'Veli', 90, 120)])
    await act(async () => (host.querySelector('.friends-name-btn') as HTMLButtonElement).click())
    const nudge = [...host.querySelectorAll('.friend-sheet button')].find((b) => b.textContent?.includes('Bugün çalıştı')) as HTMLButtonElement
    expect(nudge.disabled).toBe(true)
  })

  it('a word of the learner is found by its meaning and sent as a gift', async () => {
    const vocabulary = [{ id: 'w1', language: 'fr', lemma: 'maison', pos: 'noun', gender: 'f', senses: [{ gloss: 'ev', examples: [{ text: 'La maison est grande.', translation: 'Ev büyük.' }] }] }] as unknown as VocabularyEntry[]
    const { host, calls } = await mount(true, [card('BBBBBBBB', 'Veli', 0, 20)], [], { vocabulary, language: 'fr' })
    await act(async () => (host.querySelector('.friends-name-btn') as HTMLButtonElement).click())
    await act(async () => ([...host.querySelectorAll('.friend-sheet button')].find((b) => b.textContent?.includes('Kelime hediye et')) as HTMLButtonElement).click())
    const input = host.querySelector('.friend-give input') as HTMLInputElement
    const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')?.set
    await act(async () => {
      setter?.call(input, 'ev')
      input.dispatchEvent(new Event('input', { bubbles: true }))
    })
    await act(async () => (host.querySelector('.friend-pick') as HTMLButtonElement).click())
    const sent = calls.find((c) => (c.body as { action?: string } | undefined)?.action === 'friends-send')?.body as { kind: string; code: string; payload: { lemma: string; meaning: string; example: string } }
    expect(sent.kind).toBe('gift')
    expect(sent.code).toBe('BBBBBBBB')
    expect(sent.payload.meaning).toBe('ev')
    expect(sent.payload.example).toBe('La maison est grande.')
    expect(sent.payload.lemma).toContain('maison')
  })

  it('a gift word in the inbox is added to the words, then the message goes', async () => {
    await db.vocabulary.clear()
    const onChanged = vi.fn()
    const gift = { language: 'fr', lemma: 'la fenêtre', meaning: 'pencere', example: 'Ouvre la fenêtre.', exampleTranslation: 'Pencereyi aç.' }
    const { host, calls } = await mount(true, [card('BBBBBBBB', 'Veli', 90, 120)], [{ id: 'g1', kind: 'gift', from: { code: 'BBBBBBBB', name: 'Veli' }, at: '2026-10-15T09:00:00Z', gift }], { onChanged })
    expect(host.querySelector('.friends-inbox')!.textContent).toContain('Veli sana bir kelime gönderdi')
    await act(async () => ([...host.querySelectorAll('.friends-inbox button')].find((b) => b.textContent === 'Ekle') as HTMLButtonElement).click())
    await act(() => new Promise((r) => setTimeout(r, 30)))
    const words = await db.vocabulary.toArray()
    expect(words.map((w) => w.lemma)).toContain('fenêtre')
    expect(onChanged).toHaveBeenCalled()
    expect(calls.some((c) => (c.body as { action?: string; ids?: string[] } | undefined)?.action === 'friends-inbox-clear' && (c.body as { ids: string[] }).ids[0] === 'g1')).toBe(true)
    expect(host.querySelectorAll('.friends-inbox li')).toHaveLength(0)
  })

  it('a text in the inbox goes to the library with who sent it', async () => {
    const text = { language: 'fr', title: 'Le chat', body: 'Le chat dort sur le canapé. Il fait beau aujourd’hui et le soleil brille.' }
    const { host } = await mount(true, [card('BBBBBBBB', 'Veli', 90, 120)], [{ id: 't1', kind: 'text', from: { code: 'BBBBBBBB', name: 'Veli' }, at: '2026-10-15T09:00:00Z', text }])
    await act(async () => ([...host.querySelectorAll('.friends-inbox button')].find((b) => b.textContent === 'Kütüphaneme ekle') as HTMLButtonElement).click())
    await act(() => new Promise((r) => setTimeout(r, 30)))
    const library = await db.getLibrary('fr')
    const added = library.find((t) => t.title === 'Le chat')
    expect(added?.source).toContain('Veli')
    expect(host.querySelectorAll('.friends-inbox li')).toHaveLength(0)
  })
})
