# İçerik fabrikası: okuma metinleri ve dilbilgisi alıştırmaları için üretim sistemi

**Hazırlayan:** Claude Code (2026-11-04). **Kim için:** bu sistemi kuracak ve içerik üretecek bütün ajanlar.

**Önce okunacaklar:**
- `AGENTS.md`: çalışma kuralları ve doğrulama komutları.
- `DESIGN.md`: arayüz.
- `docs/GOREV-DONUSUM-CIFTLERI.md`: aynı yöntemin küçük bir örneği.

**Sahibinin kararı:** öncelik içerik ve eğitim. Diller **Fransızca ve İspanyolca** (İngilizce şimdilik yok). Hedef çok büyük miktarda içerik; süre önemli değil, uzun vadeli bir iş. Bu yüzden bu belge hızdan çok **kaliteyi koruyarak büyüyebilen** bir yapı tarif eder.

---

## 1. Hedef ve ölçek

| İçerik | Bugün (dil başına) | Uzun vadeli hedef (dil başına) |
|---|---|---|
| Seviyeli okuma metni (A1–C1) | ~30 hikâye + ~20 sınav metni + haber/kitap | **10.000+** |
| Dilbilgisi sorusu | ~1.000 | **100.000+** |
| Metinlerden türetilen soru (anlama, boşluk, kelime) | 0 | metin başına 10–20 → **150.000+** |

Bu ölçekte üç şey değişir:
1. **İçerik uygulamanın paketine gömülemez.** Bugün `src/data/grammar/*.json` dosyaları `import.meta.glob(..., { eager: true })` ile pakete giriyor (1,4 MB). 100.000 soru ~150 MB eder. İçerik ayrı, parça parça indirilen statik dosyalara taşınmalı (§6).
2. **Elle denetim yetmez.** Her öğe makine denetiminden geçmeli; insan yalnız örneklem okur (§5).
3. **İş planlı dağıtılmalı.** Birçok ajan aynı anda çalışacak; kim neyi yazıyor, ne kadarı bitti, nerede boşluk var, tek bir planda görünmeli (§3).

---

## 2. İlkeler

1. **Önce kalite.** Çok ama hatalı içerik, az ama doğru içerikten kötüdür. Denetimden geçmeyen öğe yayınlanmaz.
2. **Her öğe kendi kendini taşır.** Öğe; kimliği, dili, seviyesi, konusu, kaynağı ve hangi partide üretildiği bilgisiyle birlikte saklanır.
3. **Kimlik kalıcıdır.** Öğrencinin ilerlemesi kimliğe bağlıdır (`GrammarLog` soru kimliğiyle tutulur). Kimlik asla değiştirilmez, başka öğeye verilmez. Kaldırılan öğe "emekliye ayrılır" (§6.4).
4. **Tek doğru cevap.** Bölgeye ya da yoruma göre ikinci bir doğru cevap çıkabilecek soru yazılmaz; çıkabiliyorsa `alternatives` alanına yazılır.
5. **Telif:** başka sitelerin metinleri kopyalanmaz ve "yeniden yazdırılmaz". Kaynak yalnız iki türdür:
   - bizim ürettiğimiz özgün içerik;
   - açık lisanslı içerik (lisans satırıyla).
6. **Türkçe konuşana göre.** Açıklamalar Türkçe; zorluklar Türkçe konuşanın bilinen tuzaklarına göre seçilir.
7. **Bir metin, çok alıştırma.** Okuma metni yazılırken ondan türetilecek alıştırmalar düşünülür (§4.3).

---

## 3. Plan katmanı: müfredat matrisi

Konum: `content/plan/<dil>.json` (depoda, elle düzenlenir).

Matrisin boyutları:
- **Seviye:** A1, A2, B1, B2, C1.
- **Konu (tema):** dil başına ~60 gündelik ve akademik konu. Örnekler: alışveriş, sağlık, iş, iklim, teknoloji, sanat, şehir hayatı, aile, tarih, bilim… Liste iki dilde ortaktır, Türkçe adlarıyla yazılır.
- **Metin türü:** diyalog, e-posta/mektup, haber, blog/görüş, hikâye, tarif/talimat, ilan, röportaj, biyografi, bilgi metni.
- **Dilbilgisi hedefi:** Rehber'deki konu kimlikleri (`src/data/guide/lessons-*.ts`, `TOPIC_NAME` anahtarları). Her metin en az bir konuyu bilerek bolca kullanır. Örnek: B1 bir hikâye `passe_imparfait`, A2 bir tarif `imperatif`.

