# Deyim paketi: toplama rehberi

Hedef: **dil başına 500 deyim** (İngilizce, Fransızca, İspanyolca), tek pakette. Asıl amaç **sözlük**: deyim Sözlük'te aranınca (tam hâliyle, içindeki bir kelimeyle ya da Türkçe anlamıyla) kendi kartıyla çıkar ve tek dokunuşla kelimelere eklenir. Ayrıca Kelimeler → Ekle → "Deyim paketi" altında tema ve seviyeye göre toplu eklenebilir ("Deyimler" listesine).

Sözlükte bulunabilsin diye `t` alanına insanların arayacağı sade Türkçe karşılık, `eq` alanına Türkçe deyim yazılır; `w` insanların yazacağı sözlük biçimidir.

Bu belge toplamayı ve denetimi yapan ajanlar içindir. Sahibinin kararı (2026-11-10): 500 deyim, hepsi aynı pakette; İspanyolcayı Antigravity, Fransızcayı ve İngilizceyi Codex toplar; birbirlerini denetlerler.

## Nasıl çalışır

1. Toplayan ajan partileri `content/raw/idioms/<dil>-NNNN.json` olarak yazar. **`src/` altına dokunmaz.**
2. `node scripts/build-idioms.mjs` partileri birleştirir, yinelenenleri ve kaynaksızları reddeder, `src/data/idioms/<dil>.json` dosyasını üretir (elle düzenlenmez).
3. `npx vitest run src/data/idioms.test.ts` her deyimi denetler (`idiomProblems`, `src/data/idioms.ts`).
4. Toplayandan **farklı** bir model partiyi bağımsız okur, sahibi her partiden 5–6 deyime bakar, sonra birleştirilir (aşağıda "İş düzeni").

`<dil>-0000.json` paketin başladığı elle yazılmış 16 deyimdir (eski "Canlı deyimler" listesi); kaynak göstermez. Sonraki her deyim iki kaynak gösterir.

## Plan

Parti = bir tema. 16 tema, tema başına **31 deyim: 6 B1, 12 B2, 13 C1** (16 × 31 = 496, eldeki 16 ile birlikte elemeden sonra yaklaşık 500). Parti numarası temanın sırası:

| No | `theme` | Tema | | No | `theme` | Tema |
|---|---|---|---|---|---|---|
| 0001 | `body` | Beden ve sağlık | | 0009 | `people` | İnsanlar ve ilişkiler |
| 0002 | `animals` | Hayvanlar | | 0010 | `trouble` | Hata ve dert |
| 0003 | `food` | Yemek ve içmek | | 0011 | `time` | Zaman |
| 0004 | `money` | Para ve alışveriş | | 0012 | `nature` | Hava ve doğa |
| 0005 | `work` | Çalışma ve çaba | | 0013 | `luck` | Şans ve risk |
| 0006 | `feelings` | Duygular | | 0014 | `ease` | Kolaylık ve zorluk |
| 0007 | `talk` | Konuşma ve sır | | 0015 | `decide` | Karar ve tavır |
| 0008 | `mind` | Akıl ve dikkat | | 0016 | `move` | Yol ve hareket |

Tema, deyimin **anlamına** göre seçilir, içindeki kelimeye göre değil; tek istisna `body`, `animals`, `food`, `nature`: bunlar deyimin imgesine göredir ("avoir un chat dans la gorge" → `animals`). Seviye: B1 = sık, anlamı şeffafa yakın; B2 = günlük ama imgesi tahmin edilemeyen; C1 = daha seyrek, üsluba ya da bölgeye bağlı.

## Kurallar

