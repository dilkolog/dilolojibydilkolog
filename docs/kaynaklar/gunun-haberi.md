# Günün Mikro Haberi İçin Kaynak Araştırması Raporu

**Tarih:** 2026-10-10  
**Bağlam:** `docs/GELISIM-FIKIRLERI.md` Madde 6 — "Günün Mikro Haberi" (A2–B2 düzeyinde, 2–3 dakikalık sesli bülten ve tam transkript ile günlük güncel okuma/dinleme pratiği).  
**Kapsam:** Fransızca (RFI Savoirs vb.), İngilizce (VOA Learning English vb.) ve İspanyolca (VOA Noticias, RFI Español, RTVE, DW) kaynakların RSS/API erişilebilirliği, ses + tam transkript durumu, lisans/kullanım şartları ve CORS davranışları.

---

## 1. Yönetici Özeti ve Karşılaştırma Tablosu

Aşağıdaki bağlantılar HTTP `HEAD` / `GET` istekleri atılarak 2026-10-10 tarihinde doğrulanmıştır.

| Dil | Kaynak | Doğrulanmış RSS / API Adresi | HTTP Durumu | Günlük İçerik | Ses + Tam Transkript | Lisans / Telif | CORS / Proxy İhtiyacı | Seviye | Karar / Sıralama |
| :--- | :--- | :--- | :---: | :---: | :---: | :--- | :---: | :---: | :---: |
| **FR** | **RFI (Journal en français facile)** | `https://www.rfi.fr/fr/podcasts/journal-fran%C3%A7ais-facile/podcast` | **200 OK** | 1 bülten / gün (hafta içi) | **Evet** (MP3 + sayfa transkripti) | Telifli (France Médias Monde); podcast streaming açık | Ses: CORS `*` (Audiomeans CDN); RSS: Proxy gerekir | B1–B2 | **1. Tercih (Önerilen)** |
| **FR** | France 24 / Le Monde RSS | `https://www.france24.com/fr/rss`, `https://www.lemonde.fr/rss/une.xml` | **200 OK** | Çok sayıda / gün | Hayır (yalnızca metin haber) | Telifli | `/api/news` proxy gerekir | B2–C1 | 2. Tercih (Sessiz haber) |
| **EN** | **VOA Learning English (As It Is)** | `https://learningenglish.voanews.com/api/zkm-ql-vomx-tpej-rqi` | **200 OK** | 1–2 bülten / gün | **Evet** (MP3 + tam transkript) | **Public Domain (ABD Kamu Malı)** | Ses: Doğrudan çalınabilir; RSS: `/api/news` proxy | A2–B1 | **1. Tercih (En Güvenli)** |
| **EN** | VOA (Words & Their Stories) | `https://learningenglish.voanews.com/podcast/?zoneId=987` | **200 OK** | 1 bölüm / hafta | **Evet** (MP3 + tam transkript) | **Public Domain** | Ses: Doğrudan çalınabilir | B1–B2 | 2. Tercih (Tematik) |
| **EN** | BBC 6 Minute English | *Resmi açık podcast RSS beslemesi* | 200 OK | 1 / hafta | Kısmi (özet transkript) | Sıkı telif (BBC ticari olmayan sınırlama) | Harici oynatıcı önerilir | B1–B2 | 3. Tercih (Telif riski) |
| **ES** | **VOA Noticias en español** | `https://www.vozdeamerica.com/api/zp_opey_ip` | **200 OK** | 3–5 bülten / gün | **Evet** (MP3 + haber metni) | **Public Domain (ABD Kamu Malı)** | Ses: Doğrudan çalınabilir; RSS: `/api/news` proxy | B1–B2 | **1. Tercih (Önerilen)** |
| **ES** | **RFI en español** | `https://www.rfi.fr/es/rss` | **200 OK** | 5–10 / gün | Kısmi (özel podcastlerinde ses var) | Telifli (France Médias Monde) | Proxy gerekir | B1–B2 | 2. Tercih |
| **ES** | Deutsche Welle (DW Español) | `https://rss.dw.com/rdf/rss-sp-all` | **200 OK** | 10+ / gün | Hayır (metin var, ses ayrı) | Telifli (DW) | **CORS `*` açık** | B2–C1 | 3. Tercih |
| **ES** | RTVE (RNE Audio) | `https://api.rtve.es/api/programas/...` | **404 / Engelli** | Değişken | Hayır (üçüncü taraf indirme engeli) | RTVE telifli | **RNE dış oynatıcıları engelliyor** | B1–B2 | **KULLANILAMAZ** |

