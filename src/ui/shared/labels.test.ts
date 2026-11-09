import { describe, expect, it } from 'vitest'
import {
  ERROR_HINT,
  ERROR_NAME,
  genderRuleText,
  HELLO,
  LANGUAGE_NAME,
  LANGUAGE_SHORT,
  POS_NAME,
  PROMPT_TEXT,
  SKILL_NAME,
  SPEECH_LANG,
  STAGE_NAME,
} from './labels'

describe('labels', () => {
  it('defines greetings, language names and codes for all three target languages', () => {
    for (const lang of ['en', 'fr', 'es'] as const) {
      expect(HELLO[lang]).toBeDefined()
      expect(LANGUAGE_NAME[lang]).toBeDefined()
      expect(LANGUAGE_SHORT[lang]).toBeDefined()
      expect(SPEECH_LANG[lang]).toBeDefined()
    }
    expect(HELLO.en).toBe('Hello!')
    expect(HELLO.fr).toBe('Bonjour !')
    expect(HELLO.es).toBe('¡Hola!')
  })

  it('defines labels for all skills, mastery stages and parts of speech', () => {
    expect(SKILL_NAME.recall).toBe('Hatırlama')
    expect(SKILL_NAME.gender).toBe('Artikel')
    expect(STAGE_NAME.mastered).toBe('Oturdu')
    expect(POS_NAME.noun).toBe('isim')
    expect(POS_NAME.verb).toBe('fiil')
    expect(PROMPT_TEXT.cloze_typed).toBe('Boşluğu doğru biçimle doldur')
  })

  it('provides pedagogic hints for error types', () => {
    expect(ERROR_NAME.false_friend).toBe('Sahte dost')
    expect(ERROR_HINT.false_friend).toContain('başka bir dildeki')
    expect(ERROR_HINT.gender).toContain('cinsiyetine dikkat')
    expect(ERROR_HINT.accent).toContain('Aksan işaretleri')
  })

  describe('genderRuleText', () => {
    it('formats a regular feminine rule for French', () => {
      const text = genderRuleText(
        { rule: { suffix: 'tion', gender: 'f', language: 'fr' }, exception: false },
        'station',
      )
      expect(text).toBe('Kural: -tion ile biten isimler dişildir (la).')
    })

    it('formats an exception rule for French', () => {
      const text = genderRuleText(
        { rule: { suffix: 'tion', gender: 'f', language: 'fr' }, exception: true },
        'bastion',
      )
      expect(text).toBe('İstisna: -tion ile biten isimler genelde dişil (la), ama "bastion" değil.')
    })

    it('formats a regular masculine rule for Spanish', () => {
      const text = genderRuleText(
        { rule: { suffix: 'or', gender: 'm', language: 'es' }, exception: false },
        'amor',
      )
      expect(text).toBe('Kural: -or ile biten isimler erildir (el).')
    })

    it('formats an exception rule for Spanish', () => {
      const text = genderRuleText(
        { rule: { suffix: 'or', gender: 'm', language: 'es' }, exception: true },
        'flor',
      )
      expect(text).toBe('İstisna: -or ile biten isimler genelde eril (el), ama "flor" değil.')
    })
  })
})
