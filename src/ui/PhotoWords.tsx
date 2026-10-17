import { useEffect, useState } from 'react'
import { AiError, wordsFromPhoto, type WordInfo } from '../ai'
import type { KelimeDB } from '../data/db'
import type { TargetLanguage, VocabularyEntry } from '../engine/types'
import { addWordInfos } from './addWordInfos'
import { useAi } from './aiContext'
import { downscaleImage } from './downscaleImage'

/** The most words one photo brings back. */
const MAX_WORDS = 12
/** Long enough side to read small print on a menu or a package, short enough to send quickly. */
const PHOTO_SIDE = 1280

type Row = { info: WordInfo; selected: boolean }

const toBase64 = (blob: Blob) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onerror = () => reject(reader.error)
    reader.onload = () => resolve(String(reader.result).split(',')[1] ?? '')
    reader.readAsDataURL(blob)
  })

/**
 * Words from a photo: a menu, a sign, a package, a book page. The AI reads the words off the picture
 * (or names what is shown when there is no text); the learner picks which ones become cards.
 * Nothing is added unasked, and the photo itself is not kept.
 */
export function PhotoWords({ db, language, vocabulary, onAdded }: { db: KelimeDB; language: TargetLanguage; vocabulary: VocabularyEntry[]; onAdded: () => void }) {
  const { apiKey, needsApproval } = useAi()
  const [rows, setRows] = useState<Row[] | null>(null)
  const [preview, setPreview] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState<{ added: number; listName?: string } | null>(null)

  useEffect(() => {
    if (!preview) return
    return () => URL.revokeObjectURL(preview)
  }, [preview])

  const read = async (file: File) => {
    if (!apiKey) return
    setBusy(true)
    setError('')
    setDone(null)
    setRows(null)
    try {
      const small = await downscaleImage(file, PHOTO_SIDE)
      setPreview(URL.createObjectURL(small))
      const infos = await wordsFromPhoto(apiKey, {
        language,
        imageBase64: await toBase64(small),
        mediaType: 'image/jpeg',
        count: MAX_WORDS,
        have: vocabulary.filter((v) => v.language === language).map((v) => v.lemma),
      })
      if (!infos.length) setError('Bu fotoğrafta alınacak yeni kelime bulunamadı. Yazıların daha yakın ve net göründüğü bir fotoğraf dene.')
      setRows(infos.map((info) => ({ info, selected: true })))
    } catch (e) {
      setError(e instanceof AiError ? e.message : 'Fotoğraf okunamadı. Başka bir fotoğraf dene.')
    } finally {
      setBusy(false)
    }
  }

  const add = async () => {
    if (!rows) return
    const result = await addWordInfos(db, language, vocabulary, rows.filter((r) => r.selected).map((r) => r.info))
    setDone(result)
    setRows(null)
    setPreview('')
    onAdded()
  }

  const chosen = rows?.filter((r) => r.selected).length ?? 0
  return (
    <details className="card photo-words">
      <summary>Fotoğraftan kelime</summary>
      <div className="stack mt-3">
        <p className="small muted">Menü, tabela, ürün etiketi ya da kitap sayfasının fotoğrafını çek; YZ üzerindeki kelimeleri çıkarsın, beğendiklerini sen seç. Fotoğraf saklanmaz.</p>
        {!apiKey && <p className="small muted">{needsApproval ? 'YZ özellikleri hesabının onaylanmasını bekliyor.' : 'Bunun için Ayarlar → YZ yardımcısı bölümünde bir anahtar gerekiyor.'}</p>}
        <div className="row">
          <label className={apiKey && !busy ? 'btn btn-quiet file-btn' : 'btn btn-quiet file-btn file-btn-off'}>
            Fotoğraf çek
            <input type="file" accept="image/*" capture="environment" disabled={!apiKey || busy} onChange={(e) => (e.target.files?.[0] ? void read(e.target.files[0]) : undefined)} />
          </label>
          <label className={apiKey && !busy ? 'btn btn-quiet file-btn' : 'btn btn-quiet file-btn file-btn-off'}>
            Galeriden seç
            <input type="file" accept="image/*" disabled={!apiKey || busy} onChange={(e) => (e.target.files?.[0] ? void read(e.target.files[0]) : undefined)} />
          </label>
        </div>
        {busy && (
          <p className="small muted" role="status">
            Fotoğraf okunuyor…
          </p>
        )}
        {error && <p className="error">{error}</p>}
        {done && (
          <p className="small" role="status">
            {done.added} kelime eklendi{done.listName ? ` (“${done.listName}” listesine)` : ''}.
          </p>
        )}
        {preview && rows && <img className="photo-words-preview" src={preview} alt="Seçtiğin fotoğraf" />}
        {rows && rows.length > 0 && (
          <>
            <ul className="plain stack gap-2">
              {rows.map((r, i) => (
                <li key={r.info.lemma} className="suggest-row">
                  <label className="row gap-2">
                    <input type="checkbox" checked={r.selected} onChange={(e) => setRows(rows.map((x, j) => (j === i ? { ...x, selected: e.target.checked } : x)))} aria-label={`${r.info.lemma} ekle`} />
                    <span>
                      <strong lang={language}>{r.info.lemma}</strong> <span className="small muted">{r.info.meanings.join(', ')}</span>
                      <br />
                      <span className="small muted" lang={language}>
                        {r.info.example.replace(/\*/g, '')}
                      </span>
                    </span>
                  </label>
                </li>
              ))}
            </ul>
            <div className="row">
              <button type="button" className="btn btn-sm" onClick={add} disabled={!chosen}>
                Seçilenleri ekle ({chosen})
              </button>
              <button type="button" className="link small" onClick={() => (setRows(null), setPreview(''))}>
                Kapat
              </button>
            </div>
          </>
        )}
      </div>
    </details>
  )
}
