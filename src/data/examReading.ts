import type { ExamPassage } from '../engine/examReading'

const FILES = import.meta.glob<{ passages: ExamPassage[] }>('./examReading/*.json', { import: 'default', eager: true })

/** The exam-style reading and listening passages of every language (ui/games/ExamTasks). */
export const examPassages: ExamPassage[] = Object.values(FILES).flatMap((f) => f.passages)
