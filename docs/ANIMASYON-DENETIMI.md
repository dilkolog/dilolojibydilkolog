# Kelime Koçu — Animasyon ve Hareket Denetimi Raporu

**Tarih:** 2026-10-09  
**Kapsam:** `src/index.css`, UI bileşenleri (`src/ui/`), video kayıtları ve `DESIGN.md` hareket tokenları  
**Referans Belge:** [`DESIGN.md`](../DESIGN.md) (Hareket, Derinlik ve Yap/Yapma kuralları)

---

## 1. Giriş ve İlkeler

`DESIGN.md` belgesinde Kelime Koçu'nun hareket felsefesi açıkça tanımlanmıştır:
> **Kuzey yıldızı:** *"Cesaret veren koç, büyüyen bahçe."*  
> **Hareket İlkesi:** *"Böyle görünmemeli: sosyal medya (bildirim rozetleri, sonsuz akış, dikkat çekmek için hareket)."*  
> **Tek Eğri & Dört Süre:** Basma 80 ms (`--dur-press`), üzerine gelme ve renk 150 ms (`--dur-fast`), açılma ve belirme 280 ms (`--dur`), çubuklar 700 ms (`--dur-bar`). Varsayılan eğri `--ease-out`, ödül anlarında `--ease-spring`.  
> **Azaltılmış Hareket Kuralı:** Her animasyon `prefers-reduced-motion: reduce` altında kapanır ya da anlık olur.

Bu denetim, projedeki tüm animasyon ve geçiş kurallarını envantere almış, donanım ivmelendirme (GPU compositing), token uyumu, dikkat dağıtmayan sakinlik ve erişilebilirlik ilkeleri açısından incelemiştir.

---

## 2. Mevcut Hareket Envanteri

Kod tabanında toplam **66 `@keyframes` kuralı**, **202 CSS animasyon/geçiş deklarasyonu** ve TypeScript bileşenlerinde **4 satır içi stil/mantık** tespit edilmiştir.

### 2.1. Başlıca Keyframe Animasyonları

| Keyframe Adı | Etkilediği Özellikler | Kullanıldığı Bileşen / Yer | Süre / Eğri Deseni |
|---|---|---|---|
| `scene-pop` | `transform`, `opacity` | Oturum sonu bahçe bitkileri (`.scene-plants li`) | `var(--dur)` `var(--ease-spring)` |
| `spacer-grow` | `height` *(Düzen tetikler)* | Oturum alt sayfa boşluğu (`.session-stage .sheet-spacer`) | `var(--dur)` `var(--ease-out)` |
| `open-below` | `max-height` *(Düzen tetikler)* | Oyun aşaması açılır bölümler | `240ms` `var(--ease-out)` |
| `correct-pop` | `transform` | Doğru cevap onay ikonu | `280ms` `var(--ease-spring)` |
| `shake` | `transform` | Yanlış cevap sarsıntısı | `350ms` `ease-in-out` |
| `bars` | `height` *(Düzen tetikler)* | Dinleme ses dalgaları (`.sound-bars i`) | `0.9s` `ease-in-out infinite` |
| `bar-grow` | `transform` (`scaleX`) | İlerleme çubukları doluşu | `700ms` `var(--ease-out)` |
| `toast-in` | `opacity`, `transform` | Bildirim kutucuğu (`.toast`) | `var(--dur-fast)` `var(--ease-spring)` |
| `toast-timer` | `transform` (`scaleX`) | Bildirim sayaç çizgisi | `3500ms` `linear` |
| `sheet-in` | `opacity`, `transform` | Alt geri bildirim sayfası | `var(--dur)` `var(--ease-out)` |
| `plant-grow` | `transform` (`scale`) | Bahçe bitki aşama atlama | `var(--dur)` `var(--ease-spring)` |
| `plant-sway` | `transform` (`rotate`) | Bahçe canlı bitkiler | `4.5s` `ease-in-out infinite alternate` |
| `bloom-breathe` | `transform` (`scale`) | Bahçe çiçek solunumu | `3.2s` `ease-in-out infinite alternate` |
| `hard-glow` | `opacity`, `transform` | Zor kelime vurgusu (`.plant-tile.is-hard`) | `2.8s` `ease-in-out infinite alternate` |
| `art-*` (10 adet) | `transform`, `opacity`, `stroke-dashoffset` | Boş durum illüstrasyonları (uçma, süzülme, yazma) | `0.32s` – `6s` `infinite` |
| `screen-in` | `opacity`, `transform` | Ekran girişleri (`.screen-enter`) | `240ms` `var(--ease-out)` |
| `screen-focus` | `opacity`, `transform` | Ekran geçişleri | `180ms` `var(--ease-out)` |
| `screen-forward` / `back` | `opacity`, `transform` | İleri/geri ekran akışı | `260ms` `var(--ease-out)` |
| `badge-ring` | `transform`, `opacity` | Rozet kazanma halkası | `900ms` `var(--ease-out)` |
| `flicker` / `ember` | `transform`, `opacity` | Seri ateşi (`.streak-flame`) | `1.6s` – `2.6s` `infinite` |

