# LibriVox & Project Gutenberg Bölüm Bazlı Metin-Ses Eşleştirme Raporu

**Son Güncelleme:** 2026-10-27  
**Kapsam:** LibriVox kamu malı ses kayıtları ile Project Gutenberg açık metinlerinin bölüm bölüm (chapter-by-chapter) birebir eşleştirilmesi.  
**Amaç:** Diloloji okuma ve dinleme kütüphanesinde cümlenin sesi takip edebilmesi (*sentence-by-sentence audio follow*) için ses parçası ile metin parçasının aynı edisyon ve tam sınırlarla örtüşmesini sağlamak.  
**Üretim Betiği:** `scripts/build-round17-audiobooks.ts` (ve `scripts/build-audiobook-chapters.ts`)  
**Veri Çıktısı:** 
- `src/data/audiobooks/fr.json` (28 bölüm: 13 orijinal + 15 yeni)
- `src/data/audiobooks/es.json` (25 bölüm: 10 orijinal + 15 yeni)
- `src/data/audiobooks/en.json` (17 bölüm: ilk İngilizce kütüphanesi)

---

## 1. Yönetici Özeti ve Metodoloji

Önceki kaba envanterlerde her ses kaydı tek bir kitaba (ör. La Fontaine "Livre 01", 44 dk veya Alice in Wonderland 3 saat) işaret ederken Gutenberg metni tüm eserin tek parça dosyası halindeydi. Bu durum mobil ekranda pratik dinleme ve cümle takibi için elverişsizdi.

Bu çalışmada:
1. **Bölüm Parçalama:** Gutenberg düz metinlerinden her bölüm özgün başlangıç ve bitiş işaretçileri (`startMarker` / `endMarker`) ile ayıklandı; dipnotlar, sayfa numaraları, çizim etiketleri (`[Illustration]`, `[Picture]`) ve Gutenberg meta etiketleri temizlendi.
2. **Doğrudan MP3 Erişimi:** Her bölüm için LibriVox'un archive.org 64kbps MP3 URL'si alındı ve HTTP `HEAD` / `GET` isteği ile **HTTP 200 ve `audio/mpeg`** döndürdüğü tek tek doğrulandı.
3. **Metin-Ses Eşleşme Doğrulaması:** Ses kaydının okunan ilk cümleleri Gutenberg metninin başlangıcıyla karşılaştırılarak aynı edisyon/çeviri olduğu teyit edildi (`textAudioMatch: true`).

---

## 2. Fransızca Eserler ve Bölümler (28 Bölüm)

### 2.1. Alphonse Daudet — *Lettres de mon moulin* (13 Bölüm)
- **Gutenberg Kimliği:** #11770 | **CEFR Seviyesi:** B1
- **LibriVox Koleksiyonu:** `lettres_de_mon_moulin_naf_0901_librivox`
- **Okuyan:** Nadine Eckert-Boulet | **Lisans:** Kamu Malı / CC0
- **Eşleşme Notu:** Daudet'nin Provence lehçesi ve sıcak üslubu; okuyucunun duru Fransızca diksiyonu Gutenberg metniyle harfi harfine örtüşmektedir.

