#!/usr/bin/env node
/** Generates drafts only. Applying a draft requires a separate review and reviewedBy. */
import { readFileSync, existsSync, appendFileSync } from 'node:fs'
const [input, output, ...flags] = process.argv.slice(2)
if (!input || !output) throw new Error('Usage: node scripts/translate-wordpack-missing.mjs queue.jsonl drafts.jsonl [--limit N]')
const limit = flags.includes('--limit') ? Number(flags[flags.indexOf('--limit') + 1]) : 100
if (!Number.isInteger(limit) || limit < 1 || limit > 1000) throw new Error('Limit must be 1–1000')
if (!process.env.DEEPL_AUTH_KEY) throw new Error('DEEPL_AUTH_KEY is required; nothing was translated or written')
const key = row => `${row.language}:${row.word}`
const done = new Set(existsSync(output) ? readFileSync(output, 'utf8').split('\n').filter(Boolean).map(l => key(JSON.parse(l))) : [])
const tasks = readFileSync(input, 'utf8').split('\n').filter(Boolean).map(l => JSON.parse(l)).filter(t => !done.has(key(t)) && t.pos && (t.definition || t.examples?.length))
const endpoint = process.env.DEEPL_AUTH_KEY.endsWith(':fx') ? 'https://api-free.deepl.com/v2/translate' : 'https://api.deepl.com/v2/translate'
let count = 0
for (const task of tasks.slice(0, limit)) {
  const context = [`Part of speech: ${{ n: 'noun', v: 'verb', a: 'adjective', d: 'adverb', p: 'preposition', c: 'conjunction', r: 'pronoun', h: 'phrase' }[task.pos] ?? task.pos}`, task.definition && `Definition: ${task.definition}`, ...(task.examples ?? []).map(e => `Example: ${e[0]}`)].filter(Boolean).join('\n')
  const response = await fetch(endpoint, { method: 'POST', headers: { authorization: `DeepL-Auth-Key ${process.env.DEEPL_AUTH_KEY}`, 'content-type': 'application/json' }, body: JSON.stringify({ text: [task.word], source_lang: task.language.toUpperCase(), target_lang: 'TR', context }), signal: AbortSignal.timeout(30000) })
  if (!response.ok) throw new Error(`DeepL ${response.status}; completed drafts remain saved`)
  const body = await response.json()
  const text = body.translations?.[0]?.text?.trim()
  if (!text || text.length > 160) throw new Error(`Invalid translation for ${task.word}`)
  appendFileSync(output, JSON.stringify({ language: task.language, word: task.word, pos: task.pos, meanings: [text], source: 'DeepL, context supplied; editorial review required', status: 'draft', context, rank: task.rank }) + '\n')
  done.add(key(task)); count++
}
console.log(`${count} drafts saved; existing results reused; no pack was modified. ${tasks.length - count} contextual tasks remain.`)
