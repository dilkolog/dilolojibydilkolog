import { beforeAll, describe, expect, it } from 'vitest'
import fr from '../../data/tenses/fr.json'
import es from '../../data/tenses/es.json'
import { addTenses, type Tense } from '../tenses'
import { formFeedback, TENSE_BRIDGE, TENSE_GUIDE } from '../tenseGuide'
import { TENSE_BRIEF } from '../tenseBrief'
import '../conjugationData'

beforeAll(() => {
  addTenses('fr', fr as Record<string, unknown>)
  addTenses('es', es as Record<string, unknown>)
})

describe('TENSE_BRIEF and TENSE_GUIDE', () => {
  const commonTenses: Tense[] = [
    'present',
    'passe-compose',
    'imparfait',
    'futur',
    'conditionnel',
    'subjonctif',
    'presente',
    'preterito',
    'perfecto',
    'imperfecto',
    'futuro',
    'condicional',
    'subjuntivo',
  ]

  it('provides complete metadata for each tense', () => {
    for (const tense of commonTenses) {
      const brief = TENSE_BRIEF[tense]
      expect(brief).toBeDefined()
      expect(brief.name.length).toBeGreaterThan(0)
      expect(brief.tr.length).toBeGreaterThan(0)
      expect(brief.short.length).toBeGreaterThan(0)

      const guide = TENSE_GUIDE[tense]
      expect(guide).toBeDefined()
      expect(guide.formation.length).toBeGreaterThan(0)
      expect(guide.examples.length).toBeGreaterThanOrEqual(2)
      for (const [target, tr] of guide.examples) {
        expect(target.length).toBeGreaterThan(0)
        expect(tr.length).toBeGreaterThan(0)
      }
      expect(guide.markers.length).toBeGreaterThan(0)
    }
  })

  it('provides Turkish pedagogical bridge notes and suffixes', () => {
    for (const tense of commonTenses) {
      const bridge = TENSE_BRIDGE[tense]
      expect(bridge).toBeDefined()
      expect(bridge.suffix.length).toBeGreaterThan(0)
      expect(bridge.note.length).toBeGreaterThan(0)
    }
  })
})

describe('formFeedback', () => {
  it('returns undefined for English entries', () => {
    const enEntry = { language: 'en' as const, lemma: 'speak', partOfSpeech: 'verb' as const }
    expect(formFeedback(enEntry, 'present', 'spoke')).toBeUndefined()
  })

  it('returns undefined for unrecognized forms', () => {
    const frEntry = { language: 'fr' as const, lemma: 'parler', partOfSpeech: 'verb' as const }
    expect(formFeedback(frEntry, 'imparfait', 'xyzabc')).toBeUndefined()
  })

  it('gives metalinguistic explanation when user enters a form from another tense', () => {
    const frEntry = { language: 'fr' as const, lemma: 'parler', partOfSpeech: 'verb' as const }
    // 'parlais' belongs to imparfait (or conditionnel), but 'futur' was asked
    const feedback = formFeedback(frEntry, 'futur', 'parlais')
    expect(feedback).toBeDefined()
    expect(feedback).toContain('parlais')
    expect(feedback).toContain('imparfait')
    expect(feedback).toContain('futur simple isteniyor')
  })

  it('detects wrong grammatical person when the tense is correct', () => {
    const frEntry = { language: 'fr' as const, lemma: 'parler', partOfSpeech: 'verb' as const }
    // For imparfait: person 0 is 'parlais'. If asked for person 3 (nous parlions), and user entered 'parlais':
    // tense is imparfait; formFeedback identifies person mismatch:
    const feedback = formFeedback(frEntry, 'imparfait', 'parlions')
    expect(feedback).toBeDefined()
    expect(feedback).toContain('Zaman doğru, kişi değil')
    expect(feedback).toContain('parlions')
    expect(feedback).toContain('nous')
  })

  it('works for Spanish verbs as well', () => {
    const esEntry = { language: 'es' as const, lemma: 'hablar', partOfSpeech: 'verb' as const }
    // 'hablé' is preterito; test when asking for futuro
    const tenseMismatch = formFeedback(esEntry, 'futuro', 'hablé')
    expect(tenseMismatch).toBeDefined()
    expect(tenseMismatch).toContain('pretérito indefinido')
    expect(tenseMismatch).toContain('futuro simple isteniyor')

    // Person check: 'hablaron' in preterito is ellos (unambiguous)
    const personMismatch = formFeedback(esEntry, 'preterito', 'hablaron')
    expect(personMismatch).toBeDefined()
    expect(personMismatch).toContain('Zaman doğru, kişi değil')
    expect(personMismatch).toContain('ellos')
  })
})
