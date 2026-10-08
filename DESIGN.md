---
name: Kelime Koçu
description: Cesaret veren bir kelime koçu — dil değişince odanın ışığı değişir, her cevap anında renkli bir karşılık alır.
source:
  - src/index.css            # :root tokenları (satır 8–94), koyu tema (96–148), dil vurgusu (151–152), sakin mod (:root[data-calm])
  - src/ui/icons.tsx         # uygulamanın kendi ikon seti
  - package.json             # @fontsource/lexend, @fontsource/literata
generatedAt: "2026-10-08"
colors:
  # Zemin ve mürekkep (açık tema; koyu tema değerleri src/index.css'te aynı adlarla)
  bg: "color-mix(in srgb, var(--lang) 3%, #f1f5f9)"
  surface: "#ffffff"
  surface-2: "#f8fafc"
  track: "#e2e8f0"
  rule: "#e2e8f0"
  ink: "#0f172a"
  ink-soft: "#57677e"
  scrim: "rgb(15 23 42 / 0.45)"
  # Dil vurgusu: tüm uygulamayı boyar. --lang/-deep/-soft/-text aktif dile bağlanır ([data-lang]).
  en: "#2f6de6"
  en-deep: "#1b4ba9"
  en-soft: "#e5f1ff"
  en-text: "#2b58b1"
  fr: "#c6317c"
  fr-deep: "#901a57"
  fr-soft: "#ffe8f1"
  fr-text: "#9a2f62"
  es: "#e6a313"
  es-deep: "#b76c00"
  es-soft: "#fceed9"
  es-text: "#844b00"
  # Aktif dil: [data-lang] ile en/fr/es ailesine bağlanır. Bileşenler hep bunları kullanır.
  lang: "{colors.en}"
  lang-deep: "{colors.en-deep}"
  lang-soft: "{colors.en-soft}"
  lang-text: "{colors.en-text}"
  on-lang: "#ffffff"          # İspanyolcada #451a03 (amber koyu metin ister)
  # Cevap geri bildirimi: yalnızca doğru / yakın / yanlış için
  ok: "#10b981"
  ok-soft: "#d1fae5"
  ok-text: "#047857"
  ok-btn: "#047857"
  near: "#f97316"
  near-soft: "#ffedd5"
  near-text: "#c2410c"
  near-btn: "#c2410c"
  bad: "#f43f5e"
  bad-soft: "#ffe4e6"
  bad-text: "#be123c"
  bad-btn: "#e11d48"
  on-color: "#ffffff"
  # Ayrı anlam katmanları
  gender-m: "#0e7490"
  gender-f: "#7c3aed"
  gold: "#f59e0b"
  gold-text: "#b45309"
  flame: "#f97316"
  plant-leaf: "#10b981"
  plant-seed: "#a16207"
  # Kategori ve konu paleti: oyun grupları ve hata türleri
  cat-blue: "#3b82f6"
  cat-emerald: "#10b981"
  cat-orange: "#f97316"
  cat-violet: "#8b5cf6"
  cat-rose: "#f43f5e"
  cat-amber: "#f59e0b"
  cat-pink: "#ec4899"
  cat-teal: "#14b8a6"
  cat-red: "#ef4444"
  cat-indigo: "#6366f1"
  # Grafikler
  chart-data: "{colors.lang}"
  chart-grid: "{colors.rule}"
  chart-axis: "{colors.ink-soft}"
  chart-track: "{colors.track}"
typography:
  sans: "'Lexend', system-ui, sans-serif"      # arayüz (okuma akıcılığı için tasarlanmış)
  serif: "'Literata', Georgia, serif"           # hedef dildeki kelimeler ve cümleler
  weights: [400, 500, 600, 700]                 # 700'den kalın yok (Lexend 400–700 yüklü)
  scale:
    t-xs: "0.75rem"
    t-sm: "0.875rem"
    t-base: "1rem"
    t-md: "1.125rem"
    t-lg: "1.25rem"
    t-xl: "1.5rem"
    t-2xl: "1.875rem"
    t-word: "clamp(2.25rem, 8vw, 3.75rem)"
  roles:
    display: { size: "{typography.scale.t-2xl}", weight: 700 }   # sayfa başlığı
    title: { size: "{typography.scale.t-lg}", weight: 700 }      # .section-title
    card: { size: "{typography.scale.t-md}", weight: 700 }       # kart içindeki .section-title
    item: { size: "{typography.scale.t-base}", weight: "600–700" }
    body: { size: "{typography.scale.t-base}", weight: 400 }
    support: { size: "{typography.scale.t-sm}", weight: 400, color: "{colors.ink-soft}" }   # .small .muted
    caption: { size: "{typography.scale.t-xs}", weight: 600 }    # .eyebrow, etiketler
