import { describe, expect, it } from 'vitest'
import { dialogueOrder, recordDialogue, type Dialogue } from '../dialogues'

const d = (id: string, level: Dialogue['level']): Dialogue => ({ id, language: 'fr', level, title: id, scene: '', turns: [] })
const ALL = [d('b1', 'B1'), d('a2', 'A2'), d('a1', 'A1'), d('a1b', 'A1')]

describe('dialogues', () => {
  it('offers the untried first, easier first, then the ones that went worst', () => {
    expect(dialogueOrder(ALL, {}, 'fr').map((x) => x.id)).toEqual(['a1', 'a1b', 'a2', 'b1'])
    expect(dialogueOrder(ALL, { a1: 1, a1b: 0.4 }, 'fr').map((x) => x.id)).toEqual(['a2', 'b1', 'a1b', 'a1'])
    expect(dialogueOrder(ALL, {}, 'fr', 'A1').map((x) => x.id)).toEqual(['a1', 'a1b'])
    expect(dialogueOrder(ALL, {}, 'es')).toEqual([])
  })

  it('keeps the best result', () => {
    expect(recordDialogue(recordDialogue({}, 'a1', 0.8), 'a1', 0.4)).toEqual({ a1: 0.8 })
    expect(recordDialogue({}, 'a1', 3)).toEqual({ a1: 1 })
  })
})
