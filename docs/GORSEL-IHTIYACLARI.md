# Görsel ihtiyaçları (Monki ve çizimler) — 9 Kasım 2026

Uygulamanın bütün ana ekranları telefonda ve masaüstünde, açık ve koyu temada tek tek gezilerek hazırlandı (örnek kelimelerle yeni bir hesap, bir öğrenme oturumu ve özeti, Monki paneli dahil). Amaç: çizimi **eksik**, **zayıf** ya da **üslubu tutmayan** yerleri bulmak ve yeni çizimleri ChatGPT'nin görsel üretimiyle yapmak.

## Genel durum

İyi olanlar: 366 çizim var ve büyük bölümü yerinde. Bütün sayfa başlıklarında Monki duruyor (Ekim listesindeki 4. madde bitti). Ayarlar simgeleri, oyun kartları, oturumdaki doğru/yanlış tepkileri, seri alevi, bahçe, rozetler, boş durumların çoğu (Hatalar, Okuma kütüphanesi, Yaz & konuş günlüğü) tutarlı. Koyu temada okunmayan bir çizim yok.

Zayıf yerler üç türlü:

1. **Hiç çizimi olmayan ekranlar ve kartlar.** En göze batanı Topluluk (masaüstünde yarısı boş, yalnızca yazılı kutular). Sonra Rehber'deki "Seviyeni bul", İlerleme'nin boş haftası, Çeviri'nin "kullanılamıyor" durumu.
2. **Eski üslupta kalan tek çizim:** Hikaye'nin boş durumu hâlâ ince çizgili SVG defter. Yanındaki her şey Monki sahnesi.
3. **Hazır ama kullanılmayan 9 çizim:** `lang-en/fr/es` (dil kartlarındaki `lang-monki-*`ın ikinci takımı), `onb-map`, `onb-plant`, `celebration-confetti`, `game-twins`, `empty-search`, `share-card-story`. Bunlar için yeni çizim gerekmez; yerlerine koymak ya da silmek benim işim (aşağıda B).

> **ChatGPT'ye verilecek hazır görev dosyası:** [`docs/chatgpt/GORSEL-GOREVLERI.md`](chatgpt/GORSEL-GOREVLERI.md) ve referans görseli `docs/chatgpt/monki-referans.jpg`. Aşağıdaki A bölümünün kendi başına okunur hâli.

## ChatGPT'ye verilecek ortak üslup

Her istemin başına bu blok eklenir. Tutarlılık için istemle birlikte mevcut üç çizimi **referans görsel** olarak sohbete yükle: `src/assets/art/monki-wave.webp`, `src/assets/art/head-games.webp`, `src/assets/art/scene-together.webp`.

```text
STYLE: Cute kawaii cartoon sticker illustration in the exact style of the attached reference images.
The mascot "Monki" is a small brown monkey: round head, big glossy dark eyes with a white highlight,
cream-beige face, muzzle and belly, rosy pink cheeks, rounded ears with peach inner ear, a long curly tail,
and ONE small green leaf sprouting from the top of the head. Thick, even dark-brown outlines (never black),
flat warm colours with soft cel shading, gentle and friendly expression.
No text, no letters, no numbers, no watermark, no logo, no frame, no ground shadow.
Isolated on a plain pure white background (#FFFFFF), centred, with generous white margin on every side.
```

Birden çok çizim tek görselde istenecekse şu satır eklenir:

```text
LAYOUT: N separate illustrations arranged in a grid of R rows and C columns, each alone in its own cell,
all at the same scale and in the same style, with wide white gaps between cells so they can be cut apart.
```

**Teslim:** üretilen görseller `docs/gelen-gorseller/` klasörüne konur (anlamlı bir adla, ör. `Topluluk sahneleri (4).png`). Beyaz zemini söküp alfalı WebP'ye çevirmek, boyutlandırmak ve yerine bağlamak benim işim (`scripts/process-incoming-art.py` düzeni). Şeffaf zemin istemeye gerek yok: damalı "sahte şeffaf" zemin gelirse temizlemek zorlaşıyor, düz beyaz en iyisi.

**Boyut:** en az 1024 px üret; sonra ben küçültürüm (sahneler 240 px yükseklik, başlık pozları 244 px, küçük işaretler 112–160 px kare).

## A. Yeni çizim gereken yerler (önem sırasıyla)

### A1. Hikaye ekranının boş durumu: eski üslupta kalan tek çizim
**Nerede:** Okuma → Hikaye, henüz bölüm yokken (`src/ui/reading/Story.tsx`, `EmptyState art="journal"`). Şu an ince çizgili bir defter ve kalem var; çevresindeki bütün boş durumlar Monki sahnesi.
**Dosya adı:** `scene-story.webp` (yatay, 4:3)

