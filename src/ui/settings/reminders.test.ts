import { describe, expect, it } from 'vitest'
import { reminderBody } from './reminders'

describe('reminder text', () => {
  it('names the streak and the words about to fade, with a small time ask', () => {
    expect(reminderBody(12, '', 9)).toBe('🔥 12 günlük serin var. 🌱 9 kelimen solmak üzere: 3 dakikalık hızlı tekrar yeter.')
    expect(reminderBody(0, '', 40)).toBe('🌱 40 kelimen solmak üzere: 5 dakikalık hızlı tekrar yeter.')
    expect(reminderBody(0, 'Akşam yemeğinden sonra', 0)).toBe('Akşam yemeğinden sonra: Bugünkü kelime çalışman seni bekliyor.')
  })
})
