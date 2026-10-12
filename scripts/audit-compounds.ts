import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { loadTenses } from '../src/data/tenseData'
import { analyzeText } from '../src/engine/reading'
import { textForms } from '../src/engine/textForms'
import { extractArticle, FEEDS, parseFeed } from '../src/engine/news'

interface StorybookItem {
  id: string
  title: string
  pages: string[]
  language: 'fr' | 'es'
}

interface AudiobookItem {
  id: string
  title: string
  author: string
  text: string
  language: 'fr' | 'es'
}

interface AuditDoc {
  id: string
  title: string
  source: string
  language: 'fr' | 'es'
  text: string
}

async function fetchNewsSample(feedId: string): Promise<{ title: string; text: string }> {
  const feed = FEEDS.find((f) => f.id === feedId)
  if (!feed) throw new Error(`Feed not found: ${feedId}`)
  const res = await fetch(feed.url, {
    headers: { 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)' },
  })
  const xml = await res.text()
  const items = parseFeed(xml)
  for (const it of items.slice(0, 3)) {
    try {
      const artRes = await fetch(it.link, {
        headers: { 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)' },
      })
      if (!artRes.ok) continue
      const html = await artRes.text()
      const extracted = extractArticle(html)
      if (extracted.split(/\s+/).length >= 80) {
        return { title: it.title, text: extracted }
      }
    } catch {
      // try next item
    }
  }
  return { title: items[0]?.title ?? 'News sample', text: items[0]?.description ?? '' }
}

