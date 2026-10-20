import { describe, expect, it } from 'vitest'
import { starterItems } from '../ui/starterItems'
import { keyEntries } from '../ui/keyWordsList'
import { splitArticle } from '../engine/answerCheck'
import { loadStarterLists } from './starterLists'
import type { TargetLanguage } from '../engine/types'

const LANGUAGES: TargetLanguage[] = ['fr', 'es', 'en']

describe('starter lists', () => {
  it('each language has the same themes, each with a meaning and a sentence with its Turkish for every word', async () => {
    const themes = new Map<TargetLanguage, string[]>()
    for (const language of LANGUAGES) {
      const lists = await loadStarterLists(language)
      themes.set(language, lists.map((l) => l.id))
      expect(lists.length, language).toBeGreaterThanOrEqual(10)
      for (const list of lists) {
        expect(list.items.length, `${language} ${list.id}`).toBeGreaterThanOrEqual(14)
        for (const i of list.items) {
          expect(i.t.trim() && i.s.trim() && i.tr.trim(), `${language} ${i.w}`).toBeTruthy()
        }
      }
    }
    expect(themes.get('es')).toEqual(themes.get('fr'))
    expect(themes.get('en')).toEqual(themes.get('fr'))
  })

  it('no word is twice in a language, and every one makes a card with its sentence marked', async () => {
    for (const language of LANGUAGES) {
      const lists = await loadStarterLists(language)
      const entries = lists.flatMap((l) => keyEntries(starterItems(l, language), language, new Date(), ''))
      const total = lists.reduce((n, l) => n + l.items.length, 0)
      expect(entries.length, language).toBe(total)
      expect(new Set(entries.map((e) => e.id)).size, `${language}: a word comes twice`).toBe(entries.length)
      // The sentence shows the word, so the questions can blank it out (a phrase may be inflected: most do).
      const marked = entries.filter((e) => e.senses[0]?.examples[0]?.form).length
      expect(marked / entries.length, language).toBeGreaterThan(0.9)
    }
  })

  it('a French or Spanish noun carries its article (that is its gender)', async () => {
    for (const language of ['fr', 'es'] as const) {
      for (const list of await loadStarterLists(language)) {
        for (const i of list.items.filter((x) => x.p === 'noun' && !x.g)) {
          // Days of the week, the post office and the like have no article of their own in the list; the rest do.
          const { article } = splitArticle(i.w.toLowerCase(), language)
          if (['greetings', 'time'].includes(list.id) || i.w === 'correos') continue
          expect(article, `${language} ${i.w}`).toBeTruthy()
        }
      }
    }
  })

  it('el agua is feminine although its article is el', async () => {
    const water = (await loadStarterLists('es')).flatMap((l) => l.items).find((i) => i.w === 'el agua')!
    expect(water.g).toBe('f')
    const [entry] = keyEntries(starterItems({ id: 'x', title: 'x', level: 'A1', items: [water] }, 'es'), 'es', new Date(), '')
    expect(entry!.gender).toBe('f')
  })
})
