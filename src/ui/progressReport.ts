import { displayForm } from '../engine/exercises'
import type { ExamResult } from '../engine/exam'
import type { GameState } from './game'
import { MASTERY_STAGES, type MasteryStage } from '../engine/mastery'
import type { HardWord } from '../engine/insights'
import { localDate, type ProgressStats } from '../engine/progress'
import { SKILLS, type ErrorType, type ReviewEvent, type Skill, type TargetLanguage, type UserWordState, type VocabularyEntry } from '../engine/types'
import { listRows, LIST_WIDTHS } from '../data/exportList'
import { workbook, type Cell } from '../data/xlsx'
import { ERROR_NAME, LANGUAGE_NAME, SKILL_NAME, STAGE_NAME } from './labels'
import { NEW_ART } from './drawnArt'
import { esc, printBase, printFoot, printOrigin, printPage, printTop } from '../data/printSheet'

/**
 * The progress page as a report to keep or share: printed (or saved as a PDF) for a teacher, or as an
 * Excel workbook with a sheet for each part. Built from what the page already holds; nothing new is fetched.
 */
export interface ProgressReport {
  language: TargetLanguage
  name: string
  /** Local date of the report. */
  date: string
  /** The headline numbers, in order: label → value. */
  summary: [string, Cell][]
  /** The last 30 days, oldest first. */
  days: { date: string; answers: number; correct: number; xp: number }[]
  stages: [string, number][]
  /** Skills with a share (0–100) where there is enough to say. */
  skills: [string, number | null][]
  hard: { word: string; meaning: string; wrong: number; total: number }[]
  errors: [string, number][]
  exams: { date: string; score: number; recall: string; recognition: string }[]
}

const DAYS = 30
const pctOf = (n: number, d: number) => (d ? Math.round((n / d) * 100) : 0)

export function buildProgressReport(input: {
  language: TargetLanguage
  name: string
  now: Date
  stats: ProgressStats
  events: readonly ReviewEvent[]
  states: readonly UserWordState[]
  vocabulary: readonly VocabularyEntry[]
  profile: Record<Skill, number | null>
  hard: readonly HardWord[]
  errors: Partial<Record<ErrorType, number>>
  exams: readonly ExamResult[]
  game: GameState | null
}): ProgressReport {
  const { now, stats, events, game } = input
  const byDay = new Map<string, { answers: number; correct: number }>()
  for (const e of events) {
    if (e.mode !== 'normal') continue
    const d = localDate(e.timestamp)
    const r = byDay.get(d) ?? { answers: 0, correct: 0 }
    r.answers++
    if (e.verdict === 'correct') r.correct++
    byDay.set(d, r)
  }
  const days = Array.from({ length: DAYS }, (_, i) => {
    const date = localDate(new Date(now.getTime() - (DAYS - 1 - i) * 86_400_000))
    const r = byDay.get(date) ?? { answers: 0, correct: 0 }
    return { date, ...r, xp: game?.xp.byDay.get(date) ?? 0 }
  })
  const week = days.slice(-7)
  const weekAnswers = week.reduce((n, d) => n + d.answers, 0)
  const weekRight = week.reduce((n, d) => n + d.correct, 0)
  const learned = (['production_ready', 'mastered'] as MasteryStage[]).reduce((n, s) => n + (stats.stageCounts[s] ?? 0), 0)
  const byId = new Map(input.vocabulary.map((v) => [v.id, v]))
  const summary: [string, Cell][] = [
    ['Dil', LANGUAGE_NAME[input.language]],
    ['Tarih', localDate(now)],
    ['Kelime', input.vocabulary.filter((v) => v.language === input.language && v.source !== 'sample').length],
    ['Öğreniliyor', input.states.length],
    ['Öğrenildi', learned],
    ['Aktif kelime', stats.activeVocabulary],
    ['Son 7 gün: cevap', weekAnswers],
    ['Son 7 gün: doğru oranı (%)', pctOf(weekRight, weekAnswers)],
    ['Son 30 günde çalışılan gün', days.filter((d) => d.answers > 0).length],
    ...(game
      ? ([
          ['Günlük seri', game.streak],
          ['En uzun seri', game.stats.longestStreak],
          ['Seviye', game.level.level],
          ['Toplam XP', game.xp.total],
        ] as [string, Cell][])
      : []),
  ]
  return {
    language: input.language,
    name: input.name,
    date: localDate(now),
    summary,
    days,
    stages: MASTERY_STAGES.map((s) => [STAGE_NAME[s], stats.stageCounts[s] ?? 0]),
    skills: SKILLS.filter((s) => s !== 'gender' || input.profile.gender !== null).map((s) => [SKILL_NAME[s], input.profile[s]]),
    hard: input.hard.flatMap((h) => {
      const e = byId.get(h.entryId)
      return e ? [{ word: displayForm(e), meaning: e.senses[0]?.gloss ?? '', wrong: h.wrong, total: h.total }] : []
    }),
    errors: (Object.entries(input.errors) as [ErrorType, number][]).filter(([, n]) => n > 0).sort((a, b) => b[1] - a[1]).map(([t, n]) => [ERROR_NAME[t] ?? t, n]),
    exams: input.exams.map((x) => ({ date: x.at.slice(0, 10), score: Math.round(x.actual * 100), recall: `${x.recall.right}/${x.recall.n}`, recognition: `${x.recognition.right}/${x.recognition.n}` })),
  }
}

