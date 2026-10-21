# Fikir defteri

Yapılabilecek ama henüz yapılmamış işler. Her maddede kısa gerekçe ve ilk adım var. Yapılanlar `AGENTS.md`'de; burada yalnızca bekleyenler durur. Son güncelleme: 2026-10-20 (öğleden sonra).

## Kim ne yapıyor (iki ajan aynı depoda)
Claude Code ve Antigravity aynı listeden çalışır; çakışmamak için:
- **Bir maddeye başlamadan önce** `git fetch` + `git branch -r --no-merged origin/main` (açık dallara bak) ve bu listede o maddenin yanında "üstlenildi" notu var mı kontrol et.
- **Başlarken** maddenin sonuna `(üstlenildi: Claude Code | Antigravity, 2026-10-20, dal adı)` yaz ve bu dosyayı küçük bir PR ile birleştir; bitince maddeyi üstü çizili "(Tamamlandı: … #PR)" yap.
- Antigravity'nin tur görevleri `docs/ANTIGRAVITY-GOREVLER.md`'de (16. tur bitti: 16.1–16.7; 17. tur henüz yazılmadı). Bu liste serbest fikirler içindir.
- Aynı dosyaya dokunuyorsan (ör. `Landing.tsx`, `lazy.css` `lp-*`, `AppSidebar.tsx`) PR açıklamasında belirt; önce main'i çek.