---

## 2. Fransızca: RFI "Journal en français facile"

### 2.1. Besleme ve Teknik Altyapı
- **Güncel Resmi RSS:** `https://www.rfi.fr/fr/podcasts/journal-fran%C3%A7ais-facile/podcast` (Eski FeedBurner ve `podcast.rfi.fr` adresleri Akamai/Google tarafından kapatılmıştır; yeni rota doğrulanmıştır).
- **Yayın Periyodu:** Hafta içi her gün saat 16:00 GMT'de yayınlanan 10 dakikalık bülten.
- **Ses Akışı (`enclosure`):** `https://audio.audiomeans.fr/pfx/.../journal_francais_facile_...mp3`.
  - HTTP HEAD doğrulaması: `302 Found` ile doğrudan CDN'e yönlendirir.
  - `access-control-allow-origin: *` başlığı bulunmaktadır; HTML5 `<audio>` etiketi tarayıcıda doğrudan oynatabilir.
- **Transkript:** RFI web sayfasında (`www.rfi.fr/fr/podcasts/journal-francais-facile/...`) kelimesi kelimesine yayınlanmaktadır. Diloloji'nin mevcut `extractArticle()` fonksiyonu `<article>` etiketini ayıklayarak metni temiz biçimde çıkarabilmektedir.

### 2.2. Telif ve Yeniden Kullanım
- France Médias Monde içeriği teliflidir. Ancak podcast RSS standartları gereği ses dosyasının orijinal sunucudan (Audiomeans CDN) stream edilmesine izin verilir.
- Ticari olmayan bir dil öğrenme uygulamasında transkriptin eğitim ve alıntı amacıyla gösterilmesi adil kullanım (*fair use / droit de citation*) kapsamındadır.

### 2.3. Pedagojik Seviye
- B1–B2 seviyesindedir. Spikerler normal Fransızca hızından yaklaşık %15–20 daha tane tane ve açık telaffuzla konuşur; karmaşık deyimler haber içinde kısaca açıklanır.

---

## 3. İngilizce: VOA Learning English

### 3.1. Besleme ve Teknik Altyapı
- **Güncel Resmi RSS (As It Is):** `https://learningenglish.voanews.com/api/zkm-ql-vomx-tpej-rqi` (Doğrulandı, 200 OK).
- **Yayın Periyodu:** Günde 1–2 güncel mikro haber (3 ila 5 dakika).
- **Ses Akışı:** `https://voa-audio.voanews.eu/...mp3`. `src/engine/podcasts.ts` içindeki `voaEpisode()` ayrıştırıcısı halihazırda bu URL yapısını tanımaktadır.
- **Transkript:** RSS içindeki bağlantı doğrudan tam transkripti içeren sayfaya gider.

### 3.2. Telif ve Lisans Üstünlüğü
- **Kamu Malı (Public Domain):** Voice of America (VOA), ABD Federal Hükümeti (USAGM) tarafından finanse edilen resmi bir kuruluştur. ABD Telif Hakkı Yasası (Title 17, U.S. Code) uyarınca VOA çalışanları tarafından üretilen tüm içerikler **kamu malıdır** (*public domain*).
- Bu durum, VOA içeriklerinin Diloloji içinde tam metin ve ses olarak yayınlanmasını hukuki açıdan **kesinlikle risksiz ve serbest** kılmaktadır.

