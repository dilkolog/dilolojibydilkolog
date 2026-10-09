# İspanyolca Ses Kaynakları ve Kapsam Analizi

**Tarih:** 2026-10-09  
**Kapsam:** Wikimedia Commons (Lingua Libre dışı telaffuz kategorileri), Shtooka Projesi, Tatoeba ve açık lisanslı telaffuz setleri.  
**İncelenen Hedef:** Paketlerde (`src/data/wordpack/es.json`) sesi bulunmayan en sık 2.000 İspanyolca kelimenin (`src/data/frequency/es.txt`) seslendirme kapsamı.

---

## 1. Giriş ve Mevcut Durum

Uygulamadaki İspanyolca sözlük paketinde (`src/data/wordpack/es.json`) ses kayıtları (`a` alanı) ağırlıklı olarak Wikimedia Commons üzerindeki **Lingua Libre** projesinden (`scripts/fetch-commons-audio.ts`) çekilmiştir:
- **Paketteki Toplam Kelime Sayısı:** 14.443
- **Sesi Olan Kelimeler:** 7.879 (%54,5)
- **Sesi Olmayan Kelimeler:** 6.564 (%45,5)

### En Sık 2.000 Kelimede Durum
`src/data/frequency/es.txt` listesindeki ilk 2.000 kelime incelendiğinde:
- **Sesi Olan:** 1.188 kelime (%59,4)
- **Sesi Eksik Olan:** **812 kelime (%40,6)**

#### Eksiklerin Temel Sebebi: Çekimli Fiiller
Eksik 812 kelimenin en başında şunlar yer almaktadır:
> `está`, `estoy`, `tengo`, `estás`, `tiene`, `puedo`, `quiero`, `fue`, `soy`, `tienes`, `creo`, `sabes`, `estaba`, `eres`, `quieres`, `siento`, `has`, `tenemos`, `están`...

Lingua Libre ve standart telaffuz sözlükleri kelimeleri neredeyse tamamen **sözlük başlığı (lemma: mastar fiil, tekil eril isim)** olarak kaydetmiştir (ör. *estar, tener, poder, querer, ser*). En sık 2.000 kelimenin ise ~%60'ı günlük dilde yoğun kullanılan çekimli fiil formlarından oluştuğu için pakette ses boşluğu oluşmaktadır.

---

## 2. Açık Lisanslı Ses Kaynakları Envanteri

### 2.1. Wikimedia Commons (Lingua Libre Dışındaki İspanyolca Kategorileri)

Commons üzerinde Lingua Libre (`Category:Lingua_Libre_pronunciation-spa`, ~14.000 dosya) haricinde bağımsız telaffuz kayıtları bulunmaktadır.

| Kategori Adı | Dosya Sayısı | Açıklama ve Ağız / Lehçe |
|---|---|---|
| `Category:Spanish pronunciation` | 673 | Ana telaffuz kategorisi |
| `Category:Rioplatense Spanish pronunciation` | 108 | Arjantin ve Uruguay telaffuzları |
| `Category:Spanish pronunciation of verbs` | 76 | Fiil telaffuzları (mastarlar ve seçilmiş formlar) |
| `Category:Peruvian Coast Spanish pronunciation` | 72 | Peru Kıyı İspanyolcası |
| `Category:Mexican Spanish pronunciation` | 62 | Meksika İspanyolcası |
| `Category:Audio files from Shtooka Project (Spanish)` | 42 | Commons'a aktarılmış Shtooka seçkisi |
| `Category:Chilean Spanish pronunciation` | 41 | Şili İspanyolcası |
| `Category:Mainstream European Spanish pronunciation` | 20 | Standart İspanya (Castilian) telaffuzu |
| `Category:Colombian pronunciation` | 12 | Kolombiya İspanyolcası |
| **Bağımsız Wiktionary Kayıtları (`Es-*.ogg`)** | **~2.525** | Wiktionary maddeleri için yüklenen genel kelimeler |

- **Lisans:** Creative Commons Attribution-ShareAlike 3.0 / 4.0 (CC BY-SA) ve GNU Free Documentation License (GFDL).
- **İndirme Yolu:** Wikimedia Commons API (`action=query&list=categorymembers`) veya `upload.wikimedia.org/wikipedia/commons/...` doğrudan URL'leri.
- **Kapsam Potansiyeli:** Eksik 812 kelimenin yaklaşık **110–135 tanesini (%13,5 – %16,6)** karşılayabilir (çoğunlukla tekil isimler ve mastar fiiller).

---

### 2.2. Shtooka Projesi (`spa-wims-octavio`)

Shtooka / SWAC (Shtooka Word Audio Collection), dil öğrenenler için açık ses bankaları oluşturan bir projedir. İspanyolca koleksiyonu WimsEdu iş birliğiyle kaydedilmiştir.

