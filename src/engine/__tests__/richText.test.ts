import { describe, expect, it } from 'vitest'
import { parseRich, richHtml, richPlain, wrapSelection } from '../richText'

describe('parseRich', () => {
  it('bold, italic and highlight, nested and side by side', () => {
    expect(parseRich('a **b** _c_ ==d== **_e_**')).toEqual([
      { text: 'a ' },
      { text: 'b', bold: true },
      { text: ' ' },
      { text: 'c', italic: true },
      { text: ' ' },
      { text: 'd', mark: true },
      { text: ' ' },
      { text: 'e', bold: true, italic: true },
    ])
  })

  it('leaves what is not a closed pair alone: stray marks, snake_case, a lone underscore', () => {
    expect(richPlain('snake_case_name')).toBe('snake_case_name')
    expect(richPlain('a ** b')).toBe('a ** b')
    expect(richPlain('un _ seul')).toBe('un _ seul')
    expect(richPlain('**ouvert')).toBe('**ouvert')
    expect(parseRich('_a b')).toEqual([{ text: '_a b' }])
  })

  it('works without marks and with accents', () => {
    expect(parseRich('plain')).toEqual([{ text: 'plain' }])
    expect(richPlain('**café** et _l’été_')).toBe('café et l’été')
  })
})

describe('richHtml', () => {
  it('escapes what is typed and wraps the marks', () => {
    expect(richHtml('<b>x</b> **y** ==z==')).toBe('&lt;b&gt;x&lt;/b&gt; <b>y</b> <mark>z</mark>')
  })
})

describe('wrapSelection', () => {
  it('wraps a selection and keeps it selected', () => {
    expect(wrapSelection('un mot ici', 3, 6, '**')).toEqual({ value: 'un **mot** ici', start: 5, end: 8 })
  })
  it('puts the marks in with the caret between them when nothing is selected', () => {
    expect(wrapSelection('ab', 1, 1, '_')).toEqual({ value: 'a__b', start: 2, end: 2 })
  })
  it('takes the marks off again, whether they are inside or just outside the selection', () => {
    expect(wrapSelection('un **mot** ici', 3, 10, '**')).toEqual({ value: 'un mot ici', start: 3, end: 6 })
    expect(wrapSelection('un **mot** ici', 5, 8, '**')).toEqual({ value: 'un mot ici', start: 3, end: 6 })
  })
})