### 2.2. TSX Bileşenlerindeki Hareketler

- **`src/ui/games/BlitzGame.tsx:194`:**  
  `style={{ width: `${(left / BLITZ_MS) * 100}%`, transition: 'width 0.1s linear' }}`  
  *Sorun:* Doğrudan `width` animasyonu yapılarak her 100 ms'de reflow (yerleşim hesabı) tetikleniyor.
- **`src/ui/Burst.tsx:27`:**  
  Kutlama konfetisi / parçacık patlaması CSS değişkenleriyle (`--x`, `--y`, `--r`) GPU üzerinde çalışıyor.
- **`src/ui/Garden.tsx:179`:**  
  Yağmur damlaları satır içi gecikme ve sürelerle CSS `rain-drop` keyframe'ine bağlanıyor.
- **`src/ui/useTabIndicator.ts`:**  
  Sekme altı kayan çizgi `transform` ve `width` geçişiyle hareket ediyor.

---

## 3. Tespit Edilen Sorunlar ve Aykırılıklar

### 3.1. Düzen (Layout / Reflow) Tetikleyen Özellikler (Jank ve Pil Tüketimi)

`width`, `height` ve `max-height` animasyonları tarayıcının tüm DOM ağacını yeniden hesaplamasına (reflow) sebep olur. Özellikle 60 Hz/120 Hz mobil ekranlarda takılmalara yol açar. Tespit edilenler:

1. **İlerleme Çubuklarında `width` Geçişi (13 farklı yer):**
   - `.card-fill-track span` (satır 4502): `transition: width var(--dur) var(--ease-out);`
   - `.lab-bar > span` (satır 4701): `transition: width var(--dur) var(--ease-out);`
   - `.lab-clock > span` (satır 4801): `transition: width 100ms linear;`
   - `BlitzGame.tsx` (satır 194): `transition: 'width 0.1s linear'`
   - `.shadow-bar` (satır 1502): `transition: width 0.1s linear;`
   - `.quest-bar > span` (satır 1242): `transition: width 0.6s ease;`
   - `.boss-hp > div` (satır 1644): `transition: width var(--dur) var(--ease-out);`
   - `.race-bar` (satır 1651): `transition: width var(--dur) var(--ease-out);`
   - `.known-bar span` (satır 1779): `transition: width var(--dur) var(--ease-out);`
   - `.story-progress > span` (satır 2528): `transition: width var(--dur) var(--ease-out);`
   - `.xp-bar > span` (satır 3454): `transition: width 120ms linear;`
   - *Çözüm:* Hepsi `transform: scaleX(...)` ve `transform-origin: left` ile GPU bileşik katmanında (compositing) sıfır maliyetle çalıştırılabilir.
