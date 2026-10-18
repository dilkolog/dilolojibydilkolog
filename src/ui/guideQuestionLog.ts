import { cleanQuestionLog, type QuestionLog } from '../engine/guideQuestions'
import type { TargetLanguage } from '../engine/types'

const key = (language: TargetLanguage) => `diloloji:guide-questions:${language}`

/** What was answered in the guide's checks on this device (empty when unreadable). */
export function loadQuestionLog(language: TargetLanguage): QuestionLog {
  try {
    return cleanQuestionLog(JSON.parse(localStorage.getItem(key(language)) ?? '{}'))
  } catch {
    return {}
  }
}

export function saveQuestionLog(language: TargetLanguage, log: QuestionLog) {
  try {
    localStorage.setItem(key(language), JSON.stringify(log))
  } catch {
    // The order of the questions is only a convenience.
  }
}
