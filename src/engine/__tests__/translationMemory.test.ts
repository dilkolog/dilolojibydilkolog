import { describe, expect, it } from 'vitest'
import { mergeMemories, recall, remember } from '../translationMemory'

const e = (text: string, translation: string, at: string, from: 'fr' | 'tr' = 'fr', to: 'tr' | 'fr' = 'tr') => ({ text, translation, from, to, at })

describe('translation memory', () => {
  it('keeps each text once, the latest in front, up to a limit', () => {
    let m = remember([], e('Le chat dort.', 'Kedi uyuyor.', '2026-10-01'))
    m = remember(m, e('Il pleut.', 'Yağmur yağıyor.', '2026-10-02'))
    m = remember(m, e('Le chat dort.', 'Kedi uyumakta.', '2026-10-03'))
    expect(m.map((x) => x.translation)).toEqual(['Kedi uyumakta.', 'Yağmur yağıyor.'])
    expect(remember(m, e('Oui.', 'Evet.', '2026-10-04'), 2)).toHaveLength(2)
  })

  it('finds a text by its languages, spaces around ignored', () => {
    const m = [e('Le chat dort.', 'Kedi uyuyor.', '2026-10-01')]
    expect(recall(m, '  Le chat dort. ', 'fr', 'tr')?.translation).toBe('Kedi uyuyor.')
    expect(recall(m, 'Le chat dort.', 'es', 'tr')).toBeUndefined()
  })

  it('two devices merge to every text once, the newer translation, newest first', () => {
    const a = [e('Le chat dort.', 'Kedi uyuyor.', '2026-10-01'), e('Oui.', 'Evet.', '2026-10-05')]
    const b = [e('Le chat dort.', 'Kedi uyumakta.', '2026-10-03')]
    expect(mergeMemories(a, b).map((x) => [x.text, x.translation])).toEqual([
      ['Oui.', 'Evet.'],
      ['Le chat dort.', 'Kedi uyumakta.'],
    ])
    expect(mergeMemories(undefined, undefined)).toEqual([])
  })

  it('handles Date objects and plain {} objects defensively without crashing', () => {
    const a = [{ text: 'Chat', translation: 'Kedi', from: 'fr' as const, to: 'tr' as const, at: new Date('2026-10-05T10:00:00Z') as unknown as string }]
    const b = [{ text: 'Chien', translation: 'Köpek', from: 'fr' as const, to: 'tr' as const, at: {} as unknown as string }]
    expect(() => mergeMemories(a, b)).not.toThrow()
    const merged = mergeMemories(a, b)
    expect(merged.map((x) => x.text)).toEqual(['Chat', 'Chien'])
  })
})
