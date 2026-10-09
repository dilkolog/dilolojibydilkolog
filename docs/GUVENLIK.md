# Güvenlik

Kişisel bir uygulama için durum ve yapılacaklar (2026-10-09).

## Var olanlar
- **Eşitleme uçtan uca şifreli:** veri cihazda şifrelenir; sunucu (`api/sync.ts`, özel Vercel Blob) yalnızca opak bayt saklar. Hesaplı girişte erişim belirteci denetlenir; günlük geri yükleme noktaları.
- **Sunucu fonksiyonları keyfi adres almaz:** haber/dinleme kaynakları kimlikle seçilir (izin listesi), SSRF yok.
- **Gizli anahtarlar sunucuda:** `DEEPL_AUTH_KEY`, `CRON_SECRET`, Blob belirteci Vercel ortam değişkenlerinde; cron `CRON_SECRET` ile korunur.
- **Çeviri ucu:** yalnızca uygulamanın sayfaları (`fromApp`: nigalingo.online, kelime-koc.vercel.app, önizlemeler, localhost), istek başına 600 karakter, yanıtlar CDN önbelleğinde.
- **XSS yüzeyi küçük:** `dangerouslySetInnerHTML` yok; React metni kaçışlar.
- **Bağımlılıklar:** `npm audit --omit=dev` 0 açık (2026-10-09).
- **HSTS:** Vercel ekliyor.

## Başlıklar (`vercel.json`, #—)
| Başlık | Ne yapar |
|---|---|
| `X-Frame-Options: DENY` | Uygulama başka bir sitede çerçeve içine alınamaz (tıklatma tuzağı). |
| `X-Content-Type-Options: nosniff` | Tarayıcı dosya türünü tahmin etmez. |
| `Referrer-Policy: strict-origin-when-cross-origin` | Dış sitelere yalnızca alan adı gider, sayfa yolu gitmez. |
| `Permissions-Policy` | Mikrofon yalnızca kendi sitemizde; kamera, konum, ödeme kapalı. |
| `Content-Security-Policy-Report-Only` | **Yalnızca raporlar, engellemez.** Betikler yalnızca kendi sitemizden ve `index.html`'deki iki satır içi betiğin hash'iyle; resim/ses/bağlantı `https:`; çerçeve yalnızca YouTube. İhlaller `/api/log?csp=1` → Vercel günlüğünde `[csp-report]`. |

### CSP'yi zorunlu yapmak (bir hafta sonra)
1. `vercel logs --environment production --since 7d --expand | grep csp-report` ile raporlara bak. Uygulamanın kendi işini engelleyecek bir ihlal varsa (ör. yeni bir kaynak) politikaya ekle.
2. Temizse `vercel.json`'da başlığın adını `Content-Security-Policy-Report-Only` → `Content-Security-Policy` yap.
3. **`index.html`'deki satır içi betikler değişirse hash'leri değişir:** `npx vite build` sonra `dist/index.html`'deki her satır içi `<script>` içeriğinin SHA-256'sını (base64) `script-src`'ye yaz. Yoksa zorunlu modda tema/saat betikleri çalışmaz.

## Kullanıcının yapacakları
1. **`SYNC_ALLOWED`:** Vercel → proje → Settings → Environment Variables → `SYNC_ALLOWED` = kullanıcı adın (ya da eşitleme kodunun 64 haneli kimliği), Production; sonra yeniden yayınla. Yoksa herkes Blob deposuna yazabilir (verini okuyamaz ama depoyu doldurabilir).
2. **Hız sınırı:** Vercel → proje → Firewall → Custom Rules → "Rate limit": `/api/translate` ve `/api/log` için IP başına dakikada ~30 istek, aşınca 429. (DeepL kotasının betikle tüketilmesine ve günlük çöpüne karşı.)
3. **AI sağlayıcısında aylık harcama sınırı:** AI anahtarın tarayıcıda saklanır ve doğrudan sağlayıcıya gider; sağlayıcının panelinden aylık sınır koy.
4. **Yedek dosyaları** (`kelime-kocu-yedek-*.json`) kişisel veri içerir; `.gitignore`'da, yine de depoya koyma, işin bitince sil.
5. **İki adres:** `nigalingo.online` ve `kelime-koc.vercel.app` ayrı tarayıcı depoları kullanır. Birini seç; eşitleme açık değilse eski adreste yedek alıp yenisine yükle.
