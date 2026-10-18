/**
 * What a learner flagged as wrong in the guide (a lesson, or a question of a check): kept on this device and handed
 * on as a text to paste, so the owner can correct the lesson. Not synced: it is a note for the author, not progress.
 */
export interface GuideReport {
  id: string
  /** When it was flagged (ISO). */
  at: string
  language: string
  /** The lesson's topic. */
  topic: string
  /** `lesson`: about the lesson itself; `question`: about one question, whose text is in `prompt`. */
  kind: 'lesson' | 'question'
  prompt?: string
  /** What the learner thinks is wrong (may be empty). */
  note: string
}

/** The most reports kept; the oldest go first. */
export const MAX_REPORTS = 100
export const MAX_NOTE = 400

/** The reports with this one added in front (a new list); the same report twice is kept once. */
export function addReport(list: readonly GuideReport[], report: GuideReport): GuideReport[] {
  const same = (r: GuideReport) => r.language === report.language && r.topic === report.topic && r.kind === report.kind && r.prompt === report.prompt && r.note === report.note
  return [report, ...list.filter((r) => !same(r))].slice(0, MAX_REPORTS)
}

export const removeReport = (list: readonly GuideReport[], id: string): GuideReport[] => list.filter((r) => r.id !== id)

/** The reports read from storage: anything not shaped like a report is dropped. */
export function cleanReports(raw: unknown): GuideReport[] {
  if (!Array.isArray(raw)) return []
  const out: GuideReport[] = []
  for (const r of raw as Partial<GuideReport>[]) {
    if (!r || typeof r.id !== 'string' || typeof r.at !== 'string' || typeof r.language !== 'string' || typeof r.topic !== 'string') continue
    if (r.kind !== 'lesson' && r.kind !== 'question') continue
    out.push({ id: r.id, at: r.at, language: r.language, topic: r.topic, kind: r.kind, ...(typeof r.prompt === 'string' ? { prompt: r.prompt } : {}), note: typeof r.note === 'string' ? r.note : '' })
  }
  return out.slice(0, MAX_REPORTS)
}

/** The reports as a markdown list to paste into a message or an issue. */
export function reportsText(reports: readonly GuideReport[]): string {
  return reports
    .map((r) => {
      const where = r.kind === 'question' ? `soru (${r.topic})` : `ders (${r.topic})`
      const quote = r.prompt ? `\n  Soru: ${r.prompt}` : ''
      return `- [${r.language}] ${where}: ${r.note.trim() || '(not yok)'}${quote}`
    })
    .join('\n')
}
