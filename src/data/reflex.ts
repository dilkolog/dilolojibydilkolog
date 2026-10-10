import type { ReflexPhrase } from '../engine/reflex'

/** Every `reflex/*.json` holds a list of phrases; one more file adds more. */
const FILES = import.meta.glob<ReflexPhrase[]>('./reflex/*.json', { import: 'default', eager: true })

/** The everyday phrases of the 3-second round: Turkish, French, Spanish and English side by side. */
export const reflexPhrases: ReflexPhrase[] = Object.values(FILES).flat()
