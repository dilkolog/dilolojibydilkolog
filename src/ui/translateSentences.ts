/** Most characters translated in one go: a paragraph or two, so one tap can't empty the month. */
export const MAX_TOTAL = 3000

/** A text cut into sentences (lines kept apart), each short enough for one request. */
export function sentencesOf(text: string): string[] {
  return text
    .split(/\n+/)
    .flatMap((line) => line.split(/(?<=[.!?…])\s+/))
    .map((s) => s.trim())
    .filter(Boolean)
    .flatMap((s) => (s.length <= 600 ? [s] : (s.match(/.{1,600}(\s|$)/g) ?? [s]).map((x) => x.trim())))
}
