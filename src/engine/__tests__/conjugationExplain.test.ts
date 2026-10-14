import { beforeAll, describe, expect, it } from 'vitest'
import fr from '../../data/tenses/fr.json'
import es from '../../data/tenses/es.json'
import { explainKey, explainRequest } from '../conjugationExplain'
import { addTenses } from '../tenses'
import '../conjugationData'

beforeAll(() => {
  addTenses('fr', fr as Record<string, unknown>)
  addTenses('es', es as Record<string, unknown>)
})

describe('explaining a wrong conjugation', () => {
  it('tells the AI the asked form, the answer, the diagnosis and the whole tense', () => {
    const r = explainRequest('fr', 'aller', 'passe-compose', 3, 'allions')!
    expect(r).toMatchObject({ language: 'fr', verb: 'aller', tense: 'passé composé', subject: 'nous', typed: 'allions', kind: 'Zaman karıştırma' })
    expect(r.expected).toBe('nous sommes allés')
    expect(r.note).toMatch(/imparfait/)
    expect(r.table).toHaveLength(6)
    expect(r.table[0]).toMatch(/^je suis allé/)
  })

  it('names a person mix-up', () => {
    const r = explainRequest('es', 'tener', 'presente', 0, 'tienes')!
    expect(r.kind).toBe('Kişi karıştırma')
    expect(r.expected).toBe('yo tengo')
  })

  it('asks nothing for slips the app already explains, or with no answer or table', () => {
    expect(explainRequest('es', 'hablar', 'presente', 2, 'hablá')).toBeUndefined() // accent
    expect(explainRequest('fr', 'parler', 'futur', 0, 'parlerais')).toBeDefined()
    expect(explainRequest('fr', 'parler', 'futur', 0, '  ')).toBeUndefined()
    expect(explainRequest('fr', 'zzzer', 'futur', 0, 'abc')).toBeUndefined()
  })

  it('keys the same mistake the same way, whatever its case', () => {
    const a = explainRequest('fr', 'aller', 'futur', 0, 'Allerai')!
    const b = explainRequest('fr', 'aller', 'futur', 0, 'allerai')!
    expect(explainKey(a)).toBe(explainKey(b))
  })
})
