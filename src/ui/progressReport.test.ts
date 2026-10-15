import { describe, expect, it } from 'vitest'
import { strFromU8, unzipSync } from 'fflate'
import { buildProgressReport, progressHtml, progressXlsx } from './progressReport'
import type { ProgressStats } from '../engine/progress'
import type { ReviewEvent, VocabularyEntry } from '../engine/types'

const NOW = new Date('2026-10-15T12:00:00')
const entry = { id: 'w1', language: 'fr', lemma: 'maison', partOfSpeech: 'noun', senses: [{ id: 's', gloss: 'ev', examples: [] }], tags: [], collocations: [], addedAt: NOW } as unknown as VocabularyEntry
const ev = (daysAgo: number, ok: boolean) => ({ id: `${daysAgo}${ok}`, entryId: 'w1', language: 'fr', timestamp: new Date(NOW.getTime() - daysAgo * 86_400_000), verdict: ok ? 'correct' : 'wrong', mode: 'normal' }) as unknown as ReviewEvent
const stats: ProgressStats = { stageCounts: { introduced: 1, familiar: 0, recallable: 0, strong: 0, production_ready: 0, mastered: 0 }, notStarted: 0, activeVocabulary: 0, activity: [], daysPractised: 1 }

const report = () =>
  buildProgressReport({
    language: 'fr',
    name: 'Ali <3',
    now: NOW,
    stats,
    events: [ev(0, true), ev(0, false), ev(2, true), ev(40, true)],
    states: [],
    vocabulary: [entry],
    profile: { recognition: 60, recall: null, production: null, listening: null, collocation: null, gender: null },
    hard: [{ entryId: 'w1', wrong: 1, total: 2, rate: 0.5 }],
    errors: { typo: 2 },
    exams: [],
    game: null,
  })

describe('the progress report', () => {
  it('counts the last 30 days and the week, and names the hard words', () => {
    const r = report()
    expect(r.days).toHaveLength(30)
    expect(r.days.at(-1)).toMatchObject({ date: '2026-10-15', answers: 2, correct: 1 })
    expect(r.summary).toContainEqual(['Son 7 gün: cevap', 3])
    expect(r.summary).toContainEqual(['Son 7 gün: doğru oranı (%)', 67])
    expect(r.hard[0]).toMatchObject({ word: 'maison', meaning: 'ev' })
    expect(r.skills.find(([k]) => k.length)?.[1]).toBe(60)
  })

  it('prints with what was typed escaped', () => {
    const html = progressHtml(report())
    expect(html).toContain('Fransızca ilerleme raporu')
    expect(html).toContain('Ali &lt;3')
    expect(html).not.toContain('Ali <3')
  })

  it('is a workbook with a sheet for each part, numbers kept numbers', () => {
    const files = unzipSync(progressXlsx(report(), { entries: [], states: [] }))
    const book = strFromU8(files['xl/workbook.xml'])
    for (const name of ['Özet', 'Günler', 'Aşamalar', 'Beceriler', 'Zor kelimeler', 'Hatalar', 'Sınavlar', 'Kelimeler']) expect(book).toContain(`name="${name}"`)
    expect(strFromU8(files['xl/worksheets/sheet2.xml'])).toMatch(/<c r="B31"><v>2<\/v><\/c>/)
  })
})
