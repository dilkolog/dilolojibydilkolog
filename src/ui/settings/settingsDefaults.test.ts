// @vitest-environment happy-dom
import { describe, expect, it } from 'vitest'
import { DEFAULT_SETTINGS } from '../../data/db'
import { changedFromDefault, readMore, RESET_KEYS, resetGroup } from './settingsDefaults'

describe('a group back to its defaults', () => {
  it('sees no change in fresh settings, nor in an optional setting left unset or set to what unset means', () => {
    for (const id of Object.keys(RESET_KEYS) as (keyof typeof RESET_KEYS)[]) expect(changedFromDefault(DEFAULT_SETTINGS, id)).toBe(false)
    expect(changedFromDefault({ ...DEFAULT_SETTINGS, probes: true, soundVolume: 0.8, exercisePrefs: {} }, 's-study')).toBe(false)
    expect(changedFromDefault({ ...DEFAULT_SETTINGS, soundVolume: 0.8, soundLevel: 'all' }, 's-sound')).toBe(false)
  })

  it('puts back only the group’s settings and keeps the personal ones', () => {
    const mine = { ...DEFAULT_SETTINGS, dailyXpGoal: 200, probes: false, studyPlan: 'Sabah', theme: 'dark' as const, soundLevel: 'moments' as const }
    expect(changedFromDefault(mine, 's-study')).toBe(true)
    const back = resetGroup(mine, 's-study')
    expect(back.dailyXpGoal).toBe(50)
    expect(back.probes).toBe(true)
    expect(back.studyPlan).toBe('Sabah')
    expect(back.theme).toBe('dark')
    expect(back.soundLevel).toBe('moments')
    expect(changedFromDefault(back, 's-study')).toBe(false)
    expect(resetGroup(mine, 's-sound').soundLevel).toBe('all')
  })

  it('remembers only the groups it knows', () => {
    localStorage.setItem('diloloji:settings-more', JSON.stringify(['s-study', 'nope', 3]))
    expect(readMore((id) => id.startsWith('s-'))).toEqual(['s-study'])
    localStorage.setItem('diloloji:settings-more', '{bad')
    expect(readMore(() => true)).toEqual([])
    localStorage.removeItem('diloloji:settings-more')
  })
})
