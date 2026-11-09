# Diloloji için çizim görevleri (ChatGPT'ye)

> **Kullanıcıya not:** Bu dosyanın tamamını ChatGPT'ye yapıştır ya da dosya olarak yükle. Yanına aynı klasördeki `monki-referans.jpg`'yi de yükle. Sonra "Görev 1'den başla" demen yeter. Üretilen her görseli indirip görevde yazan adla kendi bilgisayarındaki proje klasörüne, `docs/gelen-gorseller/` içine koy. Zeminin temizlenmesi, boyutlandırma ve uygulamaya bağlama Claude'da.

---

## Sana düşen iş

Merhaba. Diloloji, Türkçe konuşanlar için bir dil öğrenme uygulaması (İngilizce, Fransızca, İspanyolca). Maskotu **Monki**, küçük kahverengi bir maymun. Uygulamada 360'tan fazla Monki çizimi var. Senden, çizimi eksik kalan birkaç yer için **aynı üslupta** yeni çizimler istiyoruz.

Ekteki `monki-referans.jpg` mevcut çizimlerden sekizini gösteriyor. Yeni çizimler bunların yanına konduğunda ayırt edilmemeli: aynı karakter, aynı çizgi, aynı renkler, aynı oranlar.

**Çalışma düzeni:**
- Görevleri sırayla yap. **Her mesajda tek bir görsel** üret.
- Bir görevde birden çok çizim varsa (ör. 3a ve 3b), her biri ayrı bir görsel olsun.
- Her görselden sonra dur ve kullanıcının onayını bekle. "Olmadı" derse aynı görevi düzelterek yeniden üret; "tamam" derse sonraki göreve geç.

## Üslup (her görsel için geçerli)

Her görseli üretirken aşağıdaki İngilizce üslup tarifini görevin kendi tarifiyle birlikte kullan:

```text
STYLE: Cute kawaii cartoon sticker illustration in the exact style of the attached reference sheet.
The mascot "Monki" is a small brown monkey: round head, big glossy dark eyes with a small white highlight,
cream-beige face, muzzle and belly, rosy pink cheeks, rounded ears with a peach inner ear, a long curly tail,
and ONE small green leaf sprouting from the top of the head. Thick, even dark-brown outlines (never black),
flat warm colours with soft cel shading, gentle and friendly expression, the same body proportions as the
reference (big head, short body).
No text, no letters, no numbers, no watermark, no logo, no frame, no ground shadow, no sticker border.
Isolated on a plain pure white background (#FFFFFF), centred, with generous white margin on every side.
```

