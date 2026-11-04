// @vitest-environment happy-dom
import 'fake-indexeddb/auto'
;(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true
import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'
import { addTenseSentences } from '../../engine/tenses'
import { TenseSheet } from './TenseSheet'
import { sheetRows } from './tenseSheetRows'

vi.mock('../sounds', () => ({ sfx: { correct: vi.fn(), wrong: vi.fn(), levelUp: vi.fn(), finish: vi.fn(), badge: vi.fn(), goal: vi.fn(), pair: vi.fn(), flip: vi.fn(), tick: vi.fn(), forgot: vi.fn(), resetRun: vi.fn(), near: vi.fn() } }))

const ES = {
  tener: { preterito: 'Raquel y Vicente [tuvieron] que cancelar sus vacaciones.\tTatillerini iptal etmek zorunda kaldılar.' },
  andar: { preterito: 'Yo [anduve] por la sombra.\tGölgede yürüdüm.' },
  hacer: { preterito: 'Lo que tú [hiciste] es imperdonable.\tYaptığın bağışlanmaz.' },
  traer: { preterito: '¿Tú no [trajiste] nada?\tHiçbir şey getirmedin mi?' },
  saber: { preterito: 'Nunca [supimos] la verdad.\tDoğruyu hiç öğrenmedik.', presente: 'Ella [sabe] la verdad.\tO doğruyu biliyor.' },
}
beforeAll(() => addTenseSentences('es', ES))

let root: ReturnType<typeof createRoot> | undefined
afterEach(() => {
  act(() => root?.unmount())
  document.body.innerHTML = ''
})

describe('sheetRows', () => {
  it('gives each verb once, the chosen verb first, in the tense asked', () => {
    const rows = sheetRows('es', 'saber', 'preterito', false, ['saber', 'tener', 'andar'], 1, 5)
    expect(rows[0].verb).toBe('saber')
    expect(new Set(rows.map((r) => r.verb)).size).toBe(rows.length)
    expect(rows.every((r) => r.tense === 'preterito')).toBe(true)
    expect(rows.length).toBe(5)
  })

  it('mixed takes the core tenses in turn', () => {
    const rows = sheetRows('es', 'saber', 'preterito', true, ['saber'], 3, 5)
    expect(rows.length).toBeGreaterThan(0)
    expect(rows.every((r) => r.verb === 'saber' || r.tense === 'preterito' || r.tense === 'presente')).toBe(true)
  })
})

describe('TenseSheet', () => {
  it('writes the forms, checks all at once and tells the right form', async () => {
    const host = document.createElement('div')
    document.body.append(host)
    root = createRoot(host)
    const answers: [string, boolean][] = []
    await act(async () => root!.render(<TenseSheet language="es" verb="saber" tense="preterito" verbs={['saber', 'tener', 'andar', 'hacer', 'traer']} onAnswer={(v, _t, ok) => answers.push([v, ok])} />))
    const inputs = [...host.querySelectorAll<HTMLInputElement>('.lab-sheet-input')]
    expect(inputs.length).toBe(5)
    expect(host.textContent).toContain('(saber)')
    // Fill the "saber" row right and the others wrong.
    const set = (el: HTMLInputElement, v: string) => {
      const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!
      setter.call(el, v)
      el.dispatchEvent(new Event('input', { bubbles: true }))
    }
    await act(async () => {
      inputs.forEach((el, i) => set(el, i === 0 ? 'supimos' : 'xx'))
    })
    await act(async () => host.querySelector<HTMLButtonElement>('button[type=submit]')!.click())
    expect(host.querySelector('.lab-sheet-score')!.textContent).toBe('1 / 5 doğru')
    expect(host.querySelectorAll('.lab-sheet-row.is-bad').length).toBe(4)
    expect(answers.length).toBe(5)
    expect(host.textContent).toContain('Doğrusu:')
  })
})
