import { useState } from 'react'

/**
 * iPhone has no "Share → Kelime Koçu" for web apps; a Shortcut fills the gap. Step-by-step
 * instructions (action names in Turkish and English, as iOS shows either) and the address to
 * paste. Kept as instructions: a ready-made shortcut file can't be checked here on a phone.
 */
export function IosShortcut() {
  const [copied, setCopied] = useState<string | null>(null)
  const base = `${location.origin}/?`
  const copy = (kind: 'add' | 'sentence') => {
    void navigator.clipboard?.writeText(`${base}${kind}=`)
    setCopied(kind)
    setTimeout(() => setCopied(null), 2000)
  }
  return (
    // Closed until wanted: five steps of instructions most people need once.
    <details className="card ios-shortcut">
      <summary>
        <span className="section-title">iPhone ve iPad: paylaşarak ekleme</span>
        <span className="small muted">Bir kere kurulan kısa bir Kestirme, beş adım.</span>
      </summary>
      <div className="stack mt-3">
      <p className="small muted">
        iPhone, web uygulamalarını Paylaş menüsüne koymuyor. Bir kere kuracağın kısa bir Kestirme ile her uygulamada (Safari, Kindle, Notlar…) seçtiğin metni
        Paylaş → <strong>Kelime Koçu'na ekle</strong> ile gönderebilirsin.
      </p>
      <ol className="shortcut-steps small">
        <li>
          <strong>Kestirmeler</strong> uygulamasını aç, sağ üstteki <strong>+</strong> ile yeni kestirme oluştur; adını "Kelime Koçu'na ekle" yap.
        </li>
        <li>
          Alttaki <strong>ⓘ</strong> (Ayrıntılar) → <strong>Paylaşma Ekranında Göster</strong>'i aç. Girdi türlerinden yalnızca <em>Metin</em> kalsın.
        </li>
        <li>
          Eylem ekle: <strong>URL'yi Kodla</strong> (<em>Encode URL</em>). Girdi olarak <em>Kestirme Girdisi</em> seçili olsun.
        </li>
        <li>
          Eylem ekle: <strong>Metin</strong> (<em>Text</em>). İçine aşağıdaki adresi yapıştır, hemen arkasına değişken olarak <em>Kodlanmış URL</em>'yi ekle.
          <div className="row mt-xs">
            <code className="shortcut-url">{base}add=</code>
            <button className="btn btn-sm btn-quiet" onClick={() => copy('add')}>
              {copied === 'add' ? 'Kopyalandı' : 'Kopyala'}
            </button>
          </div>
        </li>
        <li>
          Eylem ekle: <strong>URL'leri Aç</strong> (<em>Open URLs</em>). Bitti.
        </li>
      </ol>
      <p className="small">Bütün bir cümleyi cümle kartı olarak göndermek için aynı kestirmeyi "Cümleyi kaydet" adıyla bir kez daha kur, adresi şununla değiştir:</p>
      <div className="row">
        <code className="shortcut-url">{base}sentence=</code>
        <button className="btn btn-sm btn-quiet" onClick={() => copy('sentence')}>
          {copied === 'sentence' ? 'Kopyalandı' : 'Kopyala'}
        </button>
      </div>
      <p className="small muted">
        Not: Kestirme bağlantıyı Safari'de açar. iPhone'da ana ekrana eklenen uygulama ile Safari ayrı veri tutar; Safari'de de bir kez Ayarlar →
        Cihazlar arası eşitleme'den kodunu girersen, eklediğin kelimeler ana ekrandaki uygulamana da gelir.
      </p>
      </div>
    </details>
  )
}
