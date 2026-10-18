// @vitest-environment happy-dom
;(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true
import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { GuideReportsCard } from './GuideReportsCard'
import { loadReports } from './guideReportStore'
import { ReportIssue } from './ReportIssue'

vi.mock('./toastFeed', () => ({ showToast: vi.fn() }))

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
  it('keeps a note on this device and shows it in the list, which can be removed from', () => {
    const host = mount(
      <>
        <ReportIssue language="fr" topic="subjonctif" kind="question" prompt="Il faut que tu ___" />
        <GuideReportsCard />
      </>,
    )
    expect(host.querySelector('.guide-reports')).toBeNull()
    act(() => host.querySelector<HTMLButtonElement>('button.link')!.click())
    act(() => setValue(host.querySelector('textarea')!, 'iki cevap doğru'))
    act(() => host.querySelector<HTMLButtonElement>('button[type="submit"]')!.click())
    expect(host.querySelector('[role="status"]')?.textContent).toContain('Not alındı')
    expect(loadReports()).toMatchObject([{ language: 'fr', topic: 'subjonctif', kind: 'question', prompt: 'Il faut que tu ___', note: 'iki cevap doğru' }])
    expect(host.querySelector('.guide-reports summary')?.textContent).toContain('(1)')
    act(() => host.querySelector<HTMLButtonElement>('button[aria-label="Bildirimi sil"]')!.click())
    expect(loadReports()).toEqual([])
    expect(host.querySelector('.guide-reports')).toBeNull()
  })

  it('can be given up without keeping anything', () => {
    const host = mount(<ReportIssue language="fr" topic="x" kind="lesson" />)
    act(() => host.querySelector<HTMLButtonElement>('button.link')!.click())
    act(() => [...host.querySelectorAll('button')].find((b) => b.textContent === 'Vazgeç')!.click())
    expect(host.querySelector('textarea')).toBeNull()
    expect(loadReports()).toEqual([])
  })
})
