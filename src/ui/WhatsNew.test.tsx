// @vitest-environment happy-dom
;(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true
import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { WhatsNew } from './WhatsNew'
import { markWhatsNewSeen, WHATS_NEW_MIN_WORDS, WHATS_NEW_VERSION, whatsNewDue, whatsNewSeen } from './whatsNewLogic'

let root: ReturnType<typeof createRoot> | undefined
beforeEach(() => localStorage.clear())
afterEach(() => {
  act(() => root?.unmount())
  document.body.innerHTML = ''
})

async function mount(words: number, onReading = vi.fn(), onPractice = vi.fn(), onGrammar = vi.fn()) {
  const host = document.createElement('div')
  document.body.append(host)
  root = createRoot(host)
  await act(async () => root!.render(<WhatsNew words={words} onReading={onReading} onPractice={onPractice} onGrammar={onGrammar} />))
  return { host, onReading, onPractice, onGrammar }
}

describe('whatsNewDue', () => {
  it('is due once per version, and only for someone with some words', () => {
    expect(whatsNewDue(null, WHATS_NEW_MIN_WORDS)).toBe(true)
    expect(whatsNewDue(null, WHATS_NEW_MIN_WORDS - 1)).toBe(false)
    expect(whatsNewDue(WHATS_NEW_VERSION, 100)).toBe(false)
    expect(whatsNewDue('2026-01-01', 100)).toBe(true)
  })
})

describe('WhatsNew', () => {
  it('shows the news, and closing it keeps it away', async () => {
    const { host } = await mount(30)
    expect(host.textContent).toContain('Sesli kitaplar')
    await act(async () => host.querySelector<HTMLButtonElement>('button[aria-label=Kapat]')!.click())
    expect(host.innerHTML).toBe('')
    expect(whatsNewSeen()).toBe(WHATS_NEW_VERSION)
    act(() => root?.unmount())
    expect((await mount(30)).host.innerHTML).toBe('')
  })

  it('a link goes where it says and counts as seen', async () => {
    const { host, onReading, onPractice } = await mount(30)
    await act(async () => [...host.querySelectorAll('button')].find((b) => b.textContent === 'Sesli kitaplar')!.click())
    expect(onReading).toHaveBeenCalled()
    expect(onPractice).not.toHaveBeenCalled()
    expect(host.innerHTML).toBe('')
  })

  it('opens the grammar questions from its link', async () => {
    const { host, onGrammar } = await mount(30)
    await act(async () => [...host.querySelectorAll('button')].find((b) => b.textContent === 'Dilbilgisi soruları')!.click())
    expect(onGrammar).toHaveBeenCalled()
  })

  it('stays out of the way of a device that has hardly begun, and of one that has seen it', async () => {
    expect((await mount(3)).host.innerHTML).toBe('')
    act(() => root?.unmount())
    markWhatsNewSeen()
    expect((await mount(50)).host.innerHTML).toBe('')
  })
})
