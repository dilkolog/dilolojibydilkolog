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
| AI | Şimdilik yok | En sonda birlikte karar verilecek; motor AI olmadan çalışır |
| Kelime verisi | Elle hazırlanmış JSON seed (telifli sözlük içeriği kopyalanmaz) | — |

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
  data/          (Faz 2) Dexie şeması + repository
  ui/            (Faz 2) Ekranlar
```

## Şartnameden bilinçli sapmalar / eklemeler

- **FR/ES isimlerde cinsiyet:** veri modeline `gender` + `article` eklendi; yanlış artikel "gender" hatası
  olarak Mistake Bank'e düşer.
- **Kullanıcı "confidence" beyanı tutulmuyor:** şartname §21.2 gereği notlama tamamen objektif sinyallerden.
- **Low-stakes (pratik) modu:** cevaplar event olarak kaydedilir ama scheduler'ı ve Mistake Bank'i etkilemez (§19.6).
- **Kelime başına durum, anlam (sense) başına değil:** MVP'de çok anlamlı kelimelerin diğer anlamları
  "kademeli açılım" katmanı olarak gösterilir; sense bazlı takip sonraki sürüm.

## Fazlar

1. **Faz 1 — Motor + testler** (UI yok)
2. **Faz 2 — Vertical slice:** onboarding → yeni kelime → 2 recall egzersizi → sonuç → sonraki tekrar; Dexie
3. **Faz 3 — MVP ekranları:** Home/Today's Mission, Review, Word Detail, Mistake Bank, Progress; seed veri
4. **Faz 4 — AI katmanı** (karar sonra)
5. **Sonrası:** içe aktarma, hikaye modu, graph view, konuşma

## Açık sorular

- **PC ↔ mobil senkron:** Veri şimdilik cihazda. Seçenekler: JSON dışa/içe aktarma (Faz 3) ya da
  ücretsiz Supabase senkronu (sonra).
- **Seed veri boyutu:** Başlangıç için dil başına kaç kelime, hangi seviyeler?
