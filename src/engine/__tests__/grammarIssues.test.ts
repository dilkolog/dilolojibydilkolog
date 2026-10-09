import { describe, expect, it } from 'vitest'
import { applyFix, markIssues, type GrammarIssue } from '../grammarIssues'

const text = 'Je suis allé a la plage et il fesait beau.'
const accent: GrammarIssue = { offset: 13, length: 1, message: 'à', replacements: ['à'], kind: 'grammar' }
const typo: GrammarIssue = { offset: 30, length: 6, message: 'typo', replacements: ['faisait'], kind: 'spelling' }

describe('grammar issues', () => {
  it('cuts the text into plain and flagged stretches', () => {
    expect(markIssues(text, [typo, accent]).map((p) => (p.issue ? `[${p.text}]` : p.text)).join('')).toBe('Je suis allé [a] la plage et il [fesait] beau.')
  })
  it('applies a suggestion and moves the issues after it', () => {
    const fixed = applyFix(text, [accent, typo], typo, 'faisait')
    expect(fixed.text).toBe('Je suis allé a la plage et il faisait beau.')
    expect(fixed.issues).toEqual([accent])
    const both = applyFix(text, [accent, typo], accent, 'à la')
    expect(both.text).toBe('Je suis allé à la la plage et il fesait beau.')
    expect(both.issues[0]).toMatchObject({ offset: 33, length: 6 })
    expect(both.text.slice(both.issues[0].offset, both.issues[0].offset + 6)).toBe('fesait')
  })
})
