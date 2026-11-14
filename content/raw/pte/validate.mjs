/** Temporary raw-content validation until the UI-owned PTE builder lands on main. */
import { readFileSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { resolve } from 'node:path'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'

export const kinds = ['wfd', 'rs', 'ra', 'fib', 'asq']
const topics = ['daily_life', 'work', 'travel', 'education', 'health', 'environment', 'technology']
const fields = {
  wfd: ['id', 'text', 'level', 'topic', 'tr'], rs: ['id', 'text', 'level', 'tr'],
  ra: ['id', 'text', 'level', 'topic', 'tr'], fib: ['id', 'text', 'blanks', 'level', 'topic', 'tr'],
  asq: ['id', 'question', 'answers', 'level', 'tr'],
}
export const words = text => text.trim().split(/\s+/u).filter(Boolean).length
const sentences = text => (text.match(/[.!?](?:\s|$)/g) ?? []).length
const normalise = text => text.toLowerCase().trim().replace(/’/g, "'").replace(/\s+/g, ' ')
const sameKeys = (value, keys) => value && !Array.isArray(value) && typeof value === 'object' && Object.keys(value).sort().join() === [...keys].sort().join()
const filled = value => typeof value === 'string' && value.trim().length > 0

export function validateTask(kind, rows, seenIds = new Set(), seenTexts = new Set()) {
  const errors = []
  if (!kinds.includes(kind) || !Array.isArray(rows)) return ['unknown task or non-array input']
  for (const row of rows) {
    const fail = message => errors.push(`${row?.id ?? kind}: ${message}`)
    if (!sameKeys(row, fields[kind])) { fail('unexpected or missing fields'); continue }
    if (typeof row.id !== 'string' || !new RegExp(`^pte-${kind}-\\d{4}$`).test(row.id)) fail('invalid id')
    if (seenIds.has(row.id)) fail('duplicate id')
    seenIds.add(row.id)
    if (!['A2', 'B1', 'B2'].includes(row.level)) fail('invalid level')
    if (!filled(row.tr)) fail('missing Turkish translation')
    if (fields[kind].includes('topic') && !topics.includes(row.topic)) fail('invalid topic')
    const text = row.text ?? row.question
    if (!filled(text)) { fail('empty text'); continue }
    if (seenTexts.has(normalise(text))) fail('duplicate text')
    seenTexts.add(normalise(text))
    if (/\n/.test(text)) fail('must be one paragraph')
    let completed = text
    if (kind === 'fib') {
      const markers = [...text.matchAll(/\[\[(\d+)\]\]/g)].map(m => m[1])
      if (markers.join() !== '1,2,3,4' || (text.match(/\[\[/g) ?? []).length !== 4) fail('expected markers [[1]] through [[4]] once, in order')
      if (!Array.isArray(row.blanks) || row.blanks.length !== 4) { fail('expected four blanks'); continue }
      for (const blank of row.blanks) {
        if (!sameKeys(blank, ['answer', 'options']) || !filled(blank.answer) || words(blank.answer) !== 1 || !Array.isArray(blank.options) || blank.options.length !== 4 || !blank.options.every(o => filled(o) && words(o) === 1)) { fail('invalid blank'); continue }
        if (new Set(blank.options.map(normalise)).size !== 4) fail('duplicate options')
        if (blank.options.filter(o => o === blank.answer).length !== 1) fail('answer must appear exactly once')
      }
      completed = text.replace(/\[\[(\d+)\]\]/g, (_, n) => row.blanks[Number(n) - 1]?.answer ?? '')
      if (words(text) < 60 || words(text) > 90) fail('FIB template must have 60–90 words')
    }
    const bounds = { wfd: [7, 12], rs: [6, 11], ra: [35, 55], fib: [60, 90] }[kind]
    if (bounds && (words(completed) < bounds[0] || words(completed) > bounds[1])) fail(`word count outside ${bounds.join('–')}`)
    if (['wfd', 'rs'].includes(kind) && (sentences(text) !== 1 || !(kind === 'rs' ? /[.!?]$/ : /\.$/).test(text))) fail('expected one sentence')
    if (kind === 'ra' && (sentences(text) < 2 || sentences(text) > 3)) fail('expected two or three sentences')
    if (kind === 'asq') {
      if (sentences(text) !== 1 || !text.endsWith('?')) fail('expected one question')
      if (!Array.isArray(row.answers) || !row.answers.length || !row.answers.every(a => filled(a) && words(a) >= 1 && words(a) <= 3)) fail('answers must contain 1–3 words')
      else if (new Set(row.answers.map(normalise)).size !== row.answers.length) fail('duplicate answers')
    }
    if (/\b(color|organize|organizing|organization|center|favorite|neighbor|neighbors|program|traveled|traveling|realize|realized|analyze|analyzed|practice(?= unfamiliar))\b/i.test(text)) fail('American spelling')
  }
  return errors
}

export function validateFiles(root = fileURLToPath(new URL('.', import.meta.url))) {
  const errors = [], report = {}, ids = new Set(), texts = new Set()
  for (const kind of kinds) {
    const rows = JSON.parse(readFileSync(resolve(root, `${kind}.json`), 'utf8'))
    errors.push(...validateTask(kind, rows, ids, texts))
    if (rows.length !== 20) errors.push(`${kind}: sample must contain 20 items`)
    const levels = Object.fromEntries(['A2', 'B1', 'B2'].map(l => [l, rows.filter(r => r.level === l).length]))
    if (levels.A2 !== 10 || levels.B1 !== 8 || levels.B2 !== 2) errors.push(`${kind}: expected 10 A2, 8 B1, 2 B2`)
    const counts = rows.map(r => words(r.text ?? r.question))
    const distribution = Object.fromEntries(topics.map(t => [t, rows.filter(r => r.topic === t).length]).filter(([, n]) => n))
    report[kind] = { count: rows.length, levels, topics: ['rs', 'asq'].includes(kind) ? 'see README editorial topic map' : distribution, words: { min: Math.min(...counts), max: Math.max(...counts), mean: counts.reduce((a, b) => a + b, 0) / counts.length } }
  }
  return { errors, report }
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const result = validateFiles()
  console.log(JSON.stringify(result, null, 2))
  if (result.errors.length) process.exitCode = 1
  else {
    const temp = mkdtempSync(resolve(tmpdir(), 'pte-level-'))
    try {
      const out = resolve(temp, 'level-check.mjs')
      execFileSync('node_modules/.bin/rolldown', ['content/raw/pte/level-check.ts', '-o', out, '-p', 'node'], { stdio: ['ignore', 'ignore', 'pipe'] })
      const checks = JSON.parse(execFileSync(process.execPath, [out], { encoding: 'utf8' }))
      console.log(`CEFR: ${checks.length} items; all text, answer and option tokens at level or below (100%).`)
    } catch (error) {
      console.error(error.stdout?.toString() || error.message)
      process.exitCode = 1
    } finally { rmSync(temp, { recursive: true, force: true }) }
  }
}
