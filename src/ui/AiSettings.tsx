import { useState, type FormEvent } from 'react'
import { AI_MODEL, AiError, testKey } from '../ai'
import { useAi } from './aiContext'
import { SparkleIcon } from './icons'

/** Turning the AI layer on/off. The key stays in this browser and is excluded from backups. */
export function AiSettings() {
  const { apiKey, setApiKey } = useAi()
  const [draft, setDraft] = useState('')
  const [status, setStatus] = useState<{ ok: boolean; text: string } | null>(null)
  const [busy, setBusy] = useState(false)

  const save = async (e: FormEvent) => {
    e.preventDefault()
    const key = draft.trim()
    if (!key) return
    setBusy(true)
    setStatus(null)
    try {
      await testKey(key)
      await setApiKey(key)
      setDraft('')
      setStatus({ ok: true, text: 'Anahtar çalışıyor, AI özellikleri açıldı.' })
    } catch (err) {
      setStatus({ ok: false, text: err instanceof AiError ? err.message : 'Anahtar doğrulanamadı.' })
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="section card stack">
      <h2 className="section-title row" style={{ gap: '0.5rem' }}>
        <SparkleIcon size={20} className="icon-star" /> AI yardımcısı
      </h2>
      <p className="small muted">
        Açıkken: kelime eklerken anlam, örnek cümle ve kalıplar otomatik dolar; metinden çıkardığın kelimeler toplu
        doldurulur; "kendi cümleni kur" alıştırması açılır ve cümlelerin değerlendirilir. Kapalıyken uygulamanın geri
        kalanı aynen çalışır.
      </p>
      {apiKey ? (
        <div className="row">
          <span className="pill stage-5">Açık</span>
          <span className="small muted">
            Model: {AI_MODEL}. Anahtar ••••{apiKey.slice(-4)}
          </span>
          <button className="btn btn-quiet" onClick={() => setApiKey(null)}>
            Kapat ve anahtarı sil
          </button>
        </div>
      ) : (
        <form className="stack" onSubmit={save}>
          <div className="field">
            <label htmlFor="ai-key">Anthropic API anahtarı</label>
            <input
              id="ai-key"
              className="input"
              type="password"
              autoComplete="off"
              placeholder="sk-ant-…"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
            />
            <span className="help">
              console.anthropic.com adresinden alınır. Yalnızca bu tarayıcıda saklanır, yedek dosyasına yazılmaz ve
              sadece Anthropic'e gönderilir. Kullanım kadar ücretlendirilir; tek kişilik kullanımda genelde ayda birkaç
              dolar.
            </span>
          </div>
          <div>
            <button className="btn" type="submit" disabled={busy || !draft.trim()}>
              {busy ? 'Kontrol ediliyor…' : 'Kaydet ve dene'}
            </button>
          </div>
        </form>
      )}
      {status && (
        <p className={status.ok ? 'notice' : 'error'} role="status">
          {status.text}
        </p>
      )}
    </section>
  )
}
