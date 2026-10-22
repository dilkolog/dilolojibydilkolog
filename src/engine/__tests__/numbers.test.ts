import { describe, expect, it } from 'vitest'
import { checkWords, digitsRight, groupDigits, NUMBER_KINDS, numberQuestion, numberRound, numberWords, priceDigits, priceWords, readDigits, timeWords, yearWords } from '../numbers'
import { createRng } from '../rng'

describe('numbers in words', () => {
  it('French: vingt et un, soixante-dix, quatre-vingts, plurals of cent and vingt', () => {
    const fr = (n: number) => numberWords('fr', n)
    expect([0, 16, 17, 21, 22, 61, 70, 71, 72, 79, 80, 81, 90, 91, 99, 100].map(fr)).toEqual([
      'zéro', 'seize', 'dix-sept', 'vingt et un', 'vingt-deux', 'soixante et un', 'soixante-dix', 'soixante et onze', 'soixante-douze', 'soixante-dix-neuf',
      'quatre-vingts', 'quatre-vingt-un', 'quatre-vingt-dix', 'quatre-vingt-onze', 'quatre-vingt-dix-neuf', 'cent',
    ])
    expect(fr(101)).toBe('cent un')
    expect(fr(200)).toBe('deux cents')
    expect(fr(280)).toBe('deux cent quatre-vingts')
    expect(fr(1000)).toBe('mille')
    expect(fr(1999)).toBe('mille neuf cent quatre-vingt-dix-neuf')
    expect(fr(80_000)).toBe('quatre-vingt mille')
    expect(fr(200_000)).toBe('deux cent mille')
    expect(fr(201_080)).toBe('deux cent un mille quatre-vingts')
  })

  it('Spanish: dieciséis, veintidós, the hundreds, cien and ciento, un before mil', () => {
    const es = (n: number) => numberWords('es', n)
    expect([16, 21, 22, 26, 31, 45, 100, 101, 500, 555, 700, 900].map(es)).toEqual([
      'dieciséis', 'veintiuno', 'veintidós', 'veintiséis', 'treinta y uno', 'cuarenta y cinco', 'cien', 'ciento uno', 'quinientos', 'quinientos cincuenta y cinco', 'setecientos', 'novecientos',
    ])
    expect(es(1000)).toBe('mil')
    expect(es(2024)).toBe('dos mil veinticuatro')
    expect(es(21_000)).toBe('veintiún mil')
    expect(es(31_000)).toBe('treinta y un mil')
    expect(es(100_000)).toBe('cien mil')
    expect(es(101_000)).toBe('ciento un mil')
  })

  it('English: teens and tens, hyphens, and', () => {
    const en = (n: number) => numberWords('en', n)
    expect([13, 30, 42, 100, 105, 999].map(en)).toEqual(['thirteen', 'thirty', 'forty-two', 'one hundred', 'one hundred and five', 'nine hundred and ninety-nine'])
    expect(en(1005)).toBe('one thousand and five')
    expect(en(12_340)).toBe('twelve thousand three hundred and forty')
  })

  it('refuses what it has no words for', () => {
    expect(() => numberWords('fr', -1)).toThrow()
    expect(() => numberWords('fr', 1.5)).toThrow()
    expect(() => numberWords('fr', 1_000_000)).toThrow()
  })

  it('years: the ways they are said', () => {
    expect(yearWords('fr', 1999)).toEqual(['mille neuf cent quatre-vingt-dix-neuf', 'dix-neuf cent quatre-vingt-dix-neuf'])
    expect(yearWords('fr', 1900)).toEqual(['mille neuf cents', 'dix-neuf cents'])
    expect(yearWords('fr', 2024)).toEqual(['deux mille vingt-quatre'])
    expect(yearWords('es', 1985)).toEqual(['mil novecientos ochenta y cinco'])
    expect(yearWords('en', 1999)[0]).toBe('nineteen ninety-nine')
    expect(yearWords('en', 1905)[0]).toBe('nineteen oh five')
    expect(yearWords('en', 1900)[0]).toBe('nineteen hundred')
    expect(yearWords('en', 2005)[0]).toBe('two thousand and five')
    expect(yearWords('en', 2024)).toEqual(['twenty twenty-four', 'two thousand and twenty-four'])
  })

  it('times: French in 24 hours, Spanish and English in 12', () => {
    expect(timeWords('fr', 14, 30)).toBe('Il est quatorze heures trente.')
    expect(timeWords('fr', 1, 0)).toBe('Il est une heure.')
    expect(timeWords('fr', 21, 0)).toBe('Il est vingt et une heures.')
    expect(timeWords('fr', 12, 0)).toBe('Il est midi.')
    expect(timeWords('fr', 0, 10)).toBe('Il est minuit dix.')
    expect(timeWords('es', 3, 15)).toBe('Son las tres y cuarto.')
    expect(timeWords('es', 1, 30)).toBe('Es la una y media.')
    expect(timeWords('es', 12, 45)).toBe('Es la una menos cuarto.')
    expect(timeWords('es', 6, 40)).toBe('Son las siete menos veinte.')
    expect(timeWords('es', 6, 42)).toBe('Son las seis y cuarenta y dos.')
    expect(timeWords('en', 3, 0)).toBe("It's three o'clock.")
    expect(timeWords('en', 3, 15)).toBe("It's quarter past three.")
    expect(timeWords('en', 3, 45)).toBe("It's quarter to four.")
    expect(timeWords('en', 11, 35)).toBe("It's twenty-five to twelve.")
    expect(timeWords('en', 7, 7)).toBe("It's seven oh seven.")
  })

  it('prices: said and written the language\'s way', () => {
    expect(priceWords('fr', 1250)).toBe('douze euros cinquante')
    expect(priceWords('fr', 100)).toBe('un euro')
    expect(priceWords('es', 2199)).toBe('veintiún euros con noventa y nueve')
    expect(priceWords('en', 1250)).toBe('twelve dollars and fifty cents')
    expect(priceDigits('fr', 123_450)).toBe('1 234,50 €')
    expect(priceDigits('en', 1205)).toBe('$12.05')
    expect(groupDigits('es', 1500)).toBe('1500')
    expect(groupDigits('es', 15_000)).toBe('15.000')
    expect(groupDigits('en', 15_000)).toBe('15,000')
  })
})