```jsonc
{
  "language": "fr",
  "levels": { "A1": { "words": [60, 120], "topics": ["basics_fr_present", "basics_fr_articles", "…"] }, "…": {} },
  "themes": [{ "id": "sante", "tr": "Sağlık" }, "…"],
  "genres": ["dialogue", "email", "news", "…"],
  "targets": { "reading": { "perCell": 3 }, "grammar": { "perTopicLevel": 300 } }
}
```

**İş emirleri.** `scripts/content/jobs.ts` matristen iş emirleri üretir: `content/jobs/<dil>/<tür>/<iş-kimliği>.json`.
- Her iş, eksik kalan bir hücreyi doldurur: "B1 · sağlık · hikâye · passe_imparfait · 10 metin" ya da "A2 · por_para · 50 soru".
- Bu işi kapsama raporu (§8) yönlendirir: hep en boş hücreler önce.

**Çakışma önleme.** Bir ajan işe başlarken iş dosyasına `"claimedBy": "<ajan/dal>", "claimedAt": "…"` yazıp commit eder. 48 saatte bitmeyen iş yeniden dağıtılabilir. Ajanlar ayrı dallarda çalışır. Aynı iş iki dala verilmez: iş kimliği aralıkları ajanlara önceden bölünebilir.

---

## 4. Üretim katmanı: ajanların yazdığı ham içerik

Konum: `content/raw/<dil>/<tür>/<iş-kimliği>.jsonl` (satır başına bir öğe).

**Ajanın iş akışı:**
1. İş emrini oku.
2. Stil rehberini oku (`content/style/<tür>.md`, §4.4).
3. O hücreden daha önce kabul edilmiş 3 örneğe bak.
4. Öğeleri yaz.
5. Denetim aracını çalıştır (§5).
6. Reddedilenleri düzelt.
7. Kabul oranı eşiği geçince (§5.3) commit et.

### 4.1 Okuma metni şeması

```ts
interface ReadingItem {
  id: string               // "fr-r-000123": dil + tür + sıra; kalıcı
  language: 'fr' | 'es'
  level: 'A1' | 'A2' | 'B1' | 'B2' | 'C1'
  theme: string            // plan.themes[].id
  genre: string            // plan.genres
  grammar: string[]        // hedef dilbilgisi konuları (TOPIC_NAME anahtarları)
  title: string
  paragraphs: string[]     // hedef dilde
  tr: string[]             // paragraf paragraf Türkçe (doğal, kelimesi kelimesine değil)
  vocabulary: { word: string; lemma: string; tr: string }[]       // 6–12 anahtar kelime, metinde geçen biçimiyle
  questions: { q: string; options: string[]; answer: number; why: string }[] // 3–5 anlama sorusu, Türkçe
  source: 'Diloloji (özgün)'
  batch: string            // iş kimliği
}
```

### 4.2 Dilbilgisi sorusu şeması

Mevcut `GrammarExercise` (`src/engine/grammar.ts`) aynen kullanılır, birkaç alan eklenir:
- `difficulty`: 1–5, aynı seviyede ince ayar.
- `batch`: iş kimliği.
- `fromText`: türetildiği metnin kimliği, varsa.

Türler aynı kalır: `cloze`, `choice`, `error`.

**Çeşitlilik kuralı.** Bir konu için yazılan 300 soru aynı kalıbı tekrarlamamalı. Her iş emri bir "alt beceri" listesi taşır. Örnek, `passe_imparfait` için: betimleme, alışkanlık, araya giren olay, zaman sözcüğü ipucu, anlamı değişen fiiller. Sorular bu alt becerilere eşit dağıtılır.

### 4.3 Türetilmiş alıştırmalar (çarpan)

Kabul edilen her okuma metninden `scripts/content/derive.ts` makineyle şunları üretir; ajan yazmaz:
- **Dilbilgisi boşluğu:** metindeki hedef konunun çekimli fiilleri (`textForms`, `analyzeForm`) boşluk olur. Cevap tablodan doğrulanır.
- **Kelime boşluğu:** `vocabulary` listesindeki sözcükler, metindeki cümlelerinde.
- **Zamanı değiştir:** metindeki cümleler, `docs/GOREV-DONUSUM-CIFTLERI.md` kurallarıyla.
- **Dikte ve dinleme:** cümle cümle, ses varsa (§6.3).

