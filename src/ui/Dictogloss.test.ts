import { describe, expect, it } from 'vitest'
import { glossParagraphs, recallCheck } from './Dictogloss'

describe('dictogloss', () => {
  it('takes paragraphs of a workable length', () => {
    const long = Array(40).fill('mot').join(' ')
    expect(glossParagraphs([`court.\n\n${long}\n\n${Array(200).fill('x').join(' ')}`])).toEqual([long])
  })

  it('marks which content words came back, ignoring function words and inflection', () => {
    const r = recallCheck('Le gouvernement a annoncé une nouvelle réforme des retraites.', 'le gouvernement annonce une réforme', 'fr')
    const content = r.filter((t) => t.content).map((t) => `${t.token.replace(/\W+$/u, '')}:${t.recalled}`)
    expect(content).toContain('gouvernement:true')
    expect(content).toContain('réforme:true')
    expect(content).toContain('retraites:false')
    expect(r.find((t) => t.token === 'Le')?.content).toBe(false)
  })
})