**Bugün (2026-10-20) bitenler:** Claude Code: yedi iş turu (#557), tanıtım düzeltmeleri ve dil seçici (#558–#560), hesap menüsü (#562–#563), okuma araç çubuğu & disleksi dostu yazı tipi (#567), oyun önerileri ve arama (#568). Antigravity: tanıtım sayfası yeniden tasarımı ve mobil ergonomi (#556, #566), Quizlet/Memrise sihirbazı (#561), davet edenin adını karşılama (#565), haftalık özet mailine kişisel hedef (#569), birleşik dağıtım ve canlı duman testi (#570), loadGame tek geçişli optimizasyon (#571), CEFR seviye hedef planlayıcı ve günlük tempo hesaplama (#572).

## Öğrenmeyi doğrudan güçlendirenler
1. ~~**Hedef planlayıcı.**~~ (Tamamlandı: CEFR seviye hedef planlayıcı motoru, hedef tarihi ve kalan kelimeye göre günlük kota önerisi, tempo rozetleri [ahead/on_track/behind], `GoalPlannerCard` bileşeni ve testleri, #572)
2. **Konuşma karşılaştırma ve telaffuz geri bildirimi.** Aynı cümlenin bir hafta sonraki puanı yapıldı (Azure anahtarıyla). Kalan: Azure'suz kullanıcı için ses eğrisi karşılaştırmasını zamanla çizgi yap.
3. ~~**Kişisel "zayıf nokta" haftalık mini turu.** Kör nokta röntgeni + yazı hata defteri + dilbilgisi tekrarı ortak bir 10 dakikalık "haftalık bakım" turunda birleşsin (tek düğme).~~ (Tamamlandı: Bugün'de Cuma–Pazar "haftalık bakım" kartı, `WeeklyCare.tsx`, `engine/weeklyCare.ts`: haftanın kaçırdıkları, tekrarı gelen dilbilgisi, en güçlü kör nokta; yazı hata defteri ayrıca Kör nokta röntgeninde)
6. ~~**Okurken sesli çeviri.**~~ (Tamamlandı: kelime kartında cümlenin Türkçesinin altında "Türkçesini dinle" ve "Cümle, sonra Türkçesi", `TranslateButton.tsx`, #604)

## Sosyal ve bağlılık
8. ~~**Canlı düello sonrası "rövanş serisi".** İki kişi arka arkaya üç düello oynayınca toplam skor tablosu; oda aynı kalsın.~~ (Tamamlandı 2026-10-21: aynı odada 3 düelloluk seri, galibiyet sonra toplam doğru, `liveDuel.ts` `Series`/`SeriesView`, sonuçta `SeriesBoard`)
9. ~~**Takım hedefi bildirimi.** Ortak haftalık hedefe %80 gelince arkadaşlara "son dürtme" iletisi (gelen kutusu türü `team`).~~ (Tamamlandı 2026-10-21: hedefin %80'inden itibaren, tamamlanana dek Arkadaşlar → Ortak hedef kartında "Hepsini dürt": bugün çalışmamış en çok 10 arkadaşa mevcut `nudge` iletisi, haftada bir; yeni gelen kutusu türü bilerek eklenmedi: `friend_inbox` tablosunun `kind` kısıtı SQL değişikliği isterdi)
10. ~~**Davet bağlantısına ad ekleme.**~~ (Tamamlandı: bağlantıya `kimden` adı ekleme, `Landing` sayfasında kişiselleştirilmiş karşılama ve testler, #565)
11. ~~**Okuma kulübü.** Aynı metni iki arkadaş aynı anda açar, işaretledikleri bilinmeyen kelimeleri birbirinde görür (canlı düello odası altyapısı yeniden kullanılabilir).~~ (Tamamlandı 2026-10-21: Okuma → "Birlikte oku", `engine/readingClub.ts`, aynı Durable Object sınıfı `?kind=club` ve `club:<kod>` adıyla, `/?kulup=KOD`, `useReadingClub.ts`, `ClubBar.tsx`; arkadaşın baktığı kelime metinde noktalı çizgiyle; en çok 4 kişi)

## Kullanım kolaylığı
12. ~~**Anki .apkg yeni biçim (zstd).** `collection.anki21b` okunsun; küçük bir zstd çözücü (WASM) gerekir.~~ (Tamamlandı: `fzstd` ile `collection.anki21b` desteği eklendi, #557)
13. ~~**Quizlet/Memrise aktarma sihirbazı.** Dosya biçimini otomatik tanıyıp sütun eşleştirme önizlemesi göstersin.~~ (Tamamlandı: otomatik Quizlet/Memrise/CSV tespiti, sütun eşleştirme açılır menüleri, kelime/anlam takas, panoya kopyalama ve indirme ile Quizlet/Memrise export, #561)
14. ~~**Çevrimdışı mod güvence testi.** Servis çalışanı gerçek çevrimdışı yeniden yüklemeyi E2E'de denemiyor (uçak/metro). Gerçek ağ kesintisiyle bir test.~~ (Tamamlandı: gerçek service worker önbelleği ve offline bağlam testi eklendi, `e2e/offline.e2e.ts`, #557)
15. ~~**Büyük yazı ve okuma yazı tipi (disleksi dostu).**~~ (Tamamlandı: okuma görünümünde Açık/Disleksi/Serif yazı tipleri, punto ve sütun genişliği, #567)
16. ~~**Haftalık özet mailine kişisel hedef.**~~ (Tamamlandı: `weekLine` kişisel haftalık kota hesaplama, sunucu `cleanWeek` regex doğrulaması ve testler, #569)

## Teknik ve dayanıklılık
17. ~~**Workers Builds ile otomatik dağıtım.**~~ (Tamamlandı 2026-10-21: sahibi Settings → Builds'te build command ve build variables'ı girdi; her `main` birleştirmesi canlıya gider, `npm run verify:deploy` ile doğrula)
18. ~~**Dağıtım sonrası duman testi canlı hesapla.**~~ (Tamamlandı: `verify-deploy.mjs` ve `smoke-live.mjs` birleştirildi; başlıklar, bundle anahtarları, açık API uçları ve gerçek canlı hesap eşitleme döngüsü, #570)
19. ~~**Blob → Supabase (arkadaş gelen kutusu).**~~ (Tamamlandı: `friend_inbox` tablosu, `0004_friend_inbox.sql` çalıştırılınca açılır, Blob'dan lazy taşıma, geri düşüş; sahibi SQL'i çalıştırmalı, `docs/SUPABASE.md`)
20. ~~**loadGame günlük özeti.**~~ (Tamamlandı: 8+ filtre/harita geçişi tek $O(N)$ döngüye indirgendi, `longestStreakFromDays`, 30 bin olayda ~16 ms ve denklik testi, #571)
22. ~~**Kararsız E2E'leri kökten çözmek.**~~ (Tamamlandı: `expect` süresi 10 sn, `actionTimeout` 15 sn, bir yeniden deneme [geçen yeniden deneme "flaky" diye raporlanır]; "count() sonra tıkla" yarışları düzeltildi: rehber dilbilgisi testi soruyu bekler, rozet hizası `expect.poll` ile oturana dek ölçülür, başparmak testi tıklamayı bırakıp yeniden bakar. Daha önce düşen 5 test 4 işçiyle 4'er kez yeniden denemesiz koşuldu: 20/20.)

## Yeni (2026-10-21)
27. ~~**Eşitleme için gerçek iki cihazlı E2E.**~~ (Tamamlandı: `gate.e2e.ts` "two devices of one account": sahte Supabase satırları (`FakeParts`), A'da kelime eklenir, B'de görünür, B'den çıkış yalnızca B'yi boşaltır; ~40 sn)
28. ~~**Atlanan medya uyarısı arka plan eşitlemesinde de.**~~ (Tamamlandı: `meta 'syncSkipped'`, Ayarlar → Hesap'ta kalıcı not)
29. ~~**Cihaz tercihlerinde silme yayılımı.** `devicePrefs` yalnızca değer yazar; bir cihazda silinen anahtar (ör. `diloloji:podcast:fr`) diğerinde kalır.~~ (Tamamlandı 2026-10-21: silme boş değerle (`v: ''`) yayılır, 90 gün sonra unutulur; yazılamayan değer silme sayılmaz)

## Sahibinin kararına bağlı
23. ~~**Tanıtım sayfası metni ve mobil ergonomi.**~~ (Tamamlandı: hero buton aralıkları, davet karşılama kartı, değer önerisi çipleri ve ferahlatılmış bölüm ritmi, #566)
24. **Marka.** Logo/favicon (yaprak-balon vs. yeni konsept); paylaşım kartı seri/seviye/haftalık özet için de.
25. **Görsel test referansları.** Actions kotası dönünce `gh workflow run snapshots.yml --ref main`.
26. **Yeni görsel setleri.** Sayfa başlığı pozları, boş durum sahneleri, oturum içi doğru/yanlış yüzleri, bitki büyüme aşamaları.
