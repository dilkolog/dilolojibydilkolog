// @vitest-environment happy-dom
import 'fake-indexeddb/auto'
;(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true
import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { grammarExercises } from '../../data/grammar'
import { DUEL_INBOX, decodeDuel, encodeDuel, pickDuelIds, type DuelChallenge } from '../../engine/duel'
import { createRng } from '../../engine/rng'
import { DuelGame } from './DuelGame'

let root: ReturnType<typeof createRoot> | undefined
beforeEach(() => {
  localStorage.clear()
  sessionStorage.clear()
})
afterEach(() => {
  act(() => root?.unmount())
  document.body.innerHTML = ''
})

const wait = () => act(async () => void (await new Promise((r) => setTimeout(r, 20))))
async function mount() {
  const host = document.createElement('div')
  document.body.append(host)
  root = createRoot(host)
  await act(async () => root!.render(<DuelGame language="fr" onExit={() => {}} />))
  return host
}
const button = (host: HTMLElement, text: string) => [...host.querySelectorAll('button')].find((b) => b.textContent?.includes(text))!
/** Plays every question, always taking the first option. */
async function playAll(host: HTMLElement) {
  for (let i = 0; i < 12 && host.querySelector('.options'); i++) {
    await act(async () => (host.querySelector('.options .option') as HTMLButtonElement).click())
    await act(async () => (host.querySelector('.grammar-feedback .btn') as HTMLButtonElement).click())
  }
  await wait()
}

describe('DuelGame', () => {
  it('starts a duel, plays ten questions and makes a link that carries the score', async () => {
    const host = await mount()
    const input = host.querySelector<HTMLInputElement>('input[aria-label="Adın"]')!
    await act(async () => {
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(input, 'Ali')
      input.dispatchEvent(new Event('input', { bubbles: true }))
    })
    await act(async () => button(host, 'düellosu başlat').click())
    expect(host.querySelector('.game-timer')?.textContent).toBe('1 / 10')
    await playAll(host)
    expect(host.textContent).toContain('Düello hazır')
    const link = host.querySelector('.duel-link')!.textContent!
    const sent = decodeDuel(link)!
    expect(sent.language).toBe('fr')
    expect(sent.ids).toHaveLength(10)
    expect(sent.from.name).toBe('Ali')
    expect(sent.from.score).toBeGreaterThanOrEqual(0)
    expect(localStorage.getItem('diloloji:duel-name')).toBe('Ali')
  })

  it('opens a duel from the inbox, plays it and shows both results with a reply link', async () => {
    const ids = pickDuelIds(grammarExercises('fr'), createRng(3))
    const challenge: DuelChallenge = { language: 'fr', ids, from: { name: 'Şule', score: 10, ms: 30_000 } }
    sessionStorage.setItem(DUEL_INBOX, encodeDuel(challenge))
    const host = await mount()
    expect(host.textContent).toContain('Şule, Fransızca düellosuna seni çağırıyor')
    expect(sessionStorage.getItem(DUEL_INBOX)).toBeNull()
    await act(async () => button(host, 'Düelloya başla').click())
    await playAll(host)
    // Şule got all ten: she wins whatever the first-option player did.
    expect(host.querySelector('h1')?.textContent).toContain('Şule kazandı')
    expect(host.querySelectorAll('.duel-side')).toHaveLength(2)
    const reply = decodeDuel(host.querySelector('.duel-link')!.textContent!)!
    expect(reply.from.name).toBe('Şule')
    expect(reply.reply?.name).toBe('Ben')
  })

  it('a reply opened by the challenger shows the two results at once', async () => {
    const ids = pickDuelIds(grammarExercises('fr'), createRng(3))
    const c: DuelChallenge = { language: 'fr', ids, from: { name: 'Ali', score: 6, ms: 40_000 }, reply: { name: 'Şule', score: 8, ms: 50_000 } }
    const host = await mount()
    const area = host.querySelector<HTMLTextAreaElement>('textarea')!
    await act(async () => {
      Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value')!.set!.call(area, `https://x.test/?duel=${encodeDuel(c)}`)
      area.dispatchEvent(new Event('input', { bubbles: true }))
    })
    await act(async () => button(host, 'Aç').click())
    expect(host.querySelector('h1')?.textContent).toContain('Şule kazandı')
    expect(host.textContent).toContain('Rövanş başlat')
    expect(host.querySelector('.duel-link')).toBeNull()
  })

  it('says so when what was pasted is not a duel', async () => {
    const host = await mount()
    const area = host.querySelector<HTMLTextAreaElement>('textarea')!
    await act(async () => {
      Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value')!.set!.call(area, 'merhaba')
      area.dispatchEvent(new Event('input', { bubbles: true }))
    })
    await act(async () => button(host, 'Aç').click())
    expect(host.querySelector('[role=alert]')?.textContent).toContain('düello bağlantısı')
  })

  it('sends the link to the clipboard when there is no share sheet', async () => {
    const write = vi.fn(async () => {})
    Object.defineProperty(navigator, 'clipboard', { value: { writeText: write }, configurable: true })
    Object.defineProperty(navigator, 'share', { value: undefined, configurable: true })
    const host = await mount()
    await act(async () => button(host, 'düellosu başlat').click())
    await playAll(host)
    await act(async () => button(host, 'Arkadaşına gönder').click())
    expect(write).toHaveBeenCalledTimes(1)
    expect((write.mock.calls[0] as unknown as [string])[0]).toContain('?duel=')
  })

  it('a duel can be narrowed to a topic and a level', async () => {
    const host = await mount()
    const select = host.querySelector<HTMLSelectElement>('select[aria-label="Düello konusu"]')!
    const topic = [...select.options].map((o) => o.value).find((v) => v)!
    await act(async () => {
      Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'value')!.set!.call(select, topic)
      select.dispatchEvent(new Event('change', { bubbles: true }))
    })
    await act(async () => button(host, 'düellosu başlat').click())
    await playAll(host)
    const sent = decodeDuel(host.querySelector('.duel-link')!.textContent!)!
    expect(sent.ids.length).toBeGreaterThanOrEqual(5)
    const topicOf = new Map(grammarExercises('fr').map((e) => [e.id, e.topic]))
    expect(sent.ids.every((id) => topicOf.get(id) === topic)).toBe(true)
  })

  it('remembers a duel played against a friend, once, and shows the tally in the lobby', async () => {
    const ids = pickDuelIds(grammarExercises('fr'), createRng(3))
    const challenge: DuelChallenge = { language: 'fr', ids, from: { name: 'Şule', score: 0, ms: 1000 } }
    sessionStorage.setItem(DUEL_INBOX, encodeDuel(challenge))
    const host = await mount()
    await act(async () => button(host, 'Düelloya başla').click())
    await playAll(host)
    const stored = JSON.parse(localStorage.getItem('diloloji:duel-history')!)
    expect(stored).toHaveLength(1)
    expect(stored[0]).toMatchObject({ opponent: 'Şule', theirs: 0 })
    await act(async () => button(host, 'Yeni düello').click())
    expect(host.querySelector('.duel-history')?.textContent).toContain('Şule')
    expect(host.querySelector('.duel-history')?.textContent).toMatch(/\d+ galibiyet/)
  })
})

