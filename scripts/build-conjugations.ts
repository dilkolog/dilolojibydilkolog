/**
 * Builds src/data/conjugation/{fr,es}.txt from UniMorph (CC BY-SA 3.0):
 *   https://github.com/unimorph/fra, https://github.com/unimorph/spa
 * and, for Spanish verbs UniMorph lacks, Fred Jehle's verb database (jehle_verb_database.csv, as in build-tenses.ts).
 * Present indicative of every verb a learner is likely to meet (French: a verb in Lexique;
 * Spanish: an infinitive in the frequency list, or a verb with other tenses in src/data/tenses/es.json —
 * the safe rules would otherwise give consolo for consuelo), kept only where the hand tables and safe rules in conjugation.ts don't
 * already give the same forms. One line per verb: "infinitive<TAB>je tu il nous vous ils".
 *
 * Usage (files downloaded beforehand):
 *   npx rolldown scripts/build-conjugations.ts -o /tmp/conj.mjs -p node && node /tmp/conj.mjs <dir with fra, spa>
 */
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { conjugate } from '../src/engine/conjugation'

const dir = process.argv[2]
const FEATURES: Record<'fr' | 'es', string[]> = {
  fr: ['V;IND;PRS;1;SG', 'V;IND;PRS;2;SG', 'V;IND;PRS;3;SG', 'V;IND;PRS;1;PL', 'V;IND;PRS;2;PL', 'V;IND;PRS;3;PL'],
  es: ['V;IND;PRS;1;SG', 'V;IND;PRS;2;SG;INFM', 'V;IND;PRS;3;SG', 'V;IND;PRS;1;PL', 'V;IND;PRS;2;PL', 'V;IND;PRS;3;PL'],
}
const LEMMA_RANK = 40000
/** UniMorph errors found by comparison (dècrypte for décrypte). */
const WRONG = new Set(['décrypter'])
/**
 * UniMorph's French also lists Old French verbs (touchier, saignier) whose forms look modern, so
 * French verbs must be verbs in Lexique (src/data/lexicon/fr.txt, built first).
 */
const FR_VERBS = new Set(
  readFileSync('src/data/lexicon/fr.txt', 'utf8')
    .split('\n')
    .filter((l) => /\t.*v/.test(l))
    .map((l) => l.split('\t')[0]),
)
const ES_TENSE_VERBS = new Set(Object.keys(JSON.parse(readFileSync('src/data/tenses/es.json', 'utf8'))))

for (const [lang, file] of [['fr', 'fra'], ['es', 'spa']] as const) {
  const freq = new Map<string, number>()
  readFileSync(`src/data/frequency/${lang}.txt`, 'utf8').split('\n').forEach((w, i) => w && !freq.has(w) && freq.set(w, i + 1))
  const verbs = new Map<string, (string | undefined)[]>()
  for (const line of readFileSync(`${dir}/${file}`, 'utf8').split('\n')) {
    const [lemma, form, feats] = line.split('\t')
    if (!feats) continue
    const at = FEATURES[lang].indexOf(feats)
    if (at < 0 || /\s/.test(lemma) || /\s/.test(form)) continue
    const forms = verbs.get(lemma) ?? Array(6).fill(undefined)
    forms[at] ??= form
    verbs.set(lemma, forms)
  }
  // Fred Jehle's database (the one build-tenses.ts uses) for Spanish verbs UniMorph lacks (alentar).
  if (lang === 'es' && existsSync(`${dir}/jehle_verb_database.csv`)) {
    for (const line of readFileSync(`${dir}/jehle_verb_database.csv`, 'utf8').split('\n').slice(1)) {
      const c = line.match(/"[^"]*"/g)?.map((f) => f.slice(1, -1))
      if (c?.[2] !== 'Indicativo' || c[4] !== 'Presente' || verbs.get(c[0])?.every(Boolean)) continue
      const forms = c.slice(7, 13)
      // Defective rows (llover: only the third person, the columns shifted) are left out.
      if (forms.every((f) => f && !/ /.test(f)) && forms[1].endsWith('s') && forms[5].endsWith('n')) verbs.set(c[0], forms)
    }
  }
  const out: string[] = []
  let agree = 0
  let disagree = 0
  for (const [lemma, forms] of verbs) {
    if (forms.some((f) => !f)) continue
    const known = lang === 'fr' ? FR_VERBS.has(lemma) : (freq.get(lemma) ?? Infinity) <= LEMMA_RANK || ES_TENSE_VERBS.has(lemma)
    if (!known) continue
    if (WRONG.has(lemma)) continue
    const conj = conjugate({ language: lang, lemma, partOfSpeech: 'verb' })
    const ours = conj?.forms
    // Hand tables win: where they differ it is a variant (paie/paye), not an error.
    if ((ours && ours.join(' ') === forms.join(' ')) || conj?.source === 'table') {
      agree++
      continue
    }
    if (ours) {
      disagree++
      console.log(`${lang} differs: ${lemma}: ours "${ours.join(' ')}" unimorph "${forms.join(' ')}"`)
    }
    out.push(`${lemma}\t${forms.join(' ')}`)
  }
  out.sort((a, b) => a.localeCompare(b, lang))
  mkdirSync('src/data/conjugation', { recursive: true })
  writeFileSync(`src/data/conjugation/${lang}.txt`, out.join('\n') + '\n')
  console.log(`${lang}: ${out.length} verbs written; rules/tables already right for ${agree}, differ for ${disagree}`)
}
