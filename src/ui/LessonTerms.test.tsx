// @vitest-environment happy-dom
;(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true
import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { LessonTerms } from './LessonTerms'

const speak = vi.hoisted(() => vi.fn())
vi.mock('./speech', () => ({ speak }))

let root: ReturnType<typeof createRoot> | undefined
afterEach(() => {
  act(() => root?.unmount())
  document.body.innerHTML = ''
})

const terms = [
  { term: 'article défini', tr: 'belirli artikel', explanation: 'Bilinen şeyi gösterir.', example: { text: 'Le livre est ici.', tr: 'Kitap burada.' } },
  { term: 'accord', tr: 'uyum', explanation: 'Sözcükler birbirine uyar.' },
]

function mount(list = terms) {
  const host = document.createElement('div')
  document.body.append(host)
  root = createRoot(host)
  act(() => root!.render(<LessonTerms terms={list} language="fr" />))
  return host
}

describe('LessonTerms', () => {
  it('shows nothing when the lesson uses no term', () => {
    expect(mount([]).innerHTML).toBe('')
  })

  it('opens one term at a time with its Turkish name, meaning and example, and closes it again', () => {
    const host = mount()
    const chips = [...host.querySelectorAll<HTMLButtonElement>('.chip')]
    expect(chips.map((c) => c.textContent)).toEqual(['article défini', 'accord'])
    act(() => chips[0]!.click())
    expect(chips[0]!.getAttribute('aria-expanded')).toBe('true')
    const card = host.querySelector('.lesson-term-card')!
    expect(card.textContent).toContain('belirli artikel')
    expect(card.textContent).toContain('Bilinen şeyi gösterir.')
    expect(card.textContent).toContain('Le livre est ici.')
    act(() => card.querySelector<HTMLButtonElement>('button')!.click())
    expect(speak).toHaveBeenCalledWith('Le livre est ici.', 'fr')
    act(() => chips[1]!.click())
    expect(chips[0]!.getAttribute('aria-expanded')).toBe('false')
    expect(host.querySelector('.lesson-term-card')!.textContent).toContain('uyum')
    act(() => chips[1]!.click())
    expect(host.querySelector('.lesson-term-card')).toBeNull()
  })
})
