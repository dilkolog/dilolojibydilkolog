import { describe, expect, it } from 'vitest'
import { checkGap, gapsFor, lyricLines, scoreGaps } from '../lyrics'

describe('lyricLines', () => {
  it('drops a line repeated right after itself, empty and very long lines', () => {
    const cue = (start: number, text: string) => ({ start, end: start + 2, text })
    const lines = lyricLines([cue(0, 'Je ne regrette rien'), cue(2, 'je ne regrette rien'), cue(4, '  '), cue(6, 'x'.repeat(120)), cue(8, 'Ni le bien'), cue(10, 'Je ne regrette rien')])
    expect(lines.map((l) => l.text)).toEqual(['Je ne regrette rien', 'Ni le bien', 'Je ne regrette rien'])
    expect(lines[1].start).toBe(8)
  })
})

describe('gapsFor', () => {
  const whole = (parts: ReturnType<typeof gapsFor>) => parts.map((p) => ('gap' in p ? `[${p.gap}]` : p.text)).join('')
  it('easy takes the longest word of the line', () => {
    expect(whole(gapsFor('Je ne regrette rien du tout', 'fr', 'easy'))).toBe('Je ne [regrette] rien du tout')
  })
  it('medium takes every fourth word that can go (the first, the fifth…); hard takes them all', () => {
    const line = 'Chaque matin marchons doucement lumineuse forêt tranquille silence'
    const words = (level: 'medium' | 'hard') => gapsFor(line, 'fr', level).flatMap((p) => ('gap' in p ? [p.gap] : []))
    const hard = words('hard')
    expect(hard.length).toBeGreaterThanOrEqual(6)
    expect(words('medium')).toEqual(hard.filter((_, i) => i % 4 === 0))
  })
  it('takes only the word after an elision, and leaves a line with nothing to take out whole', () => {
    expect(whole(gapsFor("C'est l'amour qui revient", 'fr', 'hard'))).toBe("C'est l'[amour] qui [revient]")
    expect(gapsFor('Oh oh oh', 'fr', 'easy')).toEqual([{ text: 'Oh oh oh' }])
  })
})

describe('checkGap', () => {
  it('is right, close for accents or one slip in a longer word, wrong otherwise', () => {
    expect(checkGap('Regrette', 'regrette')).toBe('correct')
    expect(checkGap('aime', 'aimé')).toBe('near')
    expect(checkGap('regrete', 'regrette')).toBe('near')
    expect(checkGap('mur', 'mer')).toBe('wrong')
    expect(checkGap('', 'mer')).toBe('wrong')
  })
})

describe('scoreGaps', () => {
  it('counts right and close as right', () => {
    expect(scoreGaps(['correct', 'near', 'wrong', 'wrong'])).toEqual({ total: 4, right: 2, percent: 50 })
    expect(scoreGaps([])).toEqual({ total: 0, right: 0, percent: 0 })
  })
})
