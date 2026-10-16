import { beforeAll, describe, expect, it } from 'vitest'
import { loadTenses } from '../../data/tenseData'
import { otherLab, twinOf } from './tenseTwin'

describe('tenseTwin', () => {
  beforeAll(async () => {
    await loadTenses('fr')
    await loadTenses('es')
  })
  describe('otherLab', () => {
    it('switches between fr and es', () => {
      expect(otherLab('fr')).toBe('es')
      expect(otherLab('es')).toBe('fr')
    })
  })

  describe('twinOf', () => {
    it('returns null if tense has no twin mapping', () => {
      // @ts-expect-error testing invalid tense input
      expect(twinOf('fr', 'parler', 'nonexistent_tense', ['hablar'])).toBeNull()
    })

    it('returns null if none of the candidates conjugate in the other language', () => {
      expect(twinOf('fr', 'parler', 'present', ['xyznonexistentverb'])).toBeNull()
    })

    it('matches French present to Spanish presente with conjugated forms', () => {
      const twin = twinOf('fr', 'parler', 'present', ['hablar'])
      expect(twin).not.toBeNull()
      expect(twin?.language).toBe('es')
      expect(twin?.verb).toBe('hablar')
      expect(twin?.tense).toBe('presente')
      expect(twin?.forms).toHaveLength(6)
      expect(twin?.forms[0]).toBe('hablo')
    })

    it('matches French passé composé to Spanish pretérito with pedagogical difference note', () => {
      const twin = twinOf('fr', 'parler', 'passe-compose', ['hablar'])
      expect(twin).not.toBeNull()
      expect(twin?.tense).toBe('preterito')
      expect(twin?.notes.some((n) => n.includes('indefinido'))).toBe(true)
    })

    it('adds être vs haber note when French uses être in compound tenses', () => {
      const twin = twinOf('fr', 'aller', 'passe-compose', ['ir'])
      expect(twin).not.toBeNull()
      expect(twin?.notes.some((n) => n.includes('être'))).toBe(true)
    })
  })
})
