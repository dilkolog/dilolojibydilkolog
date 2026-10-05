/**
 * Builds src/data/tenses/{fr,es}.json: past and future tenses for the verbs a learner meets.
 *
 * French: french-verbs + french-verbs-lefff (Apache-2.0; Lefff by Benoît Sagot), for verbs in
 * Lexique (src/data/lexicon/fr.txt). Stored per verb: imparfait (i), futur (f), subjonctif (s), participe passé
 * masculine singular/plural (pp) and auxiliary (aux: 'e' être / 'a' avoir); passé composé is
 * composed at runtime (reflexives need être and their pronoun).
 *
 * Spanish: spanish-verbs (Apache-2.0) with the corrections from the learner's own audit in the
 * diloloji project (scripts/es-overrides.json), for infinitives in the frequency list plus the
 * 1000 verbs of diloloji's example sentences. Stored: indefinido (pre), imperfecto (imp), futuro
 * (fut), participio (pp), presente de subjuntivo (sub, when vouched for); pretérito perfecto
 * (haber + participio) and the conditional (future stem + -ía) are composed at runtime.
 *
 * Every form is compared with UniMorph (CC BY-SA); differences are printed for review.
 * Usage: npx rolldown scripts/build-tenses.ts -o /tmp/t.mjs -p node && node /tmp/t.mjs <unimorph dir> [diloloji dir]
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { getConjugation as frConj, alwaysAuxEtre } from 'french-verbs'
import lefff from 'french-verbs-lefff/dist/conjugations.json'
import { getConjugation as esConj } from 'spanish-verbs'
import { addConjugations, conjugate } from '../src/engine/conjugation'

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
  frS: ['e', 'es', 'e', 'ions', 'iez', 'ent'],
  esSubAr: ['e', 'es', 'e', 'emos', 'éis', 'en'],
  esSubErIr: ['a', 'as', 'a', 'amos', 'áis', 'an'],
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
  ...Object.fromEntries(PERS.map((p, i) => [`V;SBJV;PRS;${p}`, `s${i}`])),
  ...Object.fromEntries(PERS.map((p, i) => [`V;COND;${p}`, `c${i}`])),
  'V.PTCP;PST': 'pp',
})
const fr: Record<string, { i: Six; f: Six; s: Six; pp: [string, string]; aux: 'a' | 'e' }> = {}
for (const v of frVerbs) {
  try {
    const conj = (tense: string) => P.map((p) => frConj(lefff as never, v, tense as never, p, {}, false, undefined, undefined, 'Act')) as Six
    const k = (lefff as Record<string, { K?: string[] }>)[v].K
    if (!k?.[0]) continue
    const i = conj('IMPARFAIT')
    const f = conj('FUTUR')
    const sj = conj('SUBJONCTIF_PRESENT')
    if ([...i, ...f, ...sj].some((x) => !x || x === 'NA' || /undefined/.test(x))) continue
    // The conditional is built at runtime from the futur stem; checked here against the library.
    const c = conj('CONDITIONNEL_PRESENT')
    const stem = f[0].slice(0, -2)
    if (!f.every((x, n) => x === stem + ENDINGS.frF[n]) || !c.every((x, n) => x === stem + ENDINGS.frI[n])) {
      console.log(`fr ${v}: conditionnel not futur stem + imparfait endings: ${c.join(' ')}`)
      continue
    }
    fr[v] = { i, f, s: sj, pp: [k[0], k[1] ?? `${k[0]}s`], aux: alwaysAuxEtre(v) ? 'e' : 'a' }
    const ref = frRef.get(v)
    compare('fr', v, 'imparfait', i, ref && Object.fromEntries(P.map((p) => [`i${p}`, ref[`i${p}`]])), 'i')
    compare('fr', v, 'futur', f, ref && Object.fromEntries(P.map((p) => [`f${p}`, ref[`f${p}`]])), 'f')
    compare('fr', v, 'subjonctif', sj, ref && Object.fromEntries(P.map((p) => [`s${p}`, ref[`s${p}`]])), 's')
    compare('fr', v, 'conditionnel', c, ref && Object.fromEntries(P.map((p) => [`c${p}`, ref[`c${p}`]])), 'c')
    if (ref?.pp && ref.pp !== k[0]) {
      differences++
      if (differences <= 100000) console.log(`fr ${v} participe: ours ${k[0]} | unimorph ${ref.pp}`)
    }
  } catch {
    // A verb the library can't conjugate is left out.
  }
}
writeFileSync('src/data/tenses/fr.json', JSON.stringify(Object.fromEntries(Object.entries(fr).map(([v, e]) => [v, { i: pack(e.i, ENDINGS.frI), f: pack(e.f, ENDINGS.frF), s: pack(e.s, ENDINGS.frS), pp: e.pp[1] === `${e.pp[0]}s` ? e.pp[0] : e.pp, aux: e.aux }]))))
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

// Spanish UniMorph puts the aspect before the person (V;IND;PST;PFV;1;SG), French after it.
const esRef = unimorph('spa', {
  ...Object.fromEntries(PERS.map((p, i) => [`V;IND;PST;PFV;${p}`, `pre${i}`])),
  ...Object.fromEntries(PERS.map((p, i) => [`V;IND;PST;IPFV;${p}`, `imp${i}`])),
  ...Object.fromEntries(PERS.map((p, i) => [`V;IND;FUT;${p}`, `fut${i}`])),
  'V;V.PTCP;PST;MASC;SG': 'pp',
})
for (const line of readFileSync(`${unimorphDir}/spa`, 'utf8').split('\n')) {
  const [lemma, form, feats] = line.split('\t')
  const tag = { 'V;IND;PST;PFV;2;SG;INFM': 'pre1', 'V;IND;PST;IPFV;2;SG;INFM': 'imp1', 'V;IND;FUT;2;SG;INFM': 'fut1', 'V;SBJV;PRS;2;SG;INFM': 'sub1' }[feats as string]
  const sub = { 'V;SBJV;PRS;1;SG': 'sub0', 'V;SBJV;PRS;3;SG': 'sub2', 'V;SBJV;PRS;1;PL': 'sub3', 'V;SBJV;PRS;2;PL': 'sub4', 'V;SBJV;PRS;3;PL': 'sub5' }[feats as string]
  if (!tag && !sub) continue
  const m = esRef.get(lemma) ?? {}
  // The first 2nd-person form is the tú form; the second, where there is one, is voseo (hablés).
  if (sub || tag === 'sub1') m[(sub ?? tag)!] ??= form
  else m[tag!] = form
  esRef.set(lemma, m)
}

// Fred Jehle's database: "infinitive",…,"mood",…,"tense",…,forms 1s–3p,…,"pastparticiple".
const jehle = new Map<string, Partial<Record<Key | 'pp', string[] | string>>>()
const JT: Record<string, Key> = { 'Pretérito': 'pre', Imperfecto: 'imp', Futuro: 'fut' }
const jehleSub = new Map<string, string[]>()
for (const line of readFileSync(`${unimorphDir}/jehle_verb_database.csv`, 'utf8').split('\n').slice(1)) {
  const c = line.match(/"([^"]*)"/g)?.map((x) => x.slice(1, -1))
  if (c?.[2] === 'Subjuntivo' && c[4] === 'Presente' && c.slice(7, 13).every((f) => f && !/ /.test(f))) jehleSub.set(c[0], c.slice(7, 13))
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
// diloloji's list has typos and stray foreign words; the frequency list is too short to vouch for rare but
// real verbs (madrugar, edificar), so these are listed by hand.
const NOT_SPANISH = new Set(['acelgar', 'antender', 'apovar', 'bronquear', 'bronzear', 'consoladar', 'contraatar', 'cordializar', 'electrolyzer', 'enlargar', 'supervisionar'])
addConjugations('es', readFileSync('src/data/conjugation/es.txt', 'utf8'))
const candidates = [...new Set([...[...esRef.keys()].filter((v) => (freq.get(v) ?? Infinity) <= 40000), ...dilolojiVerbs.filter((v) => !NOT_SPANISH.has(v)), ...jehle.keys()])]
  .filter((v) => /^[a-zñáéíóú]*(ar|er|ir|ír)$/.test(v))
  .sort()

const IRREGULAR_FUTURE = ['caber', 'haber', 'poder', 'querer', 'saber', 'poner', 'salir', 'tener', 'valer', 'venir', 'decir', 'hacer']
const IRREGULAR_PP = ['cubrir', 'scribir', 'solver', 'volver', 'poner', 'hacer', 'decir', 'ver', 'romper', 'morir', 'abrir', 'freír', 'imprimir', 'proveer']
const FAMILY_BASE = ['tener', 'poner', 'venir', 'hacer', 'decir', 'salir', 'valer', 'cubrir', 'scribir', 'solver', 'volver', 'traer', 'caer', 'ducir', 'leer', 'creer', 'seer', 'ver', 'oír', 'seguir', 'servir', 'pedir', 'vestir', 'sentir', 'ferir', 'vertir', 'dormir']
/** Set after reading the agreement printed below. */
const LIBRARY_SUB_OK = false
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

