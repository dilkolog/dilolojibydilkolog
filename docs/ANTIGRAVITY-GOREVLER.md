# Antigravity için görev listesi

Bu dosya Antigravity'ye verilecek işleri, sırasını ve çalışma kurallarını toplar. Yük yavaş yavaş artırılır: önce küçük ve izole işler, sorunsuz giderse orta, en sonda büyük. Her tur bitince kullanıcı bir sonrakine geçilip geçilmeyeceğine karar verir.

Son güncelleme: 2026-10-17 (15. tur eklendi: Rehber).

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

### 12.1 Yeni üç beslemenin gerçek alan adları (script + rapor; TAMAMLANDI — `docs/kaynaklar/gunun-haberi.md` §9)
`scripts/check-news-feeds.ts --feeds salut-linfo,hoyhablamos,bbc-6min` ile her beslemenin ilk 5 maddesi canlı sınandı. Tüm maddelerin `linkHost` değerleri (`www.franceinfo.fr`, `www.hoyhablamos.com`, `www.bbc.co.uk`) tanımlı `hosts` değerleriyle (`radiofrance.fr/franceinfo.fr`, `hoyhablamos.com`, `bbc.co.uk/bbc.com`) tam uyumlu çıktı (`allowedArticle` 15/15 geçerli). Metin kelime sayıları 125–900 kelime ve ses akışları HTTP 200 doğrulanıp `docs/kaynaklar/gunun-haberi.md` Bölüm 9'a işlendi.

### 12.2 Sözlük ve eşdizim için uçtan uca testler (`e2e/`; TAMAMLANDI — #257)
Sözlük ekranı, eşdizim çipleri, fiil laboratuvarı odak koruma ve Bugün canlı tohumu için kapsamlı uçtan uca testler eklendi:
- **Telefon (375 px; `e2e/phone.e2e.ts`):** `gribouiller` kelimesi aranır → DeepL çeviri taklidi → anlamı düzenleme → "Sözlüğe kaydet" → reload sonrası "Kaydettiklerin" listesinde görünme → "Sözlükten kaldır" akışı ve `overflow(page) === []` doğrulaması.
- **Elle anlam (`e2e/desktop.e2e.ts`):** DeepL kapalıyken `farfadet` için "Türkçe anlamını yaz…" ile "Sözlüğe kaydet"; ikinci kelime `zigoto` için "Kelimelerime ekle" ile ekleme formuna geçiş ve sözlük kayıtlarının etkilenmediğinin doğrulanması.
- **Aranabilirlik (`e2e/desktop.e2e.ts`):** Kayıtlı `téléguidé` kelimesinin önek (`télé`), aksansız (`teleguide`) ve Türkçe anlamla (`Işık` büyük noktasız I) bulunması.
- **Kelime sayfasında çipler (`e2e/desktop.e2e.ts`):** Fransızca `décider` (`décider de + infinitif`) ve `question` (`poser une question`), İspanyolca `soñar` (`soñar con`), İngilizce `depend` (`depend on`) çiplerinin ve `.sr-only` örnek metinlerinin doğrulanması.
- **Fiil laboratuvarı (`e2e/desktop.e2e.ts`):** Alıştırma → "Yaz" varsayılan "Tek tek"; "Liste"de Tab ile `#lab-in-0`'dan `#lab-in-5`'e geçiş; satırlarda `?` olmaması; "İpucu: ilk harfler" tek butonuna basınca odağın (`document.activeElement`) korunması.
- **Bugün tohumu (`e2e/desktop.e2e.ts`):** Henüz cevap verilmemişken `.plant-waiting` ve `.plant-seed-hop` varlığı; `prefers-reduced-motion: reduce` altında animasyonun `none` olması.

### 12.3 İki cihazlı eşitlemede sözlük kayıtları (`e2e/sync.e2e.ts`; TAMAMLANDI — #270)
Mevcut iki cihazlı eşitleme testlerine senaryo 5 eklendi (`e2e/sync.e2e.ts`):
- Cihaz A'da sözlüğe kaydedilen kelime (`farfadet` -> `küçük peri, cin`) eşitleme sonrasında Cihaz B'de bulunur.
- Cihaz A'da "Sözlükten kaldır" tıklandığında tombstone (`dictadd:fr:farfadet`) eşitlemeyle Cihaz B'ye aktarılır ve B'de de kaybolur.
- Kaldırıldıktan sonra Cihaz A'da güncel zaman damgasıyla yeniden kaydedilen kelime (`orman perisi`) eşitlemeyle Cihaz B'de yeniden canlanır.
- Cihaz B'de güncellenen daha yeni kayıt (`şakacı peri`) eşitlemeyle Cihaz A'daki eski kaydı ezer.

### 12.4 Sözlük ekranı için erişilebilirlik taraması (`e2e/a11y.e2e.ts`; TAMAMLANDI — #271)
Telefon (375 px) açık ve koyu tema axe WCAG 2.2 A/AA taramaları eklendi (`e2e/a11y.e2e.ts`):
1. Sözlük boş hâl ("Kaydettiklerin" listesi `farfadet` ile dolu)
2. Bulunamayan kelime kartı (`gribouiller`, "DeepL ile çevir" düğmesi görünürken)
3. DeepL sonucu açıkken (`karalamak` anlam girişi + "Sözlüğe kaydet" + "Kelimelerime ekle" düğmeleri)
4. Kayıtlı kelime kartı (`aria-label="Kaydettiğin kelime"`)
5. Kelime sayfasında eşdizim çipi (`décider de + infinitif` + `.sr-only` örnek metin)
Tüm durumlarda yapısal WCAG A/AA kuralları 0 ihlalle geçti. Tespit edilen tek kontrast uyarısı: koyu temada `.pos-tag[data-pos="verb"]` (WCAG `color-contrast`, kural gereği düzeltilmedi, PR açıklamasına not düşüldü).

