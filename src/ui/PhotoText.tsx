import { useState } from 'react'
import { AiError, textFromPhoto } from '../ai'
import type { TargetLanguage } from '../engine/types'
import { useAi, useAllows } from './aiContext'
import { blobToBase64, downscaleImage } from './downscaleImage'
import monkiScanner from '../assets/art/monki-scanner.webp'

/** Sharp enough for a book page's small print (the size the model reads best), small enough to send quickly. */
const PAGE_SIDE = 1568
/** Pages read in one go: a short chapter photographed page by page. */
export const MAX_PAGES = 5

/**
 * "Photo to text" in the add card: photographs of a book page, a magazine, a notice; the AI copies their text
 * (page after page, in the order chosen) into the draft, to look over before reading. The photos are not kept.
 * Shown only when the account's AI level opens it.
 */
export function PhotoText({ language, onText }: { language: TargetLanguage; onText: (text: string, title: string) => void }) {
  const { apiKey } = useAi()
  const allows = useAllows()
  const [busy, setBusy] = useState('')
  const [note, setNote] = useState<{ ok: boolean; text: string } | null>(null)
  if (!apiKey || !allows('photo_text')) return null

  const read = async (files: File[]) => {
    const pages = files.slice(0, MAX_PAGES)
    setNote(null)
    const texts: string[] = []
    let title = ''
    let empty = 0
    try {
      for (const [i, file] of pages.entries()) {
        setBusy(pages.length > 1 ? `Okunuyor… (${i + 1}/${pages.length})` : 'Okunuyor…')
        const small = await downscaleImage(file, PAGE_SIDE)
        const page = await textFromPhoto(apiKey, { language, imageBase64: await blobToBase64(small), mediaType: 'image/jpeg' })
        if (!page.found) {
          empty++
          continue
        }
        texts.push(page.text)
        title ||= page.title
      }
      if (!texts.length) {
        setNote({ ok: false, text: 'Fotoğrafta okunacak bir metin bulunamadı. Sayfayı düz, yakından ve iyi ışıkta çekmeyi dene.' })
        return
      }
      onText(texts.join('\n\n'), title)
      const skipped = files.length > MAX_PAGES ? ` İlk ${MAX_PAGES} fotoğraf okundu.` : ''
      setNote({ ok: true, text: `Metin aşağıya yazıldı: bir göz at, yanlış okunan yer varsa düzelt, sonra “Okumaya başla”.${empty ? ` ${empty} fotoğrafta metin bulunamadı.` : ''}${skipped}` })
    } catch (e) {
      setNote({ ok: false, text: e instanceof AiError ? e.message : 'Fotoğraf okunamadı. Başka bir fotoğraf dene.' })
    } finally {
      setBusy('')
    }
  }

  return (
    <>
      <label className={`btn btn-quiet file-btn${busy ? ' file-btn-off' : ''}`} aria-busy={!!busy || undefined}>
        <img className="chip-art" src={monkiScanner} alt="" width={20} height={20} draggable={false} />
        <span>{busy || 'Fotoğraftan metin'}</span>
        <input
          type="file"
          accept="image/*"
          multiple
          aria-label="Fotoğraftan metin"
          disabled={!!busy}
          onChange={(e) => {
            const files = [...(e.target.files ?? [])]
            e.target.value = ''
            if (files.length) void read(files)
          }}
        />
      </label>
      {note && (
        <p className={`add-sources-note ${note.ok ? 'notice' : 'error'}`} role="status">
          {note.text}
        </p>
      )}
    </>
  )
}
