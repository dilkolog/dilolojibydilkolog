# Kelime Koçu — Plan (Faz 0)

Kaynak: "Kişisel ve Adaptif Kelime Öğrenme Uygulaması" şartnamesi (2 PDF). Bu dosya o şartnameden
alınan kararları ve sapmaları kaydeder.

## Kararlar

| Konu | Karar | Neden |
|---|---|---|
| Kullanıcı | Tek kullanıcı (sahibi) | Auth, çoklu kiracı, ölçekleme gereksiz |
| Platform | PWA (React + TS + Vite) | Ağırlıklı PC, ara sıra mobil; tek kod tabanı, kurulum yok |
| Hedef diller | İngilizce, Fransızca, İspanyolca (ana dil: Türkçe) | — |
| Depolama | IndexedDB (Dexie), cihaz içi | Offline-first; sunucu yok |
| Scheduler | FSRS (`ts-fsrs`), **beceri başına ayrı kart** | Recognition ile production ayrı ölçülür (şartname §4 kritik kural) |
| AI | İsteğe bağlı, kullanıcının kendi Claude API anahtarıyla (bkz. "AI katmanı") | Motor AI olmadan da tam çalışır; AI yalnızca içerik üretir ve değerlendirir |
| Kelime verisi | **Kullanıcı kendisi ekler** (form veya CSV/TSV yapıştırma). Hazır örnek setler yalnızca deneme/test için | Hangi kelimelerin öğrenileceğine kullanıcı karar verir |
| Cihazlar arası taşıma | JSON yedek indir / geri yükle | Sunucusuz kalır; otomatik senkron gerekirse sonra |

## Mimari

```
src/
  engine/        Öğrenme motoru — saf TypeScript, UI/DB bağımsız, tamamı test edilir
    types.ts         Veri modeli (VocabularyEntry, UserWordState, ReviewEvent, Mistake)
    scheduler.ts     FSRS sarmalayıcı
    grading.ts       Kanıta dayalı notlama (doğruluk + süre + ipucu → FSRS rating)
    answerCheck.ts   Yazılı cevap kontrolü (aksan, yazım, artikel/cinsiyet hataları)
    exercises.ts     Egzersiz tipleri, egzersiz içeriği üretimi, kademeli ipuçları
    selection.ts     Beceri kilidi açma + zayıf beceriye göre egzersiz seçimi
    mastery.ts       Mastery aşamaları + beceri skorları
    mistakes.ts      Personal Mistake Bank
    review.ts        Bir cevabı işle → yeni durum + event + hata kaydı
    dailyPlan.ts     Günlük görev (Today's Mission) + interleaving + interference kuralı
    session.ts       Oturum kuyruğu: yanlışı farklı biçimde 3 soru sonra tekrar sorar, özet çıkarır
  data/
    db.ts            Dexie (IndexedDB) şeması, kayıt işlemleri, JSON yedek
    wordInput.ts     Elle ekleme + toplu içe aktarma (CSV/TSV), cümlede kelime biçimini bulma
    seed/            Örnek kelimeler (EN 30, FR 29, ES 15) — yalnızca deneme için
  ui/              Ekranlar: açılış, ana sayfa, oturum, özet, kelimeler, ayarlar
```

## Şartnameden bilinçli sapmalar / eklemeler

- **FR/ES isimlerde cinsiyet:** veri modeline `gender` + `article` eklendi; yanlış artikel "gender" hatası
  olarak Mistake Bank'e düşer.
- **Kullanıcı "confidence" beyanı tutulmuyor:** şartname §21.2 gereği notlama tamamen objektif sinyallerden.
- **Low-stakes (pratik) modu:** cevaplar event olarak kaydedilir ama scheduler'ı ve Mistake Bank'i etkilemez (§19.6).
- **Kelime başına durum, anlam (sense) başına değil:** MVP'de çok anlamlı kelimelerin diğer anlamları
  "kademeli açılım" katmanı olarak gösterilir; sense bazlı takip sonraki sürüm.

## Fazlar

1. **Faz 1 — Motor + testler** ✅
2. **Faz 2 — Vertical slice:** ✅ açılış → kelime ekleme/içe aktarma → günlük görev → oturum → özet → sonraki tekrar
3. **Faz 3 — MVP'yi tamamlama:** ✅ PWA/offline, kelime detay/düzenleme, Hatalar ve İlerleme ekranları, serbest pratik
4. **Faz 4 — AI katmanı** ✅ isteğe bağlı, Claude API ile
5. **Sonrası:** PDF/altyazı/web metninden kelime çıkarma, hikaye modu, graph view, konuşma

## Kullanıcının kelime eklemesi

