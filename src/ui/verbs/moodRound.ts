import { createRng, shuffle } from '../../engine/rng'
import { conjugateTense, onlyReflexive, subjectLabel, verbParts, type Tense } from '../../engine/tenses'
import { verbEntry, type LabLanguage } from './labShared'

/**
 * Choices the tables alone don't teach: after which words the subjunctive comes (il faut que,
 * ojalá, no creo que…) and, in French, whether a verb makes its passé composé with être or avoir.
 * The forms offered are the verb's own, so the choice is between two real words.
 */
interface Trigger {
  /** The words before the subject; `que` adds "que"/"qu'" (and its elision) after them. */
  text: string
  que: boolean
  mood: 'subj' | 'ind'
  /** Why, in Turkish, shown after the answer. */
  why: string
}

const T = (text: string, mood: 'subj' | 'ind', why: string, que = true): Trigger => ({ text, que, mood, why })

const TRIGGERS: Record<LabLanguage, Trigger[]> = {
  fr: [
    T('Il faut', 'subj', 'Zorunluluk: il faut que + subjonctif.'),
    T('Je veux', 'subj', 'İstek: vouloir que + subjonctif.'),
    T('Bien', 'subj', 'Bien que (-e rağmen) her zaman subjonctif ister.'),
    T('Pour', 'subj', 'Amaç: pour que + subjonctif.'),
    T('Avant', 'subj', 'Avant que + subjonctif.'),
    T('Je ne pense pas', 'subj', 'Olumsuz düşünce, şüphe: subjonctif.'),
    T('Il est possible', 'subj', 'Olasılık: il est possible que + subjonctif.'),
    T('Je doute', 'subj', 'Şüphe: douter que + subjonctif.'),
    T('Je pense', 'ind', 'Olumlu düşünce, kanaat: haber kipi (indicatif).'),
    T('Je sais', 'ind', 'Bilinen bir gerçek: haber kipi.'),
    T('Il est probable', 'ind', 'Kuvvetli olasılık (probable): haber kipi.'),
    T('Parce', 'ind', 'Sebep: parce que + haber kipi.'),
    T('Après', 'ind', 'Après que + haber kipi (olmuş bir şey).'),
  ],
  es: [
    T('Quiero', 'subj', 'İstek: querer que + subjuntivo.'),
    T('Ojalá', 'subj', 'Dilek: ojalá + subjuntivo.'),
    T('Es importante', 'subj', 'Değer yargısı: es importante que + subjuntivo.'),
    T('No creo', 'subj', 'Olumsuz düşünce, şüphe: subjuntivo.'),
    T('Para', 'subj', 'Amaç: para que + subjuntivo.'),
    T('Dudo', 'subj', 'Şüphe: dudar que + subjuntivo.'),
    T('Es posible', 'subj', 'Olasılık: es posible que + subjuntivo.'),
    T('Espero', 'subj', 'Umut: esperar que + subjuntivo.'),
    T('Creo', 'ind', 'Olumlu düşünce, kanaat: haber kipi (indicativo).'),
    T('Sé', 'ind', 'Bilinen bir gerçek: haber kipi.'),
    T('Es verdad', 'ind', 'Doğruluk: es verdad que + haber kipi.'),
    T('Estoy seguro de', 'ind', 'Kesinlik: haber kipi.'),
    T('Porque', 'ind', 'Sebep: porque + haber kipi.', false),
  ],
}

/** French verbs whose passé composé takes être (the "house" verbs and their family). */
const ETRE_VERBS = ['aller', 'venir', 'arriver', 'partir', 'entrer', 'naître', 'mourir', 'rester', 'tomber', 'devenir', 'revenir']
/** Verbs that take être or avoir by meaning (je suis sorti / j'ai sorti la poubelle): no one answer, so not asked. */
const EITHER = ['passer', 'sortir', 'monter', 'descendre', 'rentrer', 'retourner']

