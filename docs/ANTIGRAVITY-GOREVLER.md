# Antigravity için görev listesi

Bu dosya Antigravity'ye verilecek işleri, sırasını ve çalışma kurallarını toplar. Yük yavaş yavaş artırılır: önce küçük ve izole işler, sorunsuz giderse orta, en sonda büyük. Her tur bitince kullanıcı bir sonrakine geçilip geçilmeyeceğine karar verir.

Son güncelleme: 2026-10-11 (11. tur tamamlandı).

## Önce oku
- `AGENTS.md` (çalışma kuralları, tuzaklar, komutlar) ve `DESIGN.md` (renk/yazı/hareket tokenları, bileşenler, Yap/Yapma).
- `docs/KULLANILABILIRLIK.md` (bu görevlerin çoğu oradaki önerilerden çıkıyor, numaraları yanında).

## Çalışma kuralları
- **Ayrı git worktree'de çalış** (`~/Downloads/kelime-koc-antigravity` gibi), `E2E_PORT=4181` kullan. Claude Code `~/Downloads/kelime-koc-claude` ve port 4180'i kullanıyor.
- **Her PR tek konu.** Başlık ve açıklama Türkçe, kod/yorum/commit İngilizce. Açıklamada neyin neden yapıldığını yaz.
- **Push etmeden önce yerelde tam doğrula:** `npm run typecheck`, `npx oxlint src api e2e` (0 uyarı), `npx vitest run`, `npx vite build && npx playwright test e2e/phone.e2e.ts e2e/desktop.e2e.ts e2e/a11y.e2e.ts --workers=4`.
- **Gereksiz push yapma:** Actions dakikaları dolu, Vercel Hobby'de günde 100 dağıtım var. Bir PR'a art arda küçük commit atma; hepsini yerelde bitirip tek seferde push'la.
- **Arayüzde sitenin kendi sınıflarını ve bileşenlerini kullan** (`card`, `section-title`, `chip`, `btn`, `Popover`, `Toggle`, `GroupToggle`…). Yeni görsel dil uydurma. Ekran değişen her PR'a **telefon (375 px)** ekran görüntüsü ekle; koyu temada da bak.
- Yeni metinler Türkçe, sade ve mevcut üsluba uygun (`docs/METIN-DENETIMI.md`).
- Görsel test referansı (`*-linux.png`) elle değiştirme; kota dönünce `snapshots.yml` ile yenilenir. `*-darwin.png` asla commit edilmez.
- Kalıcı veride tarih alanlarını string varsayma (`addedTime()`, `timeOf()`).

## Dosya sahipliği (çakışmayı önlemek için)
| Kimde | Dosyalar |
|---|---|
| Antigravity | `src/ui/Words.tsx`, `src/ui/Progress.tsx`, `src/ui/SettingsScreen.tsx`, `docs/`, `scripts/`, `e2e/` |
| Claude Code | `src/ui/Reading.tsx` (+ `ReadingBooks.tsx`, `ReadingLibrary.tsx`, `CoverageCard.tsx`, `WordCard.tsx`, `SingleUnknownSentences.tsx`, `readingHelpers.tsx`, `TextForms.tsx`), `src/ui/Screens.tsx` (Bugün), `Onboarding.tsx`, `SessionSummary.tsx`, `src/ui/verbs/`, `src/engine/` |
| Ortak (önce haber ver) | `src/App.tsx` (+ `AppScreens.tsx`, `appNav.ts`, `lazyScreens.ts`, `ui/AppSidebar.tsx`), `src/index.css`, `src/data/db.ts` |

`src/index.css`'e yeni kuralı dosyanın **sonuna**, kendi başlığıyla ekle (çakışma çıkmasın). Sahip olmadığın bir dosyaya dokunman gerekirse PR açıklamasında belirt.

---

## 1. tur: ısınma (3 küçük PR)

### 1.1 Çevrimdışı göstergesi
*Rapor: öncelik 1, madde 2.*
- İnternet yokken üst çubukta küçük, sakin bir "Çevrimdışı" rozeti; çevrimiçine dönünce kaybolsun. `src/ui/useOnline.ts` zaten var, kabuğa (`App.tsx`) bağla.
- Metin ve renk sakin olsun (uyarı kırmızısı değil), erişilebilir ad (`role="status"`).
- Test: Playwright `context.setOffline(true/false)` ile rozetin görünüp kaybolduğunu doğrula; telefonda üst çubuğa sığdığını kontrol et.

### 1.2 Alt sekmelerin görünürlüğü
*Rapor: öncelik 1, madde 1.*
- Pratik / Kelimeler / Okuma ekranlarında üstteki `.hub-tab` şeridinin telefonda fark edilmesi: seçili sekmenin belirginliği, yatay kaydırılabiliyorsa kenarda soluk bir ipucu (taşan sekmenin yarısı görünsün veya kenar solması).
- Yeni bileşen yazma, mevcut `.hub-tabs` CSS'ini geliştir. Ekran görüntüsü: üç ekran, açık ve koyu.

### 1.3 Test boşlukları
- `src/engine/` altında adıyla eşleşen test dosyası olmayan modülleri çıkar (`review`, `scheduler`, `progress`, `quests`, `selection`, `mastery`, `bosses`, `race`, `rng`…). Başka testlerde dolaylı kapsanıp kapsanmadığına bak (`npx vitest run --coverage` varsa kullan).
- En kritik 5 modüle davranışı belgeleyen birim testi yaz. **Davranışı değiştirme.** Bulduğun hatayı düzeltmeden PR açıklamasına yaz.

**Tur sonu ölçütü:** üç PR'ın üçü de yerel doğrulamayı geçmiş, ekran görüntüleriyle, tek konuyla.

---

## 2. tur: orta (3–4 PR; 1. tur sorunsuzsa)

### 2.1 İlerleme ekranında katlanabilir kartlar
*Rapor: öncelik 2, madde 5.* `Progress.tsx`: "En iyi saatler", "Hata geçmişi" gibi ikincil analizleri `GroupToggle` ile katla (varsayılan telefonda kapalı, geniş ekranda açık); seçim hatırlansın (`localStorage`, `try/catch` ile). Mevcut `JumpNav` bozulmasın.

### 2.2 Çoklu CEFR filtresi ve sözlük düzeltme notu
*Rapor: öncelik 3, madde 7–8.* Kelime listesinde birden çok seviye seçimi (A1+A2 gibi); sözlükten gelen bir veriyi düzeltince çıkan notun keşfedilebilirliği. `Words.tsx` sende.

### 2.3 Kullanılabilirlik raporunun kalan sürtünmeleri
`docs/KULLANILABILIRLIK.md` bölüm 5'teki maddelerden küçük olanları seç; her birini ayrı PR yap.

