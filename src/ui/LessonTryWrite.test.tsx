// @vitest-environment happy-dom
import 'fake-indexeddb/auto'
;(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true
import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, describe, expect, it } from 'vitest'
import { db } from '../data/instance'
import { AiContext } from './aiContext'
import { LessonTry } from './LessonTry'
import { LessonWrite } from './LessonWrite'
import { setMonkiListener, type MonkiAsk } from './monki/monkiBus'

let root: ReturnType<typeof createRoot> | undefined
afterEach(async () => {
  act(() => root?.unmount())
  document.body.innerHTML = ''
  setMonkiListener(null)
  await db.meta.clear()
})

const mount = async (node: React.ReactNode) => {
  const host = document.createElement('div')
  document.body.append(host)
  root = createRoot(host)
  await act(async () => root!.render(node))
  return host
}
const type = async (el: HTMLTextAreaElement, value: string) => {
  const set = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value')!.set!
  await act(async () => {
    set.call(el, value)
    el.dispatchEvent(new Event('input', { bubbles: true }))
  })
}

describe('LessonTry', () => {
  const items = [
    { prompt: 'Il faut que tu ___ vite.', options: ['viens', 'viennes'], answer: 1, why: 'Après il faut que: subjonctif.' },
    { prompt: 'Bien qu’il ___ tard.', options: ['est', 'soit'], answer: 1, why: 'Bien que + subjonctif.' },
  ]

  it('asks one question at a time, says why, and goes on to the next on request', async () => {
    const host = await mount(<LessonTry items={items} language="fr" />)
    expect(host.textContent).toContain('1 / 2')
    await act(async () => host.querySelectorAll<HTMLButtonElement>('.option')[0]!.click())
    expect(host.querySelector('[role=status]')!.textContent).toContain('Olmadı.')
    expect(host.querySelector('[role=status]')!.textContent).toContain('subjonctif')
    await act(async () => [...host.querySelectorAll('button')].find((b) => b.textContent === 'Bir tane daha')!.click())
    expect(host.textContent).toContain('2 / 2')
    await act(async () => host.querySelectorAll<HTMLButtonElement>('.option')[1]!.click())
    expect(host.querySelector('[role=status]')!.textContent).toContain('Doğru!')
    // The last one: nothing more to offer.
    expect([...host.querySelectorAll('button')].some((b) => b.textContent === 'Bir tane daha')).toBe(false)
  })
})

describe('LessonWrite', () => {
  it('keeps a sentence as a card, once', async () => {
    const host = await mount(<LessonWrite title="Subjonctif" language="fr" />)
    const keep = () => [...host.querySelectorAll('button')].find((b) => /Cümle kartı yap|Kart yapıldı|zaten var/.test(b.textContent ?? ''))!
    expect(keep().disabled).toBe(true)
    await type(host.querySelector('textarea')!, 'Il faut que je parte maintenant.')
    expect(keep().disabled).toBe(false)
    await act(async () => keep().click())
    await act(() => new Promise((r) => setTimeout(r, 30)))
    const saved = await db.getSentences()
    expect(saved).toHaveLength(1)
    expect(saved[0]).toMatchObject({ language: 'fr', text: 'Il faut que je parte maintenant.', source: 'Rehber: Subjonctif' })
    expect(keep().textContent).toBe('Kart yapıldı ✓')
  })

  it('asks Monki about the sentence only with a YZ key', async () => {
    const asked: MonkiAsk[] = []
    setMonkiListener((a) => asked.push(a))
    let host = await mount(<LessonWrite title="Subjonctif" language="fr" />)
    expect(host.textContent).not.toContain('Monki')
    act(() => root?.unmount())
    document.body.innerHTML = ''
    host = await mount(
      <AiContext.Provider value={{ apiKey: 'k', setApiKey: async () => {} }}>
        <LessonWrite title="Subjonctif" language="fr" />
      </AiContext.Provider>,
    )
    await type(host.querySelector('textarea')!, 'Il faut que je part maintenant.')
    await act(async () => [...host.querySelectorAll('button')].find((b) => b.textContent?.includes('Monki'))!.click())
    expect(asked).toHaveLength(1)
    expect(asked[0]!.send).toBe(true)
    expect(asked[0]!.text).toContain('Subjonctif')
    expect(asked[0]!.text).toContain('Il faut que je part maintenant.')
  })
})
