// @vitest-environment happy-dom
import 'fake-indexeddb/auto'
import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { describe, expect, it, vi } from 'vitest'
import { db } from '../data/instance'
import { createEntry } from '../data/wordInput'
import type { VocabularyEntry } from '../engine/types'
import { WordFamilyMap } from './WordFamilyMap'

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true
// No network: a word the pack doesn't know would go to Wiktionary.
vi.stubGlobal('fetch', async () => new Response('{}', { status: 404 }))
const now = new Date()
const member = (x: VocabularyEntry) => ({ lemma: x.lemma, partOfSpeech: x.partOfSpeech, gloss: x.senses[0].gloss, entryId: x.id })

async function render(ui: React.ReactElement) {
  const el = document.createElement('div')
  document.body.append(el)
  await act(async () => createRoot(el).render(ui))
  await act(() => new Promise((r) => setTimeout(r, 50)))
  return el
}

describe('word family map', () => {
  it('draws relatives above and the other languages below; only this language\'s list words open', async () => {
    const decision = createEntry({ word: 'la décision', meaning: 'karar' }, 'fr', now)
    const decide = createEntry({ word: 'decide', meaning: 'karar vermek' }, 'en', now)
    const enDecision = createEntry({ word: 'decision', meaning: 'karar' }, 'en', now)
    decide.wordFamily = [member(enDecision)]
    await db.vocabulary.bulkPut([decide, enDecision])
    const decider = {
      ...createEntry({ word: 'décider', meaning: 'karar vermek' }, 'fr', now),
      wordFamily: [member(decision)],
      familyCandidates: ['indécis', 'décision'],
      translations: { en: ['decide'], es: ['decidir'] },
    }
    const onOpen = vi.fn()
    const el = await render(<WordFamilyMap entry={decider} vocabulary={[decider, decision]} onOpen={onOpen} />)

    const labels = [...el.querySelectorAll('.fm-node')].map((g) => g.textContent)
    // A candidate already linked isn't drawn twice.
    expect(labels).toEqual(['décider', 'décision', 'indécis', 'EN decide', 'decision', 'ES decidir'])
    expect([...el.querySelectorAll('.fm-node.is-known')].map((g) => g.textContent)).toEqual(['décision', 'EN decide', 'decision'])
    const links = [...el.querySelectorAll<SVGGElement>('[role="link"]')]
    expect(links.map((g) => g.textContent)).toEqual(['décision'])
    await act(async () => links[0].dispatchEvent(new MouseEvent('click', { bubbles: true })))
    expect(onOpen).toHaveBeenCalledWith(decision.id)
  })

  it('shows nothing for a word with no relatives and no other languages', async () => {
    const lone = createEntry({ word: 'zut', meaning: 'hay aksi' }, 'fr', now)
    const el = await render(<WordFamilyMap entry={lone} vocabulary={[lone]} />)
    expect(el.innerHTML).toBe('')
  })
})
