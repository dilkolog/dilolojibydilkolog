import type { RegisterItem } from '../engine/register'

/** Every `register/*.json` holds a list of thoughts said three ways; one more file adds more. */
const FILES = import.meta.glob<RegisterItem[]>('./register/*.json', { import: 'default', eager: true })

export const registerItems: RegisterItem[] = Object.values(FILES).flat()
