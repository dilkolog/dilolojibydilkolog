/** English adapter for the factory's lexical lookup; the factory CLI supports only FR/ES. */
import { readFileSync } from 'node:fs'
import { parseCefrList } from '../../../src/engine/cefrLevels'
import { readingKey } from '../../../src/engine/reading'
import { levelRank } from '../../../scripts/content/lib/context'
import { LEVEL_FIT } from '../../../scripts/content/lib/rules'

const cefr = parseCefrList(readFileSync('src/data/cefr/en.txt', 'utf8'))
const forms = JSON.parse(readFileSync('src/data/wordpack/en.json', 'utf8')).f as Record<string, string>
const stemLevel = new Map<string, string>()
for (const [word, level] of cefr) {
  if (word.includes(' ')) continue
  const stem = readingKey(word, 'en')
  if (levelRank(level) < levelRank(stemLevel.get(stem))) stemLevel.set(stem, level)
}

/** Same lowest-level precedence as factory wordLevel, without unsupported EN verb tables. */
function wordLevel(word: string): string | undefined {
  const w = word.toLowerCase().replace(/’/g, "'")
  const candidates = [cefr.get(w), cefr.get(forms[w]), stemLevel.get(readingKey(w, 'en'))]
    .filter((level): level is string => !!level)
  return candidates.sort((a, b) => levelRank(a) - levelRank(b))[0]
}

const checks: object[] = []
for (const kind of ['wfd', 'rs', 'ra', 'fib', 'asq']) {
  const rows = JSON.parse(readFileSync(`content/raw/pte/${kind}.json`, 'utf8'))
  for (const row of rows) {
    let text = row.text ?? row.question
    if (kind === 'fib') text = text.replace(/\[\[(\d+)\]\]/g, (_: string, n: string) => row.blanks[Number(n) - 1].answer)
    // Include every answer and distractor, and do not exempt capitalised unknown words as names.
    const extras = kind === 'fib' ? row.blanks.flatMap((b: { options: string[] }) => b.options) : kind === 'asq' ? row.answers : []
    const tokens = [text, ...extras].join(' ').match(/[a-z]+(?:['’][a-z]+)?/gi) ?? []
    const above = [...new Set(tokens.filter(w => levelRank(wordLevel(w)) > levelRank(row.level)))]
    checks.push({ id: row.id, level: row.level, tokens: tokens.length, above, factoryThreshold: LEVEL_FIT, requiredShare: 1 })
  }
}
console.log(JSON.stringify(checks))
if (checks.some(c => (c as { above: string[] }).above.length)) process.exitCode = 1
