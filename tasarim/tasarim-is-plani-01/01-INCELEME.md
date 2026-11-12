# 01 · İlk kullanım

Öncelik: **P2**. Durum: kod incelemesi tamamlandı; canlı görsel doğrulama ve yeni tasarım uygulaması bekliyor.

## Mevcut olanlar

- Onboarding üç adımlı: Hoş geldin → Dil → Hedef. Ad isteğe bağlı; süre 5/10/15/20/30dk, yeni kelime 3/5/8/12.
- Landing dil seçimini startLanguage ile devralıyor; kullanıcıya iki kez seçtirmemek için davranış var.
- Adım değişiminde başlığa odak ve sayfayı üste alma mevcut. Telefon klavyesini otomatik açmama kararı var.
- Seviye testi ayrı rehber akışında; onboarding içinde zorunlu bir adım değil.

## Tasarım işi

- Hoş geldin ekranındaki bahçe, ayrı sahne ve üç açıklamanın mobilde ana eylemle ilişkisini ölç. Fazlalık varsa içerik hiyerarşisini sadeleştir.
- Süre ile yeni kelime hedefinin birbirinden bağımsız olduğunu daha kısa ve görsel bir özetle anlat.
- Seviye testini ilk başarıdan sonra isteğe bağlı davet olarak yerleştirme adayı çiz; zorunlu test ekleme.

Bunlar doğrulanmış canlı ekran hataları değil; kaynak yapısına dayalı tasarım ihtiyaçları ve görsel kontrolde sınanacak hipotezlerdir.

## Çizilecek durumlar

- İlk açılış
- Önceden seçili dil
- Dil değiştirme
- Hedef seçimi
- Geri dönüşte seçimlerin korunması
- Boş adla tamamlama
- İlk kelimeye geçiş
- İsteğe bağlı seviye testi daveti

## Teslimler

- 3 adım için 375px ve masaüstü maket
- Hedef seçimi açıklamaları ve ilk başarıya geçiş akışı
- İsteğe bağlı seviye testi daveti

## Korunacaklar

- Settings varsayılanları ve onDone sözleşmesi
- 3 mevcut adım ve landing dili
- İsteğe bağlı ad, telefon odak davranışı
- Seviye testinin kazanım/sertifika etkileri

## Kabul ölçütleri

- İsimsiz ve her dille akış tamamlanır.
- Geri/ileri seçimleri kaybetmez; başlık odak yönetimi korunur.
- Mikrofon veya seviye testi ilk kullanımı engellemez.
- Mobil klavye ana eylemi örtmez.

## Önceki paketlerle ilişki

filiz-buyume-01 ve mevcut onb görselleri önce değerlendirilir; yeni karşılama çizimi otomatik gerekmiyor.

## İncelenen kaynaklar

- `src/ui/home/Onboarding.tsx` (origin/main)
- `src/ui/guide/PlacementView.tsx` (origin/main)
- `src/ui/guide/GuidePlacementNudge.tsx` (origin/main)
