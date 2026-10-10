import { describe, expect, it } from 'vitest'
import type { SyncResult } from '../data/sync'
import { describeIncoming } from './syncRunner'

const result = (incoming: Partial<SyncResult['incoming']>): SyncResult => ({ received: 0, sent: 0, skipped: 0, incoming: { words: 0, removed: 0, texts: 0, settings: 0, ...incoming } })

describe('describeIncoming', () => {
  it('is empty when nothing came in', () => {
    expect(describeIncoming(null)).toBe('')
    expect(describeIncoming(result({}))).toBe('')
  })
  it('lists only what changed', () => {
    expect(describeIncoming(result({ words: 3, settings: 2 }))).toBe('Diğer cihazlarından: 3 yeni kelime, 2 ayar değişikliği.')
    expect(describeIncoming(result({ removed: 1, texts: 1 }))).toBe('Diğer cihazlarından: 1 silinen kelime, 1 yeni metin.')
  })
})
