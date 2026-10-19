import { describe, expect, it } from 'vitest'
import { authErrorText } from './supabase'

describe('authErrorText', () => {
  it('says a failed connection is one in every browser (Chrome, Safari, Firefox)', () => {
    for (const m of ['Failed to fetch', 'Load failed', 'NetworkError when attempting to fetch resource.', 'Network request failed']) {
      expect(authErrorText(m, true), m).toBe('Sunucuya bağlanılamadı; internet bağlantını kontrol et.')
    }
  })
  it('keeps the known answers', () => {
    expect(authErrorText('Invalid login credentials', true)).toBe('E-posta ya da şifre yanlış.')
  })
  it('turns an unknown technical message into a plain one, or leaves it when asked to', () => {
    expect(authErrorText('Database error querying schema', true)).toContain('Bir sorun oldu')
    expect(authErrorText('Database error querying schema')).toBe('Database error querying schema')
  })
})
