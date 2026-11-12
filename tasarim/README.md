# Diloloji tasarım klasörü

> **Claude için başlangıç:** [CLAUDE-ONCE-OKU.md](CLAUDE-ONCE-OKU.md). Her paketin içinde `README.md`, `PAKET.json` ve ayrıntılı devir notu vardır. Dosya dizini: [DOSYA-DIZINI.json](DOSYA-DIZINI.json).

Tasarım sorumluluğu: bu çalışma. Uygulama entegrasyonu: Claude ile ilerletilebilir.

İlk paket: **Monki / 01**, 9 Kasım 2026.

- `monki-01/index.html`: altı tasarımın galerisi; açık, koyu, dil zeminleri ve 128 px önizleme.
- `monki-01/toplu-onizleme.jpg`: tek görselde tüm tasarımlar.
- `monki-01/gorseller/`: yüksek çözünürlüklü, şeffaf PNG kaynakları.
- `monki-01/webp/`: alfa kanallı, en uzun kenarı 640 px uygulama adayları.
- `monki-01/CLAUDE-DEVIR.md`: kullanım yerleri, boyutlar ve entegrasyon notları.
- `monki-01/manifest.json`: dosya ve kullanım eşleştirmesi.

Mevcut çizimler incelenerek aynı konudaki yeni kafe, otel, doktor veya kitaplık görselleri yerine; dinleyen, tekrar davet eden ve geri dönen kullanıcıyı karşılayan pozlara öncelik verildi. Bunlar önerilen eklemelerdir; ürünün tüm görsel ihtiyaçlarının tamamlandığı anlamına gelmez.

Üretim: Image Gen, mevcut `monki-wave.webp` ve `monki-think.webp` referanslarıyla. Altı seçili çizim bu pakete alındı; elenen üretimler kaynak üretim klasöründe korundu. Paket uygulamaya bağlanmadı ve yayımlanmadı.

## İkonlar / 01

103 arayüz ikonu incelendi; altı SVG alternatif `ikonlar-01/` klasöründe. `index.html` karşılaştırma galerisi; `CLAUDE-DEVIR.md` kullanım ve entegrasyon notları. Mevcut uygulama ikonları değiştirilmedi.

## Görev paketi / 01

Main’deki docs/chatgpt görevlerine göre 12 çizim üretildi. `gorev-paketi-01/index.html`: galeri; `toplu-onizleme.jpg`: toplu görünüm; `CLAUDE-TESLIM.md`: boyutlar ve işleme notları. Ham PNG’ler `docs/gelen-gorseller/` içinde. `gorev-paketi-01.zip` kaynakları da içerir.

## Monki paneli ve görsel denetimi / 10 Kasım 2026

- `monki-panel-01/index.html`: etkileşimli sohbet paneli önerisi; `galeri.html`: 12 görünüm ve karşılaştırma.
- `monki-denetim-01/index.html`: main’deki 366 dosyanın taraması ve 18 yeniden tasarım adayı. 17 illüstrasyon + 1 statik animasyon ana karesi.
- `monki-yenileme-01.zip`: iki paket, eski/yeni karşılaştırmaları ve yeni PNG kaynakları.

Üretim kodu değiştirilmedi. Canlı dağıtım sürümü ayrıca doğrulanmadı; kaynak main `bcf19328`.

## Monki animasyon denemesi / 01

`monki-animasyon-01/index.html`: etkileşimli el sallama denemesi. GIF, WebP, MP4, şeffaf kaynak katmanları ve hareket koordinatları aynı klasörde; `monki-animasyon-01.zip` tüm dosyaları içerir.

## Filiz büyümesi / 01

Kullanıcının yeni önceliği: tohumdan çiçeğe büyüme animasyonu. `filiz-buyume-01/index.html`: kontrollü önizleme. Mevcut -1/0–5 öğrenme aşamalarına uygun yedi durum, SVG kaynakları, GIF/WebP/MP4 ve Claude’a devir notları. Üretime bağlanmadı.

## Monki son rötuşlar / 01

`monki-son-rotuslar-01/index.html`: dinleme resmi, göz kırpma, kutlama ve el sallama v2. Bu paket ilgili eski adaylardan daha yenidir; kaynak ve aktarım notları paket içinde.

## Avatar alanı incelemesi

[avatar-denetim-01/README.md](avatar-denetim-01/README.md): ekran görüntüsü ve güncel main üzerinden 42 görselin karşılaştırılması; çizim, kadraj, kilitli koleksiyon ve seçim akışı notları. Bu paket incelemedir; uygulanmış ekran veya yeni çizim içermez.

## 40 figürlük yeni avatar koleksiyonu