### 12.5 Eşdizim listesini genişlet (veri; TAMAMLANDI — #273)
Fransızca, İspanyolca ve İngilizce için 40'ar yeni eşdizim eklendi (`src/data/collocations/fr-2.json`, `es-2.json`, `en-2.json`):
- Fiil+edat (*s'occuper de*, *tener ganas de*, *focus on*, *cope with*...),
- Sıfat+edat (*être capable de*, *ser capaz de*, *aware of*, *keen on*...),
- Fiil+isim (*passer du temps*, *prestar atención*, *run a risk*, *make progress*...).
Toplam kalıp sayısı 68'den 188'e çıktı (FR: 62, ES: 63, EN: 63). Tüm kalıplar ana dil sözlükleriyle (Le Robert, RAE/DPD, Oxford/Cambridge) doğrulandı; bölgesel/lehçesel sapmalar elendi. Detaylı rapor `docs/veri/esdizim-genisleme.md` altında yayımlandı. `npx vitest run src/data` ve `collocations.test.ts` 0 hatayla geçti.

### 12.6 Edat/eşdizim sorularını genişlet ve denetle (veri + rapor; TAMAMLANDI — #274)
(a) Fransızca, İspanyolca ve İngilizce için 20'şer yeni `choice` sorusu eklendi (`src/data/grammar/fr-5.json`, `es-5.json`, `en-5.json`):
- `prep_<dil>` ve `colloc_<dil>` konularında 60 yeni soru, `id` formatı `<dil>-<konu>-NN` (24'ten başlandı, çakışma yok).
- Her sorunun tek doğru cevabı preskriptif kurallarla doğrulandı; lehçesel/bölgesel ikincil doğrular elendi, kuralların açıklamaları Türkçe yazıldı.
(b) Mevcut `*-4.json` (69 soru) için kapsamlı tek doğruluk, açıklama ve çeldirici denetim raporu `docs/veri/edat-esdizim-sorulari-denetimi.md` yayımlandı (66 soru %100 tartışmasız tek doğru, 3 soruda bölgesel/konuşma dili nüansları belgelendi). `npx vitest run src/data/grammar.test.ts` ve tüm veri testleri yeşil geçti.

### 12.7 Bileşik mastarlar: gerçek metinde ne kadar var? (rapor)
11.3 raporu bileşik mastarları (*pour avoir mangé*, *après être parti*, *después de haber comido*) "kaçırılan" saymıştı; Claude Code bunu henüz uygulamadı (yeni zaman türü ve adlandırma gerektirir). Karar için veri: `scripts/audit-compounds.ts`i genişlet ya da yeni bir script yaz; aynı 10 metinde ve 10 yeni metinde (`src/data/storybooks`, `src/data/audiobooks`, haber beslemeleri) (a) kaç bileşik mastar var (FR: `avoir/être + ortaç` mastar bağlamında: `pour|après|sans|de|d'|en|avant de` sonrası; ES: `haber + ortaç` mastar bağlamında), (b) kaçı mevcut yöntemle yanlış okunuyor (örn. *avoir mangé* → *avoir* tek başına), (c) tüm bileşik çekimlerin yüzde kaçı. Rapor: `docs/veri/bilesik-mastar-analizi.md` + "yapmaya değer mi" önerisi (adlandırma önerisi: Türkçe zaman adı, `Tense` anahtarı). Kod değişikliği yok.

### 12.7b Metin akışı paragraflarını denetle ve genişlet (veri + rapor)
Claude Code yeni "Oyunlar → Metin akışı" oyununu ekledi (`src/engine/flow.ts`, `src/data/flow/{fr,es,en}.json`, şema `FlowItem`: `{ id, language, text, tr, gaps: [{ answer, options, kind, why }], source }`; metinde `{1}`, `{2}` boşlukları; seçeneklerin hepsi aynı büyük/küçük harfle başlar). (a) Mevcut 5×3 paragrafı ana dil kaynaklarıyla denetle: her boşlukta **yalnız doğru seçenek** bağlama uymalı (yanlış seçenekten biri de uyuyorsa not düş), Türkçe çeviriler ve `why` satırları doğru mu? Rapor: `docs/veri/metin-akisi-denetimi.md`. (b) Yeni dosyalar `fr-2.json`, `es-2.json`, `en-2.json`: dil başına en az 6 yeni paragraf (B2–C1: zıtlık, neden, sonuç, taviz, koşul, ekleme; 3–5 cümle, 2–3 boşluk; `id` `<dil>-<ad>` benzersiz). `npx vitest run src/data/flow.test.ts` yeşil olmalı.

### 12.7c Kök ve ek denetimi (`scripts/audit-derive.ts`) ve kaynak araştırması
Claude Code "Kök ve ekler" kartını ekledi (`src/engine/derive.ts`: ek tablosu `AFFIXES`, `derivedWords`, `rootOf`, `familyOf`; kural gevşek üretir, sözlük paketi ve ek türü süzer). Yanlış akrabalıklar (spelling uyuyor ama bağ yok: *heure → heureux*, *légiste ← léger*) `FALSE_COUSINS`ta (`base|word`) elle listeleniyor. (a) `npx tsx scripts/audit-derive.ts en|fr|es 6000` çıktısını oku; her dilde yanlış çiftleri (anlamca ilgisiz, kök yanlış) listele ve `FALSE_COUSINS`a ekle; en az 40 çift/dil gözden geçirilmeli, kalanları `docs/veri/kok-ek-denetimi.md`ye yaz. (b) Ek tablosunda (`AFFIXES`) eksik üretken ek var mı (ör. İngilizce -ize/-ish/-y, Fransızca -iser/-ier, İspanyolca -ero kadın biçimleri)? Türkçe karşılık (`tr`) ve `role` metinleri doğru mu? (c) Paul Nation word families (BNC/COCA), UniMorph, Démonette/DeriNet (FR), MorphoLex, CELEX: lisans ve kapsam raporu, uygulamada hangisi türetme verisi olarak kullanılabilir: `docs/kaynaklar/turetme.md`.

### 12.8 Belge güncellemesi
`docs/YAPILACAKLAR.md` ve `docs/KULLANILABILIRLIK.md`: #240–#255 sonrası yapılanlar (kalıcı sözlük kaydı, DeepL araması, eşdizim çipi, edat soruları, Tek tek varsayılanı, canlı tohum, bileşik zaman ve tuzak denetimi, yeni beslemeler). `AGENTS.md`'ye dokunma.

### 12.9 Görsel referansları yenileme (KOTA)
Actions kotası dönene kadar bekle (`gh workflow run snapshots.yml --ref main`). Beklenen farklar: Bugün (canlı tohum, halka), Sözlük, Fiil laboratuvarı yazma alıştırması (Tek tek varsayılan), kelime sayfası (eşdizim çipi).

**Tur sonu ölçütü:** E2E'ler telefon ve masaüstünde yeşil, mevcut testler silinmemiş; raporlar tarih ve komut çıktısıyla, doğrulanamayanlar ayrı listede; yeni veri dosyaları `npx vitest run src/data` ile yeşil; PR'lar tek konulu.

---

## 13. tur: Rehber içeriğinin denetimi, Supabase güvenlik duman testi, yeni ekranların testleri (kullanıcı istedi)

**Bağlam (12. turdan sonra Claude Code'un ekledikleri):**
- **Rehber** (Pratik → Rehber, `src/ui/Guide.tsx`): dil başına yaklaşık 50 ders (`src/data/guide/lessons-{fr,es,en}{,-2,-3}.ts`, şema `lessonTypes.ts`).
  - Her temel dersin sonunda 3 soruluk **mini sınav** var (`check`; 2 doğru = "öğrenildi").
  - Dilbilgisi konularının dersleri sınav sorularını kendi konusunun `choice` sorularından alır (`src/data/guide/lessonOf.ts` `checkFor`).
  - Okunan ders 3, 10 ve 30 gün sonra Bugün'de **"Hatırlıyor musun?"** kartıyla geri gelir (`engine/guideReview.ts`, `ui/GuideReviewNudge.tsx`).
  - İlgili dersin bağlantısı üç yerde çıkar: yanlış dilbilgisi cevabının altında ("Konunun dersi"), kör nokta kartında ("Dersi oku") ve fiil laboratuvarı teşhisinde ("Bu zamanın anlatımı").
  - İngilizcenin de artık **Zamanlar** sekmesi var.
  - **Dış kaynaklar** sekmesinde 38 bağlantı var (`src/data/guide/resources.ts`).
- **Supabase**: giriş, eşitleme tabloları (`sync_parts`), arkadaş/paylaşım/hatırlatma tabloları (`supabase/migrations/0001…0003`, `docs/SUPABASE.md`).
- Ayrıca: Kartlar ekranı (3B çevirme, 1/2/3 not), Arkadaşlar kartı, seri kurtarma, İlerleme raporu (yazdır/Excel).

**Çakışma uyarısı:** Claude Code `src/ui/`, `src/engine/`, `api/`, `src/data/guide/` ve `supabase/` üzerinde çalışıyor. Bu turdaki işler `e2e/`, `docs/`, `scripts/` ve **yeni** veri dosyalarıyla sınırlı. Mevcut ders dosyalarını düzenleme; düzeltmeleri rapora yaz, Claude Code uygular. Her PR tek konu. Veri kuralları önceki turlardakiyle aynı: kaynak yazılır, uydurma yok, doğrulanamayanlar raporda ayrı listelenir.

### 13.1 Rehber derslerinin dil denetimi (rapor; TAMAMLANDI — `docs/veri/rehber-denetimi.md`)
Üç dilin 144 dersi (\`src/data/guide/lessons-{fr,es,en}{,-2,-3}.ts\`) ana dil kaynaklarıyla (Le Robert / Bescherelle, RAE / DPD / Fundéu, Cambridge / Oxford, Swan) okundu ve denetlendi:
- `lessons-*-3.ts` (yeni B2–C1 dersleri ve İngilizce zamanlar) öncelikli olmak üzere kural doğruluğu, örnek cümle doğallığı, Türkçe çeviriler, "Dikkat" maddeleri ve CEFR seviye uyumu analiz edildi.
- 5 hedeflenmiş preskriptif dilbilgisi önerisi ve düzeltme tablosu \`docs/veri/rehber-denetimi.md\` raporunda yayımlandı. Kural gereği mevcut kodlara dokunulmadı.

### 13.2 Mini sınav sorularının tek-doğru denetimi (rapor; TAMAMLANDI — `docs/veri/rehber-sinav-denetimi.md`)
303 Rehber `check` mini sınav sorusu ve `*-1, 2, 3, 6, 7, 8` kümelerinden 157 seçmeli dilbilgisi sorusu `scripts/audit-guide-quizzes.ts` ile denetlendi:
- Yapısal ve şema bütünlüğü %100 doğrulandı (geçersiz `answer` indeksi veya yinelenen seçenek yok, tüm `why` açıklamaları mevcut).
- 290 soru (%98,6) tartışmasız tek doğru çıktı; 6 soruda bağlamsal/bölgesel seçenek nüansı tespit edilip raporda belgelendi.
- Kapsamlı rapor `docs/veri/rehber-sinav-denetimi.md` yayımlandı.

### 13.3 Dış kaynak bağlantılarının canlı doğrulaması (script + rapor; TAMAMLANDI — `docs/kaynaklar/rehber-baglantilari.md`)
- **Script:** `scripts/check-guide-links.ts` (`npx tsx scripts/check-guide-links.ts`) `src/data/guide/resources.ts`teki 37 adresi (`RESOURCES` + `SHARED_RESOURCES`) canlı ağda yokladı.
- Durum kodları, sayfa başlıkları, bot korumaları (Cloudflare 403 / WordReference 418), lisans ve seviye etiketleri doğrulandı.
- COERLL *Spanish Grammar in Context* için taşınmış adres (`https://www.coerll.utexas.edu/spantex/` -> `https://grammar.spanishintexas.org/`, HTTP 200) tespit edildi.
- Her dil için pedagojik olarak yüksek kaliteli 2–3 yeni ücretsiz kaynak önerisi eklendi.
- Kapsamlı rapor `docs/kaynaklar/rehber-baglantilari.md` dosyasında yayımlandı.

### 13.4 Rehber için uçtan uca ve erişilebilirlik testleri (TAMAMLANDI — `e2e/phone.e2e.ts`, `e2e/desktop.e2e.ts`, `e2e/a11y.e2e.ts`)
- **Telefon (375 px, `e2e/phone.e2e.ts`):** Temel ders (`basics_es_hay_estar`) açıldı, mini sınav 3/3 doğruyla tamamlandı, kartta "Öğrenildi" etiketi doğrulandı; Bugün'de eski tarihli kayıtla "Hatırlıyor musun?" kartı, "Şimdi değil" (X) kapatması ve doğrudan mini sınav başlatması test edildi; `overflow(page) === []` onaylandı.
- **Masaüstü (`e2e/desktop.e2e.ts`):** Dilbilgisi yanlış cevabında "Konunun dersi" bağlantısıyla derse geçiş ve tarayıcı geri tuşuyla soruya dönüş; İngilizce **Zamanlar** sekmesinin 13 zamanı Present simple ile başlayan doğru pedagojik sırada listelemesi; fiil laboratuvarında yanlış çekim sonrasında "Bu zamanın anlatımı" modalının açılıp Esc ile kapanması doğrulandı.
- **Erişilebilirlik (`e2e/a11y.e2e.ts`):** Açık ve koyu temada ders sayfası, mini sınav (soru, cevap gösterilirken, sonuç ekranı) ve Bugün'deki tekrar kartı için axe WCAG 2.2 AA taramaları 0 ihlalle geçti.

### 13.5 Supabase güvenlik duman testi (script + belge; TAMAMLANDI — `scripts/smoke-supabase.mjs`, `docs/SUPABASE.md`)
- **Script:** `scripts/smoke-supabase.mjs` yazıldı. Yalnızca açık (publishable/anon) anahtarla çalışır; gizli anahtar istenmez ve algılansa dahi yoksayılır.
- **Yerel Simülasyon:** `--mock` bayrağı ile sahte Auth, PostgREST ve Storage sunucusu üzerinde 6 güvenlik maddesinin tümü test edildi ve GEÇTİ verdi.
- **6 Güvenlik Maddesi:**
  1. Giriş yapılabilmesi (JWT ve UID doğrulaması);
  2. `put_sync_part` onaysız hesapla `42501` (`approval required`) hatası dönmesi;
  3. Hesap onaylıysa `core` yazılıp geri okunması;
  4. Başka bir kişinin `sync_parts` satırının okunamaması (boş dizi);
  5. `friend_cards`, `shared_lists`, `reminders`, `server_flags`, `sync_keys` tablolarının açık anahtarla hiç okunamaması (0 satır / 401/403);
  6. `media` kovasında başkasının klasörünün listelenememesi / dosyasının indirilememesi.
- **Belge:** `docs/SUPABASE.md` dosyasına "Güvenlik duman testi" başlığı, kullanım komutları ve güvenlik ilkeleri eklendi.

### 13.6 Yeni ekranların uçtan uca testleri (TAMAMLANDI — `e2e/desktop.e2e.ts`)
4 yeni uçtan uca senaryo `e2e/desktop.e2e.ts` dosyasına eklendi ve Playwright ile doğrulandı:
- **Kartlar (Oyunlar → Kartlar):** Kart çevirme (`.flash-turn`), 1 Bilmiyorum notlama (`COME_BACK_AFTER[0] = 3` uyarınca tam 3 kart sonra aynı kartın geri dönmesi), sonuç ekranı (`.flash-done`), kazanılan rozetlerin kapatılması ve "Takıldıklarını çalış" butonuyla takılınan kartlarla yeni turun başlaması.
- **Arkadaşlar kartı:** `/api/access?friends=1` ve POST uç noktalarının taklidiyle Bugün ve Bu hafta sıralama farkı, kod ile arkadaş ekleme ve çıkarma.
- **Seri kurtarma:** Dün boş bırakılarak kırılan seride Bugün ekranında `.streak-repair` teklif kartı, `{name:'exam', repair:true}` sınavının başlatılması, >= %70 başarıyla serinin geri kazanılması ve Bugün ekranında serinin güncellenmesi.
- **İlerleme raporu:** İlerleme ekranında "Paylaş" menüsü: "Yazdır ya da PDF" (`popup` olayı) ile yeni pencerede raporun açılması; "Excel (.xlsx)" (`download` olayı) ile dosyanın indirilmesi ve `fflate` `unzipSync` ile en az 7 çalışma sayfası (`xl/worksheets/sheet*.xml`) içerdiğinin doğrulanması.

### 13.7 Az sorusu olan dilbilgisi konularına soru (veri; TAMAMLANDI — `src/data/grammar/{fr,es,en}-9.json`)
- **Ölçüm & Ekleme:** `grammarExercises` ile ölçülen ve 10'dan az `choice` sorusu olan tüm konulara yeni dosyalarda (`src/data/grammar/{fr,es,en}-9.json`) toplam 68 özgün çoktan seçmeli soru eklendi:
  - **FR (16 soru):** `subjonctif` (+5), `participe_passe` (+4), `pronoms_relatifs` (+3), `conditionnel_passe` (+4).
  - **ES (25 soru):** `subjuntivo` (+5), `ser_estar` (+3), `por_para` (+4), `se_pasivo` (+4), `condicionales` (+5), `perifrasis` (+4).
  - **EN (27 soru):** `inversion` (+5), `cleft` (+5), `mixed_conditionals` (+4), `subjunctive` (+5), `participle_clauses` (+4), `gerund_infinitive` (+4).
- **Sonuç:** `rewrite_*` (cümle dönüştürme) hariç her konuda en az 10 `choice` sorusu tamamlandı. Kimlikler benzersiz, tek doğru seçenekli, Türkçe kural açıklamalı ve `npx vitest run src/data` (453 test) ile tam uyumlu.


### 13.8 Belge güncellemesi (TAMAMLANDI — `docs/YAPILACAKLAR.md`, `docs/KULLANILABILIRLIK.md`)
`docs/YAPILACAKLAR.md` ve `docs/KULLANILABILIRLIK.md` dosyalarına #300–#359 arasında tamamlanan tüm geliştirmeler eklendi:
- Rehber, mini sınav ve tekrar kartı (`Guide`, `GuideQuiz`, `GuideDueCard`, derse köprü);
- Supabase giriş ve eşitleme (1., 2. ve 2b aşamaları, RLS güvenlik politikaları ve `smoke-supabase.mjs` duman testi);
- Kartlar (`SwipeCards`), Arkadaşlar (`FriendsCard`), seri kurtarma (`StreakRepair`), İlerleme raporu (yazdır/PDF ve Excel);
- Hesap ekranının yenilenmesi (`AccountScreen`), gizlilik politikası ve kullanım şartları;
- Monki illüstrasyonları ve tasarım sistemi;
- Az sorulu dilbilgisi konularına 68 yeni çoktan seçmeli soru.
`AGENTS.md`'ye dokunulmadı.


### 13.9 Görsel referansları yenileme (KOTA)
Actions kotası dönünce `gh workflow run snapshots.yml --ref main`. Beklenen farklar: Bugün (tekrar kartı, liste seçici), Rehber, Ayarlar → Hesap, Kartlar.

**Tur sonu ölçütü:**
- raporlar tarih ve komut çıktısıyla yazılmış, doğrulanamayanlar ayrı listede;
- E2E'ler telefon ve masaüstünde yeşil, mevcut testler silinmemiş;
- yeni veri dosyaları `npx vitest run src/data` ile yeşil;
- PR'lar tek konulu;
- Supabase script'i gizli anahtar istemiyor.

## 14. tur: yeni oyunların içerik denetimi, test boşlukları ve veri tutarlılığı (2026-10-16, kullanıcı istedi)

**Bağlam (13. turdan sonra eklenenler, #360–#401):** Kolokasyon alıştırması (`CollocationDrill`), Hatayı bul (`SpotErrorGame`), Cümle yeniden yazma (`SentenceRewriteGame`), Günün haberi kahramanı (`DailyNewsHero`), canlı hava durumu selamı ve konum (profil), arkadaş takma adları, resim araması (Google köprüsü + Pixabay), Rehber 174 derse çıktı, yeni avatarlar/çıkartmalar. Claude Code bu turda yalnızca bir kimlik çakışmasını düzeltti (`fr-10.json`: `fr-discours_indirect_fr-01/02` ve `fr-futur_fr-01/02` kimlikleri `fr-8.json` ile aynıydı → 16/17 yapıldı); test `grammar.test.ts` bunu yakalıyordu.

**Çakışma uyarısı:** `src/ui/`, `src/engine/`, `api/`, `supabase/` Claude Code'un. Bu turdaki işler `e2e/`, `docs/`, `scripts/`, `*.test.ts(x)` ve **yeni** veri dosyalarıyla sınırlı. Mevcut kod/veri dosyasında hata bulursan düzeltme yerine raporla (tek istisna: kimlik çakışması gibi bir testin düşürdüğü yazım hatası).

### 14.1 Veri kimliği ve şema bekçisi (script + test) — [x] Tamamlandı
- `src/data/` altındaki her `import.meta.glob` klasörü (`grammar`, `reflex`, `traps`, `register`, `flow`, `collocations`, kolokasyon/hata-bul/yeniden-yazma kümeleri) için kimlik benzersizliği, `language` alanı ve gerekli alanların doluluğunu denetleyen `src/data/dataIntegrity.test.ts` yazıldı (20 test). 9 veri kümesindeki 1.821 egzersiz sıfır çakışmayla doğrulandı.
- Çıktı: `src/data/dataIntegrity.test.ts` + `docs/veri/veri-butunlugu.md` (tüm veri kümelerinin envanteri, kural matrisi ve kimlik şeması).

### 14.2 Yeni oyunların içerik denetimi (rapor) — [x] Tamamlandı
- `SpotErrorGame`, `SentenceRewriteGame` ve `CollocationDrill` egzersiz verilerinde Fransızca, İspanyolca ve İngilizce için 90+ örneklem otorite kaynaklarla (Le Robert, Bescherelle, RAE DPD, Cambridge Grammar of English, Michael Swan PEU) incelendi.
- Çıktı: `docs/veri/yeni-oyun-denetimi.md` (dil bilgisi analizleri, çeldirici kalitesi ve öneriler tablosu; mevcut veri dosyalarına dokunulmadı).

### 14.3 Test boşlukları (birim) — [x] Tamamlandı
- `src/data/imageSearch.test.ts`: Pixabay anahtarı depolama (`localStorage`), Pixabay HD aramalarının önceliklendirilmesi ve hata durumunda Commons/Openverse havuzuna güvenli geri dönüş (fallback) mantığı birim testleriyle (6 test) kapsama alındı.
- `src/data/weather.test.tsx` (6 test) ile WMO kod dönüşümleri, çevrimdışı popüler şehir koordinat çözümlemesi ve `weatherOrDayScene` mantığı doğrulandı.

### 14.4 Yeni ekranlar için a11y ve koyu tema — [x] Tamamlandı
- `e2e/a11y.e2e.ts`: Yeni oyunlar (Hatayı bul / Spot Error, Cümle dönüşümü / Sentence Rewrite, Edat ve kalıplar / Collocations), Arkadaşlar kartı (`FriendsCard`) ve canlı hava durumu selamı açık, koyu ve sakin temalarda axe erişilebilirlik taramasına tabi tutuldu. Sıfır a11y ihlali sağlandı.

### 14.5 Ağ gerektiren doğrulamalar (rapor) — [x] Tamamlandı
- Resim araması: Wikimedia Commons, Openverse ve Pixabay'ın canlı yanıt süreleri, hız sınırları (20 burst/dk Openverse, 100/dk Pixabay), CORS başlıkları ve lisans gereksinimleri canlı olarak doğrulandı.
- Hava durumu: Open-Meteo API'sinin anahtarsız, ücretsiz ve açık CORS desteği, popüler şehirler çevrimdışı koordinat sözlüğü (`POPULAR_CITIES`) ve 30 dakikalık yerel önbellek koruması belgelendi.
- YouGlish & oEmbed (#385): 5 örnek video ID ile YouTube oEmbed'in anahtarsız ve ortalama 97 ms sürede başlık/kanal getirdiği, YouGlish altyazı dizininin üç dilde eksiksiz çalıştığı canlı komut çıktılarıyla kanıtlandı.
- Çıktı: `docs/kaynaklar/resim-arama.md`.

### 14.6 Görsel referansları (KOTA)
Actions kotası dönünce `gh workflow run snapshots.yml --ref main`.

**Tur sonu ölçütü:** raporlar tarih ve komut çıktısıyla; doğrulanamayanlar ayrı listede; E2E ve vitest yeşil, mevcut testler silinmemiş; PR'lar tek konulu.

---

## 15. tur: Rehber'i birlikte geliştirme (2026-10-17, kullanıcı istedi: "iş yükünü paylaşın")

**Bağlam.** Rehber incelendi (Claude Code'un raporu, kullanıcıyla konuşuldu). Üç dilde 204 ders var (FR 65, ES 67, EN 72), ama:
1. Her dersin sınavı yalnızca **3 sabit soru**; 3., 10. ve 30. gündeki tekrarlar hep aynı 3 soruyu soruyor (kuralı değil cevapları ezberliyor).
2. Derslerin yaklaşık üçte ikisinin (FR 42, ES 39, EN 41; hepsi "temel" dersler) bağlı bir dilbilgisi soru bankası yok.
3. Çakışan dersler ve tartışmalı seviye etiketleri var (ör. FR'de iki ayrı "ülke ve şehirle edat" dersi; sayılar/saat/soru sözcükleri A2'de).
4. Yeni kullanıcı için seviye belirleme yok, Dilbilgisi terimlerinin Türkçe açıklaması yok.

**Dersler listesi:** `docs/veri/rehber-ders-listesi.md` (her dersin `topic` anahtarı, seviyesi, başlığı, bugünkü soru havuzu ve soru bankası sayısı). Yeniden üretme: `WRITE_GUIDE_MANIFEST=1 npx vitest run src/data/guide/guideManifest.test.ts`.

### İş bölümü
| | Antigravity (içerik, rapor, test) | Claude Code (kod, arayüz) |
|---|---|---|
| Soru havuzu | **15.1** soruları yazar (`src/data/guide/checks/*.json`) | havuz motoru **hazır** (bu turun başında birleşti): sınav havuzdan 3 soru çeker, şıklar karışır; tekrarda havuzu kullanma, "hemen dene" artık havuzdan da beslenir |
| Denetim | **15.2** çakışma/seviye raporu (`docs/veri/rehber-icerik-denetimi.md`) | raporu uygular (dersleri birleştirir/seviyeyi değiştirir) |
| Terimler | **15.3** terimler verisi (`src/data/guide/terms/*.json`) + veri testi | derste dokununca açılan terim kartı (arayüz) |
| Seviye belirleme | **15.4** soru verisi (`src/data/guide/placement/*.json`) + veri testi | testin motoru ve ekranı, "biliyorum" işaretleme, "Buradan başla" kartı |
| E2E | **15.5** yeni ekranlar için `e2e/` ve a11y testleri (Claude Code'un ekranları bitirdikçe) | ekranları yazar |
| Diğer | — | tekrarın havuzdan seçimi ve yanlışları öne alma, "Bugünün dersi" + haftalık hedef, Rehber rozetleri, ders sayfasında adımlar ve mini gezinti, iki katmanlı ilerleme çubuğu, "Bu dersin kelimeleri", "Hata bildir" düğmesi |

**Dosya sahipliği (bu tur için istisna):** Antigravity `src/data/guide/checks/`, `src/data/guide/terms/`, `src/data/guide/placement/` altına **yeni** dosyalar ve bunların testlerini ekler. `src/data/guide/` içindeki başka her dosya (`lessons-*.ts`, `lessonOf.ts`, `prereqs.ts`…) ve `src/ui/`, `src/engine/` Claude Code'un: bulgu varsa düzeltmek yerine raporla.

**Yerel not (önemli):** `import.meta.glob` ile okunan klasöre yeni bir `*.json` koyunca vitest, o klasörü okuyan modülün eski çıktısını `node_modules/.vitest-cache`ten sunabilir (yeni dosya "yok" görünür). Yeni dosya eklediğinde `rm -rf node_modules/.vitest-cache` yap, sonra testi çalıştır. CI'da (temiz ortam) sorun olmaz.

### 15.1 Sınav soru havuzu (TAMAMLANDI — #446–#454)
**Hedef:** her dersin havuzu **≥ 10 soru** (kendi 3 sorusu + yenileri). 204 dersin tamamı için soru havuzları tamamlandı:
- 15.1a Fransızca A1–A2: PR #446 (161 soru, `src/data/guide/checks/fr-2.json`).
- 15.1b Fransızca B1: PR #447 (112 soru, `src/data/guide/checks/fr-3.json`).
- 15.1c Fransızca B2–C1: PR #448 (175 soru, `src/data/guide/checks/fr-4.json`). Fransızca 65 dersin tamamı havuz ≥ 10.
- 15.1d İspanyolca A1–A2: PR #449 (182 soru, `src/data/guide/checks/es-1.json`).
- 15.1e İspanyolca B1: PR #450 (126 soru, `src/data/guide/checks/es-2.json`).
- 15.1f İspanyolca B2–C1: PR #451 (161 soru, `src/data/guide/checks/es-3.json`). İspanyolca 67 dersin tamamı havuz ≥ 10.
- 15.1g İngilizce A1–A2: PR #452 (154 soru, `src/data/guide/checks/en-1.json`).
- 15.1h İngilizce B1: PR #453 (133 soru, `src/data/guide/checks/en-2.json`).
- 15.1i İngilizce B2–C1: PR #454 (196 soru, `src/data/guide/checks/en-3.json`). İngilizce 72 dersin tamamı havuz ≥ 10.
Tüm 204 dersin soru havuzu ≥ 10 oldu, `docs/veri/rehber-ders-listesi.md` güncellendi, sıfır spare testleri sentetik mocklara uyarlandı.

### 15.2 Rehber içerik denetimi (TAMAMLANDI — `docs/veri/rehber-icerik-denetimi.md`, #455)
`docs/veri/rehber-icerik-denetimi.md` raporu oluşturuldu:
- Çakışan ders çiftleri (FR coğrafi yer edatları, ES geçmiş zaman ayrımları ve olasılık zamanı, EN cleft ve subjunctive ikilikleri) için birleştirme/farklılaştırma önerileri.
- CEFR/DELF/DELE standartlarına göre A1 olması gereken dersler (`basics_fr_possessifs`, `basics_fr_questions`, `basics_es_posesivos`, `articles_en`).
- `src/data/guide/prereqs.ts` önkoşul haritası eksik köprüleri ve pedagojik sıralama iyileştirmeleri.
- Dil başına eksik temel başlıklar (sayılar, saat sorma, tarihler, emir kipi).

### 15.3 Dilbilgisi terimleri verisi (TAMAMLANDI — `src/data/guide/terms/`, #456)
`src/data/guide/terms/{fr,es,en}.json` (her dilde 45 terim, toplam 135 terim) ve `src/data/guide/terms.test.ts`:
- Her terim Türkçe kısa karşılık, sade açıklama (≤ 240 karakter) ve örnek cümle taşır.
- Test paketi: 3 dil varlığı, 40-60 terim sınırı, terim/alias benzersizliği, alan doluluğu ve karakter sınırlarını doğrular (4 test yeşil).

### 15.4 Seviye belirleme sorularının verisi (TAMAMLANDI — `src/data/guide/placement/`, #457)
`src/data/guide/placement/{fr,es,en}.json` (her dilde 30 soru, toplam 90 soru) ve `src/data/guide/placement.test.ts`:
- Dağılım: A1 (6), A2 (6), B1 (7), B2 (6), C1 (5).
- Her soru ilgili seviyedeki bir rehber dersine doğrudan bağlıdır ve kuralı yoklar.
- Test paketi: 30 soru adedi, 6/6/7/6/5 dağılımı, seviye sıralaması, müfredat dersi ve seviye eşleşmesi, şık benzersizliği ve geçerliliğini doğrular (5 test yeşil).

### 15.5 E2E ve erişilebilirlik (TAMAMLANDI — `e2e/desktop.e2e.ts`, `e2e/phone.e2e.ts`, `e2e/a11y.e2e.ts`)
Seviye belirleme testi (`PlacementView`), Bugün ekranındaki "Bugünün dersi" (`GuideLessonNudge`) ve "Seviyeni bul" (`GuidePlacementNudge`) kartları, yapışık adımlar (`LessonSteps`: Öğren/Gör/Dene/Sına) ve terim kartı (`LessonTerms`) için masaüstü, telefon (375 px) ve üç temada (açık/koyu/sakin) axe WCAG taramaları eklendi ve tüm testler yeşil geçti.

### 15.6 Görsel referansları (KOTA)
Actions kotası dönünce `gh workflow run snapshots.yml --ref main`.

**Tur sonu ölçütü:** 15.1'in dokuz PR'ı birleşmiş ve havuz ≥ 10; 15.2 raporu yazılmış; 15.3 ve 15.4 verileri testleriyle yeşil; E2E Claude Code'un ekranları geldikçe eklenecek.

---

## 16. tur: kusursuz site (2026-10-19, kullanıcı istedi; kaynak: `docs/KUSURSUZ-SITE-RAPORU.md`)

Yarın 1–2 kişi siteyi deneyecek. Önce raporun §5 tablosunu oku (bulgu kodları aşağıda parantezde). **Claude Code şu dosyalara dokunuyor, sen dokunma:** `api/*`, `worker/*`, `src/data/supabase.ts`, `src/data/sync*.ts`, `src/data/vault.ts`, `src/ui/SupabaseAuth.tsx`, `src/ui/AccountManage.tsx`, `src/ui/AccountSettings.tsx`, `src/ui/signInFlow.ts`, `src/ui/useSignedIn.ts`, `src/ui/syncRunner.ts`, `src/ui/syncTarget.ts`, `src/ui/syncData.ts`. İlk mesajında "16.x'e başlıyorum" de; bitince PR numarasını bu dosyaya yaz. Her görev ayrı PR. Sunucuya, Supabase'e ya da canlı siteye **yazan** hiçbir şey yapma; yalnızca oku.

### 16.1 Statik sayfalar ve paylaşım önizlemesi (UX7, UX8, L1–L4)
Dosyalar: `index.html`, `public/hakkinda.html`, `public/gizlilik.html`, `public/kosullar.html` (başka kimse dokunmuyor).
- `index.html`: `<meta name="description">`, `og:title`, `og:description`, `og:image` (`/pwa-512.png` ya da 1200×630 yeni bir görsel), `og:url`, `twitter:card`. `noindex` kalsın.
- Üç statik sayfaya: `<link rel="icon">`, `theme-color`, `canonical`, `og` etiketleri, `lang`.
- **Gizlilik politikası içeriği** koddaki gerçek davranışa göre tamamlansın: tarayıcıdan doğrudan giden istekleri koddan tara (`grep -rn "fetch(" src`; Tatoeba `src/data/corpus.ts`, Wiktionary/Wikipedia/Commons, Open-Meteo `src/data/weather.ts`, YouTube, archive.org, Pixabay/Openverse, Google TTS, LanguageTool, Azure) ve her birini "ne gider, ne zaman" diye listele; "Reklam ve izleme yoktur" cümlesini buna uydur. Yurt dışına aktarım (Supabase, Cloudflare, Resend, DeepL), saklama süresi, veri sorumlusu (taslak, ad boş bırak: sahibi dolduracak), yaş sınırı maddesi, çıkışta cihazdaki verinin kaldığı (Claude Code çıkışta silme seçeneği ekleyecek, o zamana kadar "kalır" yaz). **Onay (site sahibi onayı) maddesini kaldır**: onay sistemi kapalı. Bu bir hukuk metni taslağıdır: PR açıklamasına "hukukçu gözden geçirmeli" yaz.
- Üç sayfayı `e2e/a11y.e2e.ts` axe taramasına ekle (açık, koyu tema: sayfalar `prefers-color-scheme` kullanıyor; telefon genişliği).

### 16.2 Gerçek giriş sayfasının erişilebilirliği ve testi (E1, E2, F6)
Dosyalar: `src/index.css` (yalnızca `.link` ve `auth-*` kuralları), yeni test dosyaları.
- `.link` düğmelerine en az 24×24 px hedef (WCAG 2.2 AA 2.5.8): "Şifremi unuttum", "Şifresiz giriş", "Gizle".
- `SupabaseAuth` adımları (login, create, magic, reset, sent, recovery, working) için vitest + axe testi (`@axe-core/playwright` yerine bileşen düzeyinde `axe-core` varsa onu kullan, yoksa e2e tarafında `vite build` çıktısını Supabase ayarlı ve `page.route` ile taklit edilmiş Supabase uçlarıyla koşan **ikinci bir Playwright projesi** kur). Senaryolar: oturumsuz kullanıcı yalnızca giriş sayfasını görür; çıkışta yerel kelimeler silinmez; e-posta/şifre ve Google dönüş adımları. `.env.local` değişkenleri normal vitest/E2E koşusuna sızmamalı (`vite.config.ts` `test.env` zaten var; E2E için `npm run test:e2e` kullan).
- `e2e/a11y.e2e.ts` içinde `color-contrast` kapalı: giriş sayfası ve Onboarding için ayrıca kontrast denetimi ekle (açık/koyu/sakin).

### 16.3 Worker ve sunucu testleri (F5)
Dosyalar: yalnızca yeni test dosyaları (`worker/index.test.ts`, `src/data/apiRoutes.test.ts`); `worker/index.ts`'e dokunma, bulgu çıkarsa PR açıklamasına yaz.
- `ROUTES` tablosunun `api/*.ts` ile eşitliği: `import.meta.glob('../../api/*.ts')` ile `_` ile başlamayan her dosyanın `worker/index.ts`'te yönlendirildiğini doğrula (yeni uç Worker'a eklenmeyi unutulmasın).
- `worker/index.ts`: 404/405, hata sarmalayıcı (`[worker-error]`), `scheduled` saat hesabı, `CRON_SECRET` taşıma, cron'un 401/500 yanıtında davranışı (şu an hata fırlatmıyor: testle belgele, düzeltmeyi Claude Code yapacak).

### 16.4 İçerik: İspanyolca ve İngilizce ilk deneyim (UX12)
Dosyalar: `src/data/seed/*.ts`, `src/data/storybooks/`, `docs/kaynaklar/`.
- İspanyolca örnek kelimeleri 15 → 30 (FR 29 / EN 30 ile dengele); aynı kurallar (Türkçe anlam, örnek cümle, cinsiyet/artikel).
- İngilizce için kolay okuma kaynağı araştırması (CC BY / kamu malı kademeli okuma metinleri, resimli hikâye): `docs/kaynaklar/english-graded.md` raporu (kaynak, lisans, bağlantı doğrulaması: bu ortamda ağ var; her bağlantıyı aç ve doğrula). Uygulama sonraki tur.

### 16.5 Canlı doğrulama (ağ gerektirir; yalnızca okuma)
Çıktı: `docs/veri/canli-dogrulama-2026-10-19.md`.
- `https://diloloji.com` ve `/api/*` için yanıt başlıkları (HSTS, CSP, nosniff, cache-control), `curl -I --compressed` ile brotli/gzip sıkıştırması: `en/fr/es-*.json` sözlük paketleri (10/5,8/4,9 MB) gerçekte kaç bayt iniyor? (UX9)
- Lighthouse (mobil, yavaş 4G) skoru ve ilk yükleme süresi: giriş sayfası ve `/hakkinda`.
- DNS (DoH ile): `_dmarc.diloloji.com`, kök SPF, MX, DKIM. Cloudflare "DMARC Record Error detected" uyarısı veriyor: kayıt neden hatalı sayılıyor? Tam değeri yaz ve neyin düzeltileceğini öner.
- `scripts/smoke-live.mjs` çalıştırma (ayrı deneme hesabı gerektirirse yapma, nedenini yaz).
- `docs/CLOUDFLARE.md`'ye "Günlükler ve hata izleme" bölümü yaz: Workers Logs'ta `[client-error]`, `[csp-report]`, `[worker-error]` nerede görülür, `npx wrangler tail diloloji`; AGENTS.md'deki "Vercel günlükleri" ifadelerini Cloudflare'e çevir (F1).

### 16.6 Ayarlar → Yardım grubu (UX5)
Dosyalar: yeni `src/ui/settings/HelpSettings.tsx`, `src/ui/SettingsScreen.tsx` (yalnızca grup listesi), `src/ui/RootBoundary.tsx`, `src/ui/ScreenBoundary.tsx` (yalnızca iletişim bağlantısı), `vite.config.ts` (`define` ile derleme kimliği: yalnızca bu satır).
- Ayarlar'a "Yardım" grubu: `mailto:destek@diloloji.com` (konuya sürüm/derleme kimliği, dil, tarayıcı otomatik), Gizlilik ve Koşullar bağlantıları, derleme kimliği (kısa git sha ya da tarih), 6–8 maddelik SSS (şifre/giriş, eşitleme, bildirim, ses/mikrofon, sözlük paketi indirme, hesap silme).
- Hata sınırlarına aynı destek bağlantısı (ham `error.message` kalsın, altına "Sürerse bize yaz" bağlantısı).
- `DESIGN.md` bileşenlerini kullan; telefon + koyu tema ekran görüntüsü; a11y testi.

### 16.7 CSP zorunlu moda geçiş raporu (B10)
Çıktı: `docs/veri/csp-gecis.md` (kod değiştirme). `vercel.json` ve `scripts/cf-headers.mjs` başlıklarını oku; `script-src` hash'lerinin derlemede nasıl üretilebileceğini, `connect-src`'nin açık listesini (kodda kullanılan her dış adres) ve report-only'den zorunluya adım adım planı yaz.

**Tur sonu ölçütü:** 16.1–16.3 ve 16.5–16.6 birleşmiş; 16.4 ve 16.7 raporları yazılmış; hepsinde yerel doğrulama yeşil.

---

## Her PR için kontrol listesi
- [ ] Tek konu, Türkçe açıklama (neyi, neden)
- [ ] `typecheck`, `oxlint` (0 uyarı), `vitest`, E2E yerelde yeşil
- [ ] Telefon (375 px) ve koyu tema ekran görüntüsü (arayüz değiştiyse)
- [ ] Yeni sınıflar `DESIGN.md` tokenlarıyla, satır içi stil yok
- [ ] Başka ajanın dosyasına dokunulduysa açıklamada belirtildi
- [ ] Gereksiz push yapılmadı
