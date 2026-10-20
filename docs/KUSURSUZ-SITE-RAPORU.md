# Diloloji: kusursuz site raporu (19 Ekim 2026)

Hazırlayan: Claude. Kapsam: genel test turu + dört paralel kod denetimi (güvenlik/sunucu, hesap/eşitleme, kullanılabilirlik/içerik, kalite/operasyon).
Yöntem: Kod okunarak çıkarılan bulguların büyük kısmı **canlı sistemde denenmedi**. Her bulgunun yanında nasıl bilindiği yazıyor:
- **[doğrulandı]**: bu oturumda kodu ya da çıktıyı kendim okuyup teyit ettim.
- **[ajan]**: denetim ajanı kodu okuyarak buldu, ayrıca elle teyit edilmedi.
- **[doğrulanmadı]**: ajanın kendisi de emin değil ya da canlı ortam gerekiyor.

---

## 0. Güncelleme (19 Ekim, öğleden sonra)

P0 maddeleri düzeltildi ve main'e girdi (PR #504): **B1, B2, B3, A1, UX1, UX2, UX4**. **Canlıya henüz çıkmadı**: ajan ortamından dağıtım denendi ama statik dosya yüklemesi 401 verdi (AGENTS.md "Ajanla Cloudflare dağıtımı"); Mac'te `git pull && npm run deploy:cf` gerekiyor. P0'dan sana kalan: **UX3** (gerçek Gmail ile kayıt, onay maili, Resend SMTP) ve **F1** (uptime izleme + Cloudflare uyarıları). Cloudflare'in "DMARC Record Error" uyarısı (bölüm 5, F13) ve `/.well-known/security.txt` (eklendi) aşağıda. Antigravity için görev listesi: `docs/ANTIGRAVITY-GOREVLER.md` 16. tur.

**P1 turu (PR sırada):** A2, A4, A5, A7, B6, B7, B8 ve B9 (HSTS + nosniff) düzeltildi; UX10'un metin kısmı (giriş altbaşlığı, "hesabın hazır", Supabase jargonu) düzeltildi. Hepsi AGENTS.md "P1 düzeltme turu" notunda. Ayrıca A3 (Ayarlar → Hesap → "Ortak cihaz: Çıkış yap ve sil": önce eşitler, eşitlenemezse silmez), A10 (davet bağlantıları `?duel=`/`?set=` giriş sonrası ana ekrana ezilmiyor) ve UX6 (hesap silme metni) düzeltildi. Kalan P1 sunucu maddeleri: B4 (Cloudflare hız sınırı: panel/`wrangler` ayarı gerektirir), B5 (anonim topluluk yayını: onay sistemi kararına bağlı), B10 (CSP), A3 (çıkışta cihaz verisi, K3 kararı).

## 1. Tek bakışta durum

**İyi haber:** Site canlı, giriş çalışıyor, Google marka doğrulaması geçti, e-posta yönlendirme çalışıyor, tanıtım/gizlilik/koşullar sayfaları açılıyor, kodda gizli anahtar sızıntısı yok, bağımlılıklarda bilinen açık yok.

**Kötü haber (yarın 1–2 kişi deneyecekse bilmen gerekenler):**
1. **Hesap zorunluluğu sadece ekranda.** Sunucu uçları giriş yapmamış birine de açık (aşağıda B1). Kötü niyetli biri DeepL, e-posta ve depolama kotalarını tüketebilir. 1–2 testçi için risk düşük, ama herkese açmadan önce kapatılmalı.
2. **Kayıt ekranı yanlış söz veriyor:** "Hesaplar site sahibinin onayından geçer" yazıyor, oysa onay sistemi kapalı, herkes zaten onaylı. Testçi bekleyeceğini sanır (UX1).
3. **Hata mesajları ham İngilizce** çıkabilir (örn. "For security purposes, you can only request this after 55 seconds"). Bağlantı düğmesine iki kez basan testçi bunu görür (UX2).
4. **Uygulamada destek/yardım yolu yok.** `destek@diloloji.com` sadece statik sayfalarda geçiyor; testçi takılınca nereye yazacağını bulamaz (UX5).
5. **iPhone'da ana ekrana eklenmiş uygulama** e-posta bağlantısıyla giriş yapamayabilir (bağlantı Safari'de açılır, depolama ayrı). Google ya da şifreyle girişi öner (UX4).
6. **Hesap silme bazı durumlarda eksik** ve "silindi" diyor (A1, A2). KVKK açısından önemli.

---

## 2. Test sonuçları (bu oturumda koşulan)

