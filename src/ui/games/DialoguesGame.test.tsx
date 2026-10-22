// @vitest-environment happy-dom
;(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true
import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { Dialogue } from '../../engine/dialogues'

vi.mock('../sounds', () => ({ sfx: { correct: vi.fn(), wrong: vi.fn(), levelUp: vi.fn(), near: vi.fn() } }))
const spoken: string[] = []
vi.mock('../speech', () => ({ canSpeak: () => true, speak: (text: string) => void spoken.push(text) }))
const turn = (say: string, answer: 0 | 1 | 2): Dialogue['turns'][number] => ({
  say,
  tr: `TR ${say}`,
  options: ['Option A', 'Option B', 'Option C'],
  answer,
  why: 'Because.',
  replyTr: 'Cevap.',
})
vi.mock('../../data/dialogues', () => ({
  dialogues: [
    { id: 'en-cafe', language: 'en', level: 'A1', title: 'Kafede', scene: 'Bir kafedesin.', turns: [turn('Hello! What can I get you?', 1), turn('Anything else?', 0)] },
    { id: 'en-hotel', language: 'en', level: 'B1', title: 'Otelde', scene: 'Bir oteldesin.', turns: [turn('Good evening.', 2)] },
  ],
}))
const { DialoguesGame } = await import('./DialoguesGame')

let root: ReturnType<typeof createRoot> | undefined
beforeEach(() => {
  spoken.length = 0
  localStorage.clear()
})
afterEach(() => {
  act(() => root?.unmount())
  document.body.innerHTML = ''
})
const click = (el: Element | null | undefined) => act(async () => (el as HTMLElement).click())
const byText = (host: HTMLElement, text: string) => [...host.querySelectorAll('button')].find((b) => b.textContent?.includes(text))

async function mount() {
  const host = document.createElement('div')
  document.body.append(host)
  root = createRoot(host)
  await act(async () => root!.render(<DialoguesGame language="en" onExit={() => {}} />))
  return host
}

describe('DialoguesGame', () => {
  it('a dialogue turn by turn: the line is heard, a reply chosen, the why shown; the best result is kept', async () => {
    const host = await mount()
    expect(host.querySelectorAll('.examtask-item')).toHaveLength(2)
    await click(byText(host, 'Kafede'))
    expect(spoken).toEqual(['Hello! What can I get you?'])
    // The Turkish stays hidden until asked for or answered.
    expect(host.textContent).not.toContain('TR Hello')
    await click(host.querySelectorAll('.options .option')[0])
    expect(host.querySelector('[role="status"]')!.textContent).toContain('Bu cevap uymaz')
    expect(host.textContent).toContain('TR Hello')
    expect(host.querySelector('.dialogue-you')!.textContent).toContain('Option B')
    await click(byText(host, 'Devam'))
    expect(spoken.at(-1)).toBe('Anything else?')
    await click(host.querySelectorAll('.options .option')[0])
    expect(host.querySelector('[role="status"]')!.textContent).toContain('Uygun cevap')
    await click(byText(host, 'Sonucu gör'))
    expect(host.textContent).toContain('1 / 2 uygun cevap')
    expect(JSON.parse(localStorage.getItem('diloloji:dialogues:en')!)).toEqual({ 'en-cafe': 0.5 })
  })

  it('filters by level', async () => {
    const host = await mount()
    await click(byText(host, 'B1'))
    expect(host.querySelectorAll('.examtask-item')).toHaveLength(1)
    expect(host.textContent).toContain('Otelde')
  })
})
