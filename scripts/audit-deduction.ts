import fs from 'fs'
import path from 'path'
import { analyzeText } from '../src/engine/reading'
import { maskPositions, posKey } from '../src/engine/deduction'
import type { TargetLanguage, UserWordState, VocabularyEntry } from '../src/engine/types'

interface TextSample {
  id: string
  title: string
  sourceKind: 'storybook' | 'audiobook' | 'news'
  text: string
}

async function runDeductionAudit() {
  const root = process.cwd()

  const frStorybooks = JSON.parse(fs.readFileSync(path.join(root, 'src/data/storybooks/fr.json'), 'utf8'))
  const esStorybooks = JSON.parse(fs.readFileSync(path.join(root, 'src/data/storybooks/es.json'), 'utf8'))
  const frAudiobooks = JSON.parse(fs.readFileSync(path.join(root, 'src/data/audiobooks/fr.json'), 'utf8'))
  const esAudiobooks = JSON.parse(fs.readFileSync(path.join(root, 'src/data/audiobooks/es.json'), 'utf8'))

  const rfiNewsText = `Bonjour à toutes et à tous et bienvenue dans cette édition du Journal en français facile du vendredi 9 octobre 2026.
Le prix Nobel de la paix a été remis aujourd'hui à la Sud-Africaine Navi Pillay pour son combat en faveur des droits humains et de la justice internationale.
En Mauritanie, le gouvernement présente sa démission collective après un rapport accablant sur des incendies criminels.
À Bruxelles, près de trente mille personnes ont défilé pacifiquement dans les rues pour protester contre les mesures de rigueur budgétaire annoncées par les institutions européennes.
En France, les deux tableaux du peintre impressionniste Auguste Renoir volés sur la Côte d'Azur ont finalement été retrouvés par les enquêteurs de la police judiciaire dans un entrepôt clandestin près de Marseille.`

  const esNewsText = `Buenos días, les informamos sobre las principales noticias internacionales de este viernes en nuestro boletín diario.
La Organización de las Naciones Unidas anunció un nuevo programa de ayuda humanitaria urgente para las comunidades afectadas por las recientes inundaciones en América Central.
En España, el ministerio de sanidad confirmó que los hospitales mantendrán protocolos especiales durante la temporada invernal para prevenir complicaciones respiratorias graves entre la población vulnerable.
Las autoridades económicas advierten que la inflación moderada favorece la recuperación del consumo familiar, aunque persisten tensiones en el mercado laboral y en los precios del transporte público.`

  const samples: Record<TargetLanguage, TextSample[]> = {
    fr: [
      { id: 'sb-fr-1', title: frStorybooks[0].title, sourceKind: 'storybook', text: frStorybooks[0].pages.join('\n\n') },
      { id: 'sb-fr-2', title: frStorybooks[1].title, sourceKind: 'storybook', text: frStorybooks[1].pages.join('\n\n') },
      { id: 'ab-fr-1', title: frAudiobooks[0].title, sourceKind: 'audiobook', text: frAudiobooks[0].text },
      { id: 'ab-fr-2', title: frAudiobooks[1].title, sourceKind: 'audiobook', text: frAudiobooks[1].text },
      { id: 'news-fr', title: 'Journal en français facile (RFI Savoirs)', sourceKind: 'news', text: rfiNewsText },
    ],
    es: [
      { id: 'sb-es-1', title: esStorybooks[0].title, sourceKind: 'storybook', text: esStorybooks[0].pages.join('\n\n') },
      { id: 'sb-es-2', title: esStorybooks[1].title, sourceKind: 'storybook', text: esStorybooks[1].pages.join('\n\n') },
      { id: 'ab-es-1', title: esAudiobooks[0].title, sourceKind: 'audiobook', text: esAudiobooks[0].text },
      { id: 'ab-es-2', title: esAudiobooks[1].title, sourceKind: 'audiobook', text: esAudiobooks[1].text },
      { id: 'news-es', title: 'Boletín de noticias en español', sourceKind: 'news', text: esNewsText },
    ],
    en: [],
  }

  const parseFreq = (file: string) =>
    fs
      .readFileSync(path.join(root, 'src/data/frequency', file), 'utf8')
      .split('\n')
      .map((l) => l.trim())
      .filter((l) => l && !l.startsWith('#'))
      .slice(0, 1000)
      .map((l) => l.split(/\s+/)[0].toLowerCase())

  const frMidKnown = new Set(parseFreq('fr.txt'))
  const esMidKnown = new Set(parseFreq('es.txt'))

  const languages: ('fr' | 'es')[] = ['fr', 'es']
  const reportData: any[] = []

  for (const lang of languages) {
    const midKnown = lang === 'fr' ? frMidKnown : esMidKnown

    for (const sample of samples[lang]) {
      // 1. Zero knowledge scenario
      const analysisZero = analyzeText(sample.text, lang, [], [], new Set())
      const maskedZeroKeys = maskPositions(analysisZero.paragraphs, lang)

      const hiddenZero: { word: string; sentence: string; isProper: boolean }[] = []
      analysisZero.paragraphs.forEach((p, i) => {
        p.forEach((s, j) => {
          s.tokens.forEach((t, k) => {
            if (maskedZeroKeys.has(posKey(i, j, k))) {
              const orig = t.text
              const isCap = /^[A-ZÀ-ÖØ-ß]/.test(orig) && k > 0
              hiddenZero.push({ word: orig, sentence: s.text, isProper: isCap })
            }
          })
        })
      })

      // 2. Mid-level knowledge scenario (Top 1000 words known via known Set)
      const analysisMid = analyzeText(sample.text, lang, [], [], midKnown)
      const maskedMidKeys = maskPositions(analysisMid.paragraphs, lang)

      const hiddenMid: { word: string; sentence: string; isProper: boolean }[] = []
      analysisMid.paragraphs.forEach((p, i) => {
        p.forEach((s, j) => {
          s.tokens.forEach((t, k) => {
            if (maskedMidKeys.has(posKey(i, j, k))) {
              const orig = t.text
              const isCap = /^[A-ZÀ-ÖØ-ß]/.test(orig) && k > 0
              hiddenMid.push({ word: orig, sentence: s.text, isProper: isCap })
            }
          })
        })
      })

      reportData.push({
        lang,
        id: sample.id,
        title: sample.title,
        sourceKind: sample.sourceKind,
        wordCount: sample.text.split(/\s+/).length,
        zero: {
          count: hiddenZero.length,
          hidden: hiddenZero,
        },
        mid: {
          count: hiddenMid.length,
          hidden: hiddenMid,
        },
      })
    }
  }

  fs.writeFileSync(path.join(root, 'scripts/audit-output.json'), JSON.stringify(reportData, null, 2))
  console.log('Saved to scripts/audit-output.json')
}

runDeductionAudit().catch(console.error)
