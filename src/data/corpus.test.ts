import { describe, expect, it, vi } from 'vitest'
import { fetchCorpus, formIn, isInflection, toExamples } from './corpus'

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
      { text: 'Decidí estudiar todos los días.', translation: 'Her gün çalışmaya karar verdim.', form: 'Decidí', source: { kind: 'tatoeba', id: 1, audioUrl: 'https://audio.tatoeba.org/sentences/spa/1.mp3' }, parallel: {} },
      { text: 'Ya lo decidiremos mañana.', translation: '', form: 'decidiremos', source: { kind: 'tatoeba', id: 5, audioUrl: undefined }, parallel: {} },
    ])
  })

  it('keeps the same sentence in the other two target languages, direct and approved first', () => {
    const [ex] = toExamples(
      [
        {
          id: 7,
          text: 'Estoy decidido a aprender.',
          translations: [
            { text: "I'm determined to learn.", lang: 'eng' },
            { text: 'I am determined to learn.', lang: 'eng', is_direct: true },
            { text: 'Je suis décidé à apprendre.', lang: 'fra', is_unapproved: true },
            { text: 'Je suis déterminé à apprendre.', lang: 'fra' },
            { text: 'Estoy determinado a aprender.', lang: 'spa' },
            { text: 'Ich bin entschlossen zu lernen.', lang: 'deu' },
            { text: 'Öğrenmeye kararlıyım.', lang: 'tur' },
          ],
        },
        { id: 8, text: 'Decidieron quedarse.', translations: [{ text: 'Kalmaya karar verdiler.', lang: 'tur' }] },
      ],
      'decidir',
      'es',
    )
    expect(ex.translation).toBe('Öğrenmeye kararlıyım.')
    expect(ex.parallel).toEqual({ en: 'I am determined to learn.', fr: 'Je suis déterminé à apprendre.' })
    // None found is an empty one: the sentence counts as looked at (fillParallel skips it).
    expect(toExamples([{ id: 8, text: 'Decidieron quedarse.' }], 'decidir', 'es')[0].parallel).toEqual({})
  })

  it('asks Tatoeba for Turkish and the other two languages, and only those', async () => {
    const asked: URL[] = []
    vi.stubGlobal('fetch', async (url: string) => {
      asked.push(new URL(url))
      return new Response(JSON.stringify({ data: [] }))
    })
    await fetchCorpus({ language: 'fr', lemma: 'décider' })
    vi.unstubAllGlobals()
    expect(asked).toHaveLength(2)
    expect(asked[0].searchParams.get('trans:lang')).toBe('tur')
    expect(asked[0].searchParams.get('showtrans:lang')).toBe('tur,eng,spa')
    expect(asked[1].searchParams.get('trans:lang')).toBeNull()
    expect(asked[1].searchParams.get('showtrans:lang')).toBe('eng,spa')
    // The API refuses showtrans and showtrans:lang together.
    expect(asked.every((u) => !u.searchParams.has('showtrans'))).toBe(true)
  })
})

