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
