import { mergeShared, sameWord, toShared, withoutOldMarks, type SharedWord } from '../engine/sharedSet'
import type { TargetLanguage, VocabularyEntry, WordList } from '../engine/types'
import { timeOf } from '../engine/types'
import { accessFetch, APPROVAL_MESSAGE, isApprovalRefusal } from './access'
import type { KelimeDB } from './db'
import { createEntry, entryToInput, updateEntry, wordId } from './wordInput'

/** What the server keeps of a shared list (api/share.ts). */
export interface ShareDoc {
  v: 1
  kind: 'set' | 'collab'
  name: string
  language: TargetLanguage
  words: SharedWord[]
  createdAt: string
  updatedAt: string
}

export interface LibraryItem {
  id: string
  name: string
  language: TargetLanguage
  count: number
  by?: string
  at: string
}

/** A failure with something to tell the learner. */
export class ShareError extends Error {
  kind: 'approval' | 'notfound' | 'network' | 'other'
  constructor(message: string, kind: 'approval' | 'notfound' | 'network' | 'other' = 'other') {
    super(message)
    this.kind = kind
  }
}

async function check(res: Response): Promise<Response> {
  if (res.ok || res.status === 412) return res
  if (res.status === 403) {
    const body = (await res.clone().json().catch(() => ({}))) as { error?: string }
    if (isApprovalRefusal(body.error)) throw new ShareError(APPROVAL_MESSAGE, 'approval')
    throw new ShareError('Bu işleme izin yok.', 'other')
  }
  if (res.status === 404) throw new ShareError('Bu bağlantıdaki liste bulunamadı: silinmiş ya da bağlantı yanlış olabilir.', 'notfound')
  if (res.status === 413) throw new ShareError('Liste paylaşım için çok büyük (en çok 500 kelime).', 'other')
  throw new ShareError('Sunucuya ulaşılamadı. Biraz sonra tekrar dene.', 'network')
}

const send = async (input: string, init: RequestInit = {}, account = true) => {
  try {
    return await check(await (account ? accessFetch(input, init) : fetch(input, init)))
  } catch (e) {
    if (e instanceof ShareError) throw e
    throw new ShareError('İnternet bağlantısı yok.', 'network')
  }
}

/** Puts a list out: a snapshot anyone with the link reads, or a list the people with the link edit together. */
export async function createShare(req: { kind: 'set' | 'collab'; name: string; language: TargetLanguage; words: SharedWord[]; publish?: boolean; by?: string }): Promise<string> {
  const res = await send('/api/share', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(req) })
  return ((await res.json()) as { id: string }).id
}

export async function fetchShare(id: string): Promise<{ doc: ShareDoc; etag?: string }> {
  const res = await send(`/api/share?id=${id}`, {}, false)
  return { doc: (await res.json()) as ShareDoc, etag: res.headers.get('etag') ?? undefined }
}

export async function libraryList(language?: TargetLanguage): Promise<LibraryItem[]> {
  const res = await send(`/api/share?library=1${language ? `&language=${language}` : ''}`)
  return ((await res.json()) as { items: LibraryItem[] }).items
}

export const deleteShare = async (id: string) => void (await send(`/api/share?id=${id}`, { method: 'DELETE' }))

/** Writes a collaborative list back; false when someone changed it since it was read (read and merge again). */
export async function putCollab(id: string, name: string, words: SharedWord[], etag?: string): Promise<boolean> {
  const res = await send(`/api/share?id=${id}`, { method: 'PUT', headers: { 'content-type': 'application/json', ...(etag ? { 'if-match': etag } : {}) }, body: JSON.stringify({ name, words }) })
  return res.status !== 412
}

// ---------------------------------------------------------------------------
// On this device
// ---------------------------------------------------------------------------

/** A collaborative list this device has joined (kept on the device only). */
export interface CollabLink {
  id: string
  listId: string
  language: TargetLanguage
  /** The words that were in the list at the last sync: one that is gone from it now was deleted here. */
  known: string[]
  /** When it was last in step. */
  syncedAt?: string
}

