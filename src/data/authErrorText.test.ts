import { describe, expect, it } from 'vitest'
import { authErrorText } from './supabase'

describe('authErrorText', () => {
  it('says the known sign-in refusals in Turkish', () => {
    expect(authErrorText('Invalid login credentials')).toBe('E-posta ya da şifre yanlış.')
    expect(authErrorText('For security purposes, you can only request this after 55 seconds.')).toContain('bir dakika bekleyip')
    expect(authErrorText('Unable to validate email address: invalid format')).toContain('geçersiz')
    expect(authErrorText('Error sending confirmation email')).toContain('Mail şu an gönderilemedi')
    expect(authErrorText('Email address "x@y.com" is not authorized')).toContain('başka bir adres')
  })

  it('an unknown message of the library is said plainly only when asked, so a Turkish one is never replaced', () => {
    expect(authErrorText('Something odd happened')).toBe('Something odd happened')
    expect(authErrorText('Something odd happened', true)).toContain('destek@diloloji.com')
    expect(authErrorText('Hesabın hazırlanamadı.')).toBe('Hesabın hazırlanamadı.')
  })
})