export interface MoodQuestion {
  kind: 'mood' | 'aux'
  verb: string
  /** The sentence up to the blank, and after it. */
  before: string
  after: string
  options: string[]
  answer: string
  why: string
}

const PRESENT: Record<LabLanguage, Tense> = { fr: 'present', es: 'presente' }
const SUBJ: Record<LabLanguage, Tense> = { fr: 'subjonctif', es: 'subjuntivo' }

function moodQuestion(language: LabLanguage, verb: string, trigger: Trigger, person: number): MoodQuestion | undefined {
  const entry = verbEntry(language, verb)
  const ind = conjugateTense(entry, PRESENT[language])?.[person]
  const subj = conjugateTense(entry, SUBJ[language])?.[person]
  if (!ind || !subj || ind === subj) return undefined
  // "que tu", "qu'il", "que nosotros": the subjunctive table's own subject; plain for "porque".
  const subject = subjectLabel(language, SUBJ[language], person).split(' / ')[0]
  const before = trigger.que ? `${trigger.text} ${subject}` : `${trigger.text} ${subject.replace(/^que /, '')}`
  return { kind: 'mood', verb, before, after: '', options: [ind, subj], answer: trigger.mood === 'subj' ? subj : ind, why: trigger.why }
}

function auxQuestion(verb: string, person: number): MoodQuestion | undefined {
  // A verb used only reflexively ("se souvenir") always takes être and carries its pronoun: no choice to ask about.
  if (onlyReflexive('fr', verb)) return undefined
  const parts = verbParts(verbEntry('fr', verb))
  const pc = conjugateTense(verbEntry('fr', verb), 'passe-compose')?.[person]
  if (!parts?.participle || !pc) return undefined
  const etre = /^(suis|es|est|sommes|êtes|sont)\b/.test(pc)
  const aux = pc.split(' ')[0]
  const other = (etre ? ['ai', 'as', 'a', 'avons', 'avez', 'ont'] : ['suis', 'es', 'est', 'sommes', 'êtes', 'sont'])[person]
  const subject = subjectLabel('fr', 'present', person).split(' / ')[0]
  return {
    kind: 'aux',
    verb,
    before: `Passé composé: ${subject}`,
    after: pc.slice(aux.length),
    options: [aux, other],
    answer: aux,
    why: etre ? `${verb} passé composé'de être ile kurulur (hareket, durum değişikliği).` : `${verb} passé composé'de avoir ile kurulur, çoğu fiil gibi.`,
  }
}

/** A round: subjunctive-or-not with the learner's and common verbs, and in French some être/avoir. */
export function moodRound(language: LabLanguage, verbs: readonly string[], seed: number, size = 8): MoodQuestion[] {
  const rng = createRng(seed)
  // Not "je" in French: "que je" + a vowel would need "j'", which the blank can't show.
  const persons = language === 'fr' ? [1, 2, 3, 4, 5] : [0, 1, 2, 3, 4, 5]
  const out: MoodQuestion[] = []
  const pool = shuffle([...new Set(verbs)].slice(0, 80), rng)
  const triggers = shuffle(TRIGGERS[language], rng)
  for (let i = 0; i < pool.length && out.length < size; i++) {
    const q = moodQuestion(language, pool[i], triggers[i % triggers.length], persons[Math.floor(rng() * persons.length)])
    if (q) out.push({ ...q, options: shuffle(q.options, rng) })
  }
  if (language === 'fr') {
    const auxVerbs = shuffle([...shuffle(ETRE_VERBS, rng).slice(0, 2), ...pool.filter((v) => !ETRE_VERBS.includes(v) && !EITHER.includes(v)).slice(0, 1)], rng)
    const aux = auxVerbs.map((v) => auxQuestion(v, persons[Math.floor(rng() * persons.length)])).filter((q): q is MoodQuestion => !!q)
    out.splice(Math.min(out.length, size - aux.length), out.length, ...aux.map((q) => ({ ...q, options: shuffle(q.options, rng) })))
  }
  return shuffle(out, rng).slice(0, size)
}
