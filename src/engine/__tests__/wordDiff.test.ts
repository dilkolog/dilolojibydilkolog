import { describe, expect, it } from 'vitest'
import { wordDiff } from '../wordDiff'

describe('dictation diff', () => {
  it('marks right, accent-only, missed and extra words in order', () => {
    const d = wordDiff('je suis tres fier de fils', 'Je suis très fier de mon fils.')
    expect(d.map((p) => `${p.word}:${p.status}`)).toEqual(['Je:ok', 'suis:ok', 'très:accent', 'fier:ok', 'de:ok', 'mon:missed', 'fils.:ok'])
    expect(wordDiff('nous avons vraiment foi', 'Nous avons foi').map((p) => p.status)).toEqual(['ok', 'ok', 'extra', 'ok'])
  })
})
