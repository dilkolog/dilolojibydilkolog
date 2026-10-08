import { beforeAll, describe, expect, it } from 'vitest'
import fr from '../../data/tenses/fr.json'
import es from '../../data/tenses/es.json'
import '../../engine/conjugationData'
import { addTenses } from '../../engine/tenses'
import { CORE_TENSES } from './labShared'
import { clozeRight, clozesFor } from './sentenceCloze'
import { twinOf } from './tenseTwin'

beforeAll(() => {
  addTenses('fr', fr as Record<string, unknown>)
  addTenses('es', es as Record<string, unknown>)
})

describe('a verb in a real sentence', () => {
  it('cuts out the conjugated form and names its tense', () => {
    const [a, b] = clozesFor('es', 'tener', [['No tenemos clase hoy.', 'Bugün dersimiz yok.'], ['—Vamos —me dijo él.', 'O dedi.']], CORE_TENSES.es)
    expect(a).toMatchObject({ tense: 'presente', before: 'No ', form: 'tenemos', after: ' clase hoy.', translation: 'Bugün dersimiz yok.' })
    // A sentence without the verb is skipped.
    expect(b).toBeUndefined()
    const [d] = clozesFor('es', 'decir', [['—Vamos —me dijo él.', 'O dedi.']], CORE_TENSES.es)
    expect(d).toMatchObject({ tense: 'preterito', form: 'dijo' })
  })

  it('takes a compound tense whole, after an elision or before -tu', () => {
    expect(clozesFor('fr', 'manquer', [["Je t'ai manqué ?", 'Beni özledin mi?']], CORE_TENSES.fr)[0]).toMatchObject({ tense: 'passe-compose', before: "Je t'", form: 'ai manqué' })
    expect(clozesFor('fr', 'avoir', [["J'ai un rêve.", 'Bir hayalim var.']], CORE_TENSES.fr)[0]).toMatchObject({ tense: 'present', form: 'ai' })
    expect(clozesFor('fr', 'parler', [['De quoi parles-tu ?', 'Neden bahsediyorsun?']], CORE_TENSES.fr)[0]).toMatchObject({ form: 'parles', after: '-tu ?' })
    // An infinitive is no tense.
    expect(clozesFor('fr', 'prendre', [['Je dois prendre des médicaments.', 'İlaç almalıyım.']], CORE_TENSES.fr)).toEqual([])
  })

  it('checks the answer without minding capitals or spaces, but minding accents', () => {
    const [c] = clozesFor('es', 'decir', [['Me dijo que sí.', 'Bana evet dedi.']], CORE_TENSES.es)
    expect(clozeRight(c, ' Dijo ', 'es')).toBe(true)
    expect(clozeRight(c, 'dije', 'es')).toBe(false)
  })
})

describe('the same verb in the other language', () => {
  it('pairs the tense and says where use differs', () => {
    const t = twinOf('fr', 'parler', 'passe-compose', ['hablar'])!
    expect(t).toMatchObject({ language: 'es', verb: 'hablar', tense: 'preterito' })
    expect(t.forms[0]).toBe('hablé')
    expect(t.notes[0]).toContain('indefinido')
    expect(twinOf('es', 'decidir', 'presente', ['décider'])).toMatchObject({ language: 'fr', verb: 'décider', tense: 'present', notes: [] })
  })

  it('notes être in French compound tenses, and skips translations without a table', () => {
    const t = twinOf('es', 'ir', 'perfecto', ['zzz', 'aller'])!
    expect(t.verb).toBe('aller')
    expect(t.notes.some((n) => n.includes('être'))).toBe(true)
    expect(twinOf('fr', 'parler', 'present', ['zzz'])).toBeNull()
  })
})
