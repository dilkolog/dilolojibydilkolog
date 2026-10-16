// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { canSpeak, isAudioPlaying, speak, speechPrefs, stopSpeaking, voicesFor } from './speech'
import { naturalPlaying, stopNatural } from './naturalVoice'

vi.mock('./naturalVoice', () => ({
  naturalEnabled: vi.fn(() => false),
  naturalPlaying: vi.fn(() => false),
  playNatural: vi.fn(),
  stopNatural: vi.fn(),
}))

vi.mock('../data/instance', () => ({
  db: {
    media: { get: vi.fn() },
  },
}))

describe('speech utilities', () => {
  const originalSpeechSynthesis = window.speechSynthesis
  const originalUtterance = window.SpeechSynthesisUtterance

  const mockVoices = [
    { name: 'Albert', lang: 'en-US', voiceURI: 'albert-uri' },
    { name: 'Samantha (Enhanced)', lang: 'en-US', voiceURI: 'samantha-uri' },
    { name: 'Alex Premium', lang: 'en-US', voiceURI: 'alex-uri' },
    { name: 'Daniel', lang: 'en-GB', voiceURI: 'daniel-uri' },
    { name: 'Thomas', lang: 'fr-FR', voiceURI: 'thomas-uri' },
  ] as unknown as SpeechSynthesisVoice[]

  let mockSynthesis: {
    speaking: boolean
    cancel: ReturnType<typeof vi.fn>
    speak: ReturnType<typeof vi.fn>
    getVoices: ReturnType<typeof vi.fn>
  }

  beforeEach(() => {
    vi.clearAllMocks()
    mockSynthesis = {
      speaking: false,
      cancel: vi.fn(),
      speak: vi.fn(),
      getVoices: vi.fn(() => mockVoices),
    }

    class MockSpeechSynthesisUtterance {
      text: string
      lang = ''
      rate = 1
      voice: SpeechSynthesisVoice | null = null
      constructor(text: string) {
        this.text = text
      }
    }

    Object.defineProperty(window, 'speechSynthesis', {
      value: mockSynthesis,
      writable: true,
      configurable: true,
    })
    Object.defineProperty(window, 'SpeechSynthesisUtterance', {
      value: MockSpeechSynthesisUtterance,
      writable: true,
      configurable: true,
    })
  })

  afterEach(() => {
    Object.defineProperty(window, 'speechSynthesis', {
      value: originalSpeechSynthesis,
      writable: true,
      configurable: true,
    })
    Object.defineProperty(window, 'SpeechSynthesisUtterance', {
      value: originalUtterance,
      writable: true,
      configurable: true,
    })
  })

  describe('canSpeak', () => {
    it('returns true when speechSynthesis exists on window', () => {
      expect(canSpeak()).toBe(true)
    })

    it('returns false when speechSynthesis is undefined', () => {
      // @ts-expect-error deleting property for test
      delete window.speechSynthesis
      expect(canSpeak()).toBe(false)
    })
  })

  describe('voicesFor', () => {
    it('filters by language prefix and excludes novelty voices', () => {
      const enVoices = voicesFor('en')
      // Albert should be excluded by NOVELTY regex
      expect(enVoices.some((v) => v.name === 'Albert')).toBe(false)
      // Premium should be ordered first, then Enhanced, then standard
      expect(enVoices.map((v) => v.name)).toEqual(['Alex Premium', 'Samantha (Enhanced)', 'Daniel'])
    })

    it('returns matching voices for other languages', () => {
      const frVoices = voicesFor('fr')
      expect(frVoices.map((v) => v.name)).toEqual(['Thomas'])
    })
  })

  describe('speak', () => {
    it('cancels previous speech and calls synth.speak with configured rate and voice', () => {
      speechPrefs.voices.en = 'alex-uri'
      speak('hello world', 'en', 0.8)

      expect(mockSynthesis.cancel).toHaveBeenCalled()
      expect(mockSynthesis.speak).toHaveBeenCalledTimes(1)
      const utterance = mockSynthesis.speak.mock.calls[0][0]
      expect(utterance.text).toBe('hello world')
      expect(utterance.rate).toBe(0.8)
      expect(utterance.voice.voiceURI).toBe('alex-uri')
    })
  })

  describe('isAudioPlaying', () => {
    it('detects when speechSynthesis is speaking', () => {
      mockSynthesis.speaking = false
      expect(isAudioPlaying()).toBe(false)

      mockSynthesis.speaking = true
      expect(isAudioPlaying()).toBe(true)
    })

    it('detects when natural voice is playing', () => {
      mockSynthesis.speaking = false
      vi.mocked(naturalPlaying).mockReturnValue(true)
      expect(isAudioPlaying()).toBe(true)
    })
  })

  describe('stopSpeaking', () => {
    it('cancels speech synthesis and stops natural audio', () => {
      stopSpeaking()
      expect(mockSynthesis.cancel).toHaveBeenCalled()
      expect(stopNatural).toHaveBeenCalled()
    })
  })
})
