// @vitest-environment happy-dom
;(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true
import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { LessonSteps } from './LessonSteps'

let root: ReturnType<typeof createRoot> | undefined
afterEach(() => {
  act(() => root?.unmount())
  document.body.innerHTML = ''
})

const steps = [
  { id: 'lesson-learn', label: 'Öğren' },
  { id: 'lesson-see', label: 'Gör' },
  { id: 'lesson-check', label: 'Sına' },
]

function mount() {
  for (const s of steps) {
    const el = document.createElement('section')
    el.id = s.id
    el.scrollIntoView = vi.fn()
    document.body.append(el)
  }
  const host = document.createElement('div')
  document.body.append(host)
  root = createRoot(host)
  act(() => root!.render(<LessonSteps steps={steps} />))
  return host
}

describe('LessonSteps', () => {
  it('lists the steps in order, the first one current', () => {
    const host = mount()
    const buttons = [...host.querySelectorAll('button')]
    expect(buttons.map((b) => b.textContent)).toEqual(['1Öğren', '2Gör', '3Sına'])
    expect(buttons[0]!.getAttribute('aria-current')).toBe('step')
    expect(buttons[1]!.hasAttribute('aria-current')).toBe(false)
  })

  it('takes the learner to a step and marks it current', () => {
    const host = mount()
    const see = host.querySelectorAll('button')[2]!
    act(() => see.click())
    expect(document.getElementById('lesson-check')!.scrollIntoView).toHaveBeenCalled()
    expect(see.getAttribute('aria-current')).toBe('step')
  })
})
