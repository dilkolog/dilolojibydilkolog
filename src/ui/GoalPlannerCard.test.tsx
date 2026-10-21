// @vitest-environment happy-dom
;(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true
import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { KelimeDB, Settings } from '../data/db'
import type { LevelCoverage } from '../engine/cefrLevels'
import { GoalPlannerCard } from './GoalPlannerCard'

const mockLevels: LevelCoverage[] = [
  { level: 'A1', total: 500, known: 450, learning: 30 },
  { level: 'A2', total: 600, known: 300, learning: 50 },
  { level: 'B1', total: 800, known: 100, learning: 20 },
]

function makeMockDb(initialSettings: Partial<Settings> = {}): KelimeDB {
  let settings: Settings = {
    newWordsPerDay: 10,
    dailyGoal: 20,
    language: 'fr',
    cefrGoals: {},
    ...initialSettings,
  } as Settings

  return {
    getSettings: vi.fn().mockImplementation(async () => settings),
    saveSettings: vi.fn().mockImplementation(async (s: Settings) => {
      settings = s
      return s
    }),
  } as unknown as KelimeDB
}

describe('GoalPlannerCard', () => {
  let rootEl: HTMLDivElement
  let root: ReturnType<typeof createRoot>

  beforeEach(() => {
    rootEl = document.createElement('div')
    document.body.appendChild(rootEl)
    root = createRoot(rootEl)
  })

  afterEach(async () => {
    await act(async () => {
      root.unmount()
    })
    rootEl.remove()
  })

  it('renders goal planning form when no active goal exists', async () => {
    const db = makeMockDb()
    await act(async () => {
      root.render(<GoalPlannerCard db={db} language="fr" levels={mockLevels} />)
    })

    expect(rootEl.textContent).toContain('Seviye hedefi belirle')
    expect(rootEl.textContent).toContain('Seviye')
    expect(rootEl.textContent).toContain('Hedefi kaydet')
  })

  it('allows selecting level and saving a new goal', async () => {
    const db = makeMockDb()
    await act(async () => {
      root.render(<GoalPlannerCard db={db} language="fr" levels={mockLevels} />)
    })

    const saveBtn = Array.from(rootEl.querySelectorAll('button')).find((b) => b.textContent?.includes('Hedefi kaydet'))
    expect(saveBtn).toBeDefined()

    await act(async () => {
      saveBtn!.click()
    })

    expect(db.saveSettings).toHaveBeenCalled()
    const saved = (db.saveSettings as unknown as ReturnType<typeof vi.fn>).mock.calls[0][0] as Settings
    expect(saved.cefrGoals?.fr).toBeDefined()
    expect(saved.cefrGoals?.fr?.level).toBe('A2')
  })

  it('renders active goal progress and allows applying suggested quota', async () => {
    const targetDate = new Date(Date.now() + 60 * 86_400_000).toISOString().slice(0, 10)
    const db = makeMockDb({
      newWordsPerDay: 1,
      cefrGoals: {
        fr: {
          level: 'A2',
          targetDate,
          createdAt: '2026-01-01',
        },
      },
    })

    await act(async () => {
      root.render(<GoalPlannerCard db={db} language="fr" levels={mockLevels} />)
    })

    expect(rootEl.textContent).toContain('A2 seviye hedefi')
    expect(rootEl.textContent).toContain('kelime kaldı')

    const quotaBtn = Array.from(rootEl.querySelectorAll('button')).find((b) => b.textContent?.includes('Günlük kotayı'))
    expect(quotaBtn).toBeDefined()

    await act(async () => {
      quotaBtn!.click()
    })

    expect(db.saveSettings).toHaveBeenCalled()
    const saved = (db.saveSettings as unknown as ReturnType<typeof vi.fn>).mock.calls[0][0] as Settings
    expect(saved.newWordsPerDay).toBeGreaterThan(1)
  })

  it('allows editing and removing an existing goal', async () => {
    const targetDate = new Date(Date.now() + 60 * 86_400_000).toISOString().slice(0, 10)
    const db = makeMockDb({
      cefrGoals: {
        fr: {
          level: 'A2',
          targetDate,
          createdAt: '2026-01-01',
        },
      },
    })

    await act(async () => {
      root.render(<GoalPlannerCard db={db} language="fr" levels={mockLevels} />)
    })

    const removeBtn = Array.from(rootEl.querySelectorAll('button')).find((b) => b.textContent?.includes('Hedefi kaldır'))
    expect(removeBtn).toBeDefined()

    await act(async () => {
      removeBtn!.click()
    })

    expect(db.saveSettings).toHaveBeenCalled()
    const saved = (db.saveSettings as unknown as ReturnType<typeof vi.fn>).mock.calls[0][0] as Settings
    expect(saved.cefrGoals?.fr).toBeUndefined()
  })

  it('saves through the app from the stored settings, not the copy it read on opening', async () => {
    const db = makeMockDb()
    const onSettingsChange = vi.fn()
    await act(async () => {
      root.render(<GoalPlannerCard db={db} language="fr" levels={mockLevels} onSettingsChange={onSettingsChange} />)
    })
    // Another screen (or a sync) changes a setting while the card is open.
    const stored = await db.getSettings()
    await db.saveSettings({ ...stored!, newWordsPerDay: 3 })
    ;(db.saveSettings as unknown as ReturnType<typeof vi.fn>).mockClear()

    const saveBtn = Array.from(rootEl.querySelectorAll('button')).find((b) => b.textContent?.includes('Hedefi kaydet'))
    await act(async () => {
      saveBtn!.click()
    })

    expect(db.saveSettings).not.toHaveBeenCalled()
    expect(onSettingsChange).toHaveBeenCalledTimes(1)
    const saved = onSettingsChange.mock.calls[0][0] as Settings
    expect(saved.newWordsPerDay).toBe(3)
    expect(saved.cefrGoals?.fr?.level).toBe('A2')
  })
})
