# Fikir defteri

Yapılabilecek ama henüz yapılmamış işler. Her maddede kısa gerekçe ve ilk adım var. Yapılanlar `AGENTS.md`'de; burada yalnızca bekleyenler durur. Son güncelleme: 2026-10-20.

## Öğrenmeyi doğrudan güçlendirenler
1. **Hedef planlayıcı.** "Şu tarihte B1 olmak istiyorum" de; günlük yeni kelime ve çalışma süresi buna göre ayarlansın, haftalık "yoldasın / gerideysin" göstersin. İlk adım: CEFR kapsam yüzdesinden (İlerleme) hedef seviyeye kalan kelime sayısını çıkar, günlük kota öner.
2. **Konuşma karşılaştırma ve telaffuz geri bildirimi.** Gölgelemede kayıt ile ana dilli kaydın ses eğrisi zaten karşılaştırılıyor; ilerlemeyi zaman içinde çizgi olarak göster (aynı cümle 1 hafta sonra).
3. **Kişisel "zayıf nokta" haftalık mini turu.** Kör nokta röntgeni + yazı hata defteri + dilbilgisi tekrarı ortak bir 10 dakikalık "haftalık bakım" turunda birleşsin (tek düğme).
4. **Cümle kartlarına aralıklı tekrar görünümü.** Cümle kartları FSRS'e bağlı ama "bu hafta kaç cümle vadesi geliyor" öngörüsü yok; iş yükü tahmini (`workloadForecast`) cümleleri de saysın.
5. **Sesli kelime ekleme.** Mikrofona kelimeyi söyle, YZ kartı hazırlasın (Sözlük'teki sesle arama bunun ilk yarısı).
6. **Okurken sesli çeviri.** Cümleye dokun, Türkçesi ve hedef dilde okunuşu birlikte çalsın (şu an ayrı iki dokunuş).
7. **Dinleme için hız eğitimi.** Aynı kayıt 0,75× → 1× → 1,25×: her turda hızlanan kısa dinleme egzersizi, anlama sorusuyla.

## Sosyal ve bağlılık
8. **Canlı düello sonrası "rövanş serisi".** İki kişi arka arkaya üç düello oynayınca toplam skor tablosu; oda aynı kalsın.
9. **Takım hedefi bildirimi.** Ortak haftalık hedefe %80 gelince arkadaşlara "son dürtme" iletisi (gelen kutusu türü `team`).
10. **Davet bağlantısına ad ekleme.** Bağlantıya davet edenin adı eklenirse tanıtım sayfası "Ayşe seni davet etti" diyebilir (şu an ad bilinmiyor, kod yalnızca doğrulanabiliyor).
11. **Okuma kulübü.** Aynı metni iki arkadaş aynı anda açar, işaretledikleri bilinmeyen kelimeleri birbirinde görür (canlı düello odası altyapısı yeniden kullanılabilir).

## Kullanım kolaylığı
12. **Anki .apkg yeni biçim (zstd).** `collection.anki21b` okunsun; küçük bir zstd çözücü (WASM) gerekir. Şimdi kullanıcıya "eski sürümleri destekle" yönergesi gösteriliyor.
13. **Quizlet/Memrise dışa aktarma sihirbazı.** Dosya biçimini otomatik tanıyıp sütun eşleştirme önizlemesi göstersin.
14. **Çevrimdışı mod güvence testi.** Servis çalışanı gerçek çevrimdışı yeniden yüklemeyi E2E'de denemiyor (uçak/metro). Gerçek ağ kesintisiyle bir test.
15. **Büyük yazı ve okuma yazı tipi (disleksi dostu).** Okuma görünümü paneline OpenDyslexic benzeri bir seçenek; lisansı uygun bir yazı tipi bulunmalı.
16. **Haftalık özet mailine kişisel hedef.** Mailde "bu hafta şu kadar daha" satırı (sayılar sunucuda doğrulanan kalıpla gider).

## Teknik ve dayanıklılık
17. **Workers Builds ile otomatik dağıtım.** `docs/CLOUDFLARE.md`'de adımlar var; sahibinin Cloudflare panelinde bağlaması gerekiyor.
18. **Dağıtım sonrası duman testi canlı hesapla.** `verify-deploy.mjs` şu an uçları ve anahtarı denetliyor; ayrı bir deneme hesabıyla giriş + eşitleme turu (`smoke-live.mjs` ile birleştirilebilir).
19. **Blob → Supabase (arkadaş gelen kutusu).** Yalnızca küçük ve riski düşük parça: gelen kutusu. Hesap kimliği ve onay işaretleri taşınmasın (yüksek risk, kazanç az).
20. **`loadGame` günlük özeti.** ~30 bin cevapta yeniden değerlendir; önce eski ve yeni hesabın birebir aynı çıktıyı verdiğini kanıtlayan test yaz.
21. **Hata günlüklerinden otomatik özet.** Workers Logs'taki `[client-error]` kayıtlarını haftada bir gruplayıp sahibine tek mail (en sık 5 hata).
22. **Kararsız E2E'leri kökten çözmek.** Yük altında düşen testler (bahçe kartı, oturum akışı birim testi) için süre ve bekleme stratejisini ortak yardımcıya taşı.

## Sahibinin kararına bağlı
23. **Tanıtım sayfası metni.** "Ücretsiz" yazılsın mı, İngilizce ekran görüntüleri eklensin mi.
24. **Marka.** Logo/favicon (yaprak-balon vs. yeni konsept); paylaşım kartı seri/seviye/haftalık özet için de.
25. **Görsel test referansları.** Actions kotası dönünce `gh workflow run snapshots.yml --ref main`.
26. **Yeni görsel setleri.** Sayfa başlığı pozları, boş durum sahneleri, oturum içi doğru/yanlış yüzleri, bitki büyüme aşamaları.
