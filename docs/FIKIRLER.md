# Fikir defteri

Yapılabilecek ama henüz yapılmamış işler. Her maddede kısa gerekçe ve ilk adım var. Yapılanlar `AGENTS.md`'de; burada yalnızca bekleyenler durur. Son güncelleme: 2026-10-20 (öğleden sonra).

## Kim ne yapıyor (iki ajan aynı depoda)
Claude Code ve Antigravity aynı listeden çalışır; çakışmamak için:
- **Bir maddeye başlamadan önce** `git fetch` + `git branch -r --no-merged origin/main` (açık dallara bak) ve bu listede o maddenin yanında "üstlenildi" notu var mı kontrol et.
- **Başlarken** maddenin sonuna `(üstlenildi: Claude Code | Antigravity, 2026-10-20, dal adı)` yaz ve bu dosyayı küçük bir PR ile birleştir; bitince maddeyi üstü çizili "(Tamamlandı: … #PR)" yap.
- Antigravity'nin tur görevleri `docs/ANTIGRAVITY-GOREVLER.md`'de (16. tur bitti: 16.1–16.7; 17. tur henüz yazılmadı). Bu liste serbest fikirler içindir.
- Aynı dosyaya dokunuyorsan (ör. `Landing.tsx`, `lazy.css` `lp-*`, `AppSidebar.tsx`) PR açıklamasında belirt; önce main'i çek.

**Bugün (2026-10-20) bitenler:** Claude Code: yedi iş turu (#557), tanıtım düzeltmeleri ve dil seçici (#558–#560), hesap menüsü (#562–#563), okuma araç çubuğu & disleksi dostu yazı tipi (#567), oyun önerileri ve arama (#568). Antigravity: tanıtım sayfası yeniden tasarımı ve mobil ergonomi (#556, #566), Quizlet/Memrise sihirbazı (#561), davet edenin adını karşılama (#565), haftalık özet mailine kişisel hedef (#569), birleşik dağıtım ve canlı duman testi (#570), loadGame tek geçişli optimizasyon (#571).

## Öğrenmeyi doğrudan güçlendirenler
1. **Hedef planlayıcı.** "Şu tarihte B1 olmak istiyorum" de; günlük yeni kelime ve çalışma süresi buna göre ayarlansın, haftalık "yoldasın / gerideysin" göstersin. İlk adım: CEFR kapsam yüzdesinden (İlerleme) hedef seviyeye kalan kelime sayısını çıkar, günlük kota öner.
2. **Konuşma karşılaştırma ve telaffuz geri bildirimi.** Aynı cümlenin bir hafta sonraki puanı yapıldı (Azure anahtarıyla). Kalan: Azure'suz kullanıcı için ses eğrisi karşılaştırmasını zamanla çizgi yap.
3. **Kişisel "zayıf nokta" haftalık mini turu.** Kör nokta röntgeni + yazı hata defteri + dilbilgisi tekrarı ortak bir 10 dakikalık "haftalık bakım" turunda birleşsin (tek düğme).
6. **Okurken sesli çeviri.** Cümleye dokun, Türkçesi ve hedef dilde okunuşu birlikte çalsın (şu an ayrı iki dokunuş).

## Sosyal ve bağlılık
8. **Canlı düello sonrası "rövanş serisi".** İki kişi arka arkaya üç düello oynayınca toplam skor tablosu; oda aynı kalsın.
9. **Takım hedefi bildirimi.** Ortak haftalık hedefe %80 gelince arkadaşlara "son dürtme" iletisi (gelen kutusu türü `team`).
10. ~~**Davet bağlantısına ad ekleme.**~~ (Tamamlandı: bağlantıya `kimden` adı ekleme, `Landing` sayfasında kişiselleştirilmiş karşılama ve testler, #565)
11. **Okuma kulübü.** Aynı metni iki arkadaş aynı anda açar, işaretledikleri bilinmeyen kelimeleri birbirinde görür (canlı düello odası altyapısı yeniden kullanılabilir).

## Kullanım kolaylığı
12. ~~**Anki .apkg yeni biçim (zstd).** `collection.anki21b` okunsun; küçük bir zstd çözücü (WASM) gerekir.~~ (Tamamlandı: `fzstd` ile `collection.anki21b` desteği eklendi, #557)
13. ~~**Quizlet/Memrise aktarma sihirbazı.** Dosya biçimini otomatik tanıyıp sütun eşleştirme önizlemesi göstersin.~~ (Tamamlandı: otomatik Quizlet/Memrise/CSV tespiti, sütun eşleştirme açılır menüleri, kelime/anlam takas, panoya kopyalama ve indirme ile Quizlet/Memrise export, #561)
14. ~~**Çevrimdışı mod güvence testi.** Servis çalışanı gerçek çevrimdışı yeniden yüklemeyi E2E'de denemiyor (uçak/metro). Gerçek ağ kesintisiyle bir test.~~ (Tamamlandı: gerçek service worker önbelleği ve offline bağlam testi eklendi, `e2e/offline.e2e.ts`, #557)
15. ~~**Büyük yazı ve okuma yazı tipi (disleksi dostu).**~~ (Tamamlandı: okuma görünümünde Açık/Disleksi/Serif yazı tipleri, punto ve sütun genişliği, #567)
16. ~~**Haftalık özet mailine kişisel hedef.**~~ (Tamamlandı: `weekLine` kişisel haftalık kota hesaplama, sunucu `cleanWeek` regex doğrulaması ve testler, #569)

## Teknik ve dayanıklılık
17. **Workers Builds ile otomatik dağıtım.** `docs/CLOUDFLARE.md`'de adımlar var; sahibinin Cloudflare panelinde bağlaması gerekiyor.
18. ~~**Dağıtım sonrası duman testi canlı hesapla.**~~ (Tamamlandı: `verify-deploy.mjs` ve `smoke-live.mjs` birleştirildi; başlıklar, bundle anahtarları, açık API uçları ve gerçek canlı hesap eşitleme döngüsü, #570)
19. **Blob → Supabase (arkadaş gelen kutusu).** Yalnızca küçük ve riski düşük parça: gelen kutusu. Hesap kimliği ve onay işaretleri taşınmasın (yüksek risk, kazanç az).
20. ~~**loadGame günlük özeti.**~~ (Tamamlandı: 8+ filtre/harita geçişi tek $O(N)$ döngüye indirgendi, `longestStreakFromDays`, 30 bin olayda ~16 ms ve denklik testi, #571)
22. **Kararsız E2E'leri kökten çözmek.** Yük altında düşen testler (bahçe kartı, oturum akışı birim testi) için süre ve bekleme stratejisini ortak yardımcıya taşı.

## Sahibinin kararına bağlı
23. ~~**Tanıtım sayfası metni ve mobil ergonomi.**~~ (Tamamlandı: hero buton aralıkları, davet karşılama kartı, değer önerisi çipleri ve ferahlatılmış bölüm ritmi, #566)
24. **Marka.** Logo/favicon (yaprak-balon vs. yeni konsept); paylaşım kartı seri/seviye/haftalık özet için de.
25. **Görsel test referansları.** Actions kotası dönünce `gh workflow run snapshots.yml --ref main`.
26. **Yeni görsel setleri.** Sayfa başlığı pozları, boş durum sahneleri, oturum içi doğru/yanlış yüzleri, bitki büyüme aşamaları.
