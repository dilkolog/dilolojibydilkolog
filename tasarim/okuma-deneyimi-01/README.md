# Okuma deneyimi · 01

12 Kasım 2026. Tasarım iş planındaki okuma alanı için etkileşimli, bağımsız paket. Üretim uygulamasına bağlanmadı.

**Başlangıç:** `index.html`. **Toplu bakış:** `galeri.html`. Yerel sunucu gerekirse bu klasörde `python -m http.server 4202`.

## Ne tasarlandı?

- Metni öne çıkaran okuyucu; ana çubukta çeviri/dinleme/görünüm, ayrı menüde çalışma modları.
- Masaüstünde kelime yan paneli, telefonda en fazla 66dvh yüksekliğinde kaydırılabilen alt panel; kapat düğmesi ve aşağı sürükleme kulpu.
- Sözcük anlamı → ses/sözlük → ekle → karşılaşılan cümle → diğer işlemler sırası.
- Çoklu seçim; biliyorum/bilmiyorum/yok say ayrımı; çıkarımda sözcüğü önce açma.
- Metinsiz/metinli dinleme turları; dikte taslağı, örnek çekimler ve gölgeleme yerleşimi.
- Kütüphane, gerçek boşluk yerine ayrı yükleme hatası, yükleniyor, aramada sonuç yok ve okuma sonu.
- Büyük yazı, ferah satır, sütun genişliği, sepya, sans yazı ve paragraf odağı.

Durum seçicisinde 17 görünüm var. Seçimler ve metinler yalnız sekmede tutulur. “Ekle” gerçek sözlüğe yazmaz; gerçek YZ/çeviri/sözlük/ortak okuma servisi çağrılmaz. Dinleme cihazda İspanyolca voice varsa çalışır. Gölgeleme kaydı ve dikte puanlaması simülasyon/yerleşimdir; otomatik başarı puanı üretilmez.

## Örnek içerik

`Una pausa en el barrio` bu çalışma için yazılmış 138 sözcüklük özgün kısa metindir. 10 cümle, 5 paragraf, Türkçe karşılıklar ve 17 sözcüklük mini sözlük data.js içinde. Düzey sertifikası veya haricî sözlük doğrulaması iddiası yok. Kullanıcının eklediği metinler için çeviri/anlam uydurulmaz. Kitap/PDF'den metin alınmadı.

## Dosyalar

- `index.html`, `app.js`, `data.js`, `style.css`: etkileşimli önizleme.
- `galeri.html`: başlıca ekranların panosu.
- `BILESEN-SOZLESMESI.md`: etkileşim ve durum kuralları.
- `CLAUDE-DEVIR.md`: hedef kaynaklar, korunacak sözleşmeler, uygulanmayacak test araçları.
- `KAYNAKLAR.json`: kod inceleme sürümü ve kaynak dosyaları.
- `DURUMLAR.json`: 17 önizleme durumu.
- `DOGRULAMA.json`: yerel kontrol sonuçları ve sınırları.
- `onizlemeler/`: masaüstü/mobil/koyu tema/büyük yazı görüntüleri.

Yeni raster çizim üretilmedi. Önceki pratik ikonları ve yerel Lexend/Literata fontları yeniden kullanıldı; lisanslar assets içinde.

Canlı site ekranlarıyla önce/sonra karşılaştırması yapılmadı. Mevcut main kodunun akışları incelendi; bu tasarım onların yerini alacak çalışan üretim bileşeni olarak sunulmaz. Gerçek veri, servis ve cihaz doğrulaması entegrasyonda tamamlanmalı.
