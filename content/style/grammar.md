# Stil rehberi: dilbilgisi soruları

> **TASLAK: sahibinin onayını bekliyor.** Onaylanınca bu satır kalkar. Çözücü denetiminde ya da örneklem incelemesinde bulunan her yeni hata türü, en alttaki "Öğrenilen kurallar" bölümüne eklenir.

Soru biçimi uygulamadaki `GrammarExercise` biçimidir (`src/engine/grammar.ts`). Üç tür vardır:
- `cloze`: boşluk doldurma, tek `___`;
- `choice`: seçenekli;
- `error`: hatalı kelimeyi bulma.

Fabrikada her soru ayrıca şu alanları taşır:
- `difficulty`: 1–5;
- `batch`: iş kimliği;
- `subskill`: iş emrindeki alt becerilerden biri;
- `fromText`: türetildiği metin, varsa.

## 1. Tek doğru cevap

- Cümle bağlamı **tek** bir cevabı zorlar. Bağlama göre ikinci bir doğru cevap çıkabiliyorsa bağlamı sıkılaştır (zaman sözcüğü ekle, özneyi yaz). Bu mümkün değilse ikinci cevabı `alternatives` alanına yaz.
- **Bölge farkı:** İspanya ve Latin Amerika arasında farklı kullanılan yapılar (pretérito perfecto / indefinido, *vosotros*, *coger*) ikinci cevap doğurmayacak biçimde sorulur. Fransa ve Québec farkı için de aynı kural geçerli.
- Yalnız aksanla ayrılan şıklar (*esta / está*) ancak sorunun konusu aksansa kullanılır.
- `-ra / -se` (subjuntivo imperfecto): cevap `-ra` biçimiyle yazılır; `-se` biçimi `alternatives`e eklenir.

## 2. Şıklar (`choice`)

- 3 ya da 4 şık; cevap şıklardan **tam biri**.
- Yanlış şıklar, Türkçe konuşanın gerçekten yaptığı hatalardan seçilir: yanlış zaman, yanlış yardımcı fiil (avoir / être), yanlış edat, *ser / estar* karışıklığı, cinsiyet uyumu.
- Hepsi aynı dilbilgisi biçiminde ve aynı uzunluğa yakın olur. Cevap en uzun şık olarak öne çıkmamalı.
- "Hepsi" ya da "hiçbiri" şıkkı yok.

## 3. Hatalı kelime (`error`)

- Cümlede yalnız **bir** sözcük hatalıdır ve o sözcük cümlede bir kez geçer (`answer`).
- `fix` doğru biçimdir. Cümlenin geri kalanı kusursuz olmalı; başka bir yerde tartışmalı bir kullanım bulunmamalı.

## 4. Açıklama (`explanation`)

- Türkçe, 1–2 cümle. Kuralı söyler, cevabı tekrar etmekle yetinmez.
- Türkçeyle karşılaştırma işe yarıyorsa kısaca kullanılır: "Türkçedeki -iyordu burada imparfait olur."
- Rehber'deki dersle çelişmez (`src/data/guide/lessons-*.ts`, `src/data/tenseLesson*.ts`).
- `hint` isteğe bağlıdır: cevabı vermeden düşünme yönünü gösterir ("faire → subjonctif").

## 5. Çeşitlilik

- Bir iş emrindeki sorular alt becerilere (`subskill`) eşit dağılır (`content/plan/<dil>.json` `subskills`).
- Türler karışık: yaklaşık %50 `choice`, %35 `cloze`, %15 `error`.
- Aynı cümle kalıbı ("Hier, je ___ au cinéma.") partide en çok bir kez geçer. Denetim aracı %70'in üstündeki benzerliği reddeder.
- Özneler, kişiler ve konular çeşitlenir; aynı ad partide üçten fazla geçmez.

## 6. Zorluk (`difficulty`)

Aynı seviye içinde ince ayardır:
- **1:** düzenli biçim, ipucu belirgin.
- **3:** düzensiz biçim ya da ipucu dolaylı.
- **5:** iki kuralın birlikte işlediği ya da Türkçe konuşanın çok sık yanıldığı yer.

## 7. İçerik

Okuma rehberindeki yasaklar burada da geçerlidir (`content/style/reading.md` §2, `content/style/banned.json`): siyaset, din, şiddet, yetişkin içerik, gerçek kişiler, markalar yok.

## 8. Örnekler

**İyi (B1, fr, passe_imparfait, choice):**
> Quand j'étais petit, je ___ chaque été chez mes grands-parents. — [allais, suis allé, irai]
> Açıklama: "chaque été" tekrarlanan bir alışkanlık anlatır; alışkanlık imparfait ile söylenir.

**Kötü:**
> Hier, je ___ au cinéma. — [suis allé, allais]

Neden kötü: "Hier" ile ikisi de olabilir ("j'allais au cinéma quand…"). Tek cevabı bağlam zorlamıyor.

**Kötü (açıklama):**
> Açıklama: "Doğru cevap 'allais'."

Neden kötü: kuralı söylemiyor.

## 9. Öğrenilen kurallar

(Çözücü ve örneklem incelemelerinden gelen kurallar buraya tarihli olarak eklenir.)