### 2.4 Görsel referansları yenileme
Actions kotası dönünce `gh workflow run snapshots.yml --ref main`; oluşan farkları tek tek gözle onayla (`AGENTS.md`'deki liste), beklenmeyen fark varsa nedenini bul.

**Tur sonu ölçütü:** her PR'da telefon ekran görüntüsü, hiçbir mevcut testin silinmemesi.

---

## 3. tur: büyük (yalnızca 1. ve 2. tur sorunsuzsa, kullanıcı onayıyla)

### 3.1 `Words.tsx` bölme (1634 satır)
- **Davranışı değiştirmeden** bileşenlere ayır (liste, araç çubuğu, satır, galeri, ekleme menüsü…). Önce mevcut testleri yeşil tut, sonra taşı. Tek PR, ama commit'ler mantıklı adımlar halinde olsun ki gözden geçirilebilsin.
- Bu sürede Claude Code `Words.tsx`'e dokunmaz.
- Ölçüt: dış davranış ve CSS sınıfları aynı; E2E ve görsel testler değişmeden geçer; hiçbir dosya ~500 satırı geçmez.

### 3.2 `SettingsScreen.tsx` bölme (844 satır)
Aynı yöntem: bölüm bölüm ayır (Görünüm, Sorular, Veriler, Hesap…). Ayar anahtarları ve kayıt biçimi **değişmez**.

---

## 4. tur: içerik araştırması ve bakım (TAMAMLANDI — #165, #166, #170, #172, #173)

Claude Code'un çalıştığı ortamın ağı kısıtlı: LibriVox, Gutenberg, archive.org, Wikisource ve COERLL'e **erişemiyor**. Bu yüzden internet gerektiren araştırma işleri sende. Yöntem `docs/kaynaklar/` ile aynı: önce rapor ve doğrulanmış liste, uygulamaya bağlama ayrı PR.

### 4.1 LibriVox + Gutenberg: B1+ sesli kitaplar (rapor + liste)
- Fransızca ve İspanyolca, **kamu malı** ve LibriVox kaydı CC0/kamu malı olan kitaplar. Hedef: kısa (≲ 2 saat) veya bölümlü, B1–B2 okunabilirlikte 15–20 eser (masallar, kısa öyküler, Maupassant, Daudet, Clarín, Bécquer gibi).
- Her eser için: başlık, yazar, dil, süre, **LibriVox MP3 bağlantısı (doğrudan dosya, archive.org üzerinden)**, Gutenberg metin kimliği ve metin bağlantısı, ses ile metnin örtüştüğü doğrulandı mı (aynı baskı/çeviri mi), lisans notu.
- Çıktı: `docs/kaynaklar/audiobooks-fr.json`, `audiobooks-es.json` ve `README.md`'ye bölüm. Bağlantıları **tek tek aç/doğrula** (`HEAD` isteğiyle), bozuk olanı listeye alma. `docs/veri/` altındaki bozuk ses bağlantısı denetimi yöntemini örnek al.
- Bu PR'da uygulama koduna dokunma; bağlama ayrı iş.

### 4.2 COERLL (Français interactif ve İspanyolca eşdeğerleri) dil bilgisi içeriği
- Lisans (CC BY/BY-NC?), biçim (HTML/H5P/PDF), dil bilgisi konuları ve seviyeleri. Uygulamada nasıl kullanılabileceğine dair kısa öneri: konu → Türkçe özet + bağlantı mı, alıştırma verisi mi?
- Çıktı: `docs/kaynaklar/coerll.md` (rapor). Lisansı net değilse **önerme**, nedenini yaz.

### 4.3 `Progress.tsx` bölme (654 satır)
Üçüncü turdaki `Words.tsx` ve `SettingsScreen.tsx` gibi: davranış ve CSS sınıfları aynı, ~500 satırı geçen dosya kalmasın, `JumpNav` ve katlanan kart tercihi aynı çalışsın. Tek PR, adım adım commit.

### 4.4 E2E sağlamlığı
- `e2e/` içinde ekran dışı tembel resimleri, sabit `waitForTimeout`'ları ve ağa bağlı beklemeleri tara (ör. telefondaki alt çekmece testi tembel resmi sonsuza dek bekliyordu, 2 sn zaman aşımıyla düzeltildi).
- Kararsız olabilecek testleri bul, `AGENTS.md`'deki desenlerle (`packApplied`, `page.clock`, ağ taklidi) sağlamlaştır. Test **silme veya atlama yok**.

### 4.5 Kullanılmayan dışa aktarımlar
- Hiçbir yerde içe aktarılmayan `export`ları (ve onlara bağlı ölü dosyaları) tespit et (`ts-prune`/`knip` ya da betik). Önce rapor (`docs/`), sonra yalnızca **emin olduklarını** sil. `src/engine/` ve `src/ui/verbs/` Claude Code'da: oralar için listeyi PR açıklamasına yaz, silme.

### 4.6 TV5Monde ve DELE Ahora: bu içerik kullanılabilir mi? (rapor; TAMAMLANDI — `docs/kaynaklar/tv5monde-dele-ahora.md`)
Kullanıcı sordu: *TV5Monde'daki içerikler telifsiz mi? DELE Ahora'daki (Español) içerikler çevrimiçi ücretsiz yapılabiliyor; onları alamaz mıyız?* Claude Code'un ortamı bu sitelere erişemiyor; **sen** kullanım şartlarını oku.
- Her site için: içeriğin sahibi, **lisans** (CC var mı, "tüm hakları saklıdır" mı), **kullanım/telif şartları** sayfasının bağlantısı ve ilgili cümle (alıntıyla), kopyalama/yeniden yayın/API/RSS/gömme (embed) izni, ücretsiz erişim ile yeniden kullanım izni arasındaki fark.
- Üç düzey ver: (a) **bağlantı vermek** (kaynak listesinde, uygulama içinde "TV5Monde'da aç"), (b) **gömmek** (iframe/oynatıcı, izin veriliyorsa), (c) **kopyalayıp uygulamaya almak** (metin/ses/alıştırma). Her biri için "yapılabilir / izin gerekir / yapılamaz" ve nedeni.
- Yalnızca açık lisanslı (CC BY, CC BY-SA, kamu malı) olanları (c)'ye öner; diğerleri için (a) ya da yazılı izin e-postası taslağı öner (iletişim adresiyle).
- Çıktı: `docs/kaynaklar/tv5monde-dele-ahora.md`. Sonuç ne olursa olsun **uygulama koduna dokunma**; karar kullanıcıda.


**Tur sonu ölçütü:** 4.1 ve 4.2'de her bağlantı elle doğrulanmış, 4.3'te dış davranış aynı, hiçbir test silinmemiş.

---

## 5. tur: ikon denetimi, bileşen testleri ve belgeler (TAMAMLANDI — #177, #179, #181)

**Çakışma uyarısı:** Claude Code şu sıra `src/index.css`'te **animasyon ve hareket** kurallarını (cevap anı, ilerleme çubukları `scaleX`, oturum özeti, bitki sıçraması, süs animasyonları) değiştiriyor. Bu turdaki işler `index.css`'in hareket bölümlerine **dokunmaz**; dokunman gerekirse önce haber ver. Aşağıdaki işlerin çoğu yeni dosya ve `docs/`.

### 5.1 İkon denetimi (rapor; kod yok)
- Çıktı: `docs/IKON-DENETIMI.md`. `src/ui/icons.tsx` (82 ikon, 24 px ızgara, 1.8 px çizgi, yumuşak dolgu) için:
  1. **Tutarlılık tablosu:** her ikon için çizgi kalınlığı, uç/birleşim biçimi, dolgu katmanının opaklığı, görsel ağırlık; `DESIGN.md` kuralından (24 px ızgara, 1.8 px, yuvarlak uç, `currentColor`) sapanlar.
  2. **Kullanım taraması:** kodda ikon yerine emoji, `✓`/`×`/`←` gibi metin karakteri ya da satır içi SVG kullanılan yerler (örn. kapat düğmeleri `×`); hangi ikonun hiçbir yerde kullanılmadığı (ölü ikon).
  3. **Anlam çakışmaları:** aynı ikonun birbirinden farklı işler için kullanıldığı yerler (ör. `SparkleIcon`).
  4. **Eksik ikonlar:** yeni özelliklerin hangileri jenerik bir ikonla duruyor (Çekimler, Dikte, Gölgele, Geri çeviri, Kaçırdıkların, Fiil tekrarı, Çevrimdışı) ve her biri için ayırt edici bir ikon önerisi (kısa tarif; çizimi Claude Code yapacak).
  5. **Boyut ve hizalama:** 14–22 px dışında kullanılan boyutlar, metinle dikey hizası bozuk görünen yerler (`.inline-icon`).
- Her bulgu için `dosya:satır` ver. Telefon ve koyu temada bakıp ekran görüntüsü ekle.

### 5.2 Yeni bölünen bileşenlere test
Son turlarda bölünen dosyalar yeni; davranışı sabitleyen bileşen testi yaz (`@testing-library/react`, mevcut `*.test.tsx` desenine uy). **Davranışı değiştirme.**
- `src/ui/TextForms.tsx` (grup başlıkları, "kez" sayısı, düğmeler, boş durum, `onReview`/`onOpenLab` çağrıları)
- `src/ui/CoverageCard.tsx` (bölge başlığı, açılınca açıklama, önceki okuma satırı, bilinen kelime azsa not)
- `src/ui/WordCard.tsx` (bilinen/bilinmeyen kelime düğmeleri, fiil çekimi satırı, "Bu cümleden dinle" yalnızca zamanlı seste)
- `src/ui/ReadingLibrary.tsx` (`LibraryItem` durum rozeti: Yeni / Okundu / Tekrar oku; `AddTextCard` düğmesi boş taslakta kapalı)
- `src/ui/AppSidebar.tsx` (seçili yer `aria-current`, rozet etiketi, dil düğmesi ve bekleyen tekrar noktası)
- `src/engine/textForms.ts` zaten testli; bileşik zaman için kenar durumlar bulursan (ör. "il n'a jamais mangé", dönüşlü fiiller) hatayı düzeltme, PR açıklamasına yaz.

### 5.3 Erişilebilirlik testi kapsamı
`e2e/a11y.e2e.ts` mevcut desenine uyarak şu ekran/durumlara `axe` taraması ekle: okuma ekranında **Çekimler** kartı açıkken, telefonda kelime **alt çekmecesi** açıkken, **Onboarding** her adımda, oturum **özeti**. Çıkan ihlalleri düzeltmeden önce listele; küçük ve kendi dosyanda olanı düzelt, `Reading.tsx`/`Screens.tsx` gibi Claude Code dosyalarındakileri PR açıklamasına yaz.

### 5.4 Belge güncellemesi
- `AGENTS.md` Durum bölümüne #153–#168 ve sonrası: çekim listesi (`textForms.ts`, bileşik zamanlar, fiil tekrarına ekleme), bölünen dosyalar (`Onboarding`, `SessionSummary`, `AppScreens`, `appNav`, `lazyScreens`, `AppSidebar`, `ReadingLibrary`, `CoverageCard`, `WordCard`), dosya adı tuzağı (`lazyScreens.ts` ile `AppScreens.tsx` büyük/küçük harf), LibriVox/Gutenberg/COERLL'e bu ortamdan erişilemediği.
- `docs/YAPILACAKLAR.md` ve `docs/KULLANILABILIRLIK.md` güncel duruma getir (yapılanları işaretle).

**Tur sonu ölçütü:** 5.1'deki her bulguda `dosya:satır` ve ekran görüntüsü; 5.2–5.3'te hiçbir mevcut test silinmemiş; PR'lar tek konulu.

---

## 6. tur: ses kitabı eşleştirme, testler, erişilebilirlik, metin ve performans (5. tur bitti; kullanıcı istedi)

**Çakışma uyarısı:** Claude Code `src/ui/Reading*.tsx`, `Listening.tsx`, `Session.tsx`, `src/engine/` ve `index.css`'in hareket/ikon bölümlerinde çalışıyor. Aşağıdaki işler bunlara **dokunmaz** (yeni dosya, `docs/`, `scripts/`, `e2e/`, `src/data/audiobooks/`); dokunman gerekirse PR açıklamasına yaz.

### 6.1 LibriVox ses kitapları: bölüm bazlı metin-ses eşleştirme (veri; TAMAMLANDI — `scripts/build-audiobook-chapters.ts`, `src/data/audiobooks/{fr,es}.json`, `docs/kaynaklar/audiobooks-chapters.md`)
Sorun: `docs/kaynaklar/audiobooks-{fr,es}.json`'daki her ses tek bir kitaba (ör. La Fontaine "Livre 01", 44 dk) ait, ama Gutenberg metni tüm eserin tek dosyası. Uygulamada metnin sesi sentence-by-sentence takip edebilmesi için **ses parçası ile metin bölümü birebir** örtüşmeli (aynı kısım, aynı baskı).
- En iyi 6–8 eseri seç (kısa, B1–B2, FR ve ES dengeli). Her biri için **bölüm bölüm**: LibriVox bölüm MP3'ü (doğrudan dosya, `HEAD` ile doğrula), Gutenberg metninde o bölümün **başlangıç ve bitiş işaretleri**, bölüm süresi, ve eşleşmenin doğrulandığı (ses 1–2 dakikasını metinle karşılaştırdığın) not.
- Çıktı: `scripts/build-audiobook-chapters.ts` (Gutenberg düz metnini indirip bölümlere böler, başlık/dipnot/Gutenberg lisans başlığını ayıklar) ve `src/data/audiobooks/{fr,es}.json` (`id`, `title`, `author`, `chapter`, `audioUrl`, `text`, `credit`, `license`). Metin kamu malı; künyede LibriVox okuyucusu ve Gutenberg kimliği yer alsın.
- Uygulamaya bağlama (arayüz) **Claude Code'da**: sen yalnızca veri ve betik; `ReadingText` biçimiyle (`title`, `text`, `audio`, `credit`, `source`) uyumlu alanlar ver.
- Eşleşmesi doğrulanamayan bölümü veriye koyma, raporda "elendi (neden)" listele.


### 6.2 Görsel referansları yenileme (hâlâ açık)
Actions kotası döndüyse `gh workflow run snapshots.yml --ref main`. Son turlarda değişenler: logo (sol üst), yan menü adı, Çeviri ekranı, Oyunlar listesi ve ikonları, okuma araç satırı (Çekimler/Dikte/Gölgele ikonları), ses paneli, fiil turu kartı, oturum özeti kademeli girişi. Beklenmeyen fark çıkarsa nedenini bul ve yaz.

### 6.3 Yeni özelliklere birim testleri (TAMAMLANDI — `useSwipeAway.test.tsx`, `LabTourCard.test.tsx`, `TranslateScreen.test.tsx`, `SessionForgot.test.tsx`, `listenFollow.test.ts`)
- `src/ui/useSwipeAway.ts` (sola kaydırma eşiği, kısa kaydırmada geri yaylanma, fare yok sayılır, dikey hareket kaydırma sayılmaz).
- `src/ui/verbs/LabTour.tsx` `TourCard` (gizle düğmesi, aynı gün hatırlama, ertesi gün yeniden görünme, "Geri al").
- `src/ui/TranslateScreen.tsx` (yön değiştirme çeviriyi yeni metin yapar, "Örnek:" etiketi gönderilmez, aynı cümle bir kez istenir, son çeviriler tekrarsız ve dokununca yeniden açılır).
- `Session.tsx` "Unuttum" (cevap gösterilir, yanlış sayılır, "emin değilim" notları çıkmaz; Alt+U).
- `src/engine/listenFollow.ts` (kenar durumlar: boş liste, tek cümle, süre bilinmiyor [0/undefined], negatif pin sınırları).

### 6.4 Erişilebilirlik kapsamı (TAMAMLANDI — `e2e/a11y.e2e.ts`)
`e2e/a11y.e2e.ts` desenine uyarak `axe` taramaları: **Çeviri ekranı** (sonuç varken ve boşken, açık/koyu/sakin tema), okuma ekranında **"Dışarıda çalış" kartı ve çekimler kartı**, **Unuttum** düğmeli soru ekranı (düğme varken ve tıklandıktan sonra), **çevrimdışı rozeti**. 14 px'e çıkarılan ikon boyutlarının küçük kutularda (onay rozetleri, avatar kalem rozeti) taşmadığı/kesilmediği `clippedContent` ile doğrulandı.

### 6.5 Metin denetimi (TAMAMLANDI — `docs/METIN-DENETIMI.md`, `README.md`, `package.json`, `extension/`)
`docs/METIN-DENETIMI.md` ölçütleriyle: yeni metinler (Unuttum, Çekimler kartı, Çeviri ekranı, "Dışarıda çalış", takip ayarı "Şu an bu cümle okunuyor", fiil turu gizleme) tutarlı ve sade mi denetlendi; **Diloloji** adının geçtiği her yerde (`README.md`, `package.json`, `extension/` manifest, README, popup) isim güncellendi.

### 6.6 Performans raporu (TAMAMLANDI — `docs/PERFORMANS.md`)
`npx vite build` çıktısındaki parçalar (chunk) ve ilk açılış yükü ölçüldü. `docs/PERFORMANS.md`: en büyük 10 parça, ilk açılışta yüklenen kod/veri (~288 kB gzip), bağımlılıklar (@anthropic-ai/sdk, sql.js, dexie), sözlük paketi ve sesli içerik önbellek stratejisi, somut iyileştirme önerileri listelendi.

**Tur sonu ölçütü:** 6.1'de her bölüm bağlantısı doğrulanmış ve metin-ses eşleşmesi notlu; 6.3–6.4'te hiçbir mevcut test silinmemiş; PR'lar tek konulu.

---

## 7. tur: performans uygulaması, güvenlik kopyası testleri ve belgeler (TAMAMLANDI — #199, #201, #202)

**Çakışma uyarısı:** Claude Code şu an `src/data/sync.ts`, `src/data/db.ts` (yedek/geri yükleme), `api/sync.ts`, `src/data/safetyBackup.ts`, `src/ui/DataSettings.tsx`, `src/ui/SyncSettings.tsx` ve ayarların birleştirilmesi üzerinde çalışıyor. Bunlara **dokunma**; testlerini yazarken bile yalnızca *yeni* test dosyası ekle. Okuma ekranı (`Reading*.tsx`) ve ses kitabı arayüzü de Claude Code'da.

### 7.1 Güvenlik kopyası ve eşitleme medya sınırı için arayüz testleri (TAMAMLANDI — #199)
- `src/ui/DataSettings.test.tsx` (yeni, 3 test): bozuk dosya seçilince hata mesajı çıkar ve veriye dokunulmaz; geçerli yedek onay penceresi gösterir; onaydan sonra "Önceki hâle dön" görünür; onaylayınca güvenlik kopyası başarıyla geri yüklenir.
- `src/ui/SyncSettings.test.tsx` (yeni, 2 test): `runSync` `{ skipped: 2 }` dönünce uyarı metni görünür, `skipped: 0` iken görünmez.
- `e2e/a11y.e2e.ts` desenine uyarak Ayarlar → Veriler'de "Önceki hâle dön" satırı ve onay penceresi için `axe` taraması eklendi; mobilde Ayarlar butonuna geçiş sağlamlaştırıldı.

### 7.2 Performans raporunun düşük riskli önerilerini uygula (`docs/PERFORMANS.md` bölüm 6) (TAMAMLANDI — #201)
- **Öneri 2 (TAMAMLANDI — #201):** `src/data/wordpackBuild.ts` ve `src/data/wordpack.ts`: cümle parçaları hem sütun bazlı `{ s, t }` hem TSV dize desteğiyle kompakt çözücüye kavuşturuldu. `src/data/wordpackSentences.test.ts` ile tüm biçimlerin özdeş `Example[]` ürettiği kanıtlandı.
- **Öneri 4:** `src/ui/icons.tsx` ağaç budaması ölçüldü; 82 ikon gzip ile toplamda sadece 5.32 kB olduğu için budama kazancı < 0.5 kB çıktı (< 3 kB eşiği). Kod değiştirilmedi.
- **Öneri 1 (`tenseGuide` tembel yükleme):** `src/engine` üzerinde Claude Code son commit'lerde aktif çalıştığı için çakışma riski nedeniyle atlandı.
- **Öneri 3 (Service Worker precache):** Çevrimdışı riski nedeniyle raporda değerlendirildi, kod değişikliği yapılmadı.

### 7.3 Belgeleri güncelle (TAMAMLANDI — #202)
`docs/YAPILACAKLAR.md` ve `docs/KULLANILABILIRLIK.md`: #168–#201 arası yapılanlar (çekim listesi, çeviri ekranı, unuttum, fiil turu kaydırma, Diloloji adı/logo, medya sınırı + güvenlik kopyası, kompakt cümleler) işlendi. `AGENTS.md`'ye dokunulmadı (Claude Code günceller).

### 7.4 Görsel referansları yenileme (hâlâ açık, 6.2)
GitHub Actions kotası döndüyse `gh workflow run snapshots.yml --ref main`. Kotanın doluluğu devam ettiği için beklemede.

**Tur sonu ölçütü:** 7.1'de hiçbir mevcut test silinmemiş; 7.2'de her PR için önce/sonra boyut tablosu ve değişmeyen davranış testi; PR'lar tek konulu.

---

## 8. tur: yeni özelliklerin erişilebilirliği, iki cihazlı eşitleme testi, İngilizce içerik (TAMAMLANDI — #206, #207, #208)

**Çakışma uyarısı:** Claude Code sıradaki işlerde `src/engine/` (zayıf kelimeleri tekrara katma), `src/ui/Session*.tsx`, `src/ui/Reading*.tsx`, `src/ui/AudiobooksPicker.tsx` ve `src/data/sync.ts` üzerinde çalışabilir. Aşağıdaki işler yeni dosya, `e2e/`, `docs/` ve `scripts/` ile sınırlı; başka dosyaya dokunman gerekirse PR açıklamasına yaz.

### 8.1 Yeni özellikler için erişilebilirlik taraması (TAMAMLANDI — `e2e/a11y.e2e.ts`, #208)
Son turlarda gelenler: **Okuma → Sesli kitaplar** (liste, seviye çipleri, açık bölüm), **Oyunlar → Telaffuz çalışması** (`azureSpeech` anahtarı ve boş durum; `pronScores` ile zayıf kelimeler listesi), **kelime sayfasında "Bana özel cümleler"** (`aiKey` ve Anthropic mock ile öneri listesi), **içe aktarmada "Hangi listeye eklensin?"** (Toplu ekle açıkken "Yeni liste" alanı), **oturum özetinde "Hataların için kısa yorum"** (AI koç notu), **Ayarlar → Eşitleme'de "Eşitlenen veri" satırı** (%50 kota ve %85 uyarı durumu). Tüm taramalar hem koyu (`dark`) hem sakin (`calm`) temalarda sıfır axe ihlaliyle başarıyla tamamlandı (20 test yeşil).

### 8.2 İki cihazlı eşitleme E2E (TAMAMLANDI — `e2e/sync.e2e.ts`, `playwright.config.ts`, #207)
İki ayrı tarayıcı bağlamıyla (`browser.newContext()`) `/api/sync` çağrıları bellek içi ETag ve `If-Match` 412 taklidiyle yönetildi. Dört senaryo uçtan uca test edildi: (1) A'da kelime ekleme ve B'nin eşitlemeyle kelimeyi görmesi, (2) İki cihazın aynı anda farklı kelimeler ekleyip yarış durumunda birleştirilmesi (iki kelimenin de korunması), (3) A'da kelime silinmesi ve tombstone ile B'den de silinmesi, (4) B'de ayar değişikliğinin ("Günlük yeni kelime") A'ya sorunsuz yansıması. Gerçek sunucuya istek gitmeden 38.2 saniyede %100 yeşil tamamlandı.

### 8.3 İngilizce için sesli içerik envanteri (TAMAMLANDI — `docs/kaynaklar/english-audio.md`, #206)
5 kaynak incelendi ve `HEAD` istekleriyle doğrudan ses bağlantıları doğrulandı:
- **Global Storybooks:** CC BY 4.0; hemen eklenebilir (A1–B1 seviye, ~30 hikâye).
- **VOA Learning English:** US Hükümeti kamu malı (Public Domain); CORS açık doğrudan MP3'ler ile hemen eklenebilir (B1–B2).
- **LibriVox + Gutenberg:** Public Domain; doğrudan MP3 ve Gutenberg metinleriyle bölümlü olarak eklenebilir (B1–B2).
- **Simple English Wikipedia:** CC BY-SA 4.0; sesli makaleler doğrudan OGG/MP3 formatında eklenebilir.
- **BBC Learning English:** Tüm hakları saklıdır (All Rights Reserved); üçüncü tarafların içeriği gömmesi veya çekmesi YASAKTIR. Yalnızca dış bağlantı ("BBC'de dinle") verilebilir.

### 8.4 Performans raporunun kalan maddeleri (`docs/PERFORMANS.md` bölüm 6; DEĞERLENDİRİLDİ)
- **Öneri 1 (`tenseGuide` tembel yükleme):** `src/engine/` üzerinde Claude Code son commit'lerde (`5c552a2`, `dc52de6`, `a418d7e`, `0dfec007`) aktif çalıştığı için kural gereği çakışmayı önlemek amacıyla ertelendi.
- **Öneri 4 (ikon budama):** 82 ikon gzip ile toplamda yalnızca 5.32 kB tuttuğundan, kullanılmayan ikonları budamanın kazancı < 0.5 kB çıktı (< 3 kB kuralı). Bilerek kod değişikliği yapılmadı.

### 8.5 Belge güncellemesi (TAMAMLANDI)
`docs/YAPILACAKLAR.md`, `docs/KULLANILABILIRLIK.md` ve `docs/ANTIGRAVITY-GOREVLER.md`: #204–#208 arası yapılanlar (Sesli kitaplar, oturum yorumu, eşitleme boyutu ve kota satırı, kişisel cümleler, telaffuz çalışması, içe aktarmada liste seçimi, iki cihazlı senkronizasyon testi ve İngilizce sesli içerik raporu) işlendi. `AGENTS.md`'ye dokunulmadı.

### 8.6 Görsel referansları yenileme (KOTA NEDENİYLE BEKLEMEDE)
GitHub Actions aylık 2.000 dk çalışma kotası hâlâ dolu olduğu için workflow tetiklenemedi (`spending limit needs to be increased`). Referans yenileme kotanın dönmesiyle birlikte yürütülecektir.

**Tur sonu ölçütü:** 8.1'de hiçbir mevcut test silinmemiş ve her yeni tarama koyu + sakin temada; 8.2'de dört senaryo da geçiyor ve gerçek sunucuya istek yok; 8.3'te her kaynakta lisans ve bağlantı doğrulaması notlu; PR'lar tek konulu.

---

## 9. tur: yeni oyunlar için içerik ve denetim (kullanıcı istedi; 8. tur bitti)

**Bağlam:** Claude Code şu oyunları ekledi: **Dilbilgisi soruları** (`src/engine/grammar.ts`, `src/data/grammar/{fr,es,en}.json`), **Refleks turu** (`src/engine/reflex.ts`, `src/data/reflex/phrases-1.json`), **Tuzak kelimeler** (`src/engine/traps.ts`, `src/data/traps/{fr,es,en}.json`, kelime sayfasında ve sözlükte "Tuzak kelime" çipi), **Ses ayırt etme**'ye yeni çiftler ve çift başına kayıt (`src/engine/listening.ts`) ve **Geri çeviri döngü modu** (`src/engine/backTranslation.ts`). Her veri klasörü `import.meta.glob` ile okunur: **yeni bir `*.json` dosyası koymak yeni içerik ekler, kodda değişiklik gerekmez.**

**Çakışma uyarısı:** Claude Code `src/engine/`, `src/ui/games/`, `src/ui/Games.tsx`, `src/data/db.ts`, `src/data/sync.ts` üzerinde çalışıyor. Aşağıdaki işler **yeni veri dosyaları, `e2e/`, `docs/` ve `scripts/`** ile sınırlı. Mevcut veri dosyalarını (`*-1.json`, `fr.json`, `es.json`, `en.json`) düzenleme; yeni dosya ekle. Başka dosyaya dokunman gerekirse PR açıklamasına yaz.

**Genel kurallar (veri için):** Sadece lisansı belli kaynaklardan al ya da kendin yaz; her kayıtta `source` alanına kaynak + lisans yaz (örn. `"Wiktionary (CC BY-SA 4.0)"`, `"Diloloji (özgün)"`). Uydurma kayıt yok: emin olmadığın bir şeyi ekleme, raporda "doğrulanamadı" diye listele. Türkçe karşılıklar doğal Türkçe olsun. Her yeni dosyanın doğruluğunu `npx vitest run src/data` ile sına (veri bütünlüğü testleri var).

### 9.1 Tuzak kelime (yalancı eşdeğer) listesini genişlet (veri)
- Yeni dosyalar: `src/data/traps/fr-2.json`, `es-2.json`, `en-2.json`. Şema `src/engine/traps.ts` içindeki `TrapWord`: `{ id: "<dil>-<lemma>", language, lemma, looks, trap, meaning, text, tr, source }`. Örnek için `src/data/traps/fr.json`'a bak. `id` mevcutlarla çakışmasın.
- Her dil için en az **40 yeni kelime**: Fransızca/İspanyolca için İngilizceye benzeyenler (`looks` = İngilizce kelime), İngilizce için Türkçeye benzeyenler (`looks` = Türkçe kelime). Türkçe öğrenen biri için asıl tuzaklar: Fransızca/İngilizce kökenli Türkçe sözcüklerin (pasta, kolej, şef, pansiyon, dekolte, kabine, kondisyon, mevsim gibi) hedef dilde başka anlam taşıdığı durumlar; bunları ayrıca `looks` Türkçe olacak şekilde ekle.
- `trap` = benzeyen kelimenin düşündürdüğü yanlış anlam, `meaning` = gerçek anlam (kısa Türkçe), `text` = o kelimenin geçtiği kısa, doğal bir hedef dil cümlesi (kelime olduğu gibi ya da çekimli geçebilir), `tr` = Türkçesi.
- Rapor: `docs/kaynaklar/tuzak-kelimeler.md` (kaynaklar, lisans, kaç kayıt, doğrulanamayan adaylar).

### 9.2 Refleks turu kalıplarını genişlet (veri)
- Yeni dosya: `src/data/reflex/phrases-2.json` (şema `ReflexPhrase`: `{ id, group, tr, fr, es, en }`; örnek `phrases-1.json`). Tek dosyada dört dil yan yana olur: aynı durumun Türkçesi, Fransızcası, İspanyolcası, İngilizcesi.
- **En az 60 yeni kalıp.** Mevcut gruplar: görüş, rica, tepki, plan, sorun, günlük. Yeni gruplar ekleyebilirsin: iş/ofis, seyahat, sağlık, alışveriş, telefon, sosyal (tanışma, davet, özür). Her kalıp **en çok 8 kelime**, günlük konuşmada gerçekten kullanılan hâliyle; kitap dili değil. Aynı dilde iki kalıp aynı metin olmasın (test bunu denetler).
- Dikkat: Fransızca "tu/vous" ve cinsiyetli biçimlerde (`fatigué(e)`) tek bir doğal biçim seç.
- Rapor: ek olarak PR açıklamasında kalıpların hangi kaynağa göre kontrol edildiğini yaz (Tatoeba, Wiktionary, sözlükler).

### 9.3 Dilbilgisi sorularını gözden geçir ve genişlet
- **(a) Gözden geçirme (rapor; kod yok):** `src/data/grammar/{fr,es,en}.json` içindeki 96 soruyu, cevap ve Türkçe kural açıklamalarıyla, birer birer doğrula. Birden fazla doğru cevap çıkan, tartışmalı ya da yanlış olan her soruyu `docs/veri/gramer-gozden-gecirme.md` dosyasına (soru kimliği + sorun + önerilen düzeltme) yaz. JSON'u kendin düzeltme; Claude Code düzeltir.
- **(b) Yeni sorular:** `src/data/grammar/fr-2.json`, `es-2.json`, `en-2.json`. Şema `GrammarExercise` (`src/engine/grammar.ts`): `type` = `cloze` (boşluk `___`, cevap `answer`, `alternatives` ile diğer doğrular) / `choice` (`options` içinde tek doğru) / `error` (cümlede hatalı kelime `answer`, doğrusu `fix`). `topic` mevcut anahtarlardan biri olsun ya da yeni konu eklersen `TOPIC_NAME` listesine eklenmesi için PR açıklamasında yaz (konu adını Türkçe öner). Dil başına en az 40 soru, B1–C1, kural açıklaması Türkçe ve tek cümleden uzun olabilir ama net olsun. COERLL (Français interactif, español), Tatoeba ve Wiktionary kural sayfalarından esinlen; lisanslı metni birebir kopyalıyorsan `source`'a lisans yaz, aksi hâlde kendi cümleni kur.
- Zor sorular, belirsiz cevaplar yok: bir boşluğa iki farklı sözcük uyuyorsa `alternatives` ekle ya da soruyu at.

### 9.4 "Ses ayırt etme" yeni çiftleri: kayıt denetimi (rapor)
- `src/engine/listening.ts` içindeki `MINIMAL_PAIRS`'e son 30 kadar yeni çift eklendi (İngilizce 14, Fransızca 7, İspanyolca 5). Oyun, kelimelerin ana dili konuşanların kayıtlarını `nativeRecordings()` (`src/data/wordInfo.ts`) ile arıyor. Her yeni çift için iki kelimenin de **en az iki farklı konuşmacının** kaydı olup olmadığını (Forvo, Shtooka, Wikimedia Commons; lisansa dikkat) kontrol et.
- Rapor: `docs/veri/minimal-cift-kayitlari.md` (çift, her kelimenin kaç kaydı, lisans, kaynak). Kaydı hiç olmayan çiftler için aynı ses farkını taşıyan alternatif çift öner. Çiftlerin Türkçe karşılıklarındaki hataları da işaretle.

### 9.5 Erişilebilirlik taraması (E2E; `e2e/a11y.e2e.ts`)
Yeni ekranlar için `axe` taraması, hem koyu (`dark`) hem sakin (`calm`) temada, sıfır ihlal: **Oyunlar → Dilbilgisi soruları** (giriş, boşluk sorusu, seçenek sorusu, hatalı kelime sorusu, cevap sonrası açıklama, tur sonu), **Refleks turu** (süreli ve süresiz; süre çubuğu animasyonu axe'i bozmasın), **Tuzak kelimeler** (soru ve cevap), **kelime sayfasında ve Sözlük'te "Tuzak kelime" çipi** (örn. Fransızca "actuellement" kelimesini ekleyip aç; çipin renk kontrastı koyu temada da yeterli mi), **Geri çeviri** (döngü çipleri). Testleri uzun tutma: bir testte çok tarama varsa `test.setTimeout` ver.

### 9.6 Günün mikro haberi için kaynak araştırması (rapor; kod yok)
`docs/GELISIM-FIKIRLERI.md` fikir 6: **RFI Savoirs (Le journal en français facile)**, **VOA Learning English**, İspanyolca için eşdeğer (RTVE "Telediario", "Radio Francia Internacional – en español", "VOA Noticias", "Deutsche Welle Aprender español"/benzeri) için: RSS/API adresi, günde kaç içerik, ses + tam transkript var mı, **lisans ve yeniden kullanım şartları** (özellikle uygulama içinde gösterim ve ses akışı), tarayıcıdan doğrudan çekmeye CORS izni, ses bağlantısının kalıcı olup olmadığı, seviye (A2–C1 tahmini). Rapor: `docs/kaynaklar/gunun-haberi.md`; uygun olanı sıralı öner. `HEAD` ile doğrulanmamış bağlantıyı "doğrulanamadı" diye işaretle.

### 9.7 Belge güncellemesi
`docs/YAPILACAKLAR.md` ve `docs/KULLANILABILIRLIK.md`: #209–sonrası yapılanlar (hesap onayı, dilbilgisi soruları, refleks turu, tuzak kelimeler, ses ayırt etme çiftleri, geri çeviri döngüsü, sesli içerikte devam, yenilikler kartı). `AGENTS.md`'ye dokunma (Claude Code günceller).

### 9.8 Görsel referansları yenileme (Aralık'ta; KOTA)
Kota dönene kadar bekle (8.6).

**Tur sonu ölçütü:** Her yeni veri dosyası `npx vitest run src/data` ile yeşil; her kayıtta `source`; uydurma yok ve doğrulanamayanlar raporda ayrı listede; 9.5'te hiçbir mevcut test silinmemiş, yeni taramalar koyu + sakin temada; PR'lar tek konulu.

---

## 10. tur: canlı doğrulama, İspanyolca ses ve yeni özelliklerin içerik denetimi (9. tur bitti; kullanıcı istedi)

**Bağlam:** 9. turdan sonra Claude Code şunları ekledi: **Günün mikro haberi** (`src/engine/news.ts` `FEEDS` başındaki `rfi-facile`, `voa-learning`, `voa-es`; `parseFeed` RSS `<enclosure>` sesini alır; `api/news.ts`), **Çıkarım modu** (`src/engine/deduction.ts`, Okuma'da "Çıkarım" çipi), **Ses ayırt etme**'ye Fransızca Wiktionary yedeği (`frAudioFilesOf`, `nativeRecordings`) ve 4 İspanyolca çift, **Kayıt farkı oyunu** (`src/engine/register.ts`, `src/data/register/*.json`; bu turda eklenecek). Claude Code'un ortamında dış sitelere erişim yok: aşağıdakilerin hepsi **gerçek ağ erişimi gerektiriyor.**

**Çakışma uyarısı:** Claude Code `src/engine/`, `src/ui/`, `api/`, `src/data/db.ts`, `src/data/sync.ts` üzerinde çalışıyor. Bu turdaki işler `scripts/`, `docs/`, yeni veri dosyaları ve `e2e/` ile sınırlı. Başka dosyaya dokunman gerekirse PR açıklamasına yaz. Genel veri kuralları 9. turdakiyle aynı (kaynak + lisans satırı, uydurma yok, doğrulanamayanlar raporda ayrı).

### 10.1 Haber beslemelerinin canlı doğrulaması (script + rapor)
Mikro haber için eklenen üç besleme gerçekte çalışıyor mu? `scripts/check-news-feeds.ts` yaz: `src/engine/news.ts`'teki `FEEDS` içinden `rfi-facile`, `voa-learning`, `voa-es` için (a) beslemeyi çek, `parseFeed` ile ayrıştır (kaç madde, kaç tanesinde `audio` var), (b) ilk 3 maddenin sayfasını çek ve `extractArticle` ile çıkan metnin kelime sayısını yaz (80'in altı "başarısız"), (c) `audio` adreslerine `HEAD` at: durum kodu, `content-type`, yönlendirme zinciri, `access-control-allow-origin`. Sonuçları `docs/kaynaklar/gunun-haberi.md` sonuna "Canlı doğrulama (tarih)" bölümü olarak ekle. Bir kaynakta sorun varsa (boş metin, sesi olmayan madde, engelleme) nedenini ve önerilen düzeltmeyi (hangi seçici/başlık) yaz; `src/engine/news.ts`i **sen düzeltme**, Claude Code düzeltir.

### 10.2 İspanyolca ses kayıtları (veri + rapor)
`docs/veri/minimal-cift-kayitlari.md`: İspanyolca çiftlerin hiç kaydı yok. Şunu çıkar: `src/engine/listening.ts` `MINIMAL_PAIRS.es` içindeki tüm kelimeler (eski 10 + yeni çiftler) için Wikimedia Commons / Lingua Libre / Shtooka (`spa-wims-octavio` vb.) üzerinde **lisansı açık** ses dosyası var mı? Kelime başına dosya adı + konuşmacı + lisans: `docs/veri/es-ses-kayitlari.json` (`{ "kelime": [{ "file": "...", "speaker": "...", "license": "..." }] }`) ve kısa bir rapor. Commons dosyaları için `commonsMp3` adres biçimine uyan dosya adı ver. Çekimli fiillerin (está, habló…) kaydı yoksa alternatif çift öner.

### 10.3 Çıkarım modunda hangi kelimeler gizleniyor? (rapor)
`src/engine/deduction.ts` `maskPositions` kuralını gerçek metinlerde dene: `src/data/storybooks/{fr,es}.json`, `src/data/audiobooks/{fr,es}.json` ve 10.1'deki haber metinlerinden dil başına 5 metin al, `analyzeText` ile boş kelime listesi (kimse hiçbir kelime bilmiyor ve `known` boş) ve orta bir kelime listesiyle (en sık 1000 kelime bilinen: `src/data/frequency`) gizlenen kelimeleri listele. Rapor: `docs/veri/cikarim-modu-denetimi.md`: kaç kelime gizlendi, gizlenenlerin kaçı anlamsız (özel ad, tek başına anlaşılmaz sözcük, fiil çekimi vb.), kuralı iyileştirmek için somut öneriler (en az 5 örnekle). Kod değişikliği yok.

### 10.4 Kayıt farkı listesinin denetimi (rapor; Claude Code listeyi ekledikten sonra)
Claude Code `src/data/register/{fr,es,en}.json` içine her dilde günlük / standart / resmî karşılık üçlüleri ekleyecek (örn. `bouffer / manger / se restaurer`). Her üçlüyü bir ana dil kaynağıyla (Wiktionary etiketleri: `informal`, `slang`, `formal`; ya da güvenilir bir sözlük) denetle: kayıt etiketi doğru mu, üç ifade aynı anlamda mı, bölgeye özgü (İspanya/Latin Amerika) mü? `docs/veri/kayit-farki-denetimi.md`: sorunlu kayıtlar + önerilen düzeltme. JSON'u düzeltme, rapor yaz.

### 10.5 Belge güncellemesi
`docs/YAPILACAKLAR.md` ve `docs/KULLANILABILIRLIK.md`: #227 sonrası yapılanlar (çıkarım modu, mikro haber, ses çifti yedeği, kayıt farkı). `AGENTS.md`'ye dokunma.

### 10.6 Görsel referansları yenileme (Aralık'ta; KOTA)
Kota dönene kadar bekle.

**Tur sonu ölçütü:** Her rapor tarih ve komut çıktısıyla; doğrulanamayanlar ayrı listede; yeni veri dosyaları `npx vitest run src/data` ile yeşil; PR'lar tek konulu.

---

## 11. tur: yeni özelliklerin uçtan uca testi, kayıt/tuzak içeriği ve ağ gerektiren denetimler (TAMAMLANDI — #244, #246, #247, #248, #249, #251)

**Bağlam:** 10. turdan sonra Claude Code şunları yaptı: **Bileşik zamanlar** (`typedCompound`, `compoundsAround` in `src/engine/textForms.ts`: Kelime ekle'de boşluklu yazılan "j'ai mangé" fiilin mastarını önerir; Okuma'da "ai"/"mangé"ye dokununca bütün çekim görünür), **çıkarım modu kuralları** (10.3 raporundaki öneriler uygulandı: çift tire ayrılır, tireli kalıplar ve özel adlar gizlenmez, kısa cümleli metinlerde eşik 4 kelime), **kayıt farkı notu** (`RegisterItem.note`, cevaptan sonra bölge notu; 10.4 raporundaki düzeltmeler), **YZ ile eksikleri doldur / kelime öner**, **Günün zihin tohumu**, **Kör nokta röntgeni**, ve bildirilen 7 hatanın düzeltmesi (özellikle tahmin sorusu artık telefonda kelime çekmecesinin içinde).

**Çakışma uyarısı:** Claude Code `src/engine/`, `src/ui/`, `api/`, `src/data/db.ts`, `src/data/sync.ts` üzerinde çalışıyor. Bu turdaki işler `e2e/`, `docs/`, `scripts/` ve **yeni** veri dosyaları ile sınırlı; mevcut veri dosyalarını (`fr.json`, `es.json`, `en.json`, `*-1.json`, `*-2.json`) düzenleme. Başka dosyaya dokunman gerekirse PR açıklamasına yaz. Veri kuralları 9. turdakiyle aynı: her kayıtta `source` + lisans, uydurma yok, doğrulanamayanlar raporda ayrı. Her PR tek konu.

### 11.1 Yeni özelliklerin uçtan uca testleri (`e2e/`; TAMAMLANDI — #244)
`e2e/desktop.e2e.ts` ve `e2e/phone.e2e.ts` üzerinde 5 yeni test: bileşik zaman ekleme ve kart gösterimi, çıkarım modu mobil alt çekmece akışı, YZ ile eksikleri doldur ve kelime öner taklidi, kayıt farkı bölgesel not gösterimi.

### 11.2 Yeni ekranlar için erişilebilirlik taraması (`e2e/a11y.e2e.ts`; TAMAMLANDI — #246)
Oyunlar (Dilbilgisi soruları, Refleks turu, Tuzak kelimeler, Ses ayırt etme, Kayıt farkı, Geri çeviri döngüsü), Bugün (Zihin tohumu, Kelime öner), İlerleme (Kör nokta röntgeni) ve Okuma (Bileşik zaman kartı) için telefon görünümünde, açık ve koyu temalarda `axe` taramaları (26 test yeşil, 0 ihlal).

### 11.3 Bileşik zaman tanıma denetimi (script + rapor; TAMAMLANDI — #247)
`scripts/audit-compounds.ts` ile 10 gerçek metin üzerinde 92 bileşik çekim incelendi; `ne ... plus` / `plaire` false positive analizi, 30 kaçırılan cümle dökümü ve 5 somut çözüm önerisi `docs/veri/bilesik-zaman-denetimi.md` raporunda belgelendi.

### 11.4 Kayıt farkı listesini genişlet (veri; TAMAMLANDI — #248)
`src/data/register/{fr-2,es-2,en-2}.json` ile her dilde 21 yeni üçlü (toplam 63 yeni üçlü) eklendi; İspanyolca bölgesel söyleyişlere bilgilendirici `note` etiketleri yazıldı (`docs/veri/kayit-farki-genisleme.md`).

### 11.5 Tuzak kelime listesinin denetimi (rapor; TAMAMLANDI — #249)
178 kaydın tamamında aksan uyuşmazlığı, tooltip anlatım bozuklukları ve buton şıklarında taşma pürüzleri incelendi; 41 maddelik düzeltme tablosu `docs/veri/tuzak-kelimeler-denetimi.md` raporunda sunuldu.

### 11.6 Haber kaynağı adayları (araştırma raporu, ağ gerekir; TAMAMLANDI — #251)
`scripts/check-news-feeds.ts` betiği aday kaynakları (`--candidates`) test edecek şekilde genişletildi; FR, ES ve EN için 9 yeni haber beslemesi canlı ağ üzerinden denetlenip `docs/kaynaklar/gunun-haberi.md` Bölüm 8'e eklendi.

### 11.7 Belge güncellemesi (TAMAMLANDI)
`docs/YAPILACAKLAR.md`, `docs/KULLANILABILIRLIK.md` ve `docs/ANTIGRAVITY-GOREVLER.md` güncellendi. `AGENTS.md`'ye dokunulmadı.

### 11.8 Görsel referansları yenileme (KOTA)
Actions kotası dönene kadar bekle (`gh workflow run snapshots.yml --ref main`).

**Tur sonu ölçütü:** E2E'ler telefon ve masaüstünde yeşil, mevcut testler silinmemiş; raporlar tarih ve komut çıktısıyla, doğrulanamayanlar ayrı listede; yeni veri dosyaları `npx vitest run src/data` ile yeşil; PR'lar tek konulu.

---

## 12. tur: sözlük ve eşdizim testleri, içerik genişletme, yeni besleme alan adları (11. tur bitti; kullanıcı istedi)

**Bağlam:** 11. turdaki raporlar uygulandı (#253: bileşik zaman motoru ve tuzak kelime verisi; #254: üç yeni haber beslemesi). Ayrıca Claude Code şunları ekledi: **Sözlük → "Sözlüğe kaydet"** (paketi olmayan kelime için DeepL sonucu ya da elle yazılan anlam sözlüğe kalıcı yazılır: `DictionaryNotes.added`, `src/engine/dictionaryNotes.ts`, `src/ui/Dictionary.tsx` `NotFound`/`SavedCard`/`SavedList`; yedek ve eşitlemeye girer), **Birlikte kullanılanlar çipi** (`src/engine/collocations.ts`, `src/data/collocations/{fr,es,en}.json`, kelime sayfası ve Sözlük), **edat/eşdizim dilbilgisi soruları** (`src/data/grammar/{fr,es,en}-4.json`, konular `prep_*`, `colloc_*`), **fiil laboratuvarında "Tek tek" varsayılan** (Liste bir dokunuş uzakta, Tab alandan alana geçer, tek "İpucu: ilk harfler" düğmesi), **Bugün'de canlı tohum** (`Plant` `live`, `.plant-waiting`, `.ring.is-start`).

**Çakışma uyarısı:** Claude Code `src/engine/`, `src/ui/`, `api/`, `src/data/db.ts`, `src/data/sync.ts` üzerinde çalışıyor. Bu turdaki işler `e2e/`, `docs/`, `scripts/` ve **yeni** veri dosyaları ile sınırlı; mevcut veri dosyalarını düzenleme. Başka dosyaya dokunman gerekirse PR açıklamasına yaz. Veri kuralları 9. turdakiyle aynı (kaynak + lisans satırı, uydurma yok, doğrulanamayanlar raporda ayrı). Her PR tek konu.

### 12.1 Yeni üç beslemenin gerçek alan adları (script + rapor; ağ gerekir)
`src/engine/news.ts` `FEEDS` içindeki `salut-linfo`, `hoyhablamos`, `bbc-6min` için `hosts` alanını Claude Code ağsız ortamda **tahminle** yazdı. `scripts/check-news-feeds.ts`i bu üç besleme için çalıştır (`FEEDS`teki tanımlarını kullan: `--feeds salut-linfo,hoyhablamos,bbc-6min` gibi bir seçenek ekleyebilirsin) ve rapora ekle (`docs/kaynaklar/gunun-haberi.md` §9): her beslemenin ilk 5 maddesinin `link` alan adı (`allowedArticle` bunu `hosts` ile karşılaştırır), maddenin `extractArticle` ile çıkan kelime sayısı, `audio` adresi (https mi, `Content-Type`, `Access-Control-Allow-Origin`). `hosts` yanlışsa doğru alan adlarını yaz; `src/engine/news.ts`i **sen düzeltme**, Claude Code düzeltir.

### 12.2 Sözlük ve eşdizim için uçtan uca testler (`e2e/`)
Sözlük ekranının hiç E2E testi yoktu; Claude Code yalnızca bir akış yazdı (`e2e/desktop.e2e.ts` "dictionary: a word the pack lacks…"). Ekle (mevcut testleri silme; `e2e/helpers.ts` `openScreen(page, 'Sözlük')` var):
- **Telefon (375 px):** aynı akış: bulunamayan kelime → "DeepL ile çevir" (`/api/translate` taklidi: `startWithSamples` çeviriyi 503 ile kapatır, taklidi **sonra** kurup yenile; bkz. AGENTS.md) → anlamı düzelt → "Sözlüğe kaydet" → yenile → kayıtlı kelime kartı → "Sözlükten kaldır". Düğme satırı taşıyor mu (`overflow`)?
- **Elle anlam:** DeepL kapalıyken (503) Türkçe anlam yazıp "Sözlüğe kaydet"; "Kelimelerime ekle" ayrı bir yol (kelime ekleme formu açılır, kayıtlı sözlük kaydına dokunmaz).
- **Aranabilirlik:** kaydedilmiş kelimeyi başıyla, aksansız yazılışıyla (`école` ↔ `ecole`) ve Türkçe anlamıyla (`Işık` büyük harf noktasız I) bul.
- **Kelime sayfasında çipler:** Fransızcada `décider` sayfasında "décider de + infinitif" çipi, `question` sayfasında "poser une question"; İspanyolca ve İngilizce için birer örnek; çip örneği ekran okuyucu metni olarak (`.sr-only`) da var.
- **Fiil laboratuvarı:** Alıştırma → "Yaz" varsayılan olarak "Tek tek"; "Liste"de `Tab` ile 6 kişi alanı sırayla; satırlarda "?" düğmesi yok; "İpucu: ilk harfler" tek düğme ve basınca odak kaybolmuyor (`document.activeElement`).
- **Bugün tohumu:** yeni cihazda (henüz cevap yok) `.plant-waiting` var; `prefers-reduced-motion: reduce` emülasyonunda (`page.emulateMedia`) animasyonlar durur (`getComputedStyle(...).animationName === 'none'`).
Telefon ve masaüstü projelerinde ya da gerekçesiyle yalnızca birinde.

### 12.3 İki cihazlı eşitlemede sözlük kayıtları (`e2e/sync.e2e.ts`)
Mevcut iki cihazlı eşitleme testlerinin yanına: cihaz A'da sözlüğe kaydedilen kelime cihaz B'de de bulunur; A'da "Sözlükten kaldır" → eşitlemeden sonra B'de de yok (tombstone `dictadd:<dil>:<kelime>`); B'de daha yeni bir kayıt (anlamı değişmiş) A'daki eskiyi ezer; kaldırıldıktan sonra yeniden kaydedilen kelime canlıdır. `src/data/mergeRules.test.ts`teki "words saved to the dictionary" birim testini örnek al.

### 12.4 Sözlük ekranı için erişilebilirlik taraması (`e2e/a11y.e2e.ts`)
`axe` taraması (telefon, açık + koyu tema): Sözlük boş hâl ("Kaydettiklerin" listesi dolu), bulunamayan kelime kartı (DeepL düğmesi görünürken), DeepL sonucu açıkken (giriş + iki düğme), kayıtlı kelime kartı (`aria-label="Kaydettiğin kelime"`), kelime sayfasında eşdizim çipi. İhlalleri **düzeltme**, dosya + seçici + kural olarak PR açıklamasında listele.

### 12.5 Eşdizim listesini genişlet (veri)
Yeni dosyalar: `src/data/collocations/fr-2.json`, `es-2.json`, `en-2.json` (şema `Collocation` in `src/engine/collocations.ts`: `{ id, language, lemmas, pattern, example, tr, source }`; `lemmas` kalıptaki bütün anahtar kelimeler, kelime sayfaları bunlarla eşleşir; `id` mevcutlarla çakışmasın: `fr-colloc-23`… yerine `fr2-colloc-01` gibi başla). Her dil için **en az 40 yeni kalıp**: sık fiil+edat (*s'occuper de*, *depender de*, *look forward to*), fiil+isim (*prendre une décision*, *echar de menos*, *run a risk*), sıfat+edat (*être capable de*, *ser capaz de*, *be aware of*). Hem İspanya hem Latin Amerika'da geçerli olanları seç (bölgeye özgü olanı alma). Her kalıbı Wiktionary ya da bir ana dil sözlüğüyle doğrula; `example` gerçekçi kısa bir cümle, `tr` doğal Türkçe. Rapor: `docs/veri/esdizim-genisleme.md` (kaynaklar, elenenler). `npx vitest run src/data` yeşil olmalı.

### 12.6 Edat/eşdizim sorularını genişlet ve denetle (veri + rapor)
(a) Yeni dosyalar: `src/data/grammar/fr-5.json`, `es-5.json`, `en-5.json` (şema `GrammarExercise`; konular `prep_<dil>` ve `colloc_<dil>`, `TOPIC_NAME`de var; `id` formatı `<dil>-<konu>-NN`, mevcut `*-4.json` ile çakışmasın: 24'ten başla). Her dil için **en az 20 yeni `choice` sorusu**, tek doğru seçenek; seçeneklerde bölgeye ya da lehçeye göre ikinci bir doğru cevap çıkabiliyorsa o soruyu **sorma** (ör. İspanyolca `poner/prestar atención`, İngilizce `take/make a decision`). Kural açıklaması Türkçe. (b) Mevcut `*-4.json` (69 soru) için 10.4/11.5'teki gibi bir denetim raporu: her sorunun tek doğru cevabı gerçekten tek mi, açıklama doğru mu, kaynak? `docs/veri/edat-esdizim-sorulari-denetimi.md`. Mevcut JSON'u düzeltme, rapor yaz.

### 12.7 Bileşik mastarlar: gerçek metinde ne kadar var? (rapor)
11.3 raporu bileşik mastarları (*pour avoir mangé*, *après être parti*, *después de haber comido*) "kaçırılan" saymıştı; Claude Code bunu henüz uygulamadı (yeni zaman türü ve adlandırma gerektirir). Karar için veri: `scripts/audit-compounds.ts`i genişlet ya da yeni bir script yaz; aynı 10 metinde ve 10 yeni metinde (`src/data/storybooks`, `src/data/audiobooks`, haber beslemeleri) (a) kaç bileşik mastar var (FR: `avoir/être + ortaç` mastar bağlamında: `pour|après|sans|de|d'|en|avant de` sonrası; ES: `haber + ortaç` mastar bağlamında), (b) kaçı mevcut yöntemle yanlış okunuyor (örn. *avoir mangé* → *avoir* tek başına), (c) tüm bileşik çekimlerin yüzde kaçı. Rapor: `docs/veri/bilesik-mastar-analizi.md` + "yapmaya değer mi" önerisi (adlandırma önerisi: Türkçe zaman adı, `Tense` anahtarı). Kod değişikliği yok.

### 12.7b Metin akışı paragraflarını denetle ve genişlet (veri + rapor)
Claude Code yeni "Oyunlar → Metin akışı" oyununu ekledi (`src/engine/flow.ts`, `src/data/flow/{fr,es,en}.json`, şema `FlowItem`: `{ id, language, text, tr, gaps: [{ answer, options, kind, why }], source }`; metinde `{1}`, `{2}` boşlukları; seçeneklerin hepsi aynı büyük/küçük harfle başlar). (a) Mevcut 5×3 paragrafı ana dil kaynaklarıyla denetle: her boşlukta **yalnız doğru seçenek** bağlama uymalı (yanlış seçenekten biri de uyuyorsa not düş), Türkçe çeviriler ve `why` satırları doğru mu? Rapor: `docs/veri/metin-akisi-denetimi.md`. (b) Yeni dosyalar `fr-2.json`, `es-2.json`, `en-2.json`: dil başına en az 6 yeni paragraf (B2–C1: zıtlık, neden, sonuç, taviz, koşul, ekleme; 3–5 cümle, 2–3 boşluk; `id` `<dil>-<ad>` benzersiz). `npx vitest run src/data/flow.test.ts` yeşil olmalı.

### 12.8 Belge güncellemesi
`docs/YAPILACAKLAR.md` ve `docs/KULLANILABILIRLIK.md`: #240–#255 sonrası yapılanlar (kalıcı sözlük kaydı, DeepL araması, eşdizim çipi, edat soruları, Tek tek varsayılanı, canlı tohum, bileşik zaman ve tuzak denetimi, yeni beslemeler). `AGENTS.md`'ye dokunma.

### 12.9 Görsel referansları yenileme (KOTA)
Actions kotası dönene kadar bekle (`gh workflow run snapshots.yml --ref main`). Beklenen farklar: Bugün (canlı tohum, halka), Sözlük, Fiil laboratuvarı yazma alıştırması (Tek tek varsayılan), kelime sayfası (eşdizim çipi).

**Tur sonu ölçütü:** E2E'ler telefon ve masaüstünde yeşil, mevcut testler silinmemiş; raporlar tarih ve komut çıktısıyla, doğrulanamayanlar ayrı listede; yeni veri dosyaları `npx vitest run src/data` ile yeşil; PR'lar tek konulu.

---

## Her PR için kontrol listesi
- [ ] Tek konu, Türkçe açıklama (neyi, neden)
- [ ] `typecheck`, `oxlint` (0 uyarı), `vitest`, E2E yerelde yeşil
- [ ] Telefon (375 px) ve koyu tema ekran görüntüsü (arayüz değiştiyse)
- [ ] Yeni sınıflar `DESIGN.md` tokenlarıyla, satır içi stil yok
- [ ] Başka ajanın dosyasına dokunulduysa açıklamada belirtildi
- [ ] Gereksiz push yapılmadı
