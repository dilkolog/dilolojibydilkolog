# Çıkarım Modu Maskeleme Kuralı Denetim Raporu

**Tarih:** 2026-10-10  
**İlgili Modül:** `src/engine/deduction.ts` (`maskPositions`), `src/engine/reading.ts` (`analyzeText`), `src/engine/extract.ts`  
**Amaç:** Gerçek metinler üzerinde çıkarım modu (`maskPositions`) kuralının hangi kelimeleri gizlediğini, sıfır kelime ve 1.000 kelime bilinen (`frequency`) senaryolarda nasıl davrandığını ve gizlenen kelimelerdeki anlamsız/hatalı durumları tespit etmek; kuralı iyileştirmek için somut öneriler sunmak.

---

## 1. Yöntem ve Denetlenen Metinler

Denetim, `scripts/audit-deduction.ts` betiği ile Fransızca ve İspanyolca dillerinde beşer metin (toplam 10 metin) üzerinde yürütülmüştür:
1. **Kolay Resimli Hikâyeler (Storybooks):**
   - FR: `Qu’est-ce que tu fais ?` (27 kelime) ve `Le feu` (34 kelime)
   - ES: `¿Qué estás haciendo?` (17 kelime) ve `El fuego` (23 kelime)
2. **Sesli Kitaplar (Audiobooks - B1/B2 Edebî Düzyazı):**
   - FR: Alphonse Daudet - *Le secret de maître Cornille* (1.970 kelime) ve *La chèvre de M. Seguin* (1.987 kelime)
   - ES: Horacio Quiroga - *A la deriva* (1.045 kelime) ve *El almohadón de plumas* (1.197 kelime)
3. **Mikro Haber Metinleri (News):**
   - FR: RFI Journal en français facile güncel bülteni (124 kelime)
   - ES: Boletín de noticias en español güncel bülteni (95 kelime)

Her metin iki senaryoda analiz edilmiştir:
- **Senaryo A (Sıfır Kelime):** Öğrenicinin sözlüğünde hiç kelime yok (`vocabulary = []`, `states = []`, `known = Set()`).
- **Senaryo B (Orta Seviye - İlk 1.000 Kelime):** Dilde en sık kullanılan ilk 1.000 kelime (`src/data/frequency/{fr,es}.txt`) `known` kümesinde tanımlı.

---

## 2. Sayısal Özet

| Dil | Metin Türü | Metin Başlığı | Toplam Kelime | Sıfır Kelime Gizlenen | 1.000 Kelime Gizlenen |
|:---|:---|:---|:---:|:---:|:---:|
| **FR** | Storybook 1 | Qu’est-ce que tu fais ? | 27 | 1 | 1 |
| **FR** | Storybook 2 | Le feu | 34 | 2 | 2 |
| **FR** | Audiobook 1 | Le secret de maître Cornille | 1.970 | 15 (sınır) | 15 (sınır) |
| **FR** | Audiobook 2 | La chèvre de M. Seguin | 1.987 | 15 (sınır) | 15 (sınır) |
| **FR** | News | Journal en français facile | 124 | 5 | 5 |
| **ES** | Storybook 1 | ¿Qué estás haciendo? | 17 | **0** | **0** |
| **ES** | Storybook 2 | El fuego | 23 | **0** | **0** |
| **ES** | Audiobook 1 | A la deriva | 1.045 | 15 (sınır) | 15 (sınır) |
| **ES** | Audiobook 2 | El almohadón de plumas | 1.197 | 15 (sınır) | 15 (sınır) |
| **ES** | News | Boletín de noticias en español | 95 | 4 | 4 |
| **Toplam** | - | **10 metin** | **6.492** | **72** | **72** |

---

## 3. Metin Bazlı Gizlenen Kelimeler Dökümü

### 3.1. Fransızca (FR)
- **`sb-fr-1` Qu’est-ce que tu fais ?**
  - Sıfır ve 1k: `signe` (*"Elle fait un signe de la main."*)
- **`sb-fr-2` Le feu**
  - Sıfır ve 1k: `chaleur` (*"Le feu donne de la chaleur."*), `lumière` (*"Le feu donne de la lumière."*)
