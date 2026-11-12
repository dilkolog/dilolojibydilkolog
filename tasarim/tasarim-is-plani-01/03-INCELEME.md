# 03 · Okuma

Öncelik: **P1**. Durum: kod incelemesi tamamlandı; canlı görsel doğrulama ve yeni tasarım uygulaması bekliyor.

## Mevcut olanlar

- ReaderTools Türkçesi, dikte, gölgeleme, çıkarım, çekimler, bitir, çoklu seç ve isteğe bağlı birlikte oku eylemlerine sahip; hepsi her koşulda görünmüyor.
- Reading mobil kelime paneli için useSheetSwipe ve useWordSheetLayout kullanıyor; masaüstünde aside yerleşimi var.
- WordCard yalnızca anlam kartı değil; lookup, bilinen/bilinmeyen, ekleme, yok sayma, ses ve diğer okuma işlemlerini taşıyor.
- ReadingHome kütüphane yükleme hatasını gerçek boş kütüphaneden ayırıyor. Dinleme ve metin görünürlüğü durumları birbirine bağlı.

## Tasarım işi

- Ana okuma çubuğu ile öğrenme modlarını iki öncelik düzeyine ayıran öneri çiz. Mevcut koşullu eylemleri silme.
- Kelime panelini yeni kart hiyerarşisine uyarla; metindeki seçili konum, kapatma ve okumaya dönüş belirgin olsun.
- Mobilde uzun çeviri, klavye ve alt panel yüksekliğini doğrula; metnin tümünü kapatan paneli ölçmeden varsayma.
- Kütüphane girişinde ekle/keşfet/kaldığın yer eylemlerinin baskınlığını değerlendir.

Bunlar doğrulanmış canlı ekran hataları değil; kaynak yapısına dayalı tasarım ihtiyaçları ve görsel kontrolde sınanacak hipotezlerdir.

## Çizilecek durumlar

- Kütüphane boş
- Yükleme hatası
- Metin açık
- Tek kelime seçili
- Uzun anlam/çeviri
- Çoklu seçim
- Türkçe açık
- Sadece dinleme
- Dikte
- Gölgeleme
- Okuma tamamlandı

## Teslimler

- Okuyucu araç çubuğu ve mod menüsü
- Mobil kelime alt paneli + masaüstü yan panel
- Kütüphane ve hata/boş görünüm eşleştirmesi

## Korunacaklar

- Okuma konumu ve cümle bağlamı
- Bilinen/bilinmeyen/yok say ayrımı
- Dikte/gölgeleme sırasında metin gizleme koşulları
- Çoklu seçim ve klavye gezinmesi
- Kütüphane hata durumunda metinlerin silinmediği bilgisi

## Kabul ölçütleri

- 375px araçlar metni yatay taşırmaz.
- Panel kapatılınca seçili cümle ve okuma konumu bulunur.
- Kelime ekleme bağlamı ve kaynak metin bilgisi korunur.
- Uzun kelime/çeviri ve iki kat metin boyutu kontrol edilir.
- Ses modu ile çeviri görünürlüğü çelişmez.

## Önceki paketlerle ilişki

ogrenme-deneyimi-01 kelime/deyim düzeni sadece hiyerarşi referansıdır; mevcut WordCard işlevleri kaybedilmez.

## İncelenen kaynaklar

- `src/ui/reading/Reading.tsx` (origin/main)
- `src/ui/reading/ReadingHome.tsx` (origin/main)
- `src/ui/reading/ReaderTools.tsx` (origin/main)
- `src/ui/reading/ReaderAside.tsx` (origin/main)
- `src/ui/words/WordCard.tsx` (origin/main)
- `src/ui/reading/Listening.tsx` (origin/main)