| Bölüm Kimliği | Başlık | Süre | LibriVox MP3 URL |
|:---|:---|:---:|:---|
| `fr-daudet-cornille` | Le secret de maître Cornille | ~11 dk | [MP3](https://archive.org/download/lettres_de_mon_moulin_naf_0901_librivox/lettresdemonmoulin_03_daudet_64kb.mp3) |
| `fr-daudet-chevre-seguin` | La chèvre de M. Seguin | ~12 dk | [MP3](https://archive.org/download/lettres_de_mon_moulin_naf_0901_librivox/lettresdemonmoulin_04_daudet_64kb.mp3) |
| `fr-daudet-etoiles` | Les étoiles | ~12 dk | [MP3](https://archive.org/download/lettres_de_mon_moulin_naf_0901_librivox/lettresdemonmoulin_05_daudet_64kb.mp3) |
| `fr-daudet-arlesienne` | L'Arlésienne | ~8 dk | [MP3](https://archive.org/download/lettres_de_mon_moulin_naf_0901_librivox/lettresdemonmoulin_06_daudet_64kb.mp3) |
| `fr-daudet-installation` | Installation | ~6 dk | [MP3](https://archive.org/download/lettres_de_mon_moulin_naf_0901_librivox/lettresdemonmoulin_01_daudet_64kb.mp3) |
| `fr-daudet-diligence` | La diligence de Beaucaire | ~7 dk | [MP3](https://archive.org/download/lettres_de_mon_moulin_naf_0901_librivox/lettresdemonmoulin_02_daudet_64kb.mp3) |
| `fr-daudet-mule-pape` | La mule du pape | ~20 dk | [MP3](https://archive.org/download/lettres_de_mon_moulin_naf_0901_librivox/lettresdemonmoulin_07_daudet_64kb.mp3) |
| `fr-daudet-phare-sanguinaires` | Le phare des Sanguinaires | ~11 dk | [MP3](https://archive.org/download/lettres_de_mon_moulin_naf_0901_librivox/lettresdemonmoulin_08_daudet_64kb.mp3) |
| `fr-daudet-semillante` | L'agonie de la Sémillante | ~11 dk | [MP3](https://archive.org/download/lettres_de_mon_moulin_naf_0901_librivox/lettresdemonmoulin_09_daudet_64kb.mp3) |
| `fr-daudet-douaniers` | Les douaniers | ~7 dk | [MP3](https://archive.org/download/lettres_de_mon_moulin_naf_0901_librivox/lettresdemonmoulin_10_daudet_64kb.mp3) |
| `fr-daudet-cure-cucugnan` | Le curé de Cucugnan | ~9 dk | [MP3](https://archive.org/download/lettres_de_mon_moulin_naf_0901_librivox/lettresdemonmoulin_11_daudet_64kb.mp3) |
| `fr-daudet-les-vieux` | Les vieux | ~13 dk | [MP3](https://archive.org/download/lettres_de_mon_moulin_naf_0901_librivox/lettresdemonmoulin_12_daudet_64kb.mp3) |
| `fr-daudet-ballades-prose` | Ballades en prose | ~11 dk | [MP3](https://archive.org/download/lettres_de_mon_moulin_naf_0901_librivox/lettresdemonmoulin_13_daudet_64kb.mp3) |

### 2.2. Voltaire — *Candide ou l'Optimisme* (6 Bölüm)
- **Gutenberg Kimliği:** #4650 | **CEFR Seviyesi:** B2
- **LibriVox Koleksiyonu:** `candide_ou_loptimisme_b_librivox`
- **Okuyan:** Bernard | **Lisans:** Kamu Malı / CC0
- **Eşleşme Notu:** Aydınlanma çağının felsefi hiciv şaheseri; berrak telaffuz ve zengin kelime dağarcığı.

| Bölüm Kimliği | Başlık | Süre | LibriVox MP3 URL |
|:---|:---|:---:|:---|
| `fr-voltaire-candide-01` | Chapitre I: Comment Candide fut élevé dans un beau château | ~8 dk | [MP3](https://archive.org/download/candide_ou_loptimisme_b_librivox/candide_01_voltaire_64kb.mp3) |
| `fr-voltaire-candide-02` | Chapitre II: Ce que devint Candide parmi les Bulgares | ~6 dk | [MP3](https://archive.org/download/candide_ou_loptimisme_b_librivox/candide_02_voltaire_64kb.mp3) |
| `fr-voltaire-candide-03` | Chapitre III: Comment Candide se sauva d’entre les Bulgares | ~6 dk | [MP3](https://archive.org/download/candide_ou_loptimisme_b_librivox/candide_03_voltaire_64kb.mp3) |
| `fr-voltaire-candide-04` | Chapitre IV: Comment Candide rencontra son ancien maître de philosophie | ~8 dk | [MP3](https://archive.org/download/candide_ou_loptimisme_b_librivox/candide_04_voltaire_64kb.mp3) |
| `fr-voltaire-candide-05` | Chapitre V: Tempête, naufrage, tremblement de terre | ~7 dk | [MP3](https://archive.org/download/candide_ou_loptimisme_b_librivox/candide_05_voltaire_64kb.mp3) |
| `fr-voltaire-candide-06` | Chapitre VI: Comment on fit un bel auto-da-fé | ~5 dk | [MP3](https://archive.org/download/candide_ou_loptimisme_b_librivox/candide_06_voltaire_64kb.mp3) |

### 2.3. Guy de Maupassant — *Le Horla et autres contes* (4 Bölüm)
- **Gutenberg Kimliği:** #10775 | **CEFR Seviyesi:** B2
- **LibriVox Koleksiyonu:** `lehorla_1203_naf_librivox`
- **Okuyan:** Nadine Eckert-Boulet | **Lisans:** Kamu Malı / CC0

| Bölüm Kimliği | Başlık | Süre | LibriVox MP3 URL |
|:---|:---|:---:|:---|
| `fr-maupassant-amour` | Amour | ~10 dk | [MP3](https://archive.org/download/lehorla_1203_naf_librivox/lehorla_02_maupassant_64kb.mp3) |
| `fr-maupassant-le-trou` | Le Trou | ~11 dk | [MP3](https://archive.org/download/lehorla_1203_naf_librivox/lehorla_03_maupassant_64kb.mp3) |
| `fr-maupassant-clochette` | Clochette | ~9 dk | [MP3](https://archive.org/download/lehorla_1203_naf_librivox/lehorla_05_maupassant_64kb.mp3) |
| `fr-maupassant-le-signe` | Le Signe | ~11 dk | [MP3](https://archive.org/download/lehorla_1203_naf_librivox/lehorla_07_maupassant_64kb.mp3) |

### 2.4. Jean de La Fontaine — *Fables de La Fontaine, Livre 01* (5 Bölüm)
- **Gutenberg Kimliği:** #17941 | **CEFR Seviyesi:** B1
- **LibriVox Koleksiyonu:** `fables_lafontaine_01_librivox`
- **Okuyan:** Jean-Luc | **Lisans:** Kamu Malı / CC0

| Bölüm Kimliği | Başlık | Süre | LibriVox MP3 URL |
|:---|:---|:---:|:---|
| `fr-lafontaine-cigale` | La Cigale et la Fourmi | ~1 dk | [MP3](https://archive.org/download/fables_lafontaine_01_librivox/fables_01_01_lafontaine_64kb.mp3) |
| `fr-lafontaine-corbeau` | Le Corbeau et le Renard | ~1 dk | [MP3](https://archive.org/download/fables_lafontaine_01_librivox/fables_01_02_lafontaine_64kb.mp3) |
| `fr-lafontaine-grenouille` | La grenouille qui veut se faire aussi grosse que le boeuf | ~1 dk | [MP3](https://archive.org/download/fables_lafontaine_01_librivox/fables_01_03_lafontaine_64kb.mp3) |
| `fr-lafontaine-loup-agneau` | Le Loup et l'Agneau | ~2 dk | [MP3](https://archive.org/download/fables_lafontaine_01_librivox/fables_01_10_lafontaine_64kb.mp3) |
| `fr-lafontaine-chene-roseau` | Le Chêne et le Roseau | ~2 dk | [MP3](https://archive.org/download/fables_lafontaine_01_librivox/fables_01_22_lafontaine_64kb.mp3) |

---

## 3. İspanyolca Eserler ve Bölümler (25 Bölüm)

### 3.1. Horacio Quiroga — *Cuentos de Amor de Locura y de Muerte* (14 Bölüm)
- **Gutenberg Kimliği:** #13507 | **CEFR Seviyesi:** B2
- **LibriVox Koleksiyonu:** `cuentosquiroga_1312_librivox`
- **Okuyan:** Karen | **Lisans:** Kamu Malı / CC0
- **Eşleşme Notu:** Latin Amerika'nın Poe'su sayılan Quiroga'nın psikolojik gerilim ve orman öyküleri.

| Bölüm Kimliği | Başlık | Süre | LibriVox MP3 URL |
|:---|:---|:---:|:---|
| `es-quiroga-a-la-deriva` | A la deriva | ~10 dk | [MP3](https://archive.org/download/cuentosquiroga_1312_librivox/cuentosdeamor_10_quiroga_64kb.mp3) |
| `es-quiroga-almohadon-plumas` | El almohadón de plumas | ~10 dk | [MP3](https://archive.org/download/cuentosquiroga_1312_librivox/cuentosdeamor_08_quiroga_64kb.mp3) |
| `es-quiroga-buques-suicidantes` | Los buques suicidantes | ~8 dk | [MP3](https://archive.org/download/cuentosquiroga_1312_librivox/cuentosdeamor_07_quiroga_64kb.mp3) |
| `es-quiroga-solitario` | El solitario | ~13 dk | [MP3](https://archive.org/download/cuentosquiroga_1312_librivox/cuentosdeamor_03_quiroga_64kb.mp3) |
| `es-quiroga-miel-silvestre` | La miel silvestre | ~15 dk | [MP3](https://archive.org/download/cuentosquiroga_1312_librivox/cuentosdeamor_16_quiroga_64kb.mp3) |
| `es-quiroga-isolda` | La muerte de Isolda | ~17 dk | [MP3](https://archive.org/download/cuentosquiroga_1312_librivox/cuentosdeamor_04_quiroga_64kb.mp3) |
| `es-quiroga-infierno-artificial` | El infierno artificial | ~19 dk | [MP3](https://archive.org/download/cuentosquiroga_1312_librivox/cuentosdeamor_05_quiroga_64kb.mp3) |
| `es-quiroga-gallina-degollada` | La gallina degollada | ~20 dk | [MP3](https://archive.org/download/cuentosquiroga_1312_librivox/cuentosdeamor_06_quiroga_64kb.mp3) |
| `es-quiroga-perro-rabioso` | El perro rabioso | ~20 dk | [MP3](https://archive.org/download/cuentosquiroga_1312_librivox/cuentosdeamor_09_quiroga_64kb.mp3) |
| `es-quiroga-insolacion` | La insolación | ~19 dk | [MP3](https://archive.org/download/cuentosquiroga_1312_librivox/cuentosdeamor_11_quiroga_64kb.mp3) |
| `es-quiroga-alambre-pua` | El alambre de púa | ~27 dk | [MP3](https://archive.org/download/cuentosquiroga_1312_librivox/cuentosdeamor_12_quiroga_64kb.mp3) |
| `es-quiroga-los-mensu` | Los Mensú | ~29 dk | [MP3](https://archive.org/download/cuentosquiroga_1312_librivox/cuentosdeamor_13_quiroga_64kb.mp3) |
| `es-quiroga-yaguai` | Yaguaí | ~28 dk | [MP3](https://archive.org/download/cuentosquiroga_1312_librivox/cuentosdeamor_14_quiroga_64kb.mp3) |
| `es-quiroga-pescadores-vigas` | Los pescadores de vigas | ~16 dk | [MP3](https://archive.org/download/cuentosquiroga_1312_librivox/cuentosdeamor_15_quiroga_64kb.mp3) |

### 3.2. Gustavo Adolfo Bécquer — *Leyendas* (11 Bölüm)
- **Gutenberg Kimliği:** #53552 (*Obras escogidas*) | **CEFR Seviyesi:** B1–B2
- **LibriVox Koleksiyonu:** `leyendas_becquer_1208_librivox`
- **Okuyan:** Tuxita & Kendal | **Lisans:** Kamu Malı / CC0

| Bölüm Kimliği | Başlık | Süre | LibriVox MP3 URL |
|:---|:---|:---:|:---|
| `es-becquer-hojas-secas` | Las Hojas Secas | ~9 dk | [MP3](https://archive.org/download/leyendas_becquer_1208_librivox/leyendas_18_becquer_64kb.mp3) |
| `es-becquer-ojos-verdes` | Los Ojos Verdes | ~21 dk | [MP3](https://archive.org/download/leyendas_becquer_1208_librivox/leyendas_19_becquer_64kb.mp3) |
| `es-becquer-rayo-luna` | El Rayo de Luna | ~25 dk | [MP3](https://archive.org/download/leyendas_becquer_1208_librivox/leyendas_08_becquer_64kb.mp3) |
| `es-becquer-monte-animas` | El Monte de las Ánimas | ~19 dk | [MP3](https://archive.org/download/leyendas_becquer_1208_librivox/leyendas_07_becquer_64kb.mp3) |
| `es-becquer-miserere` | El Miserere | ~23 dk | [MP3](https://archive.org/download/leyendas_becquer_1208_librivox/leyendas_06_becquer_64kb.mp3) |
| `es-becquer-maese-perez` | Maese Pérez el organista | ~37 dk | [MP3](https://archive.org/download/leyendas_becquer_1208_librivox/leyendas_20_becquer_64kb.mp3) |
| `es-becquer-tres-fechas` | Tres fechas | ~47 dk | [MP3](https://archive.org/download/leyendas_becquer_1208_librivox/leyendas_21_becquer_64kb.mp3) |
| `es-becquer-corza-blanca` | La corza blanca | ~47 dk | [MP3](https://archive.org/download/leyendas_becquer_1208_librivox/leyendas_12_becquer_64kb.mp3) |
| `es-becquer-rosa-pasion` | La rosa de pasión | ~21 dk | [MP3](https://archive.org/download/leyendas_becquer_1208_librivox/leyendas_17_becquer_64kb.mp3) |
| `es-becquer-promesa` | La promesa | ~27 dk | [MP3](https://archive.org/download/leyendas_becquer_1208_librivox/leyendas_16_becquer_64kb.mp3) |
| `es-becquer-gnomo` | El gnomo | ~38 dk | [MP3](https://archive.org/download/leyendas_becquer_1208_librivox/leyendas_05_becquer_64kb.mp3) |

---

## 4. İngilizce Eserler ve Bölümler (17 Bölüm — İlk EN Kütüphanesi)

### 4.1. Oscar Wilde — *The Happy Prince and Other Tales* (5 Masal)
- **Gutenberg Kimliği:** #902 | **CEFR Seviyesi:** B1
- **LibriVox Koleksiyonu:** `hpot_librivox`
- **Okuyan:** Moira Fogarty | **Lisans:** Public Domain / CC0
- **Eşleşme Notu:** İngiliz masal edebiyatının en lirik ve duygu yüklü klasikleri; tane tane konuşma ve duru fonetik.

| Bölüm Kimliği | Başlık | Süre | LibriVox MP3 URL |
|:---|:---|:---:|:---|
| `en-wilde-happy-prince` | The Happy Prince | ~18 dk | [MP3](https://archive.org/download/hpot_librivox/hpot_01_happy_prince_64kb.mp3) |
| `en-wilde-nightingale-rose` | The Nightingale and the Rose | ~12 dk | [MP3](https://archive.org/download/hpot_librivox/hpot_02_nightingale_rose_64kb.mp3) |
| `en-wilde-selfish-giant` | The Selfish Giant | ~9 dk | [MP3](https://archive.org/download/hpot_librivox/hpot_03_selfish_giant_64kb.mp3) |
| `en-wilde-devoted-friend` | The Devoted Friend | ~17 dk | [MP3](https://archive.org/download/hpot_librivox/hpot_04_devoted_friend_64kb.mp3) |
| `en-wilde-remarkable-rocket` | The Remarkable Rocket | ~18 dk | [MP3](https://archive.org/download/hpot_librivox/hpot_05_remarkable_rocket_64kb.mp3) |

### 4.2. Lewis Carroll — *Alice's Adventures in Wonderland* (12 Bölüm)
- **Gutenberg Kimliği:** #11 | **CEFR Seviyesi:** B1
- **LibriVox Koleksiyonu:** `alice_in_wonderland_librivox`
- **Okuyan:** LibriVox Gönüllüleri | **Lisans:** Public Domain / CC0
- **Eşleşme Notu:** Dünya edebiyatının en ünlü çocuk klasiği. 12 tam bölümün her biri bağımsız dinleme oturumu sağlar.

| Bölüm Kimliği | Başlık | Süre | LibriVox MP3 URL |
|:---|:---|:---:|:---|
| `en-carroll-alice-01` | Chapter I: Down the Rabbit-Hole | ~11 dk | [MP3](https://archive.org/download/alice_in_wonderland_librivox/wonderland_ch_01_64kb.mp3) |
| `en-carroll-alice-02` | Chapter II: The Pool of Tears | ~12 dk | [MP3](https://archive.org/download/alice_in_wonderland_librivox/wonderland_ch_02_64kb.mp3) |
| `en-carroll-alice-03` | Chapter III: A Caucus-Race and a Long Tale | ~18 dk | [MP3](https://archive.org/download/alice_in_wonderland_librivox/wonderland_ch_03_64kb.mp3) |
| `en-carroll-alice-04` | Chapter IV: The Rabbit Sends in a Little Bill | ~20 dk | [MP3](https://archive.org/download/alice_in_wonderland_librivox/wonderland_ch_04_64kb.mp3) |
| `en-carroll-alice-05` | Chapter V: Advice from a Caterpillar | ~13 dk | [MP3](https://archive.org/download/alice_in_wonderland_librivox/wonderland_ch_05_64kb.mp3) |
| `en-carroll-alice-06` | Chapter VI: Pig and Pepper | ~13 dk | [MP3](https://archive.org/download/alice_in_wonderland_librivox/wonderland_ch_06_64kb.mp3) |
| `en-carroll-alice-07` | Chapter VII: A Mad Tea-Party | ~17 dk | [MP3](https://archive.org/download/alice_in_wonderland_librivox/wonderland_ch_07_64kb.mp3) |
| `en-carroll-alice-08` | Chapter VIII: The Queen's Croquet-Ground | ~13 dk | [MP3](https://archive.org/download/alice_in_wonderland_librivox/wonderland_ch_08_64kb.mp3) |
| `en-carroll-alice-09` | Chapter IX: The Mock Turtle's Story | ~15 dk | [MP3](https://archive.org/download/alice_in_wonderland_librivox/wonderland_ch_09_64kb.mp3) |
| `en-carroll-alice-10` | Chapter X: The Lobster Quadrille | ~23 dk | [MP3](https://archive.org/download/alice_in_wonderland_librivox/wonderland_ch_10_64kb.mp3) |
| `en-carroll-alice-11` | Chapter XI: Who Stole the Tarts? | ~10 dk | [MP3](https://archive.org/download/alice_in_wonderland_librivox/wonderland_ch_11_64kb.mp3) |
| `en-carroll-alice-12` | Chapter XII: Alice's Evidence | ~13 dk | [MP3](https://archive.org/download/alice_in_wonderland_librivox/wonderland_ch_12_64kb.mp3) |

---

## 5. Uygulama Entegrasyonu Notu

Veriler `src/data/audiobooks.ts` modülü üzerinden tembel yükleme (lazy import) ile sunulmaktadır:
- `loadAudiobookChapters(language)`: İlgili dilin bölümlerini (`fr`, `es` veya `en`) asenkron olarak dinamik `import()` ile çeker.
- `chapterToReadingText(chapter)`: Bölümü Diloloji'nin standart `ReadingText` nesnesine dönüştürür. `book: { id, title, index, total }` yapısı sayesinde okuma kütüphanesinde (`ReadingLibrary.tsx`, `ReadingBooks.tsx`) kitap bazında gruplanarak sıralı bölümler halinde gösterilmektedir.
