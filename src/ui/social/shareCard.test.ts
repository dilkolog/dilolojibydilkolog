// @vitest-environment happy-dom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { shareCard, wrapLines } from './shareCard'

const width = (s: string) => s.length * 10

describe('wrapLines', () => {
  it('breaks at spaces to fit the width', () => {
    expect(wrapLines(width, 'bir iki üç dört beş altı', 100, 5)).toEqual(['bir iki üç', 'dört beş', 'altı'])
  })

  it('ends a cut text with an ellipsis, within the width', () => {
    const lines = wrapLines(width, 'bir iki üç dört beş altı yedi sekiz dokuz', 90, 2)
    expect(lines).toHaveLength(2)
    expect(lines[1].endsWith('…')).toBe(true)
    expect(lines.every((l) => width(l) <= 90)).toBe(true)
  })

  it('keeps one very long word on its line, shortened', () => {
    const [line] = wrapLines(width, 'supercalifragilisticexpialidocious', 100, 1)
    expect(width(line)).toBeLessThanOrEqual(100)
    expect(line.endsWith('…')).toBe(true)
  })

  it('says nothing for an empty text', () => {
    expect(wrapLines(width, '   ', 100, 3)).toEqual([])
  })
})

describe('shareCard', () => {
  const nav = navigator as unknown as { share?: unknown; canShare?: unknown }
  afterEach(() => {
    delete nav.share
    delete nav.canShare
  })

  it('falls back to the text when files cannot be shared', async () => {
    const share = vi.fn(async () => {})
    nav.share = share
    nav.canShare = () => false
    await shareCard({ kicker: 'Yeni rozet', title: 'Bir hafta' }, 'Yeni rozet: Bir hafta')
    expect(share).toHaveBeenCalledWith({ title: 'Diloloji', text: 'Yeni rozet: Bir hafta' })
  })

  it('does not throw when the share sheet is closed', async () => {
    nav.share = vi.fn(async () => {
      throw new DOMException('closed', 'AbortError')
    })
    await expect(shareCard({ kicker: 'k', title: 't' }, 'x')).resolves.toBeUndefined()
  })
})
