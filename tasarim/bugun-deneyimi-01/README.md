# Bugün deneyimi · 01

12 Kasım 2026. Ana görev, kısa tur, kapsam seçimi ve gün sonunu tek bir anlaşılır karar alanında birleştiren bağımsız tasarım paketi.

**Önizleme:** `index.html`. **Toplu ekranlar:** `galeri.html`. Gerekirse bu klasörde `python -m http.server 4203`.

## Hazır teslim

- **10 görünüm:** yeni hesap, başlanmadı, kısmen tamamlandı, yarım tur, tekrar birikmesi, odak liste, listede görev yok, gün tamam, bugün tekrar yok ve gün tamamken yarım tur bulunması.
- Her durumda tek baskın başlat/devam eylemi. Kısa tur ve zaman seçenekleri ikinci düzeyde.
- Günlük filiz, soru ilerlemesini gösterir. Haftalık okuma/dinleme/konuşma süresi ayrı tutulur.
- Odak listesinin günlük planı sınırladığı açık; tüm listelere dönüş görünür.
- Tek küçük öneri; ek çalışma seçenekleri kapalı bir bölümde.
- Masaüstü/mobil; EN/FR/ES vurgu; açık/koyu/sakin.

Rakamlar, tarih, profil ve hafta işaretleri örnektir. Gerçek hesap, soru motoru, FSRS, XP veya seri kaydı yok. Çalışma düğmeleri açıkça adlandırılmış örnek ilerleme penceresi açar. Bu tasarımın gerçek planlayıcıya bağlandığı iddia edilmez.

Yeni raster görsel üretilmedi. Önceki 7 filiz SVG'si, tilki avatarı, ilk kelime sahnesi ve 8 arayüz ikonu yeniden kullanıldı. Font lisansları assets içinde.

## Dosyalar

- `index.html`, `app.js`, `data.js`, `style.css`: etkileşimli 10 durum.
- `galeri.html`: seçilmiş ekranlar.
- `DURUMLAR.json`: örnek durum verileri; üretim şeması değildir.
- `DURUM-MATRISI.md`: soru, kelime ve kapsam ayrımı.
- `BILESEN-SOZLESMESI.md`: buton, kısa tur, filiz ve kapsam davranışları.
- `CLAUDE-DEVIR.md`: gerçek kaynaklara aktarım, korunacaklar, sınırlamalar.
- `KAYNAKLAR.json`: kod incelemesinin sürümü ve dosya kimlikleri.
- `DOGRULAMA.json`: gerçekten çalıştırılan yerel kontroller.
- `onizlemeler/`: 10 durumun mobil ve masaüstü örnekleri, koyu tema ve pano.

Canlı üretim ekranıyla karşılaştırma ve gerçek veriyle cihaz testi yapılmadı. P0 doğrulaması/üretim entegrasyonu hâlâ bekliyor. Bu paket bir tasarım teslimidir.
