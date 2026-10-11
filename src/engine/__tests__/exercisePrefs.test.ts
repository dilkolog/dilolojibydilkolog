import { describe, expect, it } from 'vitest'
import { effectivePrefs, engineFlags, PREF_TYPES } from '../exercisePrefs'

describe('exercisePrefs', () => {
  it('lists each tunable type once, never the meaning choice or typing from the meaning', () => {
    const types = PREF_TYPES.map((p) => p.type)
    expect(new Set(types).size).toBe(types.length)
    expect(types).not.toContain('mc_meaning')
    expect(types).not.toContain('typed_translation')
  })

  it('turns the saved preferences into engine options', () => {
    expect(engineFlags({ cloze_typed: 'off', dictation: 'less', mc_context: 'less' })).toEqual({ off: ['cloze_typed'], less: ['dictation', 'mc_context'] })
    expect(engineFlags(undefined)).toEqual({ off: undefined, less: undefined })
    // A type that is not tunable is ignored, even if saved.
    expect(engineFlags({ mc_meaning: 'off' } as never)).toEqual({ off: undefined, less: undefined })
  })

  it('reads the first form of the setting (typedBlanks false) as the typed blank off, until the list says otherwise', () => {
    expect(effectivePrefs(undefined, false)).toEqual({ cloze_typed: 'off' })
    expect(engineFlags(undefined, false).off).toEqual(['cloze_typed'])
    expect(effectivePrefs({ cloze_typed: 'less' }, false)).toEqual({ cloze_typed: 'less' })
    expect(effectivePrefs({}, true)).toEqual({})
  })
})
