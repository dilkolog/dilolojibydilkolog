/**
 * A setting's explanation: the first sentence always, the rest behind ⓘ. Every setting carrying
 * three lines of small print made the page a wall of text nobody could scan.
 */
export function splitHelp(help: string): [string, string] {
  const m = help.match(/^(.+?[.!?])\s+(\S.*)$/s)
  return m && m[1].length >= 24 ? [m[1], m[2]] : [help, '']
}
