# Konuşma–dinleme · 01

11 Kasım 2026. Tasarım iş planının konuşma–dinleme alanı için bağımsız etkileşimli teslim.

**Başla:** `index.html`. **Toplu görünüm:** `durumlar.html`. Gerekirse bu klasörde `python -m http.server 4201`.

## Hazır olanlar

- **Telaffuz çalış:** kelime/cümle, 12 saniyelik kayıt simülasyonu, değerlendirme görünümü, iki örnek sonuç, tek çalışma önerisi ve sözcük detayları.
- **Dinleyerek anla:** metinsiz → metinli → yeniden metinsiz üç tur; model sesi ve hız kontrolü; yerel ses dosyası için native audio.
- **Dinle ve tekrar et:** model dinleme → söyleme → karşılaştırma akışı. Puan üretmez.
- **Kelime kaydım:** 8 saniye, önizleme ve kullanılacak kaydı seçme. Telaffuz puanlamasından ayrıdır.
- **15 ortak durum görünümü:** hazır, izin, model dinleme, kayıt, önizleme, değerlendirme, iki sonuç, izin engeli, destek yok, boş kayıt, servis hatası, ses yüklenmesi, oynatma hatası, kayıt seçildi. Her durum her akışta gösterilmez.

Gerçek mikrofon açılmaz. Kayıt ve puanlar örnek durumdur; bu bilgi ekranda görünür. “Örnek sonucu göster” gerçek servis sonucu iddiası taşımaz. Durum seçicisi ve simülasyon kontrolleri tasarım incelemesi içindir; üretim ekranına taşınmaz.

Model ses tarayıcıda İspanyolca speechSynthesis sesi varsa çalar; yoksa açıklama gösterilir. Cihazın ses sağlayıcısının ağ davranışı bu prototip tarafından yönetilmez. Kullanıcının seçtiği ses dosyası yalnız sekmede oynatılır; uygulama sunucusuna yüklenmez. Kayıt/silme düğmeleri gerçek hesap verisini değiştirmez. Sayfa yenilenince önizleme sıfırlanır.

## Görsel kararlar

Tek ana eylem, ikincil çıkış yolu, büyük hedef cümle, sakin nötr kayıt alanı. Kayıt rengi cevap doğruluğundan ayrıldı. Sahte canlı ses dalgası yok; süre ve durum metni yeterli. Sonuçta önce tek öneri, ayrıntılar açılır alanda. Tonlama yalnız gerçek servis sağladığında gösterilecek.

Lexend/Literata ve dil vurgusu DESIGN.md çizgisinde. Yeni raster çizim gerekmedi; önceki pratik ikonları yeniden kullanıldı. Mikrofon hatası için önceki Monki sahnesini çoğaltmak yerine kısa açıklama ve izin adımları tercih edildi. Var olan maskot dosyaları değiştirilmedi.

## Dosyalar

- `index.html`, `app.js`, `states.js`: dört akışın önizlemesi.
- `durumlar.html`: 15 durumun toplu panosu.
- `DURUMLAR.json`: makine tarafından okunabilen durum metinleri.
- `BILESEN-SOZLESMESI.md`: bileşenler, durumlar ve eylemler.
- `CLAUDE-DEVIR.md`: kaynak bileşenler ve uygulamada korunacaklar.
- `KAYNAKLAR.json`: incelenen uygulama sürümü/dosya kimlikleri.
- `DOGRULAMA.json`: gerçekten yapılan yerel kontroller ve yapılmayanlar.
- `onizlemeler/`: masaüstü, mobil, sonuç, hata ve koyu tema görüntüleri.

Canlı üretim ekranıyla yan yana görsel doğrulama yapılmadı; kaynak incelemesine dayanan tasarım önerisidir. Bu paketin siteye entegrasyonu ve gerçek mikrofon/servis testleri ayrıca yapılmalı.