const cell = (v: Cell | null) => (v === null ? '–' : esc(String(v)))
const table = (head: string[], rows: (Cell | null)[][]) =>
  rows.length ? `<table><thead><tr>${head.map((h) => `<th>${esc(h)}</th>`).join('')}</tr></thead><tbody>${rows.map((r) => `<tr>${r.map((v) => `<td>${cell(v)}</td>`).join('')}</tr>`).join('')}</tbody></table>` : '<p class="none">Henüz yok.</p>'

const CSS = `
    header.head { display: flex; align-items: center; gap: 4mm; }
    header.head .art { height: 20mm; width: auto; flex: none; }
    .figures { display: grid; grid-template-columns: repeat(4, 1fr); gap: 2mm; margin-top: 5mm; }
    .figures div { padding: 2.2mm 3mm; border: 0.25mm solid var(--rule); border-radius: 2.5mm; background: var(--box); break-inside: avoid; }
    .figures b { display: block; font-size: 15pt; line-height: 1.2; color: var(--text); }
    .figures span { font-size: 8pt; color: var(--ink-soft); }
    .chart { display: flex; align-items: flex-end; gap: 0.8mm; height: 30mm; padding: 2.5mm 3mm 5mm; border: 0.25mm solid var(--rule); border-radius: 2.5mm; background: var(--box); }
    .bar { flex: 1; height: 100%; display: flex; flex-direction: column; justify-content: flex-end; position: relative; }
    .bar span { display: block; background: var(--lang); border-radius: 0.8mm 0.8mm 0 0; min-height: 0.3mm; }
    .bar i { position: absolute; bottom: -4mm; left: 0; right: 0; text-align: center; font-style: normal; font-size: 6pt; color: var(--ink-soft); }
    .cols { display: grid; grid-template-columns: 1fr 1fr; gap: 4mm; }
    .cols section { min-width: 0; }
    .none { margin: 0; padding: 2.4mm 3mm; border: 0.25mm dashed var(--rule); border-radius: 2.5mm; color: var(--ink-soft); font-size: 9pt; }
    @media screen and (max-width: 220mm) { .cols { grid-template-columns: 1fr; } .figures { grid-template-columns: 1fr 1fr; } }`

