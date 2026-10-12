// @vitest-environment happy-dom
import 'fake-indexeddb/auto'
;(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true
import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { db } from '../data/instance'
import { createEntry } from '../data/wordInput'
import type { VocabularyEntry, WordList } from '../engine/types'

const createShare = vi.fn()
const deleteShare = vi.fn()
const fetchShare = vi.fn()
vi.mock('../data/share', async (orig) => ({ ...(await orig<typeof import('../data/share')>()), createShare: (...a: unknown[]) => createShare(...a), deleteShare: (...a: unknown[]) => deleteShare(...a), fetchShare: (...a: unknown[]) => fetchShare(...a) }))
const { ShareError } = await import('../data/share')
const { ShareList } = await import('./ShareList')
const { default: IncomingSet } = await import('./IncomingSet')

let root: ReturnType<typeof createRoot> | undefined
const list: WordList = { id: 'L1', language: 'fr', name: 'Ev', createdAt: '2026-10-12T10:00:00Z', updatedAt: '2026-10-12T10:00:00Z' }
let words: VocabularyEntry[]
beforeEach(async () => {
  createShare.mockReset()
  deleteShare.mockReset()
  fetchShare.mockReset()
  await db.meta.delete('myShares')
  await db.meta.delete('collabs')
  await db.meta.delete('wordLists')
  await db.vocabulary.clear()
  words = [['maison', 'ev'], ['chat', 'kedi']].map(([w, m]) => ({ ...createEntry({ word: w, meaning: m }, 'fr', new Date()), listId: 'L1' }))
})
afterEach(() => {
  act(() => root?.unmount())
  document.body.innerHTML = ''
})

const click = (el: Element | null | undefined) => act(async () => (el as HTMLElement).click())
const byText = (text: string) => [...document.querySelectorAll('button')].find((b) => b.textContent?.includes(text))
const wait = () => act(async () => void (await new Promise((r) => setTimeout(r, 40))))
async function mount(node: React.ReactElement) {
  const host = document.createElement('div')
  document.body.append(host)
  root = createRoot(host)
  await act(async () => root!.render(node))
  await wait()
  return host
}

describe('ShareList', () => {
  const ID = 'ab'.repeat(16)

  it('makes a link and a QR code for a copy, and takes the share back', async () => {
    createShare.mockResolvedValue(ID)
    const host = await mount(<ShareList db={db} list={list} vocabulary={words} onChanged={() => {}} />)
    await click(byText('Bağlantı oluştur'))
    await wait()
    expect(createShare).toHaveBeenCalledWith(expect.objectContaining({ kind: 'set', name: 'Ev', language: 'fr', words: expect.arrayContaining([expect.objectContaining({ key: 'fr:maison', meaning: 'ev' })]) }))
    expect((host.querySelector('input[aria-label="Bağlantı"]') as HTMLInputElement).value).toContain(`/?set=${ID}`)
    expect(host.querySelector('svg.qr path')!.getAttribute('d')!.length).toBeGreaterThan(100)
    deleteShare.mockResolvedValue(undefined)
    await click(byText('Paylaşımı kaldır'))
    await wait()
    expect(deleteShare).toHaveBeenCalledWith(ID)
    expect(host.querySelector('input[aria-label="Bağlantı"]')).toBeNull()
  })

  it('a shared list is joined on this device too, so it stays in step', async () => {
    createShare.mockResolvedValue(ID)
    const host = await mount(<ShareList db={db} list={list} vocabulary={words} onChanged={() => {}} />)
    await click([...host.querySelectorAll('button')].find((b) => b.textContent === 'Ortak liste'))
    await click(byText('Ortak liste bağlantısı oluştur'))
    await wait()
    expect(createShare).toHaveBeenCalledWith(expect.objectContaining({ kind: 'collab' }))
    const { getCollabs } = await import('../data/share')
    expect(await getCollabs(db)).toEqual([expect.objectContaining({ id: ID, listId: 'L1', known: expect.arrayContaining(['fr:maison', 'fr:chat']) })])
  })

  it('says what is wrong when the account is not approved', async () => {
    createShare.mockRejectedValue(new ShareError('Bu özellik, site sahibinin onayladığı hesaplara açık.', 'approval'))
    const host = await mount(<ShareList db={db} list={list} vocabulary={words} onChanged={() => {}} />)
    await click(byText('Bağlantı oluştur'))
    await wait()
    expect(host.querySelector('[role=alert]')!.textContent).toContain('onayladığı hesaplara')
  })

  it('an empty list cannot be shared', async () => {
    await mount(<ShareList db={db} list={list} vocabulary={[]} onChanged={() => {}} />)
    expect(byText('Bağlantı oluştur')!.hasAttribute('disabled')).toBe(true)
  })
})

describe('IncomingSet', () => {
  const doc = {
    v: 1,
    kind: 'set',
    name: 'Evcil',
    language: 'fr',
    words: [
      { key: 'fr:chien', word: 'le chien', meaning: 'köpek', at: '2026-10-12T10:00:00Z' },
      { key: 'fr:chat', word: 'le chat', meaning: 'kedi', at: '2026-10-12T10:00:00Z' },
    ],
    createdAt: '2026-10-12T10:00:00Z',
    updatedAt: '2026-10-12T10:00:00Z',
  }

  it('shows what is in the list, adds nothing until confirmed, then adds a list of its own', async () => {
    fetchShare.mockResolvedValue({ doc })
    const onDone = vi.fn()
    await mount(<IncomingSet id={'cd'.repeat(16)} onClose={() => {}} onDone={onDone} />)
    expect(document.body.textContent).toContain('Evcil')
    expect(document.body.textContent).toContain('le chien')
    expect(await db.vocabulary.count()).toBe(0)
    await click(byText('Listeme ekle'))
    await wait()
    expect((await db.vocabulary.toArray()).map((e) => e.lemma).sort()).toEqual(['chat', 'chien'])
    expect((await db.getLists('fr')).map((l) => l.name)).toEqual(['Evcil'])
    expect(onDone).toHaveBeenCalled()
  })

  it('closes with a message when the link leads nowhere', async () => {
    fetchShare.mockRejectedValue(new ShareError('Bu bağlantıdaki liste bulunamadı.', 'notfound'))
    const onClose = vi.fn()
    await mount(<IncomingSet id={'ee'.repeat(16)} onClose={onClose} onDone={() => {}} />)
    expect(onClose).toHaveBeenCalled()
  })

  it('a shared list asks to join, not to add', async () => {
    fetchShare.mockResolvedValue({ doc: { ...doc, kind: 'collab' } })
    await mount(<IncomingSet id={'cd'.repeat(16)} onClose={() => {}} onDone={() => {}} />)
    expect(byText('Katıl')).toBeDefined()
    expect(byText('Listeme ekle')).toBeUndefined()
  })
})
