// @vitest-environment happy-dom
import 'fake-indexeddb/auto'
;(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true
import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { db } from '../../data/instance'
import { flowItems } from '../../data/flow'

vi.mock('../sounds', () => ({ sfx: { correct: vi.fn(), wrong: vi.fn(), levelUp: vi.fn(), near: vi.fn() } }))
const { FlowRound } = await import('./FlowRound')

let root: ReturnType<typeof createRoot> | undefined
beforeEach(async () => {
  await db.meta.delete('flow')
})
afterEach(() => {
  act(() => root?.unmount())
  document.body.innerHTML = ''
})

const wait = () => act(async () => void (await new Promise((r) => setTimeout(r, 40))))
const click = (el: Element | null | undefined) => act(async () => (el as HTMLElement).click())
const byText = (host: HTMLElement, text: string) => [...host.querySelectorAll('button')].find((b) => b.textContent?.includes(text))

async function mount() {
  const host = document.createElement('div')
  document.body.append(host)
  root = createRoot(host)
  await act(async () => root!.render(<FlowRound language="en" onExit={() => {}} />))
  await wait()
  return host
}
const options = (host: HTMLElement) => [...host.querySelectorAll<HTMLButtonElement>('.option')]
/** The paragraph on screen, found by its first words (the open gap is "[ ? ]"). */
const current = (host: HTMLElement) => flowItems.find((i) => i.language === 'en' && host.querySelector('.flow-text')!.textContent!.startsWith(i.text.split('{')[0]))!

describe('FlowRound', () => {
  it('fills the gaps one after another, logs each and explains it, then gives the Turkish', async () => {
    const host = await mount()
    await click(byText(host, 'tura başla'))
    expect(host.textContent).toContain('1 / 3')
    const item = current(host)
    expect(host.querySelector('.flow-gap.is-open')?.textContent).toBe('[ ? ]')
    for (let n = 0; n < item.gaps.length; n++) {
      expect(options(host)).toHaveLength(3)
      await click(options(host).find((o) => o.querySelector('.option-serif')?.textContent === item.gaps[n].answer))
      expect(host.textContent).toContain('Doğru')
      expect((await db.getFlowLog())[`${item.id}|${n + 1}`]).toMatchObject({ ok: 1, wrong: 0 })
      if (n + 1 < item.gaps.length) await click(byText(host, 'Devam'))
    }
    expect(host.querySelectorAll('.option')).toHaveLength(0)
    expect(host.querySelectorAll('.flow-gap.is-correct')).toHaveLength(item.gaps.length)
    expect(host.textContent).toContain('Türkçesi')
    await click(byText(host, 'Sonraki paragraf'))
    expect(host.textContent).toContain('2 / 3')
  })

  it('says a wrong connector does not fit, and logs the miss', async () => {
    const host = await mount()
    await click(byText(host, 'tura başla'))
    const item = current(host)
    await click(options(host).find((o) => o.querySelector('.option-serif')?.textContent !== item.gaps[0].answer))
    expect(host.textContent).toContain('Bu bağlaç uymaz')
    expect(host.querySelectorAll('.flow-gap.is-wrong')).toHaveLength(1)
    expect((await db.getFlowLog())[`${item.id}|1`]).toMatchObject({ ok: 0, wrong: 1 })
  })
})
