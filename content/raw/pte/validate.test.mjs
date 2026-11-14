import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { validateTask, validateFiles, words } from './validate.mjs'
const load = kind => JSON.parse(readFileSync(new URL(`./${kind}.json`, import.meta.url), 'utf8'))

test('the five sample files meet their schema, count, balance and length requirements', () => {
  const result = validateFiles()
  assert.deepEqual(result.errors, [])
  assert.equal(Object.values(result.report).reduce((n, r) => n + r.count, 0), 100)
})
test('duplicate identifiers, unexpected fields and out-of-range sentences fail', () => {
  const row = load('wfd')[0]
  assert.match(validateTask('wfd', [row, row]).join(), /duplicate id/)
  assert.match(validateTask('wfd', [{ ...row, topicName: 'extra' }]).join(), /unexpected/)
  assert.match(validateTask('wfd', [{ ...row, text: 'Too short.' }]).join(), /word count/)
})
test('questions are valid repetition sentences, but two sentences are not', () => {
  assert.deepEqual(validateTask('rs', [load('rs')[0]]), [])
  assert.match(validateTask('rs', [{ ...load('rs')[0], text: 'Please sit down now. We will start soon.' }]).join(), /one sentence/)
})
test('missing answers, repeated options and incorrectly numbered blanks fail', () => {
  const row = load('fib')[0]
  const absent = structuredClone(row)
  absent.blanks[0].answer = 'wrong'
  assert.match(validateTask('fib', [absent]).join(), /answer must appear/)
  const repeated = structuredClone(row)
  repeated.blanks[0].options[1] = repeated.blanks[0].options[0]
  assert.match(validateTask('fib', [repeated]).join(), /duplicate options/)
  assert.match(validateTask('fib', [{ ...row, text: row.text.replace('[[2]]', '[[1]]') }]).join(), /markers/)
})
test('short answers have one to three words and read-aloud paragraphs have two to three sentences', () => {
  assert.match(validateTask('asq', [{ ...load('asq')[0], answers: ['far too many answer words'] }]).join(), /1–3 words/)
  assert.match(validateTask('ra', [{ ...load('ra')[0], text: 'A single sentence ' + 'word '.repeat(35) + 'ends.' }]).join(), /two or three sentences/)
  assert.equal(words('a one-word answer'), 3)
})

test('research revision accepts five blanks, rejects B2 and the gap between FIB length bands', () => {
  const row = load('fib')[0]
  const five = structuredClone(row)
  five.text = five.text.replace(/family\.$/, '[[5]].')
  five.blanks.push({ answer: 'family', options: ['family', 'school', 'work', 'town'] })
  assert.deepEqual(validateTask('fib', [five]), [])
  assert.match(validateTask('fib', [{ ...row, text: row.text + ' word'.repeat(100 - words(row.text)) }]).join(), /60–90 or 120–180/)
  assert.match(validateTask('wfd', [{ ...load('wfd')[0], level: 'B2' }]).join(), /invalid level/)
})
