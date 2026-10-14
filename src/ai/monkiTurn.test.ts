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

const { endsMidThought, monkiTurn } = await import('./claude')

const answer = (reply: string) => ({
  parsed_output: { reply, suggestions: ['Başka örnek'] },
  stop_reason: 'end_turn',
  usage: { input_tokens: 10, output_tokens: 10 },
})
const req = { language: 'fr' as const, history: [{ role: 'user' as const, text: 'Daha resmi ifadeler göster' }] }

describe('Monki', () => {
  beforeEach(() => parse.mockReset())

  it('knows a reply that only announces what comes next', () => {
    expect(endsMidThought('Tabii, daha resmi ifadeler işte:')).toBe(true)
    expect(endsMidThought('Şunlar:  \n')).toBe(true)
    expect(endsMidThought('- **Je vous prie de** (Rica ederim)\n- **Veuillez** (Lütfen)')).toBe(false)
    expect(endsMidThought('Saat 10:30’da görüşürüz.')).toBe(false)
  })

  it('asks once more when the reply stops after its introduction', async () => {
    parse.mockResolvedValueOnce(answer('Tabii, daha resmi ifadeler işte:')).mockResolvedValueOnce(answer('İşte:\n- **Veuillez** (Lütfen)'))
    const out = await monkiTurn('key', req)
    expect(parse).toHaveBeenCalledTimes(2)
    expect(out.reply).toContain('Veuillez')
  })

  it('asks only once when the reply is whole, and keeps the first when the second try is cut too', async () => {
    parse.mockResolvedValueOnce(answer('- **Veuillez** (Lütfen)'))
    expect((await monkiTurn('key', req)).reply).toContain('Veuillez')
    expect(parse).toHaveBeenCalledTimes(1)
    parse.mockReset()
    parse.mockResolvedValueOnce(answer('Şunlar:')).mockResolvedValueOnce(answer('Tabii:'))
    expect((await monkiTurn('key', req)).reply).toBe('Şunlar:')
    expect(parse).toHaveBeenCalledTimes(2)
  })
})
