import { Help } from './SettingHelp'
import { useEffect, useState } from 'react'
import { AI_MODELS, FEATURE_NAME, modelInfo, monthKey, type AiFeature, type MonthUsage } from '../ai'
import type { Settings } from '../data/db'
import { db } from '../data/instance'
import { useAccess } from './accessContext'
import { useAi } from './aiContext'
import { LEVEL_NAME, LEVEL_NOTE } from '../ai/levels'
import { WandIcon } from './icons'
import { Sticker } from './Sticker'

const LIMITS = [0, 2, 5, 10, 20]
const MONKI_LIMITS = [0, 10, 25, 50, 100]
const usd = (x: number) => `$${x < 1 ? x.toFixed(3) : x.toFixed(2)}`.replace('.', ',')

/** The AI layer: on by itself for an approved account (the calls go through the site's own /api/ai, no key to type), plus the model, the limits and the use. */
export function AiSettings({ settings, onChange }: { settings: Settings; onChange: (s: Settings) => void }) {
  const [usage, setUsage] = useState<Record<string, MonthUsage>>({})
  useEffect(() => {
    db.getAiUsage().then(setUsage)
  }, [settings])
  const thisMonth = usage[monthKey(new Date())]
  const months = Object.keys(usage).sort().reverse()
  const { apiKey, needsApproval, level } = useAi()
  const { status: access } = useAccess()
  return (
    <section className="section card stack">
      <h2 className="section-title row gap-2">
        <WandIcon size={20} className="icon-star" /> YZ yardımcısı
      </h2>
      <Help text={'Kelime eklerken anlamı, örnek cümleyi ve kalıpları doldurur, cümlelerini değerlendirir. Açıkken ayrıca metinden çıkardığın kelimeler toplu doldurulur ve "kendi cümleni kur" alıştırması açılır. Kapalıyken uygulamanın geri kalanı aynen çalışır. Onaylı hesaplarda kendiliğinden açıktır; anahtar girmen gerekmez.'} />
      {needsApproval ? (
        <p className="note" role="status">
          {access === 'signedOut'
            ? 'YZ özellikleri, site sahibinin onayladığı hesaplara açık. Ayarlar → Hesap bölümünden hesap oluşturursan başvurun ona gider.'
            : access === 'rejected'
              ? 'Hesabın YZ özellikleri için onaylanmadı.'
              : 'YZ özellikleri, site sahibinin onayladığı hesaplara açık. Hesabın onay bekliyor; onaylanınca kendiliğinden açılır, bir anahtar girmen gerekmez.'}
        </p>
      ) : apiKey ? (
        <>
          <div className="row">
            <span className="pill stage-5">Açık</span>
            <span className="small muted">Hesabınla birlikte hazır, anahtar girmen gerekmez.</span>
          </div>
          {level && (
            <p className="small muted" role="status">
              <strong>Düzeyin: {LEVEL_NAME[level]}.</strong> {LEVEL_NOTE[level]} Düzeyi site sahibi belirler.
            </p>
          )}
        </>
      ) : (
        <p className="note" role="status">
          {level === 'kapali'
            ? 'YZ özellikleri hesabın için kapalı (düzeyi site sahibi belirler).'
            : 'YZ şu an kullanılamıyor: internet yok ya da sunucuda henüz kurulmamış. Uygulamanın geri kalanı aynen çalışır.'}
        </p>
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
        <span className="help">Sınıra ulaşınca ay sonuna kadar YZ istekleri durur; uygulamanın geri kalanı çalışmaya devam eder.</span>
      </div>
      <div className="field">
        <label>Monki günlük soru sınırı</label>
        <div className="seg-group" role="radiogroup" aria-label="Monki günlük soru sınırı">
          {MONKI_LIMITS.map((l) => (
            <button key={l} type="button" role="radio" className="seg-btn" aria-checked={(settings.monkiDailyLimit ?? 0) === l} onClick={() => onChange({ ...settings, monkiDailyLimit: l })}>
              {l ? String(l) : 'Sınırsız'}
            </button>
          ))}
        </div>
        <span className="help">Bu cihazda bir günde Monki’ye en çok kaç mesaj gönderebileceğini sınırlar (her mesaj bir YZ isteğidir). Gece yarısı sıfırlanır.</span>
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
          <p className="small muted sticker-note">
            <Sticker name="think" size={32} />
            <span>Bu ay henüz YZ isteği yok.</span>
          </p>
        )}
        {months.length > 1 && (
          <p className="small muted">
            Önceki aylar: {months.filter((m) => m !== monthKey(new Date())).slice(0, 4).map((m) => `${m}: ${usd(usage[m].cost)}`).join(', ')}
          </p>
        )}
        <p className="small muted">Tutarlar, Anthropic'in döndürdüğü token sayılarından hesaplanan tahminlerdir; kesin fatura Anthropic Console'dadır.</p>
      </div>
    </section>
  )
}
