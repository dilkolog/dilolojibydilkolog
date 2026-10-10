# LibriVox & Project Gutenberg Bölüm Bazlı Metin-Ses Eşleştirme Raporu

**Tarih:** 2026-10-10  
**Kapsam:** LibriVox kamu malı ses kayıtları ile Project Gutenberg açık metinlerinin bölüm bölüm (chapter-by-chapter) birebir eşleştirilmesi.  
**Amaç:** Kelime Koçu okuma ve dinleme kütüphanesinde cümlenin sesi takip edebilmesi (*sentence-by-sentence audio follow*) için ses parçası ile metin parçasının aynı baskı ve tam sınırlarla örtüşmesini sağlamak.  
**Üretim Betiği:** `scripts/build-audiobook-chapters.ts`  
**Veri Çıktısı:** `src/data/audiobooks/fr.json` (13 bölüm) ve `src/data/audiobooks/es.json` (10 bölüm).

---

## 1. Yönetici Özeti ve Metodoloji

Önceki envanterde (`audiobooks-{fr,es}.json`) her ses kaydı tek bir kitaba (ör. La Fontaine "Livre 01", 44 dk) işaret ederken Gutenberg metni tüm eserin yüzlerce sayfalık tek dosyası halindeydi. Bu durum mobil ekranda pratik dinleme ve cümle takibi için aşırı büyüktü.

Bu çalışmada:
1. **Bölüm Parçalama:** Gutenberg düz metinlerinden her bölüm özgün başlangıç ve bitiş işaretçileri (`startMarker` / `endMarker`) ile ayıklandı; dipnotlar, sayfa numaraları ve Gutenberg meta etiketleri temizlendi.
2. **Doğrudan MP3 Erişimi:** Her bölüm için LibriVox'un archive.org 64kbps MP3 URL'si alındı ve HTTP `HEAD` isteği ile **HTTP 200 ve `audio/mpeg`** döndürdüğü tek tek doğrulandı.
3. **Metin-Ses Eşleşme Doğrulaması:** Ses kaydının ilk 1–2 dakikasındaki okunan cümleler Gutenberg metninin başlangıcıyla karşılaştırılarak aynı edisyon/çeviri olduğu teyit edildi (`textAudioMatch: true`).

---

## 2. Fransızca Eserler ve Bölümler (13 Bölüm)

### 2.1. Alphonse Daudet — *Lettres de mon moulin*
- **Gutenberg Kimliği:** #11770 | **CEFR Seviyesi:** B1
- **LibriVox Koleksiyonu:** `lettres_de_mon_moulin_naf_0901_librivox`
- **Okuyan:** Nadine Eckert-Boulet | **Lisans:** Kamu Malı / CC0
- **Eşleşme Notu:** Daudet'nin Provence lehçesi ve sıcak üslubu; okuyucunun duru Fransızca diksiyonu Gutenberg metniyle harfi harfine örtüşmektedir.

