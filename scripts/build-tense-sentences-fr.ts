/**
 * Builds src/data/tenses/fr-sentences.json: one example sentence per French verb and tense, from
 * Tatoeba (CC BY 2.0 FR; human-written sentences, with a Turkish translation when Tatoeba has one).
 * The same check as for Spanish: the sentence must contain exactly one form of the verb, once, and
 * that form must belong to no other tense of the verb (parle is présent and subjonctif). The
 * subjonctif also needs a "que" before it, and a subject pronoun before the verb must match the
 * form's person (Tatoeba has the odd slip, "il la lui ont souillé"). The présent is left to pronoun questions: its forms are
 * too often nouns (porte, livre, ferme).
 *
 * Also builds src/data/tenses/fr-aspect.json: passé composé or imparfait, the choice learners find
 * hardest. Only sentences whose time words call for one of the two (hier, soudain → passé
 * composé; autrefois, tous les jours → imparfait) are used, since without such a cue both are
 * often right. Each item: [verb, tense, sentence with [form], the other tense's form, Turkish, cue].
 *
 * Usage: npx rolldown scripts/build-tense-sentences-fr.ts -o /tmp/f.mjs -p node && node /tmp/f.mjs <tatoeba dir>
 *   (the dir holds fra_sentences.tsv, tur_sentences.tsv and fra-tur_links.tsv from downloads.tatoeba.org)
 */
import { readFileSync, writeFileSync } from 'node:fs'
import fr from '../src/data/tenses/fr.json'
import { addConjugations } from '../src/engine/conjugation'
import { addTenses, conjugateTense, tenseAnswers, TENSES, type Tense } from '../src/engine/tenses'

const [dir] = process.argv.slice(2)
addTenses('fr', fr as Record<string, unknown>)
addConjugations('fr', readFileSync('src/data/conjugation/fr.txt', 'utf8'))

const read = (f: string) => readFileSync(`${dir}/${f}`, 'utf8').split('\n').filter(Boolean).map((l) => l.split('\t'))
const turkish = new Map(read('tur_sentences.tsv').map(([id, , text]) => [id, text]))
const translation = new Map<string, string>()
for (const [f, t] of read('fra-tur_links.tsv')) if (turkish.has(t) && !translation.has(f)) translation.set(f, turkish.get(t)!)

// Every form (with spelling and agreement variants) → the verbs and tenses it belongs to.
const ASKED: Tense[] = TENSES.fr.filter((t) => t !== 'present')
const owners = new Map<string, { verb: string; tense: Tense }[]>()
/** For each verb and tense, the persons each form can stand for. */
const persons = new Map<string, Set<number>>()
const formsOf = new Map<string, Map<Tense, Set<string>>>()
for (const verb of Object.keys(fr)) {
  const entry = { language: 'fr' as const, lemma: verb, partOfSpeech: 'verb' as const }
  const byTense = new Map<Tense, Set<string>>()
  for (const tense of TENSES.fr) {
    const all = new Set([0, 1, 2, 3, 4, 5].flatMap((p) => tenseAnswers(entry, tense, p)))
    for (const p of [0, 1, 2, 3, 4, 5])
      for (const f of tenseAnswers(entry, tense, p)) {
        const key = `${verb}\t${tense}\t${f}`
        persons.set(key, new Set([...(persons.get(key) ?? []), p]))
      }
    if (!all.size) continue
    byTense.set(tense, all)
    for (const f of all) owners.set(f, [...(owners.get(f) ?? []), { verb, tense }])
  }
  formsOf.set(verb, byTense)
}

const SUBJECT: Record<string, number> = { je: 0, j: 0, tu: 1, il: 2, elle: 2, on: 2, ils: 5, elles: 5 }
const OBJECT = new Set(['me', 'm', 'te', 't', 'se', 's', 'le', 'la', 'les', 'l', 'lui', 'leur', 'y', 'en', 'ne', 'n', 'nous', 'vous'])
/** The person of a subject pronoun just before the verb (object pronouns skipped), if there is one. */
function subjectBefore(words: { w: string; start: number }[], start: number): number | undefined {
  let i = words.findIndex((x) => x.start === start) - 1
  let lastNousVous: string | undefined
  while (i >= 0 && OBJECT.has(words[i].w)) {
    if (words[i].w === 'nous' || words[i].w === 'vous') lastNousVous = words[i].w
    i--
  }
  if (i >= 0) return SUBJECT[words[i].w]
  return lastNousVous === 'nous' ? 3 : lastNousVous === 'vous' ? 4 : undefined
}

