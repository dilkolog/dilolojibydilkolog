// @vitest-environment happy-dom
import 'fake-indexeddb/auto'
;(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true
import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { PodcastRequest, PodcastScript } from '../../ai'
import { newWordState, processAttempt } from '../../engine/review'
import { createScheduler } from '../../engine/scheduler'
import type { UserWordState, VocabularyEntry } from '../../engine/types'
import { createEntry } from '../../data/wordInput'
import { AiContext } from '../aiContext'

const requests: PodcastRequest[] = []
const SCRIPT: PodcastScript = {
  title: 'Au marché',
  lines: [
    { speaker: 'A', text: 'Bonjour, je voudrais des pommes.', translation: 'Günaydın, elma istiyorum.' },
    { speaker: 'B', text: 'Bien sûr, combien ?', translation: 'Tabii, kaç tane?' },
  ],
}
vi.mock('../../ai', async (orig) => ({
  ...(await orig<typeof import('../../ai')>()),
  miniPodcast: async (_key: string, req: PodcastRequest) => {
    requests.push(req)
    return SCRIPT
  },
}))
const spoken: { text: string; second: boolean }[] = []
vi.mock('../speech', () => ({
  speakAsync: async (text: string, _l: string, _r: number, second = false) => void spoken.push({ text, second }),
  speechPrefs: { rate: 0.9 },
  stopSpeaking: () => {},
}))
const { MiniPodcast } = await import('./MiniPodcast')

const scheduler = createScheduler({ fuzz: false })
const NOW = new Date()
const learned = (word: string, meaning: string): { entry: VocabularyEntry; state: UserWordState } => {
  const entry = createEntry({ word, meaning }, 'fr', NOW)
  const state = processAttempt(newWordState(entry, NOW), { exerciseType: 'mc_meaning', verdict: 'correct', responseMs: 3000, hintsUsed: 0, maxHints: 0, at: NOW }, [], scheduler, () => 'x').state
  return { entry, state }
}
const WORDS = [learned('pomme', 'elma'), learned('marché', 'pazar')]

let root: ReturnType<typeof createRoot> | undefined
beforeEach(() => {
  requests.length = 0
  spoken.length = 0
  localStorage.clear()
})
afterEach(() => {
  act(() => root?.unmount())
  document.body.innerHTML = ''
})

async function mount(apiKey: string | null) {
  const host = document.createElement('div')
  document.body.append(host)
  root = createRoot(host)
  await act(async () =>
    root!.render(
      <AiContext.Provider value={{ apiKey, setApiKey: async () => {} }}>
        <MiniPodcast language="fr" vocabulary={WORDS.map((w) => w.entry)} states={WORDS.map((w) => w.state)} onChanged={() => {}} onExit={() => {}} />
      </AiContext.Provider>,
    ),
  )
  return host
}
const button = (host: HTMLElement, text: string) => [...host.querySelectorAll('button')].find((b) => b.textContent?.includes(text))!
const wait = () => act(async () => void (await new Promise((r) => setTimeout(r, 30))))

describe('MiniPodcast', () => {
  it('needs a key to write one', async () => {
    const host = await mount(null)
    expect(host.textContent).toContain('anahtar')
    expect(button(host, 'Podcast yaz').disabled).toBe(true)
  })

  it('writes a talk around the weak words, keeps it, shows the Turkish and reads it with two voices', async () => {
    const host = await mount('key')
    await act(async () => button(host, 'Podcast yaz').click())
    await wait()
    expect(requests[0].language).toBe('fr')
    expect(requests[0].words.map((w) => w.lemma).sort()).toEqual(['marché', 'pomme'])
    expect(host.textContent).toContain('Au marché')
    expect(host.textContent).toContain('Günaydın, elma istiyorum.')
    expect(JSON.parse(localStorage.getItem('diloloji:podcast:fr')!).script.lines).toHaveLength(2)
    // The Turkish can be hidden.
    await act(async () => button(host, 'Türkçesi').click())
    expect(host.textContent).not.toContain('Günaydın, elma istiyorum.')
    await act(async () => button(host, 'Dinle').click())
    await act(async () => void (await new Promise((r) => setTimeout(r, 1700))))
    expect(spoken).toEqual([
      { text: 'Bonjour, je voudrais des pommes.', second: false },
      { text: 'Bien sûr, combien ?', second: true },
    ])
    expect(host.textContent).toContain('Baştan dinle')
  })

  it('shows the last one from the device without asking again', async () => {
    localStorage.setItem('diloloji:podcast:fr', JSON.stringify({ day: '2026-10-01', script: SCRIPT, words: ['pomme'] }))
    const host = await mount('key')
    expect(host.textContent).toContain('Au marché')
    expect(requests).toHaveLength(0)
  })
})
