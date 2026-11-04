/** `--name value` and `--flag` after the positional arguments. */
export function parseArgs(argv: readonly string[]) {
  const positional: string[] = []
  const flags: Record<string, string | true> = {}
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]
    if (a.startsWith('--')) {
      const next = argv[i + 1]
      if (next !== undefined && !next.startsWith('--')) {
        flags[a.slice(2)] = next
        i++
      } else flags[a.slice(2)] = true
    } else positional.push(a)
  }
  return { positional, flags }
}

export const isLang = (x: unknown): x is 'fr' | 'es' => x === 'fr' || x === 'es'
