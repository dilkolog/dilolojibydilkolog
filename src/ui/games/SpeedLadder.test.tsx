// @vitest-environment happy-dom
import 'fake-indexeddb/auto'
;(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true
import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { db } from '../../data/instance'

const spoken: { text: string; rate: number }[] = []
vi.mock('../sounds', () => ({ sfx: { correct: vi.fn(), wrong: vi.fn(), levelUp: vi.fn() } }))
vi.mock('../speech', () => ({
  speechPrefs: { rate: 1 },
  stopSpeaking: vi.fn(),
  speakAsync: vi.fn(async (text: string, _l: string, rate: number) => {
    spoken.push({ text, rate })
  }),
}))
const { SpeedLadder } = await import('./SpeedLadder')

let root: ReturnType<typeof createRoot> | undefined
const SENTENCES = [
  ['Le directeur présente le nouveau projet ce matin', 'Müdür yeni projeyi bu sabah tanıtıyor.'],
  ['Mes voisins préparent une grande fête dimanche prochain', 'Komşularım gelecek pazar büyük bir parti hazırlıyor.'],
  ['La bibliothèque ferme beaucoup plus tôt pendant les vacances', 'Kütüphane tatilde çok daha erken kapanıyor.'],
  ['Nous cherchons un appartement lumineux près du centre', 'Merkeze yakın aydınlık bir daire arıyoruz.'],
]
beforeEach(async () => {
  spoken.length = 0
  localStorage.clear()
  await db.meta.put({ key: 'translations', value: SENTENCES.map(([text, translation]) => ({ text, translation, from: 'fr', to: 'tr', at: '2026-10-10T10:00:00Z' })) })
})
afterEach(() => {
  act(() => root?.unmount())
  document.body.innerHTML = ''
})

const click = (el: Element | null | undefined) => act(async () => (el as HTMLElement).click())
const button = (host: HTMLElement, text: string) => [...host.querySelectorAll('button')].find((b) => b.textContent?.includes(text))

describe('speed ladder', () => {
  it('plays each sentence at three speeds, scores them and keeps the run', async () => {
    const host = document.createElement('div')
    document.body.append(host)
    root = createRoot(host)
    await act(async () => root!.render(<SpeedLadder language="fr" vocabulary={[]} onExit={() => {}} />))
    await vi.waitFor(() => expect(button(host, 'Merdivene çık')).toBeTruthy())
    await click(button(host, 'Merdivene çık'))
    // The first question is read at the slow speed straight away.
    await vi.waitFor(() => expect(spoken.length).toBe(1))
    expect(spoken[0].rate).toBe(0.75)
    expect(host.textContent).toContain('1 / 12')
    // Answering the right word is marked and shows the sentence.
    const options = [...host.querySelectorAll('.option')]
    expect(options).toHaveLength(4)
    await click(options[0])
    expect(host.querySelector('.is-correct, .is-wrong')).toBeTruthy()
    expect(host.textContent).toContain('Devam')
    // Go through the rest, always taking the first option.
    for (let i = 1; i < 12; i++) {
      await click(button(host, i === 0 ? 'Devam' : host.textContent?.includes('Bitir') ? 'Bitir' : 'Devam'))
      await click(host.querySelector('.option'))
    }
    await click(button(host, 'Bitir'))
    expect(host.textContent).toContain('Hız merdiveni')
    expect(host.textContent).toContain('0,75×')
    expect(host.textContent).toContain('1,25×')
    expect(JSON.parse(localStorage.getItem('diloloji:ladder:fr') ?? '[]')).toHaveLength(1)
    // Three rates were heard in order: slow, as is, fast.
    expect([...new Set(spoken.map((s) => s.rate))].sort()).toEqual([0.75, 1, 1.25])
  })

  it('explains when there are too few sentences', async () => {
    await db.meta.put({ key: 'translations', value: [] })
    const host = document.createElement('div')
    document.body.append(host)
    root = createRoot(host)
    await act(async () => root!.render(<SpeedLadder language="fr" vocabulary={[]} onExit={() => {}} />))
    await vi.waitFor(() => expect(host.textContent).toContain('Henüz yeterli cümle yok'))
  })
})