```text
Monki sits cross-legged on the floor, happily writing in a big open storybook with a feather quill.
Three or four small blank paper cards float up out of the book like little butterflies.
A tiny ribbon bookmark hangs from the book. Cosy, imaginative mood. Wide 4:3 composition.
```

### A2. Rehber'de "Seviyeni bul" kartı
**Nerede:** Pratik → Rehber, "Seviyeni bul / Teste başla" kartı (telefonda ve masaüstünde yalnızca yazı). Kişiyi doğru seviyeden başlatan önemli bir kapı, ama sayfada en sönük kutu.
**Dosya adı:** `guide-placement.webp` (kare)

```text
Monki climbs a short staircase made of six chunky toy blocks, each block a different soft colour,
the blocks getting taller from left to right. Monki stands on the third block, holding a small magnifying
glass and looking up curiously at the higher blocks. Plain blocks with no letters. Square composition.
```

### A3. İlerleme: boş hafta ve "Bu haftanın yorumu"
**Nerede:** İlerleme ekranının üstü. Yeni bir kişi "Bu hafta henüz çalışmadın" ve "Birkaç gün çalıştıkça burada sana özel bir yorum çıkar" yazılarıyla karşılaşıyor, ikisi de çizimsiz. İlk açılışta en çok görülen yerlerden biri.
**Dosya adları:** `progress-week-empty.webp` (yatay), `progress-note.webp` (kare, küçük)

```text
LAYOUT: 2 separate illustrations in a grid of 1 row and 2 columns.
1) Monki holds a small watering can over a row of seven tiny empty clay pots with only soil in them,
   ready to plant; hopeful, encouraging mood. Wide composition.
2) Monki as a friendly coach: holding a clipboard in one hand, pointing up with the other finger,
   a small empty speech bubble next to the head. Square composition.
```

### A4. Yaz & konuş → Sohbet sahneleri: eksik iki sahne
**Nerede:** Yaz & konuş → Sohbet konu listesi (`src/ui/practice/Produce.tsx` `SCENARIOS`). Altı sahnenin çizimi var (`role-*`: kafe, otel, yol, doktor, mülakat, alışveriş); "Arkadaşla hafta sonu planı yapmak" ve "Bir dizi ya da film üzerine sohbet" çizimsiz. Yedek daldaki yarım tasarım (sahneleri Monki'den Yaz & konuş'a taşıyıp çizimli kart yapmak, bkz. "Karar bekleyen") bu iki çizimi gerektiriyor.
**Dosya adları:** `role-weekend.webp`, `role-series.webp` (mevcut `role-cafe.webp` ile aynı ölçek: Monki ve yanında küçük bir mekân)

```text
LAYOUT: 2 separate illustrations in a grid of 1 row and 2 columns, same framing as the reference
"role" scenes (Monki standing, a small piece of the setting beside it).
1) Weekend plans with a friend: Monki holds a phone showing a calendar page and points at it cheerfully;
   beside Monki a small folded map and a picnic basket.
2) Chatting about a TV series: Monki sits on a small sofa holding a bowl of popcorn, talking excitedly
   with one hand raised; a small TV with a colourful abstract scene stands beside the sofa.
```

### A5. Bugün ekranındaki küçük kartlar
**Nerede:** Bugün. "Günün zihin tohumu" kartı (kendi kendine konuşma alıştırması) yalnızca küçük bir balon simgesiyle duruyor. "Ne zaman çalışacaksın? / Plan yap" kartında tek bir konum iğnesi var. İkisi de her gün görülüyor ama sayfanın geri kalanındaki çizimli kartların yanında boş kalıyor.
**Dosya adları:** `emblem-mind-seed.webp`, `emblem-plan.webp` (kare, küçük boyutta okunacak: az ayrıntı, iri biçimler)

```text
LAYOUT: 2 separate illustrations in a grid of 1 row and 2 columns. They will be shown very small
(about 40 px), so use bold simple shapes and few details.
1) Monki's head and shoulders with eyes closed in thought; a small green seedling grows out of a round
   thought bubble above the head.
2) Monki holds a round alarm clock in one hand and a small wall calendar page in the other, smiling.
```

### A6. Oturum özeti: "Aklında kalanları yaz"
**Nerede:** Bir öğrenme turunun sonundaki özet sayfası. "Aklında kalanları yaz / Bakmadan, yarım dakika" çağrısı ince çizgili bir simgeyle duruyor; üstündeki özet kartı ve bahçe çizimli.
**Dosya adı:** `emblem-recall.webp` (kare, küçük)

