# İkon Denetimi Raporu

**Tarih:** 2026-10-10  
**Kapsam:** `src/ui/icons.tsx` (82 ikon), arayüzdeki ikon kullanımları, emoji sapmaları, satır içi SVG'ler ve hizalama kuralları.  
**Tasarım Kılavuzu Referansı:** `DESIGN.md` (24 px ızgara, 1.8 px çizgi kalınlığı, yuvarlak uç/birleşim `round`, `currentColor`, 14–22 px boyut aralığı).

---

## 1. Tutarlılık Tablosu ve Token Uyumu

Kelime Koçu'nun kendi ikon seti `src/ui/icons.tsx` içinde tek bir elden çizilmiş 82 ikondan oluşmaktadır.
Tüm ikonlar temel olarak `Icon` bileşeni sarmalayıcısını kullanır:
- **Izgara:** `viewBox="0 0 24 24"`
- **Çizgi:** `stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"`
- **Dolgu Katmanı (`.icon-duo`):** Soft dolgu katmanı `opacity={0.18} fill="currentColor" stroke="none"` (`<D d="..." />` ve `<S d="..." />` yardımcıları).

### Sapmalar ve Özel Durumlar

| İkon | Sapma Türü | Neden / Etki | Öneri |
|---|---|---|---|
| `BrandMark` (`icons.tsx:535`) | Standart dışı `viewBox` ("104 104 304 304"), hardcoded renkler (`#fff`, `#34d399`), 24px stroke | Uygulamanın logosu ve favicon'u ile birebir örtüşmesi için kasıtlı olarak farklı çizilmiştir. | Korunmalı, ancak bileşen açıklamasına özel logo olduğu not edilmelidir. |
| `PlayIcon` (`icons.tsx:159`) | Çizgi yerine tam gövde dolgusu (`fill="currentColor"`) | Oynat üçgeninin net görünmesi için dolgulu yapılmış; `.icon-duo` katmanı içermiyor. | Tutarlı, ancak diğer medya ikonlarıyla kontrastı izlenmeli. |
| `PauseIcon` (`icons.tsx:164`) | Çift dikdörtgen dolgu (`fill="currentColor"`) | Duraklatma çubukları dolgulu. | Tutarlı. |
| `StopIcon` (`icons.tsx:169`) | Köşeleri yuvarlatılmış kare dolgu (`<rect rx="2.5" fill="currentColor" />`) | Durdurma karesi dolgulu. | Tutarlı. |
| `FlameIcon` (`icons.tsx:362`) | İç çekirdek dolgusu (`fill="currentColor"`) | Alevin merkezindeki küçük damla tam dolu; dış kontur çift katmanlı. | Tasarıma canlılık katıyor, kurala uygun. |
| `TargetIcon` (`icons.tsx:242`) | Merkez nokta dolgusu (`<circle r="1.4" fill="currentColor" />`) | Hedefin tam merkez noktası dolu. | Kurala uygun. |
| `PaletteIcon` (`icons.tsx:460`) | 3 adet boya damlası dolgusu (`fill="currentColor"`) | Palet üzerindeki boya delikleri/damlaları dolu. | Kurala uygun. |

---

## 2. Kullanım Taraması

### A. Kapat Düğmelerinde `CloseIcon` Yerine Metin Karakteri `×` Kullanılan Yerler
`DESIGN.md` "Tek Set Kuralı" gereğince arayüzdeki tüm kapatma düğmeleri `CloseIcon` kullanmalıdır. Kod tabanında 5 farklı dosyada metin karakteri `×` kullanıldığı tespit edilmiştir:

1. `src/ui/ReadingLibrary.tsx:47` — Kitap/metin silme/kapatma butonu: `<button ...>×</button>`
2. `src/ui/WordCard.tsx:86` — Kelime kartı kapat butonu: `<button className="btn-close" ...>×</button>`
3. `src/ui/WordDetail.tsx:363` — Kelime detay kartı kapatma butonu: `<button ...>×</button>`
4. `src/ui/WordExamples.tsx:126` ve `269` — Örnek cümle kapatma / kaldırma butonu: `<button ...>×</button>`
5. `src/ui/WordGraph.tsx:192` — Kelime ağı detay kapatma butonu: `<button ...>×</button>`