Türetilmiş öğelerin kimliği metin kimliğinden ve cümle sırasından türer: `fr-r-000123-c04`. Metin değişmedikçe kimlik değişmez.

### 4.4 Stil rehberleri

Konum: `content/style/reading.md`, `content/style/grammar.md`. Bu sistemi kuran ilk ajan yazar, sahibi onaylar.

İçeriği:
- seviye başına cümle uzunluğu ve yapı sınırları (A1: tek yan cümle, şimdiki zaman ağırlıklı; B2: bağlaçlar, dolaylı anlatım…);
- yasak konular: siyaset, din, şiddet, yetişkin içerik, gerçek kişiler hakkında olumsuz ifadeler, marka tanıtımı;
- adlandırma: çeşitli, gerçekçi adlar;
- kültür: Fransa ve frankofon dünya, İspanya ve Latin Amerika; bölge açıkça belirtilir;
- Türkçe çevirinin üslubu;
- örnek "iyi" ve "kötü" öğeler.

---

## 5. Denetim katmanı

### 5.1 Otomatik denetim (`scripts/content/check.ts`)

Her öğe, sırasıyla:

1. **Şema.** Alanlar, türler, uzunluklar. Seviyeye göre sözcük aralığı plan dosyasında yazar.
2. **Seviye uyumu (okuma).** Metindeki sözcüklerin seviyeye uygunluğu ölçülür:
   - Kaynak: CEFR kelime listesi (`src/data/cefr/{fr,es}.txt`) ve okuma kapsama hesabı (`analyzeText`, `src/engine/reading.ts`).
   - Ölçüt: sözcüklerin en az %92'si o seviyede ya da altında olmalı. Özel adlar ve `vocabulary` listesindeki hedef kelimeler hariç tutulur.
   - Liste dışı sözcükler raporlanır.
3. **Dilbilgisi hedefi var mı (okuma).** `grammar` alanındaki konunun gerçekten geçtiği, Rehber'deki desenlerle (`src/engine/lessonExamples.ts` `PATTERNS`) ve çekim çözümlemesiyle denetlenir. Örnek: imparfait hedefleyen B1 metinde en az 5 imparfait biçimi olmalı.
4. **Çekim doğruluğu.** Metindeki ve sorulardaki fiil biçimleri `analyzeForm` ile tanınmalı. Tanınmayan biçimler yazım hatası şüphesiyle raporlanır.
5. **Soru biçimi (dilbilgisi).** Mevcut `src/data/grammar.test.ts` kuralları:
   - `choice`'ta cevap şıklardan tam biri;
   - `error`'da hatalı sözcük cümlede bir kez geçer;
   - `cloze`'da tek `___`.
6. **Benzerlik ve tekrar.** Yeni öğe, mevcut bütün içerikle karşılaştırılır:
   - 5-gram parmak izi ve Jaccard benzerliği (MinHash yeterli);
   - dilbilgisi sorusunda eşik %70, okuma metninde %40;
   - aynı soru cümlesi iki kez olmaz.
7. **Türkçe var ve dolu.** Paragraf sayısı hedef dildekine eşit.
8. **Yasak sözcük listesi** (stil rehberinden).
9. **LanguageTool** (isteğe bağlı, ağ gerekir): yazım ve dilbilgisi uyarıları raporlanır, reddetmez. Dakikada ≤20 istek sınırı gözetilir.

Çıktı: `content/reports/<iş-kimliği>.json` (kabul ve red, nedenleriyle).

### 5.2 Çözücü denetimi (tek doğru cevap)

Dilbilgisi sorularının asıl riski iki doğru cevaptır. Her parti, **onu yazmamış** bir ajan oturumunda ayrıca çözülür:
- Çözücü cevap anahtarını görmeden her soruyu çözer.
- Bulduğu cevabın tek mi olduğunu, ikinci bir doğru şık olup olmadığını yazar.
- Uyuşmazlıklar `content/review/<iş-kimliği>.solver.json`'a gider. Yazar ajan bunları düzeltir ya da `alternatives` ekler.

Uyuşmazlık oranı %5'in üstündeyse parti bütünüyle yeniden incelenir. Bu adımın sonucu da parti raporuna yazılır.

### 5.3 Eşikler

