# Content Security Policy (CSP) Zorunlu Moda Geçiş Raporu ve Eylem Planı (B10)

> **Uygulandı (2026-10-20, Claude Code):**
> - **Politika zorunlu:** `vercel.json` anahtarı `Content-Security-Policy`; `report-uri` duruyor.
> - **Hash'ler derlemede:** `scripts/cf-headers.mjs`, `dist/index.html`deki satır içi betiklerin hash'lerini her derlemede yeniden hesaplar (`scripts/cspHashes.mjs`). `src/csp.test.ts`, `vercel.json`daki hash'lerin `index.html` ile uyuştuğunu denetler.
> - **`connect-src` açık listeye indirilmedi:** `'self' https: wss:` olarak kaldı (`wss:` düello odası içindir). Nedeni, §4'teki listenin eksik olması: `api.anthropic.com` (YZ), `api.tatoeba.org`, `audio.tatoeba.org` ve Vikidia listede yok. Ayrıca çevrimdışı ses indirme (`audioCache`), görsel seçme (`imageSearch`) ve ses karşılaştırma (`PitchCompare`) önceden bilinemeyen adreslerden `fetch` yapıyor; açık liste bunları bozar.
> - **XSS koruması:** asıl koruma `script-src`te (satır içi betik yalnızca hash'le, `unsafe-inline`/`unsafe-eval` yok).
> - **Doğrulama:** zorunlu politikayla bütün ekranlar telefon ve masaüstünde gezildi, ihlal çıkmadı. Kontrol olarak bilerek bozulan bir hash yakalandı.
> - **Geri alma:** anahtarı yeniden `Content-Security-Policy-Report-Only` yapmak.

Bu rapor, `diloloji.com` etki alanında şu anda `Content-Security-Policy-Report-Only` olarak çalışan güvenlik ilkesinin, sitenin işlevselliğini bozmadan ve sıfır kesintiyle **zorunlu (enforce / bloklayıcı) moda** geçirilmesi için gereken teknik gereksinimleri, derleme zamanı hash üretimini, izinli ağ bağlantılarını (`connect-src`) ve adım adım geçiş planını belgeler.

---

## 1. Mevcut Durum ve Mimari İnceleme

### 1.1 Politikanın Tanımlandığı Yerler
1. **`vercel.json`:**
   `/ (.*)` rotası altında `Content-Security-Policy-Report-Only` başlığı olarak tanımlıdır.
2. **`scripts/cf-headers.mjs`:**
   Statik derleme (`npm run build:cf`) sırasında `vercel.json`'daki başlıkları okuyarak Cloudflare Workers Static Assets için `dist/_headers` dosyasına yazar.
3. **`worker/index.ts` ve Raporlama:**
   Tarayıcılar CSP ihlallerini `report-uri /api/log?csp=1` adresine `POST` eder. `api/log.ts` bu raporları `[csp-report]` etiketiyle konsola basar ve Cloudflare Workers Logs (`npx wrangler tail diloloji --search "[csp-report]"`) üzerinden canlı izlenir.

### 1.2 Mevcut Başlık Değeri
```text
default-src 'self';
script-src 'self' 'sha256-SGlVmIIfuvr1jaPrHcT4ox03BxYZgBTwAJr5YAQRQNc=' 'sha256-xdgnXDmxpmr0CJmON1wGmvwZVw7HhLzwURMvYPBPxtM=';
style-src 'self' 'unsafe-inline';
img-src 'self' https: data: blob:;
media-src 'self' https: data: blob:;
font-src 'self' data:;
connect-src 'self' https:;
frame-src https://www.youtube-nocookie.com https://www.youtube.com;
worker-src 'self' blob:;
manifest-src 'self';
object-src 'none';
base-uri 'self';
form-action 'self';
frame-ancestors 'none';
report-uri /api/log?csp=1
```

---

## 2. Zorunlu Moda Geçiş Öncesi Kritik Riskler ve Eksikler

1. **Inline Script Hash'lerinin Statikliği (Kırılma Riski):**
   `index.html` içinde ilk boyamadan (first paint) önce çalışan iki kritik inline betik vardır:
   - Tema başlatıcı (gece modunda beyaz parlama olmaması için)
   - Gün ışığı / daypart hesabı
   Şu anki iki `sha256-...` hash'i elle girilmiştir. `index.html` içindeki tek bir boşluk, yorum satırı ya da değişken adı değiştiğinde hash geçersiz kalır. Zorunlu modda bu durum **uygulamanın açılışta beyaz ekranda donmasına** yol açar.
2. **`connect-src` Kapsamının Aşırı Geniş Olması:**
   Mevcut politikada `connect-src 'self' https:;` tanımlıdır. `https:` joker karakteri her türlü dış bağlantıya izin verdiği için XSS saldırılarına karşı API veri sızıntısı koruması sağlamaz. Zorunlu modda bu direktif açık bir beyaz listeye (allowlist) indirgenmelidir.
3. **`style-src 'unsafe-inline'` Zorunluluğu:**
   React bileşenleri, animasyonlar, dinamik CSS değişkenleri ve renk tokenları satır içi stiller üretmektedir. Bu nedenle `'unsafe-inline'` direktifi korunmalıdır.

---

## 3. Derleme Zamanında `script-src` Hash'lerinin Otomatik Üretimi

Zorunlu modda betiklerin engellenmesini önlemek için hash hesaplama işlemi derleme betiğine (`scripts/cf-headers.mjs`) bağlanmalıdır.

### 3.1 Otomasyon Algoritması
Derleme sırasında üretilen `dist/index.html` dosyası taranmalı, tüm inline `<script>` etiketlerinin içerikleri SHA-256 ile özetlenmeli ve üretilen CSP başlığı dinamik olarak `dist/_headers` dosyasına basılmalıdır:

```javascript
// scripts/generate-csp.mjs veya scripts/cf-headers.mjs eki
import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'

export function extractInlineScriptHashes(htmlPath) {
  const html = readFileSync(htmlPath, 'utf8')
  const scriptRegex = /<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/gi
  const hashes = []
  
  let match
  while ((match = scriptRegex.exec(html)) !== null) {
    const content = match[1]
    if (content.trim()) {
      const hash = createHash('sha256').update(content, 'utf8').digest('base64')
      hashes.push(`'sha256-${hash}'`)
    }
  }
  return hashes
}
```

Bu sayede geliştirici veya başka bir ajan `index.html` içindeki açılış betiklerini güncellediğinde, CSP hash'leri otomatik olarak güncellenir ve üretim ortamı asla kilitlenmez.

---

## 4. `connect-src` Açık Beyaz Listesi (Allowlist)

Uygulamanın tarayıcı üzerinden doğrudan (`fetch`) çağırdığı tüm harici uç noktalar kaynak kod taranarak çıkarılmıştır:

| Servis / Kaynak | Kullanım Amacı | Kod Konumu | CSP `connect-src` Değeri |
|---|---|---|---|
| **Diloloji API & CDN** | Kendi API rotaları (`/api/*`) ve statik varlıklar | `src/*` | `'self'` |
| **Supabase** | Kullanıcı kimlik doğrulama, REST veritabanı, Realtime | `src/data/supabase*.ts`, `src/data/vault.ts` | `https://*.supabase.co` |
| **Azure Speech Services** | Telaffuz değerlendirme ve konuşma tanıma (STT) | `src/ui/pronunciation.ts` | `https://*.stt.speech.microsoft.com` |
| **Google Cloud TTS** | Doğal ses sentezleme (Neural TTS) | `src/ui/naturalVoice.ts` | `https://texttospeech.googleapis.com` |
| **LanguageTool** | Serbest yazma denetimi ve dilbilgisi ipuçları | `src/data/grammarCheck.ts` | `https://api.languagetool.org` |
| **Open-Meteo** | Konuma göre hava durumu ve dinamik selamlama | `src/data/weather.ts` | `https://api.open-meteo.com`, `https://geocoding-api.open-meteo.com` |
| **Tatoeba Project** | Cümle arama, sesli telaffuzlar ve örnekler | `src/data/corpus.ts` | `https://tatoeba.org` |
| **Wikimedia Vakfı** | Vikipedi, Vikisözlük ve Vikiveri sözlük entegrasyonu | `src/data/wikipedia.ts`, `wiktionary.ts`, `imageQueue.ts` | `https://*.wikipedia.org`, `https://*.wiktionary.org`, `https://*.wikidata.org`, `https://commons.wikimedia.org` |
| **Pixabay** | Kelime kartları için görsel arama | `src/data/imageSearch.ts` | `https://pixabay.com` |
| **Openverse** | CC lisanslı açık görsel kütüphanesi | `src/data/imageSearch.ts` | `https://api.openverse.org`, `https://api.openverse.engineering` |
| **Archive.org** | Sesli kitaplar ve açık lisanslı ses kayıtları | `src/data/audiobooks.ts`, `src/data/audioCache.ts` | `https://archive.org`, `https://*.archive.org` |
| **Vercel Blob (Geçiş)** | Eski blob depolama alanı uyumluluğu | `src/data/sync.ts` | `https://*.blob.vercel-storage.com` |

### Önerilen Sıkılaştırılmış `connect-src` Direktifi
```text
connect-src 'self'
  https://*.supabase.co
  https://*.stt.speech.microsoft.com
  https://texttospeech.googleapis.com
  https://api.languagetool.org
  https://api.open-meteo.com
  https://geocoding-api.open-meteo.com
  https://tatoeba.org
  https://*.wikipedia.org
  https://*.wiktionary.org
  https://*.wikidata.org
  https://commons.wikimedia.org
  https://pixabay.com
  https://api.openverse.org
  https://api.openverse.engineering
  https://archive.org
  https://*.archive.org
  https://*.blob.vercel-storage.com;
```

---

## 5. Medya, Görsel ve Çerçeve Direktifleri

Ağ üzerinden indirilen sesler, görseller ve YouTube oynatıcıları için:
- **`img-src:`** `'self' https: data: blob:;` (Kullanıcı avatarları, Unsplash/Pixabay/Wikimedia görselleri ve Blob URL'leri dinamik olduğu için `https:` güvenle kalabilir).
- **`media-src:`** `'self' https: data: blob:;` (Archive.org, Tatoeba ve cihaz içi sentezlenen blob sesler).
- **`frame-src:`** `https://www.youtube-nocookie.com https://www.youtube.com;` (Konuşma pratiği video klipleri).
- **`worker-src:`** `'self' blob:;` (PWA Service Worker, SQLite WASM optimizer worker).

---

## 6. Adım Adım Zorunlu Moda Geçiş Planı

### Aşama 1: Dinamik Hash Üretimi (Derleme Entegrasyonu)
- `scripts/cf-headers.mjs` dosyasına `dist/index.html` inline script'lerini SHA-256 ile özetleyen fonksiyon eklenir.
- `package.json` build komutunda `npm run build && node scripts/cf-headers.mjs` akışının başlığı hatasız ürettiği doğrulanır.

### Aşama 2: `connect-src` Direktifinin Sıkılaştırılması (`Report-Only` Modunda)
- `vercel.json` ve `cf-headers.mjs` içindeki `connect-src` yukarıdaki §4 açık listesiyle güncellenir.
- Başlık adı hâlâ `Content-Security-Policy-Report-Only` olarak bırakılır.
- Kod canlıya dağıtılır (`npm run deploy:cf`).

### Aşama 3: İhlal İzleme ve Gözlem Süresi (48 Saat)
- Cloudflare Workers Logs üzerinden canlı günlükler dinlenir:
  ```bash
  npx wrangler tail diloloji --search "[csp-report]"
  ```
- Gerçek kullanıcı oturumlarında, sesli alıştırmalarda ve sözlük aramalarında kaçak bir uç nokta (beklenmeyen üçüncü taraf istek) olup olmadığı kontrol edilir. Raporlanan geçerli servisler beyaz listeye eklenir.

### Aşama 4: Zorunlu Moda Geçiş (Enforce)
- 48 saatlik gözlemde sıfır meşru ihlal görüldüğünde:
  - `vercel.json` içindeki anahtar: `Content-Security-Policy-Report-Only` → `Content-Security-Policy`
  - `cf-headers.mjs` çıktısı: `Content-Security-Policy`
  - Raporlama ucu (`report-uri /api/log?csp=1`) korunur (bloklanan saldırıları veya olası regresyonları anında izlemek için).
- Dağıtım yapılır ve `curl -I https://diloloji.com/` ile canlı başlık doğrulanır.

### Aşama 5: Geri Alma (Rollback) Güvencesi
- Beklenmedik bir bloklama veya beyaz ekranda kalma durumunda, `dist/_headers` ve `vercel.json` içindeki başlık yeniden `Content-Security-Policy-Report-Only` yapılır ve 2 dakika içinde `npm run deploy:cf` ile canlı geri çekilir.

---

## 7. Sonuç ve Özet Karar

1. Zorunlu CSP moduna doğrudan geçmek inline script hash'lerinin kırılması ve dış API'lerin bloklanması riskini taşır.
2. Önce **Aşama 1 (otomatik hash üretimi)** ve **Aşama 2 (beyaz liste `connect-src` ile Report-Only)** uygulanmalıdır.
3. 48 saatlik temiz günlük akışının ardından tek bir kelime değişikliğiyle (`-Report-Only` kaldırılarak) tam korumalı zorunlu CSP moduna geçilmelidir.
