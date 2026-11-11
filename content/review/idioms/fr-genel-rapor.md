# Fransızca Deyim Paketleri Bağımsız Denetim Raporu (Genel Özet)

Bu rapor, `docs/DEYIM-PAKETI.md` kuralları doğrultusunda Antigravity tarafından Codex'in hazırladığı 10 Fransızca deyim paketinin (`docs/icerik-hazirlik/deyimler-fr/`, toplam 260 kayıt) bağımsız editoryal ve pedagojik denetimidir.

---

## 1. Yönetici Özeti ve Sayısal Dağılım

| Paket | Kod | Tema | Toplam | Sorunlu | Şüpheli | Temiz |
|---|---|---|:---:|:---:|:---:|:---:|
| 1 | `fr-0001` | İlk karma paket | 26 | 12 | 10 | 4 |
| 2 | `fr-0002` | Duygular ve tepkiler | 26 | 2 | 3 | 21 |
| 3 | `fr-0003` | Konuşma ve iletişim | 26 | 2 | 2 | 22 |
| 4 | `fr-0004` | Çalışma ve çaba | 26 | 4 | 2 | 20 |
| 5 | `fr-0005` | Karar, risk ve tedbir | 26 | 2 | 4 | 20 |
| 6 | `fr-0006` | İlişkiler ve dayanışma | 26 | 0 | 0 | 26 |
| 7 | `fr-0007` | Para ve kaynaklar | 26 | 2 | 2 | 22 |
| 8 | `fr-0008` | Zaman ve gündelik ritim | 26 | 7 | 2 | 17 |
| 9 | `fr-0009` | Başarı ve güçlükler | 26 | 2 | 2 | 22 |
| 10 | `fr-0010` | Anlama, sezgi ve yanılgı | 26 | 0 | 3 | 23 |
| **TOPLAM** | | **10 Paket** | **260** | **33** | **30** | **197** |

---

## 2. Temel Yapısal ve Şema Bulguları

1. **Çekirdek Liste (`fr-0000.json`) ile Çakışmalar:**
   - 1. paketteki 12 deyim (`donner sa langue au chat`, `poser un lapin`, `mettre les pieds dans le plat`, `coûter les yeux de la tête`, `tomber dans les pommes`, `chercher midi à quatorze heures`, `avoir du pain sur la planche`, `couper la poire en deux`, `prendre ses jambes à son cou`, `en faire tout un fromage`, `tourner autour du pot`, `avoir un coup de foudre`) ve sonraki paketlerdeki 2 deyim (`se creuser la tête`, `passer une nuit blanche`) çekirdek listede zaten mevcuttur.
   - Bu 14 kayıt çıkarılmalı ve yerlerine çekirdek listede bulunmayan yeni deyimler eklenmelidir.

2. **Paketler Arası Mükerrer Kayıtlar:**
   - `jeter l'éponge`: Hem Paket 1'de (`fr-idiom-000008`) hem Paket 4'te (`fr-idiom-000092`) yer almaktadır.
   - `tirer son épingle du jeu`: Hem Paket 1'de (`fr-idiom-000019`) hem Paket 9'da (`fr-idiom-000216`) yer almaktadır.
   - Mükerrer kayıtlar elenmelidir.

3. **Saydamlık ve Deyim Olmayan İfadeler:**
   - Saydam/düz ifadeler: `sauter de joie`, `être rouge de colère`, `garder un secret pour soi`, `se mettre au travail`, `prendre des risques calculés`, `avoir les moyens`, `placer son argent`, `prendre son temps`, `gagner du temps`, `perdre son temps`, `s'en sortir indemne`.
   - Zarf/isim öbekleri (mastar fiil kuralı): `dialogue de sourds`, `à la dernière minute`.
   - Atasözü niteliğindekiler: `une fois n'est pas coutume`, `mettre la charrue avant les bœufs`.

4. **CEFR Dağılımı Eksikliği:**
   - 260 kaydın tamamında `level: null` bırakılmıştır. `docs/DEYIM-PAKETI.md` gereğince parti başına **6 B1, 12 B2, 13 C1** dağılımı atanmalıdır.

5. **Kaynak Çifti Eksikliği (`src`):**
   - Kayıtların çoğunda yalnızca tek sözlük bağlantısı verilmiştir. Her deyim için 2 bağımsız kaynak (sözlük + gerçek kullanım/korpus) gerekmektedir. `fr-idiom-000117` kaynağı ise 403 vermektedir.

6. **Parti Boyutu ve Dosya Yolu Uyumsuzluğu:**
   - Paketler 26'şar kayıtlıdır (hedef: 31).
   - Dosyalar `docs/icerik-hazirlik/` altındadır; derleme hattı için `content/raw/idioms/fr-NNNN.json` yoluna dönüştürülmelidir.

---

## 3. Yol Haritası ve Öneri

- Codex, temiz olan **197 deyimi** koruyarak ve sorunlu 33 kaydın yerine yeni mecaz deyimler ekleyerek, paketleri `docs/DEYIM-PAKETI.md` şemasına dönüştürmelidir:
  - **Tur 1:** `fr-0001.json` .. `fr-0004.json` (her biri 31 deyim, 6 B1, 12 B2, 13 C1).
- Paketler 4'erli turlar hâlinde `content/raw/idioms/` altına taşınıp `node scripts/build-idioms.mjs` ve `src/data/idioms.test.ts` ile doğrulanmalıdır.
