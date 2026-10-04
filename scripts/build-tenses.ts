/**
 * Builds src/data/tenses/{fr,es}.json: past and future tenses for the verbs a learner meets.
 *
 * French: french-verbs + french-verbs-lefff (Apache-2.0; Lefff by Benoît Sagot), for verbs in
 * Lexique (src/data/lexicon/fr.txt). Stored per verb: imparfait (i), futur (f), participe passé
 * masculine singular/plural (pp) and auxiliary (aux: 'e' être / 'a' avoir); passé composé is
 * composed at runtime (reflexives need être and their pronoun).
 *
 * Spanish: spanish-verbs (Apache-2.0) with the corrections from the learner's own audit in the
 * diloloji project (scripts/es-overrides.json), for infinitives in the frequency list plus the
 * 1000 verbs of diloloji's example sentences. Stored: indefinido (pre), imperfecto (imp), futuro
 * (fut), participio (pp); pretérito perfecto is composed at runtime (haber + participio).
 *
 * Every form is compared with UniMorph (CC BY-SA); differences are printed for review.
 * Usage: npx rolldown scripts/build-tenses.ts -o /tmp/t.mjs -p node && node /tmp/t.mjs <unimorph dir> [diloloji dir]
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { getConjugation as frConj, alwaysAuxEtre } from 'french-verbs'
import lefff from 'french-verbs-lefff/dist/conjugations.json'
import { getConjugation as esConj } from 'spanish-verbs'

const [unimorphDir, dilolojiDir] = process.argv.slice(2)
type Six = [string, string, string, string, string, string]

/**
 * A tense stored as just its stem when the six forms are stem + the regular endings (the endings
 * are in src/engine/tenses.ts and must match), otherwise as the six forms.
 */
const ENDINGS: Record<string, string[]> = {
  frI: ['ais', 'ais', 'ait', 'ions', 'iez', 'aient'],
  frF: ['ai', 'as', 'a', 'ons', 'ez', 'ont'],
  esImpAr: ['aba', 'abas', 'aba', 'ábamos', 'abais', 'aban'],
  esImpErIr: ['ía', 'ías', 'ía', 'íamos', 'íais', 'ían'],
  esFut: ['é', 'ás', 'á', 'emos', 'éis', 'án'],
}
function pack(forms: string[], endings: string[]): string | string[] {
  const stem = forms[0].slice(0, forms[0].length - endings[0].length)
  return forms[0].endsWith(endings[0]) && forms.every((f, i) => f === stem + endings[i]) ? stem : forms
}
const P = [0, 1, 2, 3, 4, 5] as const

// ── UniMorph reference ────────────────────────────────────────────────────────────────
function unimorph(file: string, wanted: Record<string, string>) {
  const out = new Map<string, Record<string, string>>()
  for (const line of readFileSync(`${unimorphDir}/${file}`, 'utf8').split('\n')) {
    const [lemma, form, feats] = line.split('\t')
    const key = feats && wanted[feats]
    if (!key) continue
    const m = out.get(lemma) ?? {}
    m[key] ??= form
    out.set(lemma, m)
  }
  return out
}
const PERS = ['1;SG', '2;SG', '3;SG', '1;PL', '2;PL', '3;PL']
const cell = (prefix: string, suffix = '') => Object.fromEntries(PERS.map((p, i) => [`${prefix};${p}${suffix}`, `${i}`]))

let differences = 0
function compare(lang: string, verb: string, tense: string, ours: string[], ref: Record<string, string> | undefined, prefix: string) {
  if (!ref) return
  const theirs = P.map((i) => ref[`${prefix}${i}`])
  if (theirs.some((x) => !x)) return
  const diff = P.filter((i) => ours[i] !== theirs[i])
  if (diff.length) {
    differences++
    if (differences <= 100000) console.log(`${lang} ${verb} ${tense}: ours ${ours.join(' ')} | unimorph ${theirs.join(' ')}`)
  }
}

