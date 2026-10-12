import 'fake-indexeddb/auto'
import { beforeEach, describe, expect, it } from 'vitest'
import type { SharedWord } from '../engine/sharedSet'
import { KelimeDB } from './db'
import { getCollabs, importSnapshot, joinCollab, syncCollab, wordsOfList, type CollabApi, type ShareDoc } from './share'
import { createEntry } from './wordInput'

/** One server-side collaborative list, with ETags: two devices talk to it through the same api. */
function server(initial: SharedWord[] = []) {
  const state = { doc: { v: 1, kind: 'collab', name: 'Ortak', language: 'fr', words: initial, createdAt: '2026-10-12T09:00:00Z', updatedAt: '2026-10-12T09:00:00Z' } as ShareDoc, version: 1, refuse: 0, puts: 0 }
  const api: CollabApi = {
    fetch: async () => ({ doc: structuredClone(state.doc), etag: `"v${state.version}"` }),
    put: async (_id, name, words, etag) => {
      if (state.refuse > 0) {
        state.refuse--
        // Someone else writes first: the ETag the device holds is out of date.
        state.version++
        return false
      }
      if (etag !== `"v${state.version}"`) return false
      state.doc = { ...state.doc, name, words: structuredClone(words) }
      state.version++
      state.puts++
      return true
    },
  }
  return { state, api }
}

let n = 0
const device = () => new KelimeDB(`share-test-${Date.now()}-${n++}`)
const T = (m: number) => new Date(Date.UTC(2026, 9, 12, 10, m))
const word = (w: string, meaning: string, at: Date) => createEntry({ word: w, meaning }, 'fr', at)
const inList = async (db: KelimeDB, listId: string) => (await db.vocabulary.toArray()).filter((e) => e.listId === listId).map((e) => `${e.lemma}=${e.senses[0].gloss}`).sort()

