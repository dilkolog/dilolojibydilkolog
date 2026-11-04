# Görev: "Zamanı değiştir" için dönüşüm çiftleri

**Hazırlayan:** Claude Code (2026-11-04).
**Kim için:** bu işi devralacak ajan.
**Önce okunacaklar:**
- `AGENTS.md`: çalışma kuralları, doğrulama komutları, bilinen tuzaklar.
- `DESIGN.md`: arayüz kuralları.

Sahibinin öncelikli alanı içerik ve eğitimdir; bu iş o alanda. Kullanıcıya her yanıt Türkçe olmalı. Kod, kod yorumları ve commit mesajları İngilizce; PR başlığı ve açıklaması Türkçe yazılır.

---

## 1. Amaç

Fiil laboratuvarında **Alıştırma → "Zamanı değiştir"** modu var (#718). Şu an şöyle çalışıyor:
- Örnek cümle verisinden bir cümle seçiyor; içindeki fiil bir zamanda duruyor.
- Öğrenciden aynı fiili, aynı kişiyle başka bir zamanda yazmasını istiyor.

Bu yaklaşımın sınırları:

1. **Çeşitlilik az.** Her fiilin her zamanında yalnız **bir** cümle var. Aynı fiil hep aynı cümleyle gelir.
2. **Bağlam değişmiyor.** Cümlenin geri kalanı aynı kalıyor ("Ayer" geçen bir cümle geleceğe çevrilemez). Bu yüzden zaman sözcüğü içeren cümleler süzgeçle eleniyor ve sayı düşüyor.
3. **Fransızca şimdiki zaman kaynak olamıyor.** Örnek cümle verisinde Fransızca présent bilerek hiç yok: "parle" hem présent hem subjonctif olabildiği için boşluk doldurmada belirsizdi. `tenses.test.ts` bunu denetler.
4. **Asıl öğretici dönüşümler yok:** dolaylı anlatımda zaman kayması, si cümleleri, subjonctif / subjuntivo zaman uyumu, bitmişlik.

**Çözüm:** elle yazılan ve araçla denetlenen **dönüşüm çiftleri**. Her satırda aynı cümle iki hâlde bulunur: kaynak ve hedef. Fiilin dışındaki sözcükler de değişebilir (zaman sözcüğü, ana cümle). Ekranda kaynak cümle tam görünür; hedef cümlede yalnız fiil boştur.

| Kaynak | Hedef |
|---|---|
| Hier, j'[ai mangé] au restaurant. | Demain, je [mangerai] au restaurant. |
| Il dit qu'il [est] fatigué. | Il a dit qu'il [était] fatigué. |
| Quiero que [vengas] a la fiesta. | Quería que [vinieras] a la fiesta. |
| Si [tengo] tiempo, iré al cine. | Si [tuviera] tiempo, iría al cine. |

Mevcut Tatoeba tabanlı sorular kaldırılmaz. "Karışık" turda dönüşüm çiftleriyle birlikte sorulmaya devam eder.

---

## 2. Mevcut kod: nereye bakmalı

| Dosya | Ne yapar |
|---|---|
| `src/ui/verbs/tenseTransform.ts` | Saf mantık. `TRANSFORM_PAIRS` (izinli zaman çiftleri), `fitsTime` (zaman sözcüğü süzgeci), `personsOfForm`, `narrowBySubject` (FR'de özne zamirinden kişi), `transformFor`, `transformRound`. |
| `src/ui/verbs/tenseTransform.test.ts` | Bunların birim testleri. Gerçek tabloları ve cümleleri yükler. |
| `src/ui/verbs/TransformQuiz.tsx` | Ekran: soru, cevap alanı, `AccentBar`, sonuç, "Yeni cümleler". Cevap `judge(language, verb, tense, person, typed)` ile denetlenir. |
| `src/ui/verbs/PracticeTab.tsx` | Mod listesi `MODES`; `'transform'` modu, `transform` prop'u. |
| `src/ui/verbs/VerbLab.tsx` | `<TransformQuiz language verbs onAnswer />`. Fiil listesi seçili fiille başlar; cevaplar `onAnswer` ile laboratuvara kaydedilir. |
| `src/engine/tenses.ts` | `conjugateTense(entry, tense)` (altı biçim, özne yok), `answersFor`, `subjectLabel`, `withSubject`, `LAB_TENSES`, `tenseSentence` (tek cümle biçimi: `"önce [biçim] sonra\tTürkçe"`). |
| `src/ui/verbs/labShared.ts` | `verbEntry`, `judge`, `tenseName`. |
| `src/data/tenseData.ts` | Tabloları ve örnek cümleleri dinamik `import()` ile yükler (dil başına). |
| `scripts/add-tense-sentences.ts` | **Örnek alınacak araç.** TSV okur, her satırı çekim tablosuna karşı denetler, geçeni JSON'a yazar, reddedileni listeler. Kullanım dosyanın başında yazılı. |
| `docs/veri/ornek-cumle-partileri/*.tsv` | Elle yazılmış cümle partileri (`fiil<TAB>zaman<TAB>cümle<TAB>Türkçe`). Yeni partiler de böyle saklanmalı. |
| `src/data/tenseLessonDeep.ts` | Zaman derslerinin "Ayrıntılar" katmanı. Dolaylı anlatım, si cümleleri ve zaman uyumu kuralları burada yazılı; ekrandaki kural satırları bunlarla tutarlı olmalı. |
| `src/ui/verbs/TenseLessonSheet.tsx` | Zaman dersi penceresi (`TenseLessonSheet language tense onClose`). Sonuçtan "Dersi aç" buraya bağlanır. |
| `e2e/desktop.e2e.ts` | `verb lab: change the tense of a real sentence` testi. Geçmeye devam etmeli. |

---

## 3. Veri

### 3.1 Elle yazılan partiler (kaynak)

Konum: `docs/veri/donusum-ciftleri/<dil>-NN.tsv` (`fr-01.tsv`, `es-01.tsv`…).
- Satır başına bir çift, sekmeyle ayrılmış 7 sütun.
- `#` ile başlayan satırlar yorumdur.

```
fiil <TAB> tür <TAB> kaynakZaman <TAB> hedefZaman <TAB> kaynak cümle <TAB> hedef cümle <TAB> hedef cümlenin Türkçesi
```

- **fiil:** tablodaki anahtar (mastar). Dönüşlü fiilde tablodaki yazımla (`se lever`, `levantarse`).
- **tür:** `temel` | `aktarim` | `kosul` | `uyum` | `bitmislik` (aşağıda §4).
- **kaynakZaman / hedefZaman:** `Tense` değerleri (`present`, `imparfait`, `passe-compose`, `presente`, `subjuntivo-imperfecto`…). İkisi de `LAB_TENSES[dil]` içinde olmalı.
- **kaynak cümle / hedef cümle:** her birinde fiil **bir kez**, köşeli parantez içinde. Parantezin içeriği `conjugateTense` çıktısıyla birebir aynı olmalı: yardımcı fiil dahil, özne hariç (`j'[ai mangé]`, `il [était]`, `nous [nous sommes levés]` değil, tablonun verdiği biçim neyse o).
- **Türkçe:** hedef cümlenin doğal Türkçesi.

Örnek satırlar (doğrulanmış biçimde yazılmalı, aşağıdakiler kalıptır):

```
manger	temel	passe-compose	futur	Hier, j'[ai mangé] au restaurant.	Demain, je [mangerai] au restaurant.	Yarın restoranda yemek yiyeceğim.
être	aktarim	present	imparfait	Il dit qu'il [est] fatigué.	Il a dit qu'il [était] fatigué.	Yorgun olduğunu söyledi.
avoir	kosul	present	imparfait	Si j'[ai] le temps, je viendrai.	Si j'[avais] le temps, je viendrais.	Zamanım olsa gelirdim.
venir	uyum	subjonctif	subjonctif-passe	Je suis content que tu [viennes].	Je suis content que tu [sois venu].	Gelmiş olmana seviniyorum.
finir	bitmislik	passe-compose	plus-que-parfait	Il [a fini] son travail.	Quand je suis arrivé, il [avait fini] son travail.	Ben geldiğimde işini bitirmişti.
comer	temel	preterito	futuro	Ayer [comí] en casa de mi abuela.	Mañana [comeré] en casa de mi abuela.	Yarın büyükannemin evinde yemek yiyeceğim.
estar	aktarim	presente	imperfecto	Dice que [está] cansado.	Dijo que [estaba] cansado.	Yorgun olduğunu söyledi.
tener	kosul	presente	subjuntivo-imperfecto	Si [tengo] tiempo, iré al cine.	Si [tuviera] tiempo, iría al cine.	Zamanım olsa sinemaya giderdim.
venir	uyum	subjuntivo	subjuntivo-imperfecto	Quiero que [vengas] a la fiesta.	Quería que [vinieras] a la fiesta.	Partiye gelmeni istiyordum.
salir	bitmislik	perfecto	pluscuamperfecto	El tren ya [ha salido].	Cuando llegamos, el tren ya [había salido].	Vardığımızda tren çoktan kalkmıştı.
```

### 3.2 Uygulamanın okuduğu veri (çıktı)

Konum: `src/data/transforms/{fr,es}.json`. Bu dosyayı yalnız araç yazar, elle düzenlenmez.

```ts
interface TransformPair {
  id: string        // kararlı kimlik: dil + fiil + kaynak/hedef + kaynak cümlenin kısa özeti (ilerleme ve tekrar için)
  verb: string
  kind: 'temel' | 'aktarim' | 'kosul' | 'uyum' | 'bitmislik'
  from: Tense
  to: Tense
  source: string    // köşeli parantezli kaynak cümle
  target: string    // köşeli parantezli hedef cümle
  tr: string
  persons: number[] // iki biçimin ortak kişileri (aşağıda doğrulama 4)
}
```

**Yükleme:** dinamik `import()` ile, yalnız "Zamanı değiştir" açılınca. İlk paket büyümemeli. `tenseData.ts`e eklenmesin; `TransformQuiz` kendisi yüklesin.

---

## 4. Hareket türleri ve izinli zaman çiftleri

Her tür ayrı bir dilbilgisi konusudur. Ekranda türün kısa kuralı gösterilir (§6).

**`temel`: şimdi, geçmiş ve gelecek arasında.** Zaman sözcüğü de birlikte değişir.
- FR: present ↔ passe-compose, present ↔ imparfait, present ↔ futur, passe-compose ↔ futur.
- ES: presente ↔ preterito, presente ↔ imperfecto, presente ↔ futuro, preterito ↔ perfecto, preterito ↔ futuro.

**`aktarim`: dolaylı anlatımda zaman uyumu.** Ana fiil şimdiden geçmişe geçer: il dit → il a dit, dice → dijo.
- FR: present → imparfait, passe-compose → plus-que-parfait, futur → conditionnel, futur-anterieur → conditionnel-passe.
- ES: presente → imperfecto, preterito / perfecto → pluscuamperfecto, futuro → condicional, subjuntivo → subjuntivo-imperfecto.

**`kosul`: si cümleleri.** Gerçek → gerçek dışı → geçmişte gerçek dışı. Köşeli parantez **tek** fiili gösterir; diğer yan cümle hedef cümlede zaten değişmiş olarak yazılır.
- FR si yan cümlesi: present → imparfait → plus-que-parfait.
- FR sonuç yan cümlesi: futur → conditionnel → conditionnel-passe.
- ES si yan cümlesi: presente → subjuntivo-imperfecto → subjuntivo-pluscuamperfecto.
- ES sonuç yan cümlesi: futuro → condicional → condicional-perfecto.
- si'den sonra futur, conditionnel ya da condicional **asla** yazılmaz.

**`uyum`: subjonctif / subjuntivo.**
- **ES:** ana fiil geçmişe ya da condicional'e geçince yan cümle subjuntivo-imperfecto olur: quiero que vengas → quería que vinieras; me gusta que → me gustaría que.
- **FR:** modern Fransızcada ana fiil geçmişe geçse de subjonctif présent kalır (je voulais qu'il vienne). Bu yüzden FR'de `uyum` türü yalnız **subjonctif → subjonctif-passe**'dir (bitmiş eylem: que tu viennes → que tu sois venu). Bu ince nokta ekrandaki kural satırında anlatılmalı.

**`bitmislik`: bir geçmiş ya da gelecek noktadan önce bitmişlik.**
- FR: passe-compose → plus-que-parfait, futur → futur-anterieur.
- ES: perfecto / preterito → pluscuamperfecto, futuro → futuro-perfecto.

---

## 5. Araç: `scripts/add-transform-pairs.ts`

`scripts/add-tense-sentences.ts`'in kardeşi olarak yazılır: aynı yükleme (`addTenses`, `addConjugations`), aynı `rolldown` kullanımı.

```
npx rolldown scripts/add-transform-pairs.ts -o /tmp/t.mjs -p node && node /tmp/t.mjs <fr|es> docs/veri/donusum-ciftleri/<dosya>.tsv [--dry]
```

Her satır için doğrulama sırası. İlk başarısız kural satırı **reddeder**; reddedilen satır nedeniyle birlikte listelenir, JSON'a yazılmaz.

1. 7 sütun var. Tür, §4'teki listede. İki zaman `LAB_TENSES[dil]` içinde ve **o tür için izinli çift**.
2. Fiil tabloda var (`verbParts`) ve iki zamanda da çekimi var (`conjugateTense` boş değil).
3. Kaynak ve hedef cümlenin her birinde **tam bir** `[...]` var.
4. **Kişi:**
   - Kaynak biçimin kişileri: `conjugateTense(from)` içinde bu biçime eşit olanların sırası. Karşılaştırma küçük harfli, `’` ile `'` eşit sayılır.
   - Hedef biçimin kişileri de aynı yolla bulunur.
   - **Kesişim boş olmamalı.** Kesişim `persons` olarak saklanır.
5. İki biçim farklı (dönüşüm bir şey değiştirmeli).
6. Kaynak cümlenin köşeli parantezsiz metni dosyada daha önce yok (aynı çift iki kez girmez).
7. Türkçe boş değil.
8. **Uyarı (reddetmez):** si yan cümlesinde futur, conditionnel ya da condicional varsa uyarı basılır. Kaba bir denetim yeter: `si`, `if` ya da `si` sözcüğünden sonra 3 sözcük içinde bu zamanın biçimi.

Çıktı: `src/data/transforms/<dil>.json`.
- Mevcut kayıtlarla `id` üzerinden birleşir; `--replace` olmadan var olan `id` değişmez.
- Kayıtlar kararlı sırada (fiil, tür, kaynak) yazılır.
- Sonunda özet basılır: tür başına eklenen ve reddedilen sayısı.

---

## 6. Ekran değişiklikleri (`TransformQuiz.tsx`)

1. **Tür seçici:** turun başında bölümlü seçim (sitenin `segmented` ya da `seg-group` deseni, bkz. `DESIGN.md`).
   - Seçenekler: **Karışık · Temel · Dolaylı anlatım · si cümleleri · Zaman uyumu · Bitmişlik**.
   - Seçim `localStorage 'diloloji:transform-kind'`de saklanır. `src/data/devicePrefs.ts` `LOCAL_PREFIXES`e eklenirse hesapla gider.
   - Okuma ve yazma `try/catch` içinde yapılır.
2. **Tur kurma:** yeni saf işlev, `tenseTransform.ts` içinde, testli.
   - Seçili tür için önce dönüşüm çiftleri gelir: seçili fiilin çiftleri önce, sonra diğerleri, her fiil turda bir kez, 8 soru.
   - "Karışık" seçiliyse çiftler mevcut Tatoeba sorularıyla yarı yarıya karışır.
   - Ortak bir soru tipi gerekir: `{ verb, from, to, source, target?, persons, kind? }`. Tatoeba sorusunda `target` yoktur.
3. **Soru görünümü** (dönüşüm çifti için):
   - Üstte `Kaynak zaman → Hedef zaman` çipleri (mevcut görünüm).
   - Kaynak cümle tam: fiil `<mark className="lab-transform-form">` ile işaretli.
   - Altında hedef cümle: fiilin yerinde boşluk.
   - Altında fiil, kişi (`subjectLabel`) ve türün adı.
4. **Sonuç:** "Doğru / Doğrusu: …" (mevcut). Hedef cümle tam hâliyle ve dinle düğmesiyle gösterilir. Türün **kural satırı** görünür.
   - Örnek: aktarim için "Ana fiil geçmişe geçince présent imparfait olur."
   - Kural metinleri tür ve dil başına sabit bir haritada durur. `tenseLessonDeep.ts` ile çelişmemeli.
   - "Dersi aç" bağlantısı hedef zamanın `TenseLessonSheet` penceresini açar.
5. **Kayıt:** cevap yine `onAnswer(verb, to, ok, given, expected, person)` ile laboratuvara gider. Birden çok kişi uyuyorsa yazılan biçimin kişisi kaydedilir (mevcut davranış).
6. **Erişilebilirlik:**
   - Cevap alanının `aria-label`'ı hedef zamanı söyler.
   - Boşluk ekran okuyucuya "boşluk" olarak okunur.
   - Koyu temada kontrast korunur. Yeni renk uydurulmaz: `--lang`, `--lang-soft`, `--on-lang`.
   - Telefonda tür seçici yatay taşmamalı; gerekirse sarmalı.

---

## 7. İçerik kuralları (yazarken)

- **Seviye ve sözcük:** A2–B2; doğal, gündelik cümleler. Sıklık sırasına göre ilk 300 fiilden başlanır. Aynı fiil turda tekrar etmesin diye fiiller çeşitlendirilir.
- **Kişi:** dağılım çeşitli olsun (hepsi je/yo olmasın).
- **Biçimi aynı kişiler:**
  - FR imparfait je/tu ve ES imperfecto, condicional, subjuntivo yo/él biçimleri aynıdır. Cümlede özne açıkça yazılmalı; belirsizlik kalırsa araç kesişimi saklar ve iki kişi de doğru sayılır.
  - Kişi açıkça belli değilse o kişinin özgün biçimi istenen soru yazılmasın.
- **Tek doğru cevap:** bölgeye göre ikinci bir doğru cevap çıkabilecek cümle yazılmaz.
  - ES perfecto / preterito farkı İspanya'da ve Latin Amerika'da farklı kullanılır: `temel` türünde preterito ↔ perfecto çiftinde zaman sözcüğü kesin olmalı (hoy / esta mañana ↔ ayer).
  - -ra / -se: hedef `subjuntivo-imperfecto` ise -ra yazılır. `judge` -se biçimini de kabul ediyorsa sorun yok; etmiyorsa kabul edilir hâle getirilir (bkz. `answersFor`).
- **Konu:** hassas, kaba, siyasi konu yok. Yalnız yetişkinlere uygun içerik yok.
- **Fransızca yazım:** tipografik kesme işareti `’` kullanılır (veri dosyalarının çoğunluğuyla aynı). Araç `'` ile `’`yi eşit sayar.
- **Türkçe:** hedef cümlenin anlamını verir, kelimesi kelimesine değildir.

---

## 8. Miktar ve sıra

İlk tur, dil başına yaklaşık **500 çift**:

| Tür | FR | ES |
|---|---|---|
| temel | 150 | 150 |
| aktarim | 100 | 100 |
| kosul | 100 | 100 |
| uyum | 75 (yalnız subjonctif → passé) | 100 |
| bitmislik | 75 | 50 |

Partiler 100 satırlık olmalı. Her partiden sonra araç `--dry` ile çalıştırılır; reddedilenler düzeltilip yeniden denenir. Her parti ayrı commit olabilir. Hepsi tek PR'da toplanır (Actions kotası sınırlı; gereksiz push yapılmaz).

---

## 9. Testler

- **Veri testi** (`src/data/transforms.test.ts`):
  - Her kayıt §5'teki kuralları yeniden sağlar (araç atlanmış olabilir).
  - `id`'ler benzersiz.
  - Her dil ve her tür için en az belirlenen sayı (ilk turda tablodaki sayıların %80'i).
  - `persons` boş değil.
  - Her kaydın hedef biçimi `judge` ile en az bir kişide doğru sayılıyor.
- **Birim testi:** tur kurma işlevi (tür süzgeci, seçili fiil önce, fiil tekrarı yok, karışıkta iki kaynağın da gelmesi).
- **Bileşen testi** (isteğe bağlı): tür seçimi saklanıyor ve geri okunuyor.
- **E2E** (`e2e/desktop.e2e.ts`):
  - Mevcut `verb lab: change the tense of a real sentence` geçmeye devam eder.
  - Yeni test: "Dolaylı anlatım" seçilir, yanlış cevap verilir; "Doğrusu:", hedef cümle ve kural satırı görünür; "Dersi aç" pencereyi açar, Esc kapatır.
- **a11y** (`e2e/a11y.e2e.ts`): soru ve sonuç durumları, açık ve koyu tema, axe ve `contrastProblems`. Temayı değiştirdikten sonra `settleTransitions(page)` çağrılır.

---

## 10. Doğrulama ve teslim (AGENTS.md'den)

```bash
npm run typecheck
npx oxlint src api e2e
npx vitest run
VITE_ALLOW_GUEST=1 env -u VITE_SUPABASE_URL -u VITE_SUPABASE_PUBLISHABLE_KEY npx vite build
E2E_PORT=4180 npx playwright test e2e/phone.e2e.ts e2e/desktop.e2e.ts e2e/a11y.e2e.ts --workers=4
```

- **E2E:** uzun sürer; arka planda çalıştırıp günlüğe yazın. Yük altında kararsız düşen bir test tek başına yeniden denenir.
- **Commit etme:** `*-darwin.png` dosyaları ve `pw.tmp.config.ts`.
- **Teslim sırası:**
  1. Yerelde tam doğrulanmış PR sahibine sorulmadan birleştirilir: `gh pr merge N --merge --delete-branch`.
  2. Cloudflare Workers Builds main'i kendiliğinden yayınlar.
  3. Ardından `npm run verify:deploy` çalıştırılır.
  4. Sahibine kısa ve Türkçe bilgi verilir.
- **Commit sonu:** `Co-Authored-By: <model> <noreply@…>`. PR açıklaması "🤖 Generated with …" satırıyla biter.
- **AGENTS.md notu:** işin sonunda "Durum" bölümüne kısa bir not eklenir: veri biçimi, araç komutu, tür listesi, FR `uyum` ayrıntısı.

---

## 11. Kabul ölçütleri

- [ ] `docs/veri/donusum-ciftleri/` altında FR ve ES partileri; §8'deki sayılara ulaşıldı ya da yakın (her tür için en az %80).
- [ ] `scripts/add-transform-pairs.ts` §5'teki kurallarla çalışıyor; `--dry` reddedilenleri nedenleriyle listeliyor.
- [ ] `src/data/transforms/{fr,es}.json` yalnız araçla üretildi; dinamik yükleniyor; ilk açılış paketi büyümedi (`vite build` sonrası `dist/index.html`deki betiklerin gzip toplamıyla karşılaştırın).
- [ ] "Zamanı değiştir" turunda tür seçici var; dönüşüm çiftinde kaynak ve hedef cümle, kural satırı ve "Dersi aç" görünüyor.
- [ ] Fransızca présent artık kaynak zaman olarak soruluyor (dönüşüm çiftleri üzerinden).
- [ ] Bütün testler yeşil; yeni veri, birim, E2E ve a11y testleri eklendi.
- [ ] PR birleşti, canlıda doğrulandı, AGENTS.md'ye not düşüldü.
