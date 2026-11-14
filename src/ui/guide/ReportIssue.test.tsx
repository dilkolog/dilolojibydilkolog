// @vitest-environment happy-dom
;(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true
import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { GuideReportsCard } from './GuideReportsCard'
import { loadReports } from './guideReportStore'
import { ReportIssue } from './ReportIssue'

vi.mock('../shared/toastFeed', () => ({ showToast: vi.fn() }))
const account = vi.hoisted(() => ({ value: null as null | { id: string } }))
const sent = vi.hoisted(() => [] as unknown[])
vi.mock('../../data/access', () => ({ getStoredAccount: async () => account.value }))
vi.mock('../../data/friends', () => ({ sendReport: async (r: unknown) => void sent.push(r) }))

let root: ReturnType<typeof createRoot> | undefined
afterEach(() => {
  act(() => root?.unmount())
  document.body.innerHTML = ''
  localStorage.clear()
})

function mount(node: React.ReactNode) {
  const host = document.createElement('div')
  document.body.append(host)
  root = createRoot(host)
  act(() => root!.render(node))
  return host
}

const setValue = (el: HTMLTextAreaElement, value: string) => {
  Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value')!.set!.call(el, value)
  el.dispatchEvent(new Event('input', { bubbles: true }))
}

describe('ReportIssue and the list of reports', () => {
  it('keeps a note on this device and shows it in the list, which can be removed from', async () => {
    account.value = null
    const host = mount(
      <>
        <ReportIssue language="fr" topic="subjonctif" kind="question" prompt="Il faut que tu ___" />
        <GuideReportsCard />
      </>,
    )
    expect(host.querySelector('.guide-reports')).toBeNull()
    act(() => host.querySelector<HTMLButtonElement>('button.link')!.click())
    act(() => setValue(host.querySelector('textarea')!, 'iki cevap doğru'))
    await act(async () => host.querySelector<HTMLButtonElement>('button[type="submit"]')!.click())
    expect(host.querySelector('[role="status"]')?.textContent).toContain('Not alındı')
    expect(loadReports()).toMatchObject([{ language: 'fr', topic: 'subjonctif', kind: 'question', prompt: 'Il faut que tu ___', item: 'fr-lesson-subjonctif', note: 'iki cevap doğru' }])
    // Without an account nothing is sent.
    expect(sent).toEqual([])
    expect(host.querySelector('.guide-reports summary')?.textContent).toContain('(1)')
    act(() => host.querySelector<HTMLButtonElement>('button[aria-label="Bildirimi sil"]')!.click())
    expect(loadReports()).toEqual([])
    expect(host.querySelector('.guide-reports')).toBeNull()
  })

  it('with an account, sends the item to the owner as a content mistake and keeps a copy', async () => {
    account.value = { id: 'a' }
    sent.length = 0
    const host = mount(<ReportIssue language="fr" topic="passe_imparfait" kind="question" prompt="Hier, il ___ déjà." item="fr-g-000001" label="Soruda hata var" />)
    act(() => host.querySelector<HTMLButtonElement>('button.link')!.click())
    act(() => setValue(host.querySelector('textarea')!, 'iki şık doğru'))
    await act(async () => host.querySelector<HTMLButtonElement>('button[type="submit"]')!.click())
    expect(sent).toEqual([{ kind: 'content', target: 'fr-g-000001', reason: 'mistake', note: 'iki şık doğru', shown: 'Hier, il ___ déjà.' }])
    expect(host.querySelector('[role="status"]')?.textContent).toContain('bildirimin iletildi')
    expect(loadReports()).toMatchObject([{ item: 'fr-g-000001' }])
    account.value = null
  })

  it('can be given up without keeping anything', () => {
    const host = mount(<ReportIssue language="fr" topic="x" kind="lesson" />)
    act(() => host.querySelector<HTMLButtonElement>('button.link')!.click())
    act(() => [...host.querySelectorAll('button')].find((b) => b.textContent === 'Vazgeç')!.click())
    expect(host.querySelector('textarea')).toBeNull()
    expect(loadReports()).toEqual([])
  })
})
