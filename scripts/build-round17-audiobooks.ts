/**
 * Build Round 17 Audiobooks:
 * - 15 new FR chapters (9 Alphonse Daudet 'Lettres de mon moulin' + 6 Voltaire 'Candide')
 * - 15 new ES chapters (9 Horacio Quiroga 'Cuentos de amor' + 6 Gustavo Adolfo Bécquer 'Leyendas')
 * - 17 new EN chapters (5 Oscar Wilde 'Happy Prince' + 12 Lewis Carroll 'Alice in Wonderland')
 */

import { writeFileSync, readFileSync, existsSync, mkdirSync } from 'node:fs'
import { join } from 'node:path'

interface AudiobookChapter {
  id: string
  title: string
  author: string
  bookId: string
  bookTitle: string
  chapterIndex: number
  totalChapters: number
  cefr: 'B1' | 'B2'
  language: 'fr' | 'es' | 'en'
  durationMinutes: number
  audioUrl: string
  text: string
  credit: string
  source: string
  license: string
  textAudioMatch: boolean
}

const CACHE_DIR = join(process.cwd(), '.cache', 'gutenberg')
mkdirSync(CACHE_DIR, { recursive: true })

async function fetchGutenberg(id: number): Promise<string> {
  const file = join(CACHE_DIR, `${id}.txt`)
  let t: string
  if (existsSync(file)) {
    t = readFileSync(file, 'utf-8')
  } else {
    console.log(`Downloading Gutenberg #${id}...`)
    const res = await fetch(`https://www.gutenberg.org/cache/epub/${id}/pg${id}.txt`, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)' }
    })
    if (!res.ok) throw new Error(`HTTP ${res.status} for #${id}`)
    t = await res.text()
    writeFileSync(file, t, 'utf-8')
  }
  return t.replace(/\r\n/g, '\n').replace(/\r/g, '\n')
}