radius:
  r-xs: "0.375rem"    # etiketler
  r-sm: "0.625rem"    # küçük kontroller, ikon düğmeleri
  r-md: "0.875rem"    # düğmeler, çipler, alanlar, seçenekler
  r-lg: "1.25rem"     # kartlar, paneller, kutucuklar
  r-full: "999px"     # hap etiketler, çubuklar
spacing:
  scale: ["0.125rem", "0.25rem", "0.375rem", "0.5rem", "0.625rem", "0.75rem", "0.875rem", "1rem", "1.25rem", "1.5rem", "2rem", "2.5rem"]
  stack: "1rem"          # .stack çocukları arası
  section: "2.5rem"      # .section + .section
  card-padding: "1.5rem"
shadows:
  - { name: "shadow-sm", value: "0 1px 2px rgb(15 23 42 / 0.06)", purpose: "çok hafif kabarma" }
  - { name: "shadow", value: "0 0 0 1px rgb(15 23 42 / 0.06), 0 1px 2px rgb(15 23 42 / 0.05), 0 6px 20px rgb(15 23 42 / 0.06)", purpose: "kart: kıl ince halka + yumuşak gölge" }
  - { name: "shadow-lg", value: "0 12px 32px rgb(15 23 42 / 0.16)", purpose: "açılır menü, yüzen öğe" }
  - { name: "shadow-xl", value: "0 24px 60px rgb(15 23 42 / 0.3)", purpose: "diyalog, sayfa üstü katman" }
  - { name: "inset-ring", value: "inset 0 0 0 1px var(--rule)", purpose: "kart içindeki kutu" }
  - { name: "press-edge", value: "0 4px 0 var(--lang-deep)", purpose: "düğmenin alt kenarı (çip ve sessiz düğmede 0 3px 0 var(--rule))" }
motion:
  - { name: "ease-out", value: "cubic-bezier(0.2, 0.8, 0.2, 1)", purpose: "her geçişin varsayılan eğrisi" }
  - { name: "ease-spring", value: "cubic-bezier(0.3, 1.4, 0.5, 1)", purpose: "ödül anları, hafif zıplama" }
  - { name: "dur-press", value: "80ms", purpose: "basma" }
  - { name: "dur-fast", value: "150ms", purpose: "üzerine gelme, renk" }
  - { name: "dur", value: "280ms", purpose: "açılma, belirme" }
breakpoints:
  - { name: "phone", value: "30rem", note: "max-width; en çok kullanılan (37 kural)" }
  - { name: "small", value: "40rem", note: "max/min-width" }
  - { name: "tablet", value: "46rem", note: "min-width (max 45.99rem)" }
  - { name: "desktop", value: "64rem", note: "min-width (max 63.99rem)" }
icons:
  set: "Kelime Koçu'nun kendi seti (src/ui/icons.tsx, 82 ikon)"
  source: "src/ui/icons.tsx"
  grid: "24px viewBox"
  style: { variant: "outline + aynı renkte yumuşak dolgu (.icon-duo)", strokeWidth: 1.8, linecap: "round" }
  sizes: { xs: 14, sm: 16, md: 18, lg: 20, xl: 22 }
  color: "currentColor"