2. **Yükseklik Değiştiren Keyframe'ler:**
   - `.sound-bars i` (satır 2639): `@keyframes bars` içinde `height: 20%` ile `height: 100%` arası döngü yapılıyor. `transform: scaleY()` olmalıdır.
   - `.session-stage .sheet-spacer` (satır 3963): `@keyframes spacer-grow` içinde `height` sıfırdan `--sheet-h` değerine büyütülüyor.
   - `.game-stage` (satır 3974): `@keyframes open-below` içinde `max-height: 20rem` animasyonu yapılıyor. Düzen kayması (Cumulative Layout Shift) yaratıyor.

### 3.2. Token Dışı Süreler ve Standart Dışı Eğriler

`DESIGN.md` yalnızca `--dur-press` (80ms), `--dur-fast` (150ms), `--dur` (280ms) ve `--dur-bar` (700ms) sürelerini kural olarak koymuştur.
- **101 ayrı yerde token dışı süre** tespit edilmiştir:
  - `100ms`, `120ms`, `200ms`, `240ms`, `260ms`, `300ms`, `350ms`, `380ms`, `420ms`, `500ms`, `520ms`, `560ms`, `600ms`, `760ms`, `900ms`, `1200ms` vb.
- **Eğri Sapmaları:**
  - Token olan `--ease-out` veya `--ease-spring` yerine düz `linear`, `ease`, `ease-in-out` yazılmış çok sayıda kural bulunmaktadır.

### 3.3. "Dikkat Çekmek İçin Hareket Yok" İlkesini Çiğneyen Sonsuz Döngüler

`DESIGN.md` uygulamanın bir sosyal medya akışı gibi dikkat çekmek için sürekli kıpırdamaması gerektiğini söyler. Kodda **30 adet `infinite` animasyon** saptanmıştır:
1. **Boş Durum İllüstrasyonları (`.art-*`, satır 4344–4367):**
   - `.art-sway` (3.6s infinite), `.art-drop` (4.4s infinite), `.art-fly` (6s infinite), `.art-wing` (0.32s infinite kanat çırpma!), `.art-write` (5s infinite), `.art-pen` (2.5s infinite), `.art-pop` (4s infinite), `.art-breathe` (3.4s infinite), `.art-scan` (5s infinite), `.art-twinkle` (3.2s infinite).
   - Bu animasyonlar kullanıcı boş ekrana baktığı sürece cihazın GPU ve bataryasını sürekli tüketmekte, dikkat dağıtmaktadır.
2. **Kelimeler ve Gökyüzü Öğeleri:**
   - `.plant-tile.is-hard.is-pulse::before` (`hard-glow 2.8s infinite alternate`): Zor kelime kutusu sürekli yanıp sönüyor.
   - `.sky-butterfly svg` (`flap 0.32s infinite alternate`), `.sky-bee::after` (`flap 0.08s infinite alternate`): Aşırı hızlı titreşen kanatlar.
   - `.streak-flame:not(.is-out) svg` (`flicker 2.6s infinite`) ve `.streak-flame::before` (`ember 2.2s infinite`): Ekranda sürekli kıpırdayan ateş efekti.

### 3.4. Azaltılmış Hareket (`prefers-reduced-motion`) Durumu

- `src/index.css` satır 206'da global olarak:
  ```css
  @media (prefers-reduced-motion: reduce) {
    *, *::before, *::after { animation: none !important; transition: none !important; }
  }
  ```
  kuralı tanımlanmıştır. Bu kural iyi niyetli bir kalkan olsa da:
  - Satır içi stillerde JS ile yönetilen geçişler (`BlitzGame.tsx`) bu kuralı bypass edebilir veya süre hesapları donabilir.
  - Satır 3070'te `@media (prefers-reduced-motion: reduce) { .langs-thumb { transition: background-color var(--dur) var(--ease-out); } }` gibi kurallar global `!important` kuralıyla çelişmektedir.
  - Toptan `none !important` yapmak yerine, kritik anlarda (örneğin sayfa geçişleri veya bar doluşları) anlık durum geçişine izin veren temiz bir mimari kurulmalıdır.

---

## 4. Geri Bildirimi Eksik / Zayıf Kalan Anlar

Kelime Koçu'nun *"cesaret veren koç"* ve *"büyüyen bahçe"* metaforunu güçlendirecek şu kritik anlarda hareket eksiktir:

