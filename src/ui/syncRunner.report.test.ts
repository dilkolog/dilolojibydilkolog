import { describe, expect, it } from 'vitest'
import { worthReporting } from './syncRunner'

const named = (name: string, message = 'x') => Object.assign(new Error(message), { name })

describe('worthReporting', () => {
  it('reports real failures, not the network or states the app explains', () => {
    expect(worthReporting(new Error('supabase 500'), true)).toBe(true)
    expect(worthReporting(named('SyncConflictError'), true)).toBe(true)
    expect(worthReporting(new Error('anything'), false)).toBe(false)
    expect(worthReporting(new TypeError('Failed to fetch'), true)).toBe(false)
    expect(worthReporting(new TypeError('Load failed'), true)).toBe(false)
    expect(worthReporting(new TypeError("Cannot read properties of undefined (reading 'core')"), true)).toBe(true)
    for (const name of ['SyncMovedError', 'SyncApprovalError', 'SyncNotAllowedError', 'AbortError']) expect(worthReporting(named(name), true)).toBe(false)
    expect(worthReporting('just a string', true)).toBe(false)
  })
})
