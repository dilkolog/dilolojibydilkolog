import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import type { PartOfSpeech } from '../engine/types'
import { PosTag } from './PosTag'

const ALL: PartOfSpeech[] = ['noun', 'verb', 'adjective', 'adverb', 'preposition', 'conjunction', 'pronoun', 'phrase', 'other']

describe('part of speech tag', () => {
  it('gives every part of speech its own shape and says its name', () => {
    const shapes = ALL.map((p) => renderToStaticMarkup(<PosTag pos={p} />).match(/<svg[^>]*>(.*)<\/svg>/)![1])
    expect(new Set(shapes).size).toBe(ALL.length)
    expect(renderToStaticMarkup(<PosTag pos="verb" label />)).toContain('fiil')
    // Without the visible label the name is still there for a screen reader.
    expect(renderToStaticMarkup(<PosTag pos="noun" />)).toContain('sr-only">isim')
    expect(renderToStaticMarkup(<PosTag pos="adjective" />)).toContain('data-pos="adjective"')
  })
})
