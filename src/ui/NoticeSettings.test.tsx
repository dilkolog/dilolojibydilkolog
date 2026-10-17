// @vitest-environment happy-dom
;(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true
import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { describe, expect, it, vi } from 'vitest'
import { DEFAULT_SETTINGS, type Settings } from '../data/db'
import { NoticeSettings } from './ReminderSettings'

const mount = async (settings: Settings, onChange = vi.fn()) => {
  const host = document.createElement('div')
  document.body.append(host)
  const root = createRoot(host)
  await act(async () => root.render(<NoticeSettings settings={settings} onChange={onChange} />))
  return { host, onChange, unmount: () => act(() => root.unmount()) }
}
const switches = (host: HTMLElement) => [...host.querySelectorAll<HTMLButtonElement>('button[role=switch]')]

describe('NoticeSettings', () => {
  it('lists the groups, all on to begin with; turning one off keeps its kinds, turning it on takes them back', async () => {
    const { host, onChange, unmount } = await mount(DEFAULT_SETTINGS)
    expect(switches(host).map((s) => s.getAttribute('aria-checked'))).toEqual(['true', 'true', 'true', 'true'])
    // Rozet, seviye ve sertifika is the third group: three kinds go off together.
    await act(async () => switches(host)[2].click())
    expect(onChange).toHaveBeenLastCalledWith({ ...DEFAULT_SETTINGS, noticeOff: ['badge', 'level', 'cert'] })
    unmount()
    const again = await mount({ ...DEFAULT_SETTINGS, noticeOff: ['friend', 'badge', 'level', 'cert'] })
    expect(switches(again.host).map((s) => s.getAttribute('aria-checked'))).toEqual(['false', 'true', 'false', 'true'])
    await act(async () => switches(again.host)[0].click())
    expect(again.onChange).toHaveBeenLastCalledWith({ ...DEFAULT_SETTINGS, noticeOff: ['badge', 'level', 'cert'] })
    again.unmount()
  })
})
