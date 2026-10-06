import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { db } from '../../data/instance'
import { loadFrequency } from '../../data/frequency'
import { emptyLab, type LabData } from '../../engine/labProgress'
import { TENSE_GUIDE } from '../../engine/tenseGuide'
import { LAB_TENSES, tenseVerbs, type Tense } from '../../engine/tenses'
import { verbLevels, type Level } from '../../engine/verbLab'
import type { TargetLanguage, VocabularyEntry } from '../../engine/types'

export type LabLanguage = 'fr' | 'es'

/** The tenses by mood, the way a grammar lists them: the indicative, the conditional, the subjunctive. */
export const MOODS: Record<LabLanguage, { label: string; tenses: Tense[] }[]> = {
  fr: [
    { label: 'Haber kipi (Indicatif)', tenses: ['present', 'imparfait', 'passe-compose', 'plus-que-parfait', 'futur', 'futur-anterieur'] },
    { label: 'Şart kipi (Conditionnel)', tenses: ['conditionnel', 'conditionnel-passe'] },
    { label: 'Dilek kipi (Subjonctif)', tenses: ['subjonctif', 'subjonctif-passe'] },
  ],
  es: [
    { label: 'Haber kipi (Indicativo)', tenses: ['presente', 'imperfecto', 'preterito', 'perfecto', 'pluscuamperfecto', 'futuro', 'futuro-perfecto'] },
    { label: 'Şart kipi (Condicional)', tenses: ['condicional', 'condicional-perfecto'] },
    { label: 'Dilek kipi (Subjuntivo)', tenses: ['subjuntivo', 'subjuntivo-imperfecto', 'subjuntivo-perfecto', 'subjuntivo-pluscuamperfecto'] },
  ],
}

export const PRESENT: Record<LabLanguage, Tense> = { fr: 'present', es: 'presente' }

/** Whether the tense is one of the lab's for the language (a restored tense from the other one is not). */
export const isLabTense = (language: LabLanguage, t: string): t is Tense => (LAB_TENSES[language] as string[]).includes(t)

const upper = (s: string) => s.charAt(0).toLocaleUpperCase('tr') + s.slice(1)
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
export function useLab(language: LabLanguage) {
  const [lab, setLab] = useState<LabData>(emptyLab)
  const [ready, setReady] = useState(false)
  const ref = useRef<LabData>(lab)
  useEffect(() => {
    let live = true
    setReady(false)
    void db.getLab(language).then((l) => {
      if (!live) return
      ref.current = l
      setLab(l)
      setReady(true)
    })
    return () => {
      live = false
    }
  }, [language])
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