export async function getCollabs(db: KelimeDB): Promise<CollabLink[]> {
  return ((await db.meta.get('collabs'))?.value as CollabLink[] | undefined) ?? []
}
const saveCollabs = (db: KelimeDB, links: CollabLink[]) => db.meta.put({ key: 'collabs', value: links })

export async function saveCollab(db: KelimeDB, link: CollabLink) {
  const all = await getCollabs(db)
  await saveCollabs(db, all.some((l) => l.id === link.id) ? all.map((l) => (l.id === link.id ? link : l)) : [...all, link])
}

export async function forgetCollab(db: KelimeDB, id: string) {
  await saveCollabs(db, (await getCollabs(db)).filter((l) => l.id !== id))
}

/** A list this device has put out (kept so the link can be shown again and the share withdrawn). */
export interface MyShare {
  id: string
  listId: string
  kind: 'set' | 'collab'
  published: boolean
  at: string
}

export async function getMyShares(db: KelimeDB): Promise<MyShare[]> {
  return ((await db.meta.get('myShares'))?.value as MyShare[] | undefined) ?? []
}

export async function saveMyShare(db: KelimeDB, share: MyShare) {
  await db.meta.put({ key: 'myShares', value: [...(await getMyShares(db)).filter((s) => s.id !== share.id), share] })
}

export async function dropMyShare(db: KelimeDB, id: string) {
  await db.meta.put({ key: 'myShares', value: (await getMyShares(db)).filter((s) => s.id !== id) })
}

const inputOf = (w: SharedWord) => ({ word: w.word, meaning: w.meaning, example: w.example, exampleTranslation: w.exampleTranslation, notes: w.notes })

/** The learner's words of a list as shared words (the form's fields, none of the progress). */
export const wordsOfList = (entries: readonly VocabularyEntry[], listId: string) => toShared(entries.filter((e) => e.listId === listId && e.source !== 'sample'), (e) => entryToInput(e))

/**
 * A snapshot taken in: a new list with the words. A word that is already in the learner's words stays
 * where it is (and is not counted); the rest are new.
 */
