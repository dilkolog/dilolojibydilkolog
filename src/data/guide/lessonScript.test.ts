import { describe, expect, it } from 'vitest'
import { lessonScript } from './lessonScript'
import { lessonFor, lessonTitle } from './lessonOf'

describe('lesson read aloud', () => {
  it('goes name, rules, examples (language then Turkish), warnings, tip, each part with a Turkish heading', () => {
    const lesson = lessonFor('fr', 'subjonctif')!
    const script = lessonScript(lesson, lessonTitle(lesson))
    expect(script[0]).toEqual({ lang: 'tr', text: expect.stringContaining('Subjonctif') })
    expect(script.some((u) => u.text === 'Kurallar.')).toBe(true)
    const at = script.findIndex((u) => u.text === 'Örnekler.')
    expect(script[at + 1]).toEqual({ lang: 'fr', text: lesson.examples[0]!.text.replace(/[*_`#]/g, '') })
    expect(script[at + 2]!.lang).toBe('tr')
    expect(script.every((u) => u.text.trim().length > 0 && !/[*_`#]/.test(u.text))).toBe(true)
    // Only Turkish and the language being learnt, so each stretch has the right voice.
    expect(new Set(script.map((u) => u.lang))).toEqual(new Set(['tr', 'fr']))
  })
})