components:
  button:
    source: "src/index.css (.btn, .btn-quiet, .btn-danger, .btn-ok, .btn-sm, .btn-lg)"
    backgroundColor: "{colors.lang}"
    textColor: "{colors.on-lang}"
    radius: "{radius.r-md}"
    padding: "0.75rem 1.5rem"
    edge: "0 4px 0 var(--lang-deep)"
    states: [hover (brightness 1.06), active (3px aşağı, kenar 1px), disabled (opacity 0.45), focus-visible]
  chip:
    source: "src/index.css (.chip, .chip-sm)"
    backgroundColor: "{colors.surface}"
    border: "2px solid {colors.rule}"
    radius: "{radius.r-md}"
    padding: "0.5rem 1rem"
    states: ["aria-pressed=true: kenar ve gölge {colors.lang}, zemin {colors.lang-soft}, metin {colors.lang-text}, 700"]
  card:
    source: "src/index.css (.card)"
    backgroundColor: "{colors.surface}"
    radius: "{radius.r-lg}"
    padding: "1.5rem"
    shadow: "shadow"
  tile:
    source: "src/index.css (.tiles, .tile, .tile-icon)"
    radius: "{radius.r-lg}"
    padding: "1rem"
    icon: "2.75rem kare, {radius.r-md}, zemin {colors.lang-soft}, renk {colors.lang-text}"
    states: [hover (2px yukarı)]
  segmented:
    source: "src/index.css (.segmented, .segmented-btn)"
    backgroundColor: "{colors.surface-2}"
    radius: "{radius.r-md}"
    states: ["seçili: zemin {colors.surface}, metin {colors.lang-text}, gölge"]
  input:
    source: "src/index.css (.input, .textarea)"
    border: "2px solid {colors.rule}"
    radius: "{radius.r-md}"
    padding: "0.625rem 0.75rem"
    states: ["focus: kenar {colors.lang}"]
  pill:
    source: "src/index.css (.pill)"
    radius: "{radius.r-full}"
    typography: "{typography.roles.caption} (700)"
  note:
    source: "src/index.css (.note, .habit-nudge)"
    backgroundColor: "{colors.surface-2}"
    radius: "{radius.r-md}"
  bars:
    source: "src/index.css (.bars, .bar-row, .bar-track, .bar-fill, .hour-list)"
    track: "{colors.track}"
    fill: "{colors.chart-data}"
  menu:
    source: "src/ui/Popover.tsx (Popover, MenuItem)"
  dialog:
    source: "src/ui/Dialog.tsx (ConfirmDialog)"
  toggle:
    source: "src/ui/SettingsScreen.tsx (Toggle)"
  page-header:
    source: "src/ui/PageHeader.tsx"
  empty-state:
    source: "src/ui/EmptyState.tsx"
  group-toggle:
    source: "src/ui/JumpNav.tsx (GroupToggle)"
  plant:
    source: "src/ui/Plant.tsx"
---

# Tasarım Sistemi: Kelime Koçu

> Bu dosya **kural koyar**. Yeni ekran ya da bileşen yazan her ajan (Claude Code, Antigravity, başkası) önce buna bakar. Değerlerin gerçek kaynağı `src/index.css`; burada kopyası değil, **adı ve kuralı** var. İkisi çelişirse kod doğrudur ve bu dosya güncellenir.

## Genel bakış

**Kuzey yıldızı: "Cesaret veren koç, büyüyen bahçe."**

Kelime Koçu, öğreneni yargılamayan, her cevaba hemen ve renkli karşılık veren bir koç gibi davranır. Kelimeler tohumdan çiçeğe büyür (bahçe, bitki, filiz). Görsel dil sıcak, dokunsal ve sakin: düğmeler basılınca gerçekten aşağı iner, kartlar sayfadan hafifçe kalkar, renk yalnızca bir şey söylemek için kullanılır.

