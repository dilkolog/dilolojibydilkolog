import type { CSSProperties } from 'react'

/** The word's length for the large type: a long expression shrinks smoothly to stay on a line ("Contrat de location"). */
export function wordFit(text: string): CSSProperties {
  return { '--len': text.length } as CSSProperties
}
