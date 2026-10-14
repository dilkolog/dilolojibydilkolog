// @vitest-environment happy-dom
import 'fake-indexeddb/auto'
import '../engine/conjugationData'
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'
import App from '../App'
import { db } from '../data/instance'
import { createEntry } from '../data/wordInput'
import { installFocusTrap } from '../ui/focusTrap'

/**
 * End-to-end flows through the whole app (happy-dom, an in-memory IndexedDB): the paths a
 * learner takes every day, each step driven the way a user would. They run in every check.
 */
;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true
vi.stubGlobal('fetch', async () => new Response('{}', { status: 404 }))
installFocusTrap()

let el: HTMLDivElement
let root: Root
const sleep = (ms: number) => act(async () => new Promise((r) => setTimeout(r, ms)))
const buttons = () => [...el.querySelectorAll<HTMLButtonElement>('button')].filter((b) => !b.disabled)
const button = (re: RegExp) => buttons().find((b) => re.test(b.textContent?.trim() ?? ''))
const click = async (b: HTMLElement | undefined | null) => {
  expect(b, 'button to click').toBeTruthy()
  await act(async () => {
    b!.click()
    await new Promise((r) => setTimeout(r, 30))
  })
}
const type = async (input: HTMLInputElement | HTMLTextAreaElement, text: string) =>
  act(async () => {
    Object.getOwnPropertyDescriptor(Object.getPrototypeOf(input), 'value')!.set!.call(input, text)
    input.dispatchEvent(new Event('input', { bubbles: true }))
  })
const until = async (ok: () => unknown, what: string, tries = 40) => {
  for (let i = 0; i < tries && !ok(); i++) await sleep(50)
  expect(ok(), what).toBeTruthy()
}
const mount = async () => {
  el = document.createElement('div')
  document.body.append(el)
  root = createRoot(el)
  await act(async () => root.render(<App />))
  await sleep(200)
}
const unmount = async () => {
  await act(async () => root.unmount())
  el.remove()
}

/** Plays the session until a graded answer's feedback sheet is on screen (introductions pass). */
async function answerUntilSheet(pick: (options: HTMLButtonElement[]) => HTMLButtonElement) {
  for (let i = 0; i < 40; i++) {
    if (el.querySelector('.sheet')) return
    const options = [...el.querySelectorAll<HTMLButtonElement>('.session-stage .option:not([disabled])')]
    const input = el.querySelector<HTMLInputElement>('.session input.answer-input:not([disabled])')
    const go = button(/^(Devam|Anladım|Öğrendim|Yazarak cevapla)/)
    if (options.length) await click(pick(options))
    else if (input) {
      await type(input, 'xyz')
      await click(button(/^Kontrol et/))
    } else if (go) await click(go)
    else await sleep(100)
  }
}

beforeAll(async () => {
  await mount()
})
afterAll(unmount)

