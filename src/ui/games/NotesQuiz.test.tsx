// @vitest-environment happy-dom
;(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true
import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, describe, expect, it, vi } from 'vitest'

vi.mock('../sounds', () => ({ sfx: { correct: vi.fn(), wrong: vi.fn(), levelUp: vi.fn(), near: vi.fn() } }))
const notesQuiz = vi.fn()
vi.mock('../../ai', async (orig) => ({ ...(await orig<typeof import('../../ai')>()), notesQuiz: (...a: unknown[]) => notesQuiz(...a) }))
vi.mock('../aiContext', () => ({ useAi: () => ({ apiKey: 'sk-test', setApiKey: async () => {} }) }))
const { NotesQuiz } = await import('./NotesQuiz')

let root: ReturnType<typeof createRoot> | undefined
afterEach(() => {
  act(() => root?.unmount())
  document.body.innerHTML = ''
  notesQuiz.mockReset()
})

const click = (el: Element | null | undefined) => act(async () => (el as HTMLElement).click())
const byText = (host: HTMLElement, text: string) => [...host.querySelectorAll('button')].find((b) => b.textContent?.includes(text))
const type = (el: HTMLTextAreaElement, value: string) =>
  act(async () => {
    Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value')!.set!.call(el, value)
    el.dispatchEvent(new Event('input', { bubbles: true }))
  })

describe('NotesQuiz', () => {
  it('turns pasted notes into questions, explains each answer and ends with the misses', async () => {
    notesQuiz.mockResolvedValue([
      { question: 'Hangisi doğru?', options: ['je suis', 'je es', 'je sont', 'je être'], answer: 0, explanation: 'être: je suis.' },
      { question: 'Ev ne demek?', options: ['maison', 'chat', 'livre', 'eau'], answer: 0, explanation: 'maison = ev.' },
    ])
    const host = document.createElement('div')
    document.body.append(host)
    root = createRoot(host)
    await act(async () => root!.render(<NotesQuiz language="fr" onExit={() => {}} />))
    expect(byText(host, 'Sınavı hazırla')!.hasAttribute('disabled')).toBe(true)
    await type(host.querySelector('textarea')!, 'être: je suis, tu es, il est. avoir: j’ai. Une note assez uzun yazalım.')
    await click(byText(host, '5 soru'))
    await click(byText(host, 'Sınavı hazırla'))
    expect(notesQuiz).toHaveBeenCalledWith('sk-test', expect.objectContaining({ language: 'fr', count: 5 }))
    // First question: answer right, whatever the shuffled position.
    const rightOf = (text: string) => [...host.querySelectorAll<HTMLButtonElement>('.option')].find((o) => o.lastElementChild!.textContent === text)!
    await click(rightOf('je suis'))
    expect(host.querySelector('[role=status]')!.textContent).toContain('Doğru. être: je suis.')
    await click(byText(host, 'Sonraki'))
    // Second: wrong on purpose.
    await click([...host.querySelectorAll<HTMLButtonElement>('.option')].find((o) => o.lastElementChild!.textContent === 'chat'))
    expect(host.querySelector('[role=status]')!.textContent).toContain('Yanlış. maison = ev.')
    await click(byText(host, 'Sonucu gör'))
    expect(host.textContent).toContain('1 / 2')
    expect(host.textContent).toContain('Ev ne demek? — maison')
  })

  it('says so when no questions could be made', async () => {
    notesQuiz.mockResolvedValue([])
    const host = document.createElement('div')
    document.body.append(host)
    root = createRoot(host)
    await act(async () => root!.render(<NotesQuiz language="fr" onExit={() => {}} />))
    await type(host.querySelector('textarea')!, 'x'.repeat(60))
    await click(byText(host, 'Sınavı hazırla'))
    expect(host.querySelector('[role=alert]')!.textContent).toContain('hazırlanamadı')
  })
})
