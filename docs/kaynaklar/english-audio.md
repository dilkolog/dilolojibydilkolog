# İngilizce Sesli İçerik Envanteri ve Kaynak Raporu

Bu rapor, Kelime Koçu (Diloloji) İngilizce öğrenme deneyimini zenginleştirmek amacıyla açık lisanslı sesli içerik kaynaklarını, doğrudan ses/metin bağlantılarını (`HEAD` istekleriyle doğrulanmış), telif/kullanım şartlarını ve uygulamaya eklenebilirlik kararlarını inceler.

Son güncelleme: 2026-10-10.

---

## 1. Yönetici Özeti ve Karar Matrisi

| Kaynak | Lisans / Telif | Doğrudan MP3/Ses | Transkript / Metin | Seviye (CEFR) | Uygulamaya Eklenebilir mi? | Öncelik & Karar |
|---|---|---|---|---|---|---|
| **Global Storybooks (English)** | **CC BY 3.0 / 4.0** (Açık lisans) | ✅ Var (CDN üzerinden doğrudan MP3) | ✅ Var (Sayfa sayfa, resimli) | A1–B1 (Seviye 1–5) | **EVET** (Kısıtlamasız) | 🥇 1. Öncelik (Hemen eklenebilir) |
| **VOA Learning English** | **Kamu Malı (US Public Domain)** | ✅ Var (CORS açık, doğrudan MP3) | ✅ Var (Web/Podcast transkript) | A2–B2 | **EVET** (Eğitim amaçlı, kaynak belirterek) | 🥈 2. Öncelik (Podcast/Okuma beslemesi) |
| **LibriVox + Project Gutenberg** | **Kamu Malı (Public Domain / CC0)** | ⚠️ Var (Archive.org üzerinde barınıyor) | ✅ Var (Gutenberg tam metin) | B1–B2 | **ŞARTLI / EVET** (Bölüm eşleştirmeli) | 🥉 3. Öncelik (B1+ sesli kitaplar) |
| **Simple English Wikipedia (Spoken)** | **CC BY-SA 3.0 / 4.0** | ✅ Var (Wikimedia Commons, OGG/OGA) | ✅ Var (Basitleştirilmiş ansiklopedi) | A2–B1 | **ŞARTLI** (CC BY-SA atıf + Ogg oynatma) | 4. Öncelik (Kısa bilgilendirici metinler) |
| **BBC Learning English (6 Minute)** | **Telifli (All Rights Reserved)** | ❌ Var ama üçüncü tarafa gömme YASAK | ✅ Var (Web/PDF) | B1–B2 | **HAYIR** (Uygulama içine kopyalanamaz) | ❌ Yalnızca harici bağlantı verilebilir |

---

## 2. Detaylı Kaynak İncelemeleri

### 2.1. Global Storybooks (English)
- **Kurum & Arka Plan:** University of British Columbia (UBC) ve African Storybook Project ortaklığı (`globalstorybooks.net` ve `storybookscanada.ca`).
- **Lisans:** **Creative Commons Attribution (CC BY 3.0 / CC BY 4.0)**. Ticari ve ticari olmayan kullanım, uyarlama ve yeniden dağıtım tamamen serbesttir; yalnızca yazar/çizer ve kaynak atfı gereklidir.
- **Biçim ve Yapı:**
  - Sayfa sayfa metin, her sayfa için yüksek kaliteli illüstrasyon.
  - Seviye 1 (sayfa başına 1–2 kelime) ila Seviye 5 (zengin paragraflar).
  - Her hikâyenin baştan sona anadili İngilizce olan seslendirmenler tarafından okunmuş stüdyo kaydı (MP3).
- **Bağlantı Doğrulaması (`HEAD` testi):**
  - Metin URL: `https://global-asp.github.io/storybooks-english/stories/en/0001/` → **HTTP/2 200 OK**
  - Ses URL: `https://globalstorybooks.net/media/audio/en/0001/mp3/01.mp3` → **HTTP/2 200 OK** (audio/mpeg, 26.9 kB)
