import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createEntry } from '../data/wordInput'
import { AiError } from './types'
import type { RetellRequest } from './types'
import type { VocabularyEntry } from '../engine/types'

const parse = vi.fn()

vi.mock('@anthropic-ai/sdk', () => {
  class APIError extends Error {
    status = 500
    constructor(status = 500, _error: unknown = {}, message = 'API Error', _headers: unknown = {}) {
      super(message)
      this.status = status
    }
  }
  class AuthenticationError extends APIError {
    constructor(status = 401, error: unknown = {}, message = 'Invalid API Key', headers: unknown = {}) {
      super(status, error, message, headers)
    }
  }
  class PermissionDeniedError extends APIError {
    constructor(status = 403, error: unknown = {}, message = 'Permission Denied', headers: unknown = {}) {
      super(status, error, message, headers)
    }
  }
  class RateLimitError extends APIError {
    constructor(status = 429, error: unknown = {}, message = 'Rate Limit', headers: unknown = {}) {
      super(status, error, message, headers)
    }
  }
  class APIConnectionError extends APIError {
    constructor(options: { message?: string; cause?: Error } = { message: 'Connection Error' }) {
      super(0, {}, options.message, {})
    }
  }
  class Anthropic {
    static APIError = APIError
    static AuthenticationError = AuthenticationError
    static PermissionDeniedError = PermissionDeniedError
    static RateLimitError = RateLimitError
    static APIConnectionError = APIConnectionError
    beta = { messages: { parse } }
  }
  return { default: Anthropic }
})

const { default: Anthropic } = await import('@anthropic-ai/sdk')
const { evaluateRetelling, evaluateTranslation } = await import('./claude')

describe('evaluateRetelling (serbest geri anlatım)', () => {
  beforeEach(() => {
    parse.mockReset()
  })

  const req: RetellRequest = {
    language: 'fr',
    story: 'Un vieil homme vivait près de la mer. Chaque matin, il marchait sur la plage.',
    words: [
      { lemma: 'plage', gloss: 'kumsal' },
      { lemma: 'marcher', gloss: 'yürümek' },
    ],
    retelling: "C'est l'histoire d'un vieil homme. Il aimait marcher sur la plage tous les jours.",
  }

  it('evaluates successful retelling using all target words with Turkish feedback', async () => {
    parse.mockResolvedValueOnce({
      parsed_output: {
        feedback: 'Hikâyeyi çok güzel özetlemişsiniz. Hedef kelimelerin her ikisi de bağlamında doğru ve doğal kullanılmış.',
        corrected: "C'est l'histoire d'un vieil homme. Il aimait marcher sur la plage tous les jours.",
        words: [
          { lemma: 'plage', used: true, correct: true },
          { lemma: 'marcher', used: true, correct: true },
        ],
      },
      stop_reason: 'end_turn',
      usage: { input_tokens: 120, output_tokens: 65 },
    })

    const res = await evaluateRetelling('valid-test-key', req)

    expect(res.feedback).toContain('Hikâyeyi çok güzel özetlemişsiniz')
    expect(res.words).toEqual([
      { lemma: 'plage', used: true, correct: true },
      { lemma: 'marcher', used: true, correct: true },
    ])

    const callArgs = parse.mock.calls[0][0]
    expect(callArgs.system).toContain('Fransızca teacher')
    expect(callArgs.system).toContain('Feedback in Turkish')
    expect(callArgs.messages[0].content).toContain(req.story)
    expect(callArgs.messages[0].content).toContain('plage (kumsal)')
    expect(callArgs.messages[0].content).toContain(req.retelling)
  })

  it('correctly handles partial success where words are missed or need grammatical adjustment', async () => {
    parse.mockResolvedValueOnce({
      parsed_output: {
        feedback: "Hikâyenin ana fikrini aktarmışsınız ancak 'marcher' fiilinin çekimi ve 'plage' kelimesi metinde yer almamış.",
        corrected: "C'est l'histoire d'un homme qui marche sur la plage.",
        words: [
          { lemma: 'plage', used: false, correct: false },
          { lemma: 'marcher', used: true, correct: false },
        ],
      },
      stop_reason: 'end_turn',
      usage: { input_tokens: 110, output_tokens: 50 },
    })

    const res = await evaluateRetelling('valid-test-key', {
      ...req,
      retelling: 'Un homme marchait.',
    })

    expect(res.words[0].used).toBe(false)
    expect(res.words[1].correct).toBe(false)
    expect(res.corrected).toContain('plage')
  })

  it('translates SDK AuthenticationError into user-friendly AiError', async () => {
    parse.mockRejectedValueOnce(new Anthropic.AuthenticationError(401, {}, 'Invalid API Key', new Headers()))

    try {
      await evaluateRetelling('invalid-key', req)
      expect.unreachable('Should have thrown')
    } catch (e) {
      expect(e).toBeInstanceOf(AiError)
      expect((e as AiError).kind).toBe('auth')
      expect((e as AiError).message).toContain('anahtarı')
    }
  })

  it('translates SDK RateLimitError and APIConnectionError into appropriate AiError kinds', async () => {
    parse.mockRejectedValueOnce(new Anthropic.RateLimitError(429, {}, 'Rate exceeded', new Headers()))
    try {
      await evaluateRetelling('key', req)
      expect.unreachable('Should have thrown')
    } catch (e) {
      expect((e as AiError).kind).toBe('rate')
      expect((e as AiError).message).toContain('istek')
    }

    parse.mockRejectedValueOnce(new Anthropic.APIConnectionError({ message: 'Network unreachable' }))
    try {
      await evaluateRetelling('key', req)
      expect.unreachable('Should have thrown')
    } catch (e) {
      expect((e as AiError).kind).toBe('network')
      expect((e as AiError).message).toContain('ulaşılamadı')
    }
  })
})

