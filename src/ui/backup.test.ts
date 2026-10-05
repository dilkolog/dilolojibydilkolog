import { describe, expect, it } from 'vitest'
import { backupDue } from './backup'

const DAY = 86_400_000
const now = 100 * DAY

describe('backup nudge', () => {
  it('asks only when the words live on this device alone and no recent backup exists', () => {
    expect(backupDue({ synced: false, words: 40, lastBackup: null, dismissed: null, now })).toBeNull()
    expect(backupDue({ synced: false, words: 40, lastBackup: now - 45 * DAY, dismissed: null, now })).toBe(45)
    // Synced, too few words, a fresh backup, or "not now" this month: no nudge.
    expect(backupDue({ synced: true, words: 40, lastBackup: null, dismissed: null, now })).toBe(false)
    expect(backupDue({ synced: false, words: 5, lastBackup: null, dismissed: null, now })).toBe(false)
    expect(backupDue({ synced: false, words: 40, lastBackup: now - 3 * DAY, dismissed: null, now })).toBe(false)
    expect(backupDue({ synced: false, words: 40, lastBackup: null, dismissed: now - 10 * DAY, now })).toBe(false)
  })
})