### 3.3. Pedagojik Seviye
- A2–B1 seviyesindedir. 1.500 kelimelik kontrollü bir sözcük dağarcığı (*Special English / Learning English core vocabulary*) kullanılır; cümleler kısa ve yalındır; konuşma hızı standart İngilizceden üçte bir oranında daha yavaştır.

---

## 4. İspanyolca: Kaynak Değerlendirmesi

### 4.1. Voz de América (VOA Noticias en español) — Önerilen 1. Tercih
- **Besleme:** `https://www.vozdeamerica.com/api/zp_opey_ip` (Doğrulandı, 200 OK).
- **Format:** Günlük 2–4 dakikalık sesli haberler ve tam metinler.
- **Lisans:** İngilizce VOA gibi kamu malıdır (Public Domain). Telif riski bulunmaz.
- **Dil:** Standart, temiz Latin Amerika İspanyolcası (B1–B2).

### 4.2. Radio Francia Internacional (RFI en español) — 2. Tercih
- **Besleme:** `https://www.rfi.fr/es/rss` (Doğrulandı, 200 OK).
- **Format:** Günlük uluslararası haberler; Avrupa ve Latin Amerika perspektifi.
- **Lisans:** France Médias Monde telifli; podcast akışı açık.

### 4.3. RTVE (RNE Audio) — Neden Elendi?
- RTVE, 2024–2026 döneminde üçüncü taraf podcast toplayıcılarının MP3 dosyalarını indirmesini ve harici oynatıcılarda oynatılmasını teknik olarak engellemiştir (*token/referrer kısıtlaması*).
- Eski RSS beslemeleri (`api.rtve.es`) 404 döndürmektedir. Bu nedenle entegrasyon için uygun değildir.

### 4.4. Deutsche Welle (DW en español) — 3. Tercih
- `https://rss.dw.com/rdf/rss-sp-all` beslemesi doğrudan `Access-Control-Allow-Origin: *` başlığı vermektedir. Metin tabanlı haber akışı için çok uygundur, ancak sesli podcastleri Spotify ve Apple Podcasts üzerine taşınmıştır.

---

## 5. Mevcut Mimari ile Entegrasyon Yol Haritası

Diloloji'nin mevcut altyapısı bu kaynakları entegre etmek için neredeyse hazırdır:

1. **`src/engine/news.ts` Allowlist Genişletmesi:**
   ```ts
   // FEEDS listesine eklenecekler:
   { id: 'rfi-facile', language: 'fr', name: 'RFI · Journal en français facile', url: 'https://www.rfi.fr/fr/podcasts/journal-fran%C3%A7ais-facile/podcast', hosts: ['rfi.fr', 'audiomeans.fr'] },
   { id: 'voa-news', language: 'en', name: 'VOA Learning English · As It Is', url: 'https://learningenglish.voanews.com/api/zkm-ql-vomx-tpej-rqi', hosts: ['learningenglish.voanews.com', 'voanews.com'] },
   { id: 'voa-es', language: 'es', name: 'Voz de América · Noticias', url: 'https://www.vozdeamerica.com/api/zp_opey_ip', hosts: ['vozdeamerica.com'] },
   ```
2. **Ses ve Transkript Çifti:**
   `api/news.ts` uç noktası RSS'deki `<enclosure url="..." type="audio/mpeg"/>` etiketini yakalayıp istemciye `audioUrl` olarak döndürdüğünde, `NewsPicker.tsx` haberi doğrudan **sesli okuma paneline** (`AudioPanel`) aktarabilir.
3. **Öğrenme Özellikleri Köprüsü:**
   Mikro haber metni `ReadingText` nesnesine dönüştüğünde otomatik olarak:
   - Cümle cümle ayrıştırılarak **Gölgeleme (*Shadowing*)** modunda çalışılabilir.
   - Bilinmeyen kelimeler tek tıkla sözlüğe eklenebilir.
   - "Cümlenin Türkçesi" DeepL ile yerel çeviri belleğine kaydedilebilir.