// ── French ────────────────────────────────────────────────────────────────────────────
const frVerbs = readFileSync('src/data/lexicon/fr.txt', 'utf8')
  .split('\n')
  .filter((l) => /\t.*v/.test(l))
  .map((l) => l.split('\t')[0])
  .filter((v) => (lefff as Record<string, unknown>)[v])
const frRef = unimorph('fra', {
  ...Object.fromEntries(PERS.map((p, i) => [`V;IND;PST;${p};IPFV`, `i${i}`])),
  ...Object.fromEntries(PERS.map((p, i) => [`V;IND;FUT;${p}`, `f${i}`])),
  'V.PTCP;PST': 'pp',
})
const fr: Record<string, { i: Six; f: Six; pp: [string, string]; aux: 'a' | 'e' }> = {}
for (const v of frVerbs) {
  try {
    const conj = (tense: string) => P.map((p) => frConj(lefff as never, v, tense as never, p, {}, false, undefined, undefined, 'Act')) as Six
    const k = (lefff as Record<string, { K?: string[] }>)[v].K
    if (!k?.[0]) continue
    const i = conj('IMPARFAIT')
    const f = conj('FUTUR')
    if ([...i, ...f].some((x) => !x || x === 'NA' || /undefined/.test(x))) continue
    fr[v] = { i, f, pp: [k[0], k[1] ?? `${k[0]}s`], aux: alwaysAuxEtre(v) ? 'e' : 'a' }
    const ref = frRef.get(v)
    compare('fr', v, 'imparfait', i, ref && Object.fromEntries(P.map((p) => [`i${p}`, ref[`i${p}`]])), 'i')
    compare('fr', v, 'futur', f, ref && Object.fromEntries(P.map((p) => [`f${p}`, ref[`f${p}`]])), 'f')
    if (ref?.pp && ref.pp !== k[0]) {
      differences++
      if (differences <= 100000) console.log(`fr ${v} participe: ours ${k[0]} | unimorph ${ref.pp}`)
    }
  } catch {
    // A verb the library can't conjugate is left out.
  }
}
writeFileSync('src/data/tenses/fr.json', JSON.stringify(Object.fromEntries(Object.entries(fr).map(([v, e]) => [v, { i: pack(e.i, ENDINGS.frI), f: pack(e.f, ENDINGS.frF), pp: e.pp[1] === `${e.pp[0]}s` ? e.pp[0] : e.pp, aux: e.aux }]))))
console.log(`fr: ${Object.keys(fr).length} verbs`)

// ── Spanish ───────────────────────────────────────────────────────────────────────────
/*
 * spanish-verbs is reliable for -ar verbs, the imperfect and regular futures, but gets about half
 * of -er/-ir preterites wrong (*morieron, *pedió, *leió, *conducieron), derived futures
 * (*componeré) and irregular participles (*descubrido). So every form comes from the most trusted
 * source that has it: the learner's own audit (diloloji overrides) > Fred Jehle's verb database
 * (637 verbs, hand-checked; CC BY-NC-SA 3.0) > UniMorph > the family's base verb (obtener like
 * tener) > the library only where it is reliable. A verb whose forms can't all be vouched for is
 * left out: better no past tense for it than a wrong one.
 */
const overrides = JSON.parse(readFileSync('scripts/es-overrides.json', 'utf8')) as Record<string, Record<string, Record<string, string>>>
type Key = 'pre' | 'imp' | 'fut'
const LABEL: Record<Key, string> = { pre: 'Pretérito Indefinido', imp: 'Pretérito Imperfecto', fut: 'Futuro Simple' }
const PERSON_KEY: Record<string, number> = { yo: 0, tú: 1, tu: 1, 'él/ella': 2, él: 2, el: 2, nosotros: 3, vosotros: 4, 'ellos/ellas': 5, ellos: 5 }
const freq = new Map<string, number>()
readFileSync('src/data/frequency/es.txt', 'utf8').split('\n').forEach((w, i) => w && !freq.has(w) && freq.set(w, i + 1))

