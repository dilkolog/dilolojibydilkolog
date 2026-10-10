// @vitest-environment happy-dom
import 'fake-indexeddb/auto'
;(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true
import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { db } from '../data/instance'
import { createEntry } from '../data/wordInput'

const enabled = vi.fn(() => true)
vi.mock('./pronunciation', () => ({ azureEnabled: () => enabled() }))
vi.mock('./speech', () => ({ playWord: vi.fn() }))
// The recorder needs a microphone: a button stands in, scoring 80.
vi.mock('./PronunciationCheck', () => ({
  PronunciationCheck: ({ onScore }: { onScore?: (n: number) => void }) => <button onClick={() => onScore?.(80)}>say</button>,
}))
const { PronPractice } = await import('./PronPractice')

let root: ReturnType<typeof createRoot> | undefined
beforeEach(async () => {
  await db.meta.delete('pronScores')
  enabled.mockReturnValue(true)
})
afterEach(() => {
  act(() => root?.unmount())
  document.body.innerHTML = ''
})

const wait = () => act(async () => void (await new Promise((r) => setTimeout(r, 60))))
const mount = async (vocabulary: ReturnType<typeof createEntry>[]) => {
  const host = document.createElement('div')
  document.body.append(host)
  root = createRoot(host)
  await act(async () => root!.render(<PronPractice language="fr" vocabulary={vocabulary} onExit={() => {}} />))
  await wait()
  return host
}

describe('PronPractice', () => {
  it('asks for the Azure key when there is none', async () => {
    enabled.mockReturnValue(false)
    expect((await mount([])).textContent).toContain('Azure anahtarını')
  })

  it('takes the weak words one by one and records the new score', async () => {
    const rue = createEntry({ word: 'rue', meaning: 'sokak' }, 'fr', new Date())
    const chat = createEntry({ word: 'chat', meaning: 'kedi' }, 'fr', new Date())
    await db.addPronScore(rue.id, 40)
    await db.addPronScore(chat.id, 95)
    const host = await mount([rue, chat])
    expect(host.textContent).toContain('1 / 1')
    expect(host.textContent).toContain('rue')
    expect(host.textContent).not.toContain('chat')
    await act(async () => host.querySelector<HTMLButtonElement>('button:not(.link)')!.click())
    await wait()
    expect((await db.getPronScores(rue.id)).map((s) => s.score)).toEqual([40, 80])
    expect(host.textContent).toContain('yeterince yakın')
  })

  it('says so when no word is weak', async () => {
    const chat = createEntry({ word: 'chat', meaning: 'kedi' }, 'fr', new Date())
    await db.addPronScore(chat.id, 95)
    expect((await mount([chat])).textContent).toContain('Zayıf telaffuzlu kelime yok')
  })
})
