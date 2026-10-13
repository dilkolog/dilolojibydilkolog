// @vitest-environment happy-dom
;(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true
import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { describe, expect, it, vi } from 'vitest'
import { PhraseBuilder } from './PhraseBuilder'

const buttons = (el: HTMLElement) => [...el.querySelectorAll<HTMLButtonElement>('button')]
const byText = (el: HTMLElement, text: string) => buttons(el).find((b) => b.textContent?.includes(text))!

describe('PhraseBuilder', () => {
  it('is a quiet link until opened, then widens word by word and adds the phrase with its sentence', () => {
    const onAdd = vi.fn()
    const el = document.createElement('div')
    document.body.appendChild(el)
    const root = createRoot(el)
    const sentence = 'Elle a envie de partir.'
    act(() => root.render(<PhraseBuilder sentence={sentence} word="envie" language="fr" onAdd={onAdd} />))
    expect(el.querySelector('.phrase-text')).toBeNull()
    act(() => byText(el, 'Kalıp olarak ekle').click())
    expect(el.querySelector('.phrase-text')?.textContent).toBe('envie')
    act(() => byText(el, 'Sonraki sözcük').click())
    act(() => byText(el, 'Önceki sözcük').click())
    expect(el.querySelector('.phrase-text')?.textContent).toBe('a envie de')
    act(() => byText(el, 'Kalıbı kelimelerime ekle').click())
    expect(onAdd).toHaveBeenCalledWith('a envie de', sentence)
    act(() => root.unmount())
    el.remove()
  })

  it('disables a direction at the end of the sentence, and shows nothing for a word that is not in it', () => {
    const el = document.createElement('div')
    document.body.appendChild(el)
    const root = createRoot(el)
    act(() => root.render(<PhraseBuilder sentence="Bonjour tout le monde." word="monde" language="fr" onAdd={() => {}} />))
    act(() => byText(el, 'Kalıp olarak ekle').click())
    expect(byText(el, 'Sonraki sözcük').disabled).toBe(true)
    expect(byText(el, 'Önceki sözcük').disabled).toBe(false)
    act(() => root.render(<PhraseBuilder sentence="Bonjour tout le monde." word="absent" language="fr" onAdd={() => {}} />))
    expect(el.textContent).toBe('')
    act(() => root.unmount())
    el.remove()
  })
})