| Bölüm Kimliği | Başlık | Süre | Karakter Sayısı | LibriVox MP3 URL |
|:---|:---|:---:|:---:|:---|
| `fr-daudet-cornille` | Le secret de maître Cornille | ~11 dk | 11.421 | [MP3](https://archive.org/download/lettres_de_mon_moulin_naf_0901_librivox/lettresdemonmoulin_03_daudet_64kb.mp3) |
| `fr-daudet-chevre-seguin` | La chèvre de M. Seguin | ~12 dk | 11.564 | [MP3](https://archive.org/download/lettres_de_mon_moulin_naf_0901_librivox/lettresdemonmoulin_04_daudet_64kb.mp3) |
| `fr-daudet-etoiles` | Les étoiles | ~12 dk | 11.558 | [MP3](https://archive.org/download/lettres_de_mon_moulin_naf_0901_librivox/lettresdemonmoulin_05_daudet_64kb.mp3) |
| `fr-daudet-arlesienne` | L'Arlésienne | ~8 dk | 7.158 | [MP3](https://archive.org/download/lettres_de_mon_moulin_naf_0901_librivox/lettresdemonmoulin_06_daudet_64kb.mp3) |

- **Başlangıç/Bitiş İşaretleri:**
  - *Cornille:* Başlangıç `LE SECRET DE MAITRE CORNILLE`, bitiş `LA CHÈVRE DE M. SEGUIN`
  - *Seguin:* Başlangıç `LA CHÈVRE DE M. SEGUIN`, bitiş `LES ÉTOILES`
  - *Étoiles:* Başlangıç `LES ÉTOILES - RÉCIT D'UN BERGER PROVENÇAL`, bitiş `L'ARLÉSIENNE`
  - *Arlésienne:* Başlangıç `L'ARLÉSIENNE`, bitiş `LA MULE DU PAPE`

---

### 2.2. Guy de Maupassant — *Le Horla et autres contes*
- **Gutenberg Kimliği:** #10775 | **CEFR Seviyesi:** B2
- **LibriVox Koleksiyonu:** `lehorla_1203_naf_librivox`
- **Okuyan:** Nadine Eckert-Boulet | **Lisans:** Kamu Malı / CC0
- **Eşleşme Notu:** Maupassant'ın 1887 tarihli derlemesindeki kısa anlatılar; sesin girişinde duyulan başlık ve ilk paragraflar Gutenberg metniyle birebir aynıdır.

| Bölüm Kimliği | Başlık | Süre | Karakter Sayısı | LibriVox MP3 URL |
|:---|:---|:---:|:---:|:---|
| `fr-maupassant-amour` | Amour | ~10 dk | 11.177 | [MP3](https://archive.org/download/lehorla_1203_naf_librivox/lehorla_02_maupassant_64kb.mp3) |
| `fr-maupassant-le-trou` | Le Trou | ~11 dk | 13.239 | [MP3](https://archive.org/download/lehorla_1203_naf_librivox/lehorla_03_maupassant_64kb.mp3) |
| `fr-maupassant-clochette` | Clochette | ~9 dk | 10.036 | [MP3](https://archive.org/download/lehorla_1203_naf_librivox/lehorla_05_maupassant_64kb.mp3) |
| `fr-maupassant-le-signe` | Le Signe | ~11 dk | 11.920 | [MP3](https://archive.org/download/lehorla_1203_naf_librivox/lehorla_07_maupassant_64kb.mp3) |

---

### 2.3. Jean de La Fontaine — *Fables de La Fontaine, Livre 01*
- **Gutenberg Kimliği:** #17941 (Tome Premier) | **CEFR Seviyesi:** B1
- **LibriVox Koleksiyonu:** `fables_lafontaine_01_librivox`
- **Okuyan:** Jean-Luc | **Lisans:** Kamu Malı / CC0
- **Eşleşme Notu:** Fransız klasik manzum edebiyatının en ünlü fablları; her fabl bağımsız 1–2 dakikalık ideal mikro-dinleme seansları oluşturur.

| Bölüm Kimliği | Başlık | Süre | Karakter Sayısı | LibriVox MP3 URL |
|:---|:---|:---:|:---:|:---|
| `fr-lafontaine-cigale` | La Cigale et la Fourmi | ~1 dk | 600 | [MP3](https://archive.org/download/fables_lafontaine_01_librivox/fables_01_01_lafontaine_64kb.mp3) |
| `fr-lafontaine-corbeau` | Le Corbeau et le Renard | ~1 dk | 671 | [MP3](https://archive.org/download/fables_lafontaine_01_librivox/fables_01_02_lafontaine_64kb.mp3) |
| `fr-lafontaine-grenouille` | La grenouille qui veut se faire aussi grosse que le boeuf | ~1 dk | 585 | [MP3](https://archive.org/download/fables_lafontaine_01_librivox/fables_01_03_lafontaine_64kb.mp3) |
| `fr-lafontaine-loup-agneau` | Le Loup et l'Agneau | ~2 dk | 1.058 | [MP3](https://archive.org/download/fables_lafontaine_01_librivox/fables_01_10_lafontaine_64kb.mp3) |
| `fr-lafontaine-chene-roseau` | Le Chêne et le Roseau | ~2 dk | 1.241 | [MP3](https://archive.org/download/fables_lafontaine_01_librivox/fables_01_22_lafontaine_64kb.mp3) |

---

## 3. İspanyolca Eserler ve Bölümler (10 Bölüm)

### 3.1. Horacio Quiroga — *Cuentos de Amor de Locura y de Muerte*
- **Gutenberg Kimliği:** #13507 | **CEFR Seviyesi:** B2
- **LibriVox Koleksiyonu:** `cuentosquiroga_1312_librivox`
- **Okuyan:** Karen | **Lisans:** Kamu Malı / CC0
- **Eşleşme Notu:** Latin Amerika'nın Poe'su sayılan Quiroga'nın Misiones nehir kıyılarında geçen unutulmaz psikolojik ve macera öyküleri. Ses kaydı ve Gutenberg metni kusursuz örtüşür.

| Bölüm Kimliği | Başlık | Süre | Karakter Sayısı | LibriVox MP3 URL |
|:---|:---|:---:|:---:|:---|
| `es-quiroga-a-la-deriva` | A la deriva | ~10 dk | 6.134 | [MP3](https://archive.org/download/cuentosquiroga_1312_librivox/cuentosdeamor_10_quiroga_64kb.mp3) |
| `es-quiroga-almohadon-plumas` | El almohadón de plumas | ~10 dk | 7.210 | [MP3](https://archive.org/download/cuentosquiroga_1312_librivox/cuentosdeamor_08_quiroga_64kb.mp3) |
| `es-quiroga-buques-suicidantes` | Los buques suicidantes | ~8 dk | 6.694 | [MP3](https://archive.org/download/cuentosquiroga_1312_librivox/cuentosdeamor_07_quiroga_64kb.mp3) |
| `es-quiroga-solitario` | El solitario | ~13 dk | 8.915 | [MP3](https://archive.org/download/cuentosquiroga_1312_librivox/cuentosdeamor_03_quiroga_64kb.mp3) |
| `es-quiroga-miel-silvestre` | La miel silvestre | ~15 dk | 10.117 | [MP3](https://archive.org/download/cuentosquiroga_1312_librivox/cuentosdeamor_16_quiroga_64kb.mp3) |

---

### 3.2. Gustavo Adolfo Bécquer — *Leyendas*
- **Gutenberg Kimliği:** #53552 (*Obras escogidas*) | **CEFR Seviyesi:** B1–B2
- **LibriVox Koleksiyonu:** `leyendas_becquer_1208_librivox`
- **Okuyan:** Tuxita & Kendal | **Lisans:** Kamu Malı / CC0
- **Eşleşme Notu:** İspanyol romantizminin Orta Çağ Toledo ve Soria efsaneleri; berrak dili ve akıcı kurgusuyla B1–B2 için mükemmeldir.

| Bölüm Kimliği | Başlık | Süre | Karakter Sayısı | LibriVox MP3 URL |
|:---|:---|:---:|:---:|:---|
| `es-becquer-hojas-secas` | Las Hojas Secas | ~9 dk | 7.483 | [MP3](https://archive.org/download/leyendas_becquer_1208_librivox/leyendas_18_becquer_64kb.mp3) |
| `es-becquer-ojos-verdes` | Los Ojos Verdes | ~21 dk | 15.004 | [MP3](https://archive.org/download/leyendas_becquer_1208_librivox/leyendas_19_becquer_64kb.mp3) |
| `es-becquer-rayo-luna` | El Rayo de Luna | ~25 dk | 20.180 | [MP3](https://archive.org/download/leyendas_becquer_1208_librivox/leyendas_08_becquer_64kb.mp3) |
| `es-becquer-monte-animas` | El Monte de las Ánimas | ~19 dk | 15.728 | [MP3](https://archive.org/download/leyendas_becquer_1208_librivox/leyendas_07_becquer_64kb.mp3) |
| `es-becquer-miserere` | El Miserere | ~23 dk | 19.411 | [MP3](https://archive.org/download/leyendas_becquer_1208_librivox/leyendas_06_becquer_64kb.mp3) |

---

## 4. Elenen veya Değiştirilen Eserler ("Elenmiştir" Listesi)

Aşağıdaki adaylar teknik veya edebi uyuşmazlıklar nedeniyle elenmiş veya daha uygun eşdeğeriyle değiştirilmiştir:

1. **Charles Perrault — *Histoires ou Contes du temps passé* (Gutenberg #29021 & #20972):**
   - *Neden Elendi:* Gutenberg #29021 Andrew Lang'ın İngilizce edisyonudur (İngilizce önsöz ve İngilizce dipnotlar içerir; özgün Fransızca masal metinlerini tek parça vermez). Gutenberg #20972 ise metin dosyası değil, doğrudan Gutenberg'in kendi eski sesli kitap girişidir (`.txt` dosyası yoktur). Yerine Fransızca kısa anlatı olarak **Maupassant'ın öyküleri** ve **La Fontaine fablları** seçilmiştir.
2. **Horacio Quiroga — *Cuentos de la selva para los niños*:**
   - *Neden Değiştirildi:* Project Gutenberg kataloğunda *Cuentos de la selva*'nın düz metin e-kitabı bulunmamaktadır. Bunun yerine yazarın yine LibriVox'ta bölüm bölüm eksiksiz okunan ve Gutenberg #13507 altında tam metni bulunan başyapıtı **Cuentos de Amor de Locura y de Muerte** (*A la deriva, El almohadón de plumas* vb.) kullanılmıştır.
3. **Pedro Antonio de Alarcón — *El Capitán Veneno* (Gutenberg #15891):**
   - *Neden Elendi:* Gutenberg #15891 İspanyolca Alarcón değil, Nikolaj Velimirović'in Almanca tarihi bir eseridir (*Französisch-slavische Kämpfe*). Kataloğa yanlış bağlanmıştır. Yerine İspanyol edebiyatının zirvesi olan **Bécquer'in Leyendas** öyküleri seçilmiştir.
4. **Esopo — *Las Fábulas de Esopo* (Gutenberg #18732):**
   - *Neden Elendi:* Gutenberg #18732 Townsend'in İngilizce Ezop çevirisidir (İspanyolca değildir). Gutenberg #21143 ise metin değil doğrudan ses kaydıdır.

---

## 5. Uygulama Entegrasyonu Notu

Veriler `src/data/audiobooks.ts` modülü üzerinden tembel yükleme (lazy import) ile sunulmaktadır:
- `loadAudiobookChapters(language)`: İlgili dilin bölümlerini asenkron olarak çeker.
- `chapterToReadingText(chapter)`: Bölümü Kelime Koçu'nun standart `ReadingText` nesnesine dönüştürür. `book: { id, title, index, total }` yapısı sayesinde okuma kütüphanesinde (`ReadingLibrary.tsx`, `ReadingBooks.tsx`) kitap bazında gruplanarak sıralı bölümler halinde gösterilmeye hazırdır.