1. **Doğru / Yanlış Cevap Anı:**
   - Seçenek tıklandığında yalnızca zemin rengi zümrüt veya güle dönüyor.
   - Doğru cevapta butona dokunsal bir mikro-yaylanma (`transform: scale(1.025)` ile `--ease-spring`), başarı pırıltısı eksik.
   - Yanlış cevapta hafif bir sarsılma (`shake`) var ancak seçenekler arası hiyerarşi aniden donuyor.
2. **Kelimenin Aşama Atlaması (FSRS Seviye İlerlemesi):**
   - Tekrar tamamlandığında kelimenin tohumdan fidana veya fidandan çiçeğe geçişi anlık ve statik bir rozet değişimiyle oluyor. Bitkinin büyüdüğünü hissettiren bir mikro-filizlenme (`pop/sprout`) animasyonu yok.
3. **Oturum Tamamlama ve Özet:**
   - Oturum bitip özet ekranına geçilirken sayfa aniden kesiliyor. Özet kartlarının sırayla süzülmesi (`staggered fade-up`) ve kazanılan tecrübe/kelime sayacının akıcı ritmi eksik.
4. **Sekmeler / Ekranlar Arası Geçiş:**
   - Bugün, Oyunlar, Okuma ve Kelimeler sekmeleri arasında geçiş anında sayfa sıfırlanıyor; View Transitions eksikliği SPA akıcılığını düşürüyor.
5. **Kelimelerime Ekle Eylemi:**
   - Okuma esnasında veya sözlükte "Kelimelerime ekle"ye basıldığında yalnızca metin değişiyor; eklenen kelimenin havuz ikonuna doğru süzülmesi veya tatmin edici bir `check-pop` rozet zıplaması yok.
6. **Kart Çevirme (Cevabı Gör):**
   - Flaş kartlarda veya geri çeviri modunda "Cevabı gör" tıklandığında iki yüz arasında 3D `rotateY` kart çevirme hissi yok; anlık içerik değişimi yaşanıyor.

---

## 5. Playwright Kayıtları Kataloğu

İnceleme kapsamında Playwright ile hem telefon (375 × 812 px, mobil dokunmatik emülasyonu) hem de masaüstü (1280 × 800 px) modunda 8 video kaydedilmiştir.  
Kayıtlar depoya commit edilmemiş, yerel klasöre konmuştur:  
`~/Downloads/kelime-koc-animasyon/`

| Dosya Adı | Görünüm | Çözünürlük | Boyut | İncelenen Akış ve Davranış |
|---|---|---|---|---|
| `phone-bugun-oturum-ozet.webm` | Telefon | 375 × 812 | 125 KB | Bugün ekranı, oturuma başlama, soru yanıtlama ve alt panel/özet ekranı. |
| `desktop-bugun-oturum-ozet.webm` | Masaüstü | 1280 × 800 | 310 KB | Geniş ekranda oturum sahnesi, seçenek butonlarının basma durumları ve tamamlama. |
| `phone-oyunlar.webm` | Telefon | 375 × 812 | 701 KB | Oyunlar menüsü kart kalkışları, oyun içi seçenek ve süre akışı. |
| `desktop-oyunlar.webm` | Masaüstü | 1280 × 800 | 1.5 MB | Masaüstünde oyun ızgarası hover tepkileri ve oyun aşaması geçişleri. |
| `phone-okuma-kelime-secme.webm` | Telefon | 375 × 812 | 698 KB | Okuma ekranında hikaye açma, kelimeye dokunma, kelime açılır menüsü (popover). |
| `desktop-okuma-kelime-secme.webm` | Masaüstü | 1280 × 800 | 1.5 MB | Masaüstünde okuma metni etkileşimi, kelime kartı açılışı ve çeviri çubuğu. |
| `phone-fiil-laboratuvari-turu.webm` | Telefon | 375 × 812 | 114 KB | Fiil laboratuvarı sekmesi, zaman sekmeleri geçişi ve çekim tablosu. |
| `desktop-fiil-laboratuvari-turu.webm` | Masaüstü | 1280 × 800 | 258 KB | Masaüstünde fiil laboratuvarı turu, zaman kartları ve segment animasyonu. |

