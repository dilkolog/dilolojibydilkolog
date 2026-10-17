import { describe, expect, it } from 'vitest'
import { certificateCard, levelCertificates } from './guideCertificate'
import type { GuideMarks } from './guideReview'

const lesson = (topic: string, level: 'A1' | 'A2' | 'B1') => ({ topic, level })
const lessons = [lesson('a', 'A1'), lesson('b', 'A1'), lesson('c', 'A1'), lesson('d', 'A2'), lesson('e', 'A2'), lesson('f', 'B1'), lesson('g', 'B1'), lesson('h', 'B1')]
const learned = (day: string) => ({ read: day, learned: day })

describe('level certificates', () => {
  it('counts the learned lessons per level, and skips a level too small to certify', () => {
    const marks: GuideMarks = { a: learned('2026-10-01'), b: { read: '2026-10-02' }, f: learned('2026-10-03') }
    const certs = levelCertificates(lessons, marks)
    // A2 has two lessons only: no certificate.
    expect(certs.map((c) => c.level)).toEqual(['A1', 'B1'])
    expect(certs[0]).toEqual({ level: 'A1', total: 3, learned: 1, done: false })
    expect(certs[1]).toMatchObject({ level: 'B1', learned: 1, done: false })
  })

  it('is done when every lesson is learned, dated by the last one', () => {
    const marks: GuideMarks = { a: learned('2026-10-01'), b: learned('2026-10-09'), c: learned('2026-10-04') }
    expect(levelCertificates(lessons, marks)[0]).toEqual({ level: 'A1', total: 3, learned: 3, done: true, date: '2026-10-09' })
  })

  it('read is not learned, and a lesson unmarked since takes the certificate away', () => {
    const marks: GuideMarks = { a: learned('2026-10-01'), b: learned('2026-10-02'), c: { read: '2026-10-03' } }
    expect(levelCertificates(lessons, marks)[0]!.done).toBe(false)
    const taken: GuideMarks = { a: learned('2026-10-01'), b: learned('2026-10-02'), c: { ...learned('2026-10-03'), read: '', off: '2026-10-05' } }
    expect(levelCertificates(lessons, taken)[0]).toMatchObject({ learned: 2, done: false })
  })

  it('makes a card with the language and level, the count and the first titles', () => {
    const cert = { level: 'A1' as const, total: 5, learned: 5, done: true, date: '2026-10-09' }
    const card = certificateCard('Fransızca', cert, ['Artikeller', 'Être ve avoir', 'Şimdiki zaman', 'Sayılar', 'Sorular'])
    expect(card).toEqual({ kicker: 'Rehber sertifikası', title: 'Fransızca · A1', text: '5 ders öğrenildi: Artikeller, Être ve avoir, Şimdiki zaman ve 2 ders daha.', art: 'trophy' })
    expect(certificateCard('İngilizce', { ...cert, total: 2 }, ['X', 'Y']).text).toBe('2 ders öğrenildi: X, Y.')
  })
})
