import { describe, expect, it } from 'vitest'
import { passwordProblem } from './passwordRule'

describe('passwordProblem', () => {
  it('asks for the length first', () => {
    expect(passwordProblem('Ab1!')).toBe('Şifre en az 8 karakter olmalı.')
  })
  it('names what is missing', () => {
    expect(passwordProblem('sifre1234')).toBe('Şifrede büyük harf, sembol (! ? . - gibi) da olmalı.')
    expect(passwordProblem('SIFRE1234!')).toBe('Şifrede küçük harf da olmalı.')
    expect(passwordProblem('Sifreler!!')).toBe('Şifrede rakam da olmalı.')
  })
  it('accepts a strong one, with Turkish letters too', () => {
    expect(passwordProblem('Güçlü-Şifre9')).toBe('')
    expect(passwordProblem('Abcdef1!')).toBe('')
  })
})
