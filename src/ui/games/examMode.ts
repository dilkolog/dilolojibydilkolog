import type { ExamMode } from '../../engine/examReading'
import type { TargetLanguage } from '../../engine/types'
import { canSpeak } from '../shared/speech'

const MODE_KEY = 'diloloji:exam-mode'

/** Reading or listening for the exam-style sets, kept on this device (the games' card and the exams screen share it). */
export function readExamMode(): ExamMode {
  try {
    // Listening needs a voice: on a device without one the saved choice falls back to reading.
    return localStorage.getItem(MODE_KEY) === 'listen' && canSpeak() ? 'listen' : 'read'
  } catch {
    return 'read'
  }
}

export function saveExamMode(mode: ExamMode) {
  try {
    localStorage.setItem(MODE_KEY, mode)
  } catch {
    // Without storage the choice just is not kept.
  }
}

const choiceKey = (language: TargetLanguage) => `diloloji:exams:${language}`

/** The exam and level last chosen for a language, on this device. */
export function readExamChoice(language: TargetLanguage): { exam?: string; level?: string } {
  try {
    const v = JSON.parse(localStorage.getItem(choiceKey(language)) ?? 'null') as { exam?: unknown; level?: unknown } | null
    return { exam: typeof v?.exam === 'string' ? v.exam : undefined, level: typeof v?.level === 'string' ? v.level : undefined }
  } catch {
    return {}
  }
}

export function saveExamChoice(language: TargetLanguage, choice: { exam: string; level: string }) {
  try {
    localStorage.setItem(choiceKey(language), JSON.stringify(choice))
  } catch {
    // Without storage the choice is just not kept.
  }
}

