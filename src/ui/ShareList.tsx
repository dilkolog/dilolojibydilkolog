import { useEffect, useState } from 'react'
import type { VocabularyEntry, WordList } from '../engine/types'
import { shareLink } from '../engine/sharedSet'
import type { KelimeDB } from '../data/db'
import { createShare, deleteShare, dropMyShare, forgetCollab, getMyShares, saveCollab, saveMyShare, ShareError, wordsOfList, type MyShare } from '../data/share'
import { getStoredAccount } from '../data/access'
import { QrCode } from './QrCode'
import { showToast } from './toastFeed'

/**
 * Puts a list out by link. A copy is a snapshot anyone with the link can take into their own words
 * (optionally listed for the other approved accounts too); a shared list is one everybody who joins keeps
 * in step, each change going to the others. Only an approved account can do either.
 */
export function ShareList({ db, list, vocabulary, onChanged }: { db: KelimeDB; list: WordList; vocabulary: VocabularyEntry[]; onChanged: () => void }) {
  const [shares, setShares] = useState<MyShare[]>([])
  const [kind, setKind] = useState<'set' | 'collab'>('set')
  const [publish, setPublish] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const words = wordsOfList(vocabulary, list.id)
  const load = () => void getMyShares(db).then((all) => setShares(all.filter((s) => s.listId === list.id)))
  useEffect(load, [db, list.id])

  const make = async () => {
    setBusy(true)
    setError('')
    try {
      const account = await getStoredAccount()
      const id = await createShare({ kind, name: list.name, language: list.language, words, ...(kind === 'set' && publish ? { publish: true, ...(account ? { by: account.username } : {}) } : {}) })
      await saveMyShare(db, { id, listId: list.id, kind, published: kind === 'set' && publish, at: new Date().toISOString() })
      // A shared list is a joined one on this device too: it stays in step from here on.
      if (kind === 'collab') {
        await saveCollab(db, { id, listId: list.id, language: list.language, known: words.map((w) => w.key), syncedAt: new Date().toISOString() })
        onChanged()
      }
      load()
    } catch (e) {
      setError(e instanceof ShareError ? e.message : 'Paylaşılamadı.')
    } finally {
      setBusy(false)
    }
  }

  const withdraw = async (s: MyShare) => {
    try {
      await deleteShare(s.id)
    } catch (e) {
      // A share the server no longer has is withdrawn all the same.
      if (!(e instanceof ShareError && e.kind === 'notfound')) {
        setError(e instanceof ShareError ? e.message : 'Kaldırılamadı.')
        return
      }
    }
    await dropMyShare(db, s.id)
    if (s.kind === 'collab') {
      await forgetCollab(db, s.id)
      onChanged()
    }
    load()
    showToast('Paylaşım kaldırıldı.')
  }

  return (
    <div className="stack gap-2 share-list">
      {shares.map((s) => {
        const link = shareLink(location.origin, s.id)
        return (
          <div key={s.id} className="card stack gap-2">
            <strong>{s.kind === 'collab' ? 'Ortak liste' : s.published ? 'Kopya (kütüphanede de)' : 'Kopya'}</strong>
            <div className="row nowrap">
              <input className="input" readOnly value={link} aria-label="Bağlantı" onFocus={(e) => e.currentTarget.select()} />
              <button
                type="button"
                className="btn btn-quiet btn-sm"
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(link)
                    showToast('Bağlantı kopyalandı.')
                  } catch {
                    showToast('Kopyalanamadı: bağlantıyı elle seç.', undefined, 4000, 'info')
                  }
                }}
              >
                Kopyala
              </button>
            </div>
            <QrCode text={link} label={`${list.name} bağlantısının QR kodu`} />
            <p className="small muted">
              {s.kind === 'collab' ? 'Bağlantıyı açan herkes listeye katılır; eklenen, değiştirilen ve silinen kelimeler herkeste aynı olur.' : 'Bağlantıyı açan kişi listenin o günkü kopyasını kendi kelimelerine ekler.'}
            </p>
            <div>
              <button type="button" className="link small wl-delete" onClick={() => withdraw(s)}>
                Paylaşımı kaldır
              </button>
            </div>
          </div>
        )
      })}
      <div className="stack gap-2">
        <div className="choice-row" role="group" aria-label="Paylaşım türü">
          <button type="button" className="chip" aria-pressed={kind === 'set'} onClick={() => setKind('set')}>
            Kopya
          </button>
          <button type="button" className="chip" aria-pressed={kind === 'collab'} onClick={() => setKind('collab')}>
            Ortak liste
          </button>
        </div>
        <p className="small muted">
          {kind === 'set'
            ? 'Listenin şimdiki kelimeleri, ilerlemen olmadan; bağlantıyı açan kendi kelimelerine ekler. Sonradan yaptığın değişiklikler ona gitmez.'
            : 'Bağlantıyı açanlar listeye katılır ve hep birlikte düzenlersiniz; herkesin değişikliği diğerlerine gelir.'}
        </p>
        {kind === 'set' && (
          <label className="row small gap-2 pointer">
            <input type="checkbox" checked={publish} onChange={(e) => setPublish(e.target.checked)} />
            Onaylı hesaplar için kütüphanede de listele (kullanıcı adın görünür)
          </label>
        )}
        {error && <p className="error" role="alert">{error}</p>}
        <div>
          <button type="button" className="btn btn-sm" disabled={busy || words.length === 0} onClick={make}>
            {busy ? 'Hazırlanıyor…' : kind === 'set' ? 'Bağlantı oluştur' : 'Ortak liste bağlantısı oluştur'}
          </button>
          {words.length === 0 && <span className="small muted"> Listede kelime yok.</span>}
        </div>
      </div>
    </div>
  )
}
