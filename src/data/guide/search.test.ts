import { describe, expect, it } from 'vitest'
import { lessonFor, lessonTitle, lessonsOf } from './lessonOf'
import { fold, searchLesson } from './search'

describe('searching the lessons', () => {
  it('folds accents, case and the Turkish i', () => {
    expect(fold('Şart İSTEK Ördek ğ ı')).toBe('sart istek ordek g i')
    expect(fold('déjà')).toBe('deja')
  })

  it('finds a lesson by its name or summary, without accents', () => {
    const lesson = lessonFor('fr', 'subjonctif')!
    expect(searchLesson(lesson, lessonTitle(lesson), 'subjonctif')).toEqual({ where: 'title' })
    expect(searchLesson(lesson, lessonTitle(lesson), '')).toEqual({ where: 'title' })
  })

  it('finds a lesson by what is deep in it, and shows the line that matched', () => {
    const fr = lessonsOf('fr')
    const lesson = fr.find((l) => l.examples.some((x) => /depuis/i.test(x.text)) && !/depuis/i.test(`${lessonTitle(l)} ${l.summary}`))
    expect(lesson).toBeDefined()
    const hit = searchLesson(lesson!, lessonTitle(lesson!), 'depuis')
    expect(hit?.where).toBe('content')
    expect(fold(hit?.snippet ?? '')).toContain('depuis')
    expect((hit?.snippet ?? '').length).toBeLessThanOrEqual(100)
  })

  it('wants every word of the query, and nothing else matches', () => {
    const lesson = lessonFor('fr', 'subjonctif')!
    expect(searchLesson(lesson, lessonTitle(lesson), 'subjonctif zzzzqqq')).toBeNull()
    expect(searchLesson(lesson, lessonTitle(lesson), 'zzzzqqq')).toBeNull()
  })
})
