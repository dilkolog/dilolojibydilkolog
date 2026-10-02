import { describe, expect, it } from 'vitest'
import { formIn, isInflection, toExamples } from './corpus'

describe('Tatoeba sentences', () => {
  it('finds inflected forms and phrases', () => {
    expect(formIn('Ella decidió mudarse a Bélgica.', 'decidir', 'es')).toBe('decidió')
    expect(formIn('He finally gave up smoking.', 'give up', 'en')).toBeUndefined()
    expect(formIn('Never give up on your dreams.', 'give up', 'en')).toBe('give up')
    expect(formIn("Décidez par vous-même !", 'décider', 'fr')).toBe('Décidez')
    expect(formIn("Elle l'a décidé hier.", 'décider', 'fr')).toBe('décidé')
  })

  it('accepts inflections but not related words', () => {
    const yes: [string, string, 'en' | 'fr' | 'es'][] = [
      ['decided', 'decide', 'en'], ['improving', 'improve', 'en'], ['studies', 'study', 'en'], ['stopped', 'stop', 'en'], ['cats', 'cat', 'en'],
      ['villes', 'ville', 'fr'], ['décida', 'décider', 'fr'], ['aprovechó', 'aprovechar', 'es'], ['casas', 'casa', 'es'],
    ]
    const no: [string, string, 'en' | 'fr' | 'es'][] = [
      ['reluctantly', 'reluctant', 'en'], ['card', 'car', 'en'], ['dépaysé', 'dépaysement', 'fr'], ['décision', 'décider', 'fr'], ['decisión', 'decidir', 'es'], ['aprovechamiento', 'aprovechar', 'es'],
    ]
    for (const [t, l, lang] of yes) expect(isInflection(t, l, lang), `${t} ← ${l}`).toBe(true)
    for (const [t, l, lang] of no) expect(isInflection(t, l, lang), `${t} ← ${l}`).toBe(false)
  })

  it('keeps approved sentences containing the word, preferring a direct Turkish translation', () => {
    const out = toExamples(
      [
        { id: 1, text: 'Decidí estudiar todos los días.', translations: [{ text: 'dolaylı', lang: 'tur' }, { text: 'Her gün çalışmaya karar verdim.', lang: 'tur', is_direct: true }], audios: [{ download_url: 'https://a/1' }] },
        { id: 2, text: 'Decidí estudiar todos los días.' },
        { id: 3, text: 'No tiene nada que ver.' },
        { id: 4, text: 'Ellos decidieron quedarse.', is_unapproved: true },
        { id: 5, text: 'Ya lo decidiremos mañana.' },
      ],
      'decidir',
      'es',
    )
    expect(out).toEqual([
      { text: 'Decidí estudiar todos los días.', translation: 'Her gün çalışmaya karar verdim.', form: 'Decidí', source: { kind: 'tatoeba', id: 1, audioUrl: 'https://audio.tatoeba.org/sentences/spa/1.mp3' } },
      { text: 'Ya lo decidiremos mañana.', translation: '', form: 'decidiremos', source: { kind: 'tatoeba', id: 5, audioUrl: undefined } },
    ])
  })
})