/*
 * Pass 3: the regular -er/-ir indefinido (absorbí, absorbió…) for what is still unvouched, but only
 * outside every class that breaks it: strong stems (tuve), -ducir, vowel stems (leyó, construyó),
 * -ñir/-llir (ciñó), and -ir verbs whose present changes the stem (pido → pidió). The rule is first
 * checked against every verb Jehle or UniMorph vouch for; it is used only if it never disagrees.
 */
const STRONG = ['tener', 'estar', 'poder', 'poner', 'saber', 'hacer', 'querer', 'venir', 'decir', 'traer', 'haber', 'caber', 'andar', 'ducir', 'facer']
// Matched whole: as endings they would catch every -ir verb.
const STRONG_EXACT = ['ser', 'ir', 'dar', 'ver']
const BREAKS = ['eer', 'aer', 'uir', 'oír', 'ñir', 'llir', 'güir', 'ñer', 'ller', 'reír', 'eír']
const PRE_ER_IR = ['í', 'iste', 'ió', 'imos', 'isteis', 'ieron']
function regularPreterite(v: string): Six | null {
  if (!/(er|ir)$/.test(v) || STRONG_EXACT.includes(v) || endsWith(v, STRONG) || endsWith(v, BREAKS)) return null
  const stem = v.slice(0, -2)
  if (v.endsWith('ir')) {
    // No stem change in the present (pido would mean pidió) — or, with no present at hand, a stem
    // whose last vowel is a, i or u: only e and o change (pedir, dormir). The u of gu/qu is silent.
    const yo = conjugate({ language: 'es', lemma: v, partOfSpeech: 'verb' })?.forms[0]
    const vowels = stem.replace(/([gq])u(?=[eiéí])/g, '$1').replace(/[^aeiouáéíóú]/g, '')
    if (yo ? yo !== `${stem}o` : !/[aiuáíú]$/.test(vowels)) return null
  }
  return PRE_ER_IR.map((e) => stem + e) as Six
}
let ruleChecked = 0
let ruleWrong = 0
for (const v of Object.keys(es)) {
  const r = regularPreterite(v)
  const auth = (jehle.get(v)?.pre as string[] | undefined) ?? (P.every((p) => esRef.get(v)?.[`pre${p}`]) ? P.map((p) => esRef.get(v)![`pre${p}`]) : undefined)
  // A defective row (doler: only third persons, the columns shifted) is no reference.
  if (!r || !auth || !/[óo]$/.test(auth[2]) || !auth[5].endsWith('ron')) continue
  ruleChecked++
  if (r.some((f, i) => f !== auth[i])) {
    ruleWrong++
    console.log(`es ${v} regular preterite rule: ${r.join(' ')} | authority ${auth.join(' ')}`)
  }
}
console.log(`regular preterite rule: ${ruleChecked - ruleWrong}/${ruleChecked} agree`)
let byRule = 0
if (ruleWrong === 0) {
  for (const v of Object.keys(es)) {
    if (vouched[v].pre) continue
    const r = regularPreterite(v)
    if (r) {
      es[v].pre = r
      vouched[v].pre = true
      byRule++
    }
  }
}
console.log(`regular preterite rule filled ${byRule} verbs`)

