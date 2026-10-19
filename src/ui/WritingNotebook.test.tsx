// @vitest-environment happy-dom
import 'fake-indexeddb/auto'
;(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true
import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { db } from '../data/instance'
import { dayAgo } from './format'
import { WritingNotebook } from './WritingNotebook'

let root: ReturnType<typeof createRoot> | undefined
beforeEach(async () => {
  await db.meta.delete('writingErrors')
})
afterEach(() => {
  act(() => root?.unmount())
  document.body.innerHTML = ''
})

const wait = () => act(async () => void (await new Promise((r) => setTimeout(r, 60))))
async function mount(onRepair = vi.fn(), onLesson = vi.fn()) {
  const host = document.createElement('div')
  document.body.append(host)
  root = createRoot(host)
  await act(async () => root!.render(<WritingNotebook language="fr" onRepair={onRepair} onLesson={onLesson} />))
  await wait()
  return { host, onRepair, onLesson }
}

describe('WritingNotebook', () => {
  it('is not there before anything is checked', async () => {
    expect((await mount()).host.innerHTML).toBe('')
  })

  it('lists the kinds with their count, examples and the practice for each', async () => {
    await db.saveWritingLog({
      fr: {
        agreement: { n: 7, last: '2026-10-18', samples: [{ wrong: 'la problème', fix: 'le problème' }], seen: [] },
        spelling: { n: 2, last: '2026-10-17', samples: [{ wrong: 'recieve', fix: 'recevoir' }], seen: [] },
      },
    })
    const { host, onRepair, onLesson } = await mount()
    expect(host.textContent).toContain('Yazı hata defterim')
    expect(host.textContent).toContain('Uyum')
    expect(host.textContent).toContain('7 kez')
    expect(host.textContent).toContain('la problème')
    expect(host.textContent).toContain('le problème')
    // Spelling has no practice: listed, without buttons.
    expect(host.querySelectorAll('li')).toHaveLength(2)
    const buttons = [...host.querySelectorAll('button')]
    await act(async () => buttons.find((b) => b.textContent?.includes('Dilbilgisi soruları'))!.click())
    expect(onRepair).toHaveBeenCalledWith('grammar')
    await act(async () => buttons.find((b) => b.textContent?.includes('Dersi oku'))!.click())
    expect(onLesson).toHaveBeenCalledWith({ topic: 'basics_fr_adjectifs' })
  })
})

describe('dayAgo', () => {
  it('says the day, never a time of day', () => {
    const now = new Date(2026, 9, 19, 15, 30)
    expect(dayAgo('2026-10-19', now)).toBe('bugün')
    expect(dayAgo('2026-10-18', now)).toBe('dün')
    expect(dayAgo('2026-10-14', now)).toBe('5 gün önce')
    expect(dayAgo('2026-10-25', now)).toBe('bugün')
  })
})
