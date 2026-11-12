# İlk kullanım · 01

12 Kasım 2026. Mevcut üç başlangıç adımını koruyan bağımsız tasarım paketi.

**Önizleme:** `index.html`. **Toplu ekranlar:** `galeri.html`. Gerekirse bu klasörde `python -m http.server 4204`.

## Hazır olanlar

- **Hoş geldin → Dil → Hedef:** üç adım, tek ana eylem.
- Önceden seçilen dilin hazır gelmesi; EN/FR/ES seçimi ve dile göre vurgu.
- Süre 5/10/15/20/30dk ve yeni kelime 3/5/8/12 seçenekleri. Varsayılanlar kaynakla aynı: 10dk ve 5 yeni kelime.
- Ad isteğe bağlı; boş adla tamamlama. Geri/ileri seçimleri korur.
- Başlangıçtan sonra ilk kelimeye geçiş. Bu, dördüncü onboarding adımı değildir.
- Bir kelimede test daveti yok. Kaynaktaki en az 5 kelime koşulunun sağlandığı örnekte isteğe bağlı gramer testi daveti ve Şimdi değil durumu.
- Dokuz örnek görünüm; mobil/masaüstü, koyu tema ve sakin seçenek.

Bu prototip gerçek ayar/kelime/seviye kaydı yapmaz. Test sorusu, CEFR sonucu veya sertifika üretmez. Seçimler yalnız sekmede tutulur. Gerçek localStorage anahtarları okunup değiştirilmez; önceden seçili dil durumu inceleme seçicisinden gösterilir.

Yeni raster çizim üretilmedi. Önceki filiz SVG'lerinin 0/3/6 görselleri karşılama metaforu olarak yeniden kullanıldı. Bunlar kullanıcı ilerlemesi veya günlük hedefi tamamladığı iddiası değildir. Fontlar ve ikonlar önceki paketlerden; lisanslar assets içinde.

## Dosyalar

- `index.html`, `app.js`, `style.css`: etkileşimli akış.
- `galeri.html`: seçilmiş ekranlar.
- `DURUMLAR.json`: dokuz inceleme durumu.
- `BILESEN-SOZLESMESI.md`: seçim/odak/ilk kelime/test kuralları.
- `CLAUDE-DEVIR.md`: kaynak dosyalar ve korunacak davranışlar.
- `KAYNAKLAR.json`: incelenen kod sürümü/dosya kimlikleri.
- `DOGRULAMA.json`: yerel kontroller ve sınırları.
- `onizlemeler/`: mobil, masaüstü, koyu tema ve pano.

Canlı üretim ekranıyla karşılaştırma, gerçek telefon sanal klavyesi ve ekran okuyucu testi yapılmadı. P0 canlı doğrulaması ve üretim entegrasyonu ayrı iş olarak bekliyor.
