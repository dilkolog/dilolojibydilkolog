// @vitest-environment happy-dom
import 'fake-indexeddb/auto'
;(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true
import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { db } from '../../data/instance'
import type { Pack } from '../../data/wordpackBuild'

const rec = (p: string, t: string) => ({ p, t: [t] })
const pack = {
  v: 'test',
  w: {
    comfort: rec('n', 'konfor'),
    comfortable: rec('a', 'rahat'),
    uncomfortable: rec('a', 'rahatsız'),
    comfortably: rec('d', 'rahatça'),
  },
} as unknown as Pack
vi.mock('../sounds', () => ({ sfx: { correct: vi.fn(), wrong: vi.fn(), levelUp: vi.fn(), near: vi.fn() } }))
vi.mock('../../data/wordpack', async (orig) => ({ ...(await orig<typeof import('../../data/wordpack')>()), loadPack: async () => pack }))
vi.mock('../../data/frequency', async (orig) => ({ ...(await orig<typeof import('../../data/frequency')>()), loadFrequency: async () => new Map([['comfort', 1], ['comfortable', 2]]) }))
const { AffixHunt } = await import('./AffixHunt')

let root: ReturnType<typeof createRoot> | undefined
beforeEach(async () => {
  await db.meta.delete('affixes')
  await db.vocabulary.clear()
})
afterEach(() => {
  act(() => root?.unmount())
  document.body.innerHTML = ''
})

const wait = () => act(async () => void (await new Promise((r) => setTimeout(r, 60))))
const click = (el: Element | null | undefined) => act(async () => (el as HTMLElement).click())
const byText = (host: HTMLElement, text: string) => [...host.querySelectorAll('button')].find((b) => b.textContent?.includes(text))

async function mount() {
  const host = document.createElement('div')
  document.body.append(host)
  root = createRoot(host)
  await act(async () => root!.render(<AffixHunt language="en" onExit={() => {}} />))
  await wait()
  return host
}
const options = (host: HTMLElement) => [...host.querySelectorAll<HTMLButtonElement>('.option')]

describe('AffixHunt', () => {
  it('shows a word and its relative in Turkish, and the right ending is logged and shown put on the word', async () => {
    const host = await mount()
    await click(byText(host, 'tura başla'))
    await wait()
    expect(host.textContent).toContain('1 / 2')
    const base = host.querySelector('.word')!.textContent!
    expect(options(host)).toHaveLength(3)
    const right = base === 'comfort' ? '-able' : host.textContent!.includes('rahatça') ? '-ly' : 'un-'
    await click(options(host).find((o) => o.querySelector('.option-serif')?.textContent === right))
    expect(host.textContent).toContain('Doğru')
    expect(host.querySelector('[role=status]')!.textContent).toContain('Türkçesi')
    const logged = Object.entries(await db.getAffixLog())
    expect(logged).toHaveLength(1)
    expect(logged[0][1]).toMatchObject({ ok: 1, wrong: 0 })
  })

  it('says a wrong ending makes no word, and logs the miss', async () => {
    const host = await mount()
    await click(byText(host, 'tura başla'))
    await wait()
    const base = host.querySelector('.word')!.textContent!
    const right = base === 'comfort' ? '-able' : host.textContent!.includes('rahatça') ? '-ly' : 'un-'
    await click(options(host).find((o) => o.querySelector('.option-serif')?.textContent !== right))
    expect(host.textContent).toContain('Bu ek tutmuyor')
    expect(host.querySelectorAll('.option.is-wrong')).toHaveLength(1)
    expect(Object.values(await db.getAffixLog())[0]).toMatchObject({ ok: 0, wrong: 1 })
  })
})