describe('a learner’s day', () => {
  it('first run: picks French, starts, loads the sample words', async () => {
    await click(button(/^Başlayalım$/))
    await click([...el.querySelectorAll<HTMLButtonElement>('.lang-card')].find((b) => b.textContent?.includes('Fransızca')))
    await click(button(/^Devam$/)) // language → goal
    await click(button(/^Devam$/)) // goal → ready
    await click(button(/Fransızca ile başlayalım/))
    await until(() => button(/örnek kelime yükle/), 'sample words offer', 200)
    await click(button(/örnek kelime yükle/))
    // They open in the word list; back to Today.
    await until(() => button(/^Bugün\d*$/), 'Today in the menu')
    await click(button(/^Bugün\d*$/))
    await until(() => button(/^(Başla|Devam et)$/), 'start button on Today')
    // Sample words are not the learner's own: no backup nudge for them.
    expect(el.querySelector('.backup-nudge')).toBeNull()
  })

  it('quitting with an answer on screen counts it, and focus stays in the dialog', { timeout: 20_000 }, async () => {
    await click(button(/^(Başla|Devam et)$/))
    await until(() => el.querySelector('.session'), 'session')
    await answerUntilSheet((o) => o[0])
    // The answer on screen is saved, though it joins the log only on "Devam".
    await act(async () => window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' })))
    await sleep(900) // past the feedback sheet's delayed focus on its own Devam
    const dialog = el.querySelector('[role=alertdialog]')!
    expect(dialog.textContent).toMatch(/Verdiğin \d+ cevap kaydedildi/)
    expect(dialog.contains(document.activeElement)).toBe(true)
    await click([...dialog.querySelectorAll<HTMLButtonElement>('button')].find((b) => b.textContent === 'Devam et'))
    expect(el.querySelector('[role=alertdialog]')).toBeNull()
  })

  it('"Yanlış dokundum, sayma" takes a wrong choice back entirely', { timeout: 30_000 }, async () => {
    for (let round = 0; round < 12; round++) {
      await click(button(/^Devam$/))
      const before = await db.events.count()
      await answerUntilSheet((o) => o[o.length - 1])
      const discard = button(/Yanlış dokundum/)
      if (!discard) continue
      expect(await db.events.count()).toBe(before + 1)
      await click(discard)
      await sleep(100)
      expect(await db.events.count()).toBe(before)
      return
    }
    throw new Error('no wrong choice came up to take back')
  })

  it('the session ends in a summary with free recall', { timeout: 60_000 }, async () => {
    for (let i = 0; i < 80 && !el.querySelector('.summary-grid'); i++) {
      if (button(/^Devam$/)) await click(button(/^Devam$/))
      // A confident error keeps Devam off for a moment, on purpose.
      else if (el.querySelector('.sheet')) await sleep(200)
      else await answerUntilSheet((o) => o[0])
    }
    await until(() => el.querySelector('.summary-grid'), 'summary')
    await click(el.querySelector<HTMLButtonElement>('.free-recall-offer button'))
    // The word lists hide while the learner writes from memory.
    expect(el.querySelector('.summary-side')?.hasAttribute('hidden')).toBe(true)
    await type(el.querySelector<HTMLTextAreaElement>('#free-recall-text')!, 'xyz')
    await click(button(/^Karşılaştır$/))
    expect(el.querySelector('.free-recall')?.textContent).toMatch(/kelimeden 0 tanesini/)
    expect(el.querySelector('.summary-side')?.hasAttribute('hidden')).toBe(false)
  })

  it('with own words and no backup, Today offers one, and taking it puts the offer away', async () => {
    const now = new Date()
    await db.vocabulary.bulkPut(Array.from({ length: 20 }, (_, i) => createEntry({ word: `mot${i}`, meaning: `kelime ${i}` }, 'fr', now)))
    await unmount()
    await mount()
    await until(() => el.querySelector('.backup-nudge'), 'backup nudge')
    expect(el.querySelector('.backup-nudge')?.textContent).toContain('Hiç yedek almadın')
    URL.createObjectURL = vi.fn(() => 'blob:backup')
    URL.revokeObjectURL = vi.fn()
    const download = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})
    await click(el.querySelector<HTMLButtonElement>('.backup-nudge .habit-nudge-main'))
    await sleep(100)
    expect(download).toHaveBeenCalled()
    expect(el.querySelector('.backup-nudge')).toBeNull()
    expect(Number(localStorage.getItem('kelime-koc:last-backup'))).toBeGreaterThan(0)
  })

  it('a word list with a level of one’s own: create, move words in, focus, and Today takes new words from it', { timeout: 20_000 }, async () => {
    const tab = (name: string) => [...el.querySelectorAll<HTMLButtonElement>('[role=tab]')].find((b) => b.textContent?.trim() === name)
    await click(button(/^Kelimeler\d*$/))
    await until(() => tab('Listeler'), 'Listeler tab')
    await click(tab('Listeler'))
    await type(el.querySelector<HTMLInputElement>('.wl-create input')!, 'Seyahat')
    await click(el.querySelector<HTMLButtonElement>('.wl-create button[type=submit]'))
    await until(() => [...el.querySelectorAll('.wl-name')].some((n) => n.textContent?.startsWith('Seyahat')), 'the new list')
    // A level of the learner's own, like on Memrise.
    await type(el.querySelector<HTMLInputElement>('.wl-add-level input')!, 'Havalimanı')
    await click(el.querySelector<HTMLButtonElement>('.wl-add-level button[type=submit]'))
    await until(() => el.querySelector('.wl-sections summary')?.textContent?.includes('1. Havalimanı'), 'the new level')
    // Into it from "Tümü": select all, "Listeye taşı".
    await click(tab('Tümü'))
    await click(button(/^Seç$/))
    await click(el.querySelector<HTMLInputElement>('.select-bar input[type=checkbox]'))
    await click(el.querySelector<HTMLButtonElement>('.select-bar-move button'))
    // The list's options answer to mousedown (so the field keeps focus).
    const option = [...el.querySelectorAll<HTMLElement>('.select-list li')].find((o) => o.textContent?.trim() === 'Seyahat › Havalimanı')!
    await act(async () => {
      option.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true }))
      await new Promise((r) => setTimeout(r, 50))
    })
    const [saved] = await db.getLists('fr')
    const inList = async () => (await db.vocabulary.where('language').equals('fr').toArray()).filter((v) => v.listId === saved.id && v.levelId === saved.levels![0].id).length
    for (let i = 0; i < 40 && !(await inList()); i++) await sleep(50)
    expect(await inList()).toBe(await db.vocabulary.where('language').equals('fr').count())
    await click(tab('Listeler'))
    await until(() => button(/^Odaklan$/), 'odaklan button')
    await click(button(/^Odaklan$/))
    await until(() => el.querySelector('.wl-card.is-focus'), 'list in focus')
    await click(button(/^Bugün\d*$/))
    await until(() => el.querySelector('.hero-focus'), 'focus line on Today')
    expect(el.querySelector('.hero-focus')?.textContent).toMatch(/Seyahat.*Havalimanı/)
  })
})
