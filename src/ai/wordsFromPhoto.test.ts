import { beforeEach, describe, expect, it, vi } from 'vitest'

const parse = vi.fn()
vi.mock('@anthropic-ai/sdk', () => {
  class APIError extends Error {}
  class Anthropic {
    static APIError = APIError
    static AuthenticationError = class extends APIError {}
    static PermissionDeniedError = class extends APIError {}
    static RateLimitError = class extends APIError {}
    static APIConnectionError = class extends APIError {}
    beta = { messages: { parse } }
  }
  return { default: Anthropic }
})

const { wordsFromPhoto } = await import('./claude')

const info = (lemma: string) => ({ input: lemma, lemma, partOfSpeech: 'noun', gender: 'm', meanings: ['x'], example: 'e', exampleTranslation: 't', collocations: [], confusables: [], frequencyBand: 'top3000', literal: '' })
const reply = (...lemmas: string[]) => ({ parsed_output: { words: lemmas.map(info) }, stop_reason: 'end_turn', usage: { input_tokens: 10, output_tokens: 10 } })
const req = { language: 'fr' as const, imageBase64: 'QUJD', mediaType: 'image/jpeg' as const, count: 2, have: ['maison'] }

describe('wordsFromPhoto', () => {
  beforeEach(() => parse.mockReset())

  it('sends the picture as an image block with the list, and drops words already in it, up to the count', async () => {
    parse.mockResolvedValue(reply('Maison', 'fromage', 'pain', 'lait'))
    const out = await wordsFromPhoto('key', req)
    expect(out.map((w) => w.lemma)).toEqual(['fromage', 'pain'])
    const sent = parse.mock.calls[0][0]
    const content = sent.messages[0].content
    expect(content[0]).toEqual({ type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: 'QUJD' } })
    expect(content[1].text).toContain('maison')
    expect(sent.system).toContain('photo')
  })
})