> **Öneri:** Bu 5 noktadaki `×` metin karakterleri `<CloseIcon size={16} />` ile değiştirilmelidir.

---

### B. Kod İçerisinde Satır İçi `<svg>` Çizilen Yerler
İkon kütüphanesine dahil edilmesi gerekirken doğrudan JSX içinde satır içi SVG olarak çizilmiş 3 kritik yer bulunmaktadır:

1. `src/ui/Dictionary.tsx:137` ve `src/ui/WordListView.tsx:291`:
   - Dokunsal düzenleme/kalem ikonu satır içi SVG olarak çizilmiş:
     ```tsx
     <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.25" aria-hidden>
     ```
   - Hem `strokeWidth="2.25"` ile tasarım kuralından (1.8px) sapmakta hem de `PenIcon` varken satır içi tekrarlanmaktadır.
2. `src/ui/Screens.tsx:84`:
   - Çevrimdışı göstergesi (`OfflineBadge`) içinde bulut-kapalı SVG'si doğrudan satır içi çizilmiş:
     ```tsx
     <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
     ```
   - Bu ikon `src/ui/icons.tsx` setinde yer almadığı için satır içi eklenmiştir. `CloudOffIcon` veya `OfflineIcon` olarak `icons.tsx`'e taşınmalıdır.

---

### C. Yalnızca `glyphIcon.ts`'te Kalan (Arayüzde Doğrudan Çağrılmayan) İkonlar
`icons.tsx` içinde tanımlanan 82 ikonun tamamı projede mevcuttur (ölü ikon yoktur). Ancak aşağıdaki 12 ikon React bileşenlerinde JSX olarak (`<IconName />`) **hiç doğrudan kullanılmamakta**, yalnızca `src/ui/glyphIcon.ts` dosyasındaki emoji çevirici sözlüğünde (`BY_EMOJI`) yer almaktadır:

- `KeyboardIcon` (`icons.tsx:196`)
- `GaugeIcon` (`icons.tsx:283`)
- `TagIcon` (`icons.tsx:319`)
- `HourglassIcon` (`icons.tsx:326`)
- `HandIcon` (`icons.tsx:347`)
- `UtensilsIcon` (`icons.tsx:488`)
- `FilmIcon` (`icons.tsx:494`)
- `BriefcaseIcon` (`icons.tsx:500`)
- `BoxIcon` (`icons.tsx:506`)
- `SuitcaseIcon` (`icons.tsx:512`)
- `StethoscopeIcon` (`icons.tsx:518`)
- `MountainIcon` (`icons.tsx:524`)

*Not: Bu ikonlar öğrenenin avatarı ya da konuşma görevleri için seçtiği emojilerin arayüz dilinde glife dönüştürülmesi için gereklidir.*

---

## 3. Anlam Çakışmaları

Aynı ikonun tamamen farklı işlevler için kullanıldığı iki belirgin çakışma tespit edilmiştir:

### 1. `SparkleIcon` (Işıltı / Parıltı)
- **Kullanım 1 (Yapay Zekâ):** AI yardımcısı, AI ile anlam bulma, AI örnek cümle üretimi (`AiSettings:47`, `Dictionary:600`, `DictionaryExamples:210`, `WordFamily:205`).
- **Kullanım 2 (Serbest Pratik):** Ana işlem menüsünde serbest pratik oturumu başlatma (`App.tsx:564`).
- **Kullanım 3 (Tebrik / Başarı):** "Bütün hedefler tamam!" ve "Kelimeleri doğru kullandın" tebrikleri (`Produce.tsx:187`, `Produce.tsx:490`).
- **Sorun:** Kullanıcı bir yerde ışıltıyı görünce yapay zekâ özelliği sanmakta, diğer yerde başarı kutlaması sanmaktadır.
- **Öneri:** Yapay zekâ için `WandIcon` (Sihirli değnek) ya da özel bir `AiSparkleIcon` kullanılmalı; `SparkleIcon` başarı/parıltı durumlarına ayrılmalıdır.

