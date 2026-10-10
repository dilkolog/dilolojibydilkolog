# Ses Ayırt Etme (Minimal Çift) Kayıtları Denetim Raporu

**Tarih:** 2026-10-10  
**Kapsam:** `src/engine/listening.ts` dosyasındaki `MINIMAL_PAIRS` listesine son eklenen 26 minimal çift (İngilizce 14, Fransızca 7, İspanyolca 5 çift; toplam 52 kelime).  
**Amaç:** Yüksek değişkenlikli fonetik eğitim (*High-Variability Phonetic Training - HVPT*) için gerekli olan **kelime başına en az 2 farklı ana dil konuşmacısı kaydının** bulunabilirliğini, `nativeRecordings()` motorunun (`src/data/wordInfo.ts`) kapsamını ve harici ses kaynaklarının (Commons, Shtooka, Forvo vb.) lisans durumlarını denetlemek.

---

## 1. Yönetici Özeti

| Dil | Yeni Çift Sayısı | Toplam Kelime | ≥2 Konuşmacısı Olan Kelimeler | 1 Konuşmacısı Olan Kelimeler | 0 Kayıt (Cihaz Sesine Düşen) | HVPT Uygunluğu |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: |
| **İngilizce (EN)** | 14 çift | 28 kelime | 15 (%54) | 13 (%46) | 0 (%0) | **Yüksek** |
| **Fransızca (FR)** | 7 çift | 14 kelime | 13 (%93) | 0 (%0) | 1 (%7) (`son`)* | **Çok Yüksek** |
| **İspanyolca (ES)** | 5 çift | 10 kelime | 0 (%0) | 0 (%0) | 10 (%100)** | **Düşük (Cihaz Sesi)** |
| **Toplam** | **26 çift** | **52 kelime** | **28 (%54)** | **13 (%25)** | **11 (%21)** | **Ortalama %79 Gerçek Ses** |

*\* `son` kelimesi İngilizce Wiktionary'de `{{audio}}` şablonu taşımadığı için 0 dönmektedir; ancak Fransızca Wiktionary ve Commons'ta 14+ yerel ses kaydı mevcuttur.*  
*\*\* İspanyolca kelimeler İngilizce Wiktionary'nin yeni `{{es-pr}}` şablon yapısı ve çekimli fiil formlarının (`está`, `habló`, `terminó`) sözlük başlığı (lemma) olmaması sebebiyle `nativeRecordings()` tarafından yakalanamamakta, oyun doğrudan yerel Web Speech API sesine geçmektedir.*

---

## 2. Kelime ve Çift Bazlı Ses Kaydı Envanteri

### 2.1. İngilizce (14 Çift / 28 Kelime)
İngilizce kelimelerin tümü en az 1 gerçek ana dil konuşmacısı kaydına sahiptir; %54'ünde 2 veya daha fazla farklı konuşmacı bulunmaktadır.

| Çift No | Kelime A | Kayıt Sayısı | Kelime B | Kayıt Sayısı | Kontrast | İki Tarafta da ≥2 Konuşmacı? |
| :---: | :--- | :---: | :--- | :---: | :--- | :---: |
| 1 | `cheap` | 1 | `chip` | 2 | kısa i / uzun i | Kısmi (cheap: 1) |
| 2 | `heat` | 1 | `hit` | 2 | kısa i / uzun i | Kısmi (heat: 1) |
| 3 | `bat` | 2 | `bet` | 1 | æ / e | Kısmi (bet: 1) |
| 4 | `pen` | 2 | `pan` | 1 | e / æ | Kısmi (pan: 1) |
| 5 | `luck` | 2 | `lock` | 1 | ʌ / ɒ | Kısmi (lock: 1) |
| 6 | `sip` | 1 | `ship` | 2 | s / ʃ | Kısmi (sip: 1) |
| 7 | `chair` | 2 | `share` | 1 | tʃ / ʃ | Kısmi (share: 1) |
| 8 | `rice` | 2 | `lice` | 1 | r / l | Kısmi (lice: 1) |
| 9 | `right` | 3 | `light` | 2 | r / l | **Evet (3 vs 2)** |
| 10 | `west` | 3 | `vest` | 1 | w / v | Kısmi (vest: 1) |
| 11 | `wine` | 2 | `vine` | 1 | w / v | Kısmi (vine: 1) |
| 12 | `bus` | 2 | `buzz` | 1 | s / z | Kısmi (buzz: 1) |
| 13 | `pack` | 1 | `back` | 1 | p / b | Hayır (1 vs 1) |
| 14 | `coat` | 2 | `caught` | 6 | əʊ / ɔː | **Evet (2 vs 6)** |

### 2.2. Fransızca (7 Çift / 14 Kelime)
Fransızca koleksiyonu, Lingua Libre projesinin zengin katkısı sayesinde kelime başına ortalama 6.5 farklı konuşmacı ile olağanüstü bir çeşitliliğe sahiptir.