1. **Yalnızca bugün kullanılan deyimler.** Ana dili konuşanların günlük konuşmada ya da basında gerçekten kullandığı deyimler; kitapta kalmış, eskimiş olanlar alınmaz. Her deyim **iki bağımsız kaynakta** doğrulanır (bir sözlük + gerçek kullanım: gazete, altyazı, derlem). Doğrulanamayan alınmaz.
2. **Dilin kendi deyimi.** Başka dilden çevrilmiş deyim yazılmaz. Atasözü (tam cümle) değil, deyim (söz öbeği).
3. **Özgün metin.** Anlam, kelimesi kelimesine çeviri ve örnek cümle kendi yazdığındır; hiçbir sözlükten tanım ya da örnek kopyalanmaz. Kaynaklar yalnızca doğrulama içindir.
4. **Örnek cümle:** en çok 16 kelime, günlük, seviyeye uygun. Deyim cümlede **bölünmeden** geçer (araya `pas`, `no`, zarf girmez; gerekirse cümleyi öyle kur). `form` deyimin cümledeki hâlidir, birebir (çekimli olabilir).
5. **Sözlük biçimi (`w`):** mastar hâlinde, en az iki kelime, parantez / eğik çizgi / virgül yok. "Birine, bir şeye" gibi yer tutucular `pat` alanına gider.
6. **Kaba ve hakaret içeren deyimler alınmaz.** Argo olan `slang` diye işaretlenir.
7. Önceki partilerde (`content/raw/idioms/`) olan deyim yeniden yazılmaz.

## Alanlar

```json
{
 "w": "tomar el pelo",
 "pat": "tomarle el pelo a alguien",
 "t": "kafa bulmak, işletmek",
 "lit": "saçını tutmak",
 "eq": "",
 "s": "¿Hablas en serio o me estás tomando el pelo?",
 "form": "tomando el pelo",
 "tr": "Ciddi mi konuşuyorsun yoksa benimle kafa mı buluyorsun?",
 "reg": "informal",
 "area": "genel",
 "level": "B2",
 "theme": "people",
 "src": ["https://…", "https://…"]
}
```

| Alan | Zorunlu | Açıklama |
|---|---|---|
| `w` | evet | deyimin sözlük biçimi |
| `pat` | hayır | kullanım kalıbı, deyimden belli değilse |
| `t` | evet | Türkçe anlamı (birden çoksa virgülle, en çok iki) |
| `lit` | evet | kelimesi kelimesine Türkçesi (anlamla aynı olamaz) |
| `eq` | hayır | aynı şeyi söyleyen Türkçe deyim, gerçekten varsa |
| `s`, `form`, `tr` | evet | örnek cümle, deyimin oradaki hâli, cümlenin Türkçesi |
| `reg` | evet | `neutral`, `informal`, `slang`, `formal` |
| `area` | evet | `genel` ya da bölge: `İspanya`, `Latin Amerika`, `Meksika`, `UK`, `US`, `Fransa`, `Québec`… |
| `level` | evet | `B1`, `B2`, `C1` |
| `theme` | evet | yukarıdaki tablodan |
| `src` | evet | doğrulamada bakılan iki kaynağın adresi (pakete girmez) |

## İş düzeni: kim neyi yapar

| Dil | Toplayan | Denetleyen | Dal |
|---|---|---|---|
| İspanyolca (`es`) | **Antigravity** | Codex | `icerik/deyimler-es` |
| Fransızca (`fr`) | **Codex** | Antigravity | `icerik/deyimler-fr` |
| İngilizce (`en`) | **Codex** (Fransızca bittikten sonra) | Antigravity | `icerik/deyimler-en` |

**Dosya sahipliği (çakışma olmasın diye):** bir ajan yalnızca kendi dilinin dosyalarına yazar.

- Toplayan: `content/raw/idioms/<dil>-NNNN.json` ve üretilen `src/data/idioms/<dil>.json`.
- Denetleyen: yalnızca `content/review/idioms/<dil>-NNNN.md` (rapor). Deyim dosyasını kendisi düzeltmez.
- Kimse dokunmaz: `src/` altındaki başka her şey, bu belge, öteki dilin dosyaları, `<dil>-0000.json`.

**Tur (4 parti = 1 PR, dil başına 4 tur):**

