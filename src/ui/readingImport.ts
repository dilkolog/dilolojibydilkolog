import { accessFetch, APPROVAL_MESSAGE, isApprovalRefusal } from '../data/access'
import type { KelimeDB, ReadingText } from '../data/db'
import { looksLikeSubtitles, parseSubtitles } from '../engine/subtitles'
import { TARGET_LANGUAGES, type TargetLanguage } from '../engine/types'
import { LANGUAGE_NAME } from './labels'

/** How adding a text from outside ended: said in words to the learner (`ok`: it went in, else why not). */
export interface ImportNote {
  ok: boolean
  text: string
}

/** A subtitle (.srt/.vtt) or plain-text file as text for the add card; subtitles are cleaned up first. The title is the file's name. */
export function textOfFile(name: string, raw: string): { text: string; title: string } {
  return {
    text: looksLikeSubtitles(raw) || /\.(srt|vtt)$/i.test(name) ? parseSubtitles(raw) : raw,
    title: name.replace(/\.[^.]+$/, '').replace(/[._]+/g, ' '),
  }
}

/**
 * An EPUB becomes one library entry per chapter, read in order, saved here. A book in another of the app's languages goes
 * to that language's library (`texts` are then not for the screen on show: `forThisLanguage`).
 */
export async function importEpub(db: KelimeDB, file: File, language: TargetLanguage): Promise<{ note: ImportNote; texts: ReadingText[]; forThisLanguage: boolean }> {
  try {
    const { parseEpub } = await import('../data/epub')
    const book = parseEpub(new Uint8Array(await file.arrayBuffer()))
    const lang = (TARGET_LANGUAGES as readonly string[]).includes(book.language ?? '') ? (book.language as TargetLanguage) : language
    const id = crypto.randomUUID()
    const addedAt = new Date().toISOString()
    const texts: ReadingText[] = book.chapters.map((c, index) => ({
      id: crypto.randomUUID(),
      language: lang,
      title: c.title,
      text: c.text,
      addedAt,
      history: [],
      book: { id, title: book.title, index, total: book.chapters.length },
    }))
    await db.saveTexts(texts)
    const here = lang === language
    return {
      texts,
      forThisLanguage: here,
      note: {
        ok: true,
        text: here ? `${book.title}: ${texts.length} bölüm kütüphanene eklendi.` : `${book.title} ${LANGUAGE_NAME[lang]} bir kitap; ${LANGUAGE_NAME[lang]} kütüphanene eklendi (${texts.length} bölüm).`,
      },
    }
  } catch (e) {
    // Our own errors explain the problem; anything else is a file we couldn't read.
    return { texts: [], forThisLanguage: false, note: { ok: false, text: e instanceof Error && e.name === 'EpubError' ? e.message : 'Kitap okunamadı.' } }
  }
}

/** A YouTube video's subtitles in this language, as a reading text (not saved) with a link back to the video; or why there is none. */
export async function youtubeText(link: string, language: TargetLanguage): Promise<{ item: ReadingText } | { note: ImportNote }> {
  try {
    const res = await accessFetch(`/api/youtube?v=${encodeURIComponent(link.trim())}&lang=${language}`)
    const j = (await res.json()) as { id?: string; title?: string; channel?: string; auto?: boolean; text?: string; error?: string; available?: string[] }
    if (!res.ok || !j.text) {
      return {
        note: {
          ok: false,
          text:
            j.error === 'no captions'
              ? `Bu videoda ${LANGUAGE_NAME[language]} altyazı yok${j.available?.length ? ` (olanlar: ${j.available.join(', ')})` : ''}.`
              : isApprovalRefusal(j.error)
                ? APPROVAL_MESSAGE
                : j.error === 'bad request'
                  ? 'Bağlantı bir YouTube videosu gibi görünmüyor.'
                  : 'Altyazı alınamadı; YouTube şu an izin vermiyor olabilir. Altyazıyı .srt olarak indirip yükleyebilirsin.',
        },
      }
    }
    return {
      item: {
        id: crypto.randomUUID(),
        language,
        title: `${j.title}${j.auto ? ' (otomatik altyazı)' : ''}`,
        text: j.text,
        source: `https://www.youtube.com/watch?v=${j.id}`,
        addedAt: new Date().toISOString(),
        history: [],
      },
    }
  } catch {
    return { note: { ok: false, text: 'Altyazı alınamadı; internet bağlantını kontrol et.' } }
  }
}
