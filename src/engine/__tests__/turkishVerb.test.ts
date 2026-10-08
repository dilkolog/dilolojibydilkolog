import { describe, expect, it } from 'vitest'
import { turkishForms, turkishTenseOf } from '../turkishVerb'

describe('Turkish forms beside a conjugation', () => {
  it('the present (-iyor) with vowel harmony, the dropped a/e and softening', () => {
    expect(turkishForms('beklemek', 'present')).toEqual(['bekliyorum', 'bekliyorsun', 'bekliyor', 'bekliyoruz', 'bekliyorsunuz', 'bekliyorlar'])
    const third = (m: string) => turkishForms(m, 'present')?.[2]
    expect(['gelmek', 'almak', 'görmek', 'okumak', 'aramak', 'oynamak', 'söylemek', 'anlamak', 'gitmek', 'etmek', 'demek', 'yemek', 'yürümek', 'konuşmak', 'atmak'].map(third)).toEqual([
      'geliyor', 'alıyor', 'görüyor', 'okuyor', 'arıyor', 'oynuyor', 'söylüyor', 'anlıyor', 'gidiyor', 'ediyor', 'diyor', 'yiyor', 'yürüyor', 'konuşuyor', 'atıyor',
    ])
  })

  it('the past (-di) with consonant and vowel harmony, no softening', () => {
    expect(turkishForms('gitmek', 'past')).toEqual(['gittim', 'gittin', 'gitti', 'gittik', 'gittiniz', 'gittiler'])
    expect(turkishForms('okumak', 'past')).toEqual(['okudum', 'okudun', 'okudu', 'okuduk', 'okudunuz', 'okudular'])
    expect(turkishForms('yapmak', 'past')?.[0]).toBe('yaptım')
    expect(turkishForms('görmek', 'past')?.[4]).toBe('gördünüz')
    expect(turkishForms('beklemek', 'past')?.[5]).toBe('beklediler')
  })

  it('the imperfect (-iyordu) and the future (-ecek, k → ğ before a vowel)', () => {
    expect(turkishForms('gelmek', 'imperfect')).toEqual(['geliyordum', 'geliyordun', 'geliyordu', 'geliyorduk', 'geliyordunuz', 'geliyorlardı'])
    expect(turkishForms('beklemek', 'future')).toEqual(['bekleyeceğim', 'bekleyeceksin', 'bekleyecek', 'bekleyeceğiz', 'bekleyeceksiniz', 'bekleyecekler'])
    expect(turkishForms('okumak', 'future')).toEqual(['okuyacağım', 'okuyacaksın', 'okuyacak', 'okuyacağız', 'okuyacaksınız', 'okuyacaklar'])
    expect(turkishForms('gitmek', 'future')?.[0]).toBe('gideceğim')
    expect(turkishForms('demek', 'future')?.[0]).toBe('diyeceğim')
  })

  it('a light-verb compound keeps its first word; the first of several meanings is used', () => {
    expect(turkishForms('yardım etmek', 'present')?.[0]).toBe('yardım ediyorum')
    expect(turkishForms('alışveriş yapmak', 'past')?.[3]).toBe('alışveriş yaptık')
    expect(turkishForms('beklemek, ummak', 'present')?.[0]).toBe('bekliyorum')
    expect(turkishForms('Gitmek (bir yere)', 'present')?.[0]).toBe('gidiyorum')
  })

  it('says nothing when unsure: olmak, phrases, suffixes, nouns', () => {
    for (const m of ['olmak', 'sahip olmak', 'zorunda olmak', '-ebilmek', 'yıl', 'geri gelmek', 'çok güzel bir şey yapmak', 'bekle']) expect(turkishForms(m, 'present')).toBeUndefined()
  })

  it('maps the lab\'s core tenses', () => {
    expect(['present', 'passe-compose', 'imparfait', 'futur', 'presente', 'preterito', 'imperfecto', 'futuro', 'subjonctif'].map((t) => turkishTenseOf(t as never))).toEqual([
      'present', 'past', 'imperfect', 'future', 'present', 'past', 'imperfect', 'future', undefined,
    ])
  })
})