| Tur | Partiler | Temalar |
|---|---|---|
| 1 | 0001–0004 | body, animals, food, money |
| 2 | 0005–0008 | work, feelings, talk, mind |
| 3 | 0009–0012 | people, trouble, time, nature |
| 4 | 0013–0016 | luck, ease, decide, move |

Bir turun adımları:

1. **Toplayan** dalını güncel `main`den açar (ya da günceller), turun dört partisini yazar, `node scripts/build-idioms.mjs` ve `npx vitest run src/data/idioms.test.ts` çalıştırır; ikisi de geçince tek commit ile push'lar ve `main`e **taslak** PR açar (başlık: `Deyim paketi: <dil> tur <n>`). Taslak PR'da CI çalışmaz; Actions dakikası harcanmaz.
2. **Denetleyen** aynı dalı çeker, dört partiyi bağımsız okur, her parti için `content/review/idioms/<dil>-NNNN.md` raporunu aynı dala commit'ler. Rapor: sorunlu deyimler (gerekçeli), şüpheliler, "temiz" sayısı.
3. **Toplayan** raporlardaki her maddeyi ya düzeltir ya da deyimi çıkarır (tartışmaz: şüpheli deyim pakete girmez), çıkan deyimin yerine aynı seviyeden yenisini koyar, betiği ve testi yeniden çalıştırır, push'lar.
4. **Sahibi** her partiden 5–6 deyime bakar; uygunsa PR'ı "hazır"a çevirir. CI yeşilse birleştirilir.
5. Sonraki tur, önceki birleştikten sonra güncel `main`den başlar.

İki dil birbirini beklemez: Antigravity İspanyolca tur 1'i yazarken Codex Fransızca tur 1'i yazar; sonra karşılıklı denetlerler.

**İnternet yoksa:** kaynaklara erişemeyen ajan `src` uydurmaz. Erişemediğini raporda söyler ve durur; parti yarım bırakılır, tamamlanmış gibi gösterilmez.

**Durum:** ayrı bir tablo tutulmaz. `node scripts/build-idioms.mjs` her dilin deyim ve parti sayısını, seviye ve tema dağılımını basar.

## Başlatma metinleri

### Antigravity: İspanyolca toplama

```text
Diloloji deposunda docs/DEYIM-PAKETI.md dosyasını baştan sona oku ve aynen uygula. Kullanıcıya Türkçe yaz.

Rolün: İspanyolca (es) deyim paketinin TOPLAYANI. Dal: icerik/deyimler-es (güncel main'den).
Bu tur: <TUR NO> (partiler ve temalar belgedeki tur tablosunda). Parti başına 31 deyim: 6 B1, 12 B2, 13 C1.

- Her deyimi iki bağımsız kaynakta doğrula ve adreslerini src alanına yaz; doğrulayamadığını alma.
- İspanya'ya ya da Latin Amerika'ya özgü olanı area alanında belirt; ikisinde de geçeni "genel" yaz.
- Yalnızca content/raw/idioms/es-NNNN.json dosyalarını yaz; src/data/idioms/es.json'u betik üretir.
- Bitince: node scripts/build-idioms.mjs, sonra npx vitest run src/data/idioms.test.ts. İkisi de hatasız geçmeli.
- Tek commit, push, main'e TASLAK PR aç: "Deyim paketi: es tur <TUR NO>".
- Son mesajın kısa bir rapor olsun: kaç deyim, kaçını eledin ve neden, emin olamadıkların.
```

### Codex: Fransızca toplama

