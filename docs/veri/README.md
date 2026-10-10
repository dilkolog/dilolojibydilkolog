# Kelime Koçu — Veri Araştırmaları ve İyileştirme Dosyaları

Bu dizin (`docs/veri/`), uygulama sözlük paketleri (`src/data/wordpack/`), ses dosyaları, anlamlar ve dil bilgisi tabloları için yapılan araştırmaların, veri doğrulamalarının ve eksik tamamlama haritalarının çıktılarını içerir.

---

## 1. İsim Cinsiyeti Tamamlama (`gender-fr.json`, `gender-es.json`)

Uygulama sözlük paketlerindeki (`src/data/wordpack/{fr,es}.json`) isimlerden (`p: "n"`) cinsiyet alanı (`g`) bulunmayan kelimeler taranmış, açık lisanslı akademik sözlük kaynakları üzerinden cinsiyetleri çıkarılmıştır.

### Kaynaklar ve Lisanslar
- **Fransızca (`gender-fr.json`):**  
  **Kaynak:** [Lexique 3.83](http://www.lexique.org/) (Boris New, Christophe Pallier vd.)  
  **Lisans:** [Creative Commons Attribution-ShareAlike 4.0 (CC BY-SA 4.0)](https://creativecommons.org/licenses/by-sa/4.0/)  
  *Doğrulama:* Lexique resmi web sitesi ve akademik yayın künyesinden teyit edilmiştir.
- **İspanyolca (`gender-es.json`):**  
  **Kaynak:** [ELELex](https://cental.uclouvain.be/cefrlex/static/resources/es/ELELex.tsv) (UCLouvain CENTAL; Thomas François & Sylvie De Cock, 2017)  
  **Lisans:** [Creative Commons Attribution-NonCommercial-ShareAlike 4.0 (CC BY-NC-SA 4.0)](https://creativecommons.org/licenses/by-nc-sa/4.0/)  
  *Etiket kuralları:* `NCM` = eril (`"m"`), `NCF` = dişil (`"f"`), `NCC` / `NCM+NCF` = iki cinsiyetli (`"mf"`).

### Doldurulan Boşluklar ve İstatistikler

| Dil | Toplam İsim | Cinsiyeti Eksik İsim | Kaynakla Doldurulan | Çelişki (`conflicts`) | Doğrudan Kapsam Oranı |
|---|---|---|---|---|---|
| **Fransızca** | 8.298 | 57 | **49** | 0 | **%85,9** |
| **İspanyolca** | 7.308 | 43 | **32** | 0 | **%74,4** |

### Çözümlenen Kelimeler Özeti

- **Fransızca Örnekler (`gender-fr.json`):**  
  `affaires` (f), `amitiés` (f), `anneaux` (m), `armes` (f), `colonnes` (f), `courses` (f), `écouteurs` (m), `épinards` (m), `lunettes` (f), `maths` (f), `menottes` (f), `sous-vêtements` (m), `travaux` (m), `urgences` (f), `valises` (f)...  
  *(Çoğul isimlerin tekil lemmatizasyonları Lexique üzerinden doğrulanarak tam eşleştirme sağlanmıştır).*
- **İspanyolca Örnekler (`gender-es.json`):**  
  `albóndigas` (f), `alfileres` (m), `bragas` (f), `clases` (f), `conclusiones` (f), `croquetas` (f), `datos` (m), `deberes` (m), `flores` (f), `huevos` (m), `jefes` (mf), `joyas` (f), `letras` (f), `manzanas` (f), `medios` (m), `pelotas` (f), `restos` (m), `trámites` (m), `urgencias` (f), `vueltas` (f)...

### Kaynakta Yer Almayan Kelimeler ve Önerilen Karşılıklar

Aşağıdaki kelimeler korpuslarda geçmeyen kısaltmalar, argo veya türemiş biçimler olduğu için ayrı olarak listelenmiştir:

- **Fransızca (8 kelime):**
  - `mr` (*monsieur*): `m`
  - `touché` (*eskrim / mecaz*): `m`
  - `no` (*numéro / tiyatro nô*): `m`
  - `sachant` (*hukuk terimi: un sachant*): `m`
  - `ba` (*bonne action / baccalauréat*): `mf`
  - `vo` (*version originale*): `f`
  - `vf` (*version française*): `f`
  - `vhs` (*cassette VHS*): `f`
- **İspanyolca (11 kelime):**
  - `antiguos` (*los antiguos*): `m`
  - `cao` (*el k.o. / el cao*): `m`
  - `cariñosa` (*la cariñosa*): `f`
  - `cañerías` (*la cañería*): `f`
  - `encantados` (*los encantados*): `m`
  - `facciones` (*la facción*): `f`
  - `fulana` (*la fulana*): `f`
  - `ovarios` (*el ovario*): `m`
  - `pesas` (*la pesa*): `f`
  - `quemarropa` (*a quemarropa*): `m`
  - `sabiendas` (*a sabiendas*): `f`

---

## 2. Fiil Tablosu Kapsamı (`verb-coverage.md`)

A1–B2 CEFR seviyesindeki fiiller (`src/data/cefr/{fr,es}.txt`) ile Fiil Laboratuvarı çekim tabloları (`src/data/tenses/{fr,es}.json`) karşılaştırılmıştır.

- **Fransızca (FR):** 834 fiilden **827'si mevcut** (%99,16 kapsam). Eksik 7 fiil: A1'de 4 (`pleuvoir`, `soit`, `voici`, `voilà`), A2'de 3 (`paître`, `falloir`, `neiger`), B1/B2'de 0 eksik.
- **İspanyolca (ES):** 815 fiilden **716'sı mevcut** (%87,85 kapsam). Eksik 99 fiil: A1'de 5, A2'de 31, B1'de 34, B2'de 29.
- *Ayrıntılı döküm:* [`verb-coverage.md`](./verb-coverage.md) dosyasında seviye seviye listelenmiştir.

---

## 3. İspanyolca Ses Kaynakları (`es-audio-sources.md`)

Lingua Libre dışındaki açık lisanslı İspanyolca ses kaynakları taranmış, pakette sesi olmayan en sık 2.000 İspanyolca kelime (812 eksik) için kapsam hesaplanmıştır:

- **Wikimedia Commons (Lingua Libre dışı):** ~3.200 dosya (`Es-*.ogg` ve bölgesel kategoriler; CC BY-SA / GFDL). Eksik 812 kelimeden ~110–135'ini (%13,5 – %16,6) kapsar.
- **Shtooka Projesi (`spa-wims-octavio`):** 1.739 kayıt (WimsEdu, Octavio Paniagua; CC BY 3.0 US). Eksik kelimelerden ~65–85'ini (%8,0 – %10,5) kapsar.
- **Birleşik Kapsam:** ~165–190 kelime (%20,3 – %23,4).
- **Kalan ~630 Kelime:** Neredeyse tamamen çekimli fiil formlarıdır (*estoy, tengo, fue, quiero*); kelime bankalarında yer almaz. Tatoeba cümle seslerinden kırpma veya açık lisanslı nöral TTS (Piper TTS) önerilmektedir.
- *Ayrıntılı rapor:* [`es-audio-sources.md`](./es-audio-sources.md) dosyasındadır.

---

## 4. Eksik Türkçe Anlamlar (`tr-missing-{en,fr,es}.csv`)

En sık 5.000 kelimelik sıklık listelerinde (`src/data/frequency/{dil}.txt`) yer alıp sözlük paketinde Türkçesi (`t`) bulunmayan kelimeler için öneri tabloları oluşturulmuştur:

- **İngilizce (`tr-missing-en.csv`):** 1.582 eksik kelime (34 yüksek, 1.024 orta, 524 düşük). Ağırlıklı olarak çekimli fiiller (*was, got, were*), bağlaçlar ve konuşma dili kısaltmaları (*gonna, wanna, didn't*).
- **Fransızca (`tr-missing-fr.csv`):** 2.243 eksik kelime (172 yüksek, 1.412 orta, 659 düşük). Form tablosu köprülemesiyle çekimli fiil kök anlamları ve İngilizce karşılık üzerinden doğrudan Türkçe çeviriler.
- **İspanyolca (`tr-missing-es.csv`):** 2.486 eksik kelime (151 yüksek, 1.898 orta, 437 düşük). Çekimli fiiller (*estoy, tengo, quiero*) ve edat tamlamaları.
- **Biçim:** `kelime,sira,ingilizce,oneri_turkce,guven` (yüksek / orta / düşük).
- *Kullanım:* Bu listeler kullanıcı veya Claude tarafından gözden geçirilip `src/data/wordpackBuild.ts` içerisine entegre edilebilir bir taslak öneri niteliğindedir.

---

## 5. Örnek Cümle Kapsamı (`sentence-coverage.md`)

En sık 3.001–10.000 arasındaki kelimeler (dil başına 7.000 kelime) için Tatoeba dışa aktarımları taranmış; doğrudan ve köprülü Türkçe çeviri kapsamı hesaplanmıştır:

- **İngilizce (EN):** 7.000 kelimeden **6.812'sinin cümlesi var (%97,3)**; **6.323'ünün Türkçe çevirisi var (%90,3)**.
- **Fransızca (FR):** 7.000 kelimeden **6.298'inin cümlesi var (%90,0)**; **5.875'inin Türkçe çevirisi var (%83,9)**.
- **İspanyolca (ES):** 7.000 kelimeden **6.617'sinin cümlesi var (%94,5)**; **6.172'sinin Türkçe çevirisi var (%88,2)**.
- *Sonuç:* Sözlük paketlerinin 3.000 kelimeden 10.000 kelimeye genişletilmesi durumunda kelimelerin %84–%90'ı için kaliteli Türkçe çevirili örnek cümle mevcuttur.
- *Ayrıntılı döküm:* [`sentence-coverage.md`](./sentence-coverage.md) dosyasındadır.

---

## 6. Bozuk Ses Bağlantıları (`dead-audio.json`)

Sözlük paketlerindeki (`src/data/wordpack/{en,fr,es}.json`) ses URL'lerine (`a` alanı) Wikimedia sunucularını yormamak amacıyla istekler arasında 350 ms beklenerek HEAD istekleri atılmıştır:

- **Tespit Edilen Bozuk Bağlantılar:**
  - **Fransızca (FR):** `plus` -> `https://upload.wikimedia.org/wikipedia/commons/transcoded/f/f5/Fr-plus.ogg/Fr-plus.ogg.mp3` (404 Not Found). Wikimedia Commons transcode kuyruğunda MP3 türevi eksiktir; orijinal OGG (`Fr-plus.ogg`) mevcuttur.
  - **İngilizce (EN):** Taranan yüksek sıklıklı transcoded MP3 adreslerinde 404 bulunmamıştır.
  - **İspanyolca (ES):** Paketteki 6 transcoded adresin tamamı 200 dönmektedir; kalan 7.873 ses doğrudan Lingua Libre WAV dosyası olup Commons ana depolamasında yer almaktadır.
- **Teknik Not (Rate Limiting):** Wikimedia Commons CDN'i (upload.wikimedia.org), aynı IP adresinden 300 ms aralıkla dahi gelse birkaç yüz istekten sonra geçici olarak `429 Too Many Requests` döndürmektedir. Bu nedenle tüm paketlerin periyodik kontrolü için istek aralıklarının 500–1000 ms tutulması önerilir.
- *Çıktı:* [`dead-audio.json`](./dead-audio.json) dosyasında dile göre listelenmiştir.

---

## 7. Dilbilgisi Soruları Gözden Geçirme (`gramer-gozden-gecirme.md`)

Mevcut 96 dilbilgisi sorusu (24 FR, 36 ES, 36 EN) pedagojik, tipolojik ve dilbilgisel açılardan incelenmiş; tespit edilen yazım ve şablon tutarsızlıkları belgelenmiştir. 120 yeni soru (`*-2.json`) için benzersiz token ve açıklama standartları belirlenmiştir.

- *Ayrıntılı rapor:* [`gramer-gozden-gecirme.md`](./gramer-gozden-gecirme.md) dosyasındadır.

---

## 8. Minimal Çift Ses Kayıtları Denetimi (`minimal-cift-kayitlari.md`)

`src/engine/listening.ts` dosyasındaki `MINIMAL_PAIRS` listesine son eklenen 26 minimal çift (52 kelime: 14 EN, 7 FR, 5 ES) taranmış; yüksek değişkenlikli fonetik eğitim (HVPT) için gerekli olan kelime başına ≥2 konuşmacı durumu incelenmiştir.

- **İngilizce:** Kelimelerin %54'ünde ≥2 konuşmacı mevcut; tüm kelimeler en az 1 gerçek ana dil kaydına sahip.
- **Fransızca:** `son` istisnası hariç kelimelerin %93'ünde 4–11 farklı konuşmacı mevcut.
- **İspanyolca:** İngilizce Wiktionary'nin `{{es-pr}}` modülü ve çekimli fiil formları nedeniyle oyun yerel Web Speech API sesine geçmektedir.
- **Açık Kaynaklar:** Commons, Shtooka (CC BY 3.0 US) ve lisans ihlali yaratan Forvo kısıtlaması değerlendirilmiştir.
- *Ayrıntılı rapor:* [`minimal-cift-kayitlari.md`](./minimal-cift-kayitlari.md) dosyasındadır.

