import { useEffect, useState } from 'react'
import { showToast } from './toast'
import { db } from '../data/instance'
import { generateSyncCode, normalizeCode, SyncNotAllowedError } from '../data/sync'
import { getSyncCode, NOT_ALLOWED, runSync, setSyncCode } from './syncRunner'
import { relativeTime } from './format'
import { RestorePoints } from './RestorePoints'

/** Sync between devices: start with a new code here, or enter the code from another device. */
export function SyncSettings() {
  const [code, setCode] = useState<string | null | undefined>(undefined)
  const [draft, setDraft] = useState('')
  const [shown, setShown] = useState(false)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null)
  const [at, setAt] = useState<Date | null>(null)

  const refresh = async () => {
    setCode(await getSyncCode())
    const v = (await db.meta.get('syncAt'))?.value as string | undefined
    setAt(v ? new Date(v) : null)
  }
  useEffect(() => {
    void refresh()
  }, [])

  const sync = async (fresh?: string) => {
    setBusy(true)
    setMessage(null)
    try {
      if (fresh) await setSyncCode(fresh)
      const r = await runSync(true)
      showToast(`Eşitlendi.${r && (r.received || r.sent) ? ` ${r.received} görsel/kayıt alındı, ${r.sent} gönderildi.` : ''}`)
    } catch (e) {
      if (fresh) await setSyncCode(null)
      setMessage({ ok: false, text: e instanceof SyncNotAllowedError ? NOT_ALLOWED : fresh ? 'Eşitlenemedi: kod yanlış olabilir ya da internet yok.' : 'Eşitlenemedi: internet bağlantısını kontrol et.' })
    } finally {
      setBusy(false)
      void refresh()
    }
  }

  if (code === undefined) return null
  return (
    <section className="card stack">
      <h2 className="section-title">Cihazlar arası eşitleme</h2>
      <p className="small muted">
        Bilgisayarında ve telefonunda aynı kelimeler ve ilerleme. Veriler bu cihazda eşitleme koduyla şifrelenir; sunucu içeriği göremez. İki cihazda da
        çalışırsan cevapların birleşir, hiçbiri kaybolmaz. API anahtarların eşitlenmez.
      </p>
      {code ? (
        <>
          <div className="row">
            <span className="pill stage-5">Açık</span>
            <span className="small muted">{at ? `Son eşitleme ${relativeTime(at)}` : 'Henüz eşitlenmedi'}</span>
            <button className="btn btn-sm" onClick={() => sync()} disabled={busy}>
              {busy ? 'Eşitleniyor…' : 'Şimdi eşitle'}
            </button>
          </div>
          <div className="row">
            <span className="small">
              Eşitleme kodun: <code className="sync-code">{shown ? code : '•••••-•••••-•••••-•••••'}</code>
            </span>
            <button className="link small" onClick={() => setShown(!shown)}>
              {shown ? 'Gizle' : 'Göster'}
            </button>
            {shown && (
              <button className="link small" onClick={() => navigator.clipboard?.writeText(code)}>
                Kopyala
              </button>
            )}
          </div>
          <p className="small muted">Diğer cihazında Ayarlar → Cihazlar arası eşitleme → "Kodumu gir" ile bu kodu yaz. Kodu kaybedersen eşitlenen verilere ulaşılamaz; bir yere not et.</p>
          <div>
            <button className="link small" onClick={async () => (await setSyncCode(null), void refresh())}>
              Bu cihazda eşitlemeyi kapat
            </button>
          </div>
          <RestorePoints />
        </>
      ) : (
        <>
          <div className="row">
            <button
              className="btn"
              disabled={busy}
              onClick={() => {
                setShown(true)
                void sync(generateSyncCode())
              }}
            >
              Eşitlemeyi başlat
            </button>
            <span className="small muted">İlk cihazında bunu seç; sana bir kod verilir.</span>
          </div>
          <div className="row">
            <input className="input sync-input" value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="Diğer cihazdaki kod: ABCDE-FGHIJ-…" aria-label="Eşitleme kodu" />
            <button className="btn btn-quiet" disabled={busy || normalizeCode(draft).length !== 20} onClick={() => sync(normalizeCode(draft).match(/.{5}/g)!.join('-'))}>
              Kodumu gir
            </button>
          </div>
        </>
      )}
      {message && (
        <p className={message.ok ? 'notice' : 'error'} role="status">
          {message.text}
        </p>
      )}
    </section>
  )
}