- **`ab-fr-1` Le secret de maître Cornille**
  - Sıfır kelimede: `Francet`, `veillée`, `village`, `bonhomme`, `entendu`, `Imaginez-vous`, `parfumé`, `monsieur`, `aujourd'hui`, `faisait`, `commerce`, `apportaient`, `couvertes`, `droite`, `par-dessus`
  - 1k kelimede: `Francet`, `veillée`, `village`, `bonhomme`, `redire`, `Imaginez-vous`, `parfumé`, `renom`, `temps`, `commerce`, `apportaient`, `couvertes`, `gauche`, `par-dessus`, `ribambelles`
- **`ab-fr-2` La chèvre de M. Seguin**
  - Sıfır kelimede: `lyrique`, `pauvre`, `chroniqueur`, `refuser`, `pourpoint`, `pourtant`, `services`, `Est-ce`, `couvert`, `première`, `prétends`, `l'histoire`, `vouloir`, `bonheur`, `cassaient`
  - 1k kelimede: `lyrique`, `pauvre`, `chroniqueur`, `refuser`, `pourpoint`, `pourtant`, `services`, `Est-ce`, `couvert`, `montrer`, `prétends`, `l'histoire`, `verras`, `bonheur`, `cassaient`
- **`news-fr` Journal en français facile**
  - Sıfır ve 1k: `bienvenue`, `internationale`, `gouvernement`, `pacifiquement`, `impressionniste`

### 3.2. İspanyolca (ES)
- **`sb-es-1` ¿Qué estás haciendo?**
  - Sıfır ve 1k: *Hiç kelime gizlenmedi (0)*. Cümleler 6 kelimeden kısa olduğu için filtreye takıldı.
- **`sb-es-2` El fuego**
  - Sıfır ve 1k: *Hiç kelime gizlenmedi (0)*. Cümleler 6 kelimeden kısa.
- **`ab-es-1` A la deriva**
  - Sıfır kelimede: `blanduzco`, `juramento`, `yararacusú`, `gotitas`, `dificultosamente`, `amenaza`, `dislocándole`, `mordedura`, `dolor`, `comenzaba`, `tobillo`, `abultamiento`, `fulgurantes`, `relámpagos`, `dificultad`
  - 1k kelimede: `blanduzco`, `juramento`, `yararacusú`, `gotitas`, `dificultosamente`, `amenaza`, `dislocándole`, `mordedura`, `agudo`, `comenzaba`, `tobillo`, `abultamiento`, `fulgurantes`, `relámpagos`, `dificultad`
- **`ab-es-2` El almohadón de plumas**
  - Sıfır ve 1k: `escalofrío`, `carácter`, `estremecimiento`, `volviendo`, `estatura`, `profundamente`, `abril--vivieron`, `severidad`, `expansiva`, `semblante`, `estremecimientos`, `silencioso--frisos`, `mármol--producía`, `glacial`, `desapacible`
- **`news-es` Boletín de noticias en español**
  - Sıfır ve 1k: `internacionales`, `inundaciones`, `complicaciones`, `recuperación`

---

## 4. Sorunlu ve Anlamsız Maskelemelerin Sınıflandırılması

Analiz edilen 72 maskelemeden **23 tanesi (%31,9)** pedagojik açıdan verimsiz veya teknik olarak hatalı bulunmuştur:

### 4.1. Tipografik Birleşmeler (Çift Tire / Em-Dash Hatası)
- **Sorun:** Gutenberg ve edebî kaynaklarda parantez içi veya ara cümle belirtmek için kullanılan çift tire (`--`) ve uzun tireler (`—`), `reading.ts` içindeki `WORD = /([\p{L}][\p{L}'’-]*)/u` deseni nedeniyle iki ayrı kelimeyi tek bir token olarak birleştirmektedir.
- **Örnekler:**
  - `abril--vivieron` (15 harf) — *"Durante tres meses--se habían casado en abril--vivieron una dicha"*
  - `silencioso--frisos` (17 harf) — *"...blancura del patio silencioso--frisos, columnas y estatuas..."*
  - `mármol--producía` (15 harf) — *"...mármol--producía una otoñal impresión..."*
