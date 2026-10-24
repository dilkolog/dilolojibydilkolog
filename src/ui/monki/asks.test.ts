import { describe, expect, it } from 'vitest'
import { decision } from '../../engine/__tests__/fixtures'
import { habitAsk, lessonAsk, missAsk, sentenceAsk, wordAsk } from './asks'

describe('questions for Monki', () => {
  it('a word page asks about the word with its meaning and an example, and is sent at once', () => {
    const ask = wordAsk(decision)
    expect(ask.send).toBe(true)
    expect(ask.text).toContain(decision.senses[0].gloss)
    expect(ask.text).toContain(decision.senses[0].examples[0].text)
  })

  it('a miss names what was written and what was right', () => {
    const ask = missAsk(decision, 'decisión', 'decision')
    expect(ask.text).toContain('“decisión”')
    expect(ask.text).toContain('doğrusu “decision”')
  })

  it('"I forgot" asks for a way to remember, not for a reason', () => {
    const ask = missAsk(decision, '', 'decision', true)
    expect(ask.text).toContain('hatırlayamadım')
    expect(ask.text).not.toContain('Neden karıştırmış')
  })

  it('a long sentence is cut so the question stays small', () => {
    expect(sentenceAsk('x'.repeat(2000), 'x').text.length).toBeLessThanOrEqual(700)
  })

  it('a word that keeps going wrong says so, a word that went wrong once or twice does not', () => {
    expect(missAsk(decision, 'x', 'decision', false, { wrong: 5, reviews: 9 }).text).toContain('9 denemenin 5 tanesinde')
    expect(missAsk(decision, 'x', 'decision', false, { wrong: 2, reviews: 9 }).text).not.toContain('denemenin')
    expect(missAsk(decision, 'x', 'decision').text).not.toContain('denemenin')
  })

  it('a lesson is asked for again with its summary, and a wrong answer in it comes along', () => {
    const rules = ['Birinci kural uzun uzun anlatılır.', 'İkinci kural.', 'Üçüncü kural hiç gitmez.']
    const plain = lessonAsk('Subjonctif', 'Şüphe ve istek bildirir.', rules)
    expect(plain.send).toBe(true)
    expect(plain.text).toContain('“Subjonctif” dersini')
    expect(plain.text).toContain('Şüphe ve istek bildirir.')
    expect(plain.text).not.toContain('Üçüncü kural')
    const withQuestion = lessonAsk('Subjonctif', 'Özet.', rules, { prompt: 'Il faut que tu ___', chosen: 'viens', right: 'viennes' })
    expect(withQuestion.text).toContain('“Il faut que tu ___”')
    expect(withQuestion.text).toContain('“viens” seçtim, doğrusu “viennes”')
  })

  it('a kind of mistake that keeps coming back is asked about with its examples', () => {
    const ask = habitAsk('Artikel', 6, [{ wrong: 'le maison', fix: 'la maison' }, { wrong: 'un idée', fix: 'une idée' }, { wrong: 'x', fix: 'y' }])
    expect(ask.text).toContain('“Artikel” türünde 6 hata')
    expect(ask.text).toContain('“le maison” → “la maison”')
    expect(ask.text).not.toContain('“x”')
  })
})
