import { describe, expect, it } from 'vitest'
import { correctionDiff } from '../correctionDiff'

describe('correction diff', () => {
  it('marks removed and added words, keeping the rest', () => {
    const d = correctionDiff('Je suis allé à le marché hier.', 'Je suis allé au marché hier.')
    expect(d.filter((p) => p.kind === 'removed').map((p) => p.text.trim())).toEqual(['à le'])
    expect(d.filter((p) => p.kind === 'added').map((p) => p.text.trim())).toEqual(['au'])
    expect(d.filter((p) => p.kind !== 'removed').map((p) => p.text).join('')).toBe('Je suis allé au marché hier.')
  })

  it('is all "same" when nothing changed', () => {
    expect(correctionDiff('Hola amigo', 'Hola amigo')).toEqual([{ kind: 'same', text: 'Hola amigo' }])
  })
})
