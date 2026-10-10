# Kelime Koçu — ajanlar için devir notu

Bu dosya, projede çalışacak bir yapay zekâ ajanının (Claude Code'dan devralan) bilmesi gerekenleri toplar.
Son güncelleme: 2026-10-09.

## Kullanıcıyla çalışma kuralları
- **Kullanıcıya her yanıt Türkçe.** Özet, rapor, liste, soru, ara notlar dahil. İngilizce özet verme (kullanıcı birkaç kez itiraz etti).
- Kod, kod yorumları ve commit mesajları İngilizce (projenin mevcut dili). PR başlık/açıklamaları Türkçe.
- **CI'ı geçen (yeşil) PR'ları kullanıcıya sormadan sırayla birleştir** (`gh pr merge N --merge --delete-branch`); kullanıcı her seferinde onay istenmesinden yoruldu (2026-10-08). Kırmızıysa önce düzelt. Birleştirdiklerini kısaca Türkçe bildir.
- **Tasarım kuralları: `DESIGN.md`** (renk/yazı/köşe/gölge/hareket tokenları, bileşenler, Yap/Yapma, bilinen sapmalar). Arayüz yazmadan önce oku. Sitenin kendi sınıflarını/bileşenlerini kullan (`card`, `section-title`, `chip`, `btn`, `Toggle`, `ConfirmDialog`, `note`, `habit-nudge`, `hour-list`, `Popover`/`MenuItem`…); yeni görsel dil uydurma.
- CI'ı sürekli yoklama (polling) yapma; sonuç gerekiyorsa bir kez bak.
- **Üst üste kurulu PR'larda:** alttakini birleştirmeden ÖNCE üstündekinin tabanını main'e çevir (`gh pr edit <üstteki> --base main`). Yoksa `--delete-branch` taban dalı silince GitHub üstteki PR'ı kapatır (2026-10-08'de #49'da oldu; dal geri oluşturulup PR yeniden açıldı).
- Commit sonu: `Co-Authored-By: <model adı> <noreply@…>` tarzı bir satır kullanılıyordu; PR açıklaması sonu "🤖 Generated with …" satırı. Kendi aracının kuralına uy.

## Proje
- React 19 + Vite 8 PWA, Dexie/IndexedDB (`src/data/db.ts`), FSRS (`ts-fsrs`) ile aralıklı tekrar, Vercel Functions (`api/`), Vercel Blob (eşitleme, şifreli). Vercel planı **Hobby** (cron günde 1 kez → 24 ayrı günlük cron kullanılıyor, #44).
- Diller: EN/FR/ES öğreniliyor, arayüz Türkçe.
- Komutlar:
  - `npm run typecheck` (= `tsc -b && tsc -p tsconfig.api.json`)
  - `npx oxlint src api e2e`
  - `npx vitest run` (birim, ~900 test)
  - `npx vite build && npx playwright test e2e/phone.e2e.ts e2e/desktop.e2e.ts e2e/a11y.e2e.ts --workers=4` (E2E, ~3 dk; `E2E_PORT` için aşağıya bak)
  - Görsel testler: `e2e/visual.e2e.ts` — referanslar **yalnızca Linux** (`*-linux.png`). macOS'ta `--ignore-snapshots` ile çalıştır. **`*-darwin.png` dosyalarını asla commit etme.**
- Referans görüntüleri yenilemek: `gh workflow run snapshots.yml --ref <dal>` (CI'da Linux'ta çeker, iki kez doğrular, dala commit eder).
- CI: `.github/workflows/ci.yml` — tek iş (kontrol + birim + E2E), yalnızca PR'larda; main'e push'ta ve yalnızca `.md`/`docs/` değişince çalışmaz, taslak PR'da çalışmaz. Elle: Actions → CI → Run workflow.
- **Actions dakikaları sınırlı** (özel depo, ücretsiz plan: ayda 2.000 dk; 2026-10-08'de doldu, işler "payments failed / spending limit" hatasıyla başlamadı). Gereksiz push yapma; bir PR'a art arda küçük commit'ler atmak yerine yerelde tam doğrulayıp tek seferde push'la. Ekran görüntüsü yenilemeyi (snapshots.yml) yalnızca görünüm gerçekten değiştiğinde çalıştır.

## Bilinen tuzaklar
- **Telefonda yapışık öğeler:** üst çubuk da yapışık; altına girmemeleri için `top: calc(var(--topbar-h) + 0.5rem)` (`.shell` telefonda `--topbar-h` tanımlar, #125).
- E2E'de mikrofon yok: gölgeleme testi `getUserMedia`'yı sessiz bir `AudioContext` akışıyla taklit eder (#127). LanguageTool testi `page.route('https://api.languagetool.org/v2/check', …)` ile taklit edilir.
- **macOS dosya sistemi büyük/küçük harf duyarsız:** `twinTense.ts` ile `TwinTense.tsx` ya da `lazyScreens.ts` ile `AppScreens.tsx` gibi benzer adlar aynı klasörde çakışmaya yol açabilir (tsc hata verir). Mantık dosyasına farklı ad ver (ör. `tenseTwin.ts`, `moodRound.ts`).
- **Claude Code ortamında ağ kısıtı:** LibriVox, Gutenberg, archive.org, Wikisource ve COERLL'e doğrudan erişemiyor; dış kaynak araştırmaları ve internet gerektiren bağlantı doğrulamaları Antigravity tarafından yürütülür.
- **Bileşik zaman ve dönüşlü fiiller:** `src/engine/textForms.ts` + `analyzeCompound` (`tenses.ts`): yardımcı fiil + ortaç tek çekim sayılır (araya pas/ya gibi küçük sözcükler girebilir). Fransızca `être` yalnızca onu alan fiillerle (`row.aux === 'e'`) eşleşir; dönüşlü fiiller ("il s'est lavé", "je me suis levé", "nous nous sommes lavés") baştaki dönüşlü zamirle tanınır ve her fiille `être` alır. Her çekim ilk geçtiği cümlenin sırasını (`sentence`) taşır: Çekimler kartında "metinde göster".
- Playwright'ın `page.clock` sabit saati, sahte `Date`'i IndexedDB'ye düz nesne olarak yazdırır. Kalıcı veride (IndexedDB/meta, yedek) tarih alanlarını asla string varsayma; `addedTime()` ve `timeOf()` savunmacı yardımcılarını kullan (`src/engine/types.ts`, #136, #148).
- İstemci hataları Vercel günlüklerinde `[client-error]` ile aranır (istemcide yakalanan hatalar `api/log.ts`'ye düşer).
- Vercel Hobby planının günlük dağıtım (deployment) sınırı var (100 dağıtım/gün). Her PR bir önizleme yayını açar, bu yüzden gereksiz PR açmaktan kaçın.
- E2E'de örnek kelimeler yüklendikten sonra `packApplied(page)` (e2e/helpers.ts) sözlük paketinin uygulanmasını bekler (#53 ile geldi).
- Örnek cümlenin `form` alanı boş (`''`) olabilir (#62): kelime cümlede geçmiyor demek. Boşluk doldurma/bağlam soruları `form`u olan cümleleri kullanır; yeni kod da `ex.form`un dolu olduğunu varsaymasın.
- Fiil laboratuvarı verisi: `LabData` (`src/engine/labProgress.ts`): `records['fiil|zaman']`, `tally['zaman|kişi']` (`weakestCell`, `weakPersons`), `kinds` (hata türleri). Kayıt için `recordLabAnswer` (`src/ui/verbs/labShared.ts`).
- **Okuma kelime kartı (`.word-pop`):** dar kapsayıcıda (`.main` < 50rem) alttan çekmece: `position: fixed`, sol/genişlik `--sheet-left`/`--sheet-w` ile metin sütununa ölçülür (Reading.tsx), altında `.has-sheet` boşluğu. `position: sticky` burada çalışmadı (grid/flex öğesi kendi alanında sıkışıyor). Çekmece yükselirken `getBoundingClientRect` animasyon yüzünden yanıltır: konumu `innerHeight - bottom - offsetHeight` ile hesapla. Geniş kapsayıcıda kart yan sütunda statik kalır.
- Bir `useEffect` içinden gelen `reload` sonuçları dil değişince atılıyor (`languageRef`, #51 birleşti) — bu deseni koru.
- **`vite preview` `/api`'yi canlı siteye (kelime-koc.vercel.app) yönlendirir.** E2E'de `startWithSamples` çeviriyi varsayılan olarak 503 ile kapatır (yoksa testler gerçek DeepL'i çağırır). Çeviri isteyen test, başladıktan sonra kendi taklidini kurar; URL'yi glob ile değil, işlevle eşle: `(u) => u.pathname === '/api/translate' && u.searchParams.has('usage' | 'text')`.
- Sesli (dinleme) metinler okumada **önce gizli** açılır ("önce dinle" turları). Testte metne tıklamadan önce "Turları bırak"a bas.
- Çeviri: sunucu `api/translate.ts` (DeepL, anahtar Vercel ortam değişkeni `DEEPL_AUTH_KEY`; anahtarı asla koda ya da sohbete yazma). Her çeviri cihazdaki **çeviri belleğinde** (`meta 'translations'`, `src/engine/translationMemory.ts`) saklanır, yedeğe ve eşitlemeye girer; aynı cümle bir daha sunucuya gitmez. Kotayı koruyan kod (sırayla çeviri, yalnızca ekrana gelen paragraf) bu deseni bozmasın.
- Kullanıcının makinesindeki `design-drift` eklentisinin kancası, yoldaki boşluk yüzünden her dosya yazımında hata basıyor; projeyle ilgisi yok.

## Durum (2026-10-10)
Birleşti: #37–#183.
- Antigravity 1–5. tur ve araştırmalar (#153, #155, #156, #158, #159, #160, #161, #165, #166, #170, #172, #173, #175, #177, #179, #181, #183):
  - #153: Çevrimdışı göstergesi (üst çubukta sessiz çevrimdışı rozeti, çevrimiçi olunca kaybolur).
  - #155: Alt sekmelerin görünürlüğü (seçili sekme göstergesi ve kaydırma ipucu).
  - #156: Test boşlukları (src/engine/ altında test edilmemiş 5 modüle kapsamlı birim testleri: `hours`, `workloadForecast`, `incoming`, `accents`, `milestones`).
  - #158: İlerleme ekranında katlanan kartların seçimini hatırlama (`Progress.tsx`, `useGroups.ts`, `GroupToggle`).
  - #159: Çoklu CEFR filtresi ve sözlük düzeltme notunun keşfedilebilirliği (Kelimeler filtresinde çoklu seviye seçimi, Sözlük'te dokunsal kalem daveti).
  - #160: `Words.tsx` (1634 satır) modüler bileşenlere ayrıldı (`WordForm.tsx`, `WordListView.tsx`, `Words.tsx` 377 satıra indi).
  - #161: `SettingsScreen.tsx` (844 satır) modüler bileşenlere ayrıldı (`StudySettings`, `AnswerSettings`, `SoundSettings`, `LookSettings`, `ReminderSettings`, `ToolsSettings`, `DataSettings`, `settingsWidgets`; ana ekran 194 satıra indi).
  - #165: LibriVox ve Gutenberg B1+ sesli kitaplar envanteri (`audiobooks-fr.json`, `audiobooks-es.json`, `README.md`).
  - #166: COERLL dil bilgisi içerikleri araştırma raporu (`docs/kaynaklar/coerll.md`).
  - #170: `Progress.tsx` (655 satır) modüler bileşenlere ayrıldı (`WeekHero.tsx`, `ProgressCharts.tsx`, `ProgressMemory.tsx`, `ProgressTests.tsx`, `progressShared.ts`; ana ekran 187 satıra indi).
  - #172: E2E sağlamlığı (fonksiyonel rota eşlemeleri ve dinamik görünürlük beklemeleri).
  - #173: Dahili kullanılan dışa aktarımların temizlenmesi ve raporu (`docs/KULLANILMAYAN-DISA-AKTARIMLAR.md`).
  - #177: İkon denetimi raporu (`docs/IKON-DENETIMI.md`) ve telefon koyu tema ekran görüntüleri.
  - #179: Yeni bölünen UI bileşenlerine kapsamlı birim testleri (`TextForms.test.tsx`, `CoverageCard.test.tsx`, `WordCard.test.tsx`, `ReadingLibrary.test.tsx`, `AppSidebar.test.tsx`).
  - #181: Erişilebilirlik (a11y) test kapsamının genişletilmesi (`e2e/a11y.e2e.ts`: Onboarding adımları, Çekimler kartı, mobil kelime alt çekmecesi ve oturum özeti axe taramaları).
  - #183: Dokümantasyon ve durum güncellemeleri (`AGENTS.md`, `KULLANILABILIRLIK.md`, `YAPILACAKLAR.md`, `ANTIGRAVITY-GOREVLER.md`).
  - #185: TV5Monde & DELE Ahora telif ve kullanım şartları araştırma raporu (`docs/kaynaklar/tv5monde-dele-ahora.md`).
- Antigravity 6. tur (#187, #190):
  - 6.1: LibriVox ses kitapları bölüm bazlı metin-ses eşleştirme (`scripts/build-audiobook-chapters.ts`, `src/data/audiobooks/{fr,es}.json`, `src/data/audiobooks.ts`, `docs/kaynaklar/audiobooks-chapters.md`). 23 doğrulanmış bölüm (13 FR + 10 ES).
  - 6.3: Yeni özelliklere kapsamlı birim testleri (`src/ui/useSwipeAway.test.tsx`, `src/ui/verbs/LabTourCard.test.tsx`, `src/ui/TranslateScreen.test.tsx`, `src/ui/SessionForgot.test.tsx`, `src/engine/__tests__/listenFollow.test.ts`).
  - 6.4: Erişilebilirlik (a11y) test kapsamının genişletilmesi (`e2e/a11y.e2e.ts`: Çeviri ekranı açık/koyu/sakin tema ve sonuç durumları, okuma dışarıda çalış ve çekimler kartları, oturum unuttum soru ve cevap durumları, çevrimdışı rozeti axe taramaları, `clippedContent` ikon denetimi).
  - 6.5: Metin denetimi raporu (`docs/METIN-DENETIMI.md`), Diloloji isim güncellemesi (`README.md`, `package.json`, `extension/`).

- Claude Code (#168 ve sonrası):
  - Çekim listesi (`textForms.ts`, bileşik zamanlar, fiil tekrarına ekleme köprüsü),
  - Büyük ekran dosyalarının bölünmesi (`Onboarding`, `SessionSummary`, `AppScreens`, `appNav`, `lazyScreens`, `AppSidebar`, `ReadingLibrary`, `CoverageCard`, `WordCard`),
  - Dinlerken takip geliştirmeleri (`listenFollow.ts`, `Listening.tsx`),
- Çeviri (#111, #113, #114, #120): DeepL ile cümle çevirisi (her cihazda hazır), Çeviri ekranı, çeviri belleği, okumada "Cümlenin Türkçesi" ve paragraf altında "Türkçesi".
- Dinleme ve üretim (#118, #122):
  - dinlerken duyulan cümle aydınlanır, "Bu cümleden dinle" (`src/engine/listenFollow.ts`; zamanlı altyazılı beslemelerde kesin, diğerlerinde yaklaşık);
  - Okuma → "Dikte": metin cümle cümle dinlenip yazılır (`src/ui/TextDictation.tsx`);
  - Oyunlar → "Geri çeviri": çeviri belleğindeki cümleler Türkçesinden yazılır, denenen her cümle cümle kartı olur (`src/engine/backTranslation.ts`).
- Dinleme ve konuşma devamı (#125, #127): dikte hataları kaydedilir (`src/engine/earMisses.ts`, `meta 'earMisses'`, yedek + eşitleme) → Oyunlar → "Kaçırdıkların" ve İlerleme kartı; Okuma → "Gölgele" (cümle cümle, kaydın kendi sesiyle; `ShadowControls` her sesle çalışır). Ses panelinin `rangeRef`'i parça bitince çözülen Promise döndürür.
- CEFR seviyeleri (#129): FLELex/ELELex → `src/data/cefr/{fr,es}.txt` (`scripts/build-cefr.ts`, CC BY-NC-SA, `SOURCE.md`); kelime ayrıntısı/sözlükte seviye, İlerleme'de seviyeye göre kapsam, eksik kelimelerde A1–B2. Uygulamadaki eski "seviye sistemi" bilerek kaldırılmıştı; bu yalnızca ölçüm ve seçim için.
- Metin seviyesi tahmini denendi, **yapılmadı**: kısa metinlerde konuya özgü kelimeler (%7–15) listelerde olmadığı için tahmin gürültülü çıktı; kişisel kapsam (%) daha iyi gösterge.
- Yazma denetimi (#131): LanguageTool'un ücretsiz API'si tarayıcıdan doğrudan (CORS açık), yalnızca dokununca; Günlük ve Hikaye özetinde. Şartları: dakikada ≤20 istek, görünür bağlantı.
- İçerik kaynakları raporu ve listeleri (#130, #135, #137, #138): `docs/kaynaklar/` (açık lisanslı hikâyeler, transkriptli podcastler, tam envanter).
- Kolay resimli hikâyeler (#133): Global Storybooks'tan 29 FR + 29 ES (CC BY), `scripts/build-storybooks.ts` → `src/data/storybooks/{fr,es}.json` (sayfa metni, tam ses, sayfa resimleri, künye, sayfa sayfa Türkçe). Okuma → "Kolay resimli hikâyeler"; `ReadingText.turkish/images/credit`; "Türkçesi" bu metinlerde kendi Türkçesini kullanır (DeepL'e gitmez). Listede `audioUrl` yalnızca başlık sayfasının sesiydi; tam ses sayfadaki `#audioplayer`'dan alınır.
- Güvenlik ve yeni alan adı (#139): `nigalingo.online` izni, CSP (report-only), `docs/GUVENLIK.md`, güvenlik başlıkları (`x-frame-options`, `strict-transport-security` vb.).
- Hata koruması ve savunmacı tarihler (#136, #148): okuma kütüphanesinde `Date` saklanan metinler (`addedTime()`, #136); `meta` ve yedek kayıtlarında `Date` veya `{}` gelebilecek alanların çökmesini önleyen savunmacı `timeOf()` ve otomatik normalizasyon (#148).
- Veri araştırmaları (#142–#147): `docs/veri/` altında isim cinsiyeti tamamlama (#142), fiil kapsamı (#143), İspanyolca ses kaynakları (#144), eksik Türkçe anlamlar (#145), Tatoeba örnek cümle kapsamı (#146), bozuk ses bağlantıları denetimi (#147).
- Animasyon denetimi (#141): `docs/ANIMASYON-DENETIMI.md` hareket tokenları ve takılma analizleri.
- Bugün sadeleşti (#116): tek öneri, uzun günde "yeni kelimeyi 8'e indir", ek çalışma günün tekrarı bitince; tekrarlar bitince cümle kartı / geri çeviri kutucuğu (#124).
- Rozetler (#103, #105, #107, #109, #110, #112): kazanılma günlüğü, kademeli rozetler, zaman tüneli.
- Antigravity: #101, #102, #104, #106, #108, #115 (metin birliği), #117/#119/#123/#126 (Fast Refresh uyarıları; oxlint artık 0 uyarı), #121 (kararsız E2E), #128 (img alt metinleri), #130, #135, #137, #138, #141–#148.
- Fiil laboratuvarı sadeleştirme (#90 günlük tur, #93 3 sekme/4 mod, #97 arama şeridi + katlı listeler, #99 sade ders başlığı). Tur mantığı: `src/engine/labTour.ts`.
- Fiil laboratuvarı listesi (#71–#77).
- Tasarım kuralları `DESIGN.md` (#79).
- Kişisel öğrenme analizinden çıkanlar:
  - #80: oyunlarda tekrar zamanı gelen kelime gerçek tekrar sayılır;
  - #81: Oyunlar'da "önce bugünkü tekrarlar" notu;
  - #82: okumada sona gelince karşılaşmalar kaydedilir;
  - #84: deyimler cümle içinde sorulur;
  - #85: Zamana karşı'da yazma modu.
- Görsel dokunuşlar (#86).
- Kod temizliği (#87) ve sözlük dizini hızlandırma (#88).
- Antigravity: #64–#70, #83, #91 (satır içi stiller), #92 (kategori renk tokenları).

- Depo **özel (private)**; Actions kotası bu ay dolu, CI çalışmıyor. PR'lar yerelde tam doğrulamayla (typecheck, oxlint, vitest, E2E) birleştiriliyor. Görsel test referansları (Linux) kota dönünce `gh workflow run snapshots.yml --ref main` ile yenilenmeli (#86 sekme göstergesi, #81 Oyunlar notu, #85 Zamana karşı, #116 Bugün, #120/#122/#127 okuma araç satırı, #122/#125 Oyunlar, #129 İlerleme kapsam kartı, #133 okuma kaynakları değişti).
- **Aynı klasörde iki ajan:** Antigravity ile Claude Code aynı anda `~/Downloads/kelime-koc`'ta çalışınca, dal değiştirme commit edilmemiş değişiklikleri sildi (2026-10-08). Claude Code artık ayrı bir git worktree'de (`~/Downloads/kelime-koc-claude`) çalışıyor. Başka dala geçmeden önce `git status`'a bak; commit edilmemiş başkasına ait değişiklik varsa dokunma.
- **E2E portu:** iki klasör aynı anda test koşarsa aynı önizleme sunucusunu paylaşıp birbirinin derlemesini test eder (`reuseExistingServer`). Port `E2E_PORT` ile ayarlanır: Claude Code `E2E_PORT=4180`, Antigravity `E2E_PORT=4181`. İki ajan aynı anda yoğun test koşunca bazı birim/E2E testleri zaman aşımıyla düşebilir; tek başına tekrar çalıştırıp doğrula.

## Bekleyenler (2026-10-09 akşam)
- **Kullanıcı:** hafta sonu yeni özellikleri deneyecek (geri çeviri, dikte, gölgeleme, kaçırdıkların, LanguageTool, hikâyeler); haftaya yeni yedek dosyası verecek → kişisel öğrenme analizi (bu özellikler kullanılıyor mu, dikte en çok neyi kaçırıyor, cümle kartlarının tutma oranı, CEFR seviyesine göre kapsam).
- Kullanılabilirlik incelemesi ve raporu: `docs/KULLANILABILIRLIK.md`.
- Görsel test referansları: Actions kotası dönünce (`gh workflow run snapshots.yml --ref main`).

## Sıradaki olası işler
- LibriVox + Gutenberg (B1+ sesli kitaplar), COERLL (Français interactif) dil bilgisi içeriği — `docs/kaynaklar` raporundaki sıra.
- Kullanıcı 1–2 hafta sonra yeni yedek verince öğrenme analizi: geri çeviri ve dikte kullanılıyor mu, dikte en çok hangi kelimeleri kaçırıyor, cümle kartlarının tutma oranı.
- Fiil laboratuvarı Ayarlar → Kullanım'daki sayımlara bakıp hiç kullanılmayan modları sadeleştirmek (birkaç hafta veri birikince).

## Kullanıcıya önerilen ama onun yapacağı
- Ayarlar'da günlük yeni kelimeyi 20'den 5–8'e indirmesi (#52 birleşince Ayarlar "N yap" önerir).
- İsterse yedek dosyasını (Ayarlar → Veriler → Yedeği indir) proje klasörüne koyup kişisel öğrenme analizi istemesi.

## Daha fazla bağlam
- `docs/ANTIGRAVITY-GOREVLER.md`: Antigravity'nin görev listesi (turlar, dosya sahipliği, PR kontrol listesi).
- `PLAN.md`, `docs/YAPILACAKLAR.md` (yapılanlar ve açık kalanlar, tarihli notlar), `docs/YOUTUBE.md`.
- PR açıklamaları neyin neden yapıldığını Türkçe ve ayrıntılı anlatıyor: `gh pr view N`.
