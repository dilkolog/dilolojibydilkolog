/**
 * The retired list of a language (content/retired/<lang>.json, docs/ICERIK-FABRIKASI.md §6.4) with ids added or taken
 * back: sorted, each once. An id is only retired when it is one of the factory's items: the app's bundled questions
 * (src/data/grammar…) are not published through the manifest, so retiring them here would do nothing.
 */
export function changeRetired(current: readonly string[], ids: readonly string[], known: ReadonlySet<string>, undo = false): { list: string[]; unknown: string[] } {
  const unknown = undo ? [] : ids.filter((id) => !known.has(id))
  const set = new Set(current)
  for (const id of ids) {
    if (undo) set.delete(id)
    else if (known.has(id)) set.add(id)
  }
  return { list: [...set].sort(), unknown }
}

/** The language of a factory id: "fr-g-000123" → fr. */
export const languageOfId = (id: string): 'fr' | 'es' | undefined => (/^(fr|es)-/.exec(id)?.[1] as 'fr' | 'es' | undefined)
