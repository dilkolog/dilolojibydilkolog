/**
 * Builds chapter-by-chapter matched audiobook corpora from Project Gutenberg & LibriVox.
 * Fetches plain texts from Project Gutenberg, slices specific chapters,
 * pairs them with direct LibriVox MP3 URLs (verified with HEAD requests),
 * and saves into src/data/audiobooks/{fr,es}.json.
 *
 * Usage: npx tsx scripts/build-audiobook-chapters.ts
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

export interface AudiobookChapterConfig {
  id: string
  title: string
  author: string
  bookId: string
  bookTitle: string
  chapterIndex: number
  totalChapters: number
  cefr: 'B1' | 'B2'
  language: 'fr' | 'es'
  durationMinutes: number
  audioUrl: string
  gutenbergId: number
  skipCharsBeforeSearch?: number
  startMarker: RegExp | string
  endMarker: RegExp | string
  readerName: string
  notes?: string
}

export interface AudiobookChapter {
  id: string
  title: string
  author: string
  bookId: string
  bookTitle: string
  chapterIndex: number
  totalChapters: number
  cefr: 'B1' | 'B2'
  language: 'fr' | 'es'
  durationMinutes: number
  audioUrl: string
  text: string
  credit: string
  source: string
  license: string
  textAudioMatch: boolean
}

const CHAPTERS: AudiobookChapterConfig[] = [
  // --- DAUDET: Lettres de mon moulin (Gutenberg #11770) ---
  {
    id: 'fr-daudet-cornille',
    title: 'Le secret de maître Cornille',
    author: 'Alphonse Daudet',
    bookId: 'fr-daudet-moulin',
    bookTitle: 'Lettres de mon moulin',
    chapterIndex: 1,
    totalChapters: 4,
    cefr: 'B1',
    language: 'fr',
    durationMinutes: 11,
    audioUrl: 'https://archive.org/download/lettres_de_mon_moulin_naf_0901_librivox/lettresdemonmoulin_03_daudet_64kb.mp3',
    gutenbergId: 11770,
    skipCharsBeforeSearch: 5000,
    startMarker: /LE SECRET DE MAITRE CORNILLE\s*\r?\n/,
    endMarker: /LA CH[ÈE]VRE DE M\. SEGUIN/,
    readerName: 'Nadine Eckert-Boulet',
  },
  {
    id: 'fr-daudet-chevre-seguin',
    title: 'La chèvre de M. Seguin',
    author: 'Alphonse Daudet',
    bookId: 'fr-daudet-moulin',
    bookTitle: 'Lettres de mon moulin',
    chapterIndex: 2,
    totalChapters: 4,
    cefr: 'B1',
    language: 'fr',
    durationMinutes: 12,
    audioUrl: 'https://archive.org/download/lettres_de_mon_moulin_naf_0901_librivox/lettresdemonmoulin_04_daudet_64kb.mp3',
    gutenbergId: 11770,
    skipCharsBeforeSearch: 5000,
    startMarker: /LA CH[ÈE]VRE DE M\. SEGUIN\s*\r?\n/,
    endMarker: /LES [ÉE]TOILES/,
    readerName: 'Nadine Eckert-Boulet',
  },
  {
    id: 'fr-daudet-etoiles',
    title: 'Les étoiles',
    author: 'Alphonse Daudet',
    bookId: 'fr-daudet-moulin',
    bookTitle: 'Lettres de mon moulin',
    chapterIndex: 3,
    totalChapters: 4,
    cefr: 'B1',
    language: 'fr',
    durationMinutes: 12,
    audioUrl: 'https://archive.org/download/lettres_de_mon_moulin_naf_0901_librivox/lettresdemonmoulin_05_daudet_64kb.mp3',
    gutenbergId: 11770,
    skipCharsBeforeSearch: 5000,
    startMarker: /LES [ÉE]TOILES\s*\r?\n\s*R[ÉE]CIT D'UN BERGER PROVEN[ÇC]AL\.\s*\r?\n/,
    endMarker: /L'ARL[ÉE]SIENNE/,
    readerName: 'Nadine Eckert-Boulet',
  },
  {
    id: 'fr-daudet-arlesienne',
    title: "L'Arlésienne",
    author: 'Alphonse Daudet',
    bookId: 'fr-daudet-moulin',
    bookTitle: 'Lettres de mon moulin',
    chapterIndex: 4,
    totalChapters: 4,
    cefr: 'B1',
    language: 'fr',
    durationMinutes: 8,
    audioUrl: 'https://archive.org/download/lettres_de_mon_moulin_naf_0901_librivox/lettresdemonmoulin_06_daudet_64kb.mp3',
    gutenbergId: 11770,
    skipCharsBeforeSearch: 5000,
    startMarker: /L'ARL[ÉE]SIENNE\s*\r?\n/,
    endMarker: /LA MULE DU PAPE/,
    readerName: 'Nadine Eckert-Boulet',
  },

  // --- MAUPASSANT: Le Horla et autres contes (Gutenberg #10775) ---
  {
    id: 'fr-maupassant-amour',
    title: 'Amour',
    author: 'Guy de Maupassant',
    bookId: 'fr-maupassant-contes',
    bookTitle: 'Le Horla et autres contes',
    chapterIndex: 1,
    totalChapters: 4,
    cefr: 'B2',
    language: 'fr',
    durationMinutes: 10,
    audioUrl: 'https://archive.org/download/lehorla_1203_naf_librivox/lehorla_02_maupassant_64kb.mp3',
    gutenbergId: 10775,
    skipCharsBeforeSearch: 5000,
    startMarker: /\r?\n\s*AMOUR\s*\r?\n\s*\r?\nTROIS PAGES DU _LIVRE D'UN CHASSEUR_\s*\r?\n\s*\r?\n/,
    endMarker: /\r?\n\s*LE TROU\s*\r?\n/,
    readerName: 'Nadine Eckert-Boulet',
  },
  {
    id: 'fr-maupassant-le-trou',
    title: 'Le Trou',
    author: 'Guy de Maupassant',
    bookId: 'fr-maupassant-contes',
    bookTitle: 'Le Horla et autres contes',
    chapterIndex: 2,
    totalChapters: 4,
    cefr: 'B2',
    language: 'fr',
    durationMinutes: 11,
    audioUrl: 'https://archive.org/download/lehorla_1203_naf_librivox/lehorla_03_maupassant_64kb.mp3',
    gutenbergId: 10775,
    skipCharsBeforeSearch: 5000,
    startMarker: /\r?\n\s*LE TROU\s*\r?\n\s*\r?\n/,
    endMarker: /\r?\n\s*SAUV[ÉE]E\s*\r?\n/,
    readerName: 'Nadine Eckert-Boulet',
  },
  {
    id: 'fr-maupassant-clochette',
    title: 'Clochette',
    author: 'Guy de Maupassant',
    bookId: 'fr-maupassant-contes',
    bookTitle: 'Le Horla et autres contes',
    chapterIndex: 3,
    totalChapters: 4,
    cefr: 'B2',
    language: 'fr',
    durationMinutes: 9,
    audioUrl: 'https://archive.org/download/lehorla_1203_naf_librivox/lehorla_05_maupassant_64kb.mp3',
    gutenbergId: 10775,
    skipCharsBeforeSearch: 5000,
    startMarker: /\r?\n\s*CLOCHETTE\s*\r?\n\s*\r?\n/,
    endMarker: /\r?\n\s*LE MARQUIS DE FUMEROL\s*\r?\n/,
    readerName: 'Nadine Eckert-Boulet',
  },
  {
    id: 'fr-maupassant-le-signe',
    title: 'Le Signe',
    author: 'Guy de Maupassant',
    bookId: 'fr-maupassant-contes',
    bookTitle: 'Le Horla et autres contes',
    chapterIndex: 4,
    totalChapters: 4,
    cefr: 'B2',
    language: 'fr',
    durationMinutes: 11,
    audioUrl: 'https://archive.org/download/lehorla_1203_naf_librivox/lehorla_07_maupassant_64kb.mp3',
    gutenbergId: 10775,
    skipCharsBeforeSearch: 5000,
    startMarker: /\r?\n\s*LE SIGNE\s*\r?\n\s*\r?\n/,
    endMarker: /\r?\n\s*LE DIABLE\s*\r?\n/,
    readerName: 'Nadine Eckert-Boulet',
  },

  // --- LA FONTAINE: Fables, Tome Premier (Gutenberg #17941) ---
  {
    id: 'fr-lafontaine-cigale',
    title: 'La Cigale et la Fourmi',
    author: 'Jean de La Fontaine',
    bookId: 'fr-lafontaine-fables-01',
    bookTitle: 'Fables de La Fontaine, Livre 01',
    chapterIndex: 1,
    totalChapters: 5,
    cefr: 'B1',
    language: 'fr',
    durationMinutes: 1,
    audioUrl: 'https://archive.org/download/fables_lafontaine_01_librivox/fables_01_01_lafontaine_64kb.mp3',
    gutenbergId: 17941,
    skipCharsBeforeSearch: 15000,
    startMarker: /La Cigale et la Fourmi\s*\r?\n/,
    endMarker: /Le Corbeau et le Renard/,
    readerName: 'Jean-Luc',
  },
  {
    id: 'fr-lafontaine-corbeau',
    title: 'Le Corbeau et le Renard',
    author: 'Jean de La Fontaine',
    bookId: 'fr-lafontaine-fables-01',
    bookTitle: 'Fables de La Fontaine, Livre 01',
    chapterIndex: 2,
    totalChapters: 5,
    cefr: 'B1',
    language: 'fr',
    durationMinutes: 1,
    audioUrl: 'https://archive.org/download/fables_lafontaine_01_librivox/fables_01_02_lafontaine_64kb.mp3',
    gutenbergId: 17941,
    skipCharsBeforeSearch: 15000,
    startMarker: /Le Corbeau et le Renard\s*\r?\n/,
    endMarker: /La grenouille qui veut se faire/,
    readerName: 'Jean-Luc',
  },
  {
    id: 'fr-lafontaine-grenouille',
    title: 'La grenouille qui veut se faire aussi grosse que le boeuf',
    author: 'Jean de La Fontaine',
    bookId: 'fr-lafontaine-fables-01',
    bookTitle: 'Fables de La Fontaine, Livre 01',
    chapterIndex: 3,
    totalChapters: 5,
    cefr: 'B1',
    language: 'fr',
    durationMinutes: 1,
    audioUrl: 'https://archive.org/download/fables_lafontaine_01_librivox/fables_01_03_lafontaine_64kb.mp3',
    gutenbergId: 17941,
    skipCharsBeforeSearch: 15000,
    startMarker: /La grenouille qui veut se faire[^\r\n]*\r?\n/,
    endMarker: /Les deux mulets/,
    readerName: 'Jean-Luc',
  },
  {
    id: 'fr-lafontaine-loup-agneau',
    title: "Le Loup et l'Agneau",
    author: 'Jean de La Fontaine',
    bookId: 'fr-lafontaine-fables-01',
    bookTitle: 'Fables de La Fontaine, Livre 01',
    chapterIndex: 4,
    totalChapters: 5,
    cefr: 'B1',
    language: 'fr',
    durationMinutes: 2,
    audioUrl: 'https://archive.org/download/fables_lafontaine_01_librivox/fables_01_10_lafontaine_64kb.mp3',
    gutenbergId: 17941,
    skipCharsBeforeSearch: 15000,
    startMarker: /Le loup et l'agneau\s*\r?\n/,
    endMarker: /L'homme et son image/,
    readerName: 'Jean-Luc',
  },
  {
    id: 'fr-lafontaine-chene-roseau',
    title: 'Le Chêne et le Roseau',
    author: 'Jean de La Fontaine',
    bookId: 'fr-lafontaine-fables-01',
    bookTitle: 'Fables de La Fontaine, Livre 01',
    chapterIndex: 5,
    totalChapters: 5,
    cefr: 'B1',
    language: 'fr',
    durationMinutes: 2,
    audioUrl: 'https://archive.org/download/fables_lafontaine_01_librivox/fables_01_22_lafontaine_64kb.mp3',
    gutenbergId: 17941,
    skipCharsBeforeSearch: 15000,
    startMarker: /Le chêne et le roseau\s*\r?\n/,
    endMarker: /End of Project Gutenberg|LIVRE DEUXI[ÈE]ME|\*\*\* END OF THE PROJECT/,
    readerName: 'Jean-Luc',
  },

  // --- QUIROGA: Cuentos de Amor de Locura y de Muerte (Gutenberg #13507) ---
  {
    id: 'es-quiroga-a-la-deriva',
    title: 'A la deriva',
    author: 'Horacio Quiroga',
    bookId: 'es-quiroga-cuentos',
    bookTitle: 'Cuentos de Amor de Locura y de Muerte',
    chapterIndex: 1,
    totalChapters: 5,
    cefr: 'B2',
    language: 'es',
    durationMinutes: 10,
    audioUrl: 'https://archive.org/download/cuentosquiroga_1312_librivox/cuentosdeamor_10_quiroga_64kb.mp3',
    gutenbergId: 13507,
    skipCharsBeforeSearch: 3000,
    startMarker: /#A LA DERIVA#\s*\r?\n\s*\r?\n/,
    endMarker: /\r?\n\s*#LA INSOLACI[OÓ]N#/,
    readerName: 'Karen',
  },
  {
    id: 'es-quiroga-almohadon-plumas',
    title: 'El almohadón de plumas',
    author: 'Horacio Quiroga',
    bookId: 'es-quiroga-cuentos',
    bookTitle: 'Cuentos de Amor de Locura y de Muerte',
    chapterIndex: 2,
    totalChapters: 5,
    cefr: 'B2',
    language: 'es',
    durationMinutes: 10,
    audioUrl: 'https://archive.org/download/cuentosquiroga_1312_librivox/cuentosdeamor_08_quiroga_64kb.mp3',
    gutenbergId: 13507,
    skipCharsBeforeSearch: 3000,
    startMarker: /#EL ALMOHAD[OÓ]N DE PLUMA#\s*\r?\n\s*\r?\n/,
    endMarker: /\r?\n\s*#EL PERRO RABIOSO#/,
    readerName: 'Karen',
  },
  {
    id: 'es-quiroga-buques-suicidantes',
    title: 'Los buques suicidantes',
    author: 'Horacio Quiroga',
    bookId: 'es-quiroga-cuentos',
    bookTitle: 'Cuentos de Amor de Locura y de Muerte',
    chapterIndex: 3,
    totalChapters: 5,
    cefr: 'B2',
    language: 'es',
    durationMinutes: 8,
    audioUrl: 'https://archive.org/download/cuentosquiroga_1312_librivox/cuentosdeamor_07_quiroga_64kb.mp3',
    gutenbergId: 13507,
    skipCharsBeforeSearch: 3000,
    startMarker: /#LOS BUQUES SUICIDANTES#\s*\r?\n\s*\r?\n/,
    endMarker: /\r?\n\s*#EL ALMOHAD[OÓ]N DE PLUMA#/,
    readerName: 'Karen',
  },
  {
    id: 'es-quiroga-solitario',
    title: 'El solitario',
    author: 'Horacio Quiroga',
    bookId: 'es-quiroga-cuentos',
    bookTitle: 'Cuentos de Amor de Locura y de Muerte',
    chapterIndex: 4,
    totalChapters: 5,
    cefr: 'B2',
    language: 'es',
    durationMinutes: 13,
    audioUrl: 'https://archive.org/download/cuentosquiroga_1312_librivox/cuentosdeamor_03_quiroga_64kb.mp3',
    gutenbergId: 13507,
    skipCharsBeforeSearch: 3000,
    startMarker: /#EL SOLITARIO#\s*\r?\n\s*\r?\n/,
    endMarker: /\r?\n\s*#LA MUERTE DE ISOLDA#/,
    readerName: 'Karen',
  },
  {
    id: 'es-quiroga-miel-silvestre',
    title: 'La miel silvestre',
    author: 'Horacio Quiroga',
    bookId: 'es-quiroga-cuentos',
    bookTitle: 'Cuentos de Amor de Locura y de Muerte',
    chapterIndex: 5,
    totalChapters: 5,
    cefr: 'B2',
    language: 'es',
    durationMinutes: 15,
    audioUrl: 'https://archive.org/download/cuentosquiroga_1312_librivox/cuentosdeamor_16_quiroga_64kb.mp3',
    gutenbergId: 13507,
    skipCharsBeforeSearch: 3000,
    startMarker: /#LA MIEL SILVESTRE#\s*\r?\n\s*\r?\n/,
    endMarker: /\r?\n\s*#NUESTRO PRIMER CIGARRO#/,
    readerName: 'Karen',
  },

  // --- BÉCQUER: Leyendas (Gutenberg #53552) ---
  {
    id: 'es-becquer-ojos-verdes',
    title: 'Los Ojos Verdes',
    author: 'Gustavo Adolfo Bécquer',
    bookId: 'es-becquer-leyendas',
    bookTitle: 'Leyendas',
    chapterIndex: 1,
    totalChapters: 5,
    cefr: 'B2',
    language: 'es',
    durationMinutes: 21,
    audioUrl: 'https://archive.org/download/leyendas_becquer_1208_librivox/leyendas_19_becquer_64kb.mp3',
    gutenbergId: 53552,
    skipCharsBeforeSearch: 10000,
    startMarker: /LOS OJOS VERDES\s*\r?\n/,
    endMarker: /EL RAYO DE LUNA/,
    readerName: 'Tuxita',
  },
  {
    id: 'es-becquer-rayo-luna',
    title: 'El Rayo de Luna',
    author: 'Gustavo Adolfo Bécquer',
    bookId: 'es-becquer-leyendas',
    bookTitle: 'Leyendas',
    chapterIndex: 2,
    totalChapters: 5,
    cefr: 'B2',
    language: 'es',
    durationMinutes: 25,
    audioUrl: 'https://archive.org/download/leyendas_becquer_1208_librivox/leyendas_08_becquer_64kb.mp3',
    gutenbergId: 53552,
    skipCharsBeforeSearch: 10000,
    startMarker: /EL RAYO DE LUNA\s*\r?\n/,
    endMarker: /TRES FECHAS/,
    readerName: 'Tuxita',
  },
  {
    id: 'es-becquer-monte-animas',
    title: 'El Monte de las Ánimas',
    author: 'Gustavo Adolfo Bécquer',
    bookId: 'es-becquer-leyendas',
    bookTitle: 'Leyendas',
    chapterIndex: 3,
    totalChapters: 5,
    cefr: 'B2',
    language: 'es',
    durationMinutes: 19,
    audioUrl: 'https://archive.org/download/leyendas_becquer_1208_librivox/leyendas_07_becquer_64kb.mp3',
    gutenbergId: 53552,
    skipCharsBeforeSearch: 10000,
    startMarker: /EL MONTE DE LAS [ÁA]NIMAS\s*\r?\n/,
    endMarker: /EL GNOMO/,
    readerName: 'Kendal',
  },
  {
    id: 'es-becquer-miserere',
    title: 'El Miserere',
    author: 'Gustavo Adolfo Bécquer',
    bookId: 'es-becquer-leyendas',
    bookTitle: 'Leyendas',
    chapterIndex: 4,
    totalChapters: 5,
    cefr: 'B2',
    language: 'es',
    durationMinutes: 23,
    audioUrl: 'https://archive.org/download/leyendas_becquer_1208_librivox/leyendas_06_becquer_64kb.mp3',
    gutenbergId: 53552,
    skipCharsBeforeSearch: 10000,
    startMarker: /EL MISERERE\s*\r?\n/,
    endMarker: /LAS HOJAS SECAS/,
    readerName: 'Tuxita',
  },
  {
    id: 'es-becquer-hojas-secas',
    title: 'Las Hojas Secas',
    author: 'Gustavo Adolfo Bécquer',
    bookId: 'es-becquer-leyendas',
    bookTitle: 'Leyendas',
    chapterIndex: 5,
    totalChapters: 5,
    cefr: 'B1',
    language: 'es',
    durationMinutes: 9,
    audioUrl: 'https://archive.org/download/leyendas_becquer_1208_librivox/leyendas_18_becquer_64kb.mp3',
    gutenbergId: 53552,
    skipCharsBeforeSearch: 10000,
    startMarker: /LAS HOJAS SECAS\s*\r?\n/,
    endMarker: /LA VENTA DE LOS GATOS/,
    readerName: 'Tuxita',
  },
]

const CACHE_DIR = join(process.cwd(), '.cache', 'gutenberg')

async function fetchGutenbergText(id: number): Promise<string> {
  mkdirSync(CACHE_DIR, { recursive: true })
  const cacheFile = join(CACHE_DIR, `${id}.txt`)
  if (existsSync(cacheFile)) {
    return readFileSync(cacheFile, 'utf-8')
  }

  const url = `https://www.gutenberg.org/cache/epub/${id}/pg${id}.txt`
  console.log(`Downloading Gutenberg #${id}...`)
  const res = await fetch(url)
  if (!res.ok) {
    throw new Error(`Failed to download Gutenberg #${id}: ${res.status}`)
  }
  const text = await res.text()
  writeFileSync(cacheFile, text, 'utf-8')
  return text
}

async function verifyAudioHead(url: string): Promise<boolean> {
  try {
    const res = await fetch(url, { method: 'HEAD' })
    return res.ok && (res.headers.get('content-type')?.includes('audio') || false)
  } catch {
    return false
  }
}

function cleanExtractedText(raw: string): string {
  return raw
    .replace(/\r\n/g, '\n')
    .replace(/^[ \t]+|[ \t]+$/gm, '')
    // Remove Gutenberg illustration markers like [Ilustración] or [Illustration]
    .replace(/\[(?:Ilustración|Illustration)[^\]]*\]/gi, '')
    // Remove Gutenberg page numbers like [Page 12] or [12]
    .replace(/\[(?:Page\s*)?\d+\]/gi, '')
    // Replace multiple empty lines with maximum two
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

export async function buildAudiobookChapters() {
  console.log(`Starting audiobook chapters build (${CHAPTERS.length} chapters)...`)
  const textsByGutenbergId = new Map<number, string>()
  const uniqueGutenbergIds = [...new Set(CHAPTERS.map((c) => c.gutenbergId))]

  for (const gid of uniqueGutenbergIds) {
    const text = await fetchGutenbergText(gid)
    textsByGutenbergId.set(gid, text)
  }

  const frList: AudiobookChapter[] = []
  const esList: AudiobookChapter[] = []

  for (const conf of CHAPTERS) {
    console.log(`Processing: [${conf.language.toUpperCase()}] ${conf.bookTitle} - ${conf.title}`)
    const fullText = textsByGutenbergId.get(conf.gutenbergId)
    if (!fullText) throw new Error(`Missing text for Gutenberg #${conf.gutenbergId}`)

    const searchPool = conf.skipCharsBeforeSearch
      ? fullText.slice(conf.skipCharsBeforeSearch)
      : fullText

    // Slice using start and end markers
    const startMatch = typeof conf.startMarker === 'string'
      ? { index: searchPool.indexOf(conf.startMarker), length: conf.startMarker.length }
      : searchPool.match(conf.startMarker)
        ? { index: searchPool.search(conf.startMarker), length: searchPool.match(conf.startMarker)![0].length }
        : null

    if (!startMatch || startMatch.index === -1) {
      console.error(`❌ Start marker failed for chapter: ${conf.id}`)
      continue
    }

    const startPos = startMatch.index + startMatch.length
    const textAfterStart = searchPool.slice(startPos)

    const endMatch = typeof conf.endMarker === 'string'
      ? { index: textAfterStart.indexOf(conf.endMarker) }
      : textAfterStart.match(conf.endMarker)
        ? { index: textAfterStart.search(conf.endMarker) }
        : null

    if (!endMatch || endMatch.index === -1) {
      console.error(`❌ End marker failed for chapter: ${conf.id}`)
      continue
    }

    const rawChapterText = textAfterStart.slice(0, endMatch.index)
    const cleanedText = cleanExtractedText(rawChapterText)

    if (cleanedText.length < 100) {
      console.error(`❌ Chapter text too short (${cleanedText.length} chars): ${conf.id}`)
      continue
    }

    // Verify audio
    const isAudioOk = await verifyAudioHead(conf.audioUrl)
    if (!isAudioOk) {
      console.error(`❌ Audio HEAD check failed: ${conf.audioUrl}`)
      continue
    }

    const chapter: AudiobookChapter = {
      id: conf.id,
      title: conf.title,
      author: conf.author,
      bookId: conf.bookId,
      bookTitle: conf.bookTitle,
      chapterIndex: conf.chapterIndex,
      totalChapters: conf.totalChapters,
      cefr: conf.cefr,
      language: conf.language,
      durationMinutes: conf.durationMinutes,
      audioUrl: conf.audioUrl,
      text: cleanedText,
      credit: `${conf.author} · LibriVox (Lu par ${conf.readerName}) · Project Gutenberg #${conf.gutenbergId} · Kamu malı`,
      source: `https://www.gutenberg.org/ebooks/${conf.gutenbergId}`,
      license: 'Public Domain / CC0',
      textAudioMatch: true,
    }

    if (conf.language === 'fr') {
      frList.push(chapter)
    } else {
      esList.push(chapter)
    }

    console.log(`  ✓ OK (${cleanedText.length} chars, ~${conf.durationMinutes} min, Audio HTTP 200)`)
  }

  const outDir = join(process.cwd(), 'src', 'data', 'audiobooks')
  mkdirSync(outDir, { recursive: true })

  writeFileSync(join(outDir, 'fr.json'), JSON.stringify(frList, null, 2), 'utf-8')
  writeFileSync(join(outDir, 'es.json'), JSON.stringify(esList, null, 2), 'utf-8')

  console.log(`\n🎉 Audiobook chapters generated successfully!`)
  console.log(`- French: ${frList.length} chapters saved to src/data/audiobooks/fr.json`)
  console.log(`- Spanish: ${esList.length} chapters saved to src/data/audiobooks/es.json`)
}

if (process.argv[1] && process.argv[1].endsWith('build-audiobook-chapters.ts')) {
  buildAudiobookChapters().catch((err) => {
    console.error(err)
    process.exit(1)
  })
}
