import { describe, expect, it } from 'vitest'
import { diffScore, twoWayDiff, wordDiff } from '../wordDiff'

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

describe('twoWayDiff', () => {
  it('separates user words (with extra/accent) and expected words (with missed/accent)', () => {
    const res = twoWayDiff('le petit chat dors', 'Le chat dort sur le canapé.')
    expect(res.user).toEqual([
      { word: 'le', status: 'ok' },
      { word: 'petit', status: 'extra' },
      { word: 'chat', status: 'ok' },
      { word: 'dors', status: 'extra' },
    ])
    expect(res.expected).toEqual([
      { word: 'Le', status: 'ok' },
      { word: 'chat', status: 'ok' },
      { word: 'dort', status: 'missed' },
      { word: 'sur', status: 'missed' },
      { word: 'le', status: 'missed' },
      { word: 'canapé.', status: 'missed' },
    ])
  })

  it('marks accent differences cleanly in both user and expected parts', () => {
    const res = twoWayDiff('Il etait la', 'Il était là')
    expect(res.user).toEqual([
      { word: 'Il', status: 'ok' },
      { word: 'etait', status: 'accent' },
      { word: 'la', status: 'accent' },
    ])
    expect(res.expected).toEqual([
      { word: 'Il', status: 'ok' },
      { word: 'était', status: 'accent' },
      { word: 'là', status: 'accent' },
    ])
  })

  it('handles empty input properly', () => {
    const res = twoWayDiff('', 'Bonjour tout le monde')
    expect(res.user).toEqual([])
    expect(res.expected.map((p) => p.status)).toEqual(['missed', 'missed', 'missed', 'missed'])
  })
})
