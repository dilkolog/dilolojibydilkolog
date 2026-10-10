# Dilbilgisi Soruları Gözden Geçirme Raporu

**Tarih:** 2026-10-10  
**Kapsam:** Mevcut 96 dilbilgisi sorusu (24 Fransızca, 36 İspanyolca, 36 İngilizce)  
**Amaç:** Mevcut soru havuzunun pedagojik, tipolojik ve dilbilgisel kalitesini değerlendirmek; tespit edilen eksik/tartışmalı noktaları belgelemek ve 9. tur genişletmesi (`*-2.json`) için standartları belirlemek.

---

## 1. Mevcut Soru Havuzu Dağılımı

| Dil | Toplam | Seviye Dağılımı | Soru Tipleri (cloze / choice / error) | İpucu (hint) Oranı | Alternatif Cevap Sayısı |
| :--- | :---: | :--- | :--- | :---: | :---: |
| **Fransızca (FR)** | 24 | B1: 4 (%17) \| B2: 17 (%71) \| C1: 3 (%12) | 13 / 8 / 3 | 17 (%71) | 2 (%8) |
| **İspanyolca (ES)** | 36 | B1: 29 (%80) \| B2: 6 (%17) \| C1: 1 (%3) | 14 / 17 / 5 | 19 (%53) | 2 (%6) |
| **İngilizce (EN)** | 36 | B1: 0 (%0) \| B2: 16 (%44) \| C1: 20 (%56) | 16 / 15 / 5 | 17 (%47) | 5 (%14) |
| **Toplam / Ort.** | **96** | **B1: 33 \| B2: 39 \| C1: 24** | **43 / 40 / 13** | **53 (%55)** | **9 (%9)** |

### Konu Dağılımı
- **Fransızca (4 konu x 6 soru):** `subjonctif`, `participe_passe`, `pronoms_relatifs`, `conditionnel_passe`.
- **İspanyolca (6 konu x 6 soru):** `subjuntivo`, `ser_estar`, `por_para`, `se_pasivo`, `condicionales`, `perifrasis`.
- **İngilizce (6 konu x 6 soru):** `inversion`, `cleft`, `mixed_conditionals`, `subjunctive`, `participle_clauses`, `gerund_infinitive`.

---

## 2. Tespit Edilen Bulgular ve İyileştirme Notları

Mevcut veri dosyaları (`fr.json`, `es.json`, `en.json`) mimari kural gereği doğrudan değiştirilmemekte, tespit edilen hususlar yeni sürümlerde (`*-2.json`) pedagojik ders olarak uygulanmaktadır.

### 2.1. Fransızca (FR)
1. **`fr-participe_passe-03` ve `fr-participe_passe-06` — Yazım Hatası:**
   - `fr-participe_passe-03`: `explanation` metninde *"« Être » ile kurulan zamanlarda ortak özneyle uyar"* yazmaktadır. Burada "ortak" sözcüğü sehven "ortaç" (*participe passé*) yerine yazılmıştır.
   - `fr-participe_passe-06`: Benzer şekilde *"avoir ile bile ortak nesneyle uyar"* ifadesi yer almaktadır ("ortaç nesneyle uyar" olmalıdır).
   - **Pedagojik Not:** Yeni sorularda gramer terimleri tutarlı ve açık tutulmalıdır (*ortaç / geçmiş zaman sıfat-fiili*).
2. **Alternatif Yanıt Azlığı:**
   - `pronoms_relatifs` ve `subjonctif` sorularında tırnak işareti, apostrof (`qu'il` / `qu’il`) veya alternatif zarf konumlandırmaları için `alternatives` alanı yalnızca 2 soruda kullanılmıştır. Yeni sette eşdeğer kabul edilebilir yazımlar için alternatif listesi geniş tutulmalıdır.

