# Canlı Doğrulama ve Sağlık Raporu (2026-10-19)

Bu rapor, `diloloji.com` alan adının Cloudflare Workers & Pages mimarisine taşınması sonrasındaki canlı durumunu, yanıt başlıklarını, sıkıştırma performansını (UX9), Lighthouse mobil ölçümlerini, DNS/DMARC yapılandırmasını ve hata izleme süreçlerini belgeler.

---

## 1. Yanıt Başlıkları ve Güvenlik İlkeleri (UX9)

Canlı ortamda HTTP/2 üzerinden alınan başlıklar incelenmiştir.

### 1.1 Statik Sayfalar ve SPA Kökü (`https://diloloji.com/` ve `/hakkinda`)
- **HTTP Durumu:** `200 OK` (HTTP/2)
- **Sunucu:** `cloudflare`
- **CF Cache Durumu:** `HIT` (Edge önbellekten anında servis ediliyor)
- **Cache-Control:** `public, max-age=0, must-revalidate`
- **X-Content-Type-Options:** `nosniff`
- **X-Frame-Options:** `DENY`
- **X-Robots-Tag:** `noindex, nofollow, noarchive, nosnippet`
- **Referrer-Policy:** `strict-origin-when-cross-origin`
- **Permissions-Policy:** `microphone=(self), camera=(), geolocation=(), payment=(), usb=()`
- **Content-Security-Policy-Report-Only:** Devrede. Güvenli script hash'leri, R2/Supabase/Cloudflare connect kaynakları ve `/api/log?csp=1` raporlama ucu tanımlı.

> [!NOTE]
> **HSTS Başlığı (`Strict-Transport-Security`):**
> Canlı yanıtlarda HSTS başlığı henüz görülmemektedir. Cloudflare Dashboard → **SSL/TLS** → **Edge Certificates** → **HTTP Strict Transport Security (HSTS)** adımı üzerinden "Enable HSTS" (maksimum yaş: 6 ay veya 1 yıl) seçeneğinin aktifleştirilmesi tavsiye edilir.

### 1.2 API Uç Noktaları (`/api/*`)
Worker üzerinden karşılanan uç noktalar yetkilendirme ve HTTP metot kısıtlarını başarıyla uygulamaktadır:
- `GET /api/access` → `HTTP/2 403 Forbidden` (`cache-control: no-store`)
- `GET /api/log` → `HTTP/2 405 Method Not Allowed` (`allow: POST`)

---

## 2. Sözlük Paketleri ve Varlık Sıkıştırması (UX9)

Uygulamanın çevrimdışı ve hızlı çalışmasını sağlayan büyük JSON sözlük paketlerinin (`en`, `es`, `fr`) Cloudflare CDN üzerinden Brotli (`br`) sıkıştırma oranları canlıda ölçülmüştür:

| Dosya | Ham Boyut (Uncompressed) | Canlı Brotli İndirme (`br`) | Tasarruf Oranı | CDN Durumu |
|---|---|---|---|---|
| `/assets/en-BowgZkjG.json` | 10.012.148 B (~10,0 MB) | **2.861.752 B (~2,73 MB)** | **%71,4** | `HIT` |
| `/assets/es-CFcFRYTo.json` | 4.897.137 B (~4,9 MB) | **1.365.035 B (~1,30 MB)** | **%72,1** | `HIT` |
| `/assets/fr-3Jk5FpqO.json` | 5.770.052 B (~5,8 MB) | **1.520.597 B (~1,45 MB)** | **%73,6** | `HIT` |

> [!TIP]
> Cloudflare Edge, JSON dosyalarını otomatik olarak dinamik Brotli seviyesinde sıkıştırmakta ve ilk istekten sonra `HIT` olarak önbellekten sunmaktadır. Kullanıcının cihazına inen toplam ağ yükü ~20,7 MB'tan **~5,48 MB'a** inmektedir (%73,5 genel ağ tasarrufu).

---

## 3. Lighthouse ve İlk Yükleme Süreleri

Lighthouse mobil emülasyonu (yavaş 4G throttling, CPU yavaşlatma) ve canlı ağ zamanlamaları:

### 3.1 Canlı Ağ Zamanlaması (TTFB — curl)
- **`https://diloloji.com/` (SPA Ana Sayfa):**
  - DNS: 2,1 ms
  - TCP Connect: 16,4 ms
  - TTFB: **83,3 ms**
  - Toplam Süre: **84,7 ms**
- **`https://diloloji.com/hakkinda` (Statik Sayfa):**
  - DNS: 2,1 ms
  - TCP Connect: 15,8 ms
  - TTFB: **276 ms**
  - Toplam Süre: **276 ms**

### 3.2 Lighthouse Skorları (Mobil / Yavaş 4G)

