# 04 · Bugün

Öncelik: **P1**. Durum: kod incelemesi tamamlandı; canlı görsel doğrulama ve yeni tasarım uygulaması bekliyor.

## Mevcut olanlar

- Boş hesap, çalışma var, tamamlandı ve bugün tekrar yok durumlarının farklı metin/eylemleri mevcut.
- Başla/Devam et yanında kısa tur veya zaman seçenekleri; odak listesi; ek çalışma, beceri ve hedef alanları var.
- SessionResumeCard ayrı görünür; ana çalışma eylemiyle ilişkisi gerçek durumlarda kontrol edilmeli.
- Günlük bitki ile öğrenme/ustalık bitkileri aynı kavram değil. Odak listesi tüm günün hangi kelimelerden oluşacağını etkiliyor.

## Tasarım işi

- İlk ekranda kalan iş, süre ve ana eylemi tek karar bölgesinde belirginleştir. İki eşit başlatma alanı oluşup oluşmadığını görsel doğrula.
- Kısa tur ve ek çalışma ana görevle yarışmadan ikinci düzeyde olsun; mevcut işlevler korunur.
- Seçili listenin günlük kapsamı değiştirdiğini görünür ve geri alınabilir göster.
- Tamamlandı/tekrar yok/boş hesap için önceki boş durum ve filiz paketlerini doğru yerlere eşleştir.

Bunlar doğrulanmış canlı ekran hataları değil; kaynak yapısına dayalı tasarım ihtiyaçları ve görsel kontrolde sınanacak hipotezlerdir.

## Çizilecek durumlar

- Yeni hesap
- Bugün başlanmadı
- Kısmen tamamlandı
- Yarım kalan oturum
- Tekrar birikmesi
- Odak liste seçili
- Seçili listede görev yok
- Gün tamamlandı
- Bugün tekrar yok

## Teslimler

- 9 durum için yerleşim matrisi
- Ana görev kartı ve kısa tur hiyerarşisi
- Odak listesi ve gün sonu maketleri

## Korunacaklar

- Gerçek plan ve remaining hesabı
- Kısa tur ve yarım oturum davranışları
- Odak liste kapsamı
- Günlük bitki modeli; FSRS ustalığıyla karıştırılmaz
- Görev/XP/seri hesapları

## Kabul ölçütleri

- Her durum tek açık başlangıç veya devam önerisi gösterir.
- Kalan sayı ve süre gerçek plandan gelir.
- Odak listesi açıkken kapsam anlaşılır ve tüm listelere dönüş bulunur.
- Bugün görev yok durumu tamamlandı gibi yanlış gösterilmez.

## Önceki paketlerle ilişki

filiz-buyume-01, ogrenme-deneyimi-01 sonuç/boş durumları, rozet-yenileme-01 yalnızca ilgili özet alanında kullanılır.

## İncelenen kaynaklar

- `src/ui/home/Screens.tsx` (origin/main)
- `src/ui/home/HomeParts.tsx` (origin/main)
- `src/ui/home/SessionResumeCard.tsx` (origin/main)
- `src/ui/home/TodayTime.tsx` (origin/main)
- `src/ui/home/DayPlant.tsx` (origin/main)
