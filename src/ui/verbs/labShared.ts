import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { db } from '../../data/instance'
import { loadFrequency } from '../../data/frequency'
import { adoptCards, dueItems, emptyLab, weakestCell, type LabData } from '../../engine/labProgress'
import type { Scheduler } from '../../engine/scheduler'
import { TENSE_GUIDE } from '../../engine/tenseGuide'
import { LAB_TENSES, subjectLabel, tenseVerbs, type Tense } from '../../engine/tenses'
import { verbLevels, type Level } from '../../engine/verbLab'
import type { TargetLanguage, VocabularyEntry } from '../../engine/types'

export type LabLanguage = 'fr' | 'es'

/** The tenses by mood, the way a grammar lists them: the indicative, the conditional, the subjunctive. */
export const MOODS: Record<LabLanguage, { label: string; tenses: Tense[] }[]> = {
  fr: [
    { label: 'Haber kipi (Indicatif)', tenses: ['present', 'imparfait', 'passe-compose', 'passe-simple', 'plus-que-parfait', 'futur', 'futur-anterieur'] },
    { label: 'Şart kipi (Conditionnel)', tenses: ['conditionnel', 'conditionnel-passe'] },
    { label: 'Dilek kipi (Subjonctif)', tenses: ['subjonctif', 'subjonctif-passe'] },
    { label: 'Emir kipi (Impératif)', tenses: ['imperatif'] },
  ],
  es: [
    { label: 'Haber kipi (Indicativo)', tenses: ['presente', 'imperfecto', 'preterito', 'perfecto', 'pluscuamperfecto', 'futuro', 'futuro-perfecto'] },
    { label: 'Şart kipi (Condicional)', tenses: ['condicional', 'condicional-perfecto'] },
    { label: 'Dilek kipi (Subjuntivo)', tenses: ['subjuntivo', 'subjuntivo-imperfecto', 'subjuntivo-perfecto', 'subjuntivo-pluscuamperfecto'] },
    { label: 'Emir kipi (Imperativo)', tenses: ['imperativo'] },
  ],
}

export const PRESENT: Record<LabLanguage, Tense> = { fr: 'present', es: 'presente' }

/** The four tenses an A1–B1 learner needs first: mastery is counted on these, the rest shown apart. */
export const CORE_TENSES: Record<LabLanguage, Tense[]> = {
  fr: ['present', 'passe-compose', 'imparfait', 'futur'],
  es: ['presente', 'preterito', 'imperfecto', 'futuro'],
}

/** Whether the tense is one of the lab's for the language (a restored tense from the other one is not). */
export const isLabTense = (language: LabLanguage, t: string): t is Tense => (LAB_TENSES[language] as string[]).includes(t)

/** Tense names are French and Spanish words: no Turkish capital İ (Imparfait, not İmparfait). */
const upper = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)
/** "Pretérito indefinido": the name the language gives, first letter up. */
export const tenseName = (t: Tense) => upper(TENSE_GUIDE[t].name)

