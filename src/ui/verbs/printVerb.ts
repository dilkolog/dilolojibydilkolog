import { TENSE_GUIDE } from '../../engine/tenseGuide'
import { personsOf, verbParts, withSubject, type Tense } from '../../engine/tenses'
import { labForms } from '../../engine/verbLab'
import type { VocabularyEntry } from '../../engine/types'
import { MOODS, tenseName, type LabLanguage } from './labShared'

import { esc, printBase, printFoot, printOrigin, printPage, printTop } from '../../data/printSheet'
import { LANGUAGE_NAME } from '../labels'

const CSS = `
    h1 { font-family: var(--serif); font-weight: 400; font-size: 26pt; color: var(--text); }
    .m { font: 400 13pt 'Lexend', system-ui, sans-serif; color: var(--ink-soft); margin-left: 3mm; }
    .facts { margin: 2.5mm 0 0; display: flex; flex-wrap: wrap; gap: 1.5mm 5mm; font-size: 9pt; color: var(--ink-soft); }
    .facts b { font-family: var(--serif); font-weight: 400; font-size: 10.5pt; color: var(--ink); }
    .g { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 2.5mm; }
    .t { margin: 0; padding: 2.4mm 3mm; border: 0.25mm solid var(--rule); border-top: 1.1mm solid var(--lang); border-radius: 2.5mm; background: var(--box); break-inside: avoid; }
    .t h3 { margin: 0 0 1.6mm; display: grid; gap: 0.2mm; padding-bottom: 1.2mm; border-bottom: 0.25mm solid var(--rule); font-size: 10.5pt; color: var(--text); }
    .t h3 small { font-size: 7.5pt; font-weight: 400; color: var(--ink-soft); }
    .t ul { list-style: none; margin: 0; padding: 0; display: grid; gap: 0.6mm; font: 400 10.5pt/1.35 var(--serif); }
    @media screen and (max-width: 220mm) { .g { grid-template-columns: 1fr 1fr; } }`

/**
 * The conjugation of one verb as an A4 sheet to print or save as a PDF, in the app's own look (data/printSheet.ts):
 * every tense the lab has for it, grouped by mood, as cards that do not split across pages.
 * What the lab was showing (reflexive, negative) is what is printed.
 */
export function verbSheetHtml(opts: {
  language: LabLanguage
  verb: string
  entry: Pick<VocabularyEntry, 'language' | 'lemma' | 'partOfSpeech'>
  meaning?: string
  available: readonly Tense[]
  reflexive?: boolean
  negative?: boolean
  now?: Date
  origin?: string
}): string {
  const { language, verb, entry, meaning, available, reflexive, negative } = opts
  const parts = verbParts(entry as VocabularyEntry)
  const groups = MOODS[language]
    .map((m) => ({ label: m.label, tenses: m.tenses.filter((t) => available.includes(t)) }))
    .filter((m) => m.tenses.length)
  const box = (tense: Tense) => {
    const forms = labForms(entry as VocabularyEntry, tense, { reflexive, negative })
    if (!forms) return ''
    const rows = personsOf(language, tense)
      .map((p) => (forms[p] ? `<li>${esc(withSubject(language, tense, p, forms[p]))}</li>` : ''))
      .join('')
    return `<section class="t"><h3 lang="${language}">${esc(tenseName(tense))}<small>${esc(TENSE_GUIDE[tense]?.tr ?? '')}</small></h3><ul lang="${language}">${rows}</ul></section>`
  }
  const sections = groups.map((m) => `<section><h2>${esc(m.label)}</h2><div class="g">${m.tenses.map(box).join('')}</div></section>`).join('')
  const facts = [
    parts?.infinitive && `Mastar: <b lang="${language}">${esc(parts.infinitive)}</b>`,
    parts?.gerund && `Ulaç: <b lang="${language}">${esc(parts.gerund)}</b>`,
    parts?.participle && `Geçmiş ortaç: <b lang="${language}">${esc(parts.participle)}</b>`,
    parts?.auxiliary && `Yardımcı fiil: <b lang="${language}">${esc(parts.auxiliary)}</b>`,
  ].filter(Boolean)
  const mode = [reflexive && 'dönüşlü', negative && 'olumsuz'].filter(Boolean).join(', ')
  const date = (opts.now ?? new Date()).toLocaleDateString('tr-TR')
  const origin = opts.origin ?? printOrigin()
  const chips = [LANGUAGE_NAME[language], parts && (parts.irregular ? 'Düzensiz fiil' : 'Kurallı fiil'), mode && `${mode} biçim`].filter((x): x is string => !!x)
  return printPage(
    `${verb} çekimi`,
    printBase(language, origin, { margin: '13mm 13mm 14mm' }) + CSS,
    `<main>${printTop(origin, 'Diloloji · Fiil laboratuvarı', date)}`
      + `<header class="head"><div class="chips">${chips.map((c) => `<span class="chip">${esc(c)}</span>`).join('')}</div><h1 lang="${language}">${esc(verb)}${meaning ? `<span class="m">${esc(meaning)}</span>` : ''}</h1><p class="facts">${facts.map((f) => `<span>${f}</span>`).join('')}</p></header>`
      + sections
      + `${printFoot('diloloji.com', `${LANGUAGE_NAME[language]} · ${verb}`)}</main>`,
  )
}