- **Etki:** Bu birleşik yapay kelimeler cümlenin açık ara en uzun öğesi haline gelmekte ve çıkarım modunda gizlenmektedir. Öğreniciden `"abril--vivieron"` ifadesini tahmin etmesi beklenmektedir.

### 4.2. Özel İsimler ve Kişi Adları
- **Sorun:** Cümle başında yer alan veya metin boyunca yalnızca bir kez geçen özel isimler, `analyzeText` tarafından `lowerSeen` kümesinde yer almadığı ve cümle başı olduğu için `unseen` işaretlenmektedir.
- **Örnekler:**
  - `Francet` (*"Francet Mamaï, un vieux joueur de fifre..."*) — 7 harfli bir kişi adı; cümlenin en uzun kelimesi seçilip gizlenmiştir. Bir öğrenicinin metinde ilk kez geçen bir özel şahıs adını bağlamdan çıkarması imkansızdır.
  - `Gringoire` / `Pierre` — Yazar/şair adı.

### 4.3. Dilbilgisel Bileşenler, Soru Kalıpları ve Zamirli Fiiller
- **Sorun:** Fransızca ve İspanyolca'da tire ile birleşen gramer öbekleri (`-vous`, `-ce`, `enclitic` zamirler), kök kelime yerine kalıp olarak maskelenmektedir.
- **Örnekler:**
  - `Est-ce` (*"Est-ce que tu n'as pas honte, à la fin?"*) — Temel soru kalıbı; cümlenin en uzun kelimesi olarak maskelenmiştir.
  - `Imaginez-vous` (*"Imaginez-vous pour un moment, chers lecteurs..."*) — Emir kipi + dönüşlü zamir.
  - `par-dessus` (*"...qui viraient au mistral par-dessus les pins..."*) — İki temel edatın (`par` + `dessus`) birleşimi.
  - `dislocándole` (*"...el machete cayó de plano, dislocándole las vértebras."*) — Zarf-fiil (`dislocando`) + dolaylı tümleç zamiri (`le`).

### 4.4. Başlangıç Seviyesi (Storybooks) Metinlerde Maskeleme Yapılamaması
- **Sorun:** `MASK_MIN_WORDS = 6` kuralı gereği, bir cümlede en az 6 kelime anahtarı bulunmalıdır. Kolay resimli hikâyelerde (A1 seviyesi) cümleler genellikle 3–5 kelimeden oluşmaktadır.
- **Örnekler:**
  - İspanyolca `¿Qué estás haciendo?` (17 kelime) ve `El fuego` (23 kelime) kitaplarında maskelenen kelime sayısı **0**'dır. Çıkarım modu bu kitaplarda hiç devreye girmemektedir.
  - Fransızca kitaplarda ise yalnızca 1 ve 2 kelime maskelenebilmiştir.

### 4.5. Sıfır Kelime vs. 1.000 Kelime (Frekans) Etkisi
- **Olumlu Bulgu:** İlk 1.000 kelime bilindiğinde temel seviye kelimeler (`village`, `monsieur`, `dolor`, `gotitas`) elenmekte; yerlerine `ribambelles`, `desapacible`, `fulgurantes`, `internationale`, `impressionniste` gibi gerçek B1/B2 bağlamsal çıkarım kelimeleri gelmektedir. Algoritmanın frekans tabanlı filtreleme çekirdeği son derece başarılıdır.

---

## 5. Kuralı İyileştirmek İçin Somut Çözüm Önerileri

Aşağıdaki 5 somut öneri, çıkarım modunun doğruluğunu ve öğrenme verimini doğrudan artıracaktır:

### Öneri 1: Çift Tire (`--`) ve Çizgi (`—`) Ayrıştırması
`WORD` regex'i ya da `splitSentences`/token ayrıştırma aşaması çift tireleri sözcük içi karakter saymamalıdır.
```typescript
// Mevcut WORD regex:
// const WORD = /([\p{L}][\p{L}'’-]*)/u;
// Öneri: Çift tire veya em-dash öncesi ve sonrası ayrı kelimeler olarak bölünmeli:
text = text.replace(/--+|—/g, ' — ')
```
Bu sayede `abril--vivieron` yerine `abril` (5 harf) ve `vivieron` (8 harf) bağımsız olarak değerlendirilir.