---

## 6. İyileştirme İçin 10 Somut Öneri

Öneriler **etkisi büyük, riski düşük** sırasına göre dizilmiştir.

### Öneri 1: İlerleme Çubuklarında Düzen (Reflow) Tetikleyen `width` Geçişlerinin GPU Dostu `transform: scaleX()`'e Geçirilmesi
- **Ne değişecek:** `.card-fill-track span`, `.lab-bar > span`, `.boss-hp > div`, `.race-bar`, `.known-bar span`, `.story-progress > span` ve `BlitzGame.tsx` içindeki `transition: width` kaldırılacak. Yerine `transform: scaleX(var(--ratio))` ve `transform-origin: left` konulacak.
- **Tür:** Performans ve akıcılık (GPU Compositing).
- **Tahmini Emek:** 1.5 saat.
- **Performans Riski:** Sıfır; CPU yerleşim hesabı ortadan kalkar, 60/120 FPS garantilenir.
- **Erişilebilirlik Riski:** Yok; `aria-valuenow` ekran okuyucuya değer sunmaya devam eder.

### Öneri 2: Token Dışı Sürelerin (101 adet) ve Eğrilerin `DESIGN.md` Sistemine Bağlanması
- **Ne değişecek:** CSS'teki keyfi süreler (`100ms`, `120ms`, `200ms`, `350ms`, `0.6s` vb.) ve `linear`/`ease-in-out` eğrileri; `--dur-press` (80ms), `--dur-fast` (150ms), `--dur` (280ms) ve `--dur-bar` (700ms) tokenlarına dönüştürülecek.
- **Tür:** Tasarım tutarlılığı ve token birliği.
- **Tahmini Emek:** 2 saat.
- **Performans Riski:** Sıfır.
- **Erişilebilirlik Riski:** Sıfır.

### Öneri 3: Sonsuz Süs Animasyonlarının ("Dikkat Çekmek İçin Hareket Yok" İlkesi) Kaldırılması veya Tek Seferlik Yapılması
- **Ne değişecek:** Boş durum SVG illüstrasyonlarındaki `.art-sway` (3.6s), `.art-wing` (0.32s), `.art-write` (5s), `.art-pop` (4s), `.art-breathe` ve `.plant-tile.is-hard.is-pulse::before` (`hard-glow 2.8s`) gibi 30 adet `infinite` döngü kaldırılacak veya yalnızca ilk belirişte tek seferlik (`animation-iteration-count: 1`) çalışacak.
- **Tür:** Dikkat dağınıklığını önleme, pil/CPU tasarrufu.
- **Tahmini Emek:** 1 saat.
- **Performans Riski:** Pozitif (sürekli GPU/CPU çizimi son bulur, pil tüketimi düşer).
- **Erişilebilirlik Riski:** Pozitif (bilişsel yükü ve odak dağınıklığını azaltır).

### Öneri 4: Doğru/Yanlış Cevap Anına Dokunsal Mikro Yaylanma (`--ease-spring`) Eklenmesi
- **Ne değişecek:** Oturumda veya testte doğru seçeneğe basıldığında, buton anında yeşile dönmekle kalmayıp hafif bir yaylanma mikro-sıçraması (`transform: scale(1.025)`, 150ms, `--ease-spring`) yapacak. Yanlış cevapta ise mevcut `shake` korunurken butonun kenar rengi yumuşakça solacak.
- **Tür:** Küçük geri bildirim (Micro-interaction).
- **Tahmini Emek:** 1 saat.
- **Performans Riski:** Sıfır (`transform` bazlı).
- **Erişilebilirlik Riski:** Sıfır (`prefers-reduced-motion` altında anlık renk geçişine indirgenir).

