import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { alreadyOffered, clipboardCandidate, clipboardSuggestion } from './clipboardSuggest'

const stored = new Map<string, string>()
beforeEach(() => {
  stored.clear()
  vi.stubGlobal('localStorage', { getItem: (k: string) => stored.get(k) ?? null, setItem: (k: string, v: string) => void stored.set(k, v) })
})
afterEach(() => vi.unstubAllGlobals())

describe('clipboard word', () => {
  it('offers a short word or phrase, trimmed of quotes and punctuation', () => {
    expect(clipboardCandidate('  maison ', [])).toBe('maison')
    expect(clipboardCandidate('“s’en aller”.', [])).toBe('s’en aller')
    expect(clipboardCandidate("l'arbre", [])).toBe("l'arbre")
    expect(clipboardCandidate('give up on', [])).toBe('give up on')
  })

  it('skips long text, numbers, links, addresses and words already in the list', () => {
    expect(clipboardCandidate('this is a whole sentence here', [])).toBeNull()
    expect(clipboardCandidate('https://example.com', [])).toBeNull()
    expect(clipboardCandidate('ali@example.com', [])).toBeNull()
    expect(clipboardCandidate('123456', [])).toBeNull()
    expect(clipboardCandidate('', [])).toBeNull()
    expect(clipboardCandidate('Maison', ['maison'])).toBeNull()
  })

  it('reads only when permission is already granted, and offers the same copy once', async () => {
    const readText = vi.fn(async () => 'chat')
    vi.stubGlobal('navigator', { clipboard: { readText }, permissions: { query: async () => ({ state: 'prompt' }) } })
    expect(await clipboardSuggestion([])).toBeNull()
    expect(readText).not.toHaveBeenCalled()

    vi.stubGlobal('navigator', { clipboard: { readText }, permissions: { query: async () => ({ state: 'granted' }) } })
    expect(await clipboardSuggestion([])).toBe('chat')
    expect(alreadyOffered('chat')).toBe(true)
    expect(localStorage.getItem('kelime-koc:clipboard-last')).not.toContain('chat')
    expect(await clipboardSuggestion([])).toBeNull()
  })
})
