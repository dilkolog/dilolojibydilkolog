// @vitest-environment happy-dom
;(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true
import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { TenseInfoButton } from './TenseLessonSheet'

describe('TenseInfoButton', () => {
  let container: HTMLDivElement
  let root: ReturnType<typeof createRoot>
  beforeEach(() => {
    container = document.createElement('div')
    document.body.appendChild(container)
    root = createRoot(container)
  })
  afterEach(() => {
    act(() => root.unmount())
    container.remove()
  })

  const open = (language: 'fr' | 'es', tense: 'passe-compose' | 'perfecto') => {
    act(() => root.render(<TenseInfoButton language={language} tense={tense} />))
    const btn = container.querySelector<HTMLButtonElement>('.lab-tense-info')!
    btn.focus()
    act(() => btn.click())
    return btn
  }

  it('opens a lesson with its sections for a French tense', () => {
    open('fr', 'passe-compose')
    const dialog = document.querySelector('[role="dialog"]')!
    expect(dialog).toBeTruthy()
    for (const h of ['Ne zaman', 'Nasıl kurulur', 'Örnekler', 'Dikkat']) expect(dialog.textContent).toContain(h)
  })

  it('opens a lesson for a Spanish tense too', () => {
    open('es', 'perfecto')
    expect(document.querySelector('[role="dialog"]')).toBeTruthy()
  })

  it('closes with Escape and hands the focus back to the button', () => {
    const btn = open('fr', 'passe-compose')
    act(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
    })
    expect(document.querySelector('[role="dialog"]')).toBeNull()
    expect(document.activeElement).toBe(btn)
  })
})
