import { describe, expect, it } from 'vitest'
import { diffScore, wordDiff } from '../wordDiff'

describe('dictation diff', () => {
  it('marks right, accent-only, missed and extra words in order', () => {
    const d = wordDiff('je suis tres fier de fils', 'Je suis très fier de mon fils.')
    expect(d.map((p) => `${p.word}:${p.status}`)).toEqual(['Je:ok', 'suis:ok', 'très:accent', 'fier:ok', 'de:ok', 'mon:missed', 'fils.:ok'])
    expect(wordDiff('nous avons vraiment foi', 'Nous avons foi').map((p) => p.status)).toEqual(['ok', 'ok', 'extra', 'ok'])
  })
})

describe('diffScore', () => {
  it('counts the original words written, accents as written, extras aside', () => {
    expect(diffScore(wordDiff('le chat dors bien sur', 'Le chat dort sur le canapé.'))).toEqual({ right: 3, total: 6, missed: ['dort', 'le', 'canapé.'] })
    expect(diffScore(wordDiff('Il etait la', 'Il était là'))).toEqual({ right: 3, total: 3, missed: [] })
  })
})
