# Diloloji — Veri Bütünlüğü ve Şema Bekçisi Raporu

**Tarih:** 2026-10-17  
**Kapsam:** `src/data/` altındaki tüm `import.meta.glob` JSON klasörleri ve TypeScript tabanlı oyun/alıştırma havuzları  
**Otomatik Koruma Testi:** [`src/data/dataIntegrity.test.ts`](file:///Users/aliaydin/Downloads/Diloloji%20-%20Ana%20Proje/src/data/dataIntegrity.test.ts) (20/20 test yeşil)

---

## 1. Giriş ve Amaç

Farklı yapay zekâ modellerinin (Claude Code, Antigravity) eş zamanlı veya ardışık çalışması sırasında, bir ajanın eklediği yeni veri kimliğinin (`id`) başka bir dosyadaki mevcut kimlikle çakışması (`id collision`) riski bulunmaktadır. Örneğin, `fr-10.json` dosyasındaki bazı soru kimlikleri daha önce `fr-8.json` dosyasında kullanılmış ve testler bunu yakalayana kadar sessiz veri ezilmesine yol açmıştı.

Bu sorunu kalıcı olarak önlemek için tüm veri kümelerini tek merkezden şema, kimlik benzersizliği ve veri doluluğu açısından doğrulayan **Data Integrity and Schema Guardian** test paketi kurulmuştur.

---

## 2. Denetlenen Veri Kümeleri ve Kayıt Sayıları

| # | Veri Kümesi | Dosya / Klasör | Kayıt Sayısı | Şema ve Zorunlu Alanlar | Kimlik Kuralı |
|---|---|---|:---:|---|---|
| 1 | **Dilbilgisi Alıştırmaları** | `src/data/grammar/*.json` (30 dosya) | **667** | `id`, `language`, `topic`, `type`, `explanation`, `source`, (`options`, `fix`, `prompt`) | `${lang}-*` |
| 2 | **Eşdizim Çiftleri (Sözlük)** | `src/data/collocations/*.json` (9 dosya) | **263** | `id`, `language`, `lemmas` ($\ge 1$), `pattern`, `example`, `tr`, `source` | `${lang}-*` |
| 3 | **Refleks Cümleleri** | `src/data/reflex/*.json` (3 dosya) | **143** | `id`, `tr`, `fr`, `es`, `en` (dört dilde paralel karşılık) | `reflex-*` |
| 4 | **Yalancı Eşdeğerler (Traps)** | `src/data/traps/*.json` (9 dosya) | **223** | `id`, `language`, `lemma`, `looks`, `trap`, `meaning`, `text`, `tr`, `source` | `${lang}-*` |
| 5 | **Dil Düzeyi (Register)** | `src/data/register/*.json` (9 dosya) | **150** | `id`, `language`, `tr`, `informal`, `standard`, `formal`, `source` | `${lang}-*` |
| 6 | **Metin Akışı & Bağlaçlar (Flow)** | `src/data/flow/*.json` (6 dosya) | **45** | `id`, `language`, `text` (`{1}`, `{2}` boşluklu), `tr`, `gaps`, `source` | `${lang}-*` |
| 7 | **Hata Avcısı (Spot the Error)** | `src/data/spotErrors.ts` | **105** | `id`, `language`, `level`, `sentence`, `errorIndex`, `faulty`, `correct`, `distractors`, `rule`, `explanation` | `${lang}-spot-*` |
| 8 | **Cümle Dönüşümü (Rewrites)** | `src/data/sentenceRewrites.ts` | **105** | `id`, `language`, `level`, `sourceSentence`, `sourceTr`, `keyword` (BÜYÜK HARF), `targetPrefix`, `acceptedAnswers`, `explanation` | `${lang}-rw-*` |
| 9 | **Edat ve Kalıp Alıştırması** | `src/data/collocationDrill.ts` | **120** | `id`, `language`, `level`, `type`, `pattern`, `clozeSentence` (`___`), `target`, `options` (4 adet), `explanation` | `${lang}-colloc-*` |
| **TOPLAM** | **9 Farklı Havuz** | **66+ Veri Dosyası** | **1.821** | **%100 Şema ve Bütünlük Doğrulandı** | **0 Çakışma** |

---

## 3. Uygulanan Koruma ve Denetim Kuralları

1. **Kimlik Benzersizliği (Strict Uniqueness):**
   - Her veri kümesi kendi içinde mükerrer kimlik içeremez (`Set(ids).size === ids.length`).
   - Farklı oyun havuzları arasında da global kimlik çakışması engellenmiştir (`Global Cross-Dataset Collision Guard`).
2. **Dil Kodu Eşleşmesi (Language Prefix Guard):**
   - Her soru/öğe kimliği zorunlu olarak ait olduğu dil koduyla (`en-`, `fr-`, `es-`) başlamak zorundadır. Bu, dil filtreleme hatalarını önler.
3. **Boşluk ve İndeks Doğrulaması:**
   - `spotErrors`: `sentence.split(' ')[errorIndex]` sözcüğü ile `faulty` alanındaki hatalı sözcük (noktalama işaretlerinden arındırılarak) birebir örtüşmelidir.
   - `collocationDrill`: `clozeSentence` mutlaka `___` içermeli; `options` tam 4 seçenekten oluşmalı ve `target` doğru cevabını içermelidir.
   - `sentenceRewrites`: `keyword` zorunlu olarak tamamen büyük harfli olmalı, `acceptedAnswers` boş dizi olmamalıdır.
   - `flow`: Paragraf metni `{1}`, `{2}` formatında numaralı boşluklar taşımalı; her boşluğun `options` seçenekleri doğru `answer`ı barındırmalıdır.
4. **Pedagojik Açıklama Güvencesi:**
   - Tüm dilbilgisi, hata avcısı, yeniden yazma ve kalıp sorularında Türkçe kural açıklaması (`explanation`) en az 15 karakter uzunluğunda olmalı ve kuralın mantığını öğretmelidir.

---

## 4. Test Çalıştırma

Tüm veri bütünlüğü denetimi şu komutla saniyeler içinde çalıştırılır:
```bash
npx vitest run src/data/dataIntegrity.test.ts
```
CI ve yerel doğrulama süreçlerinde yeni bir soru seti eklendiğinde kimlik çakışması veya eksik alan varsa test anında hata vererek bozuk verinin repoya girmesini engeller.
