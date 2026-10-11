// @vitest-environment happy-dom
import 'fake-indexeddb/auto'
;(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true
import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { db } from '../data/instance'
import { createEntry } from '../data/wordInput'
import type { Pack } from '../data/wordpackBuild'

const rec = (p: string, t: string) => ({ p, t: [t] })
const pack = {
  v: 'test',
  w: {
    comfort: rec('n', 'konfor'),
    comfortable: rec('a', 'rahat'),
    uncomfortable: rec('a', 'rahatsız'),
    comfortably: rec('d', 'rahatça'),
    discomfort: rec('n', 'huzursuzluk'),
  },
} as unknown as Pack
vi.mock('../data/wordpack', async (orig) => ({ ...(await orig<typeof import('../data/wordpack')>()), loadPack: async () => pack }))
vi.mock('../data/frequency', async (orig) => ({ ...(await orig<typeof import('../data/frequency')>()), loadFrequency: async () => new Map<string, number>() }))
const { MorphemeTree } = await import('./MorphemeTree')

let root: ReturnType<typeof createRoot> | undefined
beforeEach(async () => {
  await db.vocabulary.clear()
})
afterEach(() => {
  act(() => root?.unmount())
  document.body.innerHTML = ''
})

const wait = () => act(async () => void (await new Promise((r) => setTimeout(r, 40))))

async function mount(lemma: string, own: string[] = []) {
  const entry = createEntry({ word: lemma, meaning: 'x' }, 'en', new Date())
  const others = own.map((w) => createEntry({ word: w, meaning: 'y' }, 'en', new Date()))
  await db.vocabulary.bulkPut([entry, ...others])
  const host = document.createElement('div')
  document.body.append(host)
  root = createRoot(host)
  await act(async () => root!.render(<MorphemeTree db={db} entry={entry} vocabulary={[entry, ...others]} onChanged={() => {}} />))
  await wait()
  return { host, entry }
}

describe('MorphemeTree', () => {
  it('shows the word as pieces and the family as a tree, with what each ending does', async () => {
    const { host } = await mount('uncomfortable')
    expect(host.textContent).toContain('Kök ve ekler')
    expect([...host.querySelectorAll('.morph-row')].map((r) => r.querySelector('.morph-word')?.textContent)).toEqual(['comfort', 'comfortable', 'comfortably', 'uncomfortable', 'discomfort'])
    // The word itself, taken apart.
    expect(host.querySelector('.small .morphs')?.textContent).toBe('un-comfort-able')
    expect(host.querySelector('.morph-row.is-current')?.textContent).toContain('uncomfortable')
    expect(host.querySelector('.morph-legend')?.textContent).toContain('-CA')
    expect(host.querySelector('.morph-legend')?.textContent).toContain('değil')
  })

  it('adds a relative to the list and links it both ways', async () => {
    const { host, entry } = await mount('comfort')
    const row = [...host.querySelectorAll('.morph-row')].find((r) => r.textContent?.startsWith('comfortable'))!
    await act(async () => (row.querySelector('button') as HTMLElement).click())
    await wait()
    const added = await db.vocabulary.get('en:comfortable')
    expect(added?.senses[0].gloss).toBe('rahat')
    expect(added?.wordFamily.some((m) => m.entryId === entry.id)).toBe(true)
    expect((await db.vocabulary.get(entry.id))?.wordFamily.some((m) => m.entryId === 'en:comfortable')).toBe(true)
  })

  it('offers no Ekle button for words already in the list', async () => {
    const { host } = await mount('comfort', ['comfortable'])
    const row = [...host.querySelectorAll('.morph-row')].find((r) => r.textContent?.startsWith('comfortable'))!
    expect(row.querySelector('button.btn')).toBeNull()
  })

  it('shows nothing for a word with no family', async () => {
    const { host } = await mount('zzz')
    expect(host.querySelector('.morpheme-card')).toBeNull()
  })
})
