import { useEffect, useState } from 'react'
import { fillTranslations, missingTranslations } from '../data/fillTranslations'
import { translationUsage } from '../data/translate'
import { showToast } from './toastFeed'
import { Help } from './SettingHelp'

/** Sentence translation (DeepL through the app's server): whether it is on, and this month's use. */
export function TranslationSettings({ onFilled }: { onFilled?: () => void }) {
  const [usage, setUsage] = useState<{ count: number; limit: number } | null | undefined>(undefined)
  const [missing, setMissing] = useState(0)
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null)
  const [round, setRound] = useState(0)
  useEffect(() => {
    let live = true
    void translationUsage().then((u) => live && setUsage(u))
    void missingTranslations().then((m) => live && setMissing(m.length))
    return () => {
      live = false
    }
  }, [round])
  const fill = async () => {
    setProgress({ done: 0, total: missing })
    const r = await fillTranslations((done, total) => setProgress({ done, total }))
    setProgress(null)
    setRound((n) => n + 1)
    onFilled?.()
    showToast(r.stopped ? `${r.filled} cümle çevrildi; durdu: ${r.stopped}` : `${r.filled} cümlenin Türkçesi eklendi; çeviri alıştırmaları açıldı.`, undefined, 5000, r.stopped ? 'info' : 'success')
  }
  return (
    <section className="card stack">
      <h2 className="section-title">Cümle çevirisi</h2>
      <Help text='Örnek cümlelerin, kaydettiğin cümlelerin ve cümle kartlarının Türkçesini DeepL ile getirir: "Türkçesi" alanlarının yanında "Çevir" düğmesi çıkar, okurken kaydettiğin cümle çevirisiyle gelir. Ayarlaman gereken bir şey yok; aynı cümle bir kez çevrilir.' />
      {usage === undefined ? (
        <p className="small muted">Kontrol ediliyor…</p>
      ) : usage ? (
        <div className="row">
          <span className="pill stage-5">Açık</span>
          <span className="small muted">
            Bu ay {usage.count.toLocaleString('tr-TR')} / {usage.limit.toLocaleString('tr-TR')} karakter
          </span>
        </div>
      ) : null}
      {usage && missing > 0 && (
        <div className="row">
          <span className="small">
            Kelimelerinin örneklerinde ve cümle kartlarında <strong>{missing}</strong> cümlenin Türkçesi yok.
          </span>
          <button type="button" className="btn btn-sm" onClick={fill} disabled={!!progress}>
            {progress ? `Çevriliyor… ${progress.done}/${progress.total}` : 'Eksikleri doldur'}
          </button>
        </div>
      )}
      {usage === null ? (
        <p className="small muted">Şu an kullanılamıyor (çevrimdışı ya da sunucuda kurulmamış). Kapalıyken uygulamanın geri kalanı aynen çalışır.</p>
      ) : null}
    </section>
  )
}