describe('the numbers game', () => {
  it('reads what was typed as digits, whatever the separators', () => {
    expect(readDigits('big', '1 500')).toBe(1500)
    expect(readDigits('big', '1.500')).toBe(1500)
    expect(readDigits('big', '1,500')).toBe(1500)
    expect(readDigits('small', 'onze')).toBeNull()
    expect(readDigits('price', '12,50')).toBe(1250)
    expect(readDigits('price', '12.5 €')).toBe(1250)
    expect(readDigits('price', '$1,234.50')).toBe(123_450)
    expect(readDigits('price', '1.234,50')).toBe(123_450)
    expect(readDigits('price', '12')).toBe(1200)
    expect(readDigits('price', '12,')).toBeNull()
    expect(readDigits('time', '14:30')).toBe(870)
    expect(readDigits('time', '14h30')).toBe(870)
    expect(readDigits('time', '14 h')).toBe(840)
    expect(readDigits('time', '25:00')).toBeNull()
  })

  it('a time said in 12 hours is right either way', () => {
    const es = { kind: 'time' as const, value: 3 * 60 + 15, spoken: '', digits: '3:15', written: [] }
    expect(digitsRight('es', es, '3:15')).toBe(true)
    expect(digitsRight('es', es, '15:15')).toBe(true)
    expect(digitsRight('es', es, '3:45')).toBe(false)
    const fr = { ...es, value: 14 * 60 + 30 }
    expect(digitsRight('fr', fr, '14h30')).toBe(true)
    expect(digitsRight('fr', fr, '2:30')).toBe(false)
  })

  it('a written answer: hyphens and the 1990 spelling are right, an accent or a plural s is near', () => {
    const q = (language: 'fr' | 'es' | 'en', n: number) => ({ kind: 'small' as const, value: n, spoken: numberWords(language, n), digits: String(n), written: [numberWords(language, n)] })
    expect(checkWords('fr', q('fr', 21), 'vingt-et-un')).toBe('right')
    expect(checkWords('fr', q('fr', 97), 'Quatre vingt dix sept')).toBe('right')
    expect(checkWords('fr', q('fr', 80), 'quatre-vingt')).toBe('near')
    expect(checkWords('fr', q('fr', 21), 'vingt un')).toBe('wrong')
    expect(checkWords('es', q('es', 22), 'veintidos')).toBe('near')
    expect(checkWords('es', q('es', 22), 'veinte y dos')).toBe('wrong')
    expect(checkWords('en', q('en', 105), 'one hundred five')).toBe('right')
    expect(checkWords('en', q('en', 105), '')).toBe('wrong')
    const year = numberQuestion('en', 'year', createRng(3))
    expect(checkWords('en', year, year.written[1]!)).toBe('right')
  })

  it('a round: ten questions, no value twice, the digits read back as the value, every kind in a mixed one', () => {
    for (const language of ['fr', 'es', 'en'] as const) {
      for (let seed = 1; seed <= 20; seed++) {
        const round = numberRound(language, NUMBER_KINDS, createRng(seed))
        expect(round).toHaveLength(10)
        expect(new Set(round.map((q) => `${q.kind}|${q.value}`)).size).toBe(10)
        expect(new Set(round.map((q) => q.kind)).size).toBe(NUMBER_KINDS.length)
        for (const q of round) {
          expect(digitsRight(language, q, q.digits), `${language} ${q.kind} ${q.digits}`).toBe(true)
          expect(checkWords(language, q, q.spoken)).toBe('right')
          expect(q.spoken).not.toMatch(/undefined|\s{2}/)
        }
      }
    }
  })

  it('leans to the language\'s hard numbers', () => {
    const fr = numberRound('fr', ['small'], createRng(7), 40)
    expect(fr.filter((q) => q.value >= 60 && q.value <= 99).length).toBeGreaterThan(15)
  })
})
