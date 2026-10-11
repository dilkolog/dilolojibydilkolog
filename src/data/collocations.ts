import type { Collocation } from '../engine/collocations'

/** Every `collocations/*.json` holds a list; one more file adds more. */
const FILES = import.meta.glob<Collocation[]>('./collocations/*.json', { import: 'default', eager: true })

export const collocations: Collocation[] = Object.values(FILES).flat()
