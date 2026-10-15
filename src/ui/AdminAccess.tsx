import { useCallback, useEffect, useState } from 'react'
import { adminAct, adminLists, adminMoveTables, adminRelease, type AdminEntry, type AdminLists } from '../data/access'
import { db } from '../data/instance'
import { ConfirmDialog } from './Dialog'
import { relativeTime } from './format'

const META = 'adminToken'

/**
 * For the site's owner: the accounts waiting for approval (with the username and note they sent),
 * the approved ones, and the ones turned down. The owner's key (ADMIN_TOKEN on the server) stays on
 * this device only. Everyone else sees only a closed "Yönetici" line that asks for a key they lack.
 */
export function AdminAccess() {
  const [token, setToken] = useState('')
  const [lists, setLists] = useState<AdminLists | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [freeName, setFreeName] = useState('')
  const [confirmFree, setConfirmFree] = useState(false)
  const [freed, setFreed] = useState('')
  const [moved, setMoved] = useState('')

  const load = useCallback(async (key: string) => {
    setBusy(true)
    setError('')
    try {
      setLists(await adminLists(key))
      await db.meta.put({ key: META, value: key })
    } catch (e) {
      setLists(null)
      setError(e instanceof Error && e.message === 'forbidden' ? 'Yönetici anahtarı yanlış.' : e instanceof Error && e.message === 'not configured' ? 'Sunucuda ADMIN_TOKEN tanımlı değil (Vercel → Settings → Environment Variables).' : 'Liste alınamadı; internet bağlantını kontrol et.')
    } finally {
      setBusy(false)
    }
  }, [])

  const act = async (action: 'approve' | 'reject' | 'revoke', id: string) => {
    setBusy(true)
    setError('')
    try {
      await adminAct(token, action, id)
      setLists(await adminLists(token))
    } catch {
      setError('İşlem yapılamadı; yeniden dene.')
    } finally {
      setBusy(false)
    }
  }

  const release = async () => {
    setConfirmFree(false)
    setBusy(true)
    setError('')
    setFreed('')
    try {
      const removed = await adminRelease(token, freeName.trim())
      setFreed(removed ? `“${freeName.trim()}” serbest bırakıldı (${removed} dosya silindi).` : `“${freeName.trim()}” için kayıt yoktu; ad zaten boş.`)
      setFreeName('')
    } catch {
      setError('Serbest bırakılamadı; kullanıcı adını ve anahtarı kontrol et.')
    } finally {
      setBusy(false)
    }
  }

  const moveTables = async () => {
    setBusy(true)
    setError('')
    try {
      const n = await adminMoveTables(token)
      setMoved(`Tablolarda: ${n.cards} arkadaş kartı, ${n.follows} takip, ${n.shares} paylaşılan liste, ${n.reminders} hatırlatma.`)
      setLists(await adminLists(token))
    } catch (e) {
      setError(e instanceof Error && e.message === 'missing' ? 'Önce Supabase’de 0003_server_tables.sql dosyasını çalıştır.' : 'Taşınamadı; yeniden dene (yarım kalan taşıma tekrar edilebilir).')
    } finally {
      setBusy(false)
    }
  }

  // Opened with a key already kept: the lists load at once.
  const [asked, setAsked] = useState(false)
  useEffect(() => {
    if (!asked) return
    void db.meta.get(META).then((r) => {
      const key = typeof r?.value === 'string' ? r.value : ''
      if (key) {
        setToken(key)
        void load(key)
      }
    })
  }, [asked, load])

  const row = (e: AdminEntry, actions: [string, 'approve' | 'reject' | 'revoke', string?][]) => (
    <li key={e.id} className="admin-row">
      <span className="admin-who">
        <strong>{e.username || 'adsız'}</strong>
        <span className="small muted">{relativeTime(new Date(e.at))}</span>
        {e.note && <span className="small">{e.note}</span>}
      </span>
      <span className="row gap-2">
        {actions.map(([label, action, cls]) => (
          <button key={action} className={`btn btn-sm ${cls ?? 'btn-quiet'}`} disabled={busy} onClick={() => void act(action, e.id)}>
            {label}
          </button>
        ))}
      </span>
    </li>
  )

  return (
    <details className="account-advanced" onToggle={(e) => e.currentTarget.open && setAsked(true)}>
      <summary className="small">Yönetici: hesap onayları (yalnızca site sahibi)</summary>
      <div className="stack">
        <form
          className="row"
          onSubmit={(e) => {
            e.preventDefault()
            if (token.trim()) void load(token.trim())
          }}
        >
          <input className="input" type="password" autoComplete="off" aria-label="Yönetici anahtarı" placeholder="Yönetici anahtarı (ADMIN_TOKEN)" value={token} onChange={(e) => setToken(e.target.value)} />
          <button className="btn btn-sm" type="submit" disabled={busy || !token.trim()}>
            {busy ? 'Bekle…' : 'Listele'}
          </button>
        </form>
        {error && (
          <p className="error small" role="alert">
            {error}
          </p>
        )}
        {lists && (
          <>
            <h3 className="subhead">Onay bekleyenler ({lists.pending.length})</h3>
            {lists.pending.length === 0 && <p className="small muted">Bekleyen yok.</p>}
            <ul className="admin-list">{lists.pending.map((e) => row(e, [['Onayla', 'approve', ''], ['Reddet', 'reject']]))}</ul>
            <h3 className="subhead">Onaylılar ({lists.approved.length})</h3>
            <ul className="admin-list">{lists.approved.map((e) => row(e, [['Yetkiyi geri al', 'revoke']]))}</ul>
            {lists.rejected.length > 0 && (
              <>
                <h3 className="subhead">Reddedilenler ({lists.rejected.length})</h3>
                <ul className="admin-list">{lists.rejected.map((e) => row(e, [['Onayla', 'approve']]))}</ul>
              </>
            )}
            {lists.tables && lists.tables !== 'off' && (
              <>
                <h3 className="subhead">Sunucu verileri</h3>
                {lists.tables === 'on' ? (
                  <p className="small muted">Arkadaşlar, paylaşılan listeler ve hatırlatmalar Supabase tablolarında. Taşımayı yeniden çalıştırmak eksik kalanı tamamlar.</p>
                ) : lists.tables === 'missing' ? (
                  <p className="small muted">Arkadaşlar, paylaşılan listeler ve hatırlatmalar hâlâ Vercel Blob’da. Taşımak için önce Supabase SQL Editor’de 0003_server_tables.sql dosyasını çalıştır.</p>
                ) : (
                  <p className="small muted">Arkadaşlar, paylaşılan listeler ve hatırlatmalar hâlâ Vercel Blob’da. Taşıyınca Supabase panelinde tablolar olarak görünür; taşıma bir kez yapılır.</p>
                )}
                {lists.tables !== 'missing' && (
                  <button className="btn btn-sm btn-quiet" type="button" disabled={busy} onClick={() => void moveTables()}>
                    {lists.tables === 'on' ? 'Taşımayı yeniden çalıştır' : 'Supabase’e taşı'}
                  </button>
                )}
                {moved && (
                  <p className="small" role="status">
                    {moved}
                  </p>
                )}
              </>
            )}
            <h3 className="subhead">Bir adı serbest bırak</h3>
            <p className="small muted">SYNC_ALLOWED’a eklediğin bir adı sen almadan başkası aldıysa: ad ve altındaki bütün eşitleme dosyaları silinir, sonra sen alırsın. Kendi hesabında kullanma.</p>
            <form
              className="row"
              onSubmit={(e) => {
                e.preventDefault()
                if (freeName.trim()) setConfirmFree(true)
              }}
            >
              <input className="input" aria-label="Serbest bırakılacak kullanıcı adı" placeholder="kullanıcı adı" value={freeName} onChange={(e) => setFreeName(e.target.value)} />
              <button className="btn btn-sm btn-quiet" type="submit" disabled={busy || !freeName.trim()}>
                Serbest bırak
              </button>
            </form>
            {freed && (
              <p className="small" role="status">
                {freed}
              </p>
            )}
          </>
        )}
      </div>
      {confirmFree && (
        <ConfirmDialog title="Adı serbest bırak?" confirmLabel="Sil ve serbest bırak" danger onConfirm={() => void release()} onCancel={() => setConfirmFree(false)}>
          “{freeName.trim()}” adlı eşitleme hesabının bütün dosyaları sunucudan silinir. Bu geri alınamaz.
        </ConfirmDialog>
      )}
    </details>
  )
}