### Öneri 5: Kelime ve Cümle Kartlarında Yumuşak 3D Kart Çevirme (`flip`) Hissi
- **Ne değişecek:** Geri çeviri ve bilgi kartlarında "Cevabı gör"e basıldığında kartın ön yüzü aniden kaybolmak yerine, `perspective: 1000px` konteyneri içinde yumuşak bir `rotateY(180deg)` dönüşü (`--dur: 280ms`, `--ease-out`) yapacak.
- **Tür:** Fiziksel kart metaforu.
- **Tahmini Emek:** 2 saat.
- **Performans Riski:** Çok düşük (GPU 3D transform).
- **Erişilebilirlik Riski:** `prefers-reduced-motion` altında doğrudan çevrilmiş hali gösterilecek.

### Öneri 6: "Kelimelerime Ekle" Butonunda Başarı Pulu (`Check Pop`)
- **Ne değişecek:** Okumada veya sözlükte "Kelimelerime ekle" dendiğinde sadece buton metninin değişmesi yerine, ikonda hafifçe küçülüp yaylanarak beliren bir onay rozeti (`@keyframes check-pop`, 200ms, `--ease-spring`) eklenecek.
- **Tür:** Küçük geri bildirim (Micro-interaction).
- **Tahmini Emek:** 1 saat.
- **Performans Riski:** Sıfır.
- **Erişilebilirlik Riski:** Sıfır.

### Öneri 7: Kelime Aşama Atlamasında (Tohum -> Fidan -> Çiçek) Büyüme Sevinci
- **Ne değişecek:** FSRS aralıklı tekrarında kelime seviye atladığında (ör. Tohumdan Fidana), kelime kartı üzerindeki bitki ikonu minik bir büyüme sıçraması (`scale(0.8) -> scale(1.15) -> scale(1)`, 280ms, `--ease-spring`) ve minik yaprak pırıltısı yapacak.
- **Tür:** Ödül ve motivasyon geri bildirimi.
- **Tahmini Emek:** 1.5 saat.
- **Performans Riski:** Sıfır.
- **Erişilebilirlik Riski:** Sıfır.

### Öneri 8: Oturum Tamamlama ve Özet Ekranında Kademeli Giriş (`Staggered Reveal`)
- **Ne değişecek:** Oturum bittiğinde özet ekranına aniden geçmek yerine; önce özet sahnesi (`.summary-scene`), ardından istatistik kartları ve son olarak "Devam et" butonu 60ms aralıklarla yukarı doğru yumuşakça süzülecek (`translateY(8px) -> translateY(0)`, `--ease-out`).
- **Tür:** Ekran geçişi ve tamamlama ritüeli.
- **Tahmini Emek:** 2 saat.
- **Performans Riski:** Çok düşük (saf CSS delay ve transform).
- **Erişilebilirlik Riski:** Reduced motion altında tüm gecikmeler 0ms olur ve anında görünür.

### Öneri 9: Sekmeler Arası Geçişte View Transitions API Entegrasyonu
- **Ne değişecek:** Alt gezinme çubuğundaki sekmeler (Bugün, Oyunlar, Okuma, Kelimeler) arasında gezinirken, tarayıcı destekliyorsa `document.startViewTransition()` ile hafif çapraz geçiş (cross-fade / subtle slide) sağlanacak; desteklemeyen tarayıcılarda mevcut anlık geçiş korunacak.
- **Tür:** Ekranlar arası geçiş (Page transition).
- **Tahmini Emek:** 2 saat.
- **Performans Riski:** Çok düşük (modern tarayıcı motoru tarafından optimize edilmiş yerel API).
- **Erişilebilirlik Riski:** `@media (prefers-reduced-motion: reduce) { ::view-transition-group(*) { animation-duration: 0s !important; } }` ile tamamen kapatılabilir.