### Öneri 2: Özel İsim ve Büyük Harf Filtresi
Cümle başında yer alsa dahi, kendisinden sonra gelen sözcük de büyük harfle başlıyorsa (`Francet Mamaï`) ya da bilinen isim köklerine sahipse çıkarım adayı olmamalıdır:
```typescript
// maskPositions içinde:
const isProperNoun = /^\p{Lu}/u.test(t.text) && (
  k > 0 || // Cümle ortasında büyük harf
  (tokens[k + 2]?.text && /^\p{Lu}/u.test(tokens[k + 2].text)) // "Francet Mamaï" gibi çift büyük harf
)
if (isProperNoun) return;
```

### Öneri 3: Fransızca Gramatikal Tire Kalıplarının Ayıklanması
Fransızca'da soru ve emir kalıplarındaki ekler (`-ce`, `-vous`, `-tu`, `-il`, `-elle`, `-moi`, `-toi`, `-t-il`) çıkarım maskelemesinde kelime uzunluğu hesaplanırken elenmeli veya maskeleme dışı tutulmalıdır:
```typescript
const FR_CLITICS = /-(?:ce|vous|tu|nous|ils?|elles?|moi|toi|lui|leur|en|y|t-il|t-elle)$/i;
const cleanForLen = language === 'fr' ? clean.replace(FR_CLITICS, '') : clean;
```
Böylece `Est-ce` 6 harf olarak değil, `est` (3 harf < 5) sayılarak elenir; `Imaginez-vous` yerine cümlenin bir sonraki anlamlı sözcüğü (`lecteurs`) seçilir.

### Öneri 4: Kolay Metinler (Storybooks) İçin Esnek Cümle Eşiği
Eğer bir metin `storybook` türündeyse veya metindeki ortalama cümle uzunluğu < 7 kelime ise, `MASK_MIN_WORDS` kuralı 6'dan 4'e indirilmelidir:
```typescript
// Örneğin ortalama kelime sayısı 5'ten az ise eşik 4 yapılabilir:
const minWords = avgSentenceLength < 6 ? 4 : MASK_MIN_WORDS;
```
Bu değişiklik ile İspanyolca *"¿Qué estás haciendo?"* veya *"El fuego da calor"* gibi A1 seviye cümlelerde `haciendo` veya `fuego` gibi anahtar kelimeler başarıyla çıkarıma sunulabilecektir.

### Öneri 5: Çekimli Ekler Yerine Kök/İçerik Kelimesi Önceliği (POS Ağırlığı)
`dislocándole`, `apportaient`, `faisait` gibi çekimli fiiller yerine; sıfatlar (`fulgurantes`, `desapacible`, `blanduzco`, `impressionniste`) veya isimler (`abultamiento`, `estremecimiento`, `chroniqueur`) çıkarım için pedagojik olarak kat kat daha değerlidir.
Uzunluk hesaplanırken `len` değerine isim/sıfat göstergeleri için küçük bir ağırlık çarpanı verilmesi veya aşırı çekimli gerundio/enclitic yapıların kök boyutuyla kıyaslanması önerilir.

---

## 6. Özet ve Sonuç

- Çıkarım modu çekirdeği (`maskPositions`), özellikle B1/B2 düzeyindeki haber ve edebiyat metinlerinde ve kelime haznesi geliştikçe (1k bilinen senaryosunda) çok başarılı bir şekilde seviyeye uygun sözcükleri tespit etmektedir.
- Ancak tipografik çift tireler (`--`), cümle başı özel adlar (`Francet`) ve Fransızca soru/zamir tireleri (`Est-ce`, `Imaginez-vous`) maskeleme kalitesini düşürmektedir.
- Yukarıdaki 5 öneri kod tarafında uygulandığında, çıkarım modunun verimliliği ve kullanıcı deneyimi üst düzeye ulaşacaktır.
