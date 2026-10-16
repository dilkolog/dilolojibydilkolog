import { describe, expect, it } from 'vitest'
import { grammarExercises } from './grammar'
import { collocations } from './collocations'
import { reflexPhrases } from './reflex'
import { trapWords } from './traps'
import { registerItems } from './register'
import { flowItems } from './flow'
import { SPOT_ERRORS } from './spotErrors'
import { SENTENCE_REWRITES } from './sentenceRewrites'
import { COLLOCATION_DRILLS } from './collocationDrill'

describe('Data Integrity and Schema Guardian (src/data)', () => {
  const languages = ['en', 'fr', 'es'] as const

  describe('Grammar Exercises (src/data/grammar/*.json)', () => {
    const allGrammar = languages.flatMap((l) => grammarExercises(l))

    it('has unique IDs across all language files', () => {
      const ids = allGrammar.map((g) => g.id)
      const duplicates = ids.filter((id, index) => ids.indexOf(id) !== index)
      expect(duplicates, `Found duplicate grammar IDs: ${duplicates.join(', ')}`).toEqual([])
    })

    it('every grammar exercise conforms to schema and language prefix', () => {
      for (const item of allGrammar) {
        expect(item.id, `ID missing in grammar item`).toBeTruthy()
        expect(item.id.startsWith(`${item.language}-`), `ID ${item.id} must start with ${item.language}-`).toBe(true)
        expect(languages, `Invalid language in ${item.id}`).toContain(item.language)
        expect(item.explanation.length, `Explanation too short in ${item.id}`).toBeGreaterThanOrEqual(15)
        expect(item.source, `Source missing in ${item.id}`).toBeTruthy()
        expect(item.topic, `Topic missing in ${item.id}`).toBeTruthy()

        if (item.type === 'choice') {
          expect(item.options, `Options missing in choice ${item.id}`).toBeDefined()
          expect(item.options!, `Options must contain answer in ${item.id}`).toContain(item.answer)
        } else if (item.type === 'error') {
          expect(item.fix, `Fix missing in error ${item.id}`).toBeTruthy()
        } else if (item.type === 'cloze') {
          expect(item.prompt, `Prompt missing blank in ${item.id}`).toContain('___')
        }
      }
    })
  })

  describe('Collocations (src/data/collocations/*.json)', () => {
    it('has unique IDs across all files', () => {
      const ids = collocations.map((c) => c.id)
      const duplicates = ids.filter((id, index) => ids.indexOf(id) !== index)
      expect(duplicates, `Found duplicate collocation IDs: ${duplicates.join(', ')}`).toEqual([])
    })

    it('every collocation has required fields and language prefix', () => {
      for (const item of collocations) {
        expect(item.id.startsWith(`${item.language}-`), `ID ${item.id} must start with ${item.language}-`).toBe(true)
        expect(languages, `Invalid language in ${item.id}`).toContain(item.language)
        expect(item.lemmas, `Lemmas missing/empty in ${item.id}`).toBeInstanceOf(Array)
        expect(item.lemmas.length, `Lemmas empty in ${item.id}`).toBeGreaterThanOrEqual(1)
        expect(item.pattern, `Pattern missing in ${item.id}`).toBeTruthy()
        expect(item.example, `Example missing in ${item.id}`).toBeTruthy()
        expect(item.tr, `Translation missing in ${item.id}`).toBeTruthy()
        expect(item.source, `Source missing in ${item.id}`).toBeTruthy()
      }
    })
  })

  describe('Reflex Phrases (src/data/reflex/*.json)', () => {
    it('has unique IDs across all files', () => {
      const ids = reflexPhrases.map((r) => r.id)
      const duplicates = ids.filter((id, index) => ids.indexOf(id) !== index)
      expect(duplicates, `Found duplicate reflex IDs: ${duplicates.join(', ')}`).toEqual([])
    })

    it('every reflex phrase has Turkish, French, Spanish, and English translations', () => {
      for (const item of reflexPhrases) {
        expect(item.id, `ID missing in reflex item`).toBeTruthy()
        expect(item.tr, `TR translation missing in ${item.id}`).toBeTruthy()
        expect(item.fr, `FR translation missing in ${item.id}`).toBeTruthy()
        expect(item.es, `ES translation missing in ${item.id}`).toBeTruthy()
        expect(item.en, `EN translation missing in ${item.id}`).toBeTruthy()
      }
    })
  })

  describe('Traps / False Friends (src/data/traps/*.json)', () => {
    it('has unique IDs across all files', () => {
      const ids = trapWords.map((t) => t.id)
      const duplicates = ids.filter((id, index) => ids.indexOf(id) !== index)
      expect(duplicates, `Found duplicate trap IDs: ${duplicates.join(', ')}`).toEqual([])
    })

    it('every trap word has required contrastive fields and source', () => {
      for (const item of trapWords) {
        expect(item.id.startsWith(`${item.language}-`), `ID ${item.id} must start with ${item.language}-`).toBe(true)
        expect(languages, `Invalid language in ${item.id}`).toContain(item.language)
        expect(item.lemma, `Lemma missing in ${item.id}`).toBeTruthy()
        expect(item.looks, `looks missing in ${item.id}`).toBeTruthy()
        expect(item.trap, `trap missing in ${item.id}`).toBeTruthy()
        expect(item.meaning, `meaning missing in ${item.id}`).toBeTruthy()
        expect(item.text, `text sentence missing in ${item.id}`).toBeTruthy()
        expect(item.tr, `tr translation missing in ${item.id}`).toBeTruthy()
        expect(item.source, `source missing in ${item.id}`).toBeTruthy()
      }
    })
  })

  describe('Register Items (src/data/register/*.json)', () => {
    it('has unique IDs across all files', () => {
      const ids = registerItems.map((r) => r.id)
      const duplicates = ids.filter((id, index) => ids.indexOf(id) !== index)
      expect(duplicates, `Found duplicate register IDs: ${duplicates.join(', ')}`).toEqual([])
    })

    it('every register item has 3 formal tiers and source', () => {
      for (const item of registerItems) {
        expect(item.id.startsWith(`${item.language}-`), `ID ${item.id} must start with ${item.language}-`).toBe(true)
        expect(languages, `Invalid language in ${item.id}`).toContain(item.language)
        expect(item.tr, `Prompt translation missing in ${item.id}`).toBeTruthy()
        expect(item.informal, `Informal tier missing in ${item.id}`).toBeTruthy()
        expect(item.standard, `Standard tier missing in ${item.id}`).toBeTruthy()
        expect(item.formal, `Formal tier missing in ${item.id}`).toBeTruthy()
        expect(item.source, `Source missing in ${item.id}`).toBeTruthy()
      }
    })
  })

  describe('Flow Paragraphs (src/data/flow/*.json)', () => {
    it('has unique IDs across all files', () => {
      const ids = flowItems.map((f) => f.id)
      const duplicates = ids.filter((id, index) => ids.indexOf(id) !== index)
      expect(duplicates, `Found duplicate flow IDs: ${duplicates.join(', ')}`).toEqual([])
    })

    it('every flow paragraph has prompt with gap markers and valid gaps', () => {
      for (const item of flowItems) {
        expect(item.id.startsWith(`${item.language}-`), `ID ${item.id} must start with ${item.language}-`).toBe(true)
        expect(languages, `Invalid language in ${item.id}`).toContain(item.language)
        expect(item.text, `Text missing in ${item.id}`).toBeTruthy()
        expect(item.text, `Text must contain gap marker in ${item.id}`).toMatch(/\{\d+\}/)
        expect(item.tr, `Translation missing in ${item.id}`).toBeTruthy()
        expect(item.gaps, `Gaps missing in ${item.id}`).toBeInstanceOf(Array)
        expect(item.gaps.length, `No gaps in ${item.id}`).toBeGreaterThanOrEqual(1)
        expect(item.source, `Source missing in ${item.id}`).toBeTruthy()

        for (const gap of item.gaps) {
          expect(gap.answer, `Gap answer missing in ${item.id}`).toBeTruthy()
          expect(gap.options, `Gap options missing in ${item.id}`).toBeInstanceOf(Array)
          expect(gap.options.length, `Gap options length < 2 in ${item.id}`).toBeGreaterThanOrEqual(2)
          expect(gap.options, `Gap options must contain answer in ${item.id}`).toContain(gap.answer)
          expect(gap.kind, `Gap kind missing in ${item.id}`).toBeTruthy()
          expect(gap.why, `Gap why missing in ${item.id}`).toBeTruthy()
        }
      }
    })
  })

  describe('Spot Error Items (src/data/spotErrors.ts)', () => {
    it('has unique IDs', () => {
      const ids = SPOT_ERRORS.map((s) => s.id)
      const duplicates = ids.filter((id, index) => ids.indexOf(id) !== index)
      expect(duplicates, `Found duplicate spot error IDs: ${duplicates.join(', ')}`).toEqual([])
    })

    it('every spot error item correctly references error index and replacements', () => {
      for (const item of SPOT_ERRORS) {
        expect(item.id.startsWith(`${item.language}-spot-`), `ID ${item.id} format mismatch`).toBe(true)
        expect(languages, `Invalid language in ${item.id}`).toContain(item.language)
        expect(['A2', 'B1', 'B2', 'C1'], `Invalid level in ${item.id}`).toContain(item.level)

        const tokens = item.sentence.split(' ')
        expect(item.errorIndex, `Index out of bounds in ${item.id}`).toBeGreaterThanOrEqual(0)
        expect(item.errorIndex, `Index out of bounds in ${item.id}`).toBeLessThan(tokens.length)

        // Token at index should contain the faulty word (handling punctuation like commas, periods, quotes)
        const targetToken = tokens[item.errorIndex]
          .replace(/[.,!?;:"'«»]/g, '')
          .toLowerCase()
        const expectedFaulty = item.faulty
          .replace(/[.,!?;:"'«»]/g, '')
          .toLowerCase()

        expect(targetToken, `Token at index ${item.errorIndex} ("${tokens[item.errorIndex]}") does not match faulty word ("${item.faulty}") in ${item.id}`).toContain(expectedFaulty)

        expect(item.distractors, `Must have exactly 2 distractors in ${item.id}`).toHaveLength(2)
        expect(item.distractors, `Distractors must not contain correct answer in ${item.id}`).not.toContain(item.correct)
        expect(item.explanation.length, `Explanation too short in ${item.id}`).toBeGreaterThanOrEqual(15)
        expect(item.rule, `Rule title missing in ${item.id}`).toBeTruthy()
      }
    })
  })

  describe('Sentence Rewrite Items (src/data/sentenceRewrites.ts)', () => {
    it('has unique IDs', () => {
      const ids = SENTENCE_REWRITES.map((r) => r.id)
      const duplicates = ids.filter((id, index) => ids.indexOf(id) !== index)
      expect(duplicates, `Found duplicate sentence rewrite IDs: ${duplicates.join(', ')}`).toEqual([])
    })

    it('every rewrite item has valid keyword, accepted answers, and translations', () => {
      for (const item of SENTENCE_REWRITES) {
        expect(item.id.startsWith(`${item.language}-rw-`), `ID ${item.id} format mismatch`).toBe(true)
        expect(languages, `Invalid language in ${item.id}`).toContain(item.language)
        expect(['B1', 'B2', 'C1'], `Invalid level in ${item.id}`).toContain(item.level)

        expect(item.keyword, `Keyword must be uppercase in ${item.id}`).toBe(item.keyword.toUpperCase())
        expect(item.sourceSentence, `Source sentence missing in ${item.id}`).toBeTruthy()
        expect(item.sourceTr, `Turkish translation missing in ${item.id}`).toBeTruthy()
        expect(item.acceptedAnswers.length, `No accepted answers in ${item.id}`).toBeGreaterThanOrEqual(1)

        for (const ans of item.acceptedAnswers) {
          expect(ans.trim(), `Empty answer in ${item.id}`).toBeTruthy()
        }

        expect(item.explanation.length, `Explanation too short in ${item.id}`).toBeGreaterThanOrEqual(15)
      }
    })
  })

  describe('Collocation Drill Items (src/data/collocationDrill.ts)', () => {
    it('has unique IDs', () => {
      const ids = COLLOCATION_DRILLS.map((c) => c.id)
      const duplicates = ids.filter((id, index) => ids.indexOf(id) !== index)
      expect(duplicates, `Found duplicate collocation drill IDs: ${duplicates.join(', ')}`).toEqual([])
    })

    it('every collocation drill has cloze blank, 4 options containing target, and explanation', () => {
      for (const item of COLLOCATION_DRILLS) {
        expect(item.id.startsWith(`${item.language}-colloc-`), `ID ${item.id} format mismatch`).toBe(true)
        expect(languages, `Invalid language in ${item.id}`).toContain(item.language)
        expect(['A2', 'B1', 'B2', 'C1'], `Invalid level in ${item.id}`).toContain(item.level)
        expect(['preposition', 'collocation'], `Invalid type in ${item.id}`).toContain(item.type)

        expect(item.clozeSentence, `Cloze blank missing in ${item.id}`).toContain('___')
        expect(item.options, `Options must have 4 choices in ${item.id}`).toHaveLength(4)
        expect(item.options, `Options must contain target in ${item.id}`).toContain(item.target)
        expect(item.fullSentence, `Full sentence missing in ${item.id}`).toBeTruthy()
        expect(item.pattern, `Pattern missing in ${item.id}`).toBeTruthy()
        expect(item.tr, `Turkish translation missing in ${item.id}`).toBeTruthy()
        expect(item.explanation.length, `Explanation too short in ${item.id}`).toBeGreaterThanOrEqual(15)
      }
    })
  })

  describe('Global Cross-Dataset Collision Guard', () => {
    it('all game IDs across all modern exercise pools are globally distinct', () => {
      const allIds = [
        ...SPOT_ERRORS.map((s) => s.id),
        ...SENTENCE_REWRITES.map((r) => r.id),
        ...COLLOCATION_DRILLS.map((c) => c.id),
      ]
      const idSet = new Set<string>()
      for (const id of allIds) {
        expect(idSet.has(id), `Global ID collision detected for: ${id}`).toBe(false)
        idSet.add(id)
      }
    })

    it('reports exact dataset counts for inventory documentation', () => {
      const counts = {
        grammar: languages.flatMap((l) => grammarExercises(l)).length,
        collocations: collocations.length,
        reflex: reflexPhrases.length,
        traps: trapWords.length,
        register: registerItems.length,
        flow: flowItems.length,
        spotErrors: SPOT_ERRORS.length,
        sentenceRewrites: SENTENCE_REWRITES.length,
        collocationDrills: COLLOCATION_DRILLS.length,
      }
      console.log('DATASET_INVENTORY_COUNTS:', JSON.stringify(counts))
      expect(counts.grammar).toBeGreaterThan(0)
    })
  })
})
