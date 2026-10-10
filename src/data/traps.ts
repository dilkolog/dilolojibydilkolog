import type { TrapWord } from '../engine/traps'

/** Every `traps/*.json` holds a language's false friends; one more file adds more. */
const FILES = import.meta.glob<TrapWord[]>('./traps/*.json', { import: 'default', eager: true })

export const trapWords: TrapWord[] = Object.values(FILES).flat()
