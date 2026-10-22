import type { Dialogue } from '../engine/dialogues'
import type { TargetLanguage } from '../engine/types'

interface DialogueFile {
  language: TargetLanguage
  source: string
  dialogues: Omit<Dialogue, 'language'>[]
}

/** Every `dialogues/*.json` holds a language's dialogues; one more file adds more. */
const FILES = import.meta.glob<DialogueFile>('./dialogues/*.json', { import: 'default', eager: true })

export const dialogues: Dialogue[] = Object.values(FILES).flatMap((f) => f.dialogues.map((d) => ({ ...d, language: f.language })))