- Bir parti, otomatik denetimde **%95** kabul oranını geçmeden commit edilmez.
- Çözücü uyuşmazlığı **%5**'in altında olmalı.
- Sahibinin örneklemi (§5.4) sonucunda parti başına hata **%2**'nin altında olmalı; değilse kural düzeltilir, parti yeniden yazılır.

### 5.4 İnsan örneklemi

`scripts/content/sample.ts` her partiden rastgele 10 öğeyi bir sayfaya döker: `content/review/<iş-kimliği>.md`, metin, Türkçesi ve sorular.

Sahibi ya da anadili konuşan biri "tamam / hata: …" yazar. Bulunan her hata türü stil rehberine kural olarak eklenir; aynı hata bir daha yapılmaz.

---

### 5.5 Hat ve kalite döngüsü (2026-11-14)

Her içerik türü (okuma, dilbilgisi, sınav seti, deyim) aynı yoldan geçer:

1. **Ham parti:** iş emrine göre `content/raw/…`.
2. **Otomatik denetim:** `check`, deyimlerde `build-idioms` kaynak denetimi.
3. **Bağımsız denetim:** yazandan farklı bir model, cevap anahtarını görmeden çözer ve dili okur.
4. **Sahibinin örneklemi:** `sample`.
5. **Birleştirme:** `build`, PR.

Birleştikten sonra iki kaynak hatayı geri getirir:

- **Haftalık rapor:** `npm run content -- missed` (Supabase `content_item_stats()`, `supabase/migrations/0015_content_item_stats.sql`). Bütün kullanıcıların cevaplarından en çok yanlış yapılan 20 öğeyi ve hep doğru bilinenleri, metni ve dosyasıyla yazar. Kişi bilgisi yoktur, yalnızca sayı. Sahibinin Mac'indeki haftalık yedek işi (`scripts/backup-mac.sh`) raporu `~/Diloloji-yedek/icerik-raporu-<tarih>.md` olarak yanına yazar. Öğrenci azken sonuçlar gürültülüdür; bariz hataları yakalar.
- **Kullanıcı bildirimi:** "Soruda hata var" / "Görevde hata var" / "Sorularda hata var" (`src/ui/guide/ReportIssue.tsx`; dilbilgisi oyunu, sınav setleri, Diloloji metinlerinin soruları, Rehber). Hesabı olan öğrencinin bildirimi sunucuya `content` türüyle (`reason: mistake`) düşer, sahibine mail gider, R2'de `reports/` altında kalır (`api/_reports.ts`). Bildirim öğenin kimliğini ve öğrencinin gördüğü metni taşır. Misafirde not cihazda kalır (Rehber → Bildirdiklerin).

Bozuk bir fabrika öğesi düzeltilene kadar emekliye ayrılır: `npm run content -- retire <kimlik>` (geri almak için `--undo`), sonra `build` (§6.4). Uygulamanın paketteki soruları (`src/data/grammar…`) manifestle yayınlanmadığı için doğrudan düzeltilir.

**Sipariş sırası:** yeni partiler kapsama raporunun en boş "seviye × konu" hücresinden açılır (`jobs`, en boş hücre önce). 2026-11-14'te Fransızca dilbilgisinde A1 ve A2 temelleri dolu; A2'nin yedi konusu (partitif, olumsuzluk, yer edatları, dönüşlü fiiller, karşılaştırma, emir, süre) ile B1–C1 boş. Önce Fransızca dilbilgisi.

## 6. Yayın katmanı: içerik uygulamaya nasıl ulaşır

### 6.1 Derleme (`scripts/content/build.ts`)

Kabul edilmiş ham içerik derlenir:

```
public/content/<dil>/manifest.json
public/content/<dil>/reading/<seviye>/<parça-no>.json   (~100 metin / parça)
public/content/<dil>/grammar/<konu>/<parça-no>.json     (~300 soru / parça)
```

`manifest.json` şunları taşır:
- sürüm (içerik özeti);
- seviye, konu ve tema başına sayılar;
- her parçanın adı, boyutu ve içindeki kimlik aralığı;
- emekliye ayrılan kimlikler.

Parçalar gzip sonrası 50–150 KB olmalı.

**Neden statik dosya?** Cloudflare Static Assets ücretsiz ve sınırsızdır, Worker isteği harcamaz. R2 yalnız ses gibi çok büyük dosyalar için gerekir.