const droppedList: string[] = []
for (const v of Object.keys(es)) {
  if (!Object.values(vouched[v]).every(Boolean)) {
    droppedList.push(`${v}\t${Object.entries(vouched[v]).filter(([, ok]) => !ok).map(([k]) => k).join(',')}`)
    delete es[v]
    dropped++
  }
}
if (process.env.DROPPED) writeFileSync(process.env.DROPPED, droppedList.join('\n'))

/*
 * Presente de subjuntivo, kept apart: a verb without a vouched subjunctive keeps its other tenses.
 * Same order of trust; the library is used only where it agreed with every authority (measured
 * below: printed as "library agreement").
 */
const sub: Record<string, Six> = {}
const libSub = (v: string) => {
  try {
    const f = P.map((p) => esConj(v, 'SUBJUNCTIVE_PRESENT', p)) as Six
    return f.some((x) => !x || / |undefined/.test(x)) ? null : f
  } catch {
    return null
  }
}
const classOf = (v: string) => (/(car|gar|zar|guar|cer|cir|ger|gir|guir|uir|iar|uar)$/.test(v) ? 'spelling' : v.slice(-2))
const agree: Record<string, [number, number]> = {}
const subVouched = new Set<string>()
for (const v of Object.keys(es)) {
  const u = esRef.get(v)
  const fromU = P.map((p) => u?.[`sub${p}`])
  const authority = jehleSub.get(v) ?? (fromU.every(Boolean) ? (fromU as string[]) : undefined)
  const lib = libSub(v)
  if (authority && lib) {
    const k = classOf(v)
    agree[k] ??= [0, 0]
    agree[k][1]++
    if (lib.every((f, i) => f === authority[i])) agree[k][0]++
    else if (Math.random() < 0.05) console.log(`es ${v} subjuntivo: library ${lib.join(' ')} | authority ${authority.join(' ')}`)
  }
  if (authority) {
    sub[v] = [...authority] as Six
    subVouched.add(v)
  }
  const patch = overrides[v]?.['Subjuntivo Presente']
  if (patch && sub[v]) for (const [person, form] of Object.entries(patch)) if (PERSON_KEY[person] !== undefined) sub[v][PERSON_KEY[person]] = form
}
console.log('library agreement (subjuntivo):', JSON.stringify(agree))
// The family's base verb, then the library for plain -ar verbs (where it agrees with the authorities).
for (const v of Object.keys(es)) {
  if (subVouched.has(v)) continue
  const base = NOT_IN_FAMILY.has(v) ? undefined : FAMILY_BASE.filter((b) => v !== b && v.endsWith(b) && subVouched.has(b)).sort((a, b) => b.length - a.length)[0]
  if (base) {
    sub[v] = sub[base].map((f) => v.slice(0, -base.length) + f) as Six
    subVouched.add(v)
    continue
  }
  const lib = libSub(v)
  if (lib && classOf(v) === 'ar' && LIBRARY_SUB_OK) {
    sub[v] = lib
    subVouched.add(v)
  }
}
/*
 * Then the regular subjunctive (adjunte, conceda), built from the present tense of our own conjugation
 * engine, and only where that present is plain: yo = stem + o, él = stem + a/e, nosotros regular. A
 * stem or spelling change in yo (venzo, conozco, pienso) rules it out. Checked first against every verb
 * the authorities vouch for, split by whether the present came from the dictionary or the rule; used
 * only if it never disagrees.
 */
