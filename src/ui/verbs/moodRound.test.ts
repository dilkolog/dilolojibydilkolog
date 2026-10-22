import { beforeAll, describe, expect, it } from 'vitest'
import fr from '../../data/tenses/fr.json'
import es from '../../data/tenses/es.json'
import '../../engine/conjugationData'
import { addTenses } from '../../engine/tenses'
import { moodRound } from './moodRound'

beforeAll(() => {
  addTenses('fr', fr as Record<string, unknown>)
  addTenses('es', es as Record<string, unknown>)
})

const FR = ['venir', 'faire', 'pouvoir', 'aller', 'prendre', 'savoir', 'vouloir', 'dire', 'avoir', 'être', 'finir', 'partir']
const ES = ['tener', 'hacer', 'poder', 'decir', 'venir', 'salir', 'ser', 'estar', 'ir', 'hablar', 'comer', 'vivir']

describe('subjunctive or not, être or avoir', () => {
  it('offers two real, different forms and marks the one the trigger calls for', () => {
    for (const seed of [1, 2, 3]) {
      const round = moodRound('es', ES, seed)
      expect(round.length).toBeGreaterThanOrEqual(6)
      for (const q of round) {
        expect(q.options).toHaveLength(2)
        expect(new Set(q.options).size).toBe(2)
        expect(q.options).toContain(q.answer)
      }
    }
  })

  it('il faut que asks for the subjunctive, je pense que for the indicative', () => {
    const qs = Array.from({ length: 12 }, (_, s) => moodRound('fr', FR, s)).flat().filter((q) => q.kind === 'mood')
    const faut = qs.find((q) => q.before.startsWith('Il faut') && q.verb === 'venir')
    if (faut) expect(['viennes', 'vienne', 'venions', 'veniez', 'viennent']).toContain(faut.answer)
    const pense = qs.find((q) => q.before.startsWith('Je pense '))!
    expect(pense.why).toContain('haber kipi')
    // Never "que je" in French: the blank can't show "j'aille".
    expect(qs.some((q) => /que je$/.test(q.before))).toBe(false)
  })

  it('a verb used only reflexively is never asked as être-or-avoir (its pronoun would be the "auxiliary")', () => {
    const aux = Array.from({ length: 12 }, (_, s) => moodRound('fr', ['souvenir', 'méfier', 'enfuir', ...FR], s)).flat().filter((q) => q.kind === 'aux')
    expect(aux.filter((q) => ['souvenir', 'méfier', 'enfuir'].includes(q.verb))).toEqual([])
    for (const q of aux) expect(q.options.every((o) => !/['’]/.test(o) && !['nous', 'vous', 'me', 'te', 'se'].includes(o))).toBe(true)
  })

  it('French rounds also ask être or avoir in the passé composé', () => {
    const aux = Array.from({ length: 6 }, (_, s) => moodRound('fr', FR, s)).flat().filter((q) => q.kind === 'aux')
    expect(aux.length).toBeGreaterThan(0)
    const etre = aux.find((q) => ['aller', 'venir', 'partir', 'arriver', 'tomber', 'rester', 'naître', 'mourir'].includes(q.verb))
    expect(etre && ['es', 'est', 'sommes', 'êtes', 'sont']).toContain(etre!.answer)
    expect(moodRound('es', ES, 1).every((q) => q.kind === 'mood')).toBe(true)
  })
})