export async function importSnapshot(db: KelimeDB, doc: ShareDoc, listId: string, now = new Date()): Promise<{ list: WordList; added: number; skipped: number }> {
  const list: WordList = { id: listId, language: doc.language, name: doc.name, createdAt: now.toISOString(), updatedAt: now.toISOString() }
  const entries: VocabularyEntry[] = []
  let skipped = 0
  for (const w of doc.words) {
    if (w.deleted) continue
    const id = wordId(doc.language, w.word.replace(/^(l'|le |la |les |el |los |las |un |una |the |a |an )/i, ''))
    if (await db.vocabulary.get(id)) {
      skipped++
      continue
    }
    try {
      entries.push({ ...createEntry(inputOf(w), doc.language, now, 'import'), listId })
    } catch {
      skipped++
    }
  }
  await db.saveList(list)
  await db.vocabulary.bulkPut(entries)
  return { list, added: entries.length, skipped }
}

export interface CollabSyncResult {
  link: CollabLink
  added: number
  updated: number
  removed: number
  /** Whether the shared copy changed (this device's changes went out). */
  pushed: boolean
}

export interface CollabApi {
  fetch: (id: string) => Promise<{ doc: ShareDoc; etag?: string }>
  put: (id: string, name: string, words: SharedWord[], etag?: string) => Promise<boolean>
}

const realApi: CollabApi = { fetch: fetchShare, put: putCollab }

/**
 * Brings a joined collaborative list into step: what the others changed comes in, what was changed
 * here goes out. Per word the later write wins, and a deletion is a write. If someone writes in
 * between (the server refuses an out-of-date write), it reads and merges again, up to three times.
 */
export async function syncCollab(db: KelimeDB, link: CollabLink, now = new Date(), api: CollabApi = realApi): Promise<CollabSyncResult> {
  let added = 0
  let updated = 0
  let removed = 0
  let pushed = false
  let known = link.known
  for (let attempt = 0; attempt < 3; attempt++) {
    const { doc, etag } = await api.fetch(link.id)
    const local = (await db.vocabulary.where('language').equals(link.language).toArray()).filter((e) => e.listId === link.listId && e.source !== 'sample')
    const mine = wordsOfList(local, link.listId)
    const here = new Set(local.map((e) => e.id))
    // A word that was in the list and is not now was deleted on this device: that is a write, dated now.
    const marks: SharedWord[] = known.filter((k) => !here.has(k)).map((key) => ({ key, word: key, meaning: '', at: now.toISOString(), deleted: true }))
    const merged = withoutOldMarks(mergeShared(doc.words, [...mine, ...marks]), now.getTime())
    const byKey = new Map(local.map((e) => [e.id, e]))
    const remoteByKey = new Map(doc.words.map((w) => [w.key, w]))
    const createdNow: VocabularyEntry[] = []
    const changedNow: VocabularyEntry[] = []
    const gone: string[] = []
    for (const w of merged) {
      const entry = byKey.get(w.key)
      if (w.deleted) {
        if (entry) gone.push(entry.id)
      } else if (!entry) {
        try {
          const existing = await db.vocabulary.get(w.key)
          // The same word may already be the learner's own, in another list (or none): it joins this one.
          if (existing) changedNow.push({ ...existing, listId: link.listId })
          else createdNow.push({ ...createEntry(inputOf(w), link.language, new Date(w.at), 'import'), id: w.key, listId: link.listId })
        } catch {
          /* a word the server kept that this device cannot make an entry of is left out */
        }
      } else if (timeOf(w.at) > Math.max(timeOf(entry.editedAt), timeOf(entry.addedAt)) && !sameWord(w, mine.find((m) => m.key === w.key)!)) {
        changedNow.push({ ...updateEntry(entry, inputOf(w)), editedAt: w.at })
      }
    }
    if (createdNow.length || changedNow.length) await db.vocabulary.bulkPut([...createdNow, ...changedNow])
    if (gone.length) await db.deleteWords(gone)
    added += createdNow.length
    updated += changedNow.length
    removed += gone.length
    known = merged.filter((w) => !w.deleted).map((w) => w.key)
    const changedRemote = merged.length !== doc.words.length || merged.some((w) => !remoteByKey.has(w.key) || !sameWord(w, remoteByKey.get(w.key)!) || w.at !== remoteByKey.get(w.key)!.at)
    if (!changedRemote) break
    if (await api.put(link.id, doc.name, merged, etag)) {
      pushed = true
      break
    }
  }
  const next = { ...link, known, syncedAt: now.toISOString() }
  await saveCollab(db, next)
  return { link: next, added, updated, removed, pushed }
}

/** Joins a collaborative list: a list of its own on this device, with its words brought in. */
export async function joinCollab(db: KelimeDB, id: string, listId: string, now = new Date(), api: CollabApi = realApi): Promise<CollabSyncResult> {
  const { doc } = await api.fetch(id)
  if (doc.kind !== 'collab') throw new ShareError('Bu bağlantı ortak liste değil.', 'other')
  await db.saveList({ id: listId, language: doc.language, name: doc.name, createdAt: now.toISOString(), updatedAt: now.toISOString() })
  return syncCollab(db, { id, listId, language: doc.language, known: [] }, now, api)
}

/** Every joined collaborative list in step (a list that cannot be reached now is left for next time). */
export async function syncAllCollabs(db: KelimeDB, now = new Date(), api: CollabApi = realApi): Promise<{ changed: boolean; failed: number }> {
  let changed = false
  let failed = 0
  for (const link of await getCollabs(db)) {
    try {
      const r = await syncCollab(db, link, now, api)
      if (r.added + r.updated + r.removed > 0) changed = true
    } catch {
      failed++
    }
  }
  return { changed, failed }
}
