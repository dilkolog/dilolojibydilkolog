import { beforeAll, describe, expect, it } from 'vitest'
import fr from '../../data/tenses/fr.json'
import es from '../../data/tenses/es.json'
import { addTenses } from '../tenses'
import { verbFormsOf } from '../verbLookup'
import '../conjugationData'

beforeAll(() => {
  addTenses('fr', fr as Record<string, unknown>)
  addTenses('es', es as Record<string, unknown>)
})

describe('the verb a typed form belongs to', () => {
  it('finds the infinitive with the tense and person', () => {
    expect(verbFormsOf('es', 'renuncié')[0]).toEqual({ lemma: 'renunciar', note: 'pretérito indefinido, yo' })
    expect(verbFormsOf('fr', 'allions')[0]).toMatchObject({ lemma: 'aller', note: expect.stringMatching(/^imparfait, nous/) })
  })

  it('reads a compound tense typed with its auxiliary', () => {
    expect(verbFormsOf('fr', "j'ai mangé")[0]).toMatchObject({ lemma: 'manger', note: 'passé composé' })
  })

  it('says nothing for English, an infinitive or a word no table has', () => {
    expect(verbFormsOf('en', 'went')).toEqual([])
    expect(verbFormsOf('fr', 'xyzzy')).toEqual([])
    expect(verbFormsOf('es', '  ')).toEqual([])
  })
})