const esRef = unimorph('spa', {
  ...Object.fromEntries(PERS.map((p, i) => [`V;IND;PST;${p};PFV`, `pre${i}`])),
  ...Object.fromEntries(PERS.map((p, i) => [`V;IND;PST;${p};IPFV`, `imp${i}`])),
  ...Object.fromEntries(PERS.map((p, i) => [`V;IND;FUT;${p}`, `fut${i}`])),
  'V;V.PTCP;PST;MASC;SG': 'pp',
})
for (const line of readFileSync(`${unimorphDir}/spa`, 'utf8').split('\n')) {
  const [lemma, form, feats] = line.split('\t')
  const tag = { 'V;IND;PST;2;SG;PFV;INFM': 'pre1', 'V;IND;PST;2;SG;IPFV;INFM': 'imp1', 'V;IND;FUT;2;SG;INFM': 'fut1' }[feats as string]
  if (!tag) continue
  const m = esRef.get(lemma) ?? {}
  m[tag] = form
  esRef.set(lemma, m)
}

// Fred Jehle's database: "infinitive",…,"mood",…,"tense",…,forms 1s–3p,…,"pastparticiple".
const jehle = new Map<string, Partial<Record<Key | 'pp', string[] | string>>>()
const JT: Record<string, Key> = { 'Pretérito': 'pre', Imperfecto: 'imp', Futuro: 'fut' }
for (const line of readFileSync(`${unimorphDir}/jehle_verb_database.csv`, 'utf8').split('\n').slice(1)) {
  const c = line.match(/"([^"]*)"/g)?.map((x) => x.slice(1, -1))
  if (!c || c[2] !== 'Indicativo' || !JT[c[4]]) continue
  const forms = c.slice(7, 13)
  if (forms.some((f) => !f || / /.test(f))) continue
  const m = jehle.get(c[0]) ?? {}
  m[JT[c[4]]] = forms
  m.pp = c[15]
  jehle.set(c[0], m)
}

const dilolojiVerbs = dilolojiDir && existsSync(`${dilolojiDir}/src/data/example_sentences.js`)
  ? Object.keys(JSON.parse(readFileSync(`${dilolojiDir}/src/data/example_sentences.js`, 'utf8').replace(/^export const exampleSentences = /, '').replace(/;\s*$/, '')))
  : []
const candidates = [...new Set([...[...esRef.keys()].filter((v) => (freq.get(v) ?? Infinity) <= 40000), ...dilolojiVerbs, ...jehle.keys()])]
  .filter((v) => /^[a-zñáéíóú]*(ar|er|ir|ír)$/.test(v))
  .sort()

const IRREGULAR_FUTURE = ['caber', 'haber', 'poder', 'querer', 'saber', 'poner', 'salir', 'tener', 'valer', 'venir', 'decir', 'hacer']
const IRREGULAR_PP = ['cubrir', 'scribir', 'solver', 'volver', 'poner', 'hacer', 'decir', 'ver', 'romper', 'morir', 'abrir', 'freír', 'imprimir', 'proveer']
const FAMILY_BASE = ['tener', 'poner', 'venir', 'hacer', 'decir', 'salir', 'valer', 'cubrir', 'scribir', 'solver', 'volver', 'traer', 'caer', 'ducir', 'leer', 'creer', 'seer', 'ver', 'oír', 'seguir', 'servir', 'pedir', 'vestir', 'sentir', 'ferir', 'vertir', 'dormir']
const NOT_IN_FAMILY = new Set(['bendecir', 'maldecir', 'prever', 'proveer', 'atraer'])
const endsWith = (v: string, list: string[]) => list.some((b) => v === b || v.endsWith(b))

type Entry = { pre: Six; imp: Six; fut: Six; pp: string }
const es: Record<string, Entry> = {}
const vouched: Record<string, Record<Key | 'pp', boolean>> = {}
let byOverride = 0
let byJehle = 0
let byUnimorph = 0
let byFamily = 0
let dropped = 0