/** The dictionary key of a verb as written in a word list: no reflexive pronoun, lower case. */
export const verbKey = (language: LabLanguage, lemma: string) => lemma.trim().toLocaleLowerCase(language).replace(language === 'fr' ? /^(se |s['’])/ : /se$/, '')

export const verbEntry = (language: LabLanguage, verb: string) => ({ language, lemma: verb, partOfSpeech: 'verb' as const })

/** The learner's own verb entry, by its infinitive without a reflexive pronoun. */
export function ownEntry(vocabulary: readonly VocabularyEntry[], language: LabLanguage, verb: string): VocabularyEntry | undefined {
  return vocabulary.find((v) => v.partOfSpeech === 'verb' && verbKey(language, v.lemma) === verb)
}

/** The lab's saved data (favourites, recent verbs, practice), with a setter that saves as it updates. */
export function useLab(language: LabLanguage, scheduler: Scheduler) {
  const [lab, setLab] = useState<LabData>(emptyLab)
  const [ready, setReady] = useState(false)
  const ref = useRef<LabData>(lab)
  useEffect(() => {
    let live = true
    setReady(false)
    void db.getLab(language).then((saved) => {
      if (!live) return
      // Records from before the review queue existed get a card.
      const l = adoptCards(saved, scheduler, new Date())
      ref.current = l
      setLab(l)
      setReady(true)
    })
    return () => {
      live = false
    }
  }, [language, scheduler])
  const update = useCallback(
    (change: (l: LabData) => LabData) => {
      ref.current = change(ref.current)
      setLab(ref.current)
      void db.saveLab(language, ref.current)
    },
    [language],
  )
  return { lab, update, ready }
}

/** Verb frequency and the levels built from it, loaded once per language. */
export function useVerbLevels(language: LabLanguage, tablesReady: boolean) {
  const [frequency, setFrequency] = useState<ReadonlyMap<string, number>>(new Map())
  useEffect(() => {
    let live = true
    void loadFrequency(language as TargetLanguage).then((f) => live && setFrequency(f))
    return () => {
      live = false
    }
  }, [language])
  const levels = useMemo<Map<string, Level>>(() => (tablesReady ? verbLevels(language, frequency) : new Map()), [language, frequency, tablesReady])
  /** Verbs of the tables in frequency order. */
  const byFrequency = useMemo(() => {
    const rank = (v: string) => frequency.get(v) ?? Number.MAX_SAFE_INTEGER
    return tablesReady ? tenseVerbs(language).sort((a, b) => rank(a) - rank(b)) : []
  }, [language, frequency, tablesReady])
  return { frequency, levels, byFrequency }
}

export interface Seg {
  text: string
  /** `stem` plain, `ending` the person's ending (tengo → teng|o), `aux` an auxiliary's ending, `pp` a participle's. */
  kind: 'stem' | 'ending' | 'aux' | 'pp'
}

const commonPrefix = (words: readonly string[]) => {
  let n = 0
  while (words.every((w) => w.length > n && w[n] === words[0][n])) n++
  return Math.min(n, ...words.map((w) => w.length - 1))
}

/**
 * Each form cut into the part all six share and the part that tells the person, so the endings can
 * be coloured: com|o, com|es. In a compound form the auxiliary's ending and the participle's are
 * coloured instead: hab|ía com|ido.
 */
export function splitEndings(forms: readonly string[], compound: boolean): Seg[][] {
  const words = forms.map((f) => f.split(' '))
  if (!compound) {
    const cut = commonPrefix(words.map((w) => w[w.length - 1]))
    return words.map((w) => {
      const last = w[w.length - 1]
      const lead = w.slice(0, -1).join(' ')
      return [...(lead ? [{ text: `${lead} `, kind: 'stem' as const }] : []), { text: last.slice(0, cut), kind: 'stem' as const }, { text: last.slice(cut), kind: 'ending' as const }]
    })
  }
  const cut = commonPrefix(words.map((w) => w[w.length - 2]))
  return words.map((w) => {
    const aux = w[w.length - 2]
    const pp = w[w.length - 1]
    const lead = w.slice(0, -2).join(' ')
    const ppCut = /(a|i)dos?$/.test(pp) ? pp.length - 3 : pp.length - 1
    return [
      ...(lead ? [{ text: `${lead} `, kind: 'stem' as const }] : []),
      { text: aux.slice(0, cut), kind: 'stem' as const },
      { text: aux.slice(cut), kind: 'aux' as const },
      { text: ' ', kind: 'stem' as const },
      { text: pp.slice(0, ppCut), kind: 'stem' as const },
      { text: pp.slice(ppCut), kind: 'pp' as const },
    ]
  })
}

/** The verbs every learner needs first, for when the list has few verbs of its own. */
export const COMMON: Record<'fr' | 'es', [string, string][]> = {
  fr: [
    ['être', 'olmak'], ['avoir', 'sahip olmak'], ['aller', 'gitmek'], ['faire', 'yapmak'], ['dire', 'söylemek'], ['pouvoir', '-ebilmek'],
    ['vouloir', 'istemek'], ['savoir', 'bilmek'], ['venir', 'gelmek'], ['devoir', 'zorunda olmak'], ['prendre', 'almak'], ['voir', 'görmek'],
    ['donner', 'vermek'], ['parler', 'konuşmak'], ['mettre', 'koymak'], ['partir', 'ayrılmak'], ['trouver', 'bulmak'], ['croire', 'inanmak'],
    ['finir', 'bitirmek'], ['comprendre', 'anlamak'],
  ],
  es: [
    ['ser', 'olmak'], ['estar', 'bulunmak, olmak'], ['tener', 'sahip olmak'], ['hacer', 'yapmak'], ['ir', 'gitmek'], ['poder', '-ebilmek'],
    ['decir', 'söylemek'], ['dar', 'vermek'], ['ver', 'görmek'], ['saber', 'bilmek'], ['querer', 'istemek'], ['llegar', 'varmak'],
    ['pasar', 'geçmek'], ['poner', 'koymak'], ['salir', 'çıkmak'], ['venir', 'gelmek'], ['hablar', 'konuşmak'], ['comer', 'yemek'],
    ['vivir', 'yaşamak'], ['pedir', 'istemek, rica etmek'],
  ],
}


/** How many verb forms are due for review in a language (0 for English): for the Today screen. Reads again when `key` changes. */
export function useFormsDue(language: TargetLanguage, key: unknown): number {
  const [due, setDue] = useState(0)
  useEffect(() => {
    if (language === 'en') {
      setDue(0)
      return
    }
    let live = true
    void db.getLab(language).then((lab) => live && setDue(dueItems(lab, new Date()).length))
    return () => {
      live = false
    }
  }, [language, key])
  return due
}

/**
 * The lab's weakest spot as a short label ("Présent · nous"), for a warm-up on Today when nothing
 * is due; null when the lab has no slip worth practising.
 */
export function useWarmup(language: TargetLanguage, key: unknown): string | null {
  const [label, setLabel] = useState<string | null>(null)
  useEffect(() => {
    if (language === 'en') {
      setLabel(null)
      return
    }
    let live = true
    void db.getLab(language).then((lab) => {
      // A cell with a few answers first; with less data, any slip is worth a warm-up.
      const cell = weakestCell(lab) ?? weakestCell(lab, 1)
      if (live) setLabel(cell ? `${tenseName(cell.tense)} · ${subjectLabel(language, cell.tense, cell.person).split(' / ')[0]}` : null)
    })
    return () => {
      live = false
    }
  }, [language, key])
  return label
}
