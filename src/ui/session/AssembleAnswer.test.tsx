// @vitest-environment happy-dom
;(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true
import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { TypedExercise } from '../../engine/exercises'
import { TypedAnswer } from './Answers'

const exercise: TypedExercise = { type: 'assemble', entryId: 'fr:maison', skill: 'recognition', kind: 'typed', prompt: 'ev', accepted: ['la maison'], hints: [], tiles: ['son', 'la ', 'mai', 'ble'] }

let el: HTMLDivElement
afterEach(() => el?.remove())

describe('building a word from its pieces', () => {
  it('taps the pieces into the answer in order, takes the last one back, and sends what was built', () => {
    const onSubmit = vi.fn()
    el = document.createElement('div')
    document.body.append(el)
    const root = createRoot(el)
    act(() => root.render(<TypedAnswer exercise={exercise} language="fr" answered={false} onSubmit={onSubmit} />))
    const input = el.querySelector<HTMLInputElement>('input.answer-input')!
    const piece = (t: string) => [...el.querySelectorAll<HTMLButtonElement>('.piece-bank .chip')].find((b) => b.textContent === t)!
    // Read-only: no keyboard pops up on a phone, no accent bar, no microphone.
    expect(input.readOnly).toBe(true)
    expect(el.querySelector('.accent-bar')).toBeNull()
    for (const t of ['la', 'mai', 'ble']) act(() => piece(t).click())
    expect(input.value).toBe('la maible')
    expect(piece('ble').disabled).toBe(true)
    act(() => [...el.querySelectorAll('button')].find((b) => b.textContent === 'Son parçayı geri al')!.click())
    act(() => piece('son').click())
    expect(input.value).toBe('la maison')
    act(() => el.querySelector<HTMLButtonElement>('button[type=submit]')!.click())
    expect(onSubmit).toHaveBeenCalledWith('la maison', 0, false)
    act(() => root.unmount())
  })
})