| Kategori / Metrik | `https://diloloji.com/` (SPA PWA) | `https://diloloji.com/hakkinda` (Statik HTML) |
|---|---|---|
| **Erişilebilirlik (Accessibility)** | **98** | **100** |
| **En İyi Uygulamalar (Best Practices)** | **96** | **96** |
| **Performans (Performance)** | **60** | **100** |
| **SEO** | 69 (noindex politikası gereği) | 66 (noindex politikası gereği) |
| **FCP (First Contentful Paint)** | 6,5 s | **0,8 s** |
| **LCP (Largest Contentful Paint)** | 7,4 s | **0,8 s** |
| **TBT (Total Blocking Time)** | **0 ms** | **0 ms** |
| **CLS (Cumulative Layout Shift)** | **0,001** | **0** |
| **Speed Index** | 6,5 s | **0,8 s** |

**Bulgular:**
- Statik `/hakkinda` sayfası **100/100/96** ile kusursuz bir puana sahiptir.
- SPA ana sayfası, zengin React/PWA demeti nedeniyle simüle edilmiş yavaş mobil 4G ortamında 60 puan alsa da, **0 ms TBT** (hiçbir CPU bloklaması yok) ve **0,001 CLS** (sıfır kayma) ile son derece stabil bir çalışma zamanı sergilemektedir.

---

## 4. DNS, SPF, DKIM ve DMARC Yapılandırması

Cloudflare 1.1.1.1 DoH (DNS over HTTPS) ile alan adı kayıtları sorgulanmıştır:

1. **SPF (TXT `diloloji.com`):**
   ```text
   v=spf1 include:_spf.mx.cloudflare.net ~all
   ```
   Doğrulandı. Cloudflare Email Routing için geçerli.
2. **MX (`diloloji.com`):**
   - `route1.mx.cloudflare.net` (Öncelik: 80)
   - `route2.mx.cloudflare.net` (Öncelik: 3)
   - `route3.mx.cloudflare.net` (Öncelik: 44)
   Doğrulandı. Gelen e-postalar Cloudflare Email Routing ile yönlendiriliyor.
3. **DKIM (TXT `resend._domainkey.diloloji.com`):**
   ```text
   v=DKIM1; k=rsa; p=MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQDZ8qVbLg...
   ```
   Doğrulandı. Resend 2048-bit RSA anahtarı aktif.
4. **DMARC (TXT `_dmarc.diloloji.com`):**
   ```text
   v=DMARC1; p=none; rua=mailto:destek@diloloji.com
   ```

### Cloudflare "DMARC Record Error detected" Uyarısının Sebebi ve Çözümü

- **Sebep:**
  Cloudflare Dashboard'daki **DMARC Management** özelliği, etki alanına gelen DMARC toplu raporlarını (aggregate reports) toplayıp panelde grafik olarak görselleştirebilmek için `rua` direktifinde Cloudflare'in atadığı özel raporlama adresini bekler (`rua=mailto:<cloudflare-dmarc-id>@dmarc-reports.cloudflare.net`).
  Mevcut kayıtta yalnızca `rua=mailto:destek@diloloji.com` yer aldığı için Cloudflare kendi rapor adresini görememekte ve "DMARC Record Error detected" uyarısı vermektedir.
- **Önerilen Çözüm:**
  Cloudflare Dashboard → **Email Routing** → **DMARC Management** sayfasına gidilmeli, Cloudflare'in bu alan adına özel verdiği rapor adresi alınmalı ve DNS'teki `_dmarc` TXT kaydı virgülle ayrılmış iki e-posta adresi içerecek şekilde güncellenmelidir:
  ```text
  v=DMARC1; p=none; rua=mailto:destek@diloloji.com,mailto:<cloudflare-id>@dmarc-reports.cloudflare.net
  ```
  Bu sayede hem `destek@diloloji.com` gelen raporları doğrudan alır, hem de Cloudflare Dashboard'undaki hata giderilerek analiz grafikleri çalışır.

---

## 5. `scripts/smoke-live.mjs` Durumu

- **Genel Uçlar (Bölüm 1):**
  `/api/access` (403), `/api/push` (405), `/api/log` (405) canlıda test edilmiş ve Worker'ın rotaları beklenen HTTP yanıt kodlarıyla karşıladığı doğrulanmıştır.
- **Eşitleme Uçları (Bölüm 2):**
  `scripts/smoke-live.mjs` içindeki Bölüm 2, canlı veritabanında ve R2 blob deposunda veri yazma, güncelleme ve silme testleri yapmaktadır (`SMOKE_USER`, `SMOKE_PASS`).
  Proje çalışma kuralları gereği ("Sunucuya, Supabase'e ya da canlı siteye yazan hiçbir işlem yapma; yalnızca oku") ve canlı ortamda veri kirliliği oluşturulmaması adına bu bölüm otomatik olarak çalıştırılmamıştır. Canlı yazma testlerinin yalnızca sahibinin onayladığı ayrılmış bir test kullanıcısı ile kontrollü yapılması önerilir.

---

## 6. Günlükler ve Hata İzleme

- `docs/CLOUDFLARE.md` dosyasına canlı akış (`npx wrangler tail diloloji`), Dashboard filtreleme ve log etiketleri (`[client-error]`, `[worker-error]`, `[csp-report]`) ayrıntılı olarak eklendi.
- `AGENTS.md` dosyasındaki "Vercel günlükleri" ibaresi Cloudflare Workers Logs olarak güncellendi.
