// @vitest-environment happy-dom
import { beforeAll, describe, expect, it, vi } from 'vitest'
import { readingKey } from '../../src/engine/reading'
import type { ExtData } from '../../src/ui/extensionProtocol'

const empty = { list: [], known: [], ignored: [] }
const data: ExtData = {
  fr: {
    list: [
      { k: readingKey('décision', 'fr'), id: 'fr:decision', w: 'la décision', g: 'karar', s: 0 },
      { k: readingKey('quotidien', 'fr'), id: 'fr:quotidien', w: 'quotidien', g: 'günlük', s: 5 },
    ],
    known: [readingKey('maison', 'fr')],
    ignored: [],
  },
  en: { list: [{ k: readingKey('decision', 'en'), id: 'en:decision', w: 'decision', g: 'karar', s: 2 }], known: [], ignored: [] },
  es: empty,
}
let store: Record<string, unknown> = {}

beforeAll(() => {
  store = { settings: { mode: 'all', turkish: true, turkishLang: 'en' }, data }
  vi.stubGlobal('chrome', {
    storage: {
      local: {
        get: async () => structuredClone(store),
        set: async (v: Record<string, unknown>) => void Object.assign(store, v),
      },
      onChanged: { addListener: () => {} },
    },
  })
})

const tick = () => new Promise((r) => setTimeout(r, 30))

describe('extension content script', () => {
  it('marks list words by stage and new words, leaves known words, stop words, names and code alone', async () => {
    document.documentElement.lang = 'fr'
    document.body.innerHTML = `<p>Elle a pris une décision difficile dans la maison de Pierre, chaque jour, au quotidien.</p><pre>décision</pre>`
    await import('../src/content')
    await tick()
    const marks = [...document.querySelectorAll('.kk-w')].map((e) => `${e.textContent}:${e.className.replace('kk-w ', '')}`)
    expect(marks).toContain('décision:kk-l0')
    expect(marks).toContain('quotidien:kk-l2')
    expect(marks).toContain('difficile:kk-new')
    expect(marks.some((m) => m.startsWith('maison'))).toBe(false)
    expect(marks.some((m) => m.startsWith('Pierre'))).toBe(false)
    expect(marks.some((m) => m.startsWith('dans') || m.startsWith('la:'))).toBe(false)
    expect(document.querySelector('pre')!.innerHTML).toBe('décision')
    // The text itself is unchanged.
    expect(document.querySelector('p')!.textContent).toBe('Elle a pris une décision difficile dans la maison de Pierre, chaque jour, au quotidien.')
  })

  it('reports list words seen on the page once, for the app to count as encounters', async () => {
    await new Promise((r) => setTimeout(r, 3200))
    const seen = store.pendingSightings as Record<string, { host: string }[]>
    expect(Object.keys(seen).sort()).toEqual(['fr:decision', 'fr:quotidien'])
    expect(seen['fr:decision']).toHaveLength(1)
  }, 10_000)

  it('a click opens the bubble; "Biliyorum" queues the word for the app and unmarks it', async () => {
    const word = [...document.querySelectorAll<HTMLElement>('.kk-new')].find((e) => e.textContent === 'difficile')!
    word.click()
    const shadow = document.getElementById('kk-host')!.shadowRoot!
    expect(shadow.textContent).toContain('Listende yok')
    const knew = [...shadow.querySelectorAll('button')].find((b) => b.textContent === 'Biliyorum')!
    knew.click()
    await tick()
    expect((store.pendingKnown as Record<string, string[]>).fr).toEqual([readingKey('difficile', 'fr')])
    expect([...document.querySelectorAll('.kk-new')].some((e) => e.textContent === 'difficile')).toBe(false)
  })

  it('the add link carries the word, its sentence and the page', async () => {
    const word = document.querySelector<HTMLElement>('.kk-new')!
    word.click()
    const link = document.getElementById('kk-host')!.shadowRoot!.querySelector<HTMLAnchorElement>('a.p')!
    const url = new URL(link.getAttribute('href')!)
    expect(url.origin).toBe('https://diloloji.com')
    expect(url.searchParams.get('lang')).toBe('fr')
    expect(url.searchParams.get('context')).toContain(word.textContent!)
  })

  it('on a Turkish page shows one of your words in the target language, once, with the Turkish kept', async () => {
    vi.resetModules()
    document.getElementById('kk-host')?.remove()
    document.documentElement.lang = 'tr'
    document.body.innerHTML = '<p>Bu karar çok zordu.</p><p>Sonunda karar verdik.</p>'
    await import('../src/content')
    await tick()
    const swapped = [...document.querySelectorAll<HTMLElement>('.kk-tr')]
    expect(swapped.map((e) => e.textContent)).toEqual(['decision'])
    expect(swapped[0].dataset.tr).toBe('karar')
    expect(document.body.textContent).toBe('Bu decision çok zordu.Sonunda karar verdik.')
  })
})