### 2. `BoltIcon` (Şimşek)
- **Kullanım 1 (Zor Kelime):** Öğrenenin zorlandığı kelimeyi işaretlemesi (`DifficultButton:17`, `Garden:100`, `WordLabel:16`, `Session:586`, `WordListView:439`).
- **Kullanım 2 (Hız / Zamana Karşı):** Fiil laboratuvarı ve oyunlarda zamana karşı yarış modu (`PracticeTab:36`, `TimedTab:49`).
- **Sorun:** Şimşek sembolü bir ekranda "bu kelime beni zorladı" anlamına gelirken, diğer ekranda "hızlı ol / süre kısıtlı" anlamına gelmektedir.
- **Öneri:** "Zamana karşı" modu için `TimerIcon` veya `SpeedIcon` tercih edilmeli; `BoltIcon` "Zor kelime / şimşek" kavramına bırakılmalıdır.

---

## 4. Eksik İkonlar ve Tasarım Önerileri

Son turlarda eklenen yenilikçi özelliklerin bir kısmı jenerik ikonlarla veya emojiyle sunulmaktadır. Claude Code'un çizmesi için önerilen ikon tarifleri:

| Özellik | Mevcut Durum | Sorun | Önerilen İkon ve Kısa Tarif |
|---|---|---|---|
| **Çekimler** | `Reading.tsx:693` (İkonsuz), `Dictionary.tsx:425` (`TenseIcon`) | Çekim listesi bir zaman dilimi değil; morfem/biçimbirim açılımıdır. | **`ConjugationsIcon`**: Basamaklı iki kelime kartı veya kök kutusunun yanından ayrılan ek dalı (1.8px). |
| **Dikte** | `Reading.tsx:683` (`EarIcon`) | Yalnızca kulak "dinleme"yi anlatır, "dinleyip yazma"yı anlatmaz. | **`DictationIcon`**: Kulaklık veya ses dalgasının hemen yanına iliştirilmiş ince bir yazı kalemi. |
| **Gölgele (Shadowing)** | `Reading.tsx:688` (`MicIcon`) | Düz mikrofon, ses kaydı ile karışır. | **`ShadowingIcon`**: Peş peşe gelen iki yarım ses dalgası profili (yankı / gölge efekti). |
| **Geri çeviri** | `Games.tsx:104`, `gameList.ts:7` (`🔁` Emojisi) | `DESIGN.md` Tek Set Kuralı ihlali (emoji kullanımı). | **`BackTranslateIcon`**: Karşılıklı iki dil kartı arasında çift yönlü ters kavisli oklar (`A ⇄ B`). |
| **Kaçırdıkların** | `Games.tsx:114`, `gameList.ts:11` (`🎯` Emojisi) | `TargetIcon` ile karışmakta ve emoji kullanılmakta. | **`EarMissIcon`**: Çevresinde kesik çizgili ses dalgaları veya odak halkası olan kulak sembolü. |
| **Fiil tekrarı** | `Screens.tsx:409` (`BoltIcon`) | Zor kelime şimşeği ile çakışıyor. | **`VerbReviewIcon`**: Dairesel geri dönüş oku ile birleşmiş fiil `V` veya saat simgesi. |
| **Çevrimdışı** | `OfflineBadge.tsx` (ikonsuz metin), `Screens.tsx:84` (satır içi SVG) | İkon setinde standartlaştırılmamış. | **`CloudOffIcon` / `OfflineIcon`**: Üzerinden 45 derece çapraz çizgi geçen 24px/1.8px bulut veya sinyal dalgası. |

---

## 5. Boyut ve Hizalama Denetimi

### A. 14–22 px Kural Dışı Boyutlar
`DESIGN.md` kuralı: "Boyut: 14–22 px; en sık 16 ve 18."

