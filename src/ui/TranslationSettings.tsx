import { useEffect, useState } from 'react'
import { translationUsage } from '../data/translate'
import { Help } from './SettingHelp'

/** Sentence translation (DeepL through the app's server): whether it is on, and this month's use. */
export function TranslationSettings() {
  const [usage, setUsage] = useState<{ count: number; limit: number } | null | undefined>(undefined)
  useEffect(() => {
    let live = true
    void translationUsage().then((u) => live && setUsage(u))
    return () => {
      live = false
    }
  }, [])
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
      ) : (
        <p className="small muted">Şu an kullanılamıyor (çevrimdışı ya da sunucuda kurulmamış). Kapalıyken uygulamanın geri kalanı aynen çalışır.</p>
      )}
    </section>
  )
}
