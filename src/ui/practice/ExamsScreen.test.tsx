// @vitest-environment happy-dom
import 'fake-indexeddb/auto'
;(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true
import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { ExamPassage } from '../../engine/examReading'
import type { ExamTask } from '../../engine/examTasks'
import type { TargetLanguage } from '../../engine/types'
import { ExamsScreen } from './ExamsScreen'

const q = [{ prompt: 'q', options: ['a', 'b'], answer: 0, why: '' }]
const passages: ExamPassage[] = [
  { id: 'fr-a2', language: 'fr', exam: 'DELF', level: 'A2', title: 'Un message', text: 'Salut Léa', tr: '', questions: q },
  { id: 'fr-b2', language: 'fr', exam: 'DELF', level: 'B2', title: 'Un article', text: 'La ville change', tr: '', questions: q },
  { id: 'fr-c1', language: 'fr', exam: 'DALF', level: 'C1', title: 'Un essai', text: 'Il faut penser', tr: '', questions: q },
  { id: 'es-b1', language: 'es', exam: 'DELE', level: 'B1', title: 'Un anuncio', text: 'Hola a todos', tr: '', questions: q },
]
const task = (id: string, language: TargetLanguage, exam: string, level: ExamTask['level'], title: string): ExamTask => ({ id, language, exam, level, kind: 'Mektup', title, instruction: '', tr: '', min: 60, max: 80, checklist: [], phrases: [] })
const tasks = [task('t-fr-a2', 'fr', 'DELF', 'A2', 'Une invitation'), task('t-es-b1', 'es', 'DELE', 'B1', 'Una queja')]

describe('ExamsScreen', () => {
  let container: HTMLDivElement
  let root: ReturnType<typeof createRoot>
  beforeEach(() => {
    localStorage.clear()
    container = document.createElement('div')
    document.body.appendChild(container)
    root = createRoot(container)
  })
  afterEach(() => {
    act(() => root.unmount())
    container.remove()
  })
  const show = (language: TargetLanguage, extra: Partial<Parameters<typeof ExamsScreen>[0]> = {}) =>
    act(() => root.render(<ExamsScreen key={language} language={language} passages={passages} tasks={tasks} onOpenSet={() => {}} onCloseSet={() => {}} onOpenTask={() => {}} {...extra} />))
  const pressed = (label: string) => [...container.querySelectorAll(`[role="group"][aria-label="${label}"] button`)].map((b) => `${b.textContent}${b.getAttribute('aria-pressed') === 'true' ? '*' : ''}`)
  const button = (text: string) => [...container.querySelectorAll('button')].find((b) => b.textContent?.includes(text)) as HTMLButtonElement

  it('shows the active language’s exams, and others when the language changes', () => {
    show('fr')
    expect(pressed('Sınav')).toEqual(['DELF tarzı*', 'DALF tarzı'])
    expect(container.textContent).toContain('Un message')
    expect(container.textContent).toContain('Une invitation')
    show('es')
    // One exam: no exam chips, its level and content.
    expect(pressed('Sınav')).toEqual([])
    expect(pressed('Seviye')).toEqual(['B1*'])
    expect(container.textContent).toContain('Un anuncio')
    expect(container.textContent).toContain('Una queja')
    expect(container.textContent).not.toContain('Un message')
    expect(container.textContent).toContain('DELE adları yalnızca görevlerin tarzını anlatır')
  })

  it('offers only the levels with content, and the sections say when one is empty', () => {
    show('fr')
    expect(pressed('Seviye')).toEqual(['A2*', 'B2'])
    act(() => button('B2').click())
    expect(container.textContent).toContain('Un article')
    expect(container.textContent).toContain('Bu seviyede yazma görevi yok.')
    act(() => button('DALF tarzı').click())
    expect(pressed('Seviye')).toEqual(['C1*'])
  })

  it('remembers the exam and level per language', () => {
    show('fr')
    act(() => button('DALF tarzı').click())
    act(() => root.unmount())
    root = createRoot(container)
    show('fr')
    expect(pressed('Sınav')).toEqual(['DELF tarzı', 'DALF tarzı*'])
    show('es')
    expect(pressed('Seviye')).toEqual(['B1*'])
  })

  it('opens a set or a task through the existing flows', () => {
    const onOpenSet = vi.fn()
    const onOpenTask = vi.fn()
    show('fr', { onOpenSet, onOpenTask })
    act(() => button('Un message').click())
    act(() => button('Une invitation').click())
    expect(onOpenSet).toHaveBeenCalledWith('fr-a2')
    expect(onOpenTask).toHaveBeenCalledWith('t-fr-a2')
  })
})
