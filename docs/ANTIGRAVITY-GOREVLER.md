# Antigravity için görev listesi

Bu dosya Antigravity'ye verilecek işleri, sırasını ve çalışma kurallarını toplar. Yük yavaş yavaş artırılır: önce küçük ve izole işler, sorunsuz giderse orta, en sonda büyük. Her tur bitince kullanıcı bir sonrakine geçilip geçilmeyeceğine karar verir.

Son güncelleme: 2026-10-10 (5. tur eklendi).

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

### 4.6 TV5Monde ve DELE Ahora: bu içerik kullanılabilir mi? (rapor)
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

## Her PR için kontrol listesi
- [ ] Tek konu, Türkçe açıklama (neyi, neden)
- [ ] `typecheck`, `oxlint` (0 uyarı), `vitest`, E2E yerelde yeşil
- [ ] Telefon (375 px) ve koyu tema ekran görüntüsü (arayüz değiştiyse)
- [ ] Yeni sınıflar `DESIGN.md` tokenlarıyla, satır içi stil yok
- [ ] Başka ajanın dosyasına dokunulduysa açıklamada belirtildi
- [ ] Gereksiz push yapılmadı