/**
 * Tatoeba's Turkish translations sometimes change the tense ("J'arrangeais…" → "çözdüm"); a
 * translation is kept only when its verb endings fit the tense, so it doesn't teach the wrong one.
 */
const TR_TENSE: Partial<Record<Tense, RegExp>> = {
  imparfait: /(yor(d|lard)|[aeıiuü]rd[ıiuü]|[aeıiuü]rlard[ıi])/,
  'passe-compose': /([dt][ıiuü](m|n|k|nız|niz|nuz|nüz|lar|ler)?\b|m[ıiuü]ş)/,
  futur: /(acak|ecek|aca[ğk]|ece[ğk])/,
  conditionnel: /(rd[ıiuü]|r m[ıiuü]|r mısın|r misin|bil|s[ae]|meli|malı)/,
}
const fits = (tense: Tense, tr: string) => !TR_TENSE[tense] || TR_TENSE[tense]!.test(tr.toLocaleLowerCase('tr'))

/** Time words that call for one tense; a sentence with words of both is left out. */
const ASPECT_CUES: Partial<Record<Tense, RegExp>> = {
  // Only words that settle it: "souvent", "toujours", "en 1990" or "ce matin" go with either;
  // "une fois que" (once) and "que d'habitude" (than usual) are no cues.
  'passe-compose': /\b(hier|avant-hier|soudain|soudainement|tout à coup|une fois(?! qu)(?!['’])|l'an dernier|l'année dernière|la semaine dernière|le mois dernier|il y a (deux|trois|quelques|\d+) (ans|jours|mois|semaines|heures|minutes))\b/i,
  imparfait: /\b(autrefois|jadis|tous les (jours|matins|soirs|ans|étés|hivers|dimanches|week-ends)|chaque (jour|matin|soir|année|été|semaine)|(?<!que )d'habitude|habituellement|quand j'étais|quand il était|quand elle était|quand nous étions|à l'époque|pendant que|de mon temps)\b/i,
}
/** Where a cue of the tense stands in the sentence, outside the verb itself ("quand j'étais" can't cue étais). */
function cueOutside(re: RegExp, text: string, start: number, end: number): string | undefined {
  for (const m of text.matchAll(new RegExp(re.source, re.flags.includes('g') ? re.flags : `${re.flags}g`))) {
    if (m.index! + m[0].length <= start || m.index! >= end) return m[0]
  }
  return undefined
}
const aspect: [string, Tense, string, string, string, string][] = []
const aspectCount = new Map<string, number>()
const aspectSeen = new Set<string>()

const best = new Map<string, { id: string; text: string; start: number; end: number; score: number }>()
for (const [id, , raw] of read('fra_sentences.tsv')) {
  const text = raw?.trim()
  if (!text) continue
  const words = [...text.matchAll(/[\p{L}]+/gu)].map((m) => ({ w: m[0].toLocaleLowerCase('fr'), start: m.index!, end: m.index! + m[0].length }))
  if (words.length < 4 || words.length > 14) continue
  // Every one- and two-word span that is some verb's form.
  const hits: { verb: string; tense: Tense; form: string; start: number; end: number }[] = []
  for (let i = 0; i < words.length; i++) {
    for (const n of [1, 2]) {
      if (i + n > words.length) continue
      const span = words.slice(i, i + n)
      // A two-word form must be written as two words, not across punctuation.
      if (n === 2 && text.slice(span[0].end, span[1].start) !== ' ') continue
      const form = span.map((x) => x.w).join(' ')
      for (const o of owners.get(form) ?? []) hits.push({ ...o, form, start: span[0].start, end: span[n - 1].end })
    }
  }
  const verbs = new Set(hits.map((h) => h.verb))
  for (const verb of verbs) {
    const mine = hits.filter((h) => h.verb === verb)
    // Longer spans win over their parts ("a été" over "a").
    const top = mine.filter((h) => !mine.some((o) => o !== h && o.end - o.start > h.end - h.start && o.start <= h.start && o.end >= h.end))
    const spans = new Set(top.map((h) => `${h.start}:${h.end}`))
    if (spans.size !== 1) continue
    const tenses = new Set(top.map((h) => h.tense))
    if (tenses.size !== 1) continue
    const h = top[0]
    if (!ASKED.includes(h.tense)) continue
    // A form shared with another verb can't tell which one it is (saurais: savoir, saurer).
    if ((owners.get(h.form) ?? []).some((o) => o.verb !== verb)) continue
    if (h.tense === 'subjonctif' && !/\bqu(e\s|['’])/i.test(text.slice(0, h.start))) continue
    const after = text.slice(h.end).match(/^-(?:t-)?(je|tu|il|elle|on|nous|vous|ils|elles)\b/i)?.[1].toLocaleLowerCase('fr')
    const subject = after ? { je: 0, tu: 1, nous: 3, vous: 4 }[after] ?? SUBJECT[after] : subjectBefore(words, h.start)
    const can = persons.get(`${verb}\t${h.tense}\t${h.form}`)!
    // je/tu/nous/vous forms need their pronoun; without one the word is something else ("Sevrais est…").
    if (subject === undefined && !can.has(2) && !can.has(5)) continue
    // vous also stands for one person (vous êtes allée).
    if (subject !== undefined && !can.has(subject) && !(subject === 4 && can.has(4))) continue
    // Passé composé or imparfait, with a cue for exactly one of them.
    const other: Tense | undefined = h.tense === 'passe-compose' ? 'imparfait' : h.tense === 'imparfait' ? 'passe-compose' : undefined
    const cue = other && !ASPECT_CUES[other]!.test(text) ? cueOutside(ASPECT_CUES[h.tense]!, text, h.start, h.end) : undefined
    const aKey = `${verb}\t${h.tense}`
    if (other && cue && (aspectCount.get(aKey) ?? 0) < 3) {
      const entry = { language: 'fr' as const, lemma: verb, partOfSpeech: 'verb' as const }
      const people = subject !== undefined ? [subject] : [...can]
      const options = new Set(people.map((p) => conjugateTense(entry, other)![p]))
      const alt = [...options][0]
      const before = text.slice(0, h.start)
      const etre = (fr as Record<string, { aux: string }>)[verb].aux === 'e'
      const ok =
        options.size === 1 &&
        // Elision must hold for both forms: j'ai parlé / je parlais can't share one blank.
        !(/['’]$/.test(before) && !/^[aeiouyhéèêâîô]/i.test(alt)) &&
        !(/\b(je|me|te|se|le|la|ne)\s$/i.test(before) && /^[aeiouyhéèêâîô]/i.test(alt)) &&
        // A reflexive or être verb would need agreement and pronouns the blank can't carry.
        !(other === 'passe-compose' && (etre || /\b(me|te|se|nous|vous|m['’]|t['’]|s['’])\s?$/i.test(before)))
      const plain = text.toLocaleLowerCase('fr').replace(/[^\p{L}]+/gu, ' ').trim()
      if (ok && !aspectSeen.has(plain)) {
        aspectSeen.add(plain)
        const tr = translation.get(id) ?? ''
        aspect.push([verb, h.tense, `${before}[${text.slice(h.start, h.end)}]${text.slice(h.end)}`, alt, fits(h.tense, tr) ? tr : '', cue])
        aspectCount.set(aKey, (aspectCount.get(aKey) ?? 0) + 1)
      }
    }
    // Prefer a Turkish translation, then a sentence of about eight words.
    const tr = translation.get(id)
    const score = (tr && fits(h.tense, tr) ? 100 : 0) - Math.abs(words.length - 8)
    const key = `${verb}\t${h.tense}`
    if ((best.get(key)?.score ?? -Infinity) < score) best.set(key, { id, text, start: h.start, end: h.end, score })
  }
}

const out: Record<string, Record<string, string>> = {}
for (const [key, s] of best) {
  const [verb, tense] = key.split('\t')
  const marked = `${s.text.slice(0, s.start)}[${s.text.slice(s.start, s.end)}]${s.text.slice(s.end)}`
  const tr = translation.get(s.id) ?? ''
  ;(out[verb] ??= {})[tense] = `${marked}\t${fits(tense as Tense, tr) ? tr : ''}`
}
writeFileSync('src/data/tenses/fr-sentences.json', JSON.stringify(out))
writeFileSync('src/data/tenses/fr-aspect.json', JSON.stringify(aspect))
console.log(`fr aspect: ${aspect.length} items (${aspect.filter((a) => a[1] === 'imparfait').length} imparfait)`)
const n = best.size
console.log(`fr: ${n} sentences for ${Object.keys(out).length} verbs, ${Object.values(out).flatMap((r) => Object.values(r)).filter((x) => !x.endsWith('\t')).length} with Turkish`)
