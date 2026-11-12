# 02 · Konuşma–dinleme

Öncelik: **P1**. Durum: kod incelemesi tamamlandı; canlı görsel doğrulama ve yeni tasarım uygulaması bekliyor.

## Mevcut olanlar

- AudioRecorder idle/recording/review durumlarına,8 sn sınıra, tekrar kaydetmeye, dinleyip kullanmaya ve izin hatasına sahip.
- PronunciationCheck kaydetme/değerlendirme, model sesini dinleme, kendi kaydı, doğruluk/akıcılık/eksiksizlik ve isteğe bağlı tonlama gösteriyor. Kelime bazlı geri bildirim mevcut.
- AudioPanel üç tur dinleme, hız seçimi, native audio kontrolü, kaldığı yer, hata ve takip davranışları içeriyor.
- Gölgeleme ve sohbet, aynı kayıt işleminin farklı kullanım amaçları. Ses ayarlarında cihaz desteği ve ses seçimi zaten var.

## Tasarım işi

- Kaydet, durdur, değerlendiriliyor, sonuç ve tekrar dene durumları için ortak kontrol anatomisi tasarla. Kaydı saklama ile puanlamayı aynı işlem gibi gösterme.
- Dekoratif ses dalgasını gerçek ses düzeyi ölçümü gibi sunma. Süre ve açık durum metni temel gösterge olsun.
- İzin reddi, cihaz desteği yok, boş kayıt, servis hatası ve ses oynatılamaması için farklı yönlendirme çiz.
- Puan özetinde önce tek uygulanabilir öneri; ayrıntılı alt puan ve kelime listesi ikinci katman.

Bunlar doğrulanmış canlı ekran hataları değil; kaynak yapısına dayalı tasarım ihtiyaçları ve görsel kontrolde sınanacak hipotezlerdir.

## Çizilecek durumlar

- Hazır
- İzin isteniyor
- Kayıt sürüyor
- Kayıt önizlemesi
- Değerlendiriliyor
- Başarılı sonuç
- Düşük puan
- Mikrofon engelli
- Destek yok
- Boş kayıt
- Servis hatası
- Ses yok/yükleniyor
- Üç tur ve gölgeleme

## Teslimler

- Kayıt kontrol bileşeni durum panosu
- Telaffuz sonucu ve kelime ayrıntısı maketleri
- Dinleme/gölgeleme kontrol düzeni
- İzin/hata durumları için metin ve görsel eşleştirme

## Korunacaklar

- Mevcut MediaRecorder ve kayıt süresi limitleri
- Gerçek değerlendirme servisi/score sözleşmesi; sahte puan yok
- Ayrı kayıt kaydetme ve puanlama akışları
- Native audio erişilebilirliği, hız ve devam konumu
- Kullanılmayan mikrofona otomatik erişim istememe

## Kabul ölçütleri

- Her durumda tek ana eylem ve açık kayıt durumu var.
- İzin reddinden çıkış ve mikrofonsuz devam anlaşılır.
- Kaydetme, kaydı kullanma ve değerlendirme birbirinden ayrılır.
- Dalgalar sessizde başarı izlenimi yaratmaz; reduced-motion çalışır.
- Dinleme hızı, kaldığı yer ve gerçek ses desteği korunur.

## Önceki paketlerle ilişki

ogrenme-deneyimi-01 pratik ikonları; mevcut StatusPicture nomic çizimi; yeni mikrofonsuz sahne çizmeden bunlar incelenir.

## İncelenen kaynaklar

- `src/ui/practice/AudioRecorder.tsx` (origin/main)
- `src/ui/practice/PronunciationCheck.tsx` (origin/main)
- `src/ui/practice/Produce.tsx` (origin/main)
- `src/ui/reading/Listening.tsx` (origin/main)
- `src/ui/reading/Shadow.tsx` (origin/main)
- `src/ui/settings/SoundSettings.tsx` (origin/main)