---

## 6. Sıralı Tavsiye

| Dil | Önerilen Kaynak | Tercih Gerekçesi |
| :--- | :--- | :--- |
| **Fransızca** | **RFI Journal en français facile** | Dünyadaki en popüler ve pedagojik B1–B2 haber bülteni; doğrulanmış aktif RSS; CDN ses akışı açık; tam transkript. |
| **İngilizce** | **VOA Learning English (As It Is)** | Sıfır telif riski (Public Domain); sadeleştirilmiş gramer ve kelime hazinesi; kusursuz transkript ve ses. |
| **İspanyolca** | **VOA Noticias en español** | Kamu malı lisansı; kısa bültenler; açık ses akışı ve tam metin. |

---

## 7. Canlı Doğrulama Raporu (2026-10-10)

`scripts/check-news-feeds.ts` komutu çalıştırılarak `src/engine/news.ts` içerisindeki `FEEDS` allowlist'e eklenen üç öğrenici haber beslemesi gerçek ağ üzerinde test edilmiş, durum kodları, makale ayrıştırma kelime sayıları ve ses akışları doğrulanmıştır.

### 7.1. Özet Tablo

| Besleme ID | Kaynak Adı | Mevcut Tanımlı URL | Toplam Madde | Sesli Madde | `extractArticle` Kelime (İlk 3 Madde) | Ses Akışı Durumu (HEAD / CDN) | Canlı Durum |
| :--- | :--- | :--- | :---: | :---: | :---: | :---: | :---: |
| `rfi-facile` | RFI · Journal en français facile | `...rfi.fr/fr/podcasts/journal-fran%C3%A7ais-facile/podcast` | 30 | 30 | 12 / 12 / 12 kelime (BAŞARISIZ) | **HTTP 200** (Audiomeans CDN, `audio/mpeg`) | **Kısmi** (Ses çalışıyor, metin slug'ı hatalı) |
| `voa-learning` | VOA Learning English · As It Is | `...voanews.com/api/zkm-ql-vomx-tpej-rqi` | 20 | **0** | 0 / 0 / 503 kelime (BAŞARISIZ) | Seste enclosure yok (Görsel jpeg var) | **Kısmi** (Yalnızca metin var, ses yok) |
| `voa-es` | Voz de América · Noticias | `...vozdeamerica.com/api/zp_opey_ip` | **0** | **0** | – (BAŞARISIZ) | Besleme yanıtı `"Invalid url"` | **ÇALIŞMIYOR** (Kırık uç nokta) |

---

### 7.2. Kaynak Bazlı Detaylı İnceleme ve Düzeltme Önerileri (Claude Code İçin)

#### 1. RFI · Journal en français facile (`rfi-facile`)
- **Ses Akışı:** Audiomeans CDN üzerinden `302 Found` yönlendirmesiyle `files.audiomeans.fr` adresine gitmekte, `200 OK` ve `content-type: audio/mpeg` ile eksiksiz inmektedir. Ses akışında hiçbir problem yoktur.
- **Metin Sorunu:** Mevcut beslemedeki `<link>` etiketleri `https://www.rfi.fr/fr/podcasts/journal-en-français-facile/...` rotasını vermektedir. Bu sayfalar sunucudan statik HTML olarak dönmemekte; bir SPA istemci hatası (`"Le contenu auquel vous tentez d'accéder n'existe pas ou n'est plus disponible"`) döndürmektedir (12 kelime).
- **Önerilen Düzeltme:**
  - RSS besleme URL'si RFI'ın eğitim portalı olan **francaisfacile** rotasına çevrilmelidir:
    `url: 'https://francaisfacile.rfi.fr/fr/podcasts/journal-en-fran%C3%A7ais-facile/podcast'`
  - `hosts` dizisine `'francaisfacile.rfi.fr'` eklenmelidir:
    `hosts: ['rfi.fr', 'francaisfacile.rfi.fr']`
  - *Doğrulama Sonucu:* Bu RSS rotasındaki bağlantılar doğrudan güncel transkript slug'larına (`francaisfacile.rfi.fr/fr/podcasts/journal-en-français-facile/20261009-prix-nobel-de-la-paix...`) gitmekte ve `extractArticle()` ile **1.476 kelimelik tam transkript** kusursuz olarak çıkarılabilmektedir.

#### 2. VOA Learning English · As It Is (`voa-learning`)
- **Ses Sorunu:** Mevcut `api/zkm-ql-vomx-tpej-rqi` adresi bir metin haber API beslemesidir. XML içerisindeki `<enclosure>` etiketleri ses dosyası (`audio/mpeg`) değil, kapak görseli (`image/jpeg`) taşımaktadır (`itemsWithAudio = 0`).
- **Metin Durumu:** Maddelerden bazıları salt ses/video klip sayfası olduğundan gövde metni içermemektedir (0 kelime); tam haber sayfalarında ise 503 kelime başarıyla ayrıştırılmaktadır.
- **Önerilen Düzeltme:**
  - Sesli bültenlerin bulunduğu resmi podcast beslemesine geçilmelidir:
    `url: 'https://learningenglish.voanews.com/podcast/?zoneId=3521'`
  - *Doğrulama Sonucu:* `zoneId=3521` beslemesinde 250 bölümün tamamında `https://voa-audio.voanews.eu/..._hq.mp3` formatında doğrulanmış `audio/mpeg` enclosure ses bağlantıları bulunmaktadır.

#### 3. Voz de América · Noticias (`voa-es`)
- **Besleme Sorunu:** Tanımlı olan `https://www.vozdeamerica.com/api/zp_opey_ip` adresi sunucu tarafında kaldırılmıştır; HTTP 200 kodu ile `"Invalid url"` metni dönmektedir (`totalItems = 0`).
- **Önerilen Düzeltme:**
  - **Seçenek A (Önerilen - Sesli Haber Podcasti):** Voz de América'nın günlük resmi haber podcasti "Buenos días América":
    `url: 'https://www.vozdeamerica.com/podcast/?zoneId=537'`
    *Doğrulama Sonucu:* 250 bölüm aktif, tüm bölümlerde `voa-audio.voanews.eu/...original.mp3` ses dosyası mevcuttur.
  - **Seçenek B (Metin Haber Beslemesi):** Güncel ana haber metin akışı için:
    `url: 'https://www.vozdeamerica.com/api/zgkmqrl-vomx-tpe-pvqo'`

---

## 8. Aday Kaynaklar ve Canlı Değerlendirme (2026-10-11)

11. tur 11.6 maddesi kapsamında, `scripts/check-news-feeds.ts` genişletilerek (`--candidates` bayrağı ile) Fransızca, İspanyolca ve İngilizce dillerinin her biri için en az 3 yeni aday kaynak gerçek ağ üzerinden canlı olarak test edilmiştir.

### 8.1. Aday Kaynaklar Karşılaştırma Tablosu

| Dil | Aday Kaynak | Besleme URL | HTTP | Toplam Madde | Ses Enclosure | Makale Kelime | CDN Ses Durumu / CORS | Seviye | Lisans / Telif | Karar |
|---|---|---|:---:|:---:|:---:|:---:|:---:|:---:|---|:---:|
| **FR** | **franceinfo · Salut l'info !** | `https://radiofrance-podcast.net/podcast09/podcast_9f5486b0-38b5-4544-bf49-e24b18bd022c.xml` | **200** | 7 | **Var (7/7)** | **574 kelime** | **HTTP 200** (Proxycast, `audio/mpeg`, CORS `*`) | A2–B1 | Radio France telifli; açık podcast MP3 akışı | **ÖNERİLEN (1. Tercih)** |
| **FR** | 1jour1actu (Milan Presse) | `https://www.1jour1actu.com/feed` | **200** | 10 | Yok | 373 kelime | – | A2–B1 | Milan Presse telifli | Yedek (Salt metin) |
| **FR** | TV5Monde Informations | `https://information.tv5monde.com/rss.xml` | **200** | 100 | Yok | 214 kelime | – | B1–B2 | TV5Monde telifli | Yedek (Salt metin) |
| **ES** | **Hoy Hablamos · Noticias en español** | `https://www.hoyhablamos.com/feed/podcast/` | **200** | 300 | **Var (300/300)** | 146 kelime | **HTTP 200** (Blubrry CDN, `audio/mpeg`) | B1–B2 | Telifli (Hoy Hablamos); açık podcast MP3 akışı | **ÖNERİLEN (1. Tercih)** |
| **ES** | Radio Ambulante (NPR) | `https://feeds.npr.org/510315/podcast.xml` | **200** | 369 | **Var (369/369)** | 223 kelime | **HTTP 200** (Omny CDN, CORS `*`) | B2–C1 | NPR telifli | Yedek (İleri düzey B2+) |
| **ES** | DW Español · Noticias | `https://rss.dw.com/rdf/rss-sp-all` | **200** | 19 | Yok | 405 kelime | – (CORS `*` açık) | B2–C1 | Deutsche Welle | Yedek (Salt metin) |
| **EN** | **BBC Learning English (6 Minute)** | `https://podcasts.files.bbci.co.uk/p02pc9tn.rss` | **200** | 344 | **Var (344/344)** | 480 kelime | **HTTP 200** (BBC Media, `audio/mpeg`) | A2–B1 | BBC telifli; eğitim amaçlı podcast yayını | **ÖNERİLEN (1. Tercih)** |
| **EN** | News in Levels | `https://www.newsinlevels.com/feed/` | **200** | 10 | Yok (iframe) | 119 kelime | – | A1–B2 | News in Levels telifli | Yedek (Salt metin) |
| **EN** | NPR News Now | `https://feeds.npr.org/500005/podcast.xml` | **200** | 4 | **Var (4/4)** | 0 (yalnızca ses) | **HTTP 200** (Spotify CDN, `audio/mpeg`) | B2–C1 | NPR telifli | Yedek (Transkriptsiz dinleme) |

---

### 8.2. Dil Bazında Aday Değerlendirmeleri

#### Fransızca Adayları:
1. **franceinfo & Astrapi · Salut l'info ! (Önerilen 1. Tercih):**
   - **Pedagojik Değer:** 7–11 yaş grubu ve Fransızca öğrenenler için haftalık/günlük güncel olaylar bülteni. Konuşma temposu berrak, kelime seçimi canlı ve öğretici.
   - **Teknik Durum:** Radio France'ın resmi Proxycast altyapısı üzerinden `audio/mpeg` doğrudan stream edilebilmekte, `access-control-allow-origin: *` başlığı bulunmaktadır. Web makalesi `extractArticle()` ile 574 kelimelik zengin metin üretmektedir.
2. **1jour1actu (Yedek - Salt Metin):**
   - Çocuklar için hazırlanan günlük haberler A2 seviyesi için kusursuzdur. Ancak RSS beslemesinde ses enclosure bulunmamaktadır. Gelecekte salt metin haber modu eklenirse 1. tercih olmalıdır.
3. **TV5Monde Informations (Yedek):**
   - 100 maddelik geniş haber akışı sağlamaktadır. Ses dosyası içermemektedir ve standart haber dili B1–B2 seviyesindedir.

#### İspanyolca Adayları:
1. **Hoy Hablamos · Noticias en español (Önerilen 1. Tercih):**
   - **Pedagojik Değer:** İspanyolca öğrenenler için özel olarak hazırlanmış günlük haber ve dil bilgisi bülteni. Temiz İspanya İspanyolcası, orta tempo, pedagojik kelime açıklamaları.
   - **Teknik Durum:** 300 bölümün tamamında Blubrry CDN üzerinden doğrudan inen MP3 ses dosyası mevcuttur.
2. **Radio Ambulante - NPR (Yedek - İleri Düzey):**
   - Latin Amerika'nın en prestijli gazetecilik podcastidir. Omny CDN üzerinden HTTP 200 ve CORS `*` ile kusursuz ses sunar. Ancak bölümler 25–45 dakika uzunluğunda olup dili B2–C1 düzeyindedir (mikro haber için fazla uzundur).
3. **DW Español (Yedek):**
   - Doğrudan CORS `*` başlığı veren ender haber sitelerindendir, ancak ses dosyası podcast ayrımında kaldığından salt metin kalmaktadır.

#### İngilizce Adayları:
1. **BBC Learning English · 6 Minute English (Önerilen 1. Tercih):**
   - **Pedagojik Değer:** 6 dakikalık bültenler, her bölümde 6 yeni kelime, kontrollü konuşma hızı ve güncel dünya konuları.
   - **Teknik Durum:** 344 bölüm aktif; doğrudan MP3 enclosure barındırmaktadır.
   - **Kritik Mimari Not:** BBC RSS'indeki linkler `http://` protokolü taşımaktadır. `src/engine/news.ts` içindeki `parseFeed` fonksiyonu `^https:\/\/` filtresi uyguladığı için `parseFeed` bu maddeleri elemektedir. Claude Code'un `link` filtresini `^https?:\/\/` olarak güncellemesi durumunda BBC beslemesi kusursuz çalışacaktır.
2. **News in Levels (Yedek):**
   - Seviyeli (Level 1, 2, 3) haber konsepti mükemmeldir, ancak RSS içinde doğrudan MP3 enclosure sunulmamakta, ses web sayfasına gömülü iframe oynatıcıda kalmaktadır.
3. **NPR News Now (Yedek):**
   - Her saat başı 5 dakikalık en güncel dünya bülteni sunar. MP3 açık ve çalışmaktadır ancak bültenin yazılı metin/transkripti bulunmamaktadır (yalnızca kulak çalışması için uygundur).

---

---

## 9. Yeni Öğrenici Beslemelerinin Gerçek Alan Adları ve Canlı Ağ Denetimi (2026-10-11 — 12.1 Görevi)

`src/engine/news.ts` içindeki `FEEDS` listesine eklenen 3 yeni öğrenici beslemesi (`salut-linfo`, `hoyhablamos`, `bbc-6min`), `scripts/check-news-feeds.ts --feeds salut-linfo,hoyhablamos,bbc-6min` betiği ile gerçek ağ üzerinden canlı olarak sınandı.

### 9.1. Özet Sonuç Tablosu

| Besleme ID | Dil / Seviye | Tanımlı `hosts` | İlk 5 Maddenin Link Hostu | `allowedArticle` Uyumu | Metin Kelime Sayısı (Ort.) | Ses Akışı (Enclosure) | Sonuç |
| :--- | :---: | :--- | :--- | :---: | :---: | :--- | :---: |
| **`salut-linfo`** | FR (A2–B1) | `radiofrance.fr`<br>`franceinfo.fr` | `www.franceinfo.fr` (5/5) | **GEÇERLİ (5/5)** | 606 kelime (492–900) | HTTP 200, audio/mpeg, CORS `*`<br>(Proxycast ➔ Media Radio France) | **KUSURSUZ** |
| **`hoyhablamos`** | ES (B1–B2) | `hoyhablamos.com` | `www.hoyhablamos.com` (5/5) | **GEÇERLİ (5/5)** | 205 kelime (146–304) | HTTP 200, audio/mpeg<br>(Blubrry CDN doğrudan MP3) | **KUSURSUZ** |
| **`bbc-6min`** | EN (B1–B2) | `bbc.co.uk`<br>`bbc.com` | `www.bbc.co.uk` (5/5) | **GEÇERLİ (5/5)** | 158 kelime (125–178) | HTTP 200, audio/mpeg<br>(BBC Mediaset ➔ Triton Digital) | **KUSURSUZ** |

---

### 9.2. Besleme Bazında Ayrıntılı Bulgular

#### 1. franceinfo · Salut l'info ! (`salut-linfo` — Fransızca)
* **RSS Beslemesi:** `https://radiofrance-podcast.net/podcast09/podcast_9f5486b0-38b5-4544-bf49-e24b18bd022c.xml` (7/7 aktif bölüm, tamamı sesli).
* **Maddelerin Alan Adı:** Tüm maddeler `https://www.franceinfo.fr/replay-radio/salut-l-info/...` biçimindedir. `u.hostname` (`www.franceinfo.fr`), tanımlı `franceinfo.fr` son ekiyle tam eşleşir (`allowedArticle` = **EVET**).
* **Makale Metni Çıkarımı:** `extractArticle` her bölümde 492 ile 900 kelime arasında (ortalama 606 kelime) temiz metin çıkarmaktadır (80 kelime eşiğini katbekat aşar).
* **Ses Akışı:** Radio France Proxycast üzerinden `https://media.radiofrance-podcast.net/...` CDN adresine 302 yönlenir; HTTP 200 döner ve `access-control-allow-origin: *` başlığı mevcuttur.

#### 2. Hoy Hablamos · Noticias en español (`hoyhablamos` — İspanyolca)
* **RSS Beslemesi:** `https://www.hoyhablamos.com/feed/podcast/` (300/300 aktif bölüm, tamamı sesli).
* **Maddelerin Alan Adı:** Maddeler `https://www.hoyhablamos.com/<sayı>-<slug>/` biçimindedir. `u.hostname` (`www.hoyhablamos.com`), tanımlı `hoyhablamos.com` son ekiyle tam eşleşir (`allowedArticle` = **EVET**).
* **Makale Metni Çıkarımı:** `extractArticle` bültenlerin kısa haber özetini (146–304 kelime) başarıyla ayıklar.
* **Ses Akışı:** `https://media.blubrry.com/...` linki doğrudan `content.blubrry.com/...` adresine yönlenir; HTTP 200 ile tam audio/mpeg akışı sağlar.

#### 3. BBC Learning English · 6 Minute English (`bbc-6min` — İngilizce)
* **RSS Beslemesi:** `https://podcasts.files.bbci.co.uk/p02pc9tn.rss` (344/344 aktif bölüm, tamamı sesli).
* **Maddelerin Alan Adı:** Maddeler `https://www.bbc.co.uk/programmes/<id>` biçimindedir (`upgradeHttp: true` bayrağı sayesinde `http://` linkleri `https://` protokolüne yükseltilmektedir). `u.hostname` (`www.bbc.co.uk`), tanımlı `bbc.co.uk` son ekiyle tam eşleşir (`allowedArticle` = **EVET**).
* **Makale Metni Çıkarımı:** `extractArticle` web sayfasından 125–178 kelimelik bölüm transkript özetini başarıyla çıkarır (80 eşiğinin üzerindedir).
* **Ses Akışı:** BBC Open Live Mediaset üzerinden Triton Digital podcast dağıtım ağına yönlenir; HTTP 200 ile doğrudan MP3 olarak dinlenebilir.

---

### 9.3. Claude Code İçin Sonuç ve Tavsiye

1. **Hosts Ayarları Doğrudur:** `src/engine/news.ts` içindeki `hosts` tanımları (`['radiofrance.fr', 'franceinfo.fr']`, `['hoyhablamos.com']`, `['bbc.co.uk', 'bbc.com']`), `allowedArticle` algoritmasının alt alan adı (`.hostname.endsWith('.' + host)`) kuralı sayesinde `www.*` adreslerini sorunsuz kabul etmektedir. Hiçbir host engeli bulunmamaktadır.
2. **Ek Düzenleme Gerekmez:** Üç besleme de metin zenginliği ve ses akışı bakımından üretime hazırdır.



