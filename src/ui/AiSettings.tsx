import { Help } from './SettingHelp'
import { showToast } from './toastFeed'
import { useEffect, useState, type FormEvent } from 'react'
import { AI_MODELS, AiError, FEATURE_NAME, modelInfo, monthKey, testKey, type AiFeature, type MonthUsage } from '../ai'
import type { Settings } from '../data/db'
import { db } from '../data/instance'
import { useAi } from './aiContext'
import { SparkleIcon } from './icons'

const LIMITS = [0, 2, 5, 10, 20]
const usd = (x: number) => `$${x < 1 ? x.toFixed(3) : x.toFixed(2)}`.replace('.', ',')

/** Turning the AI layer on/off. The key stays in this browser and is excluded from backups. */
export function AiSettings({ settings, onChange }: { settings: Settings; onChange: (s: Settings) => void }) {
  const [usage, setUsage] = useState<Record<string, MonthUsage>>({})
  useEffect(() => {
    db.getAiUsage().then(setUsage)
  }, [settings])
  const thisMonth = usage[monthKey(new Date())]
  const months = Object.keys(usage).sort().reverse()
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
      showToast('Anahtar çalışıyor, AI özellikleri açıldı.')
    } catch (err) {
      setStatus({ ok: false, text: err instanceof AiError ? err.message : 'Anahtar doğrulanamadı.' })
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="section card stack">
      <h2 className="section-title row gap-2">
        <SparkleIcon size={20} className="icon-star" /> AI yardımcısı
      </h2>
      <Help text={'Kelime eklerken anlamı, örnek cümleyi ve kalıpları doldurur, cümlelerini değerlendirir. Açıkken ayrıca metinden çıkardığın kelimeler toplu doldurulur ve "kendi cümleni kur" alıştırması açılır. Kapalıyken uygulamanın geri kalanı aynen çalışır.'} />
      {apiKey ? (
        <div className="row">
          <span className="pill stage-5">Açık</span>
          <span className="small muted">Anahtar ••••{apiKey.slice(-4)}</span>
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
            <Help text="console.anthropic.com adresinden alınır. Yalnızca bu tarayıcıda saklanır, yedek dosyasına yazılmaz ve sadece Anthropic'e gönderilir. Kullanım kadar ücretlendirilir; tek kişilik kullanımda genelde ayda birkaç dolar." />
          </div>
          <div>
            <button className="btn" type="submit" disabled={busy || !draft.trim()}>
              {busy ? 'Kontrol ediliyor…' : 'Kaydet ve dene'}
            </button>
          </div>
        </form>
      )}
      <div className="field">
        <label>Model</label>
        <div className="seg-group" role="radiogroup" aria-label="Model">
          {AI_MODELS.map((m) => (
            <button key={m.id} type="button" role="radio" className="seg-btn" aria-checked={settings.aiModel === m.id} onClick={() => onChange({ ...settings, aiModel: m.id })}>
              {m.label}
            </button>
          ))}
        </div>
        <span className="help">
          {modelInfo(settings.aiModel).note} Fiyat: 1 milyon token başına giriş ${modelInfo(settings.aiModel).input}, çıkış ${modelInfo(settings.aiModel).output}.
        </span>
      </div>
      <div className="field">
        <label>Aylık bütçe sınırı</label>
        <div className="seg-group" role="radiogroup" aria-label="Aylık bütçe sınırı">
          {LIMITS.map((l) => (
            <button key={l} type="button" role="radio" className="seg-btn" aria-checked={settings.aiMonthlyLimit === l} onClick={() => onChange({ ...settings, aiMonthlyLimit: l })}>
              {l ? `$${l}` : 'Sınırsız'}
            </button>
          ))}
        </div>
        <span className="help">Sınıra ulaşınca ay sonuna kadar AI istekleri durur; uygulamanın geri kalanı çalışmaya devam eder.</span>
      </div>
      <div className="stack ai-usage">
        <strong>Bu ayki kullanım</strong>
        {thisMonth ? (
          <>
            <p className="small">
              {thisMonth.requests} istek · {usd(thisMonth.cost)}
              {settings.aiMonthlyLimit > 0 && ` / $${settings.aiMonthlyLimit}`}
            </p>
            {settings.aiMonthlyLimit > 0 && (
              <div className="progress" role="progressbar" aria-label="Bu ayki bütçenin kullanılan kısmı" aria-valuenow={Math.round((thisMonth.cost / settings.aiMonthlyLimit) * 100)} aria-valuemin={0} aria-valuemax={100}>
                <div style={{ width: `${Math.min(100, (thisMonth.cost / settings.aiMonthlyLimit) * 100)}%` }} />
              </div>
            )}
            <ul className="plain small ai-features">
              {(Object.entries(thisMonth.features) as [AiFeature, { requests: number; cost: number }][])
                .sort((a, b) => b[1].cost - a[1].cost)
                .map(([f, v]) => (
                  <li key={f}>
                    <span>{FEATURE_NAME[f]}</span>
                    <span className="muted">
                      {v.requests} istek · {usd(v.cost)}
                    </span>
                  </li>
                ))}
            </ul>
          </>
        ) : (
          <p className="small muted">Bu ay henüz AI isteği yok.</p>
        )}
        {months.length > 1 && (
          <p className="small muted">
            Önceki aylar: {months.filter((m) => m !== monthKey(new Date())).slice(0, 4).map((m) => `${m}: ${usd(usage[m].cost)}`).join(', ')}
          </p>
        )}
        <p className="small muted">Tutarlar, Anthropic'in döndürdüğü token sayılarından hesaplanan tahminlerdir; kesin fatura Anthropic Console'dadır.</p>
      </div>
      {status && (
        <p className={status.ok ? 'notice' : 'error'} role="status">
          {status.text}
        </p>
      )}
    </section>
  )
}