/** A one- or two-page A4 report in the app's look (data/printSheet.ts): the numbers, the last 30 days as bars, the stages, skills, hard words and exams. */
export function progressHtml(r: ProgressReport, origin = printOrigin()): string {
  const max = Math.max(1, ...r.days.map((d) => d.answers))
  const bars = r.days
    .map((d) => `<div class="bar" title="${d.date}: ${d.answers} cevap"><span style="height:${Math.round((d.answers / max) * 100)}%"></span><i>${Number(d.date.slice(8))}</i></div>`)
    .join('')
  const title = `${LANGUAGE_NAME[r.language]} ilerleme raporu`
  // The print window is a new document: the drawing needs its full address there.
  const artUrl = origin ? esc(new URL(NEW_ART.progressReport, `${origin}/`).href) : ''
  return printPage(
    `${title}${r.name ? ` · ${r.name}` : ''}`,
    printBase(r.language, origin) + CSS,
    `<main>${printTop(origin, 'Diloloji · İlerleme', r.date)}`
      + `<header class="head">${artUrl ? `<img class="art" src="${artUrl}" alt="">` : ''}<div><div class="chips"><span class="chip">${esc(LANGUAGE_NAME[r.language])}</span>${r.name ? `<span class="chip">${esc(r.name)}</span>` : ''}</div><h1>${esc(title)}</h1></div></header>`
      + `<div class="figures">${r.summary
        .filter(([k]) => k !== 'Dil' && k !== 'Tarih')
        .map(([k, v]) => `<div><b>${cell(v)}</b><span>${esc(k)}</span></div>`)
        .join('')}</div>`
      + `<section><h2>Son 30 gün: günlük cevap</h2><div class="chart">${bars}</div></section>`
      + `<div class="cols"><section><h2>Kelimelerin aşamaları</h2>${table(['Aşama', 'Kelime'], r.stages)}</section>`
      + `<section><h2>Beceriler (hatırlama olasılığı, %)</h2>${table(['Beceri', '%'], r.skills)}</section></div>`
      + `<div class="cols"><section><h2>En çok zorlanılan kelimeler</h2>${table(['Kelime', 'Anlam', 'Yanlış'], r.hard.map((h) => [h.word, h.meaning, `${h.wrong}/${h.total}`]))}</section>`
      + `<section><h2>Hata türleri</h2>${table(['Tür', 'Sayı'], r.errors)}</section></div>`
      + `<section><h2>Hatırlama sınavları</h2>${table(['Tarih', 'Sonuç (%)', 'Yazarak', 'Tanıma'], r.exams.map((x) => [x.date, x.score, x.recall, x.recognition]))}</section>`
      + `${printFoot('Diloloji ile hazırlandı · diloloji.com', r.date)}</main>`,
  )
}

/** The same report as a workbook: Özet, Günler, Aşamalar, Beceriler, Zor kelimeler, Hatalar, Sınavlar and the word list itself. */
export function progressXlsx(r: ProgressReport, words: { entries: readonly VocabularyEntry[]; states: readonly UserWordState[] }): Uint8Array {
  return workbook([
    { name: 'Özet', rows: [['Ölçü', 'Değer'], ...r.summary], widths: [30, 18] },
    { name: 'Günler', rows: [['Tarih', 'Cevap', 'Doğru', 'Doğru oranı (%)', 'XP'], ...r.days.map((d) => [d.date, d.answers, d.correct, pctOf(d.correct, d.answers), d.xp])], widths: [12, 10, 10, 16, 10] },
    { name: 'Aşamalar', rows: [['Aşama', 'Kelime'], ...r.stages], widths: [18, 10] },
    { name: 'Beceriler', rows: [['Beceri', 'Hatırlama olasılığı (%)'], ...r.skills.map(([k, v]) => [k, v ?? ''] as Cell[])], widths: [18, 24] },
    { name: 'Zor kelimeler', rows: [['Kelime', 'Anlam', 'Yanlış', 'Toplam'], ...r.hard.map((h) => [h.word, h.meaning, h.wrong, h.total])], widths: [22, 30, 10, 10] },
    { name: 'Hatalar', rows: [['Tür', 'Sayı'], ...r.errors], widths: [26, 10] },
    { name: 'Sınavlar', rows: [['Tarih', 'Sonuç (%)', 'Yazarak', 'Tanıma'], ...r.exams.map((x) => [x.date, x.score, x.recall, x.recognition])], widths: [12, 12, 12, 12] },
    { name: 'Kelimeler', rows: listRows(words.entries, words.states), widths: LIST_WIDTHS },
  ])
}
