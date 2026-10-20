import type { ExamTask } from '../engine/examTasks'
import type { TargetLanguage } from '../engine/types'

interface ExamFile {
  language: TargetLanguage
  source: string
  tasks: ExamTask[]
}

const FILES = import.meta.glob<ExamFile>('./examTasks/*.json', { import: 'default' })

/** The exam-style writing tasks of a language (loaded when the journal asks: not part of the first screen). */
export async function loadExamTasks(language: TargetLanguage): Promise<ExamTask[]> {
  const load = FILES[`./examTasks/${language}.json`]
  return load ? (await load()).tasks : []
}
