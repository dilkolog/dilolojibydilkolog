import { addReport, cleanReports, removeReport, type GuideReport } from '../engine/guideReports'

const KEY = 'diloloji:guide-reports'

export function loadReports(): GuideReport[] {
  try {
    return cleanReports(JSON.parse(localStorage.getItem(KEY) ?? '[]'))
  } catch {
    return []
  }
}

function save(list: GuideReport[]) {
  try {
    localStorage.setItem(KEY, JSON.stringify(list))
  } catch {
    // The list is only a note for the author.
  }
  window.dispatchEvent(new Event('diloloji:guide-reports'))
}

export function fileReport(report: Omit<GuideReport, 'id' | 'at'>) {
  save(addReport(loadReports(), { ...report, id: `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`, at: new Date().toISOString() }))
}

export const dropReport = (id: string) => save(removeReport(loadReports(), id))
export const clearReports = () => save([])
