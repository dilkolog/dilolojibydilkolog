import { describe, expect, it } from 'vitest'
import { progressVerdict, VERDICT_MIN_ANSWERS } from '../progressVerdict'
import type { Skill } from '../types'

const none: Record<Skill, number | null> = { recognition: null, recall: null, production: null, listening: null, collocation: null, gender: null }
const base = { profile: none, daysPractised: 10, answers: 500 }

describe('progressVerdict', () => {
  it('says nothing it cannot back: too few answers', () => {
    const v = progressVerdict({ ...base, answers: VERDICT_MIN_ANSWERS - 1, profile: { ...none, recognition: 90, production: 20 } })
    expect(v.text).toContain('Birkaç gün çalıştıkça')
    expect(v.action).toBeUndefined()
  })

  it('puts the habit first when the last two weeks had few study days', () => {
    const v = progressVerdict({ ...base, daysPractised: 2, profile: { ...none, recognition: 90, production: 20 } })
    expect(v.text).toContain('Son iki haftada 2 gün')
    expect(v.action?.go).toEqual({ day: true })
  })

  it('names the strongest and the weakest skill and ties the weak one to a practice', () => {
    const v = progressVerdict({ ...base, profile: { ...none, recognition: 82, recall: 70, production: 55 } })
    expect(v.text).toBe('Kelimeleri tanıman güçlü (%82); kelimeyi cümlede kullanman geride (%55). Bu hafta iki kısa yazma çalışması öneriyorum.')
    expect(v.action).toEqual({ label: 'Yaz & konuş', go: { screen: 'produce' } })
  })

  it('sends a weak ear to listening and weak articles to the article drill', () => {
    expect(progressVerdict({ ...base, profile: { ...none, recognition: 85, listening: 50 } }).action?.go).toEqual({ game: 'ladder' })
    expect(progressVerdict({ ...base, profile: { ...none, recognition: 85, gender: 40 } }).action?.go).toEqual({ game: 'article' })
  })

  it('a small gap is not a finding: low overall asks for the reviews, high overall for new words', () => {
    expect(progressVerdict({ ...base, profile: { ...none, recognition: 52, recall: 45 } }).text).toContain('tekrarları aksatmamak')
    expect(progressVerdict({ ...base, profile: { ...none, recognition: 88, recall: 80 } }).text).toContain('yeni kelimeler')
  })

  it('with one skill practised so far it speaks of the habit only', () => {
    const v = progressVerdict({ ...base, profile: { ...none, recognition: 80 } })
    expect(v.text).toContain('düzenin iyi')
  })
})
