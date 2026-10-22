# Güvenlik

Kişisel bir uygulama için durum ve yapılacaklar (2026-10-13; **2026-10-19 güncellemesi aşağıda**).

## 2026-10-19 güncellemesi (Cloudflare Worker + Supabase girişi)
- **Şifreleme iddiası değişti.** Supabase eşitlemesinde (`sync_parts`) veri açık jsonb olarak tutulur; yalnızca eski Blob/R2 yolu istemci tarafında şifrelidir. `sync_keys.enc` ve `auth` Supabase'te düz metindir. Servis anahtarına ya da panele erişen veriyi okuyabilir; bu bir tasarım ödünüdür (satır düzeyinde güvenlik kendi satırını korur). Aşağıdaki "uçtan uca şifreli" cümlesi bu yüzden Blob/R2 yolu için geçerlidir.
- **Hesap şartı sunucuda:** Supabase açıkken `ADMIN_TOKEN` olmasa da kota kullanan uçlar (`translate`, `news`, `listen`, `clips`, `youtube`, `share`, `access` arkadaşlar, `push` mail) geçerli bir eşitleme hesabı ister; `api/sync.ts` ilk yazmayla hesap açmaz (hesap yalnızca `vault-link`le talep edilir).
- **Hız freni Worker'da zayıf:** `api/_rate.ts` sayacı Worker örneğinin belleğindedir; Cloudflare çok sayıda kısa ömürlü örnek çalıştırır, yani fiilen kesin sınır yoktur. Sert sınır için Cloudflare WAF **Rate Limiting** kuralı (ücretsiz planda 1 kural; öncelik `/api/translate`, `/api/push`, `/api/sync`) ya da Workers Rate Limiting bağlaması gerekir. "Vercel Firewall" önerisi artık geçersiz.
- **Başlıklar:** statik dosyalara `dist/_headers` (HSTS dahil, `scripts/cf-headers.mjs`), `/api/*` yanıtlarına Worker `x-content-type-options: nosniff` ekler (`worker/index.ts`).
- **Mail onayı** bağlantıda GET ile değil, sayfadaki düğmeyle POST ile yapılır; onay bekleyen adres bir saat silinemez (mail bombası freni).
- **CSP zorunlu (2026-10-20):** başlık artık `Content-Security-Policy` (engeller); ayrıntı aşağıda ve `docs/veri/csp-gecis.md`.
- **Açık kalanlar:** CSP'de `connect-src` hâlâ geniş (`https: wss:`, nedeni aşağıda), Supabase'te kişi başı kota/medya sınırı yok, tek yönlü takiple arkadaşlara hediye/metin gönderilebiliyor (engelleme yok).

