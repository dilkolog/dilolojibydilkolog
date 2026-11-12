/** Reproducible per-text audit of an introductory series, in addition to the regular factory report. */
import { loadContext } from './lib/context'
import { outsideWords, sequenceErrors } from './lib/firstSteps'
import { checkReading, levelFit, topicUses } from './lib/rules'
import { findJob, loadRaw, writeJson, writeFile } from './lib/store'
import { analyzeText } from '../../src/engine/reading'

const job = findJob(process.argv[2] ?? '')
if (!job || job.kind !== 'reading') throw new Error('usage: first-steps <reading-job>')
const ctx = loadContext(job.language)
const items = loadRaw(job.language, 'reading').filter((item) => item.batch === job.id)
const sequences = sequenceErrors(items)
const rows = items.map((item) => {
  const text = item.paragraphs.join('\n\n')
  const analysis = analyzeText(text, job.language, [], [], new Set())
  return {
    id: item.id,
    position: item.firstStep?.position,
    words: analysis.paragraphs.flat().reduce((n, sentence) => n + sentence.tokens.filter((t) => t.key).length, 0),
    levelFit: Number((100 * levelFit(text, item.level, ctx, item.vocabulary.map((v) => v.word)).share).toFixed(2)),
    vocabulary: item.vocabulary,
    outside: outsideWords(item, ctx),
    grammar: item.grammar.map((topic) => ({ topic, uses: topicUses(text, topic, ctx) })),
    errors: [...checkReading(item, ctx).errors, ...(sequences.get(item.id) ?? [])],
  }
})
const base = `content/review/first-steps/${job.language}`
writeJson(`${base}-audit.json`, { job: job.id, rows })
writeFile(`${base}-audit.md`, `# ${job.language.toUpperCase()} ilk adım denetimi\n\nSözcükler fabrika belirteçleriyle sayılır. Seviye uyumu, özel adlar ve hedefler hariç mevcut CEFR ölçümüdür. İlk 300 + başlangıç listesi denetimi özel adları da kapsar; çekimler sözlük/çekim verisiyle, düzenli çoğullar açık kurallarla tanınır. Her yeni hedef sonraki iki metnin **ikisinde de** aranır; son iki metin yeni hedef getirmez.\n\n| Sıra | Kimlik | Kelime | Seviye uyumu | Hedefler |\n|---|---|---:|---:|---|\n${rows.map((r) => `| ${r.position} | ${r.id} | ${r.words} | %${r.levelFit} | ${r.vocabulary.map((v) => v.word).join(', ')} |`).join('\n')}\n\nAyrıntılı hedef-konu kullanım sayıları, izinli listeler dışındaki sözcükler ve hatalar aynı adlı JSON dosyasındadır.\n`)
for (const row of rows) console.log(`${row.position}: ${row.words} words; ${row.levelFit}% fit; ${row.errors.length} errors`)
if (rows.length !== 25 || rows.some((row) => row.errors.length)) process.exitCode = 1
