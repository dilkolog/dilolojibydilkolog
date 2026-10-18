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

/** One sentence the pattern of a topic must find (and the stretch it marks) and one it must leave alone. */
const SAMPLES: Record<string, { lang: 'fr' | 'es' | 'en'; yes: string; marks: string; no: string }> = {
  basics_fr_etre_avoir: { lang: 'fr', yes: 'Nous sommes très contents de vous voir ici.', marks: 'Nous sommes', no: 'Voici une phrase sans aucun verbe conjugué ici.' },
  articles_quantite: { lang: 'fr', yes: 'Je voudrais du pain et beaucoup de fromage ce soir.', marks: 'du pain', no: 'Nous allons au marché avec nos amis demain matin.' },
  prep_fr: { lang: 'fr', yes: "J'ai décidé de partir très tôt demain matin.", marks: 'décidé de partir', no: 'Nous allons au marché avec nos amis demain matin.' },
  basics_fr_questions: { lang: 'fr', yes: 'Où est-ce que tu habites depuis ton déménagement ?', marks: 'Où', no: 'Je sais où il habite depuis son déménagement.' },
  basics_fr_prepositions_geographie: { lang: 'fr', yes: 'Elle habite à Paris et travaille en Espagne maintenant.', marks: 'à Paris', no: 'Elle habite dans une petite maison près de la forêt.' },
  basics_fr_pronominaux: { lang: 'fr', yes: 'Je me lève toujours très tôt le dimanche matin.', marks: 'me lève', no: 'Je le vois toujours très tôt le dimanche matin.' },
  basics_fr_ordre_pronoms: { lang: 'fr', yes: 'Elle me le donne chaque matin avant de partir.', marks: 'me le donne', no: 'Elle donne un livre chaque matin avant de partir.' },
  basics_fr_adverbes: { lang: 'fr', yes: 'Il parle vraiment très bien le français maintenant.', marks: 'vraiment', no: 'Le gouvernement a changé cette règle il y a un moment.' },
  basics_fr_mise_en_relief: { lang: 'fr', yes: "C'est Marie qui a trouvé la solution hier soir.", marks: "C'est Marie qui", no: "Marie a trouvé la solution hier soir tout de suite." },
  basics_fr_accords_pronominaux_cod: { lang: 'fr', yes: "Elle s'est lavée avant de sortir ce matin.", marks: "s'est lavée", no: 'Elle a mangé avant de sortir ce matin.' },
  basics_es_posesivos: { lang: 'es', yes: 'Mi hermano vive en esta casa con su familia.', marks: 'Mi hermano', no: 'Hoy hace calor y vamos a la playa juntos.' },
  basics_es_preguntas: { lang: 'es', yes: '¿Dónde vives desde que cambiaste de trabajo?', marks: 'Dónde', no: 'No sé dónde vive desde que cambió de trabajo.' },
  basics_es_reflexivos: { lang: 'es', yes: 'Siempre me levanto muy temprano los domingos.', marks: 'me levanto', no: 'Siempre leo el periódico muy temprano los domingos.' },
  basics_es_a_personal: { lang: 'es', yes: 'Ayer vi a mi hermano en la estación de tren.', marks: 'vi a mi', no: 'Ayer vi una película muy buena en el cine.' },
  basics_es_marcadores: { lang: 'es', yes: 'El plan era bueno; sin embargo, nadie lo aceptó ayer.', marks: 'sin embargo', no: 'El plan era bueno y todos lo aceptaron ayer mismo.' },
  basics_es_verbos_cambio: { lang: 'es', yes: 'Cuando oyó la noticia se puso muy contento.', marks: 'se puso', no: 'Cuando oyó la noticia salió de casa corriendo.' },
  basics_es_lo_neutro: { lang: 'es', yes: 'Lo bueno es que todo salió bien al final.', marks: 'Lo bueno', no: 'Todo salió bien al final del día de ayer.' },
  basics_es_si_condicionales_subjuntivo: { lang: 'es', yes: 'Si tuviera más tiempo, viajaría por todo el mundo.', marks: 'Si tuviera', no: 'Si tengo tiempo, viajo por todo el mundo siempre.' },
  basics_es_perifrasis_inicio_fin: { lang: 'es', yes: 'Ayer se puso a llover y dejó de trabajar.', marks: 'puso a llover', no: 'Ayer llovió mucho y nadie quiso salir de casa.' },
  basics_en_to_be: { lang: 'en', yes: "I'm very happy to see you here today.", marks: "I'm", no: 'Walk along the river until you find the bridge.' },
  basics_en_past_simple: { lang: 'en', yes: 'We went to the market yesterday with my sister.', marks: 'went', no: 'We go to the market every week with my sister.' },
  basics_en_plurals_quantifiers: { lang: 'en', yes: 'There are many people in the park this afternoon.', marks: 'many people', no: 'The park is empty and quiet this afternoon again.' },
  mixed_conditionals: { lang: 'en', yes: 'If I had studied harder, I would be a doctor now.', marks: 'If I had studied harder, I would be', no: 'If I study harder, I will pass the exam next week.' },
  participle_clauses: { lang: 'en', yes: 'Walking down the street, I saw an old friend of mine.', marks: 'Walking down the street,', no: 'During the meeting, I saw an old friend of mine.' },
  basics_en_cleft_variations: { lang: 'en', yes: 'It was Maria who found the answer last night.', marks: 'It was Maria who found', no: 'Maria found the answer in the library last night.' },
  basics_en_time_prepositions: { lang: 'en', yes: 'The class starts at 9:30 on Monday morning.', marks: 'at 9:30', no: 'The class starts soon and nobody wants to be late.' },
  basics_en_future_perfect: { lang: 'en', yes: 'By June she will have finished all her exams.', marks: 'will have finished', no: 'By June she finished all her exams with good marks.' },
  basics_en_causative: { lang: 'en', yes: 'She had her hair cut before the wedding yesterday.', marks: 'had her hair cut', no: 'She had a good day before the wedding yesterday.' },
  basics_en_ellipsis: { lang: 'en', yes: 'I love chocolate, and so do I think you do.', marks: 'so do I', no: 'I love chocolate and my sister loves it too.' },
  basics_en_phrasal_verbs: { lang: 'en', yes: 'He picked up the phone and turned it off quickly.', marks: 'picked up', no: 'He answered the phone and then ended the call quickly.' },
  basics_en_future_in_past: { lang: 'en', yes: 'She was going to call him but forgot about it.', marks: 'was going to call', no: 'She called him last night but he was not at home.' },
  basics_en_inversion_conditionals: { lang: 'en', yes: 'Had I known the truth, I would have said so.', marks: 'Had I known', no: 'Should I go now or wait for the others here?' },
  basics_en_prepositional_verbs: { lang: 'en', yes: 'I look forward to meeting you next week at the office.', marks: 'look forward to meeting', no: 'I look at the pictures in the big book every week.' },
  basics_en_double_comparatives: { lang: 'en', yes: 'The more you read, the better you write in the end.', marks: 'The more you read, the better', no: 'You read a lot and you write well in the end.' },
}

describe('the patterns of topics beyond the first ones', () => {
  for (const [topic, { lang, yes, marks, no }] of Object.entries(SAMPLES)) {
    it(`${topic}: finds and marks what it teaches, and leaves a plain sentence alone`, () => {
      const found = ownExamples(lang, topic, undefined, [{ title: 'T', text: yes }, { title: 'N', text: no }])
      expect(found.map((e) => e.sentence), topic).toEqual([yes])
      const hit = found[0]!
      expect(hit.sentence.slice(hit.mark!.start, hit.mark!.end).toLowerCase()).toContain(marks.toLowerCase())
    })
  }
})