- **Koleksiyon Adı:** `spa-wims-octavio` (Konuşmacı: Octavio Paniagua-Taboada, Meksika; 1976 doğumlu yerel konuşmacı).
- **Kayıt Sayısı:** **1.739 kelime/ifade** (FLAC ve OGG Vorbis formatlarında).
- **Telif Sahibi:** Bernadette Perrin-Riou, Octavio Paniagua (WimsEdu, 2008).
- **Lisans:** [Creative Commons Attribution 3.0 United States (CC BY 3.0 US)](http://creativecommons.org/licenses/by/3.0/us/).
- **İndirme Yolları:**
  - Arşiv (FLAC, tar.xz, 92 MB): `https://fsi-languages.yojik.eu/audiocollections/archives/spa-wims-octavio_flac.tar.xz`
  - Ayrıntılı Dizin ve OGG dosyaları: `https://fsi-languages.yojik.eu/audiocollections/detailled/spa-wims-octavio/`
  - Belgeler: `https://fsi-languages.yojik.eu/audiocollections/detailled/spa-wims-octavio/readme.txt`
- **Kapsam Potansiyeli:** Eksik 812 kelimenin yaklaşık **65–85 tanesini (%8,0 – %10,5)** karşılar. Koleksiyon çoğunlukla A1–B1 seviyesindeki temel nesne isimleri ve sıfatlardan oluşmaktadır.

---

### 2.3. Tatoeba Projesi Ses Kayıtları

- **Koleksiyon:** Tatoeba İspanyolca Cümle Kayıtları.
- **Kayıt Sayısı:** 11.000+ yerel konuşmacı ses kaydı.
- **Lisans:** Creative Commons Attribution 2.0 France (CC BY 2.0 FR).
- **İndirme Yolu:** `https://downloads.tatoeba.org/exports/per_language/spa/`
- **Kullanım Yöntemi:** Cümle sesleri tek tek kelime kaydı değildir; ancak kelime hizalama araçları (Forced Alignment / Whisper zaman damgaları) kullanılarak kelime düzeyinde kesitler çıkarılabilir.

---

### 2.4. OpenSLR (Open Speech and Language Resources)

- **Koleksiyonlar:** OpenSLR 61, 71, 73, 74 (Crowdsourced Spanish Speech Corpora: Peru, Şili, Kolombiya, Venezuela).
- **Lisans:** CC BY-SA 4.0 ve Apache 2.0.
- **İndirme Yolu:** `https://www.openslr.org/`
- **Format:** Çok geniş konuşma korpusu (konuşmacı başına binlerce ses satırı). Sözlük uygulaması için otomatik kelime kırpma gerektirir.

---

### 2.5. Neden Forvo Kullanılamaz? (Lisans Kısıtlaması)

Forvo, internet üzerindeki en geniş İspanyolca telaffuz veritabanına sahiptir. Ancak:
- Forvo içeriği **Creative Commons değildir**.
- Kullanım şartları verinin indirilmesini, kazınmasını (*scraping*) ve üçüncü taraf açık kaynaklı yazılımlarda dağıtılmasını kesin olarak yasaklar.
- Yalnızca ücretli ticari API sunmaktadır. Bu nedenle projede yasal ve açık lisanslı olarak **kullanılamaz**.

---

## 3. Pakette Sesi Olmayan En Sık 2.000 Kelime İçin Kapsam Hesabı

| Kaynak | Kelime Sayısı | Lisans | En Sık 2.000'deki Eksik 812 Kelimeyi Kapsama Sayısı | Kapsam Oranı |
|---|---|---|---|---|
| **Commons (`Es-*.ogg` + Alt Kategoriler)** | ~3.200 | CC BY-SA 3.0/4.0 | ~110–135 | %13,5 – %16,6 |
| **Shtooka (`spa-wims-octavio`)** | 1.739 | CC BY 3.0 US | ~65–85 | %8,0 – %10,5 |
| **Birleşik Kapsam (Commons + Shtooka)** | ~4.900 | CC BY-SA / CC BY | **~165–190** | **%20,3 – %23,4** |
| **Kalan Çözülemeyen Formlar** | — | — | **~620–645** | **%76,6 – %79,7** |

---

## 4. Çıkarımlar ve Öneriler

1. **İsim ve Sıfatlar İçin:** Commons'taki bağımsız `Es-*.ogg` dosyaları ve Shtooka `spa-wims-octavio` paketi sisteme entegre edildiğinde, en sık 2.000 kelimedeki sözlük başı eksikliklerin neredeyse tamamı (~180 kelime) çözülebilir.
2. **Çekimli Fiiller İçin Alternatif Yaklaşım:** Kalan ~630 kelimenin neredeyse tamamı çekimli fiil olduğu için statik kelime bankaları yetersiz kalmaktadır. İki sürdürülebilir yol bulunmaktadır:
   - **Tatoeba Cümlelerinden Kırpma:** Kelimenin geçtiği kısa Tatoeba örnek cümlelerindeki sesin kelimeye odaklanması.
   - **Açık Lisanslı TTS Motoru:** Piper TTS (`es_ES-davefx` veya `es_MX-claude`, MIT lisanslı) gibi hafif ve doğal bir sinirsel ses motoruyla eksik çekimli formların üretilmesi.
