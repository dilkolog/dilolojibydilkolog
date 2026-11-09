import type { ContentGrammar, ReadingItem } from '../../../src/engine/contentTypes'
import { TOPIC_NAME } from '../../../src/engine/grammar'
import { createRng, shuffle } from '../../../src/engine/rng'
import type { ContentJob } from './types'

/**
 * content/review/<job>.md: a random handful of a batch for a person to read (docs/ICERIK-FABRIKASI.md §5.4).
 * Each item ends with a line to fill in: "tamam" or "hata: …".
 */
export function sampleMarkdown(job: ContentJob, items: readonly (ReadingItem | ContentGrammar)[], n = 10, seed = 1): string {
  const picked = shuffle([...items], createRng(seed)).slice(0, n).sort((a, b) => (a.id < b.id ? -1 : 1))
  const head = [
    `# Örneklem: ${job.id}`,
    '',
    `${job.language === 'fr' ? 'Fransızca' : 'İspanyolca'} · ${job.kind === 'reading' ? 'okuma' : 'dilbilgisi'} · ${job.level} · ${job.grammar.map((t) => TOPIC_NAME[t] ?? t).join(', ')}${job.theme ? ` · ${job.theme} · ${job.genre}` : ''}`,
    '',
    `Partideki ${items.length} öğeden ${picked.length} tanesi. Her öğenin altına **tamam** ya da **hata: …** yaz. Bulunan her hata türü stil rehberine kural olarak eklenir.`,
    '',
  ]
  const body = picked.map((item) => (job.kind === 'reading' ? readingBlock(item as ReadingItem) : grammarBlock(item as ContentGrammar)))
  return [...head, ...body].join('\n')
}

function readingBlock(r: ReadingItem): string {
  const lines = [`## ${r.id} · ${r.title}`, '', `${r.level} · ${r.theme} · ${r.genre} · ${r.grammar.join(', ')}`, '']
  r.paragraphs.forEach((p, i) => lines.push(`> ${p}`, '', `*${r.tr[i]}*`, ''))
  lines.push('**Kelimeler:** ' + r.vocabulary.map((v) => `${v.word} (${v.lemma}) = ${v.tr}`).join(' · '), '', '**Sorular:**', '')
  for (const q of r.questions) lines.push(`- ${q.q}`, ...q.options.map((o, i) => `  ${i === q.answer ? '✓' : '·'} ${o}`), `  *${q.why}*`)
  lines.push('', 'Değerlendirme:', '', '---', '')
  return lines.join('\n')
}

function grammarBlock(g: ContentGrammar): string {
  const lines = [`## ${g.id} · ${g.type} · zorluk ${g.difficulty}${g.subskill ? ` · ${g.subskill}` : ''}`, '', `> ${g.prompt}`, '']
  if (g.hint) lines.push(`**İpucu:** ${g.hint}`, '')
  if (g.options) lines.push(...g.options.map((o) => `- ${o === g.answer ? '✓' : '·'} ${o}`), '')
  lines.push(`**Cevap:** ${g.answer}${g.fix ? ` → ${g.fix}` : ''}${g.alternatives?.length ? ` (ya da ${g.alternatives.join(', ')})` : ''}`, '', `**Kural:** ${g.explanation}`, '', 'Değerlendirme:', '', '---', '')
  return lines.join('\n')
}
