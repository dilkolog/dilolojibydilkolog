// @vitest-environment happy-dom
import 'fake-indexeddb/auto'
;(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true
import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { db } from '../../../data/instance'
import type { PtePack } from '../../../data/pte'
import realPack from '../../../data/pte/en.json'
import type { ExamPassage } from '../../../engine/examReading'
import { pteKey } from '../../../engine/pteScore'
import { ExamsScreen } from '../ExamsScreen'
import { PteDrill } from './PteDrill'

const q = [{ prompt: 'q', options: ['a', 'b'], answer: 0, why: '' }]
const passages: ExamPassage[] = [{ id: 'en-b1', language: 'en', exam: 'Cambridge', level: 'B1', title: 'A notice', text: 'Hello all', tr: '', questions: q }]
const asq = (i: number) => ({ id: `asq-${i}`, question: 'How many days are there in a week?', answers: ['seven', '7'], level: 'A2', tr: 'Bir haftada kaç gün vardır? Yedi.' })
const wfd = (i: number) => ({ id: `wfd-${i}`, text: 'The library closes early on Fridays.', level: 'A2', topic: 'campus', tr: 'Kütüphane cuma erken kapanır.' })
const pack = (extra: Partial<PtePack> = {}): PtePack => ({ language: 'en', source: 'test', wfd: [], rs: [], ra: [], fib: [], asq: [], ...extra })

let container: HTMLDivElement
let root: ReturnType<typeof createRoot>
beforeEach(async () => {
  localStorage.clear()
  await db.meta.clear()
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
})
afterEach(() => {
  act(() => root.unmount())
  container.remove()
})
const settle = () => act(() => new Promise((r) => setTimeout(r, 30)))
const button = (text: string) => [...container.querySelectorAll('button')].find((b) => b.textContent?.includes(text)) as HTMLButtonElement
const cards = () => [...container.querySelectorAll('.pte-section .examtask-item')].map((c) => c.textContent)
const show = async (ptePack: PtePack | null, extra: Partial<Parameters<typeof ExamsScreen>[0]> = {}) => {
  act(() => root.render(<ExamsScreen language="en" passages={passages} tasks={[]} ptePack={ptePack} onOpenSet={() => {}} onCloseSet={() => {}} onOpenTask={() => {}} {...extra} />))
  await settle()
}

describe('PTE-style on the exams screen', () => {
  it('is an exam of its own next to the others, practice mode first, with a card per task', async () => {
    await show(realPack as PtePack)
    expect([...container.querySelectorAll('[aria-label="Sınav"] button')].map((b) => b.textContent)).toEqual(['Cambridge tarzı', 'PTE tarzı'])
    act(() => button('PTE tarzı').click())
    expect(button('Alıştırma').getAttribute('aria-pressed')).toBe('true')
    expect(cards()).toHaveLength(5)
    for (const name of ['Dikte', 'Cümle tekrarı', 'Sesli okuma', 'Boşluk doldurma', 'Kısa soru']) expect(container.textContent).toContain(name)
    expect(container.textContent).toContain(`0 / ${realPack.wfd.length} öğe yapıldı`)
    expect(container.textContent).toContain('Pearson ile bir bağlantısı yoktur')
    expect(container.textContent).not.toContain('A notice')
    // The exam mode is a choice, kept.
    act(() => button('Sınav').click())
    expect(localStorage.getItem('diloloji:pte-mode')).toBe('exam')
  })

  it('counts come from the content: a task without items has no card, 600 items work as well as 5', async () => {
    const big = pack({ wfd: Array.from({ length: 600 }, (_, i) => wfd(i)), asq: [asq(1), asq(2)] })
    await db.savePteLog({
      items: { [pteKey('wfd', 'wfd-3')]: { got: 6, of: 6, at: new Date().toISOString(), tries: 1 }, [pteKey('wfd', 'nope')]: { got: 1, of: 1, at: new Date().toISOString(), tries: 1 } },
      rounds: { wfd: { got: 3.5, of: 5, at: new Date().toISOString(), items: 5 } },
    })
    await show(big)
    act(() => button('PTE tarzı').click())
    expect(cards()).toHaveLength(2)
    expect(cards()[0]).toContain('1 / 600 öğe yapıldı · son tur %70 doğruluk')
    expect(cards()[1]).toContain('0 / 2 öğe yapıldı')
    expect(container.textContent).not.toContain('Sesli okuma')
  })

  it('a language with nothing else shows PTE-style straight away; none at all, the empty state', async () => {
    act(() => root.render(<ExamsScreen language="en" passages={[]} tasks={[]} ptePack={pack({ asq: [asq(1)] })} onOpenSet={() => {}} onCloseSet={() => {}} onOpenTask={() => {}} />))
    await settle()
    expect(cards()).toHaveLength(1)
    expect(container.querySelector('.empty-state')).toBeNull()
    act(() => root.render(<ExamsScreen language="en" passages={[]} tasks={[]} ptePack={null} onOpenSet={() => {}} onCloseSet={() => {}} onOpenTask={() => {}} />))
    await settle()
    expect(container.querySelector('.empty-state')).not.toBeNull()
  })

  it('a card opens its task', async () => {
    const onOpenPte = vi.fn()
    await show(realPack as PtePack, { onOpenPte })
    act(() => button('PTE tarzı').click())
    act(() => button('Boşluk doldurma').click())
    expect(onOpenPte).toHaveBeenCalledWith('fib')
  })
})

describe('a round of a task', () => {
  it('scores each answer, shows the right answer and its Turkish, keeps the result and the round', async () => {
    const onExit = vi.fn()
    act(() => root.render(<PteDrill task="asq" pack={pack({ asq: [asq(1), asq(2)] })} log={{ items: {}, rounds: {} }} mode="practice" onExit={onExit} />))
    const type = (text: string) => {
      const input = container.querySelector('input') as HTMLInputElement
      act(() => {
        Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(input, text)
        input.dispatchEvent(new Event('input', { bubbles: true }))
      })
    }
    expect(container.textContent).toContain('1 / 2')
    type('Seven.')
    act(() => button('Kontrol et').click())
    expect(container.textContent).toContain('Doğruluk %100')
    expect(container.textContent).toContain('Bir haftada kaç gün vardır? Yedi.')
    act(() => button('Devam').click())
    type('six')
    act(() => button('Kontrol et').click())
    expect(container.textContent).toContain('Doğruluk %0')
    expect(container.textContent).toContain('Doğru cevap: seven')
    act(() => button('Sonucu gör').click())
    expect(container.textContent).toContain('Kısa soru: %50 doğruluk')
    expect(container.textContent).toContain('PTE puanı değildir')
    await settle()
    const log = await db.getPteLog()
    expect(log.items[pteKey('asq', 'asq-1')]).toMatchObject({ got: 1, of: 1 })
    expect(log.items[pteKey('asq', 'asq-2')]).toMatchObject({ got: 0, of: 1 })
    expect(log.rounds.asq).toMatchObject({ of: 2, items: 2 })
    // Free-practice XP for the right answer only, once a day; no answer was added to the word history.
    const ledger = await db.getXpLedger()
    expect(Object.keys(ledger)).toEqual([expect.stringMatching(/^pte\|asq\|asq-1\|\d{4}-\d{2}-\d{2}$/)])
    expect(await db.events.count()).toBe(0)
    act(() => button('Sınavlara dön').click())
    expect(onExit).toHaveBeenCalled()
  })
})
