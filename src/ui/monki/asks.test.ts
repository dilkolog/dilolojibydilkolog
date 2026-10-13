import { describe, expect, it } from 'vitest'
import { decision } from '../../engine/__tests__/fixtures'
import { missAsk, sentenceAsk, wordAsk } from './asks'

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
})
