/**
 * The coverage report (docs/ICERIK-FABRIKASI.md §8): docs/veri/icerik-kapsama.md.
 *
 *   npm run content -- coverage
 */
import { loadPlan } from './lib/context'
import { acceptedItems, coverageMarkdown, grammarCells, openJobs, readingCells } from './lib/plan'
import { loadJobs, loadRaw, loadReports, writeFile } from './lib/store'

const reports = loadReports()
const parts = ['# İçerik kapsaması', '', 'Bu dosyayı `npm run content -- coverage` yazar; elle düzenlenmez. Yalnız denetimden geçmiş öğeler sayılır; açık iş emirleri "Planlı" sütunundadır.', '']
for (const lang of ['fr', 'es'] as const) {
  const plan = loadPlan(lang)
  const open = openJobs([...loadJobs(lang, 'reading'), ...loadJobs(lang, 'grammar')], reports)
  const reading = readingCells(plan, acceptedItems(loadRaw(lang, 'reading'), reports), open)
  const grammar = grammarCells(plan, acceptedItems(loadRaw(lang, 'grammar'), reports), open)
  parts.push(coverageMarkdown(lang, plan, reading, grammar), '')
}
writeFile('docs/veri/icerik-kapsama.md', parts.join('\n'))
console.log('wrote docs/veri/icerik-kapsama.md')
