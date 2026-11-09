import { accessFetch, APPROVAL_MESSAGE, isApprovalRefusal } from '../../data/access'
import { titleOf, type KelimeDB, type ReadingText } from '../../data/db'
import { looksLikeSubtitles, parseSubtitles, youtubeId } from '../../engine/subtitles'
import { TARGET_LANGUAGES, type TargetLanguage } from '../../engine/types'
import { LANGUAGE_NAME } from '../shared/labels'

/** How adding a text from outside ended: said in words to the learner (`ok`: it went in, else why not). */
export interface ImportNote {
  ok: boolean
  text: string
}

/** A file the add card reads itself (rather than as plain text): Word and PDF. */
export const isDocumentFile = (name: string) => /\.(pdf|docx)$/i.test(name)

/**
 * A Word or PDF file: a short one goes into the add card's draft (to look over, then read), a long one is cut
 * into parts and saved as a book, read in order like an EPUB.
 */
export async function importDocument(
  db: KelimeDB,
  file: File,
  language: TargetLanguage,
): Promise<{ draft: { text: string; title: string } } | { note: ImportNote; texts: ReadingText[] }> {
  const files = await import('../../data/readingFiles')
  try {
    const bytes = new Uint8Array(await file.arrayBuffer())
    const read = /\.pdf$/i.test(file.name) ? await files.pdfReadingText(bytes) : { text: files.docxReadingText(bytes), title: undefined }
    const title = read.title || fileTitle(file.name)
    if (files.wordCount(read.text) <= files.BOOK_WORDS) return { draft: { text: read.text, title } }
    const parts = files.splitIntoParts(read.text)
    const id = crypto.randomUUID()
    const addedAt = new Date().toISOString()
    const texts: ReadingText[] = parts.map((text, index) => ({
      id: crypto.randomUUID(),
      language,
      title: `${title} (${index + 1}/${parts.length})`,
      text,
      addedAt,
      history: [],
      book: { id, title, index, total: parts.length },
    }))
    await db.saveTexts(texts)
    return { texts, note: { ok: true, text: `${title} uzun bir metin: ${parts.length} parça olarak kütüphanene eklendi.` } }
  } catch (e) {
    return { texts: [], note: { ok: false, text: e instanceof files.ReadingFileError ? e.message : 'Dosya okunamadı.' } }
  }
}

const fileTitle = (name: string) => name.replace(/\.[^.]+$/, '').replace(/[._]+/g, ' ').trim()

/** A web page's main text (an article, a blog post), fetched by the server, as a reading text (not saved); or why there is none. */
export async function pageText(link: string, language: TargetLanguage): Promise<{ item: ReadingText } | { note: ImportNote }> {
  try {
    const res = await accessFetch(`/api/news?url=${encodeURIComponent(link.trim())}`)
    const j = (await res.json().catch(() => ({}))) as { title?: string; text?: string; url?: string; error?: string }
    if (!res.ok || !j.text) {
      const why: Record<string, string> = {
        'bad url': 'Bu bir web sayfası bağlantısı gibi görünmüyor (https:// ile başlamalı).',
        'not html': 'Bu bağlantı bir web sayfası değil. PDF ise indirip “Dosya” ile ekleyebilirsin.',
        'too large': 'Sayfa çok büyük. Metni kopyalayıp buraya yapıştırabilirsin.',
        'no text': 'Sayfada okunacak bir yazı bulunamadı. Metni kopyalayıp buraya yapıştırabilirsin.',
        daily_quota: 'Bugünkü sayfa hakkın doldu; yarın yeniden dene ya da metni yapıştır.',
      }
      return {
        note: {
          ok: false,
          text: isApprovalRefusal(j.error) ? APPROVAL_MESSAGE : (j.error && why[j.error]) || 'Sayfa getirilemedi; site izin vermiyor olabilir. Metni kopyalayıp buraya yapıştırabilirsin.',
        },
      }
    }
    return {
      item: { id: crypto.randomUUID(), language, title: j.title?.trim() || titleOf(j.text), text: j.text, source: j.url || link.trim(), addedAt: new Date().toISOString(), history: [] },
    }
  } catch {
    return { note: { ok: false, text: 'Sayfa getirilemedi; internet bağlantını kontrol et.' } }
  }
}

/** A YouTube link that names a playlist (…&list=…): a course to add as a series. Mixes YouTube makes (RD…) are no list. */
export const isPlaylistLink = (link: string) => isYoutubeLink(link) && /[?&]list=(?!RD)[\w-]{10,64}/.test(link)

/**
 * A YouTube playlist as a series in the library: one text per video, in order, shared as a book. The texts are
 * empty until opened (`fillEpisode` brings each one's subtitles then), so a long course costs one request now.
 * `open` is the episode the link pointed at (watch?v=…&list=…), else the first.
 */
