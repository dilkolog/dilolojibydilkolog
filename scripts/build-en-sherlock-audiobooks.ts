/**
 * Build English Audiobooks Extension:
 * Adds 12 chapters of Sir Arthur Conan Doyle's 'The Adventures of Sherlock Holmes'
 * Project Gutenberg #1661 & LibriVox 'adventures_sherlockholmes_1007_librivox' (read by Mark F. Smith).
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

async function run() {
  const dataDir = join(process.cwd(), 'src', 'data', 'audiobooks')
  const enFile = join(dataDir, 'en.json')
  const existingEn: AudiobookChapter[] = JSON.parse(readFileSync(enFile, 'utf-8'))

  console.log(`Existing English chapters: ${existingEn.length}`)

  const doyleText = await fetchGutenberg(1661)

  const stories = [
    {
      num: 1,
      id: 'en-doyle-sherlock-01',
      title: 'I. A Scandal in Bohemia',
      durationMinutes: 58,
      audioFile: '01',
      start: 'I. A SCANDAL IN BOHEMIA',
      next: 'II. THE RED-HEADED LEAGUE'
    },
    {
      num: 2,
      id: 'en-doyle-sherlock-02',
      title: 'II. The Red-Headed League',
      durationMinutes: 60,
      audioFile: '02',
      start: 'II. THE RED-HEADED LEAGUE',
      next: 'III. A CASE OF IDENTITY'
    },
    {
      num: 3,
      id: 'en-doyle-sherlock-03',
      title: 'III. A Case of Identity',
      durationMinutes: 45,
      audioFile: '03',
      start: 'III. A CASE OF IDENTITY',
      next: 'IV. THE BOSCOMBE VALLEY MYSTERY'
    },
    {
      num: 4,
      id: 'en-doyle-sherlock-04',
      title: 'IV. The Boscombe Valley Mystery',
      durationMinutes: 63,
      audioFile: '04',
      start: 'IV. THE BOSCOMBE VALLEY MYSTERY',
      next: 'V. THE FIVE ORANGE PIPS'
    },
    {
      num: 5,
      id: 'en-doyle-sherlock-05',
      title: 'V. The Five Orange Pips',
      durationMinutes: 47,
      audioFile: '05',
      start: 'V. THE FIVE ORANGE PIPS',
      next: 'VI. THE MAN WITH THE TWISTED LIP'
    },
    {
      num: 6,
      id: 'en-doyle-sherlock-06',
      title: 'VI. The Man with the Twisted Lip',
      durationMinutes: 60,
      audioFile: '06',
      start: 'VI. THE MAN WITH THE TWISTED LIP',
      next: 'VII. THE ADVENTURE OF THE BLUE CARBUNCLE'
    },
    {
      num: 7,
      id: 'en-doyle-sherlock-07',
      title: 'VII. The Adventure of the Blue Carbuncle',
      durationMinutes: 52,
      audioFile: '07',
      start: 'VII. THE ADVENTURE OF THE BLUE CARBUNCLE',
      next: 'VIII. THE ADVENTURE OF THE SPECKLED BAND'
    },
    {
      num: 8,
      id: 'en-doyle-sherlock-08',
      title: 'VIII. The Adventure of the Speckled Band',
      durationMinutes: 63,
      audioFile: '08',
      start: 'VIII. THE ADVENTURE OF THE SPECKLED BAND',
      next: 'IX. THE ADVENTURE OF THE ENGINEER’S THUMB'
    },
    {
      num: 9,
      id: 'en-doyle-sherlock-09',
      title: 'IX. The Adventure of the Engineer’s Thumb',
      durationMinutes: 53,
      audioFile: '09',
      start: 'IX. THE ADVENTURE OF THE ENGINEER’S THUMB',
      next: 'X. THE ADVENTURE OF THE NOBLE BACHELOR'
    },
    {
      num: 10,
      id: 'en-doyle-sherlock-10',
      title: 'X. The Adventure of the Noble Bachelor',
      durationMinutes: 53,
      audioFile: '10',
      start: 'X. THE ADVENTURE OF THE NOBLE BACHELOR',
      next: 'XI. THE ADVENTURE OF THE BERYL CORONET'
    },
    {
      num: 11,
      id: 'en-doyle-sherlock-11',
      title: 'XI. The Adventure of the Beryl Coronet',
      durationMinutes: 59,
      audioFile: '11',
      start: 'XI. THE ADVENTURE OF THE BERYL CORONET',
      next: 'XII. THE ADVENTURE OF THE COPPER BEECHES'
    },
    {
      num: 12,
      id: 'en-doyle-sherlock-12',
      title: 'XII. The Adventure of the Copper Beeches',
      durationMinutes: 63,
      audioFile: '12',
      start: 'XII. THE ADVENTURE OF THE COPPER BEECHES',
      next: '*** END OF THE PROJECT GUTENBERG EBOOK'
    }
  ]

  const newChapters: AudiobookChapter[] = []

  for (const s of stories) {
    const sIdx = doyleText.indexOf(s.start)
    const eIdx = doyleText.indexOf(s.next, sIdx + s.start.length)
    if (sIdx === -1 || eIdx === -1) {
      throw new Error(`Failed to extract slice for ${s.title}`)
    }
    const raw = doyleText.slice(sIdx + s.start.length, eIdx)
    const cleaned = cleanText(raw)

    const audioUrl = `https://archive.org/download/adventures_sherlockholmes_1007_librivox/adventuresherlockholmes_${s.audioFile}_doyle_64kb.mp3`

    newChapters.push({
      id: s.id,
      title: s.title,
      author: 'Arthur Conan Doyle',
      bookId: 'en-doyle-sherlock',
      bookTitle: 'The Adventures of Sherlock Holmes',
      chapterIndex: s.num,
      totalChapters: 12,
      cefr: 'B2',
      language: 'en',
      durationMinutes: s.durationMinutes,
      audioUrl,
      text: cleaned,
      credit: 'Arthur Conan Doyle · LibriVox (Read by Mark F. Smith) · Project Gutenberg #1661 · Public Domain',
      source: 'https://www.gutenberg.org/ebooks/1661',
      license: 'Public Domain / CC0',
      textAudioMatch: true
    })
  }

  // Filter out any existing sherlock items (if rerun)
  const nonSherlock = existingEn.filter((c) => !c.id.startsWith('en-doyle-sherlock-'))
  const updatedEn = [...nonSherlock, ...newChapters]

  writeFileSync(enFile, JSON.stringify(updatedEn, null, 2) + '\n', 'utf-8')
  console.log(`Success! Total English chapters now: ${updatedEn.length}`)
}

run().catch((err) => {
  console.error(err)
  process.exit(1)
})
