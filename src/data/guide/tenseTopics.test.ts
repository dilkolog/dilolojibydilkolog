import { describe, expect, it } from 'vitest'
import { lessonFor } from './lessonOf'
import { LESSON_TENSE, topicOfTense } from './tenseTopics'

describe('tenses and their lessons', () => {
  it('every tense lesson named here exists as a lesson of the guide', () => {
    for (const topic of Object.keys(LESSON_TENSE)) {
      const language = topic.includes('_fr') || topic.startsWith('basics_fr') || ['passe_imparfait', 'futur_fr', 'conditionnel_passe', 'subjonctif'].includes(topic) ? 'fr' : 'es'
      expect(lessonFor(language, topic), topic).toBeDefined()
    }
  })

  it('finds the topic of a tense, and nothing for a tense without a lesson', () => {
    expect(topicOfTense('passe-compose')).toBe('basics_fr_passe_compose')
    expect(topicOfTense('subjuntivo')).toBe('subjuntivo')
    expect(topicOfTense('infinitif-passe')).toBeUndefined()
  })
})
