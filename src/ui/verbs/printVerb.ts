import { TENSE_GUIDE } from '../../engine/tenseGuide'
import { personsOf, verbParts, withSubject, type Tense } from '../../engine/tenses'
import { labForms } from '../../engine/verbLab'
import type { VocabularyEntry } from '../../engine/types'
import { MOODS, tenseName, type LabLanguage } from './labShared'

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

/**
 * The conjugation of one verb as a clean A4 sheet to print or save as a PDF: every tense the lab has for
 * it, grouped by mood, as boxes that do not split across pages, without the app's screen furniture.
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
  const sections = groups.map((m) => `<h2>${esc(m.label)}</h2><div class="g">${m.tenses.map(box).join('')}</div>`).join('')
  const facts = [
    parts?.infinitive && `Mastar: <b lang="${language}">${esc(parts.infinitive)}</b>`,
    parts?.gerund && `${language === 'fr' ? 'Ulaç' : 'Ulaç'}: <b lang="${language}">${esc(parts.gerund)}</b>`,
    parts?.participle && `Geçmiş ortaç: <b lang="${language}">${esc(parts.participle)}</b>`,
    parts?.auxiliary && `Yardımcı fiil: <b lang="${language}">${esc(parts.auxiliary)}</b>`,
    parts && (parts.irregular ? 'Düzensiz fiil' : 'Kurallı fiil'),
  ].filter(Boolean)
  const mode = [reflexive && 'dönüşlü', negative && 'olumsuz'].filter(Boolean).join(', ')
  const date = (opts.now ?? new Date()).toLocaleDateString('tr-TR')
  return `<!doctype html><html lang="tr"><head><meta charset="utf-8"><title>${esc(verb)} çekimi</title><style>
    @page { size: A4; margin: 14mm 14mm 16mm; }
    * { box-sizing: border-box; }
    body { margin: 0; font: 11pt/1.4 Georgia, 'Times New Roman', serif; color: #111; }
    header { border-bottom: 0.4mm solid #222; padding-bottom: 3mm; margin-bottom: 4mm; }
    h1 { margin: 0; font-size: 24pt; font-weight: 700; }
    .m { font-size: 13pt; color: #444; margin-left: 3mm; font-weight: 400; font-style: italic; }
    .facts { margin: 2mm 0 0; font: 9.5pt system-ui, sans-serif; color: #333; display: flex; flex-wrap: wrap; gap: 1mm 6mm; }
    h2 { font: 700 10pt system-ui, sans-serif; text-transform: uppercase; letter-spacing: 0.06em; color: #444; margin: 5mm 0 2mm; break-after: avoid; }
    .g { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 3mm; }
    .t { border: 0.3mm solid #888; border-radius: 1.5mm; padding: 2.5mm 3mm; break-inside: avoid; }
    .t h3 { margin: 0 0 1.5mm; font-size: 11pt; display: flex; flex-direction: column; border-bottom: 0.2mm solid #bbb; padding-bottom: 1mm; }
    .t h3 small { font: 8pt system-ui, sans-serif; color: #666; font-weight: 400; }
    .t ul { list-style: none; margin: 0; padding: 0; display: grid; gap: 0.6mm; font-size: 10.5pt; }
    footer { margin-top: 6mm; font: 8pt system-ui, sans-serif; color: #777; display: flex; justify-content: space-between; }
    @media screen { body { background: #eee; } main { width: 210mm; margin: 6mm auto; padding: 14mm; background: #fff; box-shadow: 0 1px 6px rgba(0,0,0,.2); } }
  </style></head><body><main><header><h1 lang="${language}">${esc(verb)}${meaning ? `<span class="m">${esc(meaning)}</span>` : ''}</h1><p class="facts">${facts.map((f) => `<span>${f}</span>`).join('')}${mode ? `<span>${esc(mode)} biçim</span>` : ''}</p></header>${sections}<footer><span>Diloloji · Fiil laboratuvarı</span><span>${esc(date)}</span></footer></main></body></html>`
}
