/**
 * Builds src/data/lexicon/fr.txt from Lexique 3.83 (New, Pallier et al.; CC BY-SA 4.0):
 *   http://www.lexique.org/databases/Lexique383/Lexique383.tsv
 * One line per lemma used at least MIN_FREQ times per million words (films + books):
 *   "lemma<TAB>codes" — parts of speech, most frequent first (n noun, v verb, a adjective,
 *   d adverb, p preposition, c conjunction, r pronoun), a noun's gender right after its n
 *   (m, f, or e for either: "le/la livre"). Example: "asile	nm", "fort	ad".
 *
 * Usage: node scripts/build-lexicon.mjs <path to Lexique383.tsv>
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'

const MIN_FREQ = 0.3
const POS = { NOM: 'n', VER: 'v', AUX: 'v', ADJ: 'a', 'ADJ:num': 'a', 'ADJ:ind': 'a', 'ADJ:pos': 'a', 'ADJ:dem': 'a', 'ADJ:int': 'a', ADV: 'd', PRE: 'p', CON: 'c', PRO: 'r', 'PRO:per': 'r', 'PRO:ind': 'r', 'PRO:dem': 'r', 'PRO:rel': 'r', 'PRO:int': 'r', 'PRO:pos': 'r' }

const lines = readFileSync(process.argv[2], 'utf8').split('\n')
const head = lines[0].split('\t')
const col = (name) => head.indexOf(name)
const [ORTHO, LEMME, CGRAM, GENRE, NOMBRE, FL, FB, FFI, FLI] = ['ortho', 'lemme', 'cgram', 'genre', 'nombre', 'freqlemfilms2', 'freqlemlivres', 'freqfilms2', 'freqlivres'].map(col)

/** lemma → pos code → { freq, genders: { m, f } } */
const lemmas = new Map()
for (const line of lines.slice(1)) {
  const c = line.split('\t')
  const code = POS[c[CGRAM]]
  const lemma = c[LEMME]
  if (!code || !lemma || /\s/.test(lemma)) continue
  const byPos = lemmas.get(lemma) ?? new Map()
  const x = byPos.get(code) ?? { freq: 0, m: 0, f: 0 }
  // freqlem* is the lemma's total, repeated on each of its rows: keep the largest.
  x.freq = Math.max(x.freq, (Number(c[FL]) + Number(c[FB])) / 2)
  if (code === 'n' && c[ORTHO] === lemma && c[NOMBRE] !== 'p' && (c[GENRE] === 'm' || c[GENRE] === 'f')) x[c[GENRE]] += Number(c[FFI]) + Number(c[FLI]) + 0.01
  byPos.set(code, x)
  lemmas.set(lemma, byPos)
}

const out = []
for (const [lemma, byPos] of lemmas) {
  const ranked = [...byPos].filter(([, x]) => x.freq >= MIN_FREQ / 4).sort((a, b) => b[1].freq - a[1].freq)
  if (!ranked.length || ranked.reduce((s, [, x]) => s + x.freq, 0) < MIN_FREQ) continue
  const codes = ranked
    .map(([code, x]) => {
      if (code !== 'n') return code
      // Both genders in real use (le/la livre, un/une élève): "e"; otherwise the dominant one.
      const g = x.m && x.f && Math.min(x.m, x.f) / Math.max(x.m, x.f) > 0.25 ? 'e' : x.m > x.f ? 'm' : x.f > x.m ? 'f' : ''
      return `n${g}`
    })
    .join('')
  out.push(`${lemma}\t${codes}`)
}
out.sort()
mkdirSync('src/data/lexicon', { recursive: true })
writeFileSync('src/data/lexicon/fr.txt', out.join('\n') + '\n')
console.log(`${out.length} lemmas`)