| Test | Sonuç |
|---|---|
| `npm run typecheck` (uygulama + api + scriptler + worker) | Geçti |
| `npx oxlint src api e2e` | Temiz |
| Gizli anahtar taraması (1868 dosya) | Temiz [doğrulandı] |
| `npm audit` (üretim bağımlılıkları) | 0 açık [ajan] |
| Worker derlemesi (`wrangler deploy --dry-run`) | Başarılı, 173 KiB / 45 KiB gzip [ajan] |
| Birim testleri (2.423 test) | İlk koşuda 9 düştü → neden bulundu ve düzeltildi; şimdi **2.422 geçti, 0 düştü** |
| E2E (201 test: telefon + masaüstü + erişilebilirlik) | 199 geçti; düşen 2 test tek başına geçti (bölüm 6) |
| Canlı sayfalar (`/hakkinda`, `/gizlilik`, `/kosullar`, robots.txt) | 200, doğru içerik [doğrulandı] |
| Test maili `destek@diloloji.com` → Gmail | Ulaştı (ekran görüntüsüyle) |
| DNS: MX, tek SPF, DKIM, DMARC, Resend kayıtları | Doğru görünüyor (ekran görüntüsüyle) |

**9 başarısız birim testin nedeni (kod hatası değil, test ortamı):** `src/data/supabase.ts` giriş ayarlarını derleme sırasında okuyor. Geliştirici makinesinde (ve bu ortamda) `.env.local`/ortam değişkeni tanımlıyken zorunlu giriş kapısı testlerde de açılıyor ve eski kullanıcı adı akışını bekleyen testler kırılıyor. Dağıtım için `.env.local` zorunlu olduğundan senin Mac'inde de testler kırmızı çıkardı. **Düzeltildi:** `vite.config.ts` içine `test.env` eklendi (değişkenleri testte boşaltıyor). CI'da sorun yoktu çünkü orada değişken tanımlı değil.

---

## 3. Bu oturumda yapılan değişiklikler