function regularSubjunctive(v: string): { forms: Six; source: string } | null {
  if (!/(ar|er|ir)$/.test(v) || STRONG_EXACT.includes(v)) return null
  const c = conjugate({ language: 'es', lemma: v, partOfSpeech: 'verb' })
  if (!c) return null
  const stem = v.slice(0, -2)
  const ar = v.endsWith('ar')
  const we = ar ? 'amos' : v.endsWith('er') ? 'emos' : 'imos'
  if (c.forms[0] !== `${stem}o` || c.forms[2] !== `${stem}${ar ? 'a' : 'e'}` || c.forms[3] !== `${stem}${we}`) return null
  // hablar → hable; buscar → busque, pagar → pague, cruzar → cruce, averiguar → averigüe.
  const base = ar ? stem.replace(/gu$/, 'gü').replace(/c$/, 'qu').replace(/g$/, 'gu').replace(/z$/, 'c') : stem
  const ends = ar ? ['e', 'es', 'e', 'emos', 'éis', 'en'] : ['a', 'as', 'a', 'amos', 'áis', 'an']
  return { forms: ends.map((e) => base + e) as Six, source: c.source }
}
const subRule: Record<string, [number, number]> = {}
for (const v of Object.keys(es)) {
  const r = regularSubjunctive(v)
  const u = esRef.get(v)
  const fromU = P.map((p) => u?.[`sub${p}`])
  const auth = jehleSub.get(v) ?? (fromU.every(Boolean) ? (fromU as string[]) : undefined)
  // A defective row (ocurrir: only third persons, the columns shifted) is no reference.
  if (!r || !auth || !auth[1].endsWith('s') || !auth[5].endsWith('n')) continue
  subRule[r.source] ??= [0, 0]
  subRule[r.source][1]++
  if (r.forms.every((f, i) => f === auth[i])) subRule[r.source][0]++
  else console.log(`es ${v} regular subjunctive rule (${r.source}): ${r.forms.join(' ')} | authority ${auth.join(' ')}`)
}
console.log('regular subjunctive rule agreement:', JSON.stringify(subRule))
let bySubRule = 0
if (Object.values(subRule).every(([ok, n]) => ok === n)) {
  for (const v of Object.keys(es)) {
    const r = !subVouched.has(v) && regularSubjunctive(v)
    if (r) {
      sub[v] = r.forms
      subVouched.add(v)
      bySubRule++
    }
  }
}
console.log(`regular subjunctive rule filled ${bySubRule} verbs`)
console.log(`es subjuntivo: ${subVouched.size} of ${Object.keys(es).length} verbs`)
if (process.env.NO_SUB) writeFileSync(process.env.NO_SUB, Object.keys(es).filter((v) => !subVouched.has(v)).join('\n'))
writeFileSync('src/data/tenses/es.json', JSON.stringify(Object.fromEntries(Object.entries(es).map(([v, e]) => [v, { pre: e.pre, imp: pack(e.imp, e.imp[0].endsWith('aba') ? ENDINGS.esImpAr : ENDINGS.esImpErIr), fut: pack(e.fut, ENDINGS.esFut), pp: e.pp, ...(sub[v] ? { sub: pack(sub[v], v.endsWith('ar') ? ENDINGS.esSubAr : ENDINGS.esSubErIr) } : {}) }]))))
console.log(`es: ${Object.keys(es).length} verbs (Jehle ${byJehle}, UniMorph ${byUnimorph}, base verb ${byFamily}, overrides ${byOverride}; ${dropped} left out, not vouched for)`)
