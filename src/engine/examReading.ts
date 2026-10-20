import { pickWeighted, type GrammarLog } from './grammar'
import type { TargetLanguage } from './types'

/**
 * Exam-style reading and listening tasks (DELF, DELE, Cambridge style): a short text of the kind an exam
 * gives (a message, an announcement, an article) and three questions on it. The same passage is read, or only
 * heard (device voice, at most `MAX_PLAYS` times) with the text shown after the answers.
 */
export interface ExamQuestion {
  prompt: string
  options: string[]
  /** Index of the one right option. */
  answer: number
  /** Why, in Turkish. */
  why: string
}

export interface ExamPassage {
  id: string
  language: TargetLanguage
  /** The family it imitates: DELF/DALF, DELE, Cambridge or IELTS. */
  exam: string
  level: 'A2' | 'B1' | 'B2' | 'C1'
  title: string
  text: string
  /** The text in Turkish, shown once the questions are answered. */
  tr: string
  questions: ExamQuestion[]
}

export type ExamMode = 'read' | 'listen'

/** How many times the text may be played in listening mode. */
export const MAX_PLAYS = 2

/** The key of one question in the learner's log. */
export const examQuestionId = (passage: ExamPassage, index: number) => `${passage.id}|${index + 1}`

/** Words of a text, as an exam counts them. */
export const wordCount = (text: string) => text.split(/\s+/).filter((w) => /[\p{L}\p{N}]/u.test(w)).length

/** A passage's record: the answers to all its questions added up (for choosing which to offer first). */
export function passageRecord(passage: ExamPassage, log: GrammarLog) {
  let ok = 0
  let wrong = 0
  for (let i = 0; i < passage.questions.length; i++) {
    const r = log[examQuestionId(passage, i)]
    ok += r?.ok ?? 0
    wrong += r?.wrong ?? 0
  }
  return { ok, wrong, tried: ok + wrong > 0 }
}

/** The last result of a passage as a share (0–1) of its questions right the last time, or undefined if never tried. */
export function passageShare(passage: ExamPassage, log: GrammarLog): number | undefined {
  let tried = 0
  let right = 0
  for (let i = 0; i < passage.questions.length; i++) {
    const r = log[examQuestionId(passage, i)]
    if (!r) continue
    tried++
    if ((r.streak ?? (r.ok > r.wrong ? 1 : 0)) > 0) right++
  }
  return tried ? right / passage.questions.length : undefined
}

/** Passages for a language and level, the ones answered worst or never first. */
export function passageOrder(all: readonly ExamPassage[], log: GrammarLog, language: TargetLanguage, rng: () => number, level?: ExamPassage['level']): ExamPassage[] {
  const pool = all.filter((p) => p.language === language && (!level || p.level === level))
  const summed: GrammarLog = {}
  for (const p of pool) {
    const r = passageRecord(p, log)
    if (r.tried) summed[p.id] = { ok: r.ok, wrong: r.wrong, last: '' }
  }
  return pickWeighted(pool, summed, rng, pool.length)
}

/** A question's options in a new order, with the index the right one moved to. */
export function shuffledQuestion(q: ExamQuestion, rng: () => number): { options: string[]; answer: number } {
  const order = q.options.map((_, i) => i)
  for (let i = order.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1))
    ;[order[i], order[j]] = [order[j], order[i]]
  }
  return { options: order.map((i) => q.options[i]), answer: order.indexOf(q.answer) }
}
