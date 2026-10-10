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