**Teknik kurallar:**
- **Zemin:** düz beyaz (#FFFFFF). Şeffaf ya da damalı zemin kullanma.
- **Boyut:** kare çizimler 1024×1024, yatay olanlar 1536×1024.
- **Yazı:** görselde hiçbir yazı, harf ya da rakam olmasın. Menü, kitap ya da takvim gibi nesnelerde yalnızca soyut çizgiler ve şekiller kullan.
- **Karakter:** Monki her görselde aynı karakter. Başında tek bir yaprak var; kıyafet yok (görev ayrıca istemedikçe).
- **Küçük işaretler** (Görev 5 ve 6) uygulamada yaklaşık 40 piksel gösterilecek. Bunlarda az ayrıntı, iri ve sade biçimler kullan.

**Teslimden önce kendin kontrol et:**
- [ ] Başında tek yaprak var.
- [ ] Çizgiler koyu kahverengi, siyah değil.
- [ ] Görselde yazı, harf ya da rakam yok.
- [ ] Zemin düz beyaz ve kenarlarda boşluk var.
- [ ] Çizim referanstakilerin yanına konsa aynı elden çıkmış gibi duruyor.

---

## Görevler

### Görev 1: Hikaye ekranı boşken
**Dosya adı:** `scene-story.png` · **Biçim:** yatay (1536×1024)
**Nerede görünecek:** Kullanıcı henüz hiç hikâye bölümü okumamışken "Hikaye" ekranında. Hikâyeler, kullanıcının zorlandığı kelimelerle yazılıyor.

```text
Monki sits cross-legged on the floor, happily writing in a big open storybook with a feather quill.
Three or four small blank paper cards float up out of the book like little butterflies.
A tiny ribbon bookmark hangs from the book. Cosy, imaginative mood.
```

### Görev 2: "Seviyeni bul" kartı
**Dosya adı:** `guide-placement.png` · **Biçim:** kare (1024×1024)
**Nerede görünecek:** Rehber ekranındaki "Seviyeni bul / Teste başla" kartında. Kısa bir testle kullanıcının hangi seviyeden başlayacağı bulunuyor.

```text
Monki climbs a short staircase made of six chunky toy blocks, each block a different soft colour,
the blocks getting taller from left to right. Monki stands on the third block, holding a small
magnifying glass and looking up curiously at the higher blocks. Plain blocks with no letters.
```

### Görev 3a: İlerleme, boş hafta
**Dosya adı:** `progress-week-empty.png` · **Biçim:** yatay (1536×1024)
**Nerede görünecek:** İlerleme ekranında, kullanıcı o hafta henüz çalışmamışken ("Bu hafta henüz çalışmadın").

```text
Monki holds a small watering can over a row of seven tiny empty clay pots that contain only soil,
ready to be planted. Hopeful, encouraging mood.
```

### Görev 3b: İlerleme, haftanın yorumu
**Dosya adı:** `progress-note.png` · **Biçim:** kare (1024×1024)
**Nerede görünecek:** İlerleme ekranının en üstündeki "Bu haftanın yorumu" kartında. Uygulama burada kullanıcıya haftası hakkında kısa bir yorum yapıyor.

```text
Monki as a friendly coach: holding a clipboard in one hand and raising the index finger of the
other hand as if giving a helpful tip. A small empty speech bubble floats next to the head.
```

### Görev 4a: Sohbet sahnesi, hafta sonu planı
**Dosya adı:** `role-weekend.png` · **Biçim:** kare (1024×1024)
**Nerede görünecek:** "Yaz & konuş → Sohbet" ekranında, konuşma konularının çizimli kartlarında. Diğer altı sahnenin çizimi var; referanstaki kafe sahnesi onlardan biri. Aynı kadrajı kullan: Monki ayakta, yanında mekândan küçük bir parça.

```text
Weekend plans with a friend: Monki holds a phone showing a simple calendar page (abstract squares,
no numbers) and points at it cheerfully. Beside Monki: a small folded map and a picnic basket.
```

### Görev 4b: Sohbet sahnesi, dizi ya da film
**Dosya adı:** `role-series.png` · **Biçim:** kare (1024×1024)
**Nerede görünecek:** 4a ile aynı yerde.

```text
Chatting about a TV series: Monki sits on a small sofa holding a bowl of popcorn and talks
excitedly with one hand raised. A small TV showing a colourful abstract picture stands beside the sofa.
```

### Görev 5a: Küçük işaret, "Günün zihin tohumu"
**Dosya adı:** `emblem-mind-seed.png` · **Biçim:** kare (1024×1024), küçük gösterilecek
**Nerede görünecek:** Ana ekrandaki küçük bir kartta. Kullanıcı burada her gün yeni dilde kendi kendine kısa bir iç konuşma yapıyor.

```text
Small emblem with bold simple shapes and few details. Monki's head and shoulders with eyes closed
in calm thought; a small green seedling grows out of a round thought bubble above the head.
```

### Görev 5b: Küçük işaret, "Ne zaman çalışacaksın?"
**Dosya adı:** `emblem-plan.png` · **Biçim:** kare (1024×1024), küçük gösterilecek
**Nerede görünecek:** Ana ekranda, kullanıcıya her gün hangi saatte çalışacağını planlamasını öneren kartta.

```text
Small emblem with bold simple shapes and few details. Monki holds a round alarm clock in one hand
and a small wall calendar page (abstract squares, no numbers) in the other, smiling.
```

### Görev 6: Küçük işaret, "Aklında kalanları yaz"
**Dosya adı:** `emblem-recall.png` · **Biçim:** kare (1024×1024), küçük gösterilecek
**Nerede görünecek:** Bir çalışma turunun sonunda. Kullanıcıdan, bakmadan aklında kalan kelimeleri yazması isteniyor.

```text
Small emblem with bold simple shapes and few details. Monki with eyes playfully closed (clearly not
peeking), writing on a small notepad with a pencil; a tiny sparkle above the head.
```

### Görev 7a: Gizlilik sayfası
**Dosya adı:** `page-privacy.png` · **Biçim:** kare (1024×1024)
**Nerede görünecek:** Gizlilik politikası sayfasının başlığında.

```text
Monki holds a rounded shield with a simple padlock shape on it; calm and reassuring expression.
```

### Görev 7b: Kullanım koşulları sayfası
**Dosya adı:** `page-terms.png` · **Biçim:** kare (1024×1024)
**Nerede görünecek:** Kullanım koşulları sayfasının başlığında.

```text
Monki holds an unrolled paper scroll (abstract lines only, no text) and reads it attentively.
```

### Görev 7c: Hesap silme sayfası
**Dosya adı:** `page-delete.png` · **Biçim:** kare (1024×1024)
**Nerede görünecek:** Hesabını silmek isteyenlere yol gösteren sayfanın başlığında. Üzgün değil, nazik bir veda olsun.

```text
Monki waves goodbye kindly while holding a small cardboard box with a green leaf sticking out of it.
```

---

**Şimdilik yapma:** logo ve uygulama simgesi. Sahibi yönüne henüz karar vermedi; karar verilince ayrı bir görev gelecek.
