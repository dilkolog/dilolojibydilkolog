import { Help } from './SettingHelp'
import { useAccess } from '../account/accessContext'
import { useAi } from '../aiContext'
import { WandIcon } from '../shared/icons'
import { unavailableNote } from '../shared/serviceNote'

/** The AI layer: on by itself for an approved account (the calls go through the site's own /api/ai: no key, no model, no budget to pick; the site holds the limits). When it is on there is nothing to show; the card only explains why it is off. */
export function AiSettings() {
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
      ) : apiKey ? null : (
        <p className="note" role="status">
          {level === 'kapali'
            ? 'YZ özellikleri hesabın için kapalı (düzeyi site sahibi belirler).'
            : unavailableNote('YZ')}
        </p>
      )}
    </section>
  )
}