describe('evaluateTranslation (ters çeviri)', () => {
  beforeEach(() => {
    parse.mockReset()
  })

  const dummyEntry: VocabularyEntry = createEntry(
    { word: 'devoir', meaning: 'ödev / zorunda olmak', partOfSpeech: 'verb' },
    'fr',
    new Date(),
  )

  it('gives correct verdict for a faithful translation even when wording differs from reference', async () => {
    parse.mockResolvedValueOnce({
      parsed_output: {
        verdict: 'correct',
        errorType: 'none',
        corrected: 'Je dois partir immédiatement.',
        feedback: "Kelimeler referans cümleden biraz farklı olsa da 'devoir' doğru kullanılmış ve anlam tam aktarılmış.",
      },
      stop_reason: 'end_turn',
      usage: { input_tokens: 80, output_tokens: 40 },
    })

    const res = await evaluateTranslation(
      'key',
      dummyEntry,
      'Hemen gitmek zorundayım.',
      'Il faut que je parte tout de suite.',
      'Je dois partir immédiatement.',
    )

    expect(res.verdict).toBe('correct')
    expect(res.errorType).toBeUndefined()
    expect(res.feedback).toContain("devoir' doğru kullanılmış")

    const callArgs = parse.mock.calls[0][0]
    expect(callArgs.system).toContain('practising translation into Fransızca')
    expect(callArgs.messages[0].content).toContain('Turkish sentence: Hemen gitmek zorundayım.')
    expect(callArgs.messages[0].content).toContain("Learner's translation: Je dois partir immédiatement.")
  })

  it('diagnoses minor slips (accent/agreement) with near verdict and errorType', async () => {
    parse.mockResolvedValueOnce({
      parsed_output: {
        verdict: 'near',
        errorType: 'accent',
        corrected: 'Je dois téléphoner à ma mère.',
        feedback: "Cümleniz anlaşılır ve doğru kurulmuş; yalnızca 'téléphoner' fiilinin aksanlarına dikkat ediniz.",
      },
      stop_reason: 'end_turn',
      usage: { input_tokens: 75, output_tokens: 35 },
    })

    const res = await evaluateTranslation(
      'key',
      dummyEntry,
      'Annemi aramak zorundayım.',
      'Je dois téléphoner à ma mère.',
      'Je dois telephoner a ma mere.',
    )

    expect(res.verdict).toBe('near')
    expect(res.errorType).toBe('accent')
    expect(res.feedback).toContain('aksanlarına dikkat ediniz')
  })

  it('marks wrong verdict when the target word meaning is incorrect', async () => {
    parse.mockResolvedValueOnce({
      parsed_output: {
        verdict: 'wrong',
        errorType: 'meaning',
        corrected: 'Nous avons des devoirs à faire.',
        feedback: "Hedef 'devoir' kelimesi yerine alakasız bir fiil kullanılmış.",
      },
      stop_reason: 'end_turn',
      usage: { input_tokens: 75, output_tokens: 30 },
    })

    const res = await evaluateTranslation(
      'key',
      dummyEntry,
      'Ödevimiz var.',
      'Nous avons des devoirs à faire.',
      'Nous allons jouer dehors.',
    )

    expect(res.verdict).toBe('wrong')
    expect(res.errorType).toBe('meaning')
  })

  it('handles refusal and parse failure safely', async () => {
    parse.mockResolvedValueOnce({
      stop_reason: 'refusal',
      usage: { input_tokens: 20, output_tokens: 5 },
    })

    try {
      await evaluateTranslation('key', dummyEntry, 'Tr', 'Ref', 'Attempt')
      expect.unreachable('Should have thrown')
    } catch (e) {
      expect((e as AiError).kind).toBe('refusal')
      expect((e as AiError).message).toContain('yanıtlamadı')
    }
  })
})

describe('canlı API koşulu (isteğe bağlı)', () => {
  const liveKey = process.env.ANTHROPIC_API_KEY
  it.runIf(Boolean(liveKey))('live key is tested if available in environment', async () => {
    const { testKey } = await import('./claude')
    await expect(testKey(liveKey!)).resolves.toBeUndefined()
  })
})