## 2026-10-22 güvenlik incelemesi
Yapılanlar:
- **Hesap başına depolama sınırı** (`supabase/migrations/0005_storage_limits.sql`, sahibi SQL Editor'de çalıştırır): `put_sync_part` kişi başı en çok 100 MB veri (geri dönüş noktaları `h-…` sayılmaz) ve 5000 okuma metni yazar, aşınca `54000` (uygulamada "çok büyük"). `media` kovası: dosya başına 6 MB, yalnız `application/json`, kişi başı 3000 dosya ve 200 MB (`my_media_usage()`, yalnızca kendi klasörü). Sınırları değiştirmek: dosyadaki sayıları değiştirip yeniden çalıştır.
- **Hesap başına günlük çeviri tavanı** (`api/_quota.ts`, `DAILY_TRANSLATE_CHARS` = 20.000 karakter/gün, UTC): sayaç `quota/translate/<gün>/<hesap>.json` (R2/Blob), örnek başına 1 dk önbellekli, yaklaşık; depo çalışmazsa çeviri engellenmez. Aşınca 429 `daily_quota` ("Bugünkü çeviri hakkın doldu").
- `/api/sync` beklenmeyen hatada yalnızca `server error` döndürür (ayrıntı günlükte).
- `/api/access` Supabase açıkken yanlış belirteçle bir kullanıcı adının var olduğunu söylemez (`exists`).
- HSTS `includeSubDomains` aldı (`scripts/cf-headers.mjs`).

- **Kayıt koruması:** tek kullanımlık e-posta alan adlarıyla kayıt Supabase "Before User Created" kancasıyla reddedilir (`0006_disposable_emails.sql`); giriş formunda isteğe bağlı Cloudflare Turnstile (`VITE_TURNSTILE_SITE_KEY`). Kurulum sırası `docs/SUPABASE.md`.

- **İkinci tur (aynı gece):** dış sitelerden çeken uçlarda (clips, youtube, news, listen) adres başına dakikada sınır ve hesap başına günlük tavan (`api/_quota.ts` `DAILY_CALLS`; YouTube aramasının günlük kotası tek hesapla bitirilebiliyordu), yeni paylaşım hesap başına günde 30, kütüphanede yayıncı adı `cleanBy` (sitenin adına bürünülemez), oda kodları kriptografik rastgele, `Cross-Origin-Opener-Policy`, Worker'da Cloudflare'in dağıtık hız sınırı (`API_LIMITER`, adres başına 300/dk, bütün `/api/*`).

Sahibinin yapacakları: Cloudflare WAF Rate Limiting kuralı (`/api/translate`), Supabase Auth: e-posta onayı zorunlu, en az 8 karakter şifre, sızdırılmış şifre koruması, kayıtta CAPTCHA (Turnstile).

## 2026-10-21 güvenlik incelemesi
Yapılanlar:
- **Mail onayı:** bir hesap aynı anda en çok 2 onay bekleyen adres tutabilir (`MAX_PENDING_MAILS`, `api/push.ts`); yoksa adres adres yabancılara onay maili atılıp Resend kotası bitirilebiliyordu.
- **Push kaydı:** `save` yalnızca uygulamanın sayfalarından (`fromApp`) ve Supabase açıkken girişli bir cihazdan kabul edilir; saatlik görev ve arkadaş bildirimleri bu kayıtları okuduğu için sahte kayıtla doldurulamaz.
- **Arkadaş çıkarma kalıcı:** çıkaran kişi çıkarılanın kodunu `friends/blocked/<hesap>.json`a yazar; çıkarılan kişi kodla yeniden ekleyemez, @ad isteği sessizce düşer, çıkaran kişi onu kendisi yeniden eklerse engel kalkar.
- **Hata özeti:** `/api/log` istemci raporlarını yalnızca uygulamanın sayfalarından kabul eder (CSP raporları açık kalır).
- **Köken:** `diloloji-*.vercel.app` önizleme adresleri artık güvenilmez (bu adla herkes proje açabilir); bir önizleme gerekiyorsa `APP_HOSTS`a yazılır.

Açık kalanlar (kalıcı sayaç ya da şema gerekir):
- **Hesap başına kota yok:** `/api/translate` (DeepL aylık karakteri), `clips/news/listen/youtube` dış istekleri ve eşitleme depolaması (`sync` parçaları, Supabase `media`) yalnızca adres başına ve örnek belleğindeki hız freniyle sınırlı. Ücretsiz kayıt açık olduğu için bir hesap DeepL kotasını ya da depolamayı bitirebilir. Öneri: hesap başına günlük karakter tavanı (tablo ya da Blob sayacı) ve hesap başına toplam bayt sınırı (`put_sync_part` içinde `sum(bytes)`).
- **Cloudflare WAF Rate Limiting kuralı** (ücretsiz planda 1 kural): önce `/api/translate`.
- Canlı düello puanı istemcinin kendi beyanı (arkadaş oyunu; bilerek).

## Var olanlar
- **Eşitleme uçtan uca şifreli:** veri cihazda şifrelenir; sunucu (`api/sync.ts`, özel Vercel Blob) yalnızca opak bayt saklar. Hesaplı girişte erişim belirteci denetlenir; günlük geri yükleme noktaları.
- **Sunucu fonksiyonları keyfi adres almaz:** haber/dinleme kaynakları kimlikle seçilir (izin listesi), SSRF yok.
- **Gizli anahtarlar sunucuda:** `DEEPL_AUTH_KEY`, `CRON_SECRET`, Blob belirteci Vercel ortam değişkenlerinde; cron `CRON_SECRET` ile korunur.
- **Çeviri ucu:** yalnızca uygulamanın sayfaları (`fromApp`: diloloji.com, www.diloloji.com, önizlemeler, localhost), istek başına 600 karakter, yanıtlar CDN önbelleğinde.
- **XSS yüzeyi küçük:** `dangerouslySetInnerHTML` yok; React metni kaçışlar.
- **Bağımlılıklar ve sır taraması:** `npm run security` (= `npm run scan:secrets` + `npm run audit:deps`). Sır taraması izlenen dosyalarda anahtar biçimli dizgi arar (`scripts/scan-secrets.mjs`; 2026-10-13: dosyalarda ve bütün git geçmişinde bulgu yok); `npm audit --omit=dev --audit-level=high` 0 açık. CI'da `npm run typecheck:ext`ten sonra çalışır; Actions kotası dolu olduğu için şimdilik yerelde: **her PR öncesi ve ayda en az bir kez** `npm run security`.
- **Hız freni (`api/_rate.ts`):** herkese açık uçlarda adres başına dakikada sınır: `log` 60, `access` okuma 120 / başvuru 10, `share` okuma 120 / yazma 30, `push` 60, `sync` yazma 240; aşınca 429. Sayaç çalışan işlev örneğinin belleğindedir: patlama ve betiklere karşı bir fren, kesin genel kota değildir (örnekler gelip gider, birden çok örnek çalışabilir). Sert sınır için aşağıdaki Vercel Firewall kuralı hâlâ geçerli. Adres hiçbir yere yazılmaz.
- **HSTS:** Vercel ekliyordu; Cloudflare'de `_headers` ile ekleniyor (yukarıdaki güncelleme).

## Başlıklar (`vercel.json`, #—)
| Başlık | Ne yapar |
|---|---|
| `X-Frame-Options: DENY` | Uygulama başka bir sitede çerçeve içine alınamaz (tıklatma tuzağı). |
| `X-Content-Type-Options: nosniff` | Tarayıcı dosya türünü tahmin etmez. |
| `Referrer-Policy: strict-origin-when-cross-origin` | Dış sitelere yalnızca alan adı gider, sayfa yolu gitmez. |
| `Permissions-Policy` | Mikrofon yalnızca kendi sitemizde; kamera, konum, ödeme kapalı. |
| `Content-Security-Policy` | **Zorunlu (2026-10-20'den beri engeller).** Betikler yalnızca kendi sitemizden ve `index.html`'deki satır içi betiklerin hash'iyle (`unsafe-inline`/`unsafe-eval` yok); `object-src 'none'`; resim/ses/bağlantı `https:` (+ düello odaları için `wss:`); çerçeve yalnızca YouTube. İhlaller yine `/api/log?csp=1` → Workers Logs'ta `[csp-report]`. |

### CSP nasıl korunur
1. **Hash'ler derlemede otomatik:** `npm run build:cf` → `scripts/cf-headers.mjs`, `dist/index.html`'deki satır içi betiklerin SHA-256'sını (`scripts/cspHashes.mjs`) `dist/_headers`'a yazar. `index.html`'deki bir betik değişirse `vercel.json`'daki hash'leri de güncelle: `src/csp.test.ts` farkı yakalar (birim testi düşer), derleme de uyarı basar.
2. **`connect-src` neden geniş:** çevrimdışı ses indirme (`audioCache`), seçilen resimler (`imageSearch`), `PitchCompare` ve sözlük paketleri önceden bilinemeyen adreslere bağlanır; ayrıca YZ (`api.anthropic.com`) ve Tatoeba doğrudan tarayıcıdan çağrılır. Daraltmak bu özellikleri bozar.
3. **Yeni bir dış kaynak** (betik, çerçeve) eklenirse politikaya yaz; yoksa zorunlu modda engellenir. Önce yerelde `npx vite preview` ile konsolda "Refused to …" iletisine bak.
4. **Geri alma:** bir şey kırılırsa `vercel.json`'da başlığın adını `Content-Security-Policy-Report-Only` yap ve yeniden yayınla.

## Kullanıcının yapacakları
1. **`SYNC_ALLOWED`:** Vercel → proje → Settings → Environment Variables → `SYNC_ALLOWED` = kullanıcı adın (ya da eşitleme kodunun 64 haneli kimliği), Production; sonra yeniden yayınla. Yoksa herkes Blob deposuna yazabilir (verini okuyamaz ama depoyu doldurabilir).
2. **Hız sınırı:** Vercel → proje → Firewall → Custom Rules → "Rate limit": `/api/translate` ve `/api/log` için IP başına dakikada ~30 istek, aşınca 429. (DeepL kotasının betikle tüketilmesine ve günlük çöpüne karşı.)
3. **AI sağlayıcısında aylık harcama sınırı:** AI anahtarın tarayıcıda saklanır ve doğrudan sağlayıcıya gider; sağlayıcının panelinden aylık sınır koy.
4. **Yedek dosyaları** (`diloloji-yedek-*.json`) kişisel veri içerir; `.gitignore`'da, yine de depoya koyma, işin bitince sil.
5. **Adresler ve depolama:** Ana adres `diloloji.com` (ve `www.diloloji.com`). Her adres tarayıcıda ayrı depo kullanır: adres değişirse yeni adres boş başlar; eşitleme (hesapla giriş) yoksa eski adreste yedek alıp yenisine yükle.

## Anahtar yenileme planı (2026-10-13)
Hangi anahtar nerede, ne zaman ve nasıl yenilenir. **Hepsi için ortak kural:** yeni değer Vercel'de tanımlanır → production yeniden yayınlanır (Deployments → son dağıtım → ⋯ → Redeploy) → çalıştığı görülür → eskisi iptal edilir. Anahtarı koda, sohbete ya da ekran görüntüsüne yazma.

| Anahtar | Ne zaman | Nasıl |
|---|---|---|
| `BLOB_READ_WRITE_TOKEN` | 2026-10-13'te yenilendi (Vercel Blob → Rotate Credentials, eski jeton 2 saat daha geçerli, hemen Redeploy). Yılda bir ya da şüphede. | Env Variables'ta `BLOB_READ_WRITE_TOKEN` uyarısına tıkla → "Rotate Blob Credentials" → depo adını yaz → Rotate → 2 saat içinde Redeploy. Veri silinmez. Değişkeni "Sensitive" işaretle. |
| `ADMIN_TOKEN` | 6 ayda bir; yönetici anahtarını bir yere yapıştırdıysan hemen. | **Sıfır kesintili:** `ADMIN_TOKEN` birden çok anahtar taşıyabilir (boşluk ya da virgülle). 1) Yeni uzun rastgele anahtar üret (`openssl rand -hex 32`). 2) Değeri `eski yeni` yap, Redeploy. 3) Ayarlar → Hesap → Yönetici'ye yeni anahtarı gir, listenin açıldığını gör. 4) Değeri yalnızca `yeni` yap, Redeploy. |
| `DEEPL_AUTH_KEY`, `RESEND_API_KEY`, `YOUTUBE_API_KEY`, `VAPID_PRIVATE_KEY`, `CRON_SECRET` | Yılda bir ya da sızıntıdan şüphede. | Sağlayıcının panelinde yeni anahtar üret → Vercel'de değiştir → Redeploy → eskisini sağlayıcıda sil. `VAPID_PRIVATE_KEY` değişirse mevcut bildirim abonelikleri geçersiz olur (herkes bildirimi yeniden açar): ancak şart olunca. |
| AI anahtarı (kullanıcı) | Kullanıcıya ait; tarayıcıda saklanır. | Sağlayıcı panelinden yenile, Ayarlar → YZ'ye yapıştır; aylık harcama sınırını koy. |

