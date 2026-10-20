# Fikir defteri

Yapılabilecek ama henüz yapılmamış işler. Her maddede kısa gerekçe ve ilk adım var. Yapılanlar `AGENTS.md`'de; burada yalnızca bekleyenler durur. Son güncelleme: 2026-10-20 (öğleden sonra).

## Kim ne yapıyor (iki ajan aynı depoda)
Claude Code ve Antigravity aynı listeden çalışır; çakışmamak için:
- **Bir maddeye başlamadan önce** `git fetch` + `git branch -r --no-merged origin/main` (açık dallara bak) ve bu listede o maddenin yanında "üstlenildi" notu var mı kontrol et.
- **Başlarken** maddenin sonuna `(üstlenildi: Claude Code | Antigravity, 2026-10-20, dal adı)` yaz ve bu dosyayı küçük bir PR ile birleştir; bitince maddeyi üstü çizili "(Tamamlandı: … #PR)" yap.
- Antigravity'nin tur görevleri `docs/ANTIGRAVITY-GOREVLER.md`'de (16. tur bitti: 16.1–16.7; 17. tur henüz yazılmadı). Bu liste serbest fikirler içindir.
- Aynı dosyaya dokunuyorsan (ör. `Landing.tsx`, `lazy.css` `lp-*`, `AppSidebar.tsx`) PR açıklamasında belirt; önce main'i çek.

**Bugün (2026-10-20) bitenler:** Claude Code: yedi iş turu (#557), tanıtım düzeltmeleri ve dil seçici (#558–#560), hesap menüsü (#562–#563). Antigravity: tanıtım sayfası yeniden tasarımı (#556), Quizlet/Memrise sihirbazı (#561).

## Öğrenmeyi doğrudan güçlendirenler
1. **Hedef planlayıcı.** "Şu tarihte B1 olmak istiyorum" de; günlük yeni kelime ve çalışma süresi buna göre ayarlansın, haftalık "yoldasın / gerideysin" göstersin. İlk adım: CEFR kapsam yüzdesinden (İlerleme) hedef seviyeye kalan kelime sayısını çıkar, günlük kota öner.
2. **Konuşma karşılaştırma ve telaffuz geri bildirimi.** Aynı cümlenin bir hafta sonraki puanı yapıldı (Azure anahtarıyla). Kalan: Azure'suz kullanıcı için ses eğrisi karşılaştırmasını zamanla çizgi yap.
3. **Kişisel "zayıf nokta" haftalık mini turu.** Kör nokta röntgeni + yazı hata defteri + dilbilgisi tekrarı ortak bir 10 dakikalık "haftalık bakım" turunda birleşsin (tek düğme).
6. **Okurken sesli çeviri.** Cümleye dokun, Türkçesi ve hedef dilde okunuşu birlikte çalsın (şu an ayrı iki dokunuş).

## Sosyal ve bağlılık
8. **Canlı düello sonrası "rövanş serisi".** İki kişi arka arkaya üç düello oynayınca toplam skor tablosu; oda aynı kalsın.
9. **Takım hedefi bildirimi.** Ortak haftalık hedefe %80 gelince arkadaşlara "son dürtme" iletisi (gelen kutusu türü `team`).
10. **Davet bağlantısına ad ekleme.** Bağlantıya davet edenin adı eklenirse tanıtım sayfası "Ayşe seni davet etti" diyebilir (şu an ad bilinmiyor, kod yalnızca doğrulanabiliyor).
11. **Okuma kulübü.** Aynı metni iki arkadaş aynı anda açar, işaretledikleri bilinmeyen kelimeleri birbirinde görür (canlı düello odası altyapısı yeniden kullanılabilir).

## Kullanım kolaylığı
12. ~~**Anki .apkg yeni biçim (zstd).** `collection.anki21b` okunsun; küçük bir zstd çözücü (WASM) gerekir.~~ (Tamamlandı: `fzstd` ile `collection.anki21b` desteği eklendi, #557)
13. ~~**Quizlet/Memrise aktarma sihirbazı.** Dosya biçimini otomatik tanıyıp sütun eşleştirme önizlemesi göstersin.~~ (Tamamlandı: otomatik Quizlet/Memrise/CSV tespiti, sütun eşleştirme açılır menüleri, kelime/anlam takas, panoya kopyalama ve indirme ile Quizlet/Memrise export, #561)
14. ~~**Çevrimdışı mod güvence testi.** Servis çalışanı gerçek çevrimdışı yeniden yüklemeyi E2E'de denemiyor (uçak/metro). Gerçek ağ kesintisiyle bir test.~~ (Tamamlandı: gerçek service worker önbelleği ve offline bağlam testi eklendi, `e2e/offline.e2e.ts`, #557)
15. **Büyük yazı ve okuma yazı tipi (disleksi dostu).** Okuma görünümü paneline OpenDyslexic benzeri bir seçenek; lisansı uygun bir yazı tipi bulunmalı.
16. **Haftalık özet mailine kişisel hedef.** Mailde "bu hafta şu kadar daha" satırı (sayılar sunucuda doğrulanan kalıpla gider).

## Teknik ve dayanıklılık
17. **Workers Builds ile otomatik dağıtım.** `docs/CLOUDFLARE.md`'de adımlar var; sahibinin Cloudflare panelinde bağlaması gerekiyor.
18. **Dağıtım sonrası duman testi canlı hesapla.** `verify-deploy.mjs` şu an uçları ve anahtarı denetliyor; ayrı bir deneme hesabıyla giriş + eşitleme turu (`smoke-live.mjs` ile birleştirilebilir).
19. **Blob → Supabase (arkadaş gelen kutusu).** Yalnızca küçük ve riski düşük parça: gelen kutusu. Hesap kimliği ve onay işaretleri taşınmasın (yüksek risk, kazanç az).
20. **`loadGame` günlük özeti.** ~30 bin cevapta yeniden değerlendir; önce eski ve yeni hesabın birebir aynı çıktıyı verdiğini kanıtlayan test yaz.
22. **Kararsız E2E'leri kökten çözmek.** Yük altında düşen testler (bahçe kartı, oturum akışı birim testi) için süre ve bekleme stratejisini ortak yardımcıya taşı.

## Sahibinin kararına bağlı
23. **Tanıtım sayfası metni.** "Ücretsiz" yazılsın mı? (Fransızca/İspanyolca/İngilizce ekran görüntüleri ve dil seçici yapıldı, #560.)
24. **Marka.** Logo/favicon (yaprak-balon vs. yeni konsept); paylaşım kartı seri/seviye/haftalık özet için de.
25. **Görsel test referansları.** Actions kotası dönünce `gh workflow run snapshots.yml --ref main`.
26. **Yeni görsel setleri.** Sayfa başlığı pozları, boş durum sahneleri, oturum içi doğru/yanlış yüzleri, bitki büyüme aşamaları.
