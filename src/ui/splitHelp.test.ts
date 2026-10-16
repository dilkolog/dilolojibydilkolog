import { describe, expect, it } from 'vitest'
import { splitHelp } from './splitHelp'

describe('splitHelp', () => {
  it('returns [help, ""] when the first sentence is shorter than 24 characters', () => {
    const short = 'Kısa bilgi. İkinci cümle burası.'
    expect(splitHelp(short)).toEqual([short, ''])
  })

  it('returns [help, ""] when there is only one sentence', () => {
    const single = 'Bu ayar bildirimlerin günün hangi saatinde gönderileceğini belirler.'
    expect(splitHelp(single)).toEqual([single, ''])
  })

  it('splits when the first sentence is at least 24 characters and ends with period', () => {
    const full =
      'Listeyi yoğun görünüme alır. Küçük ekranlarda daha fazla kelimenin görünmesini sağlar.'
    const [first, rest] = splitHelp(full)
    expect(first).toBe('Listeyi yoğun görünüme alır.')
    expect(rest).toBe('Küçük ekranlarda daha fazla kelimenin görünmesini sağlar.')
  })

  it('handles question mark and exclamation mark sentence endings', () => {
    const withExclamation =
      'Aksan kestirmelerini etkinleştirir! Yazarken e ardından kesme işareti koyarak é üretebilirsin.'
    const [first, rest] = splitHelp(withExclamation)
    expect(first).toBe('Aksan kestirmelerini etkinleştirir!')
    expect(rest).toBe('Yazarken e ardından kesme işareti koyarak é üretebilirsin.')
  })

  it('preserves multi-line rest content across newlines', () => {
    const multiline =
      'Günlük hedefinizi tamamlayınca ses çalar.\nİsterseniz ses efektlerini tamamen kapatabilirsiniz.'
    const [first, rest] = splitHelp(multiline)
    expect(first).toBe('Günlük hedefinizi tamamlayınca ses çalar.')
    expect(rest).toBe('İsterseniz ses efektlerini tamamen kapatabilirsiniz.')
  })
})
