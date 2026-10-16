import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  checkGrammar,
  GRAMMAR_MAX,
  GrammarError,
  LANGUAGETOOL_URL,
} from '../grammarCheck'

describe('grammarCheck', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('exports LANGUAGETOOL_URL and GRAMMAR_MAX constant', () => {
    expect(LANGUAGETOOL_URL).toBe('https://languagetool.org')
    expect(GRAMMAR_MAX).toBe(6000)
  })

  it('throws GrammarError when text exceeds maximum character limit', async () => {
    const longText = 'a'.repeat(GRAMMAR_MAX + 1)
    await expect(checkGrammar(longText, 'en')).rejects.toThrow(GrammarError)
    await expect(checkGrammar(longText, 'en')).rejects.toThrow(/en fazla/)
  })

  it('throws GrammarError on network failure', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('Network offline')))
    await expect(checkGrammar('Hello world', 'en')).rejects.toThrow('Denetim için internet gerekiyor.')
  })

  it('throws GrammarError on rate limit (429 status)', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 429,
        json: async () => ({}),
      }),
    )
    await expect(checkGrammar('Hello world', 'en')).rejects.toThrow('LanguageTool şu an yoğun')
  })

  it('throws GrammarError on server error (500 status)', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
        json: async () => ({}),
      }),
    )
    await expect(checkGrammar('Hello world', 'en')).rejects.toThrow('Denetim şu an yapılamadı.')
  })

  it('maps matches and categorizes spelling, style, and grammar issues', async () => {
    const mockMatches = [
      {
        offset: 0,
        length: 5,
        message: 'Olası yazım hatası',
        replacements: [{ value: 'Hello' }, { value: 'Hallo' }],
        rule: { issueType: 'misspelling' },
      },
      {
        offset: 6,
        length: 4,
        message: 'Üslup önerisi',
        replacements: [{ value: 'good' }],
        rule: { issueType: 'style' },
      },
      {
        offset: 12,
        length: 3,
        message: 'Dilbilgisi hatası',
        replacements: [
          { value: 'are' },
          { value: 'were' },
          { value: 'is' },
          { value: 'be' },
          { value: 'extra_ignored' },
        ],
        rule: { issueType: 'grammar' },
      },
    ]

    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ matches: mockMatches }),
      }),
    )

    const issues = await checkGrammar('Helo ther is you', 'en')
    expect(issues).toHaveLength(3)

    expect(issues[0]).toEqual({
      offset: 0,
      length: 5,
      message: 'Olası yazım hatası',
      replacements: ['Hello', 'Hallo'],
      kind: 'spelling',
    })

    expect(issues[1]).toEqual({
      offset: 6,
      length: 4,
      message: 'Üslup önerisi',
      replacements: ['good'],
      kind: 'style',
    })

    expect(issues[2].kind).toBe('grammar')
    expect(issues[2].replacements).toHaveLength(4)
    expect(issues[2].replacements).not.toContain('extra_ignored')
  })
})
