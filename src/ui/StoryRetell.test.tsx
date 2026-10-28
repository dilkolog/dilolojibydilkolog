// @vitest-environment happy-dom
import 'fake-indexeddb/auto'
;(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true
import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { db } from '../data/instance'
import { DEFAULT_SETTINGS, type StoryEpisode } from '../data/db'
import { createEntry } from '../data/wordInput'
import { newWordState } from '../engine/review'
import type { TargetLanguage, UserWordState, VocabularyEntry } from '../engine/types'
import { StoryScreen } from './Story'

vi.mock('./aiContext', () => ({
  useAi: () => ({ apiKey: 'sk-test-key', setApiKey: async () => {}, needsApproval: false }),
}))

const mockEvaluateRetelling = vi.fn()
vi.mock('../ai', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../ai')>()
  return {
    ...actual,
    evaluateRetelling: (...args: unknown[]) => mockEvaluateRetelling(...args),
  }
})

let root: ReturnType<typeof createRoot> | undefined

const dummyWord: VocabularyEntry = {
  ...createEntry({ word: 'la maison', meaning: 'ev', partOfSpeech: 'noun' }, 'fr', new Date()),
  id: 'word-1',
}

const dummyState: UserWordState = newWordState(dummyWord, new Date())

const completedEpisode: StoryEpisode = {
  id: 'ep-1',
  language: 'fr',
  number: 1,
  title: 'La petite maison',
  recap: 'İlk bölüm.',
  wordIds: ['word-1'],
  paragraphs: [
    {
      text: 'Voici {{la maison}} bleue.',
      translation: 'İşte mavi ev.',
    },
  ],
  createdAt: new Date(),
  completedAt: new Date(),
  answers: { 0: true },
}

beforeEach(async () => {
  mockEvaluateRetelling.mockReset()
  await db.stories.clear()
  await db.stories.add(completedEpisode)
})

afterEach(() => {
  act(() => root?.unmount())
  document.body.innerHTML = ''
})

const wait = () => act(async () => void (await new Promise((r) => setTimeout(r, 60))))

async function mount(lang: TargetLanguage = 'fr') {
  const host = document.createElement('div')
  document.body.append(host)
  root = createRoot(host)
  await act(async () => {
    root!.render(
      <StoryScreen
        language={lang}
        settings={DEFAULT_SETTINGS}
        vocabulary={[dummyWord]}
        states={[dummyState]}
        mistakes={[]}
        onSettings={() => {}}
        onChanged={() => {}}
        onOpenSettings={() => {}}
      />,
    )
  })
  await wait()
  return host
}

describe('Story retelling UI flow', () => {
  it('shows the Retell section on a completed episode when apiKey exists', async () => {
    const host = await mount()
    expect(host.textContent).toContain('Kendi cümlelerinle anlat')
    expect(host.textContent).toContain('En az 5 kelime.')
    const textarea = host.querySelector<HTMLTextAreaElement>('textarea')
    expect(textarea).not.toBeNull()
  })

  it('keeps evaluate button disabled until at least 5 words are typed', async () => {
    const host = await mount()
    const textarea = host.querySelector<HTMLTextAreaElement>('textarea')!
    const button = [...host.querySelectorAll<HTMLButtonElement>('button')].find(
      (b) => b.textContent?.includes('Değerlendir'),
    )!

    expect(button.disabled).toBe(true)

    await act(async () => {
      const setter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value')?.set
      setter?.call(textarea, 'Un deux trois')
      textarea.dispatchEvent(new Event('input', { bubbles: true }))
      textarea.dispatchEvent(new Event('change', { bubbles: true }))
    })

    expect(button.disabled).toBe(true)

    await act(async () => {
      const setter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value')?.set
      setter?.call(textarea, 'Ceci est une très belle maison.')
      textarea.dispatchEvent(new Event('input', { bubbles: true }))
      textarea.dispatchEvent(new Event('change', { bubbles: true }))
    })

    expect(button.disabled).toBe(false)
  })

  it('submits retelling, displays AI feedback, corrected text, and word evaluation pills', async () => {
    mockEvaluateRetelling.mockResolvedValueOnce({
      feedback: 'Harika bir özet! Hedef kelime doğru şekilde kullanılmış.',
      corrected: 'Ceci est une très belle maison.',
      words: [{ lemma: 'la maison', used: true, correct: true }],
    })

    const host = await mount()
    const textarea = host.querySelector<HTMLTextAreaElement>('textarea')!

    await act(async () => {
      const setter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value')?.set
      setter?.call(textarea, 'Ceci est une tres belle maison.')
      textarea.dispatchEvent(new Event('input', { bubbles: true }))
      textarea.dispatchEvent(new Event('change', { bubbles: true }))
    })

    const button = [...host.querySelectorAll<HTMLButtonElement>('button')].find(
      (b) => b.textContent?.includes('Değerlendir'),
    )!

    await act(async () => {
      button.click()
    })
    await wait()

    expect(mockEvaluateRetelling).toHaveBeenCalledTimes(1)
    expect(host.textContent).toContain('Harika bir özet!')
    expect(host.textContent).toContain('Düzeltilmiş hali:')
    expect(host.textContent).toContain('Ceci est une très belle maison.')
    expect(host.querySelector('.pill.stage-5')?.textContent).toContain('la maison')
  })
})
