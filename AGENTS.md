# Diloloji — ajanlar için devir notu

Bu dosya, projede çalışacak bir yapay zekâ ajanının (Claude Code'dan devralan) bilmesi gerekenleri toplar.
Son güncelleme: 2026-11-12.

**Bu dosya kısa tutulur** (her oturumda bağlama yüklenir): yalnızca çalışma kuralları, komutlar ve tuzaklar. Konuya özgü uzun notlar `docs/notlar/` altında; yeni uzun not oraya, ilgili konu dosyasına yazılır. Dizin için aşağıdaki "Notlar dizini" bölümü.

## Kullanıcıyla çalışma kuralları
- **Kullanıcıya her yanıt Türkçe.** Özet, rapor, liste, soru, ara notlar dahil. İngilizce özet verme (kullanıcı birkaç kez itiraz etti).
- Kod, kod yorumları ve commit mesajları İngilizce (projenin mevcut dili). PR başlık/açıklamaları Türkçe.
- **CI'ı geçen (yeşil) PR'ları kullanıcıya sormadan sırayla birleştir** (`gh pr merge N --merge --delete-branch`); kullanıcı her seferinde onay istenmesinden yoruldu (2026-10-08). Kırmızıysa önce düzelt. Birleştirdiklerini kısaca Türkçe bildir.
- **Tasarım kuralları: `DESIGN.md`** (renk/yazı/köşe/gölge/hareket tokenları, bileşenler, Yap/Yapma, bilinen sapmalar). Arayüz yazmadan önce oku. Sitenin kendi sınıflarını/bileşenlerini kullan (`card`, `section-title`, `chip`, `btn`, `Toggle`, `ConfirmDialog`, `note`, `habit-nudge`, `hour-list`, `Popover`/`MenuItem`…); yeni görsel dil uydurma.
- CI'ı sürekli yoklama (polling) yapma; sonuç gerekiyorsa bir kez bak.
- **Üst üste kurulu PR'larda:** alttakini birleştirmeden ÖNCE üstündekinin tabanını main'e çevir (`gh pr edit <üstteki> --base main`). Yoksa `--delete-branch` taban dalı silince GitHub üstteki PR'ı kapatır (2026-10-08'de #49'da oldu; dal geri oluşturulup PR yeniden açıldı).
- Commit sonu: `Co-Authored-By: <model adı> <noreply@…>` tarzı bir satır kullanılıyordu; PR açıklaması sonu "🤖 Generated with …" satırı. Kendi aracının kuralına uy.

## Öncelik: içerik ve eğitim (2026-11-04, sahibinin kararı)
Sahibi şimdilik altyapıyla değil, **içerik ve eğitim tarafıyla** (dersler, alıştırmalar, fiil laboratuvarı, Rehber, okuma/dinleme içeriği) ilerlemek istiyor. Aşağıdaki altyapı işleri **sonraya kaldı**; sahibi açmadan başlatma, yalnızca sorulursa hatırlat.

**Ajanın yapacakları (bekliyor):**
- Birden çok `OWNER_EMAIL`: şikâyet ve yeni kayıt mailleri (`_reports.ts`, `_signupNotice.ts`) listeyi tek adres sanıyor. Sahibi ikinci adres istemiyor (2026-11-09); ikinci adres eklenirse yapılacak.
- [x] ~~`claude/iphone-webkit-tests` dalını güncel main'e taşı, PR aç, "Telefon testleri" bölümünü yaz~~ (#655 ile — 2026-11-01).
- [x] ~~Play Store sayfası: kısa/uzun açıklama, telefon ekran görüntüleri, 1024×500 tanıtım görseli~~ (`android/store/`, 2026-11-01; sahibi onaylar).
- [x] ~~Eşitlemeyi ve sunucu verilerini R2'den Supabase'e taşımaya hazırlamak~~ (2026-11-09): kod hazır, sıra testli (`supabaseMigrations.test.ts`), sunucu verileri adım adım taşınıyor. Kalanı sahibinde (aşağıda).

**Sahibinin yapacakları (bekliyor):**
- [ ] Google Play: geliştirici hesabı, yükleme anahtarı + `.aab`, Play App Signing SHA-256'sı, mağaza formları, 12 testçiyle 14 gün kapalı test (ayrıntı aşağıda).
- [ ] Gizlilik, kullanım koşulları ve hesap silme metinlerini onaylamak.
- [ ] **Yasal metinler, sonraya kalanlar (2026-11-09):** (1) Veri sorumlusu gizlilik metninde hâlâ "Diloloji platformu"; KVKK'da gerçek ya da tüzel kişi olmalı, sahibi ileride adını (ya da şirketi) yazdıracak. (2) **Yurt dışı aktarım:** düzenli aktarımlarda açık rıza ya da "kullanarak kabul" dayanak değil (KVKK m.9/6 istisnaları yalnızca arızi aktarımlar için); yol, her sağlayıcıyla (Supabase, Cloudflare, Resend; özelliğe göre DeepL, Anthropic, Microsoft, Google, Meta) Kurul'un standart sözleşmesi ve imzadan sonra 5 iş günü içinde KVKK'ya bildirim. Metin bunu "tamamlanmaktadır" diye söylüyor; sahibi bir avukatla yapmalı. (3) ~~Kullanım koşullarında hukuk seçimi~~ (2026-11-09, sahibinin seçimi: Türk hukuku + kanuni yetkili mahkemeler/tüketici hakem heyetleri + yaşanan ülkenin zorunlu korumaları saklı + önce destek adresine yazma, hakları kısıtlamadan; "İstanbul mahkemeleri" gibi yetki şartı bilerek yok: tacir olmayan kişiye karşı HMK m.18'e göre geçersiz).
- [x] ~~Cloudflare'de `ERROR_DIGEST_TO` gizlisi (haftalık hata özeti).~~ (tanımlı: özet maili geliyor — 2026-11-09)
- [x] ~~Supabase → Auth: en az 8 karakter şifre ve "Secure email change"~~ (2026-11-09; şifre: küçük/büyük harf, rakam, sembol; "Require current password" açık). **"Secure password change" bilerek kapalı:** 24 saatten eski oturumda e-posta ile yeniden doğrulama (nonce) ister, uygulama bu akışı desteklemiyor.
- [ ] Gerçek cihaz denemeleri: Safari mikrofon, iki telefonla canlı düello, push ve e-posta hatırlatmaları.
- [x] ~~**Eşitlemeyi Supabase'e taşımak**~~ (2026-11-09: `0002` + `0005` çalıştı, kontrol sorgusu üç `true`; sahibinin verisi `sync_parts`'ta, öbür iki hesabın R2'de eşitleme verisi yoktu).
- [x] ~~**Arkadaşlar, listeler, hatırlatmalar**~~ (2026-11-09: `tables` işareti yazıldı; R2'deki 2 kart tabloda, takip/liste/hatırlatma dosyası yoktu). R2 artık bunlar için okunmuyor.
- [ ] **Güvenlik incelemesi (2026-11-10/12), sahibinin yapacağı:** ~~SQL Editor'de sırayla `0013`, `0005` (yeniden, 30/20/50 MB) ve `0014`~~ (çalıştırıldı — 2026-11-12, #783). ~~Worker gizlisi `OWNER_STEP_SECRET`~~ (tanımlı — 2026-11-12; yönetici silme/toplu onay/sınırlar ikinci gizliyi ister). ~~Anthropic Console'da aylık harcama sınırı~~ (5 $ — 2026-11-12; site günlük tavanı buna göre ~0,15 $ olmalı). ~~Yedek: Mac'te `bash scripts/backup-mac.sh install`~~ (kuruldu, haftalık — 2026-11-13). Yönetim → Güvenlik'ten iki adımlı doğrulamayı açmak (ve bir yedek uygulama eklemek); isteğe bağlı `OWNER_MFA=required`. Cloudflare'de artık kullanılmayan `ADMIN_TOKEN`/`SYNC_ALLOWED` tanımlıysa silmek. Ayrıntı: `docs/GUVENLIK.md` "2026-11-12", `docs/notlar/sunucu-guvenlik-dagitim.md`.
- Supabase güvenlik denetimi (2026-11-09): sızdırılmış şifre koruması (HaveIBeenPwned) yalnızca Pro planda, ücretsiz planda açılamıyor. ~~`handle_new_user` RPC ile çağrılabilir~~ (`0012_trigger_privileges.sql`, canlıya uygulandı ve testli — 2026-11-09).
- [x] ~~Dış gözcü~~ (2026-11-09): UptimeRobot `diloloji.com`, `/api/health`, `/api/push?mail=status`, `/hakkinda` (5 dk).

## Açık işler: Android uygulaması ve telefon testleri (2026-10-28)
**Rafta (2026-11-09, sahibinin kararı): Google Play adımları 1–2 hafta bekliyor; sahibi açana dek bu bölümdeki işlere başlama, yalnızca sorulursa hatırlat.** Gerçek cihaz denemeleri sürüyor (uzun sürecek).

Sahibi Diloloji'yi **kişisel** bir Google Play hesabıyla Android uygulaması (TWA) olarak yayınlamak istiyor; iOS sonraya kaldı. Ayrıntılar: `android/README.md` ve aşağıdaki "Android uygulaması, TWA" ve "Şikâyet ve engelleme" notları. Bir maddeyi bitiren burada üstünü çizsin (`~~…~~`) ve tarih yazsın.

**Bekleyen PR'lar ve dallar (sırayla):**
1. ~~[#647](https://github.com/dilkolog/dilolojibydilkolog/pull/647) `claude/android-twa` → `main`: `/hesap-silme` sayfası, `assetlinks.json`, `android/twa-manifest.json` + README, gizlilik politikasında Android bölümü.~~ (birleşti — 2026-10-29)
2. ~~[#649](https://github.com/dilkolog/dilolojibydilkolog/pull/649) `claude/report-block` → `claude/android-twa`: şikâyet ve engelleme, kullanım koşullarına §4 topluluk kuralları.~~ (birleşti — 2026-10-29)
3. ~~`claude/iphone-webkit-tests`: iPhone profili, CI kurulumu, WebKit düzeltmeleri, güncel main'e taşıma, Telefon testleri belgesi ve PR.~~ ([#655](https://github.com/dilkolog/dilolojibydilkolog/pull/655) ile tamamlandı — 2026-11-01; WebKit **92/92**. Eski dalı ayrıca birleştirmeden önce #655 ile karşılaştır.)

**Sahibinin yapacakları (ajan yapamaz):**
- [ ] #647 ve #649'daki metinleri (gizlilik, hesap silme, kullanım koşulları) okuyup onaylamak.
- [x] ~~Cloudflare'de `OWNER_EMAIL` Worker gizlisinin tanımlı olduğunu doğrulamak~~ (tanımlı — 2026-11-09) (şikâyet mailleri ve yeni kayıt bildirimi bunu kullanır; yoksa şikâyetler yalnızca R2'de `reports/` altında birikir).
- [ ] Google Play geliştirici hesabı (25 $, kimlik doğrulaması).
- [ ] Yükleme anahtarı üretmek ve saklamak (`android/README.md` §2); `.aab` derlemek (§3: Bubblewrap ya da PWABuilder). **Claude ortamında derlenemez:** `dl.google.com` ağ politikasında kapalı, Android SDK inmiyor.
- [ ] Play App Signing'i açıp SHA-256 parmak izini ajana vermek (Play Console → Uygulama bütünlüğü).
- [ ] Mağaza formları: veri güvenliği (cevaplar README §7), içerik derecelendirmesi (kullanıcılar arası etkileşim: **var**), hedef kitle 13+, reklam yok, gizlilik adresi `/gizlilik`, hesap silme adresi `/hesap-silme`.
- [ ] **Kapalı test: en az 12 testçi, 14 gün kesintisiz** (kişisel hesap şartı); sonra üretime erişim başvurusu.
- [ ] Gelen şikâyetlere zamanında bakmak (Play bekler); kaldırma ve hesap kapatma adımları README §6.

**Ajanın yapacakları:**
- [ ] Parmak izi gelince: `public/.well-known/assetlinks.json` `sha256_cert_fingerprints` ve `android/twa-manifest.json` `fingerprints` (iki liste aynı olmalı, `src/androidApp.test.ts` denetler; yükleme anahtarınınki de eklenir), birleştir, dağıt, `npm run verify:deploy` (dosyayı canlıda arar). Uygulama üstte adres çubuğuyla açılıyorsa sebep budur.
- [x] ~~Mağaza sayfası: kısa açıklama (≤80 karakter), uzun açıklama, en az 2 telefon ekran görüntüsü (`android/store/`), 1024×500 tanıtım görseli (`android/store/feature-graphic.png`).~~ (hazırlandı — 2026-11-01)
- [ ] Kapalı testte gerçek cihaz listesi (README §7.6): giriş (Google/e-posta), eşitleme, Android 13+ bildirim izni ve hatırlatmalar, mikrofon (gölgeleme, sesli cevap), sesli okuma, çevrimdışı açılış, geri tuşu, Paylaş → Diloloji, adres çubuğu görünmemeli. Hatalar web tarafında düzeltilir; kabuk değişmez.
- [ ] Kabuk değişirse ya da Google'ın yıllık hedef API şartında: `appVersionCode` +1, yeni `.aab` (README §5).

**İsteğe bağlı / bilinen boşluklar:**
- Canlı düello odalarında oyuncu adı şikâyet edilemiyor (yalnızca ad, içerik yok; kod 6 haneli, oda bellekte). Play itiraz ederse `ReportDialog`'u düello lobisine `kind: 'club'` gibi bir oda şikâyetiyle ekle.
- Moderasyon elle: şikâyetler mail + R2'de; sahibine bir yönetim ekranı yok. Hesabı kapatmak Supabase'te kişiyi silmek; aynı kişi yeni e-postayla yeniden kaydolabilir (kalıcı yasak listesi yok).
- iOS (App Store) başlanmadı: Capacitor gerekir; Apple, Google girişi sunan uygulamada "Apple ile giriş" ister (kural 4.8), Mac/Xcode ve Apple Developer hesabı (99 $/yıl) gerekir; web push yerine APNs, konuşma tanıma eklentisi.
- Uygulama ücretli olur ya da reklam/satış eklenirse: Play faturalandırması şartı ve CEFR verisinin CC BY-NC-SA lisansı (ticari kullanım yok) yeniden konuşulmalı.

## Proje
### Telefon testleri (2026-11-01)

`playwright.config.ts` artık `iPhone (WebKit)` profili içerir (iPhone 13, 120 sn; phone/a11y/dictionary-active). CI Chromium ve WebKit kurar. Kurulum: `npx playwright install --with-deps chromium webkit`; çalıştırma: `npm run test:e2e`, yalnız iPhone: `npx playwright test --project='iPhone (WebKit)'` (test derlemesinden sonra). Eski `claude/iphone-webkit-tests` dalını ayrıca birleştirmeden önce bu değişikliklerle karşılaştır.

Yerel WebKit indirmesi ağ politikası nedeniyle 403 veriyor; GitHub CI'da tam paket **92/92 geçti** (2026-11-01). Testler `Touch` kurucusuna bağlı değil; DB temizliği aynı kökende uygulamasız sayfadan yapılır; kontrast taraması sonlu geçişlerden sonra çalışır. Okuma testinde gizli transkript önce arayüzden açılır, ardından gerçek tıklama kullanılır. Fiziksel cihaz/canlı test hesapları, yayın ve kaynak erişimi için [doğrulama kaydı](docs/yayin-dogrulama-2026-11-01.md).

- React 19 + Vite 8 PWA, Dexie/IndexedDB (`src/data/db.ts`), FSRS (`ts-fsrs`) ile aralıklı tekrar. Altyapı Cloudflare Worker (`worker/index.ts`, `wrangler.jsonc`) ve Cloudflare R2 (eşitleme blob deposu `diloloji-blobs`, `@vercel/blob` taklidi). Vercel Hobby kotası dolduğu için Cloudflare'e taşındı (ücretsiz, sınırsız statik varlıklar, tek saatlik cron `0 * * * *`, 100k istek/gün). Canlı alan adı: **`diloloji.com`** (`www.diloloji.com` ana adrese yönlenir). Eski adresler (`nigalingo.online`, `*.vercel.app`) artık güvenilen kökenler arasında değil (`api/_origin.ts`).
- Diller: EN/FR/ES öğreniliyor, arayüz Türkçe.
- **`src/ui` konu klasörlerinde (2026-11-09):** `account/` (giriş, hesap, eşitleme çalıştırıcısı), `admin/`, `dictionary/` (sözlük, çeviri), `guide/` (Rehber, dersler), `home/` (Bugün, tanıtım, ilk açılış), `practice/` (Oyunlar ekranı, Yaz & konuş, telaffuz), `profile/` (profil, rozetler), `progress/` (İlerleme, sınavlar), `reading/` (okuma, dinleme, video), `session/` (oturum ve özet), `settings/`, `shared/` (ortak bileşenler: `Dialog`, `Popover`, `Select`, `icons`, `toast`, ses, konuşma…), `social/` (arkadaşlar, topluluk, bildirimler), `words/` (kelimeler, listeler, kelime sayfası); eskiden olduğu gibi `games/`, `monki/`, `verbs/`. Kökte yalnızca uygulama düzeyi dosyalar (`AppSidebar`, `CommandPalette`, `useAppSettings`, `useLanguageData`…). Yeni dosya konusunun klasörüne, testi yanına. Notlardaki eski `ui/X.tsx` yolları güncellendi; eski tarihli PR açıklamaları eski yolu anar.
- Komutlar:
  - `npm run typecheck` (= `tsc -b && tsc -p tsconfig.api.json && tsc -p tsconfig.scripts.json && tsc -p tsconfig.worker.json`; Worker tipleri dahil)
  - `npx oxlint src api e2e`
  - `npx vitest run` (birim, ~3400 test; ağ kapalı: `src/test/noNetwork.ts` taklit edilmemiş her `fetch`'i reddeder, gerçek servise istek gitmez)
  - `npm run build:cf` (statik build + dist/_headers üretimi) / `npm run deploy:cf` (Cloudflare Worker dağıtımı)
  - `npx vite build && npx playwright test e2e/phone.e2e.ts e2e/desktop.e2e.ts e2e/a11y.e2e.ts --workers=4` (E2E, ~3 dk; `E2E_PORT` için aşağıya bak)
  - Görsel testler: `e2e/visual.e2e.ts` — referanslar **yalnızca Linux** (`*-linux.png`). macOS'ta `--ignore-snapshots` ile çalıştır. **`*-darwin.png` dosyalarını asla commit etme.**
- Referans görüntüleri yenilemek: `gh workflow run snapshots.yml --ref <dal>` (CI'da Linux'ta çeker, iki kez doğrular, dala commit eder).
- CI: `.github/workflows/ci.yml` — kontrol/birim/Chromium ve ayrı WebKit işi; WebKit'in yavaş telefon kontrolleri ana işin süre sınırını tüketmez. Yalnızca PR'larda; main'e push'ta ve yalnızca `.md`/`docs/` değişince çalışmaz, taslak PR'da çalışmaz. Elle: Actions → CI → Run workflow.
- **Actions dakikaları sınırlı** (özel depo, ücretsiz plan: ayda 2.000 dk; 2026-10-08'de doldu, işler "payments failed / spending limit" hatasıyla başlamadı). Gereksiz push yapma; bir PR'a art arda küçük commit'ler atmak yerine yerelde tam doğrulayıp tek seferde push'la. Ekran görüntüsü yenilemeyi (snapshots.yml) yalnızca görünüm gerçekten değiştiğinde çalıştır.

## Kelime öğrenme motoru (2026-11-04)

Yeni kelimeler `session.ts:startSession` içinde üçlü gruplara ayrılır (`learningBatch`); dinamik pekiştirmeler sonraki grubun önünde kalır. İlk tanıtım tahmin sorusuyla başlamaz; anlam seçme → pekiştirme → yazılı hatırlama sırası korunur. `proceed` yanlış sonrası ilk doğrudan sonra da yeniden deneme üretmelidir (iki başarılı geri çağırma hedefi); bekleyen aynı beceri soruları çoğaltılmaz. `attemptMode` rehberli tekrardaki ilk yeni beceriyi FSRS'ye kaydeder, sonraki pekiştirmeler aralığı büyütmez. Yakın zamanda öğrenilen kelimenin cevabı sınamadan önce gösterilmez; yalnız yarım tanıtım kartla sürdürülür. Süre/soru sınırı tanıtımı ilk sorudan ayırmamalı; hızlı tekrar yeni kelime sorusunu tanıtımsız almamalı. Eksik artikel aynı kelimenin türevi olarak işaretlenmemeli (`evaluateTypedInner`). Analiz, kaynaklar ve doğrulama: [öğrenme motoru raporu](docs/ogrenme-motoru-2026-11-04.md).

Kalıcı öğrenme güncellemesi: normal oturum taslağı `data/sessionDraft.ts` ile dil başına `meta study-session:<dil>` altında cihazda saklanır. Cevap ve sonraki adım `saveReview` işleminde atomiktir; override/discard da taslağı atomik düzeltir. `UserWordState.learning` beceri başına kalan hedefi ve gecikmeli hatırlamayı taşır; serbest pratik bunu değiştirmez. `learningProgress.ts` birleştirmesi zaman + sıra sayacına göre sıfır borcu da korur. Başarılı tekrarlar FSRS aralığını şişirmez, yanlış/tam ipuçlu tekrar normal değerlendirilir. Yardımsızlık ölçütü `independentAnswer`, basamaklar `advanceLearning`; yanlış becerinin doğru cevabı geri çağırma borcunu kapatmaz. Yeni rehberli kelimelerde yüksek aşamalar için en az 24 saat sonra üretken geri çağırma gerekir; eski kayıtlar korunur. Ayrıntılar: [kalıcı öğrenme akışı](docs/kalici-ogrenme-motoru-2026-11-04.md).

Yazılı yanlıştan sonra "doğrusunu yaz" adımı (`CopyStep`, `copyAfterMiss`) puanlanmaz; halka bu turdaki adımları `learningSteps` ile gösterir (yalnız görüntü). Ayrıntı: `docs/notlar/ogrenme-motoru.md` (2026-11-13).

## Bilinen tuzaklar
- **Telefonda yapışık öğeler:** üst çubuk da yapışık; altına girmemeleri için `top: calc(var(--topbar-h) + 0.5rem)` (`.shell` telefonda `--topbar-h` tanımlar, #125).
- E2E'de mikrofon yok: gölgeleme testi `getUserMedia`'yı sessiz bir `AudioContext` akışıyla taklit eder (#127). LanguageTool testi `page.route('https://api.languagetool.org/v2/check', …)` ile taklit edilir.
- **macOS dosya sistemi büyük/küçük harf duyarsız:** `twinTense.ts` ile `TwinTense.tsx` ya da `lazyScreens.ts` ile `AppScreens.tsx` gibi benzer adlar aynı klasörde çakışmaya yol açabilir (tsc hata verir). Mantık dosyasına farklı ad ver (ör. `tenseTwin.ts`, `moodRound.ts`).
- **Claude Code ortamında ağ kısıtı:** LibriVox, Gutenberg, archive.org, Wikisource ve COERLL'e doğrudan erişemiyor; dış kaynak araştırmaları ve internet gerektiren bağlantı doğrulamaları Antigravity tarafından yürütülür.
- **Bileşik zaman ve dönüşlü fiiller:** `src/engine/textForms.ts` + `analyzeCompound` (`tenses.ts`): yardımcı fiil + ortaç tek çekim sayılır (araya pas/ya gibi küçük sözcükler girebilir). Fransızca `être` yalnızca onu alan fiillerle (`row.aux === 'e'`) eşleşir; dönüşlü fiiller ("il s'est lavé", "je me suis levé", "nous nous sommes lavés") baştaki dönüşlü zamirle tanınır ve her fiille `être` alır. Her çekim ilk geçtiği cümlenin sırasını (`sentence`) taşır: Çekimler kartında "metinde göster".
- Playwright'ın `page.clock` sabit saati, sahte `Date`'i IndexedDB'ye düz nesne olarak yazdırır. Kalıcı veride (IndexedDB/meta, yedek) tarih alanlarını asla string varsayma; `addedTime()` ve `timeOf()` savunmacı yardımcılarını kullan (`src/engine/types.ts`, #136, #148).
- İstemci ve Worker hataları Cloudflare Workers Logs'ta (`[client-error]`, `[worker-error]`, `[csp-report]`) aranır (Cloudflare Dashboard → Workers & Pages → diloloji → Logs veya `npx wrangler tail diloloji`; istemcide yakalanan hatalar `api/log.ts`'ye düşer).
- **CSP zorunlu (2026-10-20):** `security-headers.json`da `Content-Security-Policy` (engeller). `script-src` satır içi betiklerin hash'ini taşır: `scripts/cf-headers.mjs` bunları `dist/index.html`den yeniden hesaplayıp `dist/_headers`a yazar (`scripts/cspHashes.mjs`), `src/csp.test.ts` `index.html` ile `security-headers.json`un uyuştuğunu denetler: `index.html`deki bir betiği değiştirirsen hash'i `security-headers.json`a da yaz. Yeni bir dış betik/çerçeve kaynağı politikaya eklenmeli. `connect-src https: wss:` bilerek geniş (çevrimdışı ses, resim arama, YZ, Tatoeba, düello odaları). Geri alma: anahtarı `-Report-Only` yap (`docs/veri/csp-gecis.md`).
- **Dağıtım:** Cloudflare Workers Builds `main`'e her birleştirmeyi kendiliğinden canlıya alır; birleştirdikten sonra `npm run verify:deploy`. Vercel'den çıkıldı (2026-11-08).
- E2E'de örnek kelimeler yüklendikten sonra `packApplied(page)` (e2e/helpers.ts) sözlük paketinin uygulanmasını bekler (#53 ile geldi).
- Örnek cümlenin `form` alanı boş (`''`) olabilir (#62): kelime cümlede geçmiyor demek. Boşluk doldurma/bağlam soruları `form`u olan cümleleri kullanır; yeni kod da `ex.form`un dolu olduğunu varsaymasın.
- Fiil laboratuvarı verisi: `LabData` (`src/engine/labProgress.ts`): `records['fiil|zaman']`, `tally['zaman|kişi']` (`weakestCell`, `weakPersons`), `kinds` (hata türleri). Kayıt için `recordLabAnswer` (`src/ui/verbs/labShared.ts`).
- **Okuma kelime kartı (`.word-pop`):** dar kapsayıcıda (`.main` < 50rem) alttan çekmece: `position: fixed`, sol/genişlik `--sheet-left`/`--sheet-w` ile metin sütununa ölçülür (Reading.tsx), altında `.has-sheet` boşluğu. `position: sticky` burada çalışmadı (grid/flex öğesi kendi alanında sıkışıyor). Çekmece yükselirken `getBoundingClientRect` animasyon yüzünden yanıltır: konumu `innerHeight - bottom - offsetHeight` ile hesapla. Geniş kapsayıcıda kart yan sütunda statik kalır.
- Bir `useEffect` içinden gelen `reload` sonuçları dil değişince atılıyor (`languageRef`, #51 birleşti) — bu deseni koru.
- **`vite preview` `/api`'yi canlı siteye (diloloji.com) yönlendirir**, yalnızca Playwright'ın başlattığı önizlemede (`E2E_LOCAL_API=1`, `vite.config.ts` `e2eLocalApi`) `/api/sync` yerelde 403, `/api/log` 204 döner: testlerin sahte hesapları canlı eşitlemeye ve haftalık hata özetine düşüyordu (2026-11-09, Workers Logs'ta CI'ın Pixel 7/iPhone cihazlarından gelen `id=undefined` istekleri). Testte bunlara başka cevap gerekirse `page.route` kur. E2E'de `startWithSamples` çeviriyi varsayılan olarak 503 ile kapatır (yoksa testler gerçek DeepL'i çağırır). Çeviri isteyen test, başladıktan sonra kendi taklidini kurar; URL'yi glob ile değil, işlevle eşle: `(u) => u.pathname === '/api/translate' && u.searchParams.has('usage' | 'text')`.
- Sesli (dinleme) metinler okumada **önce gizli** açılır ("önce dinle" turları). Testte metne tıklamadan önce "Turları bırak"a bas.
- Çeviri: sunucu `api/translate.ts` (DeepL, anahtar Worker gizlisi `DEEPL_AUTH_KEY`; anahtarı asla koda ya da sohbete yazma). Her çeviri cihazdaki **çeviri belleğinde** (`meta 'translations'`, `src/engine/translationMemory.ts`) saklanır, yedeğe ve eşitlemeye girer; aynı cümle bir daha sunucuya gitmez. Kotayı koruyan kod (sırayla çeviri, yalnızca ekrana gelen paragraf) bu deseni bozmasın.
- **Ortam değişkenleri ve Node:** README'deki tabloya bak; Node `>=22.12` (`engines`, `.nvmrc` 24). `pw.tmp.config.ts` makineye özeldir ve izlenmez (`.gitignore`).
- Kullanıcının makinesindeki `design-drift` eklentisinin kancası, yoldaki boşluk yüzünden her dosya yazımında hata basıyor; projeyle ilgisi yok.
- **Depolama kapısı ve `vercel.json` (2026-11-08):** `vercel.json` kaldırıldı (Vercel'den çıkıldı); güvenlik başlıkları `security-headers.json`da (yalnızca `headers`), `scripts/cf-headers.mjs` onu `dist/_headers`a yazar. Sunucu kodu blob deposuna `./_blob` üzerinden erişir (`api/_blob.ts`; paket adı yalnızca orada geçer): üretimde `wrangler.jsonc` `alias`ı onu `worker/blob.ts`e (R2) yönlendirir, testler `@vercel/blob`u taklit etmeye devam eder. Yeni sunucu kodu `@vercel/blob`u doğrudan içe aktarmasın. Eski notlarda geçen `vercel.json` ve `@vercel/blob` bu iki yere karşılık gelir.

## Notlar dizini

Ayrıntılı, tarihli notlar konuya göre ayrıldı (2026-11-08). Bir alana dokunmadan önce ilgili dosyayı oku; "yukarıdaki/aşağıdaki … notu" göndermeleri başka dosyada olabilir (`grep -rn "<ifade>" docs/notlar`). Dizin: [docs/notlar/README.md](docs/notlar/README.md).

- [`docs/notlar/android-play.md`](docs/notlar/android-play.md): Android uygulaması (Play). TWA kabuğu, Play Store süreci, kapalı test.
- [`docs/notlar/bugun-ayarlar-arayuz.md`](docs/notlar/bugun-ayarlar-arayuz.md): Bugün, Ayarlar ve arayüz. Bugün ekranı, Ayarlar, oturum ekranı, kısayollar, statik sayfalar, performans.
- [`docs/notlar/calisma-ortami-test.md`](docs/notlar/calisma-ortami-test.md): Çalışma ortamı ve testler. Depo, iki ajan düzeni, E2E portu ve kararsız testler, PR notları.
- [`docs/notlar/gecmis-turlar.md`](docs/notlar/gecmis-turlar.md): Geçmiş turlar ve durum kayıtları. Tarihli durum notları (Antigravity ve Claude Code), bitmiş turlar, eski devir notları.
- [`docs/notlar/hesap-esitleme.md`](docs/notlar/hesap-esitleme.md): Hesap, giriş ve eşitleme. Supabase girişi, onay, eşitleme motoru ve birleştirme kuralları, yedek, cihaz tercihleri, şifre.
- [`docs/notlar/icerik.md`](docs/notlar/icerik.md): İçerik. Rehber dışı içerik turları: kelime listeleri, B2–C1 içerik, içerik fabrikası, veri yamaları, sözlük paketi.
- [`docs/notlar/kelimeler-listeler-sozluk.md`](docs/notlar/kelimeler-listeler-sozluk.md): Kelimeler, listeler ve sözlük. Kelime sayfası, listeler, sözlük, kartlar, içe/dışa aktarma.
- [`docs/notlar/monki-yz.md`](docs/notlar/monki-yz.md): Monki ve yapay zekâ. Sitenin YZ anahtarı, düzeyler ve maliyet, Monki sohbeti ve modları, YZ özellikleri.
- [`docs/notlar/ogrenme-motoru.md`](docs/notlar/ogrenme-motoru.md): Öğrenme motoru ve kişisel algoritma. Soru türü seçimi, bağlam sorularının kapısı, ölçüm soruları, sülük yardımı, hafıza modeli.
- [`docs/notlar/okuma-dinleme.md`](docs/notlar/okuma-dinleme.md): Okuma, dinleme ve video. Okuma ekranı, metin ekleme (PDF, Word, bağlantı, fotoğraf), YouTube ve video, sesli kitap, haberler, dikte, gölgeleme.
- [`docs/notlar/oyunlar.md`](docs/notlar/oyunlar.md): Oyunlar. Oyunlar ekranı ve tek tek oyunlar.
- [`docs/notlar/rehber-dersler-fiiller.md`](docs/notlar/rehber-dersler-fiiller.md): Rehber, dersler ve fiil laboratuvarı. Rehber dersleri, sınav havuzu, fiil laboratuvarı, çekim ve zaman verisi, örnek cümleler.
- [`docs/notlar/sunucu-guvenlik-dagitim.md`](docs/notlar/sunucu-guvenlik-dagitim.md): Sunucu, güvenlik ve dağıtım. Cloudflare Worker, R2, Supabase tabloları, kotalar, güvenlik, e-posta/push, dağıtım ve hesap silme notları.
- [`docs/notlar/tanitim-sayfasi.md`](docs/notlar/tanitim-sayfasi.md): Tanıtım sayfası. Tanıtım (landing) sayfası, ilk açılış, dile göre paylaşım sayfaları ve giriş sayfası.
- [`docs/notlar/tasarim-cizim-ses.md`](docs/notlar/tasarim-cizim-ses.md): Tasarım, çizimler ve ses. Çizim setleri, simgeler, avatarlar, hareket, ses kimliği, yazdırma.
- [`docs/notlar/tur-notlari.md`](docs/notlar/tur-notlari.md): Tur notları (çok konulu). Birden çok konuyu içeren tarihli iş turları.
- [`docs/notlar/xp-rozet-sosyal.md`](docs/notlar/xp-rozet-sosyal.md): XP, rozetler, bildirimler ve sosyal özellikler. XP kuralları, rozetler, seviye, bildirim merkezi, arkadaşlar, lig, davet, şikâyet ve engelleme.
- [`docs/notlar/yapilacaklar-fikirler.md`](docs/notlar/yapilacaklar-fikirler.md): Yapılacaklar ve fikirler. Tasarım iyileştirme listesi, sıradaki olası işler, kullanıcıya önerilenler.