| Çift No | Kelime A | Kayıt Sayısı | Kelime B | Kayıt Sayısı | Kontrast | İki Tarafta da ≥2 Konuşmacı? |
| :---: | :--- | :---: | :--- | :---: | :--- | :---: |
| 1 | `bu` | 5 | `boue` | 6 | u / ou | **Evet (5 vs 6)** |
| 2 | `sous` | 6 | `su` | 6 | u / ou | **Evet (6 vs 6)** |
| 3 | `jeu` | 5 | `joue` | 7 | eu / ou | **Evet (5 vs 7)** |
| 4 | `bon` | 11 | `banc` | 7 | on / an | **Evet (11 vs 7)** |
| 5 | `vin` | 5 | `vont` | 4 | in / on | **Evet (5 vs 4)** |
| 6 | `sans` | 5 | `son` | 0* | an / on | Kısmi (son: Commons'ta var) |
| 7 | `cousin` | 8 | `coussin` | 5 | z / s | **Evet (8 vs 5)** |

### 2.3. İspanyolca (5 Çift / 10 Kelime)

| Çift No | Kelime A | Kayıt Sayısı | Kelime B | Kayıt Sayısı | Kontrast | Neden Bulunamadı? |
| :---: | :--- | :---: | :--- | :---: | :--- | :--- |
| 1 | `vez` | 0 | `ves` | 0 | s / z (İspanya) | `en.wiktionary` üzerinde `{{es-pr}}` şablonu var, düz `{{audio}}` yok |
| 2 | `papa` | 0 | `papá` | 0 | vurgu | `en.wiktionary` üzerinde audio şablonu tanımlanmamış |
| 3 | `esta` | 0 | `está` | 0 | vurgu | `está` çekimli fiil; lemmalarda ses bulunmamakta |
| 4 | `termino` | 0 | `terminó` | 0 | vurgu | `terminó` çekimli fiil (pretérito) |
| 5 | `hablo` | 0 | `habló` | 0 | vurgu | Çekimli fiil formları (1. tekil vs 3. tekil) |

---

## 3. Bulgular ve Teknik Analiz

### 3.1. Fransızca `son` İstisnası
- `en.wiktionary.org/wiki/son` sayfasında ana başlık İngilizcedir (*son = oğul*). Fransızca bölümü alt başlıktadır ve telaffuz kısmında yalnızca `{{fr-IPA|a=Europe}}` şablonu yer almakta, ses şablonu bulunmamaktadır.
- Buna karşın Fransızca Wiktionary (`fr.wiktionary.org/wiki/son`) ve Wikimedia Commons incelendiğinde `Fr-son.ogg`, `LL-Q150 (fra)-Guilhelma-son.wav`, `LL-Q150 (fra)-GrandCelinien-son.wav` dahil olmak üzere **14 farklı ana dil konuşmacısı kaydı** mevcuttur.
- **Çözüm Önerisi:** `nativeRecordings()` fonksiyonu Fransızca sorgularında `en.wiktionary`'de ses bulamazsa ikincil olarak `fr.wiktionary` API'sindeki `{{écouter|...|audio=...}}` şablonunu yoklayabilir.

### 3.2. İspanyolca Şablon ve Çekimli Fiil Sorunu
1. **Şablon Değişimi:** İngilizce Wiktionary İspanyolca maddelerinde geleneksel `{{audio|es|dosya.ogg}}` şablonu yerine Lua tabanlı `{{es-pr|+}}` modülüne geçmiştir. `audioFilesOf()` regex'i (`\{\{audio\|es\|...`) bu şablonu yakalayamamaktadır.
2. **Çekimli Fiil Kısıtı:** `está`, `habló`, `terminó` gibi kelimeler sözlük maddesi değil, çekimli formdur. Wiktionary'de çekimli formlar genellikle ayrı ses dosyasına sahip değildir.
3. **Cihaz Sesi Yedeklemesi:** `PairsGame.tsx` dosyasında `say()` fonksiyonu ses dosyası bulamadığında kusursuz bir zarafetle `speakAsync(word, language)` üzerinden tarayıcının yerel TTS sesine düşmektedir. Dolayısıyla oyun kilitlenmemekte, ancak HVPT'nin amaçladığı farklı insan sesleriyle ayırt etme deneyimi İspanyolca için kısıtlı kalmaktadır.

---

## 4. Harici Ses Kaynakları ve Lisans Analizi

| Kaynak | Lisans | Ticari / Çevrimdışı Kullanım | Karar | Gerekçe |
| :--- | :--- | :---: | :---: | :--- |
| **Wikimedia Commons (Lingua Libre)** | CC BY-SA 3.0 / 4.0 | Evet | **Kullanılıyor (Birincil)** | 100.000+ telaffuz, tamamen açık ve güvenli. |
| **Shtooka Projesi (SWAC)** | CC BY 2.0 / 3.0 US | Evet | **Eklenebilir** | Fransızca 30.000+, İspanyolca 1.739 kelime; FLAC/OGG açık arşiv. |
| **Tatoeba Sesleri** | CC BY 2.0 FR | Evet | **Dolaylı** | Cümle düzeyindedir, kelime kesiti için zorunlu hizalama (*forced alignment*) gerekir. |
| **Forvo** | Telifli / Özel Lisans | **HAYIR** | **KESİNLİKLE YASAK** | Creative Commons değildir; indirme ve üçüncü taraf dağıtımı açıkça yasaklanmıştır. |
| **OpenSLR** | CC BY-SA / Apache 2.0 | Evet | **Zor** | Çok geniş konuşma korpusu; sözlük kelimesi formatında değildir. |

---

## 5. Önerilen Eylemler

1. **`es-pr` ve `fr.wiktionary` Desteği:**
   - `src/data/wordInfo.ts` içindeki `audioFilesOf()` ve `nativeRecordings()` fonksiyonuna `{{es-pr|...}}` ve `fr.wiktionary` üzerindeki `{{écouter|...|audio=...}}` ayrıştırıcıları eklenerek Fransızca `son` ve temel İspanyolca kelimeler (`vez`, `papa`) kurtarılabilir.
2. **İspanyolca Minimal Çift Seçimi İyileştirmesi:**
   - Gelecek turlarda İspanyolca çiftler seçilirken çekimli fiil vurgularından ziyade (`hablo/habló`), sözlükte bağımsız başlık olarak yer alan ve Commons/Lingua Libre kaydı bulunan kelime çiftlerine öncelik verilmelidir (ör. *peso / beso*, *vino / pino*, *mar / bar*, *pata / bata*).
3. **Shtooka İspanyolca Paketi (`spa-wims-octavio`):**
   - 1.739 kelimelik açık lisanslı Shtooka seti yerel önbelleğe alınarak eksik temel kelimeler için ikinci bir ses katmanı olarak devreye sokulabilir.

---

## 6. İspanyolca Minimal Çift Ses Kayıtları Taraması (10.2 Turu — 2026-10-10)

`MINIMAL_PAIRS.es` içindeki 19 çiftin tamamı (38 kelime) Wikimedia Commons ve Lingua Libre üzerinde taranmış, açık lisanslı MP3/WAV kayıtları ayıklanarak `docs/veri/es-ses-kayitlari.json` dosyasına işlenmiştir.

### 6.1. Tarama İstatistikleri
- **Taranan Kelime:** 38
- **Kayıt Bulunan Kelime:** 35 (%92,1 kapsama)
- **Kayıt Bulunamayan Kelime:** 3 (`ahorra`, `pollo`, `terminó`)
- **≥2 Farklı Konuşmacısı Olan Kelimeler:** 13 kelime (`pero`, `perro`, `caro`, `carro`, `para`, `corro`, `ahora`, `casa`, `vez`, `papa`, `esta`, `está`, `vino`, `pino`, `mar`)

### 6.2. Kaydı Bulunamayan Kelimeler İçin Alternatif Çift Önerileri

1. **`polo` / `pollo` (`l / ll` kontrastı):**
   - *Sorun:* `pollo` için Commons üzerinde bağımsız ses kaydı bulunmamaktadır.
   - *Öneri 1:* `mala` (kötü) / `malla` (ağ / tayt) — Lingua Libre'de her iki kelimenin de kaydı vardır.
   - *Öneri 2:* `cala` (koy) / `calla` (susar) — Her iki kelime için konuşmacı kayıtları mevcuttur.

2. **`ahora` / `ahorra` (`r / rr` kontrastı):**
   - *Sorun:* `ahorra` (3. tekil tasarruf etmek) çekimli fiil formudur ve kaydı yoktur.
   - *Öneri:* Bu kontrast için halihazırda `pero / perro` (3 vs 6 konuşmacı), `caro / carro` (2 vs 2 konuşmacı), `cero / cerro` ve `para / parra` çiftleri eksiksiz kayda sahiptir; `ahora / ahorra` yerine bağımsız isim/sıfat olan `coral` (mercan) / `corral` (avlu) çifti kullanılabilir.

3. **`termino` / `terminó` (vurgu kontrastı):**
   - *Sorun:* `terminó` geçmiş zaman çekimidir ve bağımsız ses kaydı bulunmamaktadır.
   - *Mevcut Durum:* Vurgu kontrastı için listedeki `esta / está` (her iki tarafta 2 kayıt), `hablo / habló` (her iki tarafta kayıt var) ve `papa / papá` (3 vs 1 kayıt) çalışmaktadır.
   - *Öneri:* Çekimli fiil yerine isim vurgu kontrastı: `bebe` (içer) / `bebé` (bebek) — `bebé` için Commons'ta 3 farklı ana dil konuşmacısı kaydı bulunmaktadır (`LL-Q1321 (spa)-...-bebé.wav`).

