import { useEffect, useState, type FormEvent } from 'react'
import { db } from '../data/instance'
import { azure, testAzureKey } from './pronunciation'
import { Help } from './SettingHelp'
import { showToast } from './toast'

/** Azure Speech key + region for pronunciation scoring: entry, test, off. */
export function AzureSpeechSettings() {
  const [cfg, setCfg] = useState<{ key: string; region: string } | null>(azure.key && azure.region ? { key: azure.key, region: azure.region } : null)
  const [key, setKey] = useState('')
  const [region, setRegion] = useState('')
  const [busy, setBusy] = useState(false)
  const [status, setStatus] = useState<{ ok: boolean; text: string } | null>(null)
  useEffect(() => {
    void db.getSpeechKey().then((c) => c && setCfg(c))
  }, [])

  const check = async (k: string, r: string) => {
    setBusy(true)
    setStatus(null)
    try {
      await testAzureKey(k, r)
      return true
    } catch (err) {
      setStatus({ ok: false, text: err instanceof Error ? err.message : 'Azure anahtarı doğrulanamadı.' })
      return false
    } finally {
      setBusy(false)
    }
  }
  const save = async (e: FormEvent) => {
    e.preventDefault()
    const k = key.trim()
    const r = region.trim().toLowerCase().replace(/\s+/g, '')
    if (!k || !r || !(await check(k, r))) return
    await db.saveSpeechKey({ key: k, region: r })
    azure.key = k
    azure.region = r
    setCfg({ key: k, region: r })
    setKey('')
    setRegion('')
    showToast('Telaffuz puanlama açıldı.')
  }
  const off = async () => {
    await db.saveSpeechKey(null)
    azure.key = null
    azure.region = null
    setCfg(null)
    setStatus(null)
  }

  return (
    <div className="stack natural-voice">
      <span className="setting-text">
        <strong>Telaffuz puanlama (Azure)</strong>
        <Help text="Söylediğin kelimeyi ya da cümleyi puanlar: doğruluk, akıcılık, eksiksizlik ve kelime kelime renkler. Azure'un ücretsiz katmanı ayda 5 saat ses verir; bir deneme birkaç saniye sürer. Ses Microsoft'ta saklanmaz." />
      </span>
      {cfg ? (
        <div className="row">
          <span className="pill stage-5">Açık</span>
          <span className="small muted">
            Bölge {cfg.region} · anahtar ••••{cfg.key.slice(-4)}
          </span>
          <button
            className="btn btn-quiet btn-sm"
            disabled={busy}
            onClick={async () => {
              if (await check(cfg.key, cfg.region)) setStatus({ ok: true, text: 'Azure bağlantısı çalışıyor.' })
            }}
          >
            {busy ? 'Kontrol ediliyor…' : 'Dene'}
          </button>
          <button className="link small" onClick={off}>
            Kapat
          </button>
        </div>
      ) : (
        <form className="row" onSubmit={save}>
          <input className="input azure-key-input" type="password" autoComplete="off" placeholder="KEY 1" aria-label="Azure Speech anahtarı" value={key} onChange={(e) => setKey(e.target.value)} />
          <input className="input azure-region-input" autoComplete="off" placeholder="Bölge, ör. francecentral" aria-label="Azure bölgesi" value={region} onChange={(e) => setRegion(e.target.value)} />
          <button className="btn" type="submit" disabled={busy || !key.trim() || !region.trim()}>
            {busy ? 'Kontrol ediliyor…' : 'Kaydet ve dene'}
          </button>
        </form>
      )}
      {!cfg && <Help text="Azure portal → Speech kaynağın → Keys and Endpoint: KEY 1 ve Location/Region. Anahtar bu cihazda kalır, yedeğe ve eşitlemeye yazılmaz." />}
      {status && (
        <p className={status.ok ? 'notice' : 'error'} role="status">
          {status.text}
        </p>
      )}
    </div>
  )
}
