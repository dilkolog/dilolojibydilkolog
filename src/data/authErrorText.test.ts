import { describe, expect, it } from 'vitest'
import { authErrorText, CURRENT_PASSWORD_NEEDED, CURRENT_PASSWORD_WRONG } from './supabase'

describe('authErrorText', () => {
  it('says a failed connection is one in every browser (Chrome, Safari, Firefox)', () => {
    for (const m of ['Failed to fetch', 'Load failed', 'NetworkError when attempting to fetch resource.', 'Network request failed']) {
      expect(authErrorText(m, true), m).toBe('Sunucuya bağlanılamadı; internet bağlantını kontrol et.')
    }
  })
  it('keeps the known answers', () => {
    expect(authErrorText('Invalid login credentials', true)).toBe('E-posta ya da şifre yanlış.')
  })
  it('explains that another spelling of the address already has an account', () => {
    expect(authErrorText('alias_email: Bu adresin başka bir yazılışıyla zaten bir hesap var.', true)).toContain('başka bir yazılışıyla')
    expect(authErrorText('blocked_email: Bu adresle hesap açılamıyor.', true)).toBe('Bu adresle hesap açılamıyor.')
  })
  it('turns an unknown technical message into a plain one, or leaves it when asked to', () => {
    expect(authErrorText('Database error querying schema', true)).toContain('Bir sorun oldu')
    expect(authErrorText('Database error querying schema')).toBe('Database error querying schema')
  })
  it('says a password already set needs the current one to be changed', () => {
    expect(authErrorText('Current password required when setting new password.', true)).toBe(CURRENT_PASSWORD_NEEDED)
    expect(authErrorText('Incorrect current password', true)).toBe(CURRENT_PASSWORD_WRONG)
  })
})
