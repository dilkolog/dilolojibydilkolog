import '../lazy.css'
import { useEffect, useState } from 'react'
import { fetchShare, importSnapshot, joinCollab, ShareError, type ShareDoc } from '../data/share'
import { db } from '../data/instance'
import { ConfirmDialog } from './Dialog'
import { LANGUAGE_NAME } from './labels'
import { showToast } from './toastFeed'
import { newListId } from './wordListId'

/**
 * A list somebody shared (a link, a QR code, the library): what is in it, then "add to my words" for a copy
 * or "join" for a shared list. Nothing is added until it is confirmed.
 */
export default function IncomingSet({ id, onClose, onDone }: { id: string; onClose: () => void; onDone: () => void }) {
  const [doc, setDoc] = useState<ShareDoc | null>(null)
  const [busy, setBusy] = useState(false)
  useEffect(() => {
    let live = true
    fetchShare(id)
      .then((r) => live && setDoc(r.doc))
      .catch((e) => {
        if (!live) return
        showToast(e instanceof ShareError ? e.message : 'Liste açılamadı.', undefined, 6000, 'info')
        onClose()
      })
    return () => {
      live = false
    }
  }, [id, onClose])
  if (!doc) return null
  const words = doc.words.filter((w) => !w.deleted)
  const confirm = async () => {
    if (busy) return
    setBusy(true)
    try {
      if (doc.kind === 'collab') {
        const r = await joinCollab(db, id, newListId())
        showToast(`"${doc.name}" ortak listesine katıldın: ${r.added} kelime geldi.`)
      } else {
        const r = await importSnapshot(db, doc, newListId())
        showToast(`${r.added} kelime "${doc.name}" listesine eklendi${r.skipped ? ` (${r.skipped} tanesi zaten vardı)` : ''}.`)
      }
      onDone()
    } catch (e) {
      showToast(e instanceof ShareError ? e.message : 'Eklenemedi.', undefined, 6000, 'info')
    }
    onClose()
  }
  return (
    <ConfirmDialog title={doc.kind === 'collab' ? `“${doc.name}” ortak listesine katıl` : `“${doc.name}” listesini ekle`} confirmLabel={doc.kind === 'collab' ? 'Katıl' : 'Listeme ekle'} onConfirm={confirm} onCancel={onClose}>
      <p>
        {LANGUAGE_NAME[doc.language]} · {words.length} kelime
        {doc.kind === 'collab' ? '. Katılınca bu liste sende ayrı bir liste olur; eklenen, değişen ve silinen kelimeler katılan herkesle aynı kalır.' : '. Kelimeler yeni bir listeye eklenir; ilerleme gelmez, sende zaten olan kelimeler yerinde kalır.'}
      </p>
      <ul className="small">
        {words.slice(0, 8).map((w) => (
          <li key={w.key}>
            <strong lang={doc.language}>{w.word}</strong> — {w.meaning}
          </li>
        ))}
        {words.length > 8 && <li className="muted">… ve {words.length - 8} kelime daha</li>}
      </ul>
    </ConfirmDialog>
  )
}