- **Çok Küçük Boyutlar (<14px):**
  - `src/ui/ConjugationTable.tsx:68, 81`: `<CheckIcon size={12} />` (Retina ekranlarda bile çizgisi silikleşiyor).
  - `src/ui/Onboarding.tsx:109`: `<CheckIcon size={12} />`
  - `src/ui/ProfileTitles.tsx:42, 73`: `<LockIcon size={12} />` (Kilit detayları 12px'te seçilmiyor).
  - `src/ui/WordListView.tsx:644`: `<MicIcon size={12} />`
  - `src/ui/Dictionary.tsx:398`: `<SpeakerIcon size={13} />`
  - `src/ui/Produce.tsx:482`: `<CheckIcon size={13} />`
  - `src/ui/Profile.tsx:78`: `<LockIcon size={13} />`
  - `src/ui/SessionSummary.tsx:338`: `<StarIcon size={13} />`
  > **Öneri:** 12px ve 13px kullanılan yerlerin tamamı taban sınır olan **14px** değerine çekilmelidir.

- **Büyük Buton ve Hero Boyutları (>22px):**
  - `src/ui/AccountSettings.tsx:54`: `<UserIcon size={24} />` (Avatar kutusunda 22px'e çekilebilir).
  - `src/ui/Habits.tsx:39, 72`: `<SunIcon size={24} />`, `<MoonIcon size={24} />` (20-22px olmalı).
  - `src/ui/games/GameResult.tsx:49`: `<TrophyIcon size={24} />`
  - Oyun ve Dikte merkez oynatıcıları: `SpeakerIcon size={32}` (`NativeDictation.tsx:157`, `Sentences.tsx:235`, `TextDictation.tsx:128`, `AudioReview.tsx:143`).
  - Boss arenası: `SwordsIcon size={32}`, `FlameIcon size={34}`, `TrophyIcon size={36}` (`BossArena.tsx:211, 298`).
  > **Öneri:** Oyun ve dikte merkezlerindeki 32–36px boyutları bilinçli hero öğeleridir. Ancak genel arayüzdeki 24px kullanımları standart `22px` tavanına indirilmelidir.

---

### B. `.inline-icon` Dikey Hizalama Sorunları
`src/index.css` satır 3096:
```css
.inline-icon { display: inline-block; vertical-align: -0.18em; margin-right: 0.35em; }
.inline-icon.is-end { margin: 0 0 0 0.35em; }
```

1. **Tırnak ve Parantez Yanında Düşüklük:**
   - `src/ui/ProfileTitles.tsx:73`: `<LockIcon size={12} className="inline-icon" />“{badge?.title}”`
   - Tırnak işareti (`“`) üst çizgide başlarken `-0.18em` ile aşağı kaydırılan kilit ikonu görsel olarak çok aşağıda kalmaktadır.
2. **Buton İçi Hizalama:**
   - `src/ui/Prequestions.tsx:34`: `<button ...><HelpIcon size={16} className="inline-icon" />Okumadan önce 3 soru</button>`
   - Buton zaten `display: inline-flex; align-items: center;` ile hizalandığında `vertical-align: -0.18em` ikonu gereksiz yere aşağı çekmektedir.
   > **Öneri:** Buton içindeki ikonlar için `margin-right: 0.35em; vertical-align: middle;` ya da butonun doğrudan flexbox merkezlemesine güvenilmesi tavsiye edilir.

---

## 6. Ekran Görüntüleri Referansları (Telefon 375 px, Koyu Tema)

Denetim sırasında telefon (375 px) ve koyu tema altında çekilen ekran görüntüleri:

1. **Okuma Araç Çubuğu:**
   `docs/screenshots/icon-audit/01-reading-tools-dark-phone.png`  
   *Gözlem:* Dikte (`EarIcon`), Gölgele (`MicIcon`) ve Çekimler (ikonsuz buton) araç çubuğunda yan yana. İkonların ayırt ediciliği zayıf kalıyor.

2. **Oyunlar Sekmesi ve Emojiler:**
   `docs/screenshots/icon-audit/02-games-emojis-dark-phone.png`  
   *Gözlem:* Geri çeviri (`🔁`) ve Kaçırdıkların (`🎯`) satırlarında `DESIGN.md`'nin tek set kuralına aykırı şekilde sistem emojisi kullanıldığı açıkça görülüyor.

3. **Kelimeler Listesi ve Filtreler:**
   `docs/screenshots/icon-audit/03-words-icons-dark-phone.png`  
   *Gözlem:* Zor kelime şimşeği (`BoltIcon`), ses butonu (`SpeakerIcon`) ve arama ikonu. Koyu temada `currentColor` uyumu başarılı.

4. **Profil ve Rozetler (Küçük Boyutlar ve Kilitler):**
   `docs/screenshots/icon-audit/04-profile-badges-dark-phone.png`  
   *Gözlem:* Kilit ikonlarının 12px kullanımı koyu temada soluk kalmakta ve seçilebilirliği düşmektedir.