```text
Small emblem, shown at about 40 px, bold simple shapes. Monki with eyes playfully closed (not peeking),
writing on a small notepad with a pencil, a tiny sparkle above the head.
```

### A7. Statik sayfalar (Hakkında, Gizlilik, Kullanım koşulları, Hesap silme)
**Nerede:** `public/hakkinda.html`, `gizlilik.html`, `kosullar.html`, `hesap-silme.html`. Düz metin sayfaları; başlıkta küçük bir Monki sayfanın uygulamadan bir parça olduğunu hissettirir. Düşük öncelik.
**Dosya adları:** `page-privacy.webp`, `page-terms.webp`, `page-delete.webp`

```text
LAYOUT: 3 separate illustrations in a grid of 1 row and 3 columns.
1) Monki holds a rounded shield with a small padlock shape on it, calm and reassuring.
2) Monki holds an unrolled paper scroll and reads it attentively.
3) Monki waves goodbye kindly while holding a small cardboard box with a green leaf sticking out of it.
```

### A8. Marka: logo ve uygulama simgesi (sahibinin kararı gerekli)
Kenar çubuğundaki "D" logosu ve `favicon.svg` sade bir harf; Ekim'de denenen Monki başlı logo sahibinin hoşuna gitmemişti. Yeni bir yön denenecekse, Monki'siz ama markanın filiz ve konuşma fikrini taşıyan seçenekler:

```text
App icon exploration, 4 separate options in a grid of 2 rows and 2 columns, each a rounded square
app icon with a flat, bold, simple design that still reads at 32 px. Use a deep berry-pink and a soft
violet as main colours. No text, no monkey.
1) A speech bubble whose tail curls into a small green leaf sprout.
2) A lowercase-letter-like rounded shape formed by two overlapping speech bubbles.
3) A small seedling with two leaves growing from an open book.
4) A sprout whose two leaves are shaped like two small speech bubbles.
```

Bunu üretmeden önce yönü konuşalım. Uygulama simgesi değişirse Android uygulamasının (TWA) simgeleri ve mağaza görselleri de yenilenir.

## B. Mevcut çizimle yapılabilecekler (yeni çizim gerekmez; ben yaparım)

| # | Yer | Bugün | Öneri |
|---|---|---|---|
| B1 | Pratik → **Topluluk** | Düello, Birlikte oku, Arkadaşlar ve Topluluk listeleri yalnızca yazılı kutular; masaüstünde sayfanın yarısı boş | `tile-duel`, `scene-together`, `friends-together`, `scene-library` ile çizimli kartlar |
| B2 | Kelimeler → **Çeviri** "şu an kullanılamıyor" | Tek satır yazı | `StatusPicture kind="maint"` (bakım sahnesi zaten var) |
| B3 | **İlk açılış** ve tanıtım "Nasıl çalışır" adımları | Adımlarda ince çizgili `+`, takvim, dişli simgeleri | Kullanılmayan `onb-plant` (tohum ekmek = kelime eklemek), `onb-map` ve mevcut `time-morning` |
| B4 | **Dil kartları** (ilk açılış, tanıtım) | `lang-monki-*` kullanılıyor; aynı işi gören ikinci takım `lang-en/fr/es` boşta | İkisi karşılaştırılır; iyisi kalır, öbürü silinir |
| B5 | Kullanılmayan çizimler | `celebration-confetti`, `game-twins`, `empty-search`, `share-card-story` hiçbir yerde yok | Yer bulunanlar bağlanır (ör. `game-twins` → zaman ikizleri oyunu), kalanlar silinir |
| B6 | **Kelimeler** listesinde kelimenin bitki simgesi | 18 px'lik tohum aşaması koyu temada zemine karışıyor | `Plant` SVG'sinde koyu tema rengi |

## Karar bekleyen: yedek daldaki yarım tasarım

`claude/proje-inceleme-site-iyilestirme-a764eb` dalının son commit'i (8 Kasım, yerel kopyadaki kaydedilmemiş değişikliklerin yedeği) main'de olmayan bir değişiklik taşıyor: rol yapma sahneleri Monki'den Yaz & konuş → Sohbet'e çizimli kartlar olarak taşınıyor, Monki "soru yanıtlayan yardımcı" olarak kalıyor ve "Günün sohbeti" kaldırılıyor. Sürdürülecekse A4'teki iki çizim gerekiyor.

## Öneri sırası

1. **B1–B3** (çizim beklemeden, benden): en göze batan boşluklar hemen kapanır.
2. **A1–A3** (ChatGPT): her gün görülen ve ilk izlenimi belirleyen yerler.
3. **A4** (yedek dal kararına göre), **A5–A6**.
4. **A7**, sonra **A8** (marka yönü konuşulduktan sonra).