**Sızıntıdan şüphe edersen sıra:** önce sağlayıcıda anahtarı iptal et/yenile, sonra Vercel'de değiştir ve Redeploy yap; geçmişte iz aramak için `npm run scan:secrets` ve `git log --all -G'<anahtarın başı>'`.

## `SYNC_ALLOWED` adını başkası önce aldıysa
Bir kullanıcı adı `SYNC_ALLOWED`'a eklenince o adın hesabı **ilk talep edene** gider (şifreyi talep eden belirler). Sahibi almadan başkası ilk girişte alırsa sahibin şifresi tutmaz ve hesap (onaylı sayıldığı için) başkasının olur.
- **Önlem:** adı listeye eklediğin dakikada, uygulamada o adla (kendi şifrenle) giriş yap; hesabı sen almış olursun.
- **Başkası aldıysa:** Ayarlar → Hesap → Yönetici → **"Bir adı serbest bırak"** (kullanıcı adını yaz). Sunucu o adın talebini ve altındaki bütün eşitleme dosyalarını siler; hemen ardından kendi şifrenle giriş yap. *Kendi çalışan hesabında kullanma: eşitlenmiş verin sunucudan silinir (cihazındaki veri durur, bir sonraki eşitleme yeniden yükler).*
- Eşitleme verisi şifreli olduğundan başkası içeriği okuyamaz; kötü ihtimal adı kullandırmamak ve depoyu doldurmaktır.

