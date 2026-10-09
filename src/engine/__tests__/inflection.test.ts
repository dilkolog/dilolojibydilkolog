import { describe, expect, it } from 'vitest'
import { formIn, isInflection } from '../inflection'

describe('inflection', () => {
  describe('isInflection', () => {
    it('matches exact and case-insensitive words', () => {
      expect(isInflection('decide', 'decide', 'en')).toBe(true)
      expect(isInflection('DECIDE', 'decide', 'en')).toBe(true)
      expect(isInflection('Decide', 'DECIDE', 'en')).toBe(true)
    })

    describe('English (en)', () => {
      it('recognises regular noun and verb inflections (-s, -es, -ed, -ing, -\'s)', () => {
        expect(isInflection('walks', 'walk', 'en')).toBe(true)
        expect(isInflection('walked', 'walk', 'en')).toBe(true)
        expect(isInflection('walking', 'walk', 'en')).toBe(true)
        expect(isInflection('watches', 'watch', 'en')).toBe(true)
        expect(isInflection("dog's", 'dog', 'en')).toBe(true)
      })

      it('handles verbs ending in -e dropping or keeping -e', () => {
        expect(isInflection('decided', 'decide', 'en')).toBe(true)
        expect(isInflection('deciding', 'decide', 'en')).toBe(true)
        expect(isInflection('loved', 'love', 'en')).toBe(true)
        expect(isInflection('loving', 'love', 'en')).toBe(true)
      })

      it('handles words ending in -y changing to -ies or -ied', () => {
        expect(isInflection('studies', 'study', 'en')).toBe(true)
        expect(isInflection('studied', 'study', 'en')).toBe(true)
        expect(isInflection('cries', 'cry', 'en')).toBe(true)
        expect(isInflection('cried', 'cry', 'en')).toBe(true)
      })

      it('handles doubled final consonants (stop → stopped, stopping)', () => {
        expect(isInflection('stopped', 'stop', 'en')).toBe(true)
        expect(isInflection('stopping', 'stop', 'en')).toBe(true)
        expect(isInflection('planned', 'plan', 'en')).toBe(true)
      })

      it('rejects derivational forms or unrelated words', () => {
        expect(isInflection('reluctantly', 'reluctant', 'en')).toBe(false)
        expect(isInflection('decision', 'decide', 'en')).toBe(false)
        expect(isInflection('walker', 'walk', 'en')).toBe(false)
      })
    })

    describe('French (fr)', () => {
      it('recognises regular plural and feminine noun/adjective forms (-s, -e, -es, -x)', () => {
        expect(isInflection('maisons', 'maison', 'fr')).toBe(true)
        expect(isInflection('grande', 'grand', 'fr')).toBe(true)
        expect(isInflection('grandes', 'grand', 'fr')).toBe(true)
        expect(isInflection('beaux', 'beau', 'fr')).toBe(true)
      })

      it('recognises regular verb conjugations from the stem', () => {
        expect(isInflection('décidez', 'décider', 'fr')).toBe(true)
        expect(isInflection('décida', 'décider', 'fr')).toBe(true)
        expect(isInflection('décidait', 'décider', 'fr')).toBe(true)
        expect(isInflection('finissons', 'finir', 'fr')).toBe(true)
        expect(isInflection('vendez', 'vendre', 'fr')).toBe(true)
      })

      it('rejects derivational noun/adverb suffixes on verb stems', () => {
        expect(isInflection('décision', 'décider', 'fr')).toBe(false)
        expect(isInflection('décidément', 'décider', 'fr')).toBe(false)
      })
    })

    describe('Spanish (es)', () => {
      it('recognises regular noun plural forms (-s, -es)', () => {
        expect(isInflection('casas', 'casa', 'es')).toBe(true)
        expect(isInflection('árboles', 'árbol', 'es')).toBe(true)
      })

      it('recognises regular verb conjugations on the stem', () => {
        expect(isInflection('aprovechó', 'aprovechar', 'es')).toBe(true)
        expect(isInflection('aprovechamos', 'aprovechar', 'es')).toBe(true)
        expect(isInflection('aprovechando', 'aprovechar', 'es')).toBe(true)
        expect(isInflection('vivieron', 'vivir', 'es')).toBe(true)
      })

      it('rejects derivational suffixes on verb stems (-miento, -ción, etc.)', () => {
        expect(isInflection('aprovechamiento', 'aprovechar', 'es')).toBe(false)
        expect(isInflection('canción', 'cantar', 'es')).toBe(false)
      })
    })
  })

  describe('formIn', () => {
    it('finds exact multi-word lemmas preserving case', () => {
      expect(formIn('Il est parti tout de suite.', 'tout de suite', 'fr')).toBe('tout de suite')
      expect(formIn('Tout De Suite après!', 'tout de suite', 'fr')).toBe('Tout De Suite')
      expect(formIn('Rien du tout.', 'tout de suite', 'fr')).toBeUndefined()
    })

    it('finds single-word inflections while ignoring elided articles', () => {
      expect(formIn("C'est l'an dernier.", 'an', 'fr')).toBe('an')
      expect(formIn("J'ai bu de l'eau.", 'eau', 'fr')).toBe('eau')
      expect(formIn('She decided immediately.', 'decide', 'en')).toBe('decided')
      expect(formIn('Now they are stopping here.', 'stop', 'en')).toBe('stopping')
    })

    it('returns undefined when the word is not in the text', () => {
      expect(formIn('A quick brown fox.', 'elephant', 'en')).toBeUndefined()
    })
  })
})