- **Türkçe Eşleşme:** Global Storybooks platformunda aynı hikâyelerin Türkçe çevirileri mevcuttur (FR ve ES'te yapıldığı gibi sayfa sayfa Türkçe desteği DeepL API çağrısı gerektirmeden sağlanabilir).
- **Değerlendirme:** **EVET (Kesinlikle eklenebilir).** Projede halihazırda Fransızca ve İspanyolca için kullanılan `scripts/build-storybooks.ts` altyapısı İngilizce için de birebir çalıştırılabilir.

---

### 2.2. VOA Learning English (Voice of America)
- **Kurum & Arka Plan:** U.S. Agency for Global Media (USAGM) bünyesindeki resmi İngilizce öğrenme kanalı (`learningenglish.voanews.com`).
- **Lisans:** **U.S. Government Work / Public Domain (ABD Federal Kamu Malı)**.
  - ABD Telif Hakkı Kanunu (17 U.S.C. § 105) uyarınca, federal hükümet çalışanları tarafından görevleri kapsamında üretilen metin ve ses kayıtları ABD içinde kamu malıdır.
  - *Kullanım Şartları Notu:* VOA logosu tescillidir. AP/Reuters gibi haber ajanslarından alınan üçüncü taraf haber fotoğrafları kapsam dışıdır; ancak VOA editörlerinin yazdığı metinler ve stüdyoda seslendirdikleri MP3 kayıtları eğitim amaçlı serbestçe kullanılabilir.
- **Biçim ve Yapı:**
  - Normal konuşma hızından %30 daha yavaş, net telaffuzlu seslendirme.
  - Basitleştirilmiş kelime hazinesi (1.500 temel kelimelik *VOA Special English Word Book* standardı).
  - Programlar: *Words and Their Stories* (deyimler ve hikâyeleri), *Everyday Grammar*, *American Stories*, *Science & Technology*.
  - Podcast RSS beslemesi ve her bölümün web sayfasında kelimesi kelimesine tam transkript.
- **Bağlantı Doğrulaması (`HEAD` testi):**
  - Podcast RSS Feed: `https://learningenglish.voanews.com/podcast/?podcastId=1689` → **HTTP/2 200 OK**
  - Doğrudan MP3 URL: `https://voa-audio.voanews.eu/vle/2025/03/31/20250331-003003-vle122-program_hq.mp3` → **HTTP/2 200 OK** (`access-control-allow-origin: *`, tarayıcıdan doğrudan dinlenebilir).
- **Seviye:** A2–B1 (Beginning & Intermediate), B2 (Advanced Stories).
- **Değerlendirme:** **EVET (Eklenebilir).** Dinlerken takip (`listenFollow`), cümle cümle dikte ve gölgeleme için kusursuz bir ritme sahiptir.

---

### 2.3. LibriVox + Project Gutenberg (İngilizce Klasikler)
- **Kurum & Arka Plan:** Gönüllü sesli kitap projesi LibriVox (`librivox.org`) ve kamu malı e-kitap arşivi Project Gutenberg (`gutenberg.org`).
- **Lisans:** **Public Domain (Kamu Malı / CC0)**.
  - Metinler 1928 öncesi yayımlanmış eserler olduğu için kamu malıdır.
  - LibriVox kayıtlarının tümü gönüllü seslendirmenler tarafından feragat edilerek doğrudan kamu malına (Public Domain) bırakılmıştır.
- **Biçim ve Yapı:**
  - Bölüm bazlı MP3 dosyaları.
  - Gutenberg e-kitap metinleri ile LibriVox kayıtları aynı edisyondan okunmaktadır.
- **Örnek Seçki (B1–B2 Seviyesine Uygun Kısa Eserler):**
  1. **Oscar Wilde** – *The Happy Prince and Other Tales* (Gutenberg ID: 902; peri masalları, sade ve lirik dil).
  2. **O. Henry** – *The Gift of the Magi* (Gutenberg ID: 1544; kısa, sürpriz sonlu, B1+).
  3. **Sir Arthur Conan Doyle** – *A Scandal in Bohemia* / *The Red-Headed League* (Sherlock Holmes kısa maceraları; B1–B2).
  4. **Beatrix Potter** – *The Tale of Peter Rabbit* (Gutenberg ID: 14838; çok kısa, A2–B1).
  5. **Aesop's Fables** (Ezop Masalları İngilizce manzum/düzyazı edisyonları; A2–B1).
- **Bağlantı Doğrulaması (`HEAD` testi):**
  - Gutenberg Metin: `https://www.gutenberg.org/cache/epub/902/pg902.txt` → **HTTP/2 200 OK**
  - LibriVox Audio (Archive.org): `https://archive.org/download/...` adresleri Archive.org'un genel bakım/DDoS koruma dönemlerinde geçici `503` yanıtı verebilmektedir; bu nedenle doğrudan dosya linkleri kalıcı bir CDN ya da LibriVox ayna sunucuları üzerinden önbelleklenmelidir.
- **Değerlendirme:** **ŞARTLI / EVET (Eklenebilir).** Projedeki `scripts/build-audiobook-chapters.ts` yapısı kullanılarak bölüm bazlı metin-ses eşleştirmesi yapılabilir.

---

### 2.4. Simple English Wikipedia (Spoken Articles)
- **Kurum & Arka Plan:** Wikimedia Foundation (`simple.wikipedia.org` ve `commons.wikimedia.org`).
- **Lisans:** **Creative Commons Attribution-ShareAlike 3.0 / 4.0 (CC BY-SA)** ve GFDL.
  - Yeniden dağıtım ve ticari kullanım serbesttir.
  - *Şart:* Yazar/seslendirmen atfı verilmeli ve türetilen eser aynı lisansla (CC BY-SA) paylaşılmalıdır.
- **Biçim ve Yapı:**
  - Simple English Wikipedia, Basic English (850–1500 kelime) ve sadeleştirilmiş dil bilgisi kurallarıyla yazılmış ansiklopedi maddeleridir.
  - "Spoken articles" kategorisindeki maddeler gönüllüler tarafından yüksek sesle okunarak Wikimedia Commons'a yüklenmiştir.
  - Ses dosyaları genellikle `.ogg` / `.oga` (Ogg Vorbis) formatındadır; modern tarayıcıların HTML5 `<audio>` etiketi bu formatı yerel olarak destekler.
- **Bağlantı Doğrulaması (`HEAD` testi):**
  - Dosya URL (Wikimedia Commons CDN): `https://upload.wikimedia.org/wikipedia/commons/5/5f/Simple_en_Cuban_Missile_Crisis.oga` → **HTTP/2 200 OK** (`access-control-allow-origin: *`, doğrudan erişilebilir).
- **Seviye:** A2–B1. Cümleler kısa, terminoloji anlaşılır.
- **Değerlendirme:** **ŞARTLI (Eklenebilir).** İçerik oldukça bilgilendiricidir ancak ses formatının Ogg olması nedeniyle mobil Safari/eski iOS uyumluluğu gözetilmeli veya MP3 dönüşümü tercih edilmelidir.

---

### 2.5. BBC Learning English (6 Minute English)
- **Kurum & Arka Plan:** British Broadcasting Corporation (BBC / BBC Studios; `bbc.co.uk/learningenglish`).
- **Lisans:** **Tüm Hakları Saklıdır (All Rights Reserved)**.
  - *Kullanım Şartları:* "All rights, including copyright and database rights, in the content of BBC Learning English web pages are owned or controlled by the BBC."
  - İçerik yalnızca bireysel, ticari olmayan kişisel öğrenim için web sitesi veya resmi podcast kanalları üzerinden tüketilebilir.
  - BBC şartları açıkça belirtir: **"Unless you have received prior written permission, you are NOT permitted to: place the content on any other website; copy, store in any medium, broadcast or adapt the content."**
- **Değerlendirme:** **HAYIR (Uygulamaya Kopyalanamaz / Gömülemez).**
  - Metinlerin veya MP3 dosyalarının indirilip uygulama veritabanına ya da Vercel sunucusuna kaydedilmesi telif ihlali oluşturur (TV5Monde ve DELE Ahora analizinde ulaşılan sonuçla aynı ilke).
  - **Öneri:** Yalnızca okuma/dinleme kaynakları listesinde "BBC 6 Minute English Resmi Sayfasına Git" şeklinde harici bağlantı (deep link) verilebilir.

---

## 3. Önerilen Entegrasyon Sırası ve İş Yükü

| Aşama | Kaynak | Efor / Boyut | Gerekli Adımlar |
|:---:|---|:---:|---|
| **1** | **Global Storybooks (English)** | **S (Küçük, ~0.5 gün)** | `scripts/build-storybooks.ts` betiğine İngilizce desteği eklenmesi; ~30 resimli hikâye, sayfa görselleri ve Türkçe çevirileriyle doğrudan `src/data/storybooks/en.json` oluşturulması. |
| **2** | **VOA Learning English (Words & Stories)** | **M (Orta, ~1–1.5 gün)** | En popüler 15 VOA bölümünün metin ve MP3 eşleştirmesi; yavaş/temiz konuşma temposuyla dikte ve gölgeleme için Okuma kütüphanesine "Kolay Haberler" kategorisi eklenmesi. |
| **3** | **LibriVox Kısa Klasikler (Wilde, O. Henry)** | **M (Orta, ~1.5 gün)** | 4–6 kısa eserin Gutenberg metinleri ile LibriVox kayıtlarının bölüm bazlı doğrulanması (`scripts/build-audiobook-chapters.ts` ile `src/data/audiobooks/en.json`). |
| **4** | **Simple English Wikipedia (Seçilmiş Maddeler)** | **S–M (1 gün)** | Bilim/Tarih/Coğrafya konularında 10 sesli maddenin CC BY-SA künyesiyle metin kütüphanesine eklenmesi. |
| **5** | **BBC Learning English** | **XS (Çok küçük, 1 saat)** | Yalnızca `ReadingLibrary` dış kaynaklar bölümünde "Dışarıda Çalış" kartına bağlantı eklenmesi. |