- **Elle:** kelime + Türkçe anlam zorunlu. FR/ES isimler artikeliyle yazılır ("la décision"); cinsiyet
  artikelden çıkarılır, yalnızca `l'` için sorulur.
- **Örnek cümle:** kelimenin cümledeki biçimi otomatik bulunur (decide → decided). Bulunamazsa
  `*yıldız*` ile işaretlenir.
- **Toplu:** sütunlar `kelime, anlam, örnek cümle, örnek çevirisi, kalıplar, karıştırılan kelimeler`.
  Sekme, `;` veya `,` ayraçlı. Başlık satırı ve tekrar eden kelimeler atlanır, hatalı satırlar raporlanır.
- Kullanıcının eklediği kelimeler ekleme sırasıyla, seviye filtresine takılmadan önce tanıtılır.
- Örnek cümlesi olmayan kelimede üretme (production) alıştırmaları açılmaz, bu yüzden "Oturdu"
  aşamasına çıkamaz. Kelime listesinde "Örnek cümle yok" diye işaretlenir.

## Faz 3 notları

- **Offline:** service worker uygulamanın tüm dosyalarını önbelleğe alır; veriler zaten IndexedDB'de.
  Veriler adrese bağlıdır: uygulama yayınlanınca hep aynı adresten açılmalı.
- **Ana metrik (North Star):** "aktif kelime" = Kullanılabiliyor/Oturdu aşamasında olup üretme becerisinde
  hatırlama olasılığı şu an ≥ %85 olan kelimeler.
- **Hataları çalış:** her hatalı kelime bir kez, son hatanın yapıldığı beceride sorulur. Normal mod.
- **Serbest pratik:** zaten çalışılan kelimeler, zaten açılmış becerilerde; takvimi ve hata listesini etkilemez.

## AI katmanı (`src/ai`)

- **İsteğe bağlı:** Ayarlar → AI yardımcısı bölümüne kullanıcı kendi Anthropic API anahtarını girer.
  Anahtar yoksa öğrenme akışı aynen çalışır; kelime doldurma, hafıza ipucu gibi işler elle yapılır,
  sohbet ve hata raporu gibi yalnızca AI'lı özellikler kullanılamaz.
- **Doğrudan tarayıcıdan:** istekler cihazdan Claude API'ye gider, araya sunucu girmez. Anahtar
  `meta` tablosunda ayarlardan ayrı tutulur; yedek dosyasına ve senkrona hiç yazılmaz.
- **Geç yükleme:** Anthropic SDK yalnızca bir AI özelliği ilk kullanıldığında yüklenir; AI'sız açılış yavaşlamaz.
- **Model:** Claude Opus 5.5 (varsayılan), Sonnet 5.5 veya Haiku 4.5 seçilir. Cevaplar Zod şemasıyla
  yapılandırılmış çıktı olarak alınır.
- **Bütçe:** her istek için token ve maliyet aylık olarak, özellik bazında kaydedilir (bu kayıtlar da yedeğe
  girmez). Aylık sınır seçilebilir ($2 / $5 / $10 / $20 ya da sınırsız); dolunca istek gönderilmez.
- **Kullanan özellikler:** kelime doldurma ve alan önerileri, cümle ve ters çeviri değerlendirme, yeniden
  anlatma, hikaye bölümü, hafıza ipucu, kelime ailesi, günlük düzeltme, sohbet, aylık hata raporu,
  okuma öncesi sorular.
- **Sınır:** AI notlamaya ve takvime doğrudan karar vermez; değerlendirmesi (verdict + hata türü) normal
  cevap gibi motordan geçer.

## Hikaye modu ve hafıza ipucu

- **Hikaye:** her bölüm, `pickStoryWords` ile seçilen 6 zayıf kelimeyle (en düşük hatırlama olasılığı önce,
  açık hatası olan öne, son 2 bölümde kullanılanlar sona) AI tarafından yazılır. Önceki 3 bölümün özeti
  süreklilik için gönderilir. Metindeki `{{biçim}}` işaretleri boşluğa çevrilir; yalnızca bölüm
  kelimelerine ait işaretler boşluk olur. Her boşluğun ilk denemesi `mc_context` tekrarı olarak kaydedilir.
  Bölümler cihazda (`stories` tablosu) ve yedekte durur; AI kapalıyken de okunup tamamlanabilir.
- **Hafıza ipucu:** bir kelime 3 kez üst üste yanlış olunca yanlış cevap panelinde önerilir; AI ses
  benzerliği, sahne ve (doğruysa) köken üretir. Kabul edilen ipucu kelimenin notuna eklenir ve sonraki
  karşılaşmalarda gösterilir. AI yoksa kullanıcı kendi ipucunu yazar.
