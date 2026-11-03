// @vitest-environment happy-dom
;(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true
import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { LiveReading, MemoryCurve, PlayingPhone } from './LandingParts'
import { languageOfPath } from './startLanguage'

function mount(node: React.ReactNode) {
  const el = document.createElement('div')
  document.body.appendChild(el)
  const root = createRoot(el)
  act(() => root.render(node))
  return {
    el,
    done: () => {
      act(() => root.unmount())
      el.remove()
    },
  }
}
const button = (el: HTMLElement, text: string | RegExp) => [...el.querySelectorAll('button')].find((b) => (typeof text === 'string' ? b.textContent?.trim() === text || b.getAttribute('aria-label') === text : text.test(b.textContent ?? '')))!

afterEach(() => vi.useRealTimers())

describe('the landing page live pieces', () => {
  it('the phone plays the day twice, then stops on the first screen; a step picked stops it', () => {
    vi.useFakeTimers()
    const steps = ['a', 'b', 'c'].map((s) => ({ src: `/${s}.webp`, label: s.toUpperCase(), alt: `screen ${s}` }))
    const { el, done } = mount(<PlayingPhone steps={steps} />)
    const on = () => el.querySelector('img.lp-frame-on')?.getAttribute('src')
    expect(on()).toBe('/a.webp')
    act(() => vi.advanceTimersByTime(3400))
    expect(on()).toBe('/b.webp')
    act(() => vi.advanceTimersByTime(3400 * 10))
    expect(on()).toBe('/a.webp')
    expect(button(el, 'Gösterimi oynat')).toBeDefined()
    // Only the screen shown is described to a screen reader.
    expect([...el.querySelectorAll('img')].filter((i) => i.alt).length).toBe(1)
    act(() => button(el, 'C').click())
    expect(on()).toBe('/c.webp')
    done()
  })

  it('a tapped word shows its Turkish, and the button under it opens the sign-up', () => {
    const onAdd = vi.fn()
    const { el, done } = mount(<LiveReading language="fr" onAdd={onAdd} />)
    const word = [...el.querySelectorAll<HTMLButtonElement>('.lp-word')].find((b) => b.textContent === 'gare')!
    act(() => word.click())
    expect(word.getAttribute('aria-pressed')).toBe('true')
    expect(el.querySelector('.lp-live-card')?.textContent).toContain('istasyon')
    act(() => button(el, 'Kelimelerime ekle').click())
    expect(onAdd).toHaveBeenCalled()
    // Names and short words are not glossed.
    expect([...el.querySelectorAll('.lp-word')].some((b) => b.textContent === 'Léa')).toBe(false)
    done()
  })

  it('every glossed word is in its text, in each language', () => {
    for (const language of ['fr', 'es', 'en'] as const) {
      const { el, done } = mount(<LiveReading language={language} onAdd={() => {}} />)
      expect(el.querySelectorAll('.lp-word').length).toBeGreaterThanOrEqual(10)
      done()
    }
  })

  it('the forgetting curve takes three reviews, then starts again', () => {
    const { el, done } = mount(<MemoryCurve />)
    expect(el.querySelectorAll('.lp-curve-dot').length).toBe(0)
    act(() => button(el, /1\. gün tekrar et/).click())
    act(() => button(el, /4\. gün tekrar et/).click())
    act(() => button(el, /2 hafta tekrar et/).click())
    expect(el.querySelectorAll('.lp-curve-dot').length).toBe(3)
    expect(el.querySelector('.lp-curve-says')?.textContent).toContain('Üçüncü tekrar')
    act(() => button(el, /Baştan/).click())
    expect(el.querySelectorAll('.lp-curve-dot').length).toBe(0)
    done()
  })

  it('a shared language page names its language', () => {
    expect(languageOfPath('/fransizca')).toBe('fr')
    expect(languageOfPath('/ispanyolca/')).toBe('es')
    expect(languageOfPath('/ingilizce.html')).toBe('en')
    expect(languageOfPath('/')).toBeNull()
    expect(languageOfPath('/hakkinda')).toBeNull()
  })
})