### 2.2. İngilizce (EN)
1. **`en-mixed_conditionals-05` — Çift Token Karmaşası (Error Tipi):**
   - Soru: `prompt: "If I would have known, I would have told you."`, `answer: "would"`.
   - **Sorun:** Cümlede iki adet `"would"` sözcüğü geçmektedir (`If I would have known` ve `I would have told you`).
   - `sentenceTokens` motoru ilk eşleşen token'ı hatalı işaretlemektedir (`found = true` ile tek token seçilir). Ancak kullanıcı arayüzünde ikinci "would"a dokunduğunda sistem bunu yanlış kabul etmekte, bu da kullanıcıda kafa karışıklığı yaratmaktadır.
   - **Standart:** `error` tipi sorularda aranan hatalı kelime, cümlede **yalnızca ve kesinlikle bir kez** geçmelidir.
2. **`en-subjunctive-04` — Yönlendirme ve Bağlam Eksikliği (Cloze Tipi):**
   - Soru: `prompt: "She insisted that he ___ leave early."`, `answer: "not"`.
   - **Sorun:** Cümle boşluğunda fiil verilmediği için öğrenci boşluğa bir zarf mı, modal fiil mi (*should*) yoksa olumsuzluk eki mi geleceğini sadece cümleye bakarak kestirememektedir. İpucunda *"olumsuz subjunctive"* yazsa da ipucu kapalıyken soru belirsiz kalmaktadır.
   - **Standart:** Cloze sorularında hedeflenen yapı parantez içinde belirtilmelidir: örn. `___ (not / olumsuz)`.

### 2.3. İspanyolca (ES)
1. **`es-se_pasivo-06` — Pasif Refleksif vs. Impersonal Ayrımı:**
   - Soru: `prompt: "Se ___ a los invitados con una sonrisa."`, `answer: "recibió"`, `options: ["recibió", "recibieron"]`.
   - **Açıklama Kalitesi:** Açıklamada *"Kişi nesnesi « a » ile gelince « se » kişisiz yapıdadır ve fiil tekil kalır: se recibió a los invitados"* kuralı çok doğru özetlenmiştir.
   - **Denge Sorunu:** İspanyolca sorularının %80'i B1 düzeyindedir; DELE B2 ve C1 seviyesinde en çok zorlanılan `subjuntivo` (imperfecto/pluscuamperfecto), karmaşık şart cümleleri (*si hubieras venido...*) ve fiilimsili yan cümleler (*al + infinitivo*, *gerundio compuesto*) mevcut sette az temsil edilmiştir.

---

## 3. 9. Tur Genişletmesi (`*-2.json`) İçin Standartlar ve İlkeler

9. turda eklenecek yeni sorularda (`fr-2.json`, `es-2.json`, `en-2.json`) şu ilkelere tam uyulacaktır:

1. **Benzersiz Token Kuralı (Error Soruları):**
   - Hatalı kelime (`answer`), cümlenin tamamında metin olarak tekil olmalı; cümlenin başka bir yerinde aynı kelime doğru olarak bile yer almamalıdır.
2. **Seviye Dengesi (B1–C1):**
   - Fransızca: B1 (%25), B2 (%50), C1 (%25).
   - İspanyolca: B1 (%25), B2 (%50), C1 (%25) — özellikle B2/C1 oranları artırılacaktır.
   - İngilizce: B1 (%20), B2 (%50), C1 (%30) — ileri düzey yapıların yanı sıra sağlamlaştırıcı B1+ bağlayıcılar eklenecektir.
3. **Zengin ve Açıklayıcı İpuçları:**
   - Cloze sorularında hedeflenen mastar fiil ve zaman parantez içinde açıkça yazılacaktır: `___ (partir / conditionnel passé)`.
   - Seçmeli sorularda çeldiriciler öğrencilerin gerçekte en sık düştüğü yanılgılardan seçilecektir.
4. **Türkçe Açıklamaların Derinliği:**
   - Açıklamalarda sadece doğru cevap değil, *neden* bu yapının tercih edildiği, Türkçedeki mantıksal karşılığı ve dikkat edilmesi gereken tuzak belirtilecektir.
5. **Açık Lisans / Özgünlük:**
   - Sorular Diloloji'nin pedagojik müfredatına uygun özgün içerik olarak `Diloloji (özgün)` künyesiyle eklenecektir.