function libForms(v: string): Entry | null {
  try {
    const conj = (tense: string) => P.map((p) => esConj(v, tense, p)) as Six
    const pp = esConj(v, 'INDICATIVE_PERFECT', 2).replace(/^ha /, '')
    const e = { pre: conj('INDICATIVE_PRETERITE'), imp: conj('INDICATIVE_IMPERFECT'), fut: conj('INDICATIVE_FUTURE'), pp }
    return [...e.pre, ...e.imp, ...e.fut, e.pp].some((x) => !x || / /.test(x) || /undefined/.test(x)) ? null : e
  } catch {
    return null
  }
}

// Pass 1: authorities.
for (const v of candidates) {
  const lib = libForms(v)
  const j = jehle.get(v)
  const u = esRef.get(v)
  const e: Entry = lib ?? { pre: ['', '', '', '', '', ''], imp: ['', '', '', '', '', ''], fut: ['', '', '', '', '', ''], pp: '' }
  const ok: Record<Key | 'pp', boolean> = { pre: false, imp: false, fut: false, pp: false }
  for (const key of ['pre', 'imp', 'fut'] as const) {
    const fromU = P.map((p) => u?.[`${key}${p}`])
    if (j?.[key]) {
      e[key] = [...(j[key] as string[])] as Six
      ok[key] = true
      byJehle++
    } else if (fromU.every(Boolean)) {
      e[key] = fromU as Six
      ok[key] = true
      byUnimorph++
    }
    const patch = overrides[v]?.[LABEL[key]]
    if (patch) {
      for (const [person, form] of Object.entries(patch)) if (PERSON_KEY[person] !== undefined) e[key][PERSON_KEY[person]] = form
      byOverride++
    }
  }
  if (typeof j?.pp === 'string' && j.pp) {
    e.pp = j.pp
    ok.pp = true
  } else if (u?.pp) {
    e.pp = u.pp
    ok.pp = true
  }
  // The library where it is reliable.
  if (lib) {
    const ar = v.endsWith('ar')
    if (!ok.pre && ar && !/guar$/.test(v) && v !== 'andar') ok.pre = true
    if (!ok.imp && !['ser', 'ir', 'ver'].includes(v)) ok.imp = true
    if (!ok.fut && !endsWith(v, IRREGULAR_FUTURE)) ok.fut = true
    if (!ok.pp && !endsWith(v, IRREGULAR_PP)) {
      // -aer/-eer/-oír participles take an accent: traído, leído, oído.
      e.pp = e.pp.replace(/([aeo])ido$/, '$1ído')
      ok.pp = true
    }
  }
  es[v] = e
  vouched[v] = ok
}

// Pass 2: derived verbs from their base (obtener → tener), for what is still unvouched.
for (const v of Object.keys(es)) {
  if (NOT_IN_FAMILY.has(v)) continue
  const base = FAMILY_BASE.filter((b) => v !== b && v.endsWith(b) && es[b] && Object.values(vouched[b]).every(Boolean)).sort((a, b) => b.length - a.length)[0]
  if (!base) continue
  const prefix = v.slice(0, -base.length)
  for (const key of ['pre', 'imp', 'fut'] as const) {
    if (vouched[v][key]) continue
    // A base without a written accent keeps it off (deshizo); oír-family accents stay as written.
    es[v][key] = es[base][key].map((f) => prefix + f) as Six
    vouched[v][key] = true
    byFamily++
  }
  if (!vouched[v].pp) {
    es[v].pp = prefix + es[base].pp
    vouched[v].pp = true
    byFamily++
  }
}

for (const v of Object.keys(es)) {
  if (!Object.values(vouched[v]).every(Boolean)) {
    delete es[v]
    dropped++
  }
}
writeFileSync('src/data/tenses/es.json', JSON.stringify(Object.fromEntries(Object.entries(es).map(([v, e]) => [v, { pre: e.pre, imp: pack(e.imp, e.imp[0].endsWith('aba') ? ENDINGS.esImpAr : ENDINGS.esImpErIr), fut: pack(e.fut, ENDINGS.esFut), pp: e.pp }]))))
console.log(`es: ${Object.keys(es).length} verbs (Jehle ${byJehle}, UniMorph ${byUnimorph}, base verb ${byFamily}, overrides ${byOverride}; ${dropped} left out, not vouched for)`)
