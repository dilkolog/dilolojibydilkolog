// @vitest-environment happy-dom
import 'fake-indexeddb/auto'
;(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true
import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'
import { loadTenses } from '../../data/tenseData'
import { emptyLab, recordSlip, type LabData } from '../../engine/labProgress'
import { SlipsTab } from './SlipsTab'
import { slipOptions, slipRound, spreadVerbs } from './slipRound'
import { createRng } from '../../engine/rng'

vi.mock('../sounds', () => ({ sfx: { correct: vi.fn(), wrong: vi.fn(), levelUp: vi.fn(), near: vi.fn() } }))

const slips = (): LabData => {
  let lab = emptyLab()
  lab = recordSlip(lab, 'tener', 'presente', 1, false, 'tenes')
  lab = recordSlip(lab, 'hacer', 'preterito', 0, false, 'hací')
  lab = recordSlip(lab, 'ser', 'presente', 2, false, 'sa')
  // One already right once: typed, and one more right takes it out.
  lab = recordSlip(lab, 'ir', 'preterito', 0, false, 'iba')
  return recordSlip(lab, 'ir', 'preterito', 0, true, 'fui')
}

beforeAll(() => loadTenses('es'))

let root: ReturnType<typeof createRoot> | undefined
afterEach(() => {
  act(() => root?.unmount())
  document.body.innerHTML = ''
})

describe('slipRound', () => {
  it('asks the freshly missed from options and the ones answered once by typing, mixed', () => {
    const q = slipRound(slips(), 'es', 5)
    expect(q).toHaveLength(4)
    expect(new Set(q.map((x) => x.slip.verb)).size).toBe(4)
    expect(q.find((x) => x.slip.verb === 'ir')!.format).toBe('type')
    expect(q.find((x) => x.slip.verb === 'tener')!.format).toBe('choose')
  })

  it('keeps the same verb apart when it can', () => {
    const mk = (verb: string) => ({ verb, tense: 'presente' as const, person: 0, wrong: 1, streak: 0, at: '' })
    expect(spreadVerbs([mk('a'), mk('a'), mk('b'), mk('c')]).map((s) => s.verb)).toEqual(['a', 'b', 'a', 'c'])
  })

  it('options hold the right form once, a real wrong form that was given, and no duplicates', () => {
    const lab = recordSlip(emptyLab(), 'tener', 'presente', 0, false, 'tuve')
    const slip = Object.values(lab.slips!)[0]
    const options = slipOptions('es', slip, createRng(3))
    expect(options).toContain('tengo')
    expect(options).toContain('tuve')
    expect(new Set(options).size).toBe(options.length)
  })
})

describe('SlipsTab', () => {
  it('is empty with no mistakes', async () => {
    const host = document.createElement('div')
    document.body.append(host)
    root = createRoot(host)
    await act(async () => root!.render(<SlipsTab language="es" lab={emptyLab()} onCheck={() => {}} onOpen={() => {}} />))
    expect(host.textContent).toContain('Açık hatan yok')
  })

  it('lists the mistakes, runs a mixed round and reports the answers', async () => {
    const host = document.createElement('div')
    document.body.append(host)
    root = createRoot(host)
    const checks: [string, boolean][] = []
    await act(async () => root!.render(<SlipsTab language="es" lab={slips()} onCheck={(v, _t, ok) => checks.push([v, ok])} onOpen={() => {}} />))
    expect(host.querySelectorAll('.lab-slip-row')).toHaveLength(4)
    await act(async () => [...host.querySelectorAll('button')].find((b) => b.textContent?.includes('Karışık sor'))!.click())
    // Whatever comes first: answer with the first option or typed nonsense, then go on until the end.
    for (let n = 0; n < 4; n++) {
      const option = host.querySelector<HTMLButtonElement>('.lab-option')
      if (option) await act(async () => option.click())
      else {
        const input = host.querySelector<HTMLInputElement>('input.answer-input')!
        await act(async () => {
          Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(input, 'xx')
          input.dispatchEvent(new Event('input', { bubbles: true }))
        })
        await act(async () => host.querySelector<HTMLButtonElement>('button[type=submit]')!.click())
      }
      await act(async () => host.querySelector<HTMLButtonElement>('.lab-next')!.click())
    }
    expect(checks).toHaveLength(4)
    expect(host.textContent).toContain('Hatalarım bitti')
  })
})