```text
Diloloji deposunda docs/DEYIM-PAKETI.md dosyasını baştan sona oku ve aynen uygula. Kullanıcıya Türkçe yaz.

Rolün: Fransızca (fr) deyim paketinin TOPLAYANI. Dal: icerik/deyimler-fr (güncel main'den).
Bu tur: <TUR NO> (partiler ve temalar belgedeki tur tablosunda). Parti başına 31 deyim: 6 B1, 12 B2, 13 C1.

- Her deyimi iki bağımsız kaynakta doğrula ve adreslerini src alanına yaz; doğrulayamadığını alma.
  Kaynaklara erişemiyorsan src uydurma: dur ve bunu söyle.
- Fransa dışına özgü olanı (Québec, Belçika, İsviçre) area alanında belirt; ortak olanı "genel" yaz.
- Örnek cümlede deyim bölünmeden geçsin: araya "pas", "jamais", zarf girmesin; cümleyi buna göre kur.
- Yalnızca content/raw/idioms/fr-NNNN.json dosyalarını yaz; src/data/idioms/fr.json'u betik üretir.
- Bitince: node scripts/build-idioms.mjs, sonra npx vitest run src/data/idioms.test.ts. İkisi de hatasız geçmeli.
- Tek commit, push, main'e TASLAK PR aç: "Deyim paketi: fr tur <TUR NO>".
- Son mesajın kısa bir rapor olsun: kaç deyim, kaçını eledin ve neden, emin olamadıkların.
```

### Codex: İngilizce toplama (Fransızca dört turu bitince)

```text
Diloloji deposunda docs/DEYIM-PAKETI.md dosyasını baştan sona oku ve aynen uygula. Kullanıcıya Türkçe yaz.

Rolün: İngilizce (en) deyim paketinin TOPLAYANI. Dal: icerik/deyimler-en (güncel main'den).
Bu tur: <TUR NO> (partiler ve temalar belgedeki tur tablosunda). Parti başına 31 deyim: 6 B1, 12 B2, 13 C1.

- Her deyimi iki bağımsız kaynakta doğrula ve adreslerini src alanına yaz; doğrulayamadığını alma.
  Kaynaklara erişemiyorsan src uydurma: dur ve bunu söyle.
- Yalnızca İngiltere'de ya da yalnızca ABD'de kullanılanı area alanında "UK" / "US" diye belirt; ortak olanı "genel" yaz.
- Sözlük biçiminde iyelik yer tutucusu İngilizcede olduğu gibi kalır ("pull someone's leg"); düz kesme işareti kullan.
- Deyim olmayan öbek fiilleri (give up, look after) alma: imgesi olan deyimler.
- Yalnızca content/raw/idioms/en-NNNN.json dosyalarını yaz; src/data/idioms/en.json'u betik üretir.
- Bitince: node scripts/build-idioms.mjs, sonra npx vitest run src/data/idioms.test.ts. İkisi de hatasız geçmeli.
- Tek commit, push, main'e TASLAK PR aç: "Deyim paketi: en tur <TUR NO>".
- Son mesajın kısa bir rapor olsun: kaç deyim, kaçını eledin ve neden, emin olamadıkların.
```

### Denetim (Codex → İspanyolca; Antigravity → Fransızca ve İngilizce)

```text
Diloloji deposunda docs/DEYIM-PAKETI.md dosyasını oku. Kullanıcıya Türkçe yaz.

Rolün: <DİL> deyim paketinin DENETLEYENİ. Dal: icerik/deyimler-<dil> (çek, yeni dal açma).
Bu tur: <TUR NO>. Turun her partisi için content/raw/idioms/<dil>-NNNN.json dosyasını, yazandan bağımsız oku.

Her deyim için: (1) bugün gerçekten kullanılıyor mu, (2) Türkçe anlam doğru mu, (3) kelimesi kelimesine
çeviri doğru mu, (4) örnek cümle doğal ve dil bilgisi açısından kusursuz mu, (5) seviye, üslup ve bölge
doğru mu, (6) Türkçe eşdeğer deyim gerçekten aynı anlamda mı, (7) tema doğru mu.

Çıktı: parti başına content/review/idioms/<dil>-NNNN.md: "Sorunlu" (deyim, hangi madde, gerekçe,
önerilen düzeltme), "Şüpheli" (emin olamadıkların), "Temiz: N". Deyim dosyalarını ve başka hiçbir
dosyayı değiştirme. Raporları aynı dala tek commit ile push'la.
```
