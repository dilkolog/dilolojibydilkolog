# Kalıcı öğrenme akışı

## Altı düzeltme

1. **Yarım oturuma dönüş.** Normal kelime oturumunun sırası, grup numarası, ek soruları, yeniden öğrenme hedefleri ve cevap günlüğü IndexedDB'de `study-session:<dil>` altında saklanır. Cevap ve sonraki adım tek işlemle yazılır; geri bildirim açıkken yenilemek cevabı yeniden puanlamaz. Bugün ekranındaki dönüş düğmesi, tekrar takvimi boşken de görünür. Aynı dilde yeni normal tur açmak önce yarım turu sürdürür; serbest pratik ayrı kalır. Silinmiş kelimeler dönüşte atlanır, seçenek tercihleri yeniden uygulanır. Bu kuyruk cihazın kendisine aittir; cihazlar arasında eşitlenmez.
2. **Yardımsız cevap ölçütü.** Doğru, ipucusuz ve "emin değilim" işareti olmayan cevap bağımsızdır. Aksan/yazım kayması gibi yakın cevaplar geri bildirim alır ama öğrenme adımını tamamlamaz. İpucuyla doğru cevapta yeniden deneme gerekir; otomatik devam bu açıklamayı atlamaz.
3. **Pekiştirme hataları.** Rehberli tekrar yanlışsa veya bütün ipuçları açıldıysa FSRS ve hata kaydı normal değerlendirilir. Aynı oturumdaki başarılı pekiştirmeler mevcut kartın aralığını büyütmez; ilk kez sınanan becerinin kartı oluşturulur. Serbest pratik bu davranışa girmez.
4. **Öğrenme borcu.** `UserWordState.learning` beceri başına kalan bağımsız geri çağırmayı tutar. Üç ek deneme sınırı turu uzatmaktan korur; kalan hedef ertesi turda takvim vadesi beklenmeden öncelikli sorulur. Borç ödendiğinde sıfır kaydı tutulur; yedek ve eşitleme birleştirmesi eski borcu diriltmez. Zaman damgası ve sıra sayacı kullanılır; eşzamanlı çatışmada daha ihtiyatlı hedef korunur.
5. **Kelimeye göre basamaklar.** İlk anlam sorusu hızlı ve yardımsız cevaplandıysa doğrudan yazılı hatırlamaya geçilebilir. Daha yavaş yanıtta anlam pekiştirmesi korunur; destekli/yanlış yanıtta iki bağımsız geri çağırma istenir. Yazma kapalıysa veya uzun tanım atlanıyorsa mevcut tercihler uygulanır. Karar diğer kelimelerin genel başarı oranıyla öğrenme adımını rastgele değiştirmez.
6. **Tur ile öğrenme durumu ayrımı.** Özette tur bitişi, yardımsız cevap sayısı ve kalan pekiştirme ihtiyacı ayrı gösterilir. Yeni rehberli kelimelerde yüksek büyüme aşamaları için yazılı/sözlü geri çağırmanın tanıtımdan ve ilgili geri çağırma becerisindeki son destekli/başarısız cevaptan en az 24 saat sonra bağımsız yapılması gerekir. Önceki sürümlerin mevcut öğrenme geçmişleri olduğu gibi desteklenir. Bu ölçüt bir CEFR değerlendirmesi veya kalıcı öğrenme garantisi değildir.

## Veri ve hata davranışı

Kelime/cevap/tur kaydı işlemi başarısızsa hepsi geri alınır; soru tekrar cevaplanabilir. Bir cevabı doğru kabul etme ve yanlış dokunmayı geri alma işlemleri de tur kaydını aynı işlemde düzeltir. Tanıtım kartında çift tıklama korunur ve tanıtımın kaydı da atomiktir. Dönüşte kelime durumları taze veritabanı kayıtlarından alınır; önceki cevaplar günlük XP sayımına ikinci kez eklenmez. Yeni alanlar isteğe bağlıdır; eski yedekler açılır. Eşitleme öğrenme borcunu ve gecikmeli hatırlama kanıtını taşır; tam oturum kuyruğunu taşımaz.

GitHub Actions kullanıcının kota talebi nedeniyle çalıştırılmaz. Yerel test, tip, lint, derleme ve Chromium doğrulama sonuçları PR açıklamasında kaydedilir.

## Yerel doğrulama

- Tam paket: 605 dosyada 3.310 başarılı test, 1 atlanan test (2 işçi, 30 saniye süre sınırı).
- Son eklenen/değişen senaryolar ayrıca çalıştırıldı: beceriye göre borç, destekli cevaplar, hızla uyarlanan basamaklar, ertesi gün kanıtı, atomik kayıt/geri alma, yedek ve birleştirme; son odaklı grupta 47/47 başarılı.
- Chromium: ertesi gün tekrar, oturum içi ayarlar ve geri bildirim sırasında yenileyip aynı cevap puanlanmadan devam etme, 3/3 başarılı. Son derlemede devam senaryosu tekrar çalıştırıldı: 1/1 başarılı.
- Tip kontrolü, lint ve hesapsız test derlemesi başarılı. Gerçek hesapla/iki cihazla ve fiziksel iPhone/WebKit ile bu değişiklik ayrıca denenmedi.
- Üretim yayını yerel test derlemesi yüklenerek değil, mevcut Cloudflare Workers Builds üzerinden yapılır. GitHub Actions kullanıcı talebiyle atlanır.
