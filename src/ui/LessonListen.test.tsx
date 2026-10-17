// @vitest-environment happy-dom
;(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true
import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { lessonFor, lessonTitle } from '../data/guide/lessonOf'
import { LessonListen } from './LessonListen'

const said: string[] = []
let release: (() => void) | null = null
vi.mock('./speech', () => ({
  canSpeak: () => true,
  stopSpeaking: vi.fn(),
  speakTurkishAsync: (t: string) => {
    said.push(`tr:${t}`)
    return new Promise<void>((r) => (release = r))
  },
  speakAsync: (t: string, l: string) => {
    said.push(`${l}:${t}`)
    return new Promise<void>((r) => (release = r))
  },
}))

let root: ReturnType<typeof createRoot> | undefined
afterEach(() => {
  act(() => root?.unmount())
  document.body.innerHTML = ''
  said.length = 0
})

describe('LessonListen', () => {
  it('reads the lesson part by part, shows where it is, and stops on a second tap', async () => {
    const lesson = lessonFor('fr', 'subjonctif')!
    const host = document.createElement('div')
    document.body.append(host)
    root = createRoot(host)
    await act(async () => root!.render(<LessonListen lesson={lesson} title={lessonTitle(lesson)} />))
    const button = () => host.querySelector('button')!
    expect(button().textContent).toContain('Dersi dinle')
    await act(async () => button().click())
    expect(said[0]).toContain('tr:Subjonctif')
    expect(button().textContent).toMatch(/Durdur \(1\/\d+\)/)
    await act(async () => release!())
    await act(() => new Promise((r) => setTimeout(r, 0)))
    expect(said).toHaveLength(2)
    expect(button().textContent).toMatch(/Durdur \(2\//)
    await act(async () => button().click())
    expect(button().textContent).toContain('Dersi dinle')
    // The part being spoken ends after the stop: nothing more is read.
    await act(async () => release!())
    await act(() => new Promise((r) => setTimeout(r, 0)))
    expect(said).toHaveLength(2)
  })
})