function cleanText(raw: string): string {
  return raw
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .replace(/^[ \t]+|[ \t]+$/gm, '')
    .replace(/\[(?:Ilustración|Illustration|Picture)[^\]]*\]/gi, '')
    .replace(/\[(?:Page\s*)?\d+\]/gi, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

function extractSlice(full: string, startRegex: RegExp, endRegex: RegExp, skip = 0): string {
  const pool = skip ? full.slice(skip) : full
  const startMatch = pool.match(startRegex)
  if (!startMatch || startMatch.index === undefined) {
    throw new Error(`Start regex failed: ${startRegex}`)
  }
  const startPos = startMatch.index + startMatch[0].length
  const after = pool.slice(startPos)
  const endMatch = after.match(endRegex)
  if (!endMatch || endMatch.index === undefined) {
    throw new Error(`End regex failed: ${endRegex}`)
  }
  return cleanText(after.slice(0, endMatch.index))
}

async function run() {
  const dataDir = join(process.cwd(), 'src', 'data', 'audiobooks')
  mkdirSync(dataDir, { recursive: true })

  const existingFr: AudiobookChapter[] = JSON.parse(readFileSync(join(dataDir, 'fr.json'), 'utf-8'))
  const existingEs: AudiobookChapter[] = JSON.parse(readFileSync(join(dataDir, 'es.json'), 'utf-8'))

  console.log(`Current: FR ${existingFr.length}, ES ${existingEs.length}`)

  // ==========================================
  // 1. FRENCH: 15 NEW CHAPTERS
  // ==========================================
  console.log('Loading French texts...')
  const daudetText = await fetchGutenberg(11770)
  const candideText = await fetchGutenberg(4650)

  const newFr: AudiobookChapter[] = [
    // --- Alphonse Daudet: Lettres de mon moulin (9 new letters) ---
    {
      id: 'fr-daudet-installation',
      title: 'Installation',
      author: 'Alphonse Daudet',
      bookId: 'fr-daudet-moulin',
      bookTitle: 'Lettres de mon moulin',
      chapterIndex: 5,
      totalChapters: 13,
      cefr: 'B1',
      language: 'fr',
      durationMinutes: 6,
      audioUrl: 'https://archive.org/download/lettres_de_mon_moulin_naf_0901_librivox/lettresdemonmoulin_01_daudet_64kb.mp3',
      text: extractSlice(daudetText, /\nINSTALLATION\s*\n/, /\nLA DILIGENCE DE BEAUCAIRE/, 1500),
      credit: "Alphonse Daudet · LibriVox (Lu par Nadine Eckert-Boulet) · Project Gutenberg #11770 · Kamu malı",
      source: 'https://www.gutenberg.org/ebooks/11770',
      license: 'Public Domain / CC0',
      textAudioMatch: true
    },
    {
      id: 'fr-daudet-diligence',
      title: 'La diligence de Beaucaire',
      author: 'Alphonse Daudet',
      bookId: 'fr-daudet-moulin',
      bookTitle: 'Lettres de mon moulin',
      chapterIndex: 6,
      totalChapters: 13,
      cefr: 'B1',
      language: 'fr',
      durationMinutes: 7,
      audioUrl: 'https://archive.org/download/lettres_de_mon_moulin_naf_0901_librivox/lettresdemonmoulin_02_daudet_64kb.mp3',
      text: extractSlice(daudetText, /\nLA DILIGENCE DE BEAUCAIRE\s*\n/, /\nLE SECRET DE MAITRE CORNILLE/, 3000),
      credit: "Alphonse Daudet · LibriVox (Lu par Nadine Eckert-Boulet) · Project Gutenberg #11770 · Kamu malı",
      source: 'https://www.gutenberg.org/ebooks/11770',
      license: 'Public Domain / CC0',
      textAudioMatch: true
    },
    {
      id: 'fr-daudet-mule-pape',
      title: 'La mule du pape',
      author: 'Alphonse Daudet',
      bookId: 'fr-daudet-moulin',
      bookTitle: 'Lettres de mon moulin',
      chapterIndex: 7,
      totalChapters: 13,
      cefr: 'B1',
      language: 'fr',
      durationMinutes: 20,
      audioUrl: 'https://archive.org/download/lettres_de_mon_moulin_naf_0901_librivox/lettresdemonmoulin_07_daudet_64kb.mp3',
      text: extractSlice(daudetText, /\nLA MULE DU PAPE\s*\n/, /\nLE PHARE DES SANGUINAIRES/, 10000),
      credit: "Alphonse Daudet · LibriVox (Lu par Nadine Eckert-Boulet) · Project Gutenberg #11770 · Kamu malı",
      source: 'https://www.gutenberg.org/ebooks/11770',
      license: 'Public Domain / CC0',
      textAudioMatch: true
    },
    {
      id: 'fr-daudet-phare-sanguinaires',
      title: 'Le phare des Sanguinaires',
      author: 'Alphonse Daudet',
      bookId: 'fr-daudet-moulin',
      bookTitle: 'Lettres de mon moulin',
      chapterIndex: 8,
      totalChapters: 13,
      cefr: 'B1',
      language: 'fr',
      durationMinutes: 11,
      audioUrl: 'https://archive.org/download/lettres_de_mon_moulin_naf_0901_librivox/lettresdemonmoulin_08_daudet_64kb.mp3',
      text: extractSlice(daudetText, /\nLE PHARE DES SANGUINAIRES\s*\n/, /\nL'AGONIE DE LA SEMILLANTE/, 20000),
      credit: "Alphonse Daudet · LibriVox (Lu par Nadine Eckert-Boulet) · Project Gutenberg #11770 · Kamu malı",
      source: 'https://www.gutenberg.org/ebooks/11770',
      license: 'Public Domain / CC0',
      textAudioMatch: true
    },
    {
      id: 'fr-daudet-semillante',
      title: "L'agonie de la Sémillante",
      author: 'Alphonse Daudet',
      bookId: 'fr-daudet-moulin',
      bookTitle: 'Lettres de mon moulin',
      chapterIndex: 9,
      totalChapters: 13,
      cefr: 'B1',
      language: 'fr',
      durationMinutes: 11,
      audioUrl: 'https://archive.org/download/lettres_de_mon_moulin_naf_0901_librivox/lettresdemonmoulin_09_daudet_64kb.mp3',
      text: extractSlice(daudetText, /\nL'AGONIE DE LA SEMILLANTE\s*\n/, /\nLES DOUANIERS/, 25000),
      credit: "Alphonse Daudet · LibriVox (Lu par Nadine Eckert-Boulet) · Project Gutenberg #11770 · Kamu malı",
      source: 'https://www.gutenberg.org/ebooks/11770',
      license: 'Public Domain / CC0',
      textAudioMatch: true
    },
    {
      id: 'fr-daudet-douaniers',
      title: 'Les douaniers',
      author: 'Alphonse Daudet',
      bookId: 'fr-daudet-moulin',
      bookTitle: 'Lettres de mon moulin',
      chapterIndex: 10,
      totalChapters: 13,
      cefr: 'B1',
      language: 'fr',
      durationMinutes: 7,
      audioUrl: 'https://archive.org/download/lettres_de_mon_moulin_naf_0901_librivox/lettresdemonmoulin_10_daudet_64kb.mp3',
      text: extractSlice(daudetText, /\nLES DOUANIERS\s*\n/, /\nLE CURÉ DE CUCUGNAN/, 30000),
      credit: "Alphonse Daudet · LibriVox (Lu par Nadine Eckert-Boulet) · Project Gutenberg #11770 · Kamu malı",
      source: 'https://www.gutenberg.org/ebooks/11770',
      license: 'Public Domain / CC0',
      textAudioMatch: true
    },
    {
      id: 'fr-daudet-cure-cucugnan',
      title: 'Le curé de Cucugnan',
      author: 'Alphonse Daudet',
      bookId: 'fr-daudet-moulin',
      bookTitle: 'Lettres de mon moulin',
      chapterIndex: 11,
      totalChapters: 13,
      cefr: 'B1',
      language: 'fr',
      durationMinutes: 9,
      audioUrl: 'https://archive.org/download/lettres_de_mon_moulin_naf_0901_librivox/lettresdemonmoulin_11_daudet_64kb.mp3',
      text: extractSlice(daudetText, /\nLE CURÉ DE CUCUGNAN\.\s*\n/, /\nLES VIEUX\./, 35000),
      credit: "Alphonse Daudet · LibriVox (Lu par Nadine Eckert-Boulet) · Project Gutenberg #11770 · Kamu malı",
      source: 'https://www.gutenberg.org/ebooks/11770',
      license: 'Public Domain / CC0',
      textAudioMatch: true
    },
    {
      id: 'fr-daudet-les-vieux',
      title: 'Les vieux',
      author: 'Alphonse Daudet',
      bookId: 'fr-daudet-moulin',
      bookTitle: 'Lettres de mon moulin',
      chapterIndex: 12,
      totalChapters: 13,
      cefr: 'B1',
      language: 'fr',
      durationMinutes: 13,
      audioUrl: 'https://archive.org/download/lettres_de_mon_moulin_naf_0901_librivox/lettresdemonmoulin_12_daudet_64kb.mp3',
      text: extractSlice(daudetText, /\nLES VIEUX\.\s*\n/, /\nBALLADES EN PROSE/, 40000),
      credit: "Alphonse Daudet · LibriVox (Lu par Nadine Eckert-Boulet) · Project Gutenberg #11770 · Kamu malı",
      source: 'https://www.gutenberg.org/ebooks/11770',
      license: 'Public Domain / CC0',
      textAudioMatch: true
    },
    {
      id: 'fr-daudet-ballades-prose',
      title: 'Ballades en prose',
      author: 'Alphonse Daudet',
      bookId: 'fr-daudet-moulin',
      bookTitle: 'Lettres de mon moulin',
      chapterIndex: 13,
      totalChapters: 13,
      cefr: 'B1',
      language: 'fr',
      durationMinutes: 11,
      audioUrl: 'https://archive.org/download/lettres_de_mon_moulin_naf_0901_librivox/lettresdemonmoulin_13_daudet_64kb.mp3',
      text: extractSlice(daudetText, /\nBALLADES EN PROSE\s*\n/, /\nLE PORTEFEUILLE DE BIXIOU/, 45000),
      credit: "Alphonse Daudet · LibriVox (Lu par Nadine Eckert-Boulet) · Project Gutenberg #11770 · Kamu malı",
      source: 'https://www.gutenberg.org/ebooks/11770',
      license: 'Public Domain / CC0',
      textAudioMatch: true
    },

    // --- Voltaire: Candide ou l'Optimisme (6 chapters) ---
    {
      id: 'fr-voltaire-candide-01',
      title: 'Chapitre I: Comment Candide fut élevé dans un beau château',
      author: 'Voltaire',
      bookId: 'fr-voltaire-candide',
      bookTitle: "Candide ou l'Optimisme",
      chapterIndex: 1,
      totalChapters: 6,
      cefr: 'B2',
      language: 'fr',
      durationMinutes: 8,
      audioUrl: 'https://archive.org/download/candide_ou_loptimisme_b_librivox/candide_01_voltaire_64kb.mp3',
      text: extractSlice(candideText, /\nCHAPITRE I\.\s*\n[\s\S]*?chassé d’icelui\.\s*\n/, /\nCHAPITRE II\b/, 5000),
      credit: "Voltaire · LibriVox (Lu par Bernard) · Project Gutenberg #4650 · Kamu malı",
      source: 'https://www.gutenberg.org/ebooks/4650',
      license: 'Public Domain / CC0',
      textAudioMatch: true
    },
    {
      id: 'fr-voltaire-candide-02',
      title: 'Chapitre II: Ce que devint Candide parmi les Bulgares',
      author: 'Voltaire',
      bookId: 'fr-voltaire-candide',
      bookTitle: "Candide ou l'Optimisme",
      chapterIndex: 2,
      totalChapters: 6,
      cefr: 'B2',
      language: 'fr',
      durationMinutes: 6,
      audioUrl: 'https://archive.org/download/candide_ou_loptimisme_b_librivox/candide_02_voltaire_64kb.mp3',
      text: extractSlice(candideText, /\nCHAPITRE II\s*\n\s*Ce que devint Candide parmi les Bulgares\.\s*\n/, /\nCHAPITRE III\./, 10000),
      credit: "Voltaire · LibriVox (Lu par Bernard) · Project Gutenberg #4650 · Kamu malı",
      source: 'https://www.gutenberg.org/ebooks/4650',
      license: 'Public Domain / CC0',
      textAudioMatch: true
    },
    {
      id: 'fr-voltaire-candide-03',
      title: 'Chapitre III: Comment Candide se sauva d’entre les Bulgares',
      author: 'Voltaire',
      bookId: 'fr-voltaire-candide',
      bookTitle: "Candide ou l'Optimisme",
      chapterIndex: 3,
      totalChapters: 6,
      cefr: 'B2',
      language: 'fr',
      durationMinutes: 6,
      audioUrl: 'https://archive.org/download/candide_ou_loptimisme_b_librivox/candide_03_voltaire_64kb.mp3',
      text: extractSlice(candideText, /\nCHAPITRE III\.\s*\n\s*Comment Candide se sauva[^\n]*\.\s*\n/, /\nCHAPITRE IV\./, 15000),
      credit: "Voltaire · LibriVox (Lu par Bernard) · Project Gutenberg #4650 · Kamu malı",
      source: 'https://www.gutenberg.org/ebooks/4650',
      license: 'Public Domain / CC0',
      textAudioMatch: true
    },
    {
      id: 'fr-voltaire-candide-04',
      title: 'Chapitre IV: Comment Candide rencontra son ancien maître de philosophie',
      author: 'Voltaire',
      bookId: 'fr-voltaire-candide',
      bookTitle: "Candide ou l'Optimisme",
      chapterIndex: 4,
      totalChapters: 6,
      cefr: 'B2',
      language: 'fr',
      durationMinutes: 8,
      audioUrl: 'https://archive.org/download/candide_ou_loptimisme_b_librivox/candide_04_voltaire_64kb.mp3',
      text: extractSlice(candideText, /\nCHAPITRE IV\.\s*\n[\s\S]*?Pangloss, et ce qui en advint\.\s*\n/, /\nCHAPITRE V\./, 20000),
      credit: "Voltaire · LibriVox (Lu par Bernard) · Project Gutenberg #4650 · Kamu malı",
      source: 'https://www.gutenberg.org/ebooks/4650',
      license: 'Public Domain / CC0',
      textAudioMatch: true
    },
    {
      id: 'fr-voltaire-candide-05',
      title: 'Chapitre V: Tempête, naufrage, tremblement de terre',
      author: 'Voltaire',
      bookId: 'fr-voltaire-candide',
      bookTitle: "Candide ou l'Optimisme",
      chapterIndex: 5,
      totalChapters: 6,
      cefr: 'B2',
      language: 'fr',
      durationMinutes: 7,
      audioUrl: 'https://archive.org/download/candide_ou_loptimisme_b_librivox/candide_05_voltaire_64kb.mp3',
      text: extractSlice(candideText, /\nCHAPITRE V\.\s*\n[\s\S]*?de Candide, et de l’anabaptiste Jacques\.\s*\n/, /\nCHAPITRE VI\./, 25000),
      credit: "Voltaire · LibriVox (Lu par Bernard) · Project Gutenberg #4650 · Kamu malı",
      source: 'https://www.gutenberg.org/ebooks/4650',
      license: 'Public Domain / CC0',
      textAudioMatch: true
    },
    {
      id: 'fr-voltaire-candide-06',
      title: 'Chapitre VI: Comment on fit un bel auto-da-fé pour empêcher les tremblements de terre',
      author: 'Voltaire',
      bookId: 'fr-voltaire-candide',
      bookTitle: "Candide ou l'Optimisme",
      chapterIndex: 6,
      totalChapters: 6,
      cefr: 'B2',
      language: 'fr',
      durationMinutes: 5,
      audioUrl: 'https://archive.org/download/candide_ou_loptimisme_b_librivox/candide_06_voltaire_64kb.mp3',
      text: extractSlice(candideText, /\nCHAPITRE VI\.\s*\n[\s\S]*?et comment Candide fut fessé\.\s*\n/, /\nCHAPITRE VII\b/, 30000),
      credit: "Voltaire · LibriVox (Lu par Bernard) · Project Gutenberg #4650 · Kamu malı",
      source: 'https://www.gutenberg.org/ebooks/4650',
      license: 'Public Domain / CC0',
      textAudioMatch: true
    }
  ]

  const allFr = [...existingFr, ...newFr]
  writeFileSync(join(dataDir, 'fr.json'), JSON.stringify(allFr, null, 2), 'utf-8')
  console.log(`✓ French chapters written: ${allFr.length} (was ${existingFr.length})`)

  // ==========================================
  // 2. SPANISH: 15 NEW CHAPTERS
  // ==========================================
  console.log('Loading Spanish texts...')
  const quirogaText = await fetchGutenberg(13507)
  const becquerText = await fetchGutenberg(53552)

  const newEs: AudiobookChapter[] = [
    // --- Horacio Quiroga: Cuentos de amor de locura y de muerte (9 stories) ---
    {
      id: 'es-quiroga-isolda',
      title: 'La muerte de Isolda',
      author: 'Horacio Quiroga',
      bookId: 'es-quiroga-amor',
      bookTitle: 'Cuentos de amor de locura y de muerte',
      chapterIndex: 6,
      totalChapters: 14,
      cefr: 'B2',
      language: 'es',
      durationMinutes: 17,
      audioUrl: 'https://archive.org/download/cuentosquiroga_1312_librivox/cuentosdeamor_04_quiroga_64kb.mp3',
      text: extractSlice(quirogaText, /#LA MUERTE DE ISOLDA#\s*\n/, /#EL INFIERNO ARTIFICIAL#/, 2000),
      credit: "Horacio Quiroga · LibriVox (Leído por Karen) · Project Gutenberg #13507 · Kamu malı",
      source: 'https://www.gutenberg.org/ebooks/13507',
      license: 'Public Domain / CC0',
      textAudioMatch: true
    },
    {
      id: 'es-quiroga-infierno-artificial',
      title: 'El infierno artificial',
      author: 'Horacio Quiroga',
      bookId: 'es-quiroga-amor',
      bookTitle: 'Cuentos de amor de locura y de muerte',
      chapterIndex: 7,
      totalChapters: 14,
      cefr: 'B2',
      language: 'es',
      durationMinutes: 19,
      audioUrl: 'https://archive.org/download/cuentosquiroga_1312_librivox/cuentosdeamor_05_quiroga_64kb.mp3',
      text: extractSlice(quirogaText, /#EL INFIERNO ARTIFICIAL#\s*\n/, /#LA GALLINA DEGOLLADA#/, 3000),
      credit: "Horacio Quiroga · LibriVox (Leído por Karen) · Project Gutenberg #13507 · Kamu malı",
      source: 'https://www.gutenberg.org/ebooks/13507',
      license: 'Public Domain / CC0',
      textAudioMatch: true
    },
    {
      id: 'es-quiroga-gallina-degollada',
      title: 'La gallina degollada',
      author: 'Horacio Quiroga',
      bookId: 'es-quiroga-amor',
      bookTitle: 'Cuentos de amor de locura y de muerte',
      chapterIndex: 8,
      totalChapters: 14,
      cefr: 'B2',
      language: 'es',
      durationMinutes: 20,
      audioUrl: 'https://archive.org/download/cuentosquiroga_1312_librivox/cuentosdeamor_06_quiroga_64kb.mp3',
      text: extractSlice(quirogaText, /#LA GALLINA DEGOLLADA#\s*\n/, /#LOS BUQUES SUICIDANTES#/, 5000),
      credit: "Horacio Quiroga · LibriVox (Leído por Karen) · Project Gutenberg #13507 · Kamu malı",
      source: 'https://www.gutenberg.org/ebooks/13507',
      license: 'Public Domain / CC0',
      textAudioMatch: true
    },
    {
      id: 'es-quiroga-perro-rabioso',
      title: 'El perro rabioso',
      author: 'Horacio Quiroga',
      bookId: 'es-quiroga-amor',
      bookTitle: 'Cuentos de amor de locura y de muerte',
      chapterIndex: 9,
      totalChapters: 14,
      cefr: 'B2',
      language: 'es',
      durationMinutes: 20,
      audioUrl: 'https://archive.org/download/cuentosquiroga_1312_librivox/cuentosdeamor_09_quiroga_64kb.mp3',
      text: extractSlice(quirogaText, /#EL PERRO RABIOSO#\s*\n/, /#A LA DERIVA#/, 15000),
      credit: "Horacio Quiroga · LibriVox (Leído por Karen) · Project Gutenberg #13507 · Kamu malı",
      source: 'https://www.gutenberg.org/ebooks/13507',
      license: 'Public Domain / CC0',
      textAudioMatch: true
    },
    {
      id: 'es-quiroga-insolacion',
      title: 'La insolación',
      author: 'Horacio Quiroga',
      bookId: 'es-quiroga-amor',
      bookTitle: 'Cuentos de amor de locura y de muerte',
      chapterIndex: 10,
      totalChapters: 14,
      cefr: 'B2',
      language: 'es',
      durationMinutes: 19,
      audioUrl: 'https://archive.org/download/cuentosquiroga_1312_librivox/cuentosdeamor_11_quiroga_64kb.mp3',
      text: extractSlice(quirogaText, /#LA INSOLACION#\s*\n/, /#EL ALAMBRE DE PUA#/, 20000),
      credit: "Horacio Quiroga · LibriVox (Leído por Karen) · Project Gutenberg #13507 · Kamu malı",
      source: 'https://www.gutenberg.org/ebooks/13507',
      license: 'Public Domain / CC0',
      textAudioMatch: true
    },
    {
      id: 'es-quiroga-alambre-pua',
      title: 'El alambre de púa',
      author: 'Horacio Quiroga',
      bookId: 'es-quiroga-amor',
      bookTitle: 'Cuentos de amor de locura y de muerte',
      chapterIndex: 11,
      totalChapters: 14,
      cefr: 'B2',
      language: 'es',
      durationMinutes: 27,
      audioUrl: 'https://archive.org/download/cuentosquiroga_1312_librivox/cuentosdeamor_12_quiroga_64kb.mp3',
      text: extractSlice(quirogaText, /#EL ALAMBRE DE PUA#\s*\n/, /#LOS MENSÚ#/, 25000),
      credit: "Horacio Quiroga · LibriVox (Leído por Karen) · Project Gutenberg #13507 · Kamu malı",
      source: 'https://www.gutenberg.org/ebooks/13507',
      license: 'Public Domain / CC0',
      textAudioMatch: true
    },
    {
      id: 'es-quiroga-los-mensu',
      title: 'Los Mensú',
      author: 'Horacio Quiroga',
      bookId: 'es-quiroga-amor',
      bookTitle: 'Cuentos de amor de locura y de muerte',
      chapterIndex: 12,
      totalChapters: 14,
      cefr: 'B2',
      language: 'es',
      durationMinutes: 29,
      audioUrl: 'https://archive.org/download/cuentosquiroga_1312_librivox/cuentosdeamor_13_quiroga_64kb.mp3',
      text: extractSlice(quirogaText, /#LOS MENSÚ#\s*\n/, /#YAGUAÍ#/, 30000),
      credit: "Horacio Quiroga · LibriVox (Leído por Karen) · Project Gutenberg #13507 · Kamu malı",
      source: 'https://www.gutenberg.org/ebooks/13507',
      license: 'Public Domain / CC0',
      textAudioMatch: true
    },
    {
      id: 'es-quiroga-yaguai',
      title: 'Yaguaí',
      author: 'Horacio Quiroga',
      bookId: 'es-quiroga-amor',
      bookTitle: 'Cuentos de amor de locura y de muerte',
      chapterIndex: 13,
      totalChapters: 14,
      cefr: 'B2',
      language: 'es',
      durationMinutes: 28,
      audioUrl: 'https://archive.org/download/cuentosquiroga_1312_librivox/cuentosdeamor_14_quiroga_64kb.mp3',
      text: extractSlice(quirogaText, /#YAGUAÍ#\s*\n/, /#LOS PESCADORES DE VIGAS#/, 40000),
      credit: "Horacio Quiroga · LibriVox (Leído por Karen) · Project Gutenberg #13507 · Kamu malı",
      source: 'https://www.gutenberg.org/ebooks/13507',
      license: 'Public Domain / CC0',
      textAudioMatch: true
    },
    {
      id: 'es-quiroga-pescadores-vigas',
      title: 'Los pescadores de vigas',
      author: 'Horacio Quiroga',
      bookId: 'es-quiroga-amor',
      bookTitle: 'Cuentos de amor de locura y de muerte',
      chapterIndex: 14,
      totalChapters: 14,
      cefr: 'B2',
      language: 'es',
      durationMinutes: 16,
      audioUrl: 'https://archive.org/download/cuentosquiroga_1312_librivox/cuentosdeamor_15_quiroga_64kb.mp3',
      text: extractSlice(quirogaText, /#LOS PESCADORES DE VIGAS#\s*\n/, /#LA MIEL SILVESTRE#/, 50000),
      credit: "Horacio Quiroga · LibriVox (Leído por Karen) · Project Gutenberg #13507 · Kamu malı",
      source: 'https://www.gutenberg.org/ebooks/13507',
      license: 'Public Domain / CC0',
      textAudioMatch: true
    },

    // --- Gustavo Adolfo Bécquer: Leyendas (6 legends) ---
    {
      id: 'es-becquer-maese-perez',
      title: 'Maese Pérez el organista',
      author: 'Gustavo Adolfo Bécquer',
      bookId: 'es-becquer-leyendas',
      bookTitle: 'Leyendas',
      chapterIndex: 6,
      totalChapters: 11,
      cefr: 'B2',
      language: 'es',
      durationMinutes: 37,
      audioUrl: 'https://archive.org/download/leyendas_becquer_1208_librivox/leyendas_20_becquer_64kb.mp3',
      text: extractSlice(becquerText, /\nMAESE PÉREZ EL ORGANISTA\s*\n/, /\nLOS OJOS VERDES\s*\n/, 1000),
      credit: "Gustavo Adolfo Bécquer · LibriVox · Project Gutenberg #53552 · Kamu malı",
      source: 'https://www.gutenberg.org/ebooks/53552',
      license: 'Public Domain / CC0',
      textAudioMatch: true
    },
    {
      id: 'es-becquer-tres-fechas',
      title: 'Tres fechas',
      author: 'Gustavo Adolfo Bécquer',
      bookId: 'es-becquer-leyendas',
      bookTitle: 'Leyendas',
      chapterIndex: 7,
      totalChapters: 11,
      cefr: 'B2',
      language: 'es',
      durationMinutes: 47,
      audioUrl: 'https://archive.org/download/leyendas_becquer_1208_librivox/leyendas_21_becquer_64kb.mp3',
      text: extractSlice(becquerText, /\nTRES FECHAS\s*\n/, /\nLA CORZA BLANCA\s*\n/, 5000),
      credit: "Gustavo Adolfo Bécquer · LibriVox · Project Gutenberg #53552 · Kamu malı",
      source: 'https://www.gutenberg.org/ebooks/53552',
      license: 'Public Domain / CC0',
      textAudioMatch: true
    },
    {
      id: 'es-becquer-corza-blanca',
      title: 'La corza blanca',
      author: 'Gustavo Adolfo Bécquer',
      bookId: 'es-becquer-leyendas',
      bookTitle: 'Leyendas',
      chapterIndex: 8,
      totalChapters: 11,
      cefr: 'B2',
      language: 'es',
      durationMinutes: 47,
      audioUrl: 'https://archive.org/download/leyendas_becquer_1208_librivox/leyendas_12_becquer_64kb.mp3',
      text: extractSlice(becquerText, /\nLA CORZA BLANCA\s*\n/, /\nLA ROSA DE PASIÓN\s*\n/, 10000),
      credit: "Gustavo Adolfo Bécquer · LibriVox · Project Gutenberg #53552 · Kamu malı",
      source: 'https://www.gutenberg.org/ebooks/53552',
      license: 'Public Domain / CC0',
      textAudioMatch: true
    },
    {
      id: 'es-becquer-rosa-pasion',
      title: 'La rosa de pasión',
      author: 'Gustavo Adolfo Bécquer',
      bookId: 'es-becquer-leyendas',
      bookTitle: 'Leyendas',
      chapterIndex: 9,
      totalChapters: 11,
      cefr: 'B2',
      language: 'es',
      durationMinutes: 21,
      audioUrl: 'https://archive.org/download/leyendas_becquer_1208_librivox/leyendas_17_becquer_64kb.mp3',
      text: extractSlice(becquerText, /\nLA ROSA DE PASIÓN\s*\n/, /\nLA PROMESA\s*\n/, 15000),
      credit: "Gustavo Adolfo Bécquer · LibriVox · Project Gutenberg #53552 · Kamu malı",
      source: 'https://www.gutenberg.org/ebooks/53552',
      license: 'Public Domain / CC0',
      textAudioMatch: true
    },
    {
      id: 'es-becquer-promesa',
      title: 'La promesa',
      author: 'Gustavo Adolfo Bécquer',
      bookId: 'es-becquer-leyendas',
      bookTitle: 'Leyendas',
      chapterIndex: 10,
      totalChapters: 11,
      cefr: 'B2',
      language: 'es',
      durationMinutes: 27,
      audioUrl: 'https://archive.org/download/leyendas_becquer_1208_librivox/leyendas_16_becquer_64kb.mp3',
      text: extractSlice(becquerText, /\nLA PROMESA\s*\n/, /\nEL MONTE DE LAS ÁNIMAS\s*\n/, 20000),
      credit: "Gustavo Adolfo Bécquer · LibriVox · Project Gutenberg #53552 · Kamu malı",
      source: 'https://www.gutenberg.org/ebooks/53552',
      license: 'Public Domain / CC0',
      textAudioMatch: true
    },
    {
      id: 'es-becquer-gnomo',
      title: 'El gnomo',
      author: 'Gustavo Adolfo Bécquer',
      bookId: 'es-becquer-leyendas',
      bookTitle: 'Leyendas',
      chapterIndex: 11,
      totalChapters: 11,
      cefr: 'B2',
      language: 'es',
      durationMinutes: 38,
      audioUrl: 'https://archive.org/download/leyendas_becquer_1208_librivox/leyendas_05_becquer_64kb.mp3',
      text: extractSlice(becquerText, /\nEL GNOMO\s*\n/, /\nEL MISERERE\s*\n/, 25000),
      credit: "Gustavo Adolfo Bécquer · LibriVox · Project Gutenberg #53552 · Kamu malı",
      source: 'https://www.gutenberg.org/ebooks/53552',
      license: 'Public Domain / CC0',
      textAudioMatch: true
    }
  ]

  const allEs = [...existingEs, ...newEs]
  writeFileSync(join(dataDir, 'es.json'), JSON.stringify(allEs, null, 2), 'utf-8')
  console.log(`✓ Spanish chapters written: ${allEs.length} (was ${existingEs.length})`)

  // ==========================================
  // 3. ENGLISH: 17 NEW CHAPTERS (FIRST EN CORPUS)
  // ==========================================
  console.log('Loading English texts...')
  const happyPrinceText = await fetchGutenberg(902)
  const aliceText = await fetchGutenberg(11)

  const enChapters: AudiobookChapter[] = [
    // --- Oscar Wilde: The Happy Prince and Other Tales (5 fairy tales) ---
    {
      id: 'en-wilde-happy-prince',
      title: 'The Happy Prince',
      author: 'Oscar Wilde',
      bookId: 'en-wilde-tales',
      bookTitle: 'The Happy Prince and Other Tales',
      chapterIndex: 1,
      totalChapters: 5,
      cefr: 'B1',
      language: 'en',
      durationMinutes: 18,
      audioUrl: 'https://archive.org/download/hpot_librivox/hpot_01_happy_prince_64kb.mp3',
      text: extractSlice(happyPrinceText, /\nThe Happy Prince\.\s*\n/, /\nThe Nightingale and the Rose\./, 2000),
      credit: "Oscar Wilde · LibriVox (Read by Moira Fogarty) · Project Gutenberg #902 · Public Domain",
      source: 'https://www.gutenberg.org/ebooks/902',
      license: 'Public Domain / CC0',
      textAudioMatch: true
    },
    {
      id: 'en-wilde-nightingale-rose',
      title: 'The Nightingale and the Rose',
      author: 'Oscar Wilde',
      bookId: 'en-wilde-tales',
      bookTitle: 'The Happy Prince and Other Tales',
      chapterIndex: 2,
      totalChapters: 5,
      cefr: 'B1',
      language: 'en',
      durationMinutes: 12,
      audioUrl: 'https://archive.org/download/hpot_librivox/hpot_02_nightingale_rose_64kb.mp3',
      text: extractSlice(happyPrinceText, /\nThe Nightingale and the Rose\.\s*\n/, /\nThe Selfish Giant\./, 15000),
      credit: "Oscar Wilde · LibriVox (Read by Moira Fogarty) · Project Gutenberg #902 · Public Domain",
      source: 'https://www.gutenberg.org/ebooks/902',
      license: 'Public Domain / CC0',
      textAudioMatch: true
    },
    {
      id: 'en-wilde-selfish-giant',
      title: 'The Selfish Giant',
      author: 'Oscar Wilde',
      bookId: 'en-wilde-tales',
      bookTitle: 'The Happy Prince and Other Tales',
      chapterIndex: 3,
      totalChapters: 5,
      cefr: 'B1',
      language: 'en',
      durationMinutes: 9,
      audioUrl: 'https://archive.org/download/hpot_librivox/hpot_03_selfish_giant_64kb.mp3',
      text: extractSlice(happyPrinceText, /\nThe Selfish Giant\.\s*\n/, /\nThe Devoted Friend\./, 30000),
      credit: "Oscar Wilde · LibriVox (Read by Moira Fogarty) · Project Gutenberg #902 · Public Domain",
      source: 'https://www.gutenberg.org/ebooks/902',
      license: 'Public Domain / CC0',
      textAudioMatch: true
    },
    {
      id: 'en-wilde-devoted-friend',
      title: 'The Devoted Friend',
      author: 'Oscar Wilde',
      bookId: 'en-wilde-tales',
      bookTitle: 'The Happy Prince and Other Tales',
      chapterIndex: 4,
      totalChapters: 5,
      cefr: 'B1',
      language: 'en',
      durationMinutes: 17,
      audioUrl: 'https://archive.org/download/hpot_librivox/hpot_04_devoted_friend_64kb.mp3',
      text: extractSlice(happyPrinceText, /\nThe Devoted Friend\.\s*\n/, /\nThe Remarkable Rocket\./, 40000),
      credit: "Oscar Wilde · LibriVox (Read by Moira Fogarty) · Project Gutenberg #902 · Public Domain",
      source: 'https://www.gutenberg.org/ebooks/902',
      license: 'Public Domain / CC0',
      textAudioMatch: true
    },
    {
      id: 'en-wilde-remarkable-rocket',
      title: 'The Remarkable Rocket',
      author: 'Oscar Wilde',
      bookId: 'en-wilde-tales',
      bookTitle: 'The Happy Prince and Other Tales',
      chapterIndex: 5,
      totalChapters: 5,
      cefr: 'B1',
      language: 'en',
      durationMinutes: 18,
      audioUrl: 'https://archive.org/download/hpot_librivox/hpot_05_remarkable_rocket_64kb.mp3',
      text: extractSlice(happyPrinceText, /\nThe Remarkable Rocket\.\s*\n/, /\*\*\* END OF THE PROJECT GUTENBERG EBOOK/, 60000),
      credit: "Oscar Wilde · LibriVox (Read by Moira Fogarty) · Project Gutenberg #902 · Public Domain",
      source: 'https://www.gutenberg.org/ebooks/902',
      license: 'Public Domain / CC0',
      textAudioMatch: true
    },

    // --- Lewis Carroll: Alice's Adventures in Wonderland (12 chapters) ---
    {
      id: 'en-carroll-alice-01',
      title: 'Chapter I: Down the Rabbit-Hole',
      author: 'Lewis Carroll',
      bookId: 'en-carroll-alice',
      bookTitle: "Alice's Adventures in Wonderland",
      chapterIndex: 1,
      totalChapters: 12,
      cefr: 'B1',
      language: 'en',
      durationMinutes: 11,
      audioUrl: 'https://archive.org/download/alice_in_wonderland_librivox/wonderland_ch_01_64kb.mp3',
      text: extractSlice(aliceText, /\nCHAPTER I\.\s*\n\s*Down the Rabbit-Hole\s*\n/, /\nCHAPTER II\./, 500),
      credit: "Lewis Carroll · LibriVox · Project Gutenberg #11 · Public Domain",
      source: 'https://www.gutenberg.org/ebooks/11',
      license: 'Public Domain / CC0',
      textAudioMatch: true
    },
    {
      id: 'en-carroll-alice-02',
      title: 'Chapter II: The Pool of Tears',
      author: 'Lewis Carroll',
      bookId: 'en-carroll-alice',
      bookTitle: "Alice's Adventures in Wonderland",
      chapterIndex: 2,
      totalChapters: 12,
      cefr: 'B1',
      language: 'en',
      durationMinutes: 12,
      audioUrl: 'https://archive.org/download/alice_in_wonderland_librivox/wonderland_ch_02_64kb.mp3',
      text: extractSlice(aliceText, /\nCHAPTER II\.\s*\n\s*The Pool of Tears\s*\n/, /\nCHAPTER III\./, 10000),
      credit: "Lewis Carroll · LibriVox · Project Gutenberg #11 · Public Domain",
      source: 'https://www.gutenberg.org/ebooks/11',
      license: 'Public Domain / CC0',
      textAudioMatch: true
    },
    {
      id: 'en-carroll-alice-03',
      title: 'Chapter III: A Caucus-Race and a Long Tale',
      author: 'Lewis Carroll',
      bookId: 'en-carroll-alice',
      bookTitle: "Alice's Adventures in Wonderland",
      chapterIndex: 3,
      totalChapters: 12,
      cefr: 'B1',
      language: 'en',
      durationMinutes: 18,
      audioUrl: 'https://archive.org/download/alice_in_wonderland_librivox/wonderland_ch_03_64kb.mp3',
      text: extractSlice(aliceText, /\nCHAPTER III\.\s*\n\s*A Caucus-Race and a Long Tale\s*\n/, /\nCHAPTER IV\./, 20000),
      credit: "Lewis Carroll · LibriVox · Project Gutenberg #11 · Public Domain",
      source: 'https://www.gutenberg.org/ebooks/11',
      license: 'Public Domain / CC0',
      textAudioMatch: true
    },
    {
      id: 'en-carroll-alice-04',
      title: 'Chapter IV: The Rabbit Sends in a Little Bill',
      author: 'Lewis Carroll',
      bookId: 'en-carroll-alice',
      bookTitle: "Alice's Adventures in Wonderland",
      chapterIndex: 4,
      totalChapters: 12,
      cefr: 'B1',
      language: 'en',
      durationMinutes: 20,
      audioUrl: 'https://archive.org/download/alice_in_wonderland_librivox/wonderland_ch_04_64kb.mp3',
      text: extractSlice(aliceText, /\nCHAPTER IV\.\s*\n\s*The Rabbit Sends in a Little Bill\s*\n/, /\nCHAPTER V\./, 30000),
      credit: "Lewis Carroll · LibriVox · Project Gutenberg #11 · Public Domain",
      source: 'https://www.gutenberg.org/ebooks/11',
      license: 'Public Domain / CC0',
      textAudioMatch: true
    },
    {
      id: 'en-carroll-alice-05',
      title: 'Chapter V: Advice from a Caterpillar',
      author: 'Lewis Carroll',
      bookId: 'en-carroll-alice',
      bookTitle: "Alice's Adventures in Wonderland",
      chapterIndex: 5,
      totalChapters: 12,
      cefr: 'B1',
      language: 'en',
      durationMinutes: 13,
      audioUrl: 'https://archive.org/download/alice_in_wonderland_librivox/wonderland_ch_05_64kb.mp3',
      text: extractSlice(aliceText, /\nCHAPTER V\.\s*\n\s*Advice from a Caterpillar\s*\n/, /\nCHAPTER VI\./, 40000),
      credit: "Lewis Carroll · LibriVox · Project Gutenberg #11 · Public Domain",
      source: 'https://www.gutenberg.org/ebooks/11',
      license: 'Public Domain / CC0',
      textAudioMatch: true
    },
    {
      id: 'en-carroll-alice-06',
      title: 'Chapter VI: Pig and Pepper',
      author: 'Lewis Carroll',
      bookId: 'en-carroll-alice',
      bookTitle: "Alice's Adventures in Wonderland",
      chapterIndex: 6,
      totalChapters: 12,
      cefr: 'B1',
      language: 'en',
      durationMinutes: 13,
      audioUrl: 'https://archive.org/download/alice_in_wonderland_librivox/wonderland_ch_06_64kb.mp3',
      text: extractSlice(aliceText, /\nCHAPTER VI\.\s*\n\s*Pig and Pepper\s*\n/, /\nCHAPTER VII\./, 50000),
      credit: "Lewis Carroll · LibriVox · Project Gutenberg #11 · Public Domain",
      source: 'https://www.gutenberg.org/ebooks/11',
      license: 'Public Domain / CC0',
      textAudioMatch: true
    },
    {
      id: 'en-carroll-alice-07',
      title: 'Chapter VII: A Mad Tea-Party',
      author: 'Lewis Carroll',
      bookId: 'en-carroll-alice',
      bookTitle: "Alice's Adventures in Wonderland",
      chapterIndex: 7,
      totalChapters: 12,
      cefr: 'B1',
      language: 'en',
      durationMinutes: 17,
      audioUrl: 'https://archive.org/download/alice_in_wonderland_librivox/wonderland_ch_07_64kb.mp3',
      text: extractSlice(aliceText, /\nCHAPTER VII\.\s*\n\s*A Mad Tea-Party\s*\n/, /\nCHAPTER VIII\./, 60000),
      credit: "Lewis Carroll · LibriVox · Project Gutenberg #11 · Public Domain",
      source: 'https://www.gutenberg.org/ebooks/11',
      license: 'Public Domain / CC0',
      textAudioMatch: true
    },
    {
      id: 'en-carroll-alice-08',
      title: "Chapter VIII: The Queen's Croquet-Ground",
      author: 'Lewis Carroll',
      bookId: 'en-carroll-alice',
      bookTitle: "Alice's Adventures in Wonderland",
      chapterIndex: 8,
      totalChapters: 12,
      cefr: 'B1',
      language: 'en',
      durationMinutes: 13,
      audioUrl: 'https://archive.org/download/alice_in_wonderland_librivox/wonderland_ch_08_64kb.mp3',
      text: extractSlice(aliceText, /\nCHAPTER VIII\.\s*\n\s*The Queen[’']s Croquet-Ground\s*\n/, /\nCHAPTER IX\./, 75000),
      credit: "Lewis Carroll · LibriVox · Project Gutenberg #11 · Public Domain",
      source: 'https://www.gutenberg.org/ebooks/11',
      license: 'Public Domain / CC0',
      textAudioMatch: true
    },
    {
      id: 'en-carroll-alice-09',
      title: "Chapter IX: The Mock Turtle's Story",
      author: 'Lewis Carroll',
      bookId: 'en-carroll-alice',
      bookTitle: "Alice's Adventures in Wonderland",
      chapterIndex: 9,
      totalChapters: 12,
      cefr: 'B1',
      language: 'en',
      durationMinutes: 15,
      audioUrl: 'https://archive.org/download/alice_in_wonderland_librivox/wonderland_ch_09_64kb.mp3',
      text: extractSlice(aliceText, /\nCHAPTER IX\.\s*\n\s*The Mock Turtle[’']s Story\s*\n/, /\nCHAPTER X\./, 90000),
      credit: "Lewis Carroll · LibriVox · Project Gutenberg #11 · Public Domain",
      source: 'https://www.gutenberg.org/ebooks/11',
      license: 'Public Domain / CC0',
      textAudioMatch: true
    },
    {
      id: 'en-carroll-alice-10',
      title: 'Chapter X: The Lobster Quadrille',
      author: 'Lewis Carroll',
      bookId: 'en-carroll-alice',
      bookTitle: "Alice's Adventures in Wonderland",
      chapterIndex: 10,
      totalChapters: 12,
      cefr: 'B1',
      language: 'en',
      durationMinutes: 23,
      audioUrl: 'https://archive.org/download/alice_in_wonderland_librivox/wonderland_ch_10_64kb.mp3',
      text: extractSlice(aliceText, /\nCHAPTER X\.\s*\n\s*The Lobster Quadrille\s*\n/, /\nCHAPTER XI\./, 105000),
      credit: "Lewis Carroll · LibriVox · Project Gutenberg #11 · Public Domain",
      source: 'https://www.gutenberg.org/ebooks/11',
      license: 'Public Domain / CC0',
      textAudioMatch: true
    },
    {
      id: 'en-carroll-alice-11',
      title: 'Chapter XI: Who Stole the Tarts?',
      author: 'Lewis Carroll',
      bookId: 'en-carroll-alice',
      bookTitle: "Alice's Adventures in Wonderland",
      chapterIndex: 11,
      totalChapters: 12,
      cefr: 'B1',
      language: 'en',
      durationMinutes: 10,
      audioUrl: 'https://archive.org/download/alice_in_wonderland_librivox/wonderland_ch_11_64kb.mp3',
      text: extractSlice(aliceText, /\nCHAPTER XI\.\s*\n\s*Who Stole the Tarts\?\s*\n/, /\nCHAPTER XII\./, 115000),
      credit: "Lewis Carroll · LibriVox · Project Gutenberg #11 · Public Domain",
      source: 'https://www.gutenberg.org/ebooks/11',
      license: 'Public Domain / CC0',
      textAudioMatch: true
    },
    {
      id: 'en-carroll-alice-12',
      title: "Chapter XII: Alice's Evidence",
      author: 'Lewis Carroll',
      bookId: 'en-carroll-alice',
      bookTitle: "Alice's Adventures in Wonderland",
      chapterIndex: 12,
      totalChapters: 12,
      cefr: 'B1',
      language: 'en',
      durationMinutes: 13,
      audioUrl: 'https://archive.org/download/alice_in_wonderland_librivox/wonderland_ch_12_64kb.mp3',
      text: extractSlice(aliceText, /\nCHAPTER XII\.\s*\n\s*Alice[’']s Evidence\s*\n/, /\*\*\* END OF THE PROJECT GUTENBERG EBOOK/, 125000),
      credit: "Lewis Carroll · LibriVox · Project Gutenberg #11 · Public Domain",
      source: 'https://www.gutenberg.org/ebooks/11',
      license: 'Public Domain / CC0',
      textAudioMatch: true
    }
  ]

  writeFileSync(join(dataDir, 'en.json'), JSON.stringify(enChapters, null, 2), 'utf-8')
  console.log(`✓ English chapters written: ${enChapters.length}`)
  console.log(`\n🎉 Success! All audiobook chapters built!`)
}

run().catch((e) => {
  console.error(e)
  process.exit(1)
})