[avatar-koleksiyonu-01/index.html](avatar-koleksiyonu-01/index.html): 26 mevcut figür yeniden çizildi, 14 yeni figür eklendi. Monki avatarı yok. [Galeri ve önce/sonra](avatar-koleksiyonu-01/galeri.html), ayrı PNG/WebP dosyaları ve Claude devir notları pakette.

## Öğrenme deneyimi / 01 — altı alan

[ogrenme-deneyimi-01/index.html](ogrenme-deneyimi-01/index.html): filiz ve öğrenme yolu, üç ders sonucu, rozet koleksiyonu, altı boş/hata durumu, sekiz pratik ikonu, kelime/deyim kartları. 12 yeni çizim PNG/WebP; önceki yedi filiz aşaması yeniden kullanıldı. [Toplu pano](ogrenme-deneyimi-01/galeri.html) ve ayrıntılı Claude devir notları pakette. Üretim uygulamasına bağlanmadı.

## Rozetlerin tam incelemesi / 01

[rozet-yenileme-01/index.html](rozet-yenileme-01/index.html): 93 başarı tanımı, 40 başarı çizimi ve 8 amblem incelendi. 10 mevcut çizim için 12 alternatif; diğer 38 varlık korunuyor. 32/48/96px önce–sonra, mobil/koyu tema ve gerçek stat eşlemeleri hazır. [12 yeni çizim](rozet-yenileme-01/galeri.html). Üretime bağlanmadı.

## Beş alan için tasarım iş planı / 01

[tasarim-is-plani-01/IS-PLANI.md](tasarim-is-plani-01/IS-PLANI.md): ilk kullanım, konuşma–dinleme, okuma, Bugün ve ayarlar ayrı incelendi. 17 kimlikli iş, öncelikler, bağımlılıklar ve kabul ölçütleri hazır. Kod/akış incelemesi; canlı görsel doğrulama başlangıç işi. Bu teslim plan içerir, yeni ekran veya üretim değişikliği içermez.

## Konuşma–dinleme / 01

[konusma-dinleme-01/index.html](konusma-dinleme-01/index.html): telaffuz, üç tur dinleme, gölgeleme ve kelime kaydı için 4 ayrı akış; 15 ortak durum. Mikrofon ve puanlama simülasyonu açıkça işaretli. Yerel ses dosyası ve cihaz sesiyle dinleme önizlemesi, mobil/açık/koyu/sakin kontrolleri hazır. [Durum panosu](konusma-dinleme-01/durumlar.html). Claude aktarım notları pakette; üretime bağlanmadı.

## Okuma deneyimi / 01

[okuma-deneyimi-01/index.html](okuma-deneyimi-01/index.html): 17 durum, ana araçlar ve çalışma modları, masaüstü kelime yan paneli/mobil alt panel, çeviri/çoklu seçim/çıkarım, kütüphane/hata/boşluk ve okuma sonu. [Toplu ekranlar](okuma-deneyimi-01/galeri.html). Özgün kısa hikâye ve mini sözlük; gerçek üretim entegrasyonu bekliyor.

## Bugün deneyimi / 01

[bugun-deneyimi-01/index.html](bugun-deneyimi-01/index.html): 10 durum; ana görev/kısa tur/yarım oturum, kapsam seçimi, günlük filiz ve ayrı beceri süresi. Gün tamamken yarım turun devam edebilmesi korundu. [Toplu ekranlar](bugun-deneyimi-01/galeri.html). Sayılar ve ilerleme simülasyondur; gerçek veri/planlayıcı entegrasyonu yapılmadı.

## İlk kullanım / 01

[ilk-kullanim-01/index.html](ilk-kullanim-01/index.html): üç başlangıç adımı, dokuz örnek durum, dil devralma, bağımsız süre/yeni kelime hedefleri, isteğe bağlı ad ve ilk kelimeye geçiş. Beş kelime sonrası koşullu seviye testi daveti korunuyor. [Toplu ekranlar](ilk-kullanim-01/galeri.html). Gerçek ayar/veri/test işlemi yok; üretim aktarımı bekliyor.

## 12 Kasım · Ayarlar ve profil tamamlandı

[Ayarlar paketi](ayarlar-deneyimi-01/README.md) · [Etkileşimli önizleme](ayarlar-deneyimi-01/index.html) · [Galeri](ayarlar-deneyimi-01/galeri.html) · [ZIP](ayarlar-deneyimi-01.zip). 8 grup + Yardım, 17 senaryo, 37 ekran; arama, gelişmiş tercihler, profil ve veri işlemleri görsel düzeni. Beş alanın yerel tasarım prototipi hazır; canlı entegrasyon doğrulaması bekliyor.
