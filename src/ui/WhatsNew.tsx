import { useState } from 'react'
import { CloseIcon, SparkleIcon } from './icons'
import { markWhatsNewSeen, whatsNewDue, whatsNewSeen } from './whatsNewLogic'

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
          <strong>Kök ve ekler</strong>
          <span className="small muted"> Kelime sayfası → Aile ve diğer diller'de: kelime parçalarına ayrılır (un- · comfort · -able), aynı kökten türeyenler ağaç olarak çıkar, her ekin Türkçe karşılığıyla.</span>
        </li>
        <li>
          <button type="button" className="link" onClick={go(onGrammar)}>
            Ek avı ve Metin akışı
          </button>
          <span className="small muted"> Pratik → Oyunlar'da: bir kelimeyi türevine çeviren eki seç; paragraftaki eksik bağlaçları (ama, bu yüzden, -se de) yerine koy.</span>
        </li>
        <li>
          <button type="button" className="link" onClick={go(onGrammar)}>
            Dilbilgisi soruları
          </button>
          <span className="small muted"> Pratik → Oyunlar'da: boşluk doldur, seç, hatalı kelimeyi bul; kuralı Türkçe gör.</span>
        </li>
        <li>
          <button type="button" className="link" onClick={go(onReading)}>
            Çıkarım modu
          </button>
          <span className="small muted"> Okuma'da "Çıkarım": bilinmeyen kelimelerin bir kısmı gizlenir; anlamını cümleden tahmin et, sonra dokun.</span>
        </li>
        <li>
          <strong>Kör nokta röntgeni</strong>
          <span className="small muted"> İlerleme → Genel bakış'ta: en çok takıldığın yerler, yanında çalışacağın oyunla. Bugün'de de her gün bir "zihin tohumu".</span>
        </li>
        <li>
          <strong>Refleks turu, Tuzak kelimeler ve Kayıt farkı</strong>
          <span className="small muted"> Pratik → Oyunlar'da: günlük kalıpları 3 saniyede seç; benzeyip başka şey diyen kelimelere (kelime sayfasında ⚠ çipi) düşme; sokakta, standart ve resmî söyleyişi ayırt et.</span>
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
      </ul>
    </section>
  )
}