Uygulama **tek vurgu rengiyle** yaşar: öğrenilen dilin rengi. İngilizce mavi, Fransızca pembe, İspanyolca kehribar. Dil değişince odanın ışığı değişir (sayfa zemini bile o rengin %3'ünü taşır), ama ekranın "sesi" değişmez: üç renk OKLCH'de aynı ağırlığa ayarlı.

**Böyle görünmemeli:** kurumsal gösterge paneli (gri, sıkışık, her yerde tablo); çocuk oyunu (her şey renkli, her köşede emoji); sosyal medya (bildirim rozetleri, sonsuz akış, dikkat çekmek için hareket).

**Ana özellikler:**
- Bir ekranda tek vurgu: aktif dilin `--lang` ailesi.
- Geri bildirim renkleri (yeşil/turuncu/kırmızı) yalnızca cevaplar için.
- Dokunsal düğmeler: alt kenar gölgesi, basınca aşağı inme.
- Hedef dildeki her şey serif (Literata), arayüz sans (Lexend).
- Açık, koyu ve sakin (data-calm) üç tema; hepsi aynı token adlarıyla.

## Renkler

Slate nötrler üzerinde dil başına bir vurgu; geri bildirim için ayrı, sabit üç renk.

### Dil vurgusu (`--lang` ailesi)
- **Okyanus mavisi** (`--en` #2f6de6), **Fuşya** (`--fr` #c6317c), **Kehribar** (`--es` #e6a313): birincil düğmeler, seçili çipler, ilerleme çubukları, grafik verisi, odak halkası. Her birinin dört tonu var: dolu (`--lang`), basma kenarı (`--lang-deep`), yumuşak zemin (`--lang-soft`), metin (`--lang-text`, sayfada en az 6:1).
- Kehribar açık bir renk olduğu için üstündeki metin koyudur (`--on-lang: #451a03`). Kehribar **metin rengi olarak** kullanılmaz; metin için her zaman `--lang-text`.

### Nötrler
- **Sayfa** (`--bg`): slate-100 ve dilin rengi. **Yüzey** (`--surface`): kartlar. **İkinci yüzey** (`--surface-2`): kart içindeki kutular, notlar, segment arka planı.
- **Mürekkep** (`--ink`): ana metin. **Yumuşak mürekkep** (`--ink-soft`): açıklama, yardım, sayaç; sayfa zemininde de 4.5:1.
- **Çizgi / iz** (`--rule`, `--track`): ayırıcılar, boş çubuk izi.

### Geri bildirim
- **Zümrüt** (`--ok`), **Turuncu** (`--near`, "yakındı"), **Gül** (`--bad`): doğru, neredeyse doğru, yanlış. Her birinin `-soft` zemini, `-text` metni ve beyaz yazılı düğmesi (`-btn`, 4.5:1) var.
- Turuncu, "yakın" anlamını başka yerde de taşır: tabloda sık yanlış yapılan kişi, kuralın dışındaki biçimin alt çizgisi.

### Ayrı anlam katmanları
- **Dilbilgisel cinsiyet**: `--gender-m` (camgöbeği), `--gender-f` (mor). Dil renklerinden ve geri bildirimden bilerek ayrı.
- **Ödül**: `--gold` / `--gold-text` (XP), `--flame` (seri). **Bahçe**: `--plant-*`.
- **Kategori / konu paleti**: `--cat-*` (oyun grupları ve hata türleri: mavi, zümrüt, turuncu, mor, gül, kehribar, pembe, turkuaz, kırmızı, çivit).

**Tek Ses Kuralı.** Bir ekranda yalnızca bir vurgu ailesi vardır: aktif dilin `--lang`'ı. Başka bir dilin rengi yalnızca o dili etiketlerken (dil seçici, dil rozeti) görünür.

**Geri Bildirim Ayrı Kuralı.** `--ok`, `--near`, `--bad` yalnızca cevap sonucunu, hatayı ya da riski anlatır; süs, kategori ya da marka rengi olarak kullanılmaz.

**Token Kuralı.** Bileşen CSS'inde düz hex yazılmaz; her renk bir `var(--…)` ya da onun `color-mix`'idir. Yeni bir anlam gerekiyorsa önce `:root`'a, koyu temaya ve sakin moda token eklenir.

## Yazı

**Arayüz:** Lexend (yedek: system-ui) / **Hedef dil:** Literata (yedek: Georgia)

**Karakter:** Lexend okuma akıcılığı için tasarlanmış, yuvarlak ve açık; Literata kitap gibi okunan, sakin bir serif. Ekranda hangi kelimenin "öğrenilen dil" olduğu yazı tipinden anlaşılır.

### Hiyerarşi (`src/index.css` "Type roles" yorumu)
- **Display** (700, `--t-2xl` 30px, sıkı): sayfa başlığı.
- **Title** (700, `--t-lg` 20px): `.section-title`. Kart içinde `--t-md` 18px.
- **Item** (600–700, 16px): listedeki satırın, kutucuğun adı.
- **Body** (400, 16px): akan metin.
- **Support** (400, `--t-sm` 14px, `--ink-soft`): `.small .muted`, açıklama ve yardım.
- **Caption** (600, `--t-xs` 12px): `.eyebrow`, etiket, sayaç.
- **Kelime** (`--t-word`, clamp 36–60px, Literata): çalışma kartındaki hedef kelime.

**Kalınlık Kuralı.** 700'den kalın yazı yok; vurgu boyut ve renkle yapılır.

**Hedef Dil Kuralı.** Öğrenilen dildeki her kelime ve cümle `lang` özniteliği taşır ve gövde metninde `--serif` ile yazılır; arayüz metni hiçbir zaman serif değildir.

## Derinlik

Dört katman, her birinin tek görünüşü var:

| Katman | Görünüş | Kullanım |
|---|---|---|
| Sayfa | `--bg` | zemin |
| Kart | `--surface` + `--shadow` | sayfadan kalkan blok |
| İç kutu | `--surface-2` + `--inset-ring` | kart içindeki kutu |
| Üst katman | `--surface` + `--shadow-xl` | diyalog, menü, sayfa |

Koyu temada gölgeler kaybolduğu için kartları ince bir halka ayırır.

**Kartta Kart Yok Kuralı.** Kartın içine ikinci bir `.card` konmaz; içeride `--surface-2` iç kutu kullanılır.

**Dokunsal Kenar Kuralı.** Basılabilen öğelerin (`.btn`, `.chip`) alt kenar gölgesi vardır (`0 4px 0` / `0 3px 0`); basınca öğe aşağı iner ve kenar 1px'e düşer. Basılamayan hiçbir şey bu kenarı taşımaz.

## Hareket

Tek eğri ailesi, üç süre: basma 80 ms (`--dur-press`), üzerine gelme ve renk 150 ms (`--dur-fast`), açılma ve belirme 280 ms (`--dur`); varsayılan eğri `--ease-out`, ödül anlarında `--ease-spring`. Çubuklar açılırken soldan büyür (`bar-grow`, 700 ms).

**Azaltılmış Hareket Kuralı.** Her animasyon `prefers-reduced-motion: reduce` altında kapanır ya da anlık olur.

## Yerleşim

Telefon önce gelir. Kırılma noktaları: **30rem** (telefon, en sık kullanılan), 40rem, 46rem (tablet), 64rem (masaüstü). Dikey ritim `.stack` (çocuklar arası 1rem) ve `.section + .section` (2.5rem) ile kurulur. Kutucuk ve kart ızgaraları `auto-fit` + `minmax(min(13–14rem, 100%), 1fr)` ile kendiliğinden sarar.

**Yatay Kaydırma Yok Kuralı.** 375 px genişlikte hiçbir ekran yatay kaydırma üretmez (E2E `overflow()` bunu kontrol eder); içerik sığmazsa sarar.

**Önce İçerik Kuralı.** Kullanıcının geldiği şey (çekim tablosu, kelime, cümle) ilk ekranda görünür; açıklamalar ve seçenekler altında ya da menüde durur.

## Bileşenler

Her bileşenin gerçek hâli `source`'ta. Yeni bir şey yazmadan önce bu listeden birini kullan.

### Düğmeler (`.btn`)
- **Karakter:** tok ve dokunsal.
- **Birincil:** dil rengi zemin, `--on-lang` metin, `--r-md`, 0.75rem × 1.5rem, alt kenar `--lang-deep`.
- **Sessiz** (`.btn-quiet`): yüzey zemin, 2px çizgi kenarı. **Tehlike** (`.btn-danger`): sessiz görünüş, gül metin. **Onay** (`.btn-ok`): zümrüt.
- **Boyutlar:** `.btn-sm`, `.btn-lg`, `.btn-block`.
- **Bir Birincil Kuralı.** Bir kartta en fazla bir dolu birincil düğme olur; diğerleri sessiz, çip ya da bağlantıdır.

### Çipler (`.chip`)
Seçenek, filtre, aç/kapa. Seçili hâl `aria-pressed="true"` ile çizilir (dil rengi kenar ve yumuşak zemin); seçim durumu başka bir sınıfla taklit edilmez.

### Kartlar ve kutucuklar (`.card`, `.tile`)
Kart `--r-lg`, 1.5rem iç boşluk, `--shadow`. Kutucuk (`.tile`), bir yere götüren büyük düğmedir: solda 2.75rem renkli ikon kutusu, sağda kalın ad ve `.small .muted` açıklama; üzerine gelince 2px kalkar.

### Segment (`.segmented`)
Aynı yerdeki görünüm seçimi (Basit / Kıyasla / Detaylı). Sekme yerine kullanılır; seçili parça yüzeye kalkar.

### Alanlar (`.input`, `.textarea`)
2px çizgi kenarı, `--r-md`; odakta kenar dil rengine döner.

### Notlar (`.note`, `.habit-nudge`, `.pill`)
Kısa bilgi `.note` (iç kutu). Alışkanlık önerisi `.habit-nudge` (kesik çizgili). Durum etiketi `.pill` (hap, 12px 700).

### Çubuklar (`.bars`, `.hour-list`)
Ad, iz ve değer üç sütun; dolgu `--chart-data`. Grafiklerde tek veri rengi var: dil.

### Menüler, diyaloglar, anahtarlar
`Popover` + `MenuItem` (açılır menü), `ConfirmDialog` (onay), `Toggle` (ayar anahtarı), `GroupToggle` (açılır bölüm), `PageHeader`, `EmptyState`. Bunların yerine yeni bir menü, diyalog ya da anahtar yazılmaz.

## İkonlar

**Set:** Kelime Koçu'nun kendi seti (`src/ui/icons.tsx`): 24px ızgara, 1.8px yuvarlak uçlu çizgi ve aynı renkte yumuşak bir dolgu katmanı. Hazır bir kütüphane (lucide, heroicons) eklenmez.
**Boyut:** 14–22 px; en sık 16 ve 18. **Renk:** `currentColor`; ikon metnin rengini alır.

- Dinle → `SpeakerIcon` · Ekle → `PlusIcon` · Kapat / yanlış → `CloseIcon` · Doğru → `CheckIcon` · Diğer seçenekler → `MoreIcon` · Fiil zamanı → `TenseIcon`

**Tek Set Kuralı.** Arayüzde yalnızca `icons.tsx` ikonları. Emoji yalnızca öğrenenin seçtiği yerde (avatar) ya da karakterlerde (oyun boss'ları).

**currentColor Kuralı.** İkona renk yazılmaz; rengi kapsayan metinden ya da ikon kutusundan gelir.

## Yap / Yapma

### Yap
- **Yap:** Her rengi token ile yaz; yeni anlam için önce `:root`, koyu tema ve `data-calm` bloklarına token ekle.
- **Yap:** Seçili durumları `aria-pressed` / `aria-selected` ile çiz.
- **Yap:** Hedef dildeki metne `lang` ver; gövdede `--serif` kullan.
- **Yap:** Yeni ekranı 375 px'te, açık ve koyu temada dene; E2E'deki `overflow()` ve `contrastProblems()` boş dönmeli.
- **Yap:** Açıklama metnini `.small .muted` ile, başlığı `.section-title` ile yaz.

### Yapma
- **Yapma:** Bir ekranda iki dilin vurgusunu birlikte kullanma.
- **Yapma:** Yeşil, turuncu ya da kırmızıyı cevap dışı bir anlamda (kategori, süs) kullanma.
- **Yapma:** Kartın içine kart koyma.
- **Yapma:** 700'den kalın yazı kullanma.
- **Yapma:** Kehribarı (`--es`) metin rengi yapma; `--lang-text` kullan.
- **Yapma:** Arayüze emoji ya da başka bir ikon kütüphanesi ekleme.
- **Yapma:** Kullanıcının geldiği içeriği açıklama metninin altına itme.

## Bilinen sapmalar (kural değil, düzeltilecek borç)

> Bu bölüm **kural değildir**; bugünkü kodun yukarıdaki kurallardan saptığı yerlerin listesi.

- **Süs öğelerinde düz renkler.** Gerçek: seri alevi seviyeleri, profil afişleri, avatar çerçeveleri, madalyalar düz hex kullanıyor. Yer: `src/index.css` 2453–2455, 4092–4110; `src/ui/Medal.tsx` (24 yer). Durum: izin verilen istisna olarak öneriliyor (illüstrasyon ve kozmetik; arayüz anlamı taşımıyor). Senin onayınla kesinleşir.
- **Sol kenar şeritleri.** `border-left: 3px` beş yerde (tanım, hikâye çevirisi, karışma notu, günlük, `.hyper`). Tutarlı bir desen gibi kullanılıyor; şimdilik izin verilen istisna. Yeni yerlerde iç kutu (`.note`) tercih edilmeli.