### 6.2 Uygulama tarafı (`src/data/content.ts`)

- **Yükleme:** `loadManifest(dil)` ve `loadShard(dil, tür, ad)`.
  - `fetch` ile, ilk açılış paketine hiçbir şey girmez.
  - Servis çalışanı ziyaret edilen parçaları çalışma zamanında önbelleğe alır (CacheFirst, sınırlı sayıda). Ön önbelleğe (precache) **alınmaz**.
- **Dilbilgisi:** `grammarExercises(dil)` bugün yalnız paketteki soruları döndürüyor. Yeni yapıda paketteki küçük çekirdek kalır; konu seçilince o konunun parçaları indirilir.
  - `pickGrammarRound` ve `GrammarLog` aynen çalışır, çünkü kimlik tabanlıdır.
  - Aralıklı tekrar (`dueGrammar`) yalnız günlükte kaydı olan soruları ister. Bu sorular hangi parçadaysa o parça yüklenir; günlük kaydına `shard` bilgisi eklenmesi gerekebilir.
- **Okuma:** Okuma kütüphanesine "Diloloji metinleri" kaynağı eklenir.
  - Seviye, tema ve tür süzgeci olur.
  - Kişisel kapsama önizlemesi gösterilir (`coverageLine`: "%92 biliyorsun · 14 yeni kelime").
  - Açılan metin bugünkü `ReadingText` (`src/data/db.ts`) olarak kütüphaneye yazılır. Bu sayede okuyucu, kelime ekleme, dikte ve gölgeleme olduğu gibi çalışır.
  - Anlama soruları ve Türkçe metinle birlikte gelir.
- **Çevrimdışı:** daha önce açılmış metin ve sorular çevrimdışı da çalışır. Hiç açılmamış konu için "internet gerekiyor" notu gösterilir.

### 6.3 Ses (sonraki aşama)