export async function playlistBook(db: KelimeDB, link: string, language: TargetLanguage): Promise<{ texts: ReadingText[]; open: ReadingText } | { note: ImportNote }> {
  try {
    const res = await accessFetch(`/api/youtube?list=${encodeURIComponent(link.trim())}`)
    const j = (await res.json().catch(() => ({}))) as { title?: string; videos?: { id: string; title: string }[]; error?: string }
    if (!res.ok || !j.videos?.length) {
      const why: Record<string, string> = {
        'not found': 'Bu oynatma listesi bulunamadı ya da gizli.',
        'no key': 'Oynatma listesi okunamıyor (sunucuda YouTube anahtarı yok). Videoları tek tek ekleyebilirsin.',
        quota: 'Bugünkü YouTube hakkı doldu; yarın yeniden dene.',
        daily_quota: 'Bugünkü video hakkın doldu; yarın yeniden dene.',
      }
      return { note: { ok: false, text: isApprovalRefusal(j.error) ? APPROVAL_MESSAGE : (j.error && why[j.error]) || 'Oynatma listesi alınamadı; biraz sonra yeniden dene.' } }
    }
    const book = { id: crypto.randomUUID(), title: j.title || 'YouTube listesi', total: j.videos.length }
    const addedAt = new Date().toISOString()
    const texts: ReadingText[] = j.videos.map((v, index) => ({
      id: crypto.randomUUID(),
      language,
      title: v.title,
      text: '',
      source: `https://www.youtube.com/watch?v=${v.id}`,
      addedAt,
      history: [],
      book: { ...book, index },
    }))
    await db.saveTexts(texts)
    const wanted = youtubeId(link)
    return { texts, open: texts.find((t) => youtubeId(t.source ?? '') === wanted) ?? texts[0] }
  } catch {
    return { note: { ok: false, text: 'Oynatma listesi alınamadı; internet bağlantını kontrol et.' } }
  }
}

/** An episode of a series not opened before: its subtitles (with their times) fetched and kept with it. */
export async function fillEpisode(db: KelimeDB, item: ReadingText): Promise<{ item: ReadingText } | { note: ImportNote; paste?: boolean }> {
  const got = await youtubeText(item.source ?? '', item.language)
  if ('note' in got) return got
  const filled: ReadingText = { ...item, text: got.item.text, ...(got.item.cues ? { cues: got.item.cues } : {}) }
  await db.saveText(filled)
  return { item: filled }
}

/** Whether a link is a YouTube video (its subtitles are fetched) rather than a page (its text is). */
export const isYoutubeLink = (link: string) => /(^|\/\/|\.)(youtube\.com|youtu\.be)\b/i.test(link.trim()) || /^[\w-]{11}$/.test(link.trim())

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
    const { parseEpub } = await import('../../data/epub')
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

/**
 * A YouTube video's subtitles in this language, as a reading text (not saved) with a link back to the video; or why
 * there are none. `paste`: the captions exist but could not be brought (YouTube turned the server away), so the
 * learner can paste the video's transcript instead and keep the video above it.
 */
export async function youtubeText(link: string, language: TargetLanguage): Promise<{ item: ReadingText } | { note: ImportNote; paste?: boolean }> {
  try {
    const res = await accessFetch(`/api/youtube?v=${encodeURIComponent(link.trim())}&lang=${language}&cues=1`)
    const j = (await res.json()) as { id?: string; title?: string; channel?: string; auto?: boolean; text?: string; cues?: { start: number; text: string }[]; error?: string; available?: string[] }
    if (!res.ok || !j.text) {
      // Only a list of the video's own tracks proves it has none in this language; anything else is YouTube not telling.
      const none = j.error === 'no captions' && !!j.available?.length
      const refused = isApprovalRefusal(j.error) || j.error === 'bad request' || j.error === 'daily_quota'
      return {
        note: {
          ok: false,
          text: none
            ? `Bu videoda ${LANGUAGE_NAME[language]} altyazı yok (olanlar: ${j.available!.join(', ')}).`
            : isApprovalRefusal(j.error)
              ? APPROVAL_MESSAGE
              : j.error === 'bad request'
                ? 'Bağlantı bir YouTube videosu gibi görünmüyor.'
                : j.error === 'daily_quota'
                  ? 'Bugünkü video hakkın doldu; yarın yeniden dene.'
                  : 'YouTube bu videonun altyazısını şu an sunucumuza vermiyor (bulut sunucularından gelen istekleri zaman zaman engelliyor).',
        },
        ...(!none && !refused ? { paste: true } : {}),
      }
    }
    return {
      item: {
        id: crypto.randomUUID(),
        language,
        title: `${j.title}${j.auto ? ' (otomatik altyazı)' : ''}`,
        text: j.text,
        source: `https://www.youtube.com/watch?v=${j.id}`,
        // The lines' times: the video above the text lights the sentence heard, exactly.
        ...(j.cues?.length ? { cues: j.cues.filter((c) => typeof c.start === 'number' && typeof c.text === 'string').map((c) => ({ start: c.start, text: c.text })) } : {}),
        addedAt: new Date().toISOString(),
        history: [],
      },
    }
  } catch {
    return { note: { ok: false, text: 'Altyazı alınamadı; internet bağlantını kontrol et.' } }
  }
}
