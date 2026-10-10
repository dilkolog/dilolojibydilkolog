// @vitest-environment happy-dom
import 'fake-indexeddb/auto'
;(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true
import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, describe, expect, it } from 'vitest'
import { KelimeDB } from '../data/db'
import { createEntry } from '../data/wordInput'
import type { VocabularyEntry } from '../engine/types'
import { ImportPlacement } from './ImportPlacement'
import { NEW_LIST, useImportList, type ImportList } from './useImportList'

let root: ReturnType<typeof createRoot> | undefined
afterEach(() => {
  act(() => root?.unmount())
  document.body.innerHTML = ''
})

/** Mounts the picker with the hook and hands back the hook's latest state. */
async function mount(db: KelimeDB) {
  const state: { current: ImportList | null } = { current: null }
  function Harness() {
    const list = useImportList(db, 'fr')
    state.current = list
    return <ImportPlacement list={list} id="t-list" suggested="Livre" />
  }
  const host = document.createElement('div')
  document.body.append(host)
  root = createRoot(host)
  await act(async () => root!.render(<Harness />))
  await act(async () => void (await new Promise((r) => setTimeout(r, 50))))
  return { host, state }
}

/** Calls the hook's `place` inside act, so the state it sets is flushed before the next look. */
async function placeIn(state: { current: ImportList | null }, list: VocabularyEntry[], fallback?: string) {
  let out: VocabularyEntry[] = []
  await act(async () => {
    out = await state.current!.place(list, fallback)
  })
  return out
}

const entries = (): VocabularyEntry[] => [createEntry({ word: 'chat', meaning: 'kedi' }, 'fr', new Date()), createEntry({ word: 'chien', meaning: 'köpek' }, 'fr', new Date())]
const now = new Date().toISOString()

describe('useImportList', () => {
  it('leaves the words listless by default', async () => {
    const { state } = await mount(new KelimeDB('t-il-none'))
    const placed = await placeIn(state, entries())
    expect(placed.every((e) => !e.listId)).toBe(true)
  })

  it('puts them in the chosen list and level', async () => {
    const db = new KelimeDB('t-il-pick')
    await db.saveList({ id: 'l1', language: 'fr', name: 'Voyage', levels: [{ id: 'v1', name: 'Gare' }], createdAt: now, updatedAt: now })
    const { state } = await mount(db)
    await act(async () => state.current!.setValue('l1|v1'))
    const placed = await placeIn(state, entries())
    expect(placed.map((e) => [e.listId, e.levelId])).toEqual([['l1', 'v1'], ['l1', 'v1']])
  })

  it('creates a new list under the typed name, else the fallback, and keeps using it', async () => {
    const db = new KelimeDB('t-il-new')
    const { host, state } = await mount(db)
    await act(async () => state.current!.setValue(NEW_LIST))
    expect(host.querySelector('input[aria-label="Yeni listenin adı"]')).not.toBeNull()
    await act(async () => state.current!.setName('Animaux'))
    const placed = await placeIn(state, entries())
    const lists = await db.getLists('fr')
    expect(lists.map((l) => l.name)).toEqual(['Animaux'])
    expect(placed.every((e) => e.listId === lists[0].id)).toBe(true)
    // The next import goes to the same list, without making another.
    expect(state.current!.value).toBe(lists[0].id)
    await placeIn(state, entries())
    expect(await db.getLists('fr')).toHaveLength(1)

    // No name typed: the fallback (a book's title) names it; neither: no list at all.
    await act(async () => state.current!.setValue(NEW_LIST))
    await placeIn(state, entries(), 'Le Petit Prince')
    expect((await db.getLists('fr')).map((l) => l.name)).toEqual(['Animaux', 'Le Petit Prince'])
    await act(async () => state.current!.setValue(NEW_LIST))
    expect((await placeIn(state, entries())).every((e) => !e.listId)).toBe(true)
    expect(await db.getLists('fr')).toHaveLength(2)
  })
})