### Öneri 10: Sayfa Açılışlarında ve Segment Değişimlerinde `open-below` ve `spacer-grow` Düzen Sıçramalarının Giderilmesi
- **Ne değişecek:** `.session-stage .sheet-spacer` içindeki `@keyframes spacer-grow` (`height` 0 -> var(--sheet-h)) ve `.game-stage` içindeki `open-below` (`max-height` 0 -> 20rem) animasyonları düzen zıplamasına (layout shift / CLS) neden olmaktadır. `max-height` geçişi yerine `grid-template-rows: 0fr -> 1fr` veya doğrudan `transform + opacity` yapısına geçilecek.
- **Tür:** Düzen stabilitesi ve reflow önleme.
- **Tahmini Emek:** 2.5 saat.
- **Performans Riski:** Pozitif (CLS ve layout jank ortadan kalkar).
- **Erişilebilirlik Riski:** Sıfır.

---

## 7. Tasarımcı İşi: Rive Karakter Animasyonları

> **Not:** Rive entegrasyonu kod tabanına hazır kütüphaneler eklemekten ziyade, özel bir vektörel tasarım ve etkileşimli durum makinesi (state machine) çalışması gerektirdiği için ayrı bir uzmanlık başlığı olarak değerlendirilmiştir.

### 7.1. Neden Lottie veya GIF Değil de Rive?
1. **İnteraktif State Machine:** Rive animasyonları sadece düz video gibi oynamaz; kullanıcının cevabına (doğru/yanlış/bekleme) göre durumlar arasında (`idle` → `celebrate` → `sleep`) kesintisiz geçiş yapar.
2. **Çok Küçük Dosya Boyutu:** Tipik bir Lottie JSON dosyası 200–500 KB iken, Rive ikili dosyaları (.riv) genellikle **15–40 KB** arasındadır. PWA ve mobil veri için idealdir.
3. **Dinamik Renk Bağlama (Token Entegrasyonu):** Rive runtime, animasyon içindeki renkleri uygulamanın CSS değişkenleriyle (`--lang`, `--plant-leaf`, `--ok`) dinamik eşleyebilir. Böylece öğrenilen dil değiştiğinde (EN/FR/ES) maskotun rengi anında odaya uyar.

### 7.2. Önerilen 3 Karakter / Sahne Senaryosu

1. **Kelime Koçu Maskotu ("Cesaret Veren Koç"):**
   - **Kullanım Yeri:** Bugün ekranında selamlama, boş kütüphane ekranı ve zor kelime pratiği başlangıcı.
   - **State Machine Durumları:**
     - `Idle`: Sakin nefes alma, arada bir göz kırpma (sonsuz değil, aralıklı tetiklenen mikro hareket).
     - `Cheer` (Tetikleyici): Seri tamamlandığında veya zor kelime başarıldığında sevinç zıplaması.
     - `Encourage` (Tetikleyici): Hata yapıldığında omuz silkip gülümseme ("Sorun değil, aklında kalacak").
2. **Büyüyen Bahçe Döngüsü (Tohum → Filiz → Fidan → Çiçek):**
   - **Kullanım Yeri:** Bahçe ekranı (`Garden.tsx`) ve oturum özeti sahnesi (`.summary-scene`).
   - **State Machine Durumları:**
     - Sayısal Girdi `growthLevel` (0 to 4): FSRS hafıza kararlılığına göre bitkinin boyu ve yaprakları dinamik evrilir.
     - `Water` (Tetikleyici): Tekrar yapıldığında bitkinin üzerine su damlayıp hafifçe canlanması.
3. **Seri Ateşi (Streak Flame):**
   - **Kullanım Yeri:** Üst çubuk seri göstergesi (`.streak-flame`).
   - Mevcut CSS `flicker` ve `ember` parçacıkları yerine, donma (`frozen`), harlanma (`igniting`) ve sönme durumlarını tek bir pürüzsüz vektörde toplayan dinamik alev.

### 7.3. Tasarımcıya Verilecek Şartname
- **Çalışma Alanı (Artboard):** 120 × 120 px veya 240 × 240 px kare ızgara.
- **Hedef Dosya Boyutu:** En fazla 35 KB (.riv).
- **Kare Hızı:** 60 FPS.
- **Erişilebilirlik:** `prefers-reduced-motion: reduce` algılandığında animasyon `stateMachine.pause()` ile ilk statik karesinde sabitlenecektir.