## Gerçek hizmetlere karşı kontrol
Birim testleri Blob, Resend ve Safari'yi taklit eder; gerçeği ancak sen sınayabilirsin.
1. **Blob + Resend durumu (otomatik):** `node scripts/smoke-live.mjs` (açık kontroller: `/api/access`, `/api/push?mail=status` yani Resend hazır mı, `/api/log`). Eşitleme denetimi için **ayrı bir deneme hesabı** aç (`SMOKE_USER`, `SMOKE_PASS`; `SYNC_ALLOWED`'a ekle ya da Yönetici'den onayla): `SMOKE_USER=... SMOKE_PASS=... ADMIN_TOKEN=... node scripts/smoke-live.mjs`. Bu, yeni dosyayı yalnızca-yeni yazma, var olan dosyaya ikinci yazma (412), eski ETag (412) ve doğru ETag ile yazmayı gerçek Blob'a karşı dener; `ADMIN_TOKEN` verilirse sonunda deneme hesabının dosyalarını siler. (Bu betik 2026-10-13'te yazıldı ve yalnızca söz dizimi denendi: ortamımda ağ yok.)
2. **Resend (elle, bir kez):** Vercel'de `RESEND_FROM` = `Diloloji <hatirlatma@alanadin>` (Resend'de doğrulanmış alan adıyla) tanımlı mı bak → Redeploy → Ayarlar → Hatırlatıcı → "E-posta ile hatırlat" → kendi adresin → gelen kutundaki onay bağlantısına tıkla → "açıldı" sayfasını gör → hatırlatma gelmesini bekle (ya da `api/cron-reminder` günlüğüne bak) → postadaki "kapat" bağlantısıyla kapat. Spam klasörüne de bak.
3. **Safari sesi (elle):** iPhone ve Mac Safari'de, Sistem Ayarları → Klavye → Dikte açık ve dil eklenmişken: bir "söyle" sorusunda mikrofona dokun, söyle, bir daha dokunup bitir; cevap alana düşmeli. 12 sn susarsan nedenini söylemeli. Çalışmazsa Vercel günlüğünde `[client-error]` ara.
