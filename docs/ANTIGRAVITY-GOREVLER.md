# Antigravity için görev listesi

Bu dosya Antigravity'ye verilecek işleri, sırasını ve çalışma kurallarını toplar. Yük yavaş yavaş artırılır: önce küçük ve izole işler, sorunsuz giderse orta, en sonda büyük. Her tur bitince kullanıcı bir sonrakine geçilip geçilmeyeceğine karar verir.

Son güncelleme: 2026-10-09.

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
| Claude Code | `src/ui/Reading.tsx`, `src/ui/Screens.tsx` (Bugün), `src/ui/verbs/`, `src/engine/` |
| Ortak (önce haber ver) | `src/App.tsx`, `src/index.css`, `src/data/db.ts` |

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

## Her PR için kontrol listesi
- [ ] Tek konu, Türkçe açıklama (neyi, neden)
- [ ] `typecheck`, `oxlint` (0 uyarı), `vitest`, E2E yerelde yeşil
- [ ] Telefon (375 px) ve koyu tema ekran görüntüsü (arayüz değiştiyse)
- [ ] Yeni sınıflar `DESIGN.md` tokenlarıyla, satır içi stil yok
- [ ] Başka ajanın dosyasına dokunulduysa açıklamada belirtildi
- [ ] Gereksiz push yapılmadı
