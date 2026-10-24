import { describe, expect, it } from 'vitest'
import { addNotes, cleanNotes, MAX_NOTES, MAX_NOTE_LENGTH, memoryLines, removeNote, type MemoryNote } from '../monkiMemory'

let n = 0
const id = () => `n${++n}`
const note = (text: string, at = '2026-10-20'): MemoryNote => ({ id: id(), text, at })

describe('Monki memory', () => {
  it('adds the new notes, trimmed and collapsed', () => {
    const out = addNotes([], ['  ser ve estar   karışıyor ', ''], '2026-10-24', id)
    expect(out).toHaveLength(1)
    expect(out[0]).toMatchObject({ text: 'ser ve estar karışıyor', at: '2026-10-24' })
  })

  it('does not add what is already remembered (accents, case and punctuation aside)', () => {
    const have = [note('Passé composé ile imparfait karışıyor.')]
    expect(addNotes(have, ['passe compose ile IMPARFAIT karisiyor'], '2026-10-24', id)).toHaveLength(1)
    expect(addNotes(have, ['Subjonctif zor geliyor'], '2026-10-24', id)).toHaveLength(2)
  })

  it('keeps at most MAX_NOTES, the newest', () => {
    const have = Array.from({ length: MAX_NOTES }, (_, i) => note(`not ${i}`))
    const out = addNotes(have, ['yeni bir not'], '2026-10-24', id)
    expect(out).toHaveLength(MAX_NOTES)
    expect(out[out.length - 1].text).toBe('yeni bir not')
    expect(out[0].text).toBe('not 1')
  })

  it('cuts a long note to a line', () => {
    const out = addNotes([], ['a'.repeat(500)], '2026-10-24', id)
    expect(out[0].text).toHaveLength(MAX_NOTE_LENGTH)
  })

  it('reads a stored value defensively', () => {
    expect(cleanNotes('x')).toEqual([])
    expect(cleanNotes([null, 3, { id: 1 }, { id: 'a', text: '  ', at: 'x' }, { id: 'b', text: 'iyi', at: '2026-01-01' }, { id: 'c', text: 'İYİ', at: '2026-01-02' }])).toEqual([{ id: 'b', text: 'iyi', at: '2026-01-01' }])
  })

  it('removes one note and lists the lines in order', () => {
    const a = note('bir')
    const b = note('iki')
    expect(memoryLines(removeNote([a, b], a.id))).toEqual(['iki'])
  })
})
