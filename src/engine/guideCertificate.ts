import type { GuideLevel } from '../data/guide/lessonTypes'
import { isRead, type GuideMarks } from './guideReview'

/** A level with fewer lessons than this earns no certificate (three lessons are not a level). */
export const MIN_LESSONS = 3

/** How far the learner is through one level of the guide: done once every lesson of it is learned. */
export interface LevelCert {
  level: GuideLevel
  total: number
  learned: number
  done: boolean
  /** The day the last lesson was learned (local date), when the level is done. */
  date?: string
}

const ORDER: GuideLevel[] = ['A1', 'A2', 'B1', 'B2', 'C1']

/**
 * Per level of the guide, how many lessons are learned (read and their check passed). A lesson unmarked since
 * (see `isRead`) does not count, so a certificate can go away again if the learner takes the marks back.
 */
export function levelCertificates(lessons: readonly { topic: string; level: GuideLevel }[], marks: GuideMarks): LevelCert[] {
  const out: LevelCert[] = []
  for (const level of ORDER) {
    const of = lessons.filter((l) => l.level === level)
    if (of.length < MIN_LESSONS) continue
    const days = of.map((l) => (isRead(marks[l.topic]) ? marks[l.topic]?.learned : undefined))
    const learned = days.filter(Boolean).length
    const done = learned === of.length
    out.push({ level, total: of.length, learned, done, ...(done ? { date: days.reduce((a, d) => (d! > a! ? d : a))! } : {}) })
  }
  return out
}

/** The card to share for a finished level: the language and level, how many lessons, and the first few titles. */
export function certificateCard(languageName: string, cert: LevelCert, titles: readonly string[]): { kicker: string; title: string; text: string; art: 'trophy' } {
  const shown = titles.slice(0, 3).join(', ')
  const more = titles.length > 3 ? ` ve ${titles.length - 3} ders daha` : ''
  return {
    kicker: 'Rehber sertifikası',
    title: `${languageName} · ${cert.level}`,
    text: `${cert.total} ders öğrenildi: ${shown}${more}.`,
    art: 'trophy',
  }
}
