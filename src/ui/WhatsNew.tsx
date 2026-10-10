import { useState } from 'react'
import { CloseIcon, SparkleIcon } from './icons'
import { markWhatsNewSeen, whatsNewDue, whatsNewSeen } from './whatsNew'

/**
 * A short, closable card on Today about what is new: where to find it, one tap away. It shows once
 * for each batch of news (and only to someone with some words already), and closing it keeps it away.
 */
export function WhatsNew({ words, onReading, onPractice, onGrammar }: { words: number; onReading: () => void; onPractice: () => void; onGrammar: () => void }) {
  const [open, setOpen] = useState(() => whatsNewDue(whatsNewSeen(), words))
  if (!open) return null
  const close = () => {
    markWhatsNewSeen()
    setOpen(false)
  }
  const go = (to: () => void) => () => {
    close()
    to()
  }
  return (
    <section className="card stack whats-new" aria-label="Yenilikler">
      <div className="row justify-between">
        <h2 className="section-title row gap-2">
          <SparkleIcon size={18} className="icon-star" /> Yenilikler
        </h2>
        <button type="button" className="icon-btn icon-btn-sm" aria-label="Kapat" title="Kapat" onClick={close}>
          <CloseIcon size={16} />
        </button>
      </div>
      <ul className="whats-new-list">
        <li>
          <button type="button" className="link" onClick={go(onGrammar)}>
            Dilbilgisi soruları
          </button>
          <span className="small muted"> Pratik → Oyunlar'da: boşluk doldur, seç, hatalı kelimeyi bul; kuralı Türkçe gör.</span>
        </li>
        <li>
          <button type="button" className="link" onClick={go(onReading)}>
            Sesli kitaplar
          </button>
          <span className="small muted"> Okuma'da: kamu malı kitap bölümlerini kendi okumasıyla dinleyerek oku.</span>
        </li>
        <li>
          <button type="button" className="link" onClick={go(onPractice)}>
            Telaffuz çalışması
          </button>
          <span className="small muted"> Pratik'te: puanı düşük kalan kelimeleri tek tek söyle (Azure anahtarıyla).</span>
        </li>
        <li>
          <strong>Bana özel cümleler</strong>
          <span className="small muted"> Kelime sayfasında: ilgi alanlarına göre 3 örnek cümle öneri (yapay zekâ, onaylı hesapla).</span>
        </li>
        <li>
          <strong>Excel dışa aktarma ve "Önceki hâle dön"</strong>
          <span className="small muted"> Ayarlar → Veriler'de.</span>
        </li>
      </ul>
    </section>
  )
}