Okuma metinleri için doğal ses:
- `scripts/content/tts.ts` metni cümle cümle Google TTS ile seslendirir.
- Çıktı `audio/<dil>/<metin-kimliği>.mp3` ve cümle zaman damgalarıdır (R2'de).
- Bu, "dinlerken takip"i kesin hâle getirir.

Maliyet tek seferliktir, karakter başına. Önce yalnız A1–B1 metinler seslendirilir. Ses yoksa cihaz sesi kullanılır (bugünkü davranış).

### 6.4 Kimlik ve sürüm kuralları

- Kimlik bir kez verilir; öğe düzeltilince kimlik aynı kalır.
- Anlamı değişecek kadar büyük bir düzeltme ise öğe emekliye ayrılır (`manifest.retired`), yenisi yeni kimlik alır.
- Emekli öğe yeni turlarda sorulmaz, ama öğrencinin günlüğünde kalır ve hata vermez.
- Komut: `npm run content -- retire <kimlik> [--undo]` (`content/retired/<dil>.json`, yalnızca fabrika kimlikleri; bir sınav setinin sorusu setin kimliğiyle), ardından `npm run content -- build`.

---

## 7. Depo düzeni (özet)

```
content/
  plan/fr.json, es.json            # müfredat matrisi (elle)
  style/reading.md, grammar.md     # stil rehberleri (elle, sahibi onaylar)
  jobs/<dil>/<tür>/*.json          # iş emirleri (araç üretir, ajan sahiplenir)
  raw/<dil>/<tür>/*.jsonl          # ajanların yazdığı içerik
  reports/*.json                   # otomatik denetim sonuçları
  review/*.solver.json, *.md       # çözücü ve insan örneklemi
scripts/content/
  jobs.ts  check.ts  derive.ts  sample.ts  build.ts  coverage.ts  tts.ts
public/content/<dil>/...           # derlenmiş parçalar (yalnız araç yazar)
src/data/content.ts                # uygulamanın istemcisi
```

`content/raw` büyüdükçe depo büyür (100.000 soru ≈ 60 MB metin). Bu kabul edilebilir; aşılırsa ham içerik ayrı bir depoya ya da R2'ye taşınır ve yalnız derlenmiş parçalar depoda kalır.

---

## 8. Kapsama raporu

`scripts/content/coverage.ts` bir tablo üretir (`docs/veri/icerik-kapsama.md`):
- hangi seviye × konu × tür hücresinde kaç öğe var, hedefin yüzde kaçı;
- en boş 20 hücre.

İş emirleri bu rapora göre üretilir. Sahibi ilerlemeyi buradan izler.

---

## 9. Aşamalar

**Faz 0: Altyapı.** Tek ajan, tek PR dizisi. **Durum (2026-11-04): kuruldu**; kullanım ve ayrıntılar AGENTS.md "İçerik fabrikası, Faz 0" notunda, stil rehberleri sahibinin onayını bekliyor.
- Plan dosyaları, stil rehberleri (taslak, sahibi onaylar), şemalar.
- `check.ts`, `build.ts`, `coverage.ts`, `jobs.ts`.
- `src/data/content.ts` ve okuma kütüphanesinde "Diloloji metinleri" girişi.
- Dilbilgisi oyununun parçalı yüklemeyle çalışması.
- Testler: araçların birim testleri, istemcinin birim testi, E2E (metin aç → oku → anlama soruları; dilbilgisi konusu seç → parçadan soru gelir), a11y.
- Mevcut paket içi içerik yerinde kalır; taşınması ayrı bir karardır.

**Faz 1: Pilot.**
- Dil başına 200 metin (A1–B2, 20 tema) ve 2.000 dilbilgisi sorusu (10 konu).
- Çözücü ve insan örneklemi tam uygulanır.
- Stil rehberi bulunan hatalarla güncellenir.
- Sahibi pilot içeriği uygulamada dener, onay verir.

**Faz 2: Ölçek.**
- Birkaç ajan paralel çalışır, her biri ayrı iş aralığında.
- Haftalık kapsama raporu.
- Hedef: dil başına 2.000 metin ve 20.000 soru.

**Faz 3: Türetme ve ses.**
- `derive.ts` ile metin başına 10–20 alıştırma.
- A1–B1 metinlere doğal ses ve zaman damgası.

**Faz 4: Kişiselleştirme.**
- Öğrencinin seviyesine ve ilgi alanlarına göre metin önerisi (Bugün'de "Bugünün metni").
- Zayıf dilbilgisi konusuna göre soru seçimi (kör nokta röntgeni ve Rehber ile bağlantı).

Her fazın sonunda AGENTS.md'ye kısa durum notu yazılır.

---

## 10. Riskler

| Risk | Önlem |
|---|---|
| Kalite zamanla düşer (aynı kalıplar, sıkıcı metinler) | Alt beceri ve tür dağılımı iş emrinde zorunlu; benzerlik denetimi; insan örneklemi |
| İki doğru cevap | Çözücü denetimi; `alternatives`; bölge kuralı |
| Seviye kayması (A2 diye B2 metin) | CEFR kapsama eşiği; cümle uzunluğu sınırları |
| Paket ve indirme boyutu | Parçalı statik dosyalar; ön önbellek yok |
| İlerleme kaybı | Kalıcı kimlik; emekliye ayırma; günlük kimlikle tutulur |
| Telif | Yalnız özgün ya da açık lisanslı; kaynak alanı zorunlu |
| CEFR listesinin lisansı (CC BY-NC-SA) | Liste yalnız denetimde kullanılır, içeriğe kopyalanmaz. Uygulama ücretli olursa yeniden değerlendirilir (AGENTS.md) |
| Ajanların çakışması | İş sahiplenme; ayrı dallar; iş aralıkları |

---

## 11. Kurallar (AGENTS.md'den, kısaca)

- Kullanıcıya her yanıt Türkçe; kod ve commit İngilizce; PR Türkçe.
- **Doğrulama:**
  - kod değişikliğinde `npm run typecheck`, `npx oxlint src api e2e`, `npx vitest run`, E2E derlemesi `VITE_ALLOW_GUEST=1 env -u VITE_SUPABASE_URL -u VITE_SUPABASE_PUBLISHABLE_KEY npx vite build`, ardından Playwright;
  - yalnız içerik eklenen PR'larda `check.ts` raporu ve `build.ts` çıktısı yeterli, artı veri testleri.
- Yerelde doğrulanmış PR sormadan birleştirilir. Ardından `npm run verify:deploy`.
- `*-darwin.png` asla commit edilmez. Gereksiz push yapılmaz (Actions kotası sınırlı).
- Arayüzde sitenin kendi sınıfları kullanılır (`DESIGN.md`). Yeni CSS yalnız tembel ekranlarda kullanılıyorsa `lazy.css`'e yazılır; `is-` öneki kullanılmaz (cssSplit testi).