describe('collaborative lists', () => {
  let alice: KelimeDB
  let bob: KelimeDB
  beforeEach(() => {
    alice = device()
    bob = device()
  })

  async function start() {
    const s = server()
    await alice.saveList({ id: 'A', language: 'fr', name: 'Ortak', createdAt: T(0).toISOString(), updatedAt: T(0).toISOString() })
    await alice.vocabulary.bulkPut([{ ...word('maison', 'ev', T(1)), listId: 'A' }, { ...word('chat', 'kedi', T(1)), listId: 'A' }])
    const a = await syncCollab(alice, { id: 'x', listId: 'A', language: 'fr', known: [] }, T(2), s.api)
    const b = await joinCollab(bob, 'x', 'B', T(3), s.api)
    return { s, a, b }
  }

  it('what one device has reaches the other when it joins, as a list of its own', async () => {
    const { s, a, b } = await start()
    expect(a.pushed).toBe(true)
    expect(s.state.doc.words.map((w) => w.meaning).sort()).toEqual(['ev', 'kedi'])
    expect(b.added).toBe(2)
    expect(await inList(bob, 'B')).toEqual(['chat=kedi', 'maison=ev'])
    expect((await bob.getLists('fr')).map((l) => l.name)).toEqual(['Ortak'])
    expect((await getCollabs(bob))[0]).toMatchObject({ id: 'x', listId: 'B' })
    // Joined and in step: syncing again changes nothing and writes nothing.
    const again = await syncCollab(bob, (await getCollabs(bob))[0], T(4), s.api)
    expect(again).toMatchObject({ added: 0, updated: 0, removed: 0, pushed: false })
  })

  it('a word added on one device comes to the other; an edit and a deletion too', async () => {
    const { s } = await start()
    await bob.vocabulary.put({ ...word('eau', 'su', T(10)), listId: 'B' })
    const link = async (db: KelimeDB) => (await getCollabs(db))[0]
    await syncCollab(bob, await link(bob), T(11), s.api)
    const a = await syncCollab(alice, await link(alice), T(12), s.api)
    expect(a.added).toBe(1)
    expect(await inList(alice, 'A')).toEqual(['chat=kedi', 'eau=su', 'maison=ev'])
    // Alice edits a meaning, Bob deletes a word.
    const maison = (await alice.vocabulary.get('fr:maison'))!
    await alice.vocabulary.put({ ...maison, senses: [{ ...maison.senses[0], gloss: 'konut' }], editedAt: T(20).toISOString() })
    await bob.deleteWords(['fr:chat'])
    await syncCollab(alice, await link(alice), T(21), s.api)
    await syncCollab(bob, await link(bob), T(22), s.api)
    await syncCollab(alice, await link(alice), T(23), s.api)
    expect(await inList(alice, 'A')).toEqual(['eau=su', 'maison=konut'])
    expect(await inList(bob, 'B')).toEqual(['eau=su', 'maison=konut'])
    expect(s.state.doc.words.find((w) => w.key === 'fr:chat')?.deleted).toBe(true)
  })

  it('two edits of one word: the later one wins on both devices', async () => {
    const { s } = await start()
    const edit = async (db: KelimeDB, meaning: string, at: Date) => {
      const e = (await db.vocabulary.get('fr:maison'))!
      await db.vocabulary.put({ ...e, senses: [{ ...e.senses[0], gloss: meaning }], editedAt: at.toISOString() })
    }
    await edit(alice, 'ev (A)', T(30))
    await edit(bob, 'ev (B)', T(31))
    const link = async (db: KelimeDB) => (await getCollabs(db))[0]
    await syncCollab(alice, await link(alice), T(32), s.api)
    await syncCollab(bob, await link(bob), T(33), s.api)
    await syncCollab(alice, await link(alice), T(34), s.api)
    expect((await alice.vocabulary.get('fr:maison'))!.senses[0].gloss).toBe('ev (B)')
    expect((await bob.vocabulary.get('fr:maison'))!.senses[0].gloss).toBe('ev (B)')
  })

  it('if the server refuses an out-of-date write it reads and merges again, and then succeeds', async () => {
    const { s } = await start()
    await alice.vocabulary.put({ ...word('eau', 'su', T(40)), listId: 'A' })
    s.state.refuse = 1
    const before = s.state.puts
    const r = await syncCollab(alice, (await getCollabs(alice))[0], T(41), s.api)
    expect(r.pushed).toBe(true)
    expect(s.state.puts).toBe(before + 1)
    expect(s.state.doc.words.map((w) => w.key)).toContain('fr:eau')
  })

  it('a word already among the learner\'s own joins the list instead of being made twice', async () => {
    const s = server([{ key: 'fr:maison', word: 'la maison', meaning: 'ev', at: T(1).toISOString() }])
    await bob.vocabulary.put(word('maison', 'ev', T(0)))
    await joinCollab(bob, 'x', 'B', T(5), s.api)
    expect((await bob.vocabulary.toArray()).filter((e) => e.lemma === 'maison')).toHaveLength(1)
    expect(await inList(bob, 'B')).toEqual(['maison=ev'])
  })
})

describe('taking in a snapshot', () => {
  it('makes a list of its own with the new words and leaves out those the learner already has', async () => {
    const db = device()
    await db.vocabulary.put(word('chat', 'kedi', T(0)))
    const doc: ShareDoc = {
      v: 1,
      kind: 'set',
      name: 'Evcil',
      language: 'fr',
      words: [
        { key: 'fr:chat', word: 'le chat', meaning: 'kedi', at: T(1).toISOString() },
        { key: 'fr:chien', word: 'le chien', meaning: 'köpek', example: 'Le *chien* dort.', at: T(1).toISOString() },
      ],
      createdAt: T(1).toISOString(),
      updatedAt: T(1).toISOString(),
    }
    const r = await importSnapshot(db, doc, 'L1', T(5))
    expect(r).toMatchObject({ added: 1, skipped: 1 })
    expect(await inList(db, 'L1')).toEqual(['chien=köpek'])
    expect((await db.getLists('fr'))[0].name).toBe('Evcil')
    const [shared] = wordsOfList(await db.vocabulary.toArray(), 'L1')
    expect(shared).toMatchObject({ key: 'fr:chien', word: 'le chien', meaning: 'köpek' })
    expect(shared.example).toContain('chien')
  })
})
