import { displayForm } from '../engine/exercises'
import { masteryStage } from '../engine/mastery'
import { nextReviewAt } from '../engine/review'
import type { TargetLanguage, UserWordState, VocabularyEntry } from '../engine/types'

/**
 * The word list outside the app: a CSV for spreadsheets and a printable dictionary (the
 * browser's print dialog saves it as PDF).
 */

const STAGE: Record<string, string> = {
  introduced: 'Tohum',
  familiar: 'Filiz',
  recallable: 'Fide',
  strong: 'Genç bitki',
  production_ready: 'Tomurcuk',
  mastered: 'Çiçek',
}
const LANG: Record<TargetLanguage, string> = { en: 'İngilizce', fr: 'Fransızca', es: 'İspanyolca' }

const day = (d?: Date | string) => (d ? new Date(d).toISOString().slice(0, 10) : '')

/** One field: quoted when it holds the separator, a quote or a line break. */
function cell(v: string): string {
  return /[";\n\r]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v
}

/**
 * Semicolon-separated (what Excel expects in Turkish settings; Sheets detects it too), with a
 * byte-order mark so accents open correctly.
 */
export function toCsv(entries: readonly VocabularyEntry[], states: readonly UserWordState[]): string {
  const byId = new Map(states.map((s) => [s.entryId, s]))
  const head = ['Dil', 'Kelime', 'Artikel', 'Tür', 'Anlam', 'Diğer anlamlar', 'Tanım', 'IPA', 'Örnek', 'Örnek çevirisi', 'Kalıplar', 'Etiketler', 'Not', 'Aşama', 'Sıradaki tekrar', 'Eklenme']
  const rows = entries.map((e) => {
    const s = byId.get(e.id)
    const sense = e.senses[0]
    const ex = sense.examples[0]
    return [
      LANG[e.language],
      e.lemma,
      e.article ?? '',
      e.partOfSpeech === 'other' ? '' : e.partOfSpeech,
      sense.gloss,
      (sense.altGlosses ?? []).join(', '),
      sense.definition ?? '',
      e.ipa ?? '',
      ex?.text ?? '',
      ex?.translation ?? '',
      e.collocations.map((c) => (c.translation ? `${c.phrase} = ${c.translation}` : c.phrase)).join(' | '),
      e.tags.join(', '),
      e.notes ?? '',
      s ? STAGE[masteryStage(s)] : 'Başlanmadı',
      s ? day(nextReviewAt(s)) : '',
      day(e.addedAt),
    ]
  })
  return '﻿' + [head, ...rows].map((r) => r.map(cell).join(';')).join('\r\n')
}

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

/** A two-column, alphabetical dictionary page ready to print. */
export function dictionaryHtml(entries: readonly VocabularyEntry[], language: TargetLanguage, title: string): string {
  const sorted = [...entries].sort((a, b) => a.lemma.localeCompare(b.lemma, language))
  let letter = ''
  const body = sorted
    .map((e) => {
      const first = e.lemma.charAt(0).toLocaleUpperCase(language).normalize('NFD').charAt(0)
      const head = first !== letter ? `<h2>${esc((letter = first))}</h2>` : ''
      const sense = e.senses[0]
      const ex = sense.examples[0] ?? e.corpus?.find((x) => x.translation)
      return `${head}<div class="e"><b lang="${language}">${esc(displayForm(e))}</b>${e.ipa ? ` <span class="ipa">${esc(e.ipa)}</span>` : ''} — ${esc([sense.gloss, ...(sense.altGlosses ?? [])].join(', '))}${
        sense.definition ? `<div class="d" lang="${language}">${esc(sense.definition)}</div>` : ''
      }${ex ? `<div class="x" lang="${language}">${esc(ex.text.replace(/\*/g, ''))}${ex.translation ? ` <span>— ${esc(ex.translation)}</span>` : ''}</div>` : ''}</div>`
    })
    .join('')
  return `<!doctype html><html lang="tr"><head><meta charset="utf-8"><title>${esc(title)}</title><style>
    @page { margin: 16mm 14mm; }
    body { font: 10.5pt/1.45 Georgia, 'Times New Roman', serif; color: #111; margin: 0; }
    header { margin-bottom: 8mm; } header h1 { font-size: 20pt; margin: 0; } header p { margin: 2mm 0 0; color: #555; font: 9pt system-ui, sans-serif; }
    main { columns: 2; column-gap: 8mm; }
    h2 { font: 700 13pt system-ui, sans-serif; margin: 4mm 0 1.5mm; border-bottom: 1px solid #999; break-after: avoid; }
    .e { margin: 0 0 2.2mm; break-inside: avoid; }
    .ipa { color: #555; font-family: 'Charis SIL', 'Lucida Sans Unicode', serif; }
    .d { font-style: italic; color: #333; } .x { color: #333; font-size: 9.5pt; } .x span { color: #666; }
    @media screen { body { max-width: 190mm; margin: 10mm auto; padding: 0 6mm; } }
  </style></head><body><header><h1>${esc(title)}</h1><p>${sorted.length} kelime · Kelime Koçu · ${new Date().toLocaleDateString('tr-TR')}</p></header><main>${body}</main></body></html>`
}
