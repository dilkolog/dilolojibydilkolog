// @vitest-environment happy-dom
;(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true
import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { describe, expect, it, vi } from 'vitest'

vi.mock('../data/wordpack', () => ({
  loadPack: async () => ({ w: { casa: { t: ['ev'] }, tratar: { t: ['ele almak'] } }, f: { trata: 'tratar' } }),
  packRecord: (pack: { w: Record<string, unknown> } | undefined, lemma: string) => pack?.w[lemma],
  baseForm: (pack: { f?: Record<string, string> } | undefined, word: string) => pack?.f?.[word],
}))

const { TapNote, TapWords } = await import('./TapWords')
const { useTapGloss } = await import('./useTapGloss')

function Demo({ text, language }: { text: string; language: string }) {
  const tap = useTapGloss(language)
  return (
    <div>
      <p className="s">
        <TapWords text={text} tap={tap} />
      </p>
      <TapNote tap={tap} />
    </div>
  )
}

const flush = () => act(async () => void (await new Promise((r) => setTimeout(r, 10))))

describe('tapping a word of a sentence', () => {
  it('keeps the sentence text, shows the meaning under it, a form with its word, and closes on a second tap', async () => {
    const el = document.createElement('div')
    document.body.appendChild(el)
    const root = createRoot(el)
    act(() => root.render(<Demo text="La casa trata, bien." language="es" />))
    await flush()
    expect(el.querySelector('.s')?.textContent).toBe('La casa trata, bien.')
    expect(el.querySelector('.tap-note')?.hasAttribute('hidden')).toBe(true)
    const words = [...el.querySelectorAll<HTMLElement>('.tap-word')]
    expect(words.map((w) => w.textContent)).toEqual(['La', 'casa', 'trata', 'bien'])
    act(() => words[1].click())
    expect(el.querySelector('.tap-note')?.textContent).toBe('casa · ev')
    act(() => words[2].click())
    expect(el.querySelector('.tap-note')?.textContent).toBe('trata ← tratar · ele almak')
    act(() => words[3].click())
    expect(el.querySelector('.tap-note')?.textContent).toContain('sözlükte bulunamadı')
    act(() => words[3].click())
    expect(el.querySelector('.tap-note')?.hasAttribute('hidden')).toBe(true)
    act(() => root.unmount())
    el.remove()
  })

  it('does not make words tappable for a language it has no dictionary for', () => {
    const el = document.createElement('div')
    document.body.appendChild(el)
    const root = createRoot(el)
    act(() => root.render(<Demo text="Kedi uyuyor." language="tr" />))
    expect(el.querySelectorAll('.tap-word')).toHaveLength(0)
    expect(el.querySelector('.s')?.textContent).toBe('Kedi uyuyor.')
    act(() => root.unmount())
    el.remove()
  })

  it('a tap does not take the focus from an answer field (mousedown is cancelled)', async () => {
    const el = document.createElement('div')
    document.body.appendChild(el)
    const root = createRoot(el)
    act(() => root.render(<Demo text="casa" language="es" />))
    await flush()
    const word = el.querySelector<HTMLElement>('.tap-word')!
    const event = new MouseEvent('mousedown', { bubbles: true, cancelable: true })
    word.dispatchEvent(event)
    expect(event.defaultPrevented).toBe(true)
    act(() => root.unmount())
    el.remove()
  })
})