- Google marka doğrulaması: logo, Branding formu, Search Console alan adı doğrulaması, herkese açık `/hakkinda` sayfası (PR #500), **doğrulama geçti ve yayınlandı**.
- Test ortamı düzeltmesi (`vite.config.ts`, yukarıda).
- Çıkışta sadece bu cihazın oturumunu kapat (`src/data/supabase.ts`): ekranda "Bu cihazdaki oturumu kapatır" yazıyordu ama kod tüm cihazları atıyordu [ajan bulgusu, kütüphane kodundan doğrulandı].

- `public/hakkinda.html` içindeki anlamsız cümle düzeltildi ("zaman zaman çalışır" → "zamanlara göre çalışır"; bu hatayı ben yazmıştım).

Bunların dışında hiçbir şeyi kendi başıma değiştirmedim; geri kalanı senin kararına bırakıyorum (aşağıda).

---

## 4. Kararlar: senin vermen gerekenler

| # | Karar | Seçenekler | Önerim |
|---|---|---|---|
| K1 | **Hesap şartı sunucuda da uygulansın mı?** Şu an `ADMIN_TOKEN` girilmediği için sunucu "herkes onaylı" sayıyor. | (a) Sadece geçerli hesap iste, onay yok (b) `ADMIN_TOKEN` gir, her yeni hesabı sen onayla | **(a)**: kullanıcıyı bekletmez, kotayı korur. (b) ancak kapalı beta istiyorsan. |
| K2 | Kayıt formu metni | Onay yoksa metni/not alanını gizle | **Gizle** (testçi yanılmasın). |
| K3 | Çıkışta cihaz verisi silinsin mi? | Her çıkışta sor / hiç silme | **Sor** ("Bu cihazdaki verileri de sil"), ortak cihaz için. |
| K4 | `ADMIN_TOKEN` kapalıyken `profiles.approved` her girişte true yazılıyor; Supabase'te sen birini reddetsen geri açılır | Onay sistemini ya tamamen kapat ya Supabase'i tek kaynak yap | K1 ile birlikte karar ver. |
| K5 | Free plan yetmezse Workers Paid (5 $/ay) | Şimdi/sonra | Gerçek kullanıcı gelince; CPU sınırı (10 ms) haber/altyazı uçlarında aşılabilir. |
| K6 | Resend SMTP'yi Supabase e-postasına bağla | Yap / yapma | **Yap** (UX3): Supabase'in kendi göndericisi saatte birkaç mail ile sınırlı. |

---

## 5. Bulgular

Öncelik: **P0** = yarın testçi denemeden önce, **P1** = bu hafta, **P2** = sonra.

### A. Hesap, eşitleme, veri güvenliği

| # | Öncelik | Bulgu | Nerede | Düzeltme |
|---|---|---|---|---|
| A1 | **P0** | Hesap silme, Supabase oturumu bulunamazsa sunucudaki Supabase kullanıcısını ve eşitleme verisini silmeden "silindi" diyor [ajan] | `src/ui/AccountManage.tsx:139-146`, `api/access.ts:139-150` | Supabase açıkken oturum yoksa silmeyi reddet; sunucuda başlıksız silmeyi kabul etme. |
| A2 | P1 | Hesap silinince **push aboneliği silinmiyor**: cihaz adresi, plan/hafta/kelime metinleri sunucuda kalıyor; cron o cihaza bildirim göndermeye devam edebilir [ajan] | `api/_deleteAccount.ts:19-30` | `byOwner(id)` kayıtlarını da sil; çıkışta `/api/push` kaydını kaldır. |
| A3 | P1 | Çıkışta cihazdaki veri (kelimeler, YZ/ses anahtarları) duruyor; aynı cihaza başka biri girerse **birinci kişinin verisi ikincinin hesabına birleşir** ve YZ anahtarını kullanır [ajan] | `src/ui/AccountSettings.tsx:63-75` | K3: çıkışta "bu cihazdaki verileri de sil" seçeneği. |
| A4 | P1 | Yeni cihazda ilk eşitleme bitmeden Onboarding açılıyor; kullanıcı onu hızlı bitirirse **yeni ayar damgaları uzaktaki ayarları eziyor** (dil, günlük hedef, profil adı) [ajan] | `src/ui/signInFlow.ts:19-23`, `src/ui/useSignedIn.ts:18-21` | Hesap olayını ilk eşitleme bitince yayınla ya da kapıda "eşitleniyor" bayrağı tut. |
| A5 | P1 | Oturum alınamazsa (geçici hata) eşitleme **eski Blob deposuna düşüyor**; Supabase'e geçmiş hesapta veri çatallanabilir [ajan] | `src/ui/syncTarget.ts:19` | Oturum yoksa geçici hata ver, eski depoya yazma. |
| A6 | P1 | Yeni hesaplar da önce eski depoya (R2) yazıp sonra Supabase'e taşınıyor: gereksiz çift yazma, R2 hatasında Supabase'e hiç geçilemiyor [ajan] | `src/ui/syncData.ts:9-13` | Yeni (Supabase çağı) hesaplarda Blob adımını atla. |
| A7 | P1 | Giriş tamamlama hata verirse ekranda **çıkış düğmesi yok**: kullanıcı sayfayı yenilemek zorunda, yenileyince giriş formu açılıyor [ajan] | `src/ui/SupabaseAuth.tsx:247-257, 66-89` | "Tekrar dene" ve "Giriş ekranına dön" düğmeleri ekle. |
| A8 | P2 | Kapı tarayıcı depolamasına sıkı bağlı: depolama kapalı/kısıtlı tarayıcıda giriş yapılsa bile kapı açılmayabilir (giriş döngüsü) [doğrulanmadı] | `src/data/supabase.ts:116-123` | Kapıyı sadece `syncAccount` kaydına bağla, oturum denetimini arka planda yap. |
| A9 | P2 | Başka sekmede çıkış/giriş bu sekmede görünmüyor; yanıltıcı "Giriş sistemi yenilendi" bildirimi çıkabiliyor [ajan] | `src/ui/useSignedIn.ts:25` | `storage` olayını dinle. |
| A10 | P2 | `?duel=` ve `?set=` davet bağlantıları, giriş yapmamış yeni kullanıcıda **kayboluyor** (giriş bitince ana ekrana atılıyor) [ajan] | `src/App.tsx:446` | Giriş sonrası bekleyen bağlantıyı koru. |
| A11 | P2 | İki cihaz aynı anda ilk kez girerse ikincisi yanıltıcı "başka hesap bağlı" mesajı görür [ajan] | `src/ui/signInFlow.ts:60-66` | Mesajı "tekrar dene" olarak düzelt. |
| A12 | P2 | Silme sonrası kalanlar: topluluk kütüphanesindeki yayınlar kullanıcı adıyla duruyor; başkalarının gelen kutusundaki hediye/metinler; öksüz takip kayıtları; medya silme hatası yutuluyor [ajan] | `api/_deleteAccount.ts`, `api/access.ts:139-156` | Silme akışına ekle ve gizlilik sayfasında açıkça söyle. |
| A13 | P2 | `\u0000` içeren okuma metni (EPUB/PDF) Postgres jsonb'de reddedilir; o metin silinene kadar eşitleme kalıcı hata verebilir [doğrulanmadı] | `src/data/supabaseStore.ts:55-57` | İçe aktarmada temizle. |
| A14 | P2 | Yeni alanlar `BACKUP_VERSION` artırılmadan eklendi (sınav seviyeleri, liste kapağı, cümle notu): eski sürümdeki bir sekme bu alanları düşürebilir [doğrulanmadı] | AGENTS.md "sürüm artmadı" notları | Eski sekme/PWA yenilenince sorun biter; bilinçli ödün. |

### B. Güvenlik ve sunucu

| # | Öncelik | Bulgu | Nerede | Düzeltme |
|---|---|---|---|---|
| B1 | **P0** | **Sunucu hesap şartı koymuyor.** `ADMIN_TOKEN` yokken `requireApproved` anonim isteği geçiriyor [doğrulandı: `api/_account.ts:22,115`]. `Origin: https://diloloji.com` başlığı ekleyen herkes çeviri (DeepL, ayda 500 bin karakter), YouTube, haber ve dinleme uçlarını girişsiz çağırabilir. Bu uçlarda hız sınırı yok [ajan] | `api/translate.ts:34-35`, `news.ts`, `listen.ts`, `youtube.ts`, `clips.ts` | K1: onay kapalıyken de **geçerli hesap iste**. |
| B2 | **P0** | **Anonim hesap açılabiliyor ve eşitleme deposuna yazılabiliyor**: belirteçsiz/yeni belirteçli istek rastgele bir kimliği talep ediyor; 4,4 MB'lık sınırsız dosya yazılabilir (R2 dolabilir) [ajan] | `api/sync.ts:69,81` | Supabase açıkken eski Blob eşitleme yolunu kapat (410) ya da kimliği `sync_keys`'te doğrula. |
| B3 | **P0** | **E-posta bombası**: adres ekle, sil, tekrar ekle döngüsü sınırsız onay maili gönderir; kurbana spam, Resend günlük kotası (100) ve alan adı itibarı gider [ajan] | `api/push.ts:149-192` | Mail ucunda geçerli hesap iste; silinen adrese 24 saat yeni onay maili gönderme; hesap başına günlük sınır. |
| B4 | P1 | **Hız sınırı Worker'da fiilen yok**: sayaç modül belleğinde, Cloudflare örnekleri çok ve kısa ömürlü [ajan] | `api/_rate.ts` | Cloudflare Rate Limiting (WAF kuralı ya da `ratelimits` binding). Ücretsiz planda 1 kural var: en pahalı uçlara (`/api/translate`, `/api/push`, `/api/sync`) uygula. |
| B5 | P1 | Topluluk kütüphanesine **anonim yayın**: 300 kayıtlık liste spamla doldurulabilir; sahibi boş kalan setler silinemez [ajan] | `api/share.ts:299, 282-284` | Yayın için doğrulanmış hesap şartı. |
| B6 | P1 | Mail onayı **GET ile** yapılıyor: kurumsal link tarayıcıları adresi kurbanın yerine onaylar [ajan] | `api/push.ts:140-142` | GET'te düğmeli ara sayfa, onayı POST ile yap. |
| B7 | P1 | Cron: hata olursa (401, 500, "Too many subrequests") Cloudflare "başarılı" sayıyor; hatırlatmalar **sessizce durabilir**. Aynı saatte ~20–25 cihazdan fazlasında Free plan alt istek sınırı (50) aşılabilir [ajan / sınır doğrulanmadı] | `worker/index.ts:56-62`, `api/cron-reminder.ts:51-107` | Yanıt `ok` değilse hata fırlat + `console.error`; cron'u parçala ya da Workers Paid; Cloudflare Notifications ile uyarı. |
| B8 | P1 | Supabase onayı geçici bir okuma hatasında düşebilir: hata `'none'` sayılıp `profiles.approved=false` yazılıyor [ajan] | `api/access.ts:100` | Hata durumunda hiç yazma. |
| B9 | P1 | HSTS başlığı yok [doğrulanmadı: Cloudflare panel ayarı olabilir]; Worker'dan çıkan `/api/*` yanıtlarına `_headers` uygulanmaz (`x-content-type-options: nosniff` yok) [ajan] | `vercel.json`, `scripts/cf-headers.mjs` | SSL/TLS → Edge Certificates → HSTS aç; API yanıtlarına başlığı Worker'da ekle. |
| B10 | P1 | **CSP hâlâ sadece rapor modunda**; `connect-src https:` her yere veri sızdırmaya izin veriyor. Kullanıcının YZ/ses anahtarları IndexedDB'de, yani bir XSS çalar. İyi haber: `innerHTML` yok, yazdırma HTML'leri kaçışlı [ajan] | `vercel.json:27` | `script-src`, `object-src`, `base-uri`, `form-action`'ı zorunlu moda al; `connect-src`'yi açık listeye çevir. |
| B11 | P2 | Tek yönlü takiple başkasına hediye/metin/push gönderilebiliyor, alıcı engelleyemiyor [ajan] | `api/_friends.ts:361` | Karşılıklı takip ya da "engelle". |
| B12 | P2 | Supabase'te kişi başı kota yok (parça sayısı, medya boyutu/türü): tek hesap 500 MB'ı doldurabilir [ajan] | `0002_sync_data.sql:44, 78-83` | Kişi başı toplam sınır; bucket boyut/tür sınırı. |
| B13 | P2 | `GUVENLIK.md` hâlâ "uçtan uca şifreli" diyor; Supabase modunda veri açık jsonb, `sync_keys` düz metin [ajan] | `docs/GUVENLIK.md:6` | Belgeyi gerçeğe uydur. |
| B14 | P2 | `listen.ts` yönlendirmeden sonra adres denetlemiyor; `_captions.ts` altyazı adresini olduğu gibi çekiyor [ajan] | `api/listen.ts:37,47`, `_captions.ts:48` | Ana makine denetimi ekle. |
| B15 | P2 | 500 yanıtında hata adı/mesajı istemciye dönüyor [ajan] | `api/sync.ts:48` | Genel mesaj döndür. |
| B16 | P2 | Supabase `implicit` akış: belirteç URL parçasında; PKCE daha iyi [ajan] | `src/data/supabase.ts` | Ekran/akış değişikliği gerektirir, ileriye bırak. |
| B17 | P2 | Arkadaş kartının varsayılan adı e-posta ön ekinden gelebilir (gizlilik) [ajan] | `api/_friends.ts:81` | Varsayılanı rastgele "Öğrenci 1234" yap. |

### C. Kullanıcı deneyimi, metinler, içerik

| # | Öncelik | Bulgu | Nerede | Düzeltme |
|---|---|---|---|---|
| UX1 | **P0** | Kayıt formu: "Hesaplar site sahibinin onayından geçer; adın, e-postan ve bu not ona görünür" ve "Kendini kısaca tanıt" alanı her zaman görünüyor, oysa onay kapalı [ajan] | `src/ui/SupabaseAuth.tsx:~215, ~276` | K2: `approvalEnabled()` false ise metni ve not alanını gizle. Gizlilik ve koşullar sayfalarındaki "Onay" maddesi de aynı yanlış izlenimi veriyor. |
| UX2 | **P0** | Bilinmeyen auth hataları ham İngilizce gösteriliyor ("For security purposes…", "Error sending confirmation email") [ajan] | `src/data/supabase.ts` `authErrorText` | Yaygın mesajlara Türkçe karşılık, bilinmeyen için "Bir sorun oldu; biraz sonra tekrar dene, sürerse destek@diloloji.com'a yaz". |
| UX3 | **P0** | Onay maili: Supabase'in kendi göndericisi saatte birkaç mail ile sınırlı. **Gerçek bir Gmail ile kayıt olup onay mailinin gelip gelmediğini, spama düşüp düşmediğini sen bugün dene.** SMTP (Resend) bağlı değilse testçiler mail alamayabilir [ajan; kod dışı kontrol] | Supabase paneli → Authentication → SMTP | K6: Resend SMTP bağla. |
| UX4 | **P0** | iPhone'da ana ekrana eklenmiş uygulama: e-posta bağlantısı Safari'de açılır, depolama ayrı, giriş uygulamaya geçmez [ajan] | `src/ui/SupabaseAuth.tsx` 'sent' adımı | Notu ekle: "Ana ekrana eklediysen Google ya da şifreyle gir." (Daha iyisi 6 haneli kod girişi.) |
| UX5 | P1 | Uygulamada **yardım/destek kanalı yok**: `destek@diloloji.com` yalnızca statik sayfalarda; hata ekranları ham `error.message` gösteriyor ve iletişim vermiyor; sürüm bilgisi yok (`package.json` 0.0.0) [ajan] | `src/ui/SettingsScreen.tsx:30-37`, `RootBoundary`, `ScreenBoundary` | Ayarlar'a "Yardım" grubu: mailto (sürüm/dil/tarayıcı otomatik), Gizlilik, Koşullar, derleme kimliği, 6–8 maddelik SSS. Hata ekranlarına aynı bağlantı. |
| UX6 | P1 | Silme/çıkış metinleri "hesapsız devam edebilirsin" diyor, oysa hesap yoksa yalnızca giriş sayfası açılıyor (veri girişin arkasında, yedek de) [ajan] | `src/ui/AccountManage.tsx`, gizlilik sayfası | Metni gerçeğe uydur ("tekrar giriş yapınca gelir"). |
| UX7 | P1 | `index.html`'de sadece `<title>`: **açıklama/og:title/og:image yok.** İki testçiye bağlantı atıldığında WhatsApp önizlemesi çıplak [ajan] | `index.html` | og/twitter etiketleri + `og:image` (`pwa-512.png`). `noindex` bilerek duruyor, dokunma. |
| UX8 | P1 | `public/hakkinda.html`: favicon, canonical, theme-color yok (anlamsız cümle bu turda düzeltildi) [ajan] | `public/hakkinda.html` | Düzelt + favicon/og ekle. |
| UX9 | P1 | Sözlük paketleri ilk kullanımda iner: EN 10 MB, FR 5,8 MB, ES 4,9 MB. Mobil veride yeni kullanıcı bunu fark eder; "indiriliyor" göstergesi çoğu yerde yok, internetsiz açılırsa neden anlaşılmaz [ajan] | `vite.config.ts` runtimeCaching | Kelime ekle/Sözlük'te durum satırı; Cloudflare'in sıkıştırma uyguladığını bir kez ölç. |
| UX10 | P2 | Metin ve akış: giriş altbaşlığı "İlerlemen bu cihazdakiyle birleşir" yeni kullanıcıya anlamsız; "Hesabın hazır; ilerlemen kaydedildi" garip; alt bilgi "Girişini Supabase yönetir" teknik jargon; kayıtta "Adın" soruluyor, Onboarding'de **tekrar** soruluyor [ajan] | `src/ui/SupabaseAuth.tsx`, Onboarding | Metinleri sadeleştir, adı ön doldur. |
| UX11 | P2 | E-posta değiştirme yok; şifre göster/gizle yok; e-posta alanı `autoFocus` telefonda klavyeyi hemen açıp Google düğmesini örtüyor [ajan] | `AccountManage.tsx`, `SupabaseAuth.tsx` | Ekle/kaldır. |
| UX12 | P2 | İçerik dengesi: örnek kelime EN 30, FR 29, **ES 15**. İngilizce için kolay resimli hikâye, sesli kitap, fiil laboratuvarı, çekimler kartı yok; okuma ekranı seyrek (haber/VOA/BBC/klasikler var). Rehber dengeli (FR 65, ES 67, EN 70 ders) [ajan] | `src/data/seed/*.ts` | Testçilere söyle; ES örnek kelimeyi 30'a çıkar. |
| UX13 | P2 | PWA: manifest `orientation: portrait` tablet/masaüstü kurulumunda yatayı kilitler; `screenshots`, `categories` yok; kurulum ipucu telefonda sayfa sonunda kalıyor [ajan] | `vite.config.ts`, `Screens.tsx:696` | Yönü kaldır; ilk oturum sonrası göster. |
| UX14 | P2 | Onay sistemi kapalıyken bile bir RPC çağrısı (`put_sync_part`) 502 verirse eşitleme "Hesabın site sahibinin onayını bekliyor" der, ipucu yok [ajan] | `src/ui/syncRunner.ts` | Daha net "bağlantıyı yeniden dene" mesajı. |

### D. Yasal ve KVKK

| # | Öncelik | Bulgu | Düzeltme |
|---|---|---|---|
| L1 | P1 | **Üçüncü taraf listesi eksik** ve "Reklam ve izleme yoktur" iddiası var. Tarayıcıdan doğrudan giden istekler (IP + aranan kelime): Tatoeba (her kelimede), Wiktionary/Wikipedia/Commons, Open-Meteo (profildeki şehir), YouTube, archive.org, Pixabay/Openverse (anahtar girilirse), Google TTS (kendi anahtarı) [ajan] | Gizlilik sayfasına ekle. |
| L2 | P1 | **KVKK unsurları yok:** veri sorumlusu kimliği, yurt dışına aktarım (Supabase, Cloudflare, Resend, DeepL), saklama süresi, hukuki sebep, başvuru yolu [ajan] | Sayfayı bir hukukçuya ya da hazır KVKK şablonuna göre tamamla. Bu benim kapsamım dışında bir hukuki karar. |
| L3 | P1 | Yaş sınırı hiçbir yerde yok [ajan] | Koşullara "13 yaş altı velisiyle" gibi bir madde. |
| L4 | P2 | "Onay" maddesi (gizlilik ve koşullar) işlemeyen bir sistemi anlatıyor [ajan] | Onay sistemi kapalıysa maddeyi kaldır. |
| L5 | P2 | "Son güncelleme: 19 Ekim 2026" | Sorun değil: senin saatinde bugün 19 Ekim; denetim ajanı sunucu saatine (18 Ekim) bakıp "gelecek tarihli" sandı. |

### E. Erişilebilirlik

| # | Öncelik | Bulgu | Düzeltme |
|---|---|---|---|
| E1 | P1 | `.link` düğmeleri (giriş sayfasındaki "Şifremi unuttum", "Şifresiz giriş", "Gizle") ~18 px yüksekliğinde; WCAG 2.2 AA hedef boyutu (24 px) riski [ajan] | `src/index.css:397` minimum boyut ver. |
| E2 | P1 | **Gerçek giriş sayfası hiç axe ile taranmıyor** (E2E derlemesi Supabase'siz, eski kullanıcı adı akışını görüyor). Gizlilik/koşullar/hakkında sayfaları da yok [ajan] | Supabase'li ikinci bir test projesi ya da vitest+axe. |
| E3 | P2 | Axe taramalarında `color-contrast` kuralı kapalı (`e2e/a11y.e2e.ts:12`); Onboarding ve giriş koyu temada kontrast denetimi yok [ajan] | Kontrol testini genişlet. |

### F. Performans, operasyon, test altyapısı

| # | Öncelik | Bulgu | Düzeltme |
|---|---|---|---|
| F1 | **P0** | **İzleme yok.** Uptime izleme, Cloudflare Notifications (hata oranı, CPU, kota), hata günlüğü izleme yolu belgelenmemiş. İstemci hataları artık Cloudflare Workers Logs'a düşüyor (`[client-error]`), ama AGENTS.md hâlâ "Vercel günlükleri" diyor [ajan] | UptimeRobot/Better Stack ile `/` ve `/api/...` izle; Cloudflare → Notifications'ta Worker hata oranı + R2 kullanımı uyarısı; `docs/CLOUDFLARE.md`'ye "Günlükler" bölümü. |
| F2 | P1 | **Yedekleme yok.** R2 sürümleme yok; Supabase ücretsiz planda otomatik yedek yok; `sync_keys` (şifreleme anahtarları) kaybı eski kullanıcıları kilitler [ajan] | Haftalık `pg_dump` + R2 kopyası (planlanmış betik). |
| F3 | P1 | **Otomatik dağıtım ve CI yok:** `deploy:cf` sahibinin Mac'inde; Actions dakikası dolu, hiçbir CI çalışmıyor [ajan] | Workers Builds (Actions dakikası harcamaz) kur; Cloudflare token'ı ortama ekle ki dağıtımı ben yapayım. |
| F4 | P1 | `check-deploy-env.mjs` yetersiz: anahtar biçimini/URL'yi denetlemiyor; **build sonrası "gömülü Supabase URL" denetimi yok** (2026-10-19'daki kazanın tam karşılığı); dosya öncelik sırası Vite'ınkiyle uyumsuz; dağıtım sonrası duman testi bağlı değil [ajan] | Betiğe build sonrası denetim ve `smoke-live.mjs` ekle. |
| F5 | P1 | Testsiz kritik kod: `worker/index.ts` (yönlendirme, hata sarmalayıcı, cron saati); `ROUTES` tablosunun `api/` ile eşitliği (yeni uç Worker'a eklenmeyi unutulabilir) [ajan] | `import.meta.glob` ile `ROUTES` eşitlik testi. |
| F6 | P1 | **E2E'de zorunlu giriş kapısı ve Google akışı hiç sınanmıyor** (E2E bilerek Supabase'siz derleniyor) [ajan] | Kapılı bir build + `page.route` ile Supabase taklidi: "oturumsuz = yalnız giriş, kelimeler silinmez". |
| F7 | P2 | AGENTS.md'deki E2E komutu `VITE_*` değişkenlerini temizlemiyor; `.env.local` olan makinede bütün E2E düşer [ajan] | AGENTS.md'de `npm run test:e2e` kullan. |
| F8 | P2 | Görsel test referansları (54 dosya) 18 Ekim'den kalma, sonrasında çok değişiklik girdi; CI açılınca toplu kırmızı olur [ajan] | Kota dönünce `gh workflow run snapshots.yml --ref main`. |
| F9 | P2 | İlk yükleme: giriş JS 551 kB (175 kB gzip), CSS 63 kB gzip, ~50 modulepreload; `lessonOf` 438 kB gzip birçok ekrandan içe aktarılıyor [ajan] | `lessonTitle`/`topicOfTense` gibi küçük meta bilgiyi ayır; Lighthouse ile gerçek 3G ölç. |
| F10 | P2 | Dependabot/Renovate yok; küçük sürüm gerilikleri (anthropic-sdk, playwright, vitest) [ajan] | Haftalık gruplu güncelleme. |
| F11 | P2 | Sunucu yönlendirmesi `X-Robots-Tag: noindex` her sayfada, `/hakkinda`, `/gizlilik`, `/kosullar` dahil [ajan] | Marka doğrulaması geçti, sorun yok; ilerde arama motoru görünürlüğü istersen bu üç sayfa için istisna ver. |
| F13 | P1 | Cloudflare Güvenlik Öngörüleri: **"DMARC Record Error detected"** (diloloji.com, 19 Ekim 07:36 UTC taraması): "MX kaydı var ama karşılığında doğru biçimli bir DMARC kaydı yok". DNS listesinde `_dmarc` TXT kaydı görünüyordu; tarama geç kalmış ya da kayıt biçimi hatalı olabilir [CSV + ekran görüntüsü] | DNS'te `_dmarc` kaydı tam olarak `v=DMARC1; p=none; rua=mailto:destek@diloloji.com` olmalı (tırnağı Cloudflare ekler, sen yazma; baş/son boşluk yok). Antigravity 16.5 DoH ile gerçek değeri okuyacak. |
| F14 | P2 | Aynı raporda: Bot Fight Mode kapalı (orta), AI Labyrinth kapalı, Security.txt yok (`public/.well-known/security.txt` eklendi). `nigalingo.online` bölgesi hâlâ hesapta: artık kullanılmıyorsa sil ya da bu adresten diloloji.com'a yönlendir [CSV] | Bot Fight Mode'u aç (ücretsiz; tarayıcıdan gelen gerçek kullanıcıları etkilemez, `curl` ile yapılan duman testlerini zorlaştırabilir). |
| F12 | P2 | Bilinen kararsız E2E'ler `openScreen` içinde `dispatchEvent('click')` ile geçiştirilmiş: gerçek bir tıklanamaz sekme sorunu testi geçirebilir [ajan] | Kök neden bulunamadı; izlemeye devam. |

---

## 6. E2E sonucu

201 test (telefon + masaüstü + erişilebilirlik), Supabase değişkenleri kapalı derlemede: **199 geçti, 2 düştü** (ikisi de 1 dakikalık zaman aşımı; o sırada aynı makinede birim testleri de koşuyordu). İki testi (`a11y.e2e.ts` "a column chart is one keyboard stop" ve `phone.e2e.ts` "guide on phone…") tek başlarına yeniden koştum: **ikisi de geçti** (4 sn ve 7 sn). Bu, AGENTS.md'deki "yük altında kararsız E2E" notuyla uyumlu; uygulama hatası belirtisi yok.

Birim testleri düzeltmeden sonra, değişkenler tanımlıyken bile: **2.422 geçti, 1 atlandı, 0 düştü.**

Bu E2E koşusunun kapsamadığı şey (F6): zorunlu giriş kapısı ve gerçek Google/e-posta girişi. E2E bilerek Supabase'siz derleniyor.

---

## 7. Önerilen yol haritası

### Bugün, testçilerden önce (yarım gün)
1. **UX3**: Gerçek bir Gmail ile kayıt ol, onay mailinin geldiğini doğrula; gerekirse Resend SMTP bağla (K6).
2. **K1/B1/B2/B3** kararını ver; ben uygularım (hesap şartı sunucuda, anonim hesap/mail kapalı).
3. **UX1, UX2, UX4** metin düzeltmeleri (küçük, güvenli).
4. **A1** hesap silme düzeltmesi.
5. **F1**: UptimeRobot + Cloudflare uyarıları (20 dakikalık iş, sana ait).
6. Testçilere şunu söyle: İngilizce seçerlerse okuma ekranı seyrek, iPhone'da ana ekrana eklenmişse Google ile girsinler, ilk açılışta sözlük paketi iner (mobil veride birkaç MB).

### Bu hafta
- A2–A7, B4–B10, UX5–UX9, L1–L3, E1–E2, F2–F6.
- Cloudflare API token'ını ortama ekle, dağıtımı ben yapayım (F3).

### Sonra
- Kalan P2'ler, CSP zorunlu moda geçiş, görsel test referansları, Workers Paid kararı (gerçek kullanıcı sayısına göre).

---

## 8. Not: raporun sınırları

- Hiçbir bulguyu canlı sistemde denemedim; canlı siteye saldırı testi yapmadım.
- Ajan bulguları kod okumaya dayanıyor; "doğrulanmadı" olanlar canlıda ya da panelde teyit ister.
- Ürün/hukuk kararları (KVKK metni, yaş sınırı, onay modeli) senin; sadece teknik açıdan eksikleri yazdım.