async function run() {
  console.log('Loading tense tables...')
  await loadTenses('fr')
  await loadTenses('es')

  const root = process.cwd()
  const storyFr: StorybookItem[] = JSON.parse(readFileSync(join(root, 'src/data/storybooks/fr.json'), 'utf-8'))
  const storyEs: StorybookItem[] = JSON.parse(readFileSync(join(root, 'src/data/storybooks/es.json'), 'utf-8'))
  const audioFr: AudiobookItem[] = JSON.parse(readFileSync(join(root, 'src/data/audiobooks/fr.json'), 'utf-8'))
  const audioEs: AudiobookItem[] = JSON.parse(readFileSync(join(root, 'src/data/audiobooks/es.json'), 'utf-8'))

  console.log('Fetching news samples...')
  let newsFr: { title: string; text: string }
  let newsEs: { title: string; text: string }
  try {
    newsFr = await fetchNewsSample('rfi-facile')
  } catch (e) {
    console.warn('Could not fetch RFI, using fallback text:', e)
    newsFr = {
      title: 'RFI Facile Échantillon',
      text: "Le président a annoncé hier de nouvelles mesures économiques. Il a déclaré que le gouvernement avait pris toutes les dispositions nécessaires. Les ministres sont arrivés tôt ce matin pour discuter des réformes qui ont été adoptées.",
    }
  }

  try {
    newsEs = await fetchNewsSample('voa-es-news')
  } catch (e) {
    console.warn('Could not fetch VOA ES News, using fallback text:', e)
    newsEs = {
      title: 'VOA Español Muestra',
      text: "El presidente ha anunciado hoy nuevas medidas comerciales. Las autoridades han confirmado que habían negociado varios acuerdos previos. Muchos ciudadanos han expresado su preocupación por los cambios que se han producido.",
    }
  }

  const frenchDocs: AuditDoc[] = [
    { id: storyFr[11].id, title: storyFr[11].title, source: 'Storybooks (Punition)', language: 'fr', text: storyFr[11].pages.join('\n\n') },
    { id: storyFr[13].id, title: storyFr[13].title, source: 'Storybooks (La décision)', language: 'fr', text: storyFr[13].pages.join('\n\n') },
    { id: audioFr[0].id, title: audioFr[0].title, source: `Audiobooks (${audioFr[0].author})`, language: 'fr', text: audioFr[0].text },
    { id: audioFr[1].id, title: audioFr[1].title, source: `Audiobooks (${audioFr[1].author})`, language: 'fr', text: audioFr[1].text },
    { id: 'news-rfi', title: newsFr.title, source: 'RFI Le journal en français facile', language: 'fr', text: newsFr.text },
  ]

  const spanishDocs: AuditDoc[] = [
    { id: storyEs[11].id, title: storyEs[11].title, source: 'Storybooks (Castigo)', language: 'es', text: storyEs[11].pages.join('\n\n') },
    { id: storyEs[13].id, title: storyEs[13].title, source: 'Storybooks (La decisión)', language: 'es', text: storyEs[13].pages.join('\n\n') },
    { id: audioEs[0].id, title: audioEs[0].title, source: `Audiobooks (${audioEs[0].author})`, language: 'es', text: audioEs[0].text },
    { id: audioEs[1].id, title: audioEs[1].title, source: `Audiobooks (${audioEs[1].author})`, language: 'es', text: audioEs[1].text },
    { id: 'news-voa-es', title: newsEs.title, source: 'VOA Noticias en español', language: 'es', text: newsEs.text },
  ]

  const allDocs = [...frenchDocs, ...spanishDocs]

  interface ResultEntry {
    docId: string
    docTitle: string
    language: 'fr' | 'es'
    sentenceIdx: number
    sentenceText: string
    detectedForm: string
    lemma: string
    tense: string
  }

  const detectedResults: ResultEntry[] = []

  for (const doc of allDocs) {
    const analysis = analyzeText(doc.text, doc.language, [], [], new Set(), new Set())
    const forms = textForms(doc.language, analysis)

    // Collect flat sentences
    const flatSentences: string[] = []
    for (const p of analysis.paragraphs) {
      for (const s of p) flatSentences.push(s.text)
    }

    // Compounds are recognized by having a space in form
    const compounds = forms.filter((f) => f.form.includes(' '))

    for (const c of compounds) {
      detectedResults.push({
        docId: doc.id,
        docTitle: doc.title,
        language: doc.language,
        sentenceIdx: c.sentence,
        sentenceText: flatSentences[c.sentence] ?? '',
        detectedForm: c.form,
        lemma: c.lemma,
        tense: c.tense,
      })
    }
  }

  console.log(`\n=== AUDIT RESULTS SUMMARY ===`)
  console.log(`Total documents scanned: ${allDocs.length} (5 FR, 5 ES)`)
  console.log(`Total compound detections: ${detectedResults.length}`)

  const frDetections = detectedResults.filter((r) => r.language === 'fr')
  const esDetections = detectedResults.filter((r) => r.language === 'es')
  console.log(`French compound detections: ${frDetections.length}`)
  console.log(`Spanish compound detections: ${esDetections.length}`)

  console.log('\n--- French Tense Breakdown ---')
  const frTenses = new Map<string, number>()
  for (const r of frDetections) frTenses.set(r.tense, (frTenses.get(r.tense) ?? 0) + 1)
  for (const [t, n] of frTenses.entries()) console.log(`  ${t}: ${n}`)

  console.log('\n--- Spanish Tense Breakdown ---')
  const esTenses = new Map<string, number>()
  for (const r of esDetections) esTenses.set(r.tense, (esTenses.get(r.tense) ?? 0) + 1)
  for (const [t, n] of esTenses.entries()) console.log(`  ${t}: ${n}`)

  console.log('\n--- Detailed Detections List (Sample 40) ---')
  for (const r of detectedResults.slice(0, 40)) {
    console.log(`[${r.language.toUpperCase()}] "${r.detectedForm}" -> ${r.lemma} (${r.tense}) | In: "${r.sentenceText.slice(0, 80)}..."`)
  }

  // Write full raw results to a scratch file so we can inspect all of them
  const outputPath = join(root, 'scripts/audit-compounds-output.json')
  const { writeFileSync } = await import('node:fs')
  writeFileSync(outputPath, JSON.stringify(detectedResults, null, 2), 'utf-8')
  console.log(`\nFull detailed detection list written to ${outputPath}`)
}

run().catch((e) => {
  console.error(e)
  process.exit(1)
})
