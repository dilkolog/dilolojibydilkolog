import { beforeAll, describe, expect, it } from 'vitest'
import fr1 from '../data/tenses/fr.json'
import { addTenses } from './tenses'
import { hasPattern, ownExamples } from './lessonExamples'

beforeAll(() => addTenses('fr', fr1 as Record<string, unknown>))

const fr = [{ title: 'Mon carnet', text: "Hier, j'ai mangé une pomme au marché avec ma sœur. Je ne mange jamais de viande le soir.\n\nDemain nous irons au cinéma avec des amis. Il est parti très tôt ce matin pour son travail." }]

describe('own examples of a lesson', () => {
  it('finds the sentences with a form of the tense the lesson teaches, and marks the form', () => {
    const found = ownExamples('fr', 'basics_fr_passe_compose', 'passe-compose', fr)
    expect(found.map((e) => e.sentence)).toEqual(["Hier, j'ai mangé une pomme au marché avec ma sœur.", 'Il est parti très tôt ce matin pour son travail.'])
    const first = found[0]!
    expect(first.source).toBe('Mon carnet')
    expect(first.sentence.slice(first.mark!.start, first.mark!.end)).toBe("ai mangé")
  })

  it('finds a topic by its pattern, even where a word ends in an accented letter', () => {
    const found = ownExamples('fr', 'negation_fr', undefined, fr)
    expect(found).toHaveLength(1)
    expect(found[0]!.sentence).toContain('ne mange jamais')
    const es = [{ title: 'Diario', text: 'Mi madre está en casa con mis abuelos hoy. Siempre voy a la escuela por la mañana con mi hermano.' }]
    expect(ownExamples('es', 'ser_estar', undefined, es).map((e) => e.sentence)).toEqual(['Mi madre está en casa con mis abuelos hoy.'])
    expect(ownExamples('es', 'por_para', undefined, es)[0]!.sentence).toContain('por la mañana')
  })

  it('English topics go by pattern; a topic with neither a tense nor a pattern shows nothing', () => {
    const en = [{ title: 'Notes', text: 'I have never seen such a big house in my life. She was walking home when it started to rain.' }]
    expect(ownExamples('en', 'present_perfect', undefined, en)[0]!.sentence).toContain('have never seen')
    expect(ownExamples('en', 'basics_en_past_continuous', undefined, en)[0]!.sentence).toContain('was walking')
    expect(ownExamples('en', 'basics_en_demonstratives', undefined, en)).toEqual([])
    expect(hasPattern('basics_en_demonstratives')).toBe(false)
    expect(hasPattern('por_para')).toBe(true)
  })

  it('stops at the most asked for, never repeats a sentence and skips fragments and very long sentences', () => {
    const line = 'Il ne mange jamais de viande le soir.'
    const long = `Il ne mange jamais ${'de la viande très fraîche '.repeat(12)}le soir.`
    const sources = [
      { title: 'A', text: `${line} Non plus.\n${long}` },
      { title: 'B', text: `${line}\nElle ne dort plus la nuit depuis longtemps.\nIls ne parlent jamais de politique ici.\nNous ne voyons personne dans la rue.` },
    ]
    const found = ownExamples('fr', 'negation_fr', undefined, sources, 3)
    expect(found).toHaveLength(3)
    expect(new Set(found.map((e) => e.sentence)).size).toBe(3)
    expect(found.every((e) => e.sentence.length <= 200)).toBe(true)
    expect(found[0]!.source).toBe('A')
  })
})
