// @vitest-environment happy-dom
import { beforeEach, describe, expect, it } from 'vitest'
import type { WordList } from '../engine/types'
import { defaultPlacement, rememberPlacement } from './listMemory'
import { presetList } from './studyOptionsStore'

const list = (id: string, levels: string[] = []): WordList => ({ id, language: 'fr', name: id, levels: levels.map((l) => ({ id: l, name: l })), createdAt: '', updatedAt: '' })

describe('where new words go', () => {
  beforeEach(() => localStorage.clear())

  it('takes the list last used or opened, else the one in focus, else none', () => {
    const lists = [list('travel', ['airport']), list('work')]
    expect(defaultPlacement('fr', lists)).toBe('__none')
    expect(defaultPlacement('fr', lists, 'work')).toBe('work')
    rememberPlacement('fr', 'travel|airport')
    expect(defaultPlacement('fr', lists, 'work')).toBe('travel|airport')
    // Another language keeps its own.
    expect(defaultPlacement('es', lists, 'work')).toBe('work')
    // "No list" chosen on purpose stays no list.
    rememberPlacement('fr', '')
    expect(defaultPlacement('fr', lists, 'work')).toBe('__none')
  })

  it('passes over a list deleted since', () => {
    rememberPlacement('fr', 'gone')
    expect(defaultPlacement('fr', [list('work')], 'work')).toBe('work')
  })

  it('sets a round to one list and keeps its other choices', () => {
    localStorage.setItem('diloloji:study-options:test', JSON.stringify({ scope: 'weak', size: 40 }))
    presetList('test', 'travel')
    expect(JSON.parse(localStorage.getItem('diloloji:study-options:test')!)).toEqual({ scope: 'list', listId: 'travel', size: 40 })
    presetList('gravity', 'work')
    expect(JSON.parse(localStorage.getItem('diloloji:study-options:gravity')!)).toEqual({ scope: 'list', listId: 'work' })
  })
})
