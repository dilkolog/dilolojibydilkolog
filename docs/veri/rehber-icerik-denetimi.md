# Rehber İçerik Denetimi Raporu (15.2)

Bu rapor, Diloloji Rehber ("Guide") modülündeki 204 dersin (65 Fransızca, 67 İspanyolca, 72 İngilizce) pedagojik yapısını, konu örtüşmelerini, CEFR seviye etiketlerini, önkoşul haritasını ve eksik konularını incelemektedir.

- **Tarih:** 2026-10-18
- **Kapsam:** `src/data/guide/lessons-*.ts`, `src/data/guide/prereqs.ts`, `docs/veri/rehber-ders-listesi.md`
- **Uygulama Sorumlusu:** Claude Code (kod ve ders yapısı değişiklikleri), Antigravity (veri ve test desteği).

---

## 1. Yönetici Özeti

Rehber içerikleri son derece zengin, pedagojik açıklamaları özenli ve kural anlatımları net bir altyapıya sahiptir. Bununla birlikte, farklı geliştirme turlarında eklenen dersler sonucunda:
1. **Bazı dersler arasında belirgin konu örtüşmesi (çakışma)** bulunmaktadır (örneğin İngilizce'de iki ayrı `cleft` dersi, İspanyolca'da iki ayrı olasılık gelecek zamanı dersi, Fransızca'da coğrafi yer edatları ikiliği).
2. **Bazı temel konular A1 yerine A2'de etiketlenmiştir.** Özellikle iyelik sıfatları, temel soru sözcükleri ve işaret sıfatları gibi ilk günlerin iletişimsel dilbilgisi yapıları A2 seviyesinde listelenmektedir.
3. **Temel A1 konularında bazı bariz eksikler** (saat sorma, sayılar, günler/aylar, günlük rutin) göze çarpmaktadır.

Aşağıdaki bölümlerde her dil için çakışmalar, seviye düzeltmeleri, önkoşul iyileştirmeleri ve eksik konular somut önerilerle sunulmuştur.

---

## 2. Çakışan ve Tekrar Eden Dersler

### 2.1 Fransızca (fr)

| Ders 1 | Ders 2 | Çakışma Nedeni | Öneri / Çözüm |
|---|---|---|---|
| `basics_fr_lieux` (A2)<br>_Yer edatları; ülke ve şehirle edatlar_ | `basics_fr_prepositions_geographie` (B1)<br>_Ülkeler, şehirler ve adalarla edatlar (en, au, aux, à)_ | İki ders de `en France`, `au Japon`, `à Paris`, `aux États-Unis` coğrafi edat kurallarını anlatmaktadır. | **Farklılaştır:**<br>- `basics_fr_lieux` yalnızca genel yer ve mekan edatlarına (`dans, sur, sous, devant, derrière, entre, chez`) odaklanmalı; coğrafi örnekler çıkarılmalı.<br>- `basics_fr_prepositions_geographie` ülkeler, şehirler, kıtalar ve adalar konusunun tek adresi olmalıdır. |
| `basics_fr_gerondif` (B1)<br>_Ulaç (gérondif: en + participe présent)_ | `basics_fr_participe_gerondif` (B2)<br>_Participe présent ve gérondif ayrımı_ | B1 dersi zaten gérondif ve participe présent'ın eşzamanlılık/neden farkına değinmektedir. | **Farklılaştır:**<br>- B1 dersi doğrudan `en + participe présent` yapısının günlük kullanımına (`en mangeant, en marchant`) odaklansın.<br>- B2 dersi ileri düzey niteleme, bağımsız yan cümle ve edebî dildeki participe présent kullanımına (`ayant vu, sachant que...`) odaklansın. |
| `discours_indirect_fr` (B1)<br>_Dolaylı anlatım (discours indirect)_ | `basics_fr_discours_temps` (B2)<br>_Dolaylı anlatımda zaman uyumu (concordance des temps)_ | B1'deki ders geçmiş zamanda zaman kaymasını (présent → imparfait) zaten kısaca özetlemektedir. | **Farklılaştır:**<br>- B1 dersi yalnızca giriş fiili geniş zamanda olan (`Il dit que...`) aktarımları ve temel soru aktarımlarını (`ce que, ce qui, si`) kapsasın.<br>- B2 dersi ise tamamen geçmişteki aktarımlara (`Il a dit que...`, imparfait, plus-que-parfait, conditionnel) odaklansın. |

### 2.2 İspanyolca (es)

| Ders 1 | Ders 2 | Çakışma Nedeni | Öneri / Çözüm |
|---|---|---|---|
| `basics_es_preterito` (A2)<br>_Geçmiş zaman (pretérito indefinido)_ | `basics_es_perfecto_indefinido` (A2)<br>_Pretérito perfecto ve indefinido ayrımı_ | İki ders de peş peşe ve aynı seviyede yer almakta; `basics_es_preterito` içinde zaten perfecto ile farklar işlenmektedir. | **Birleştir veya Farklılaştır:**<br>- `basics_es_preterito` dersi yalnızca *indefinido* çekimlerine ve düzenli/düzensiz köklere odaklanmalı.<br>- `basics_es_perfecto_indefinido` ise iki zamanın zaman zarflarıyla (`hoy, esta semana` vs `ayer, el año pasado`) karşılaştırmasına odaklanmalıdır. |
| `basics_es_probabilidad` (B2)<br>_Olasılık ve varsayım kipleri_ | `basics_es_futuro_probabilidad` (C1)<br>_Gelecek ve şart kipiyle olasılık tahmini_ | İki ders de `Estará en casa` (Şimdi evdedir), `Serían las tres` (Saat üç civarıydı) yapılarını aynı kurallarla anlatmaktadır. | **Birleştir:**<br>- Bu iki ders tek bir B2/C1 dersinde birleştirilebilir ya da `basics_es_probabilidad` dersi *subjuntivo* gerektiren olasılık bağlaçlarına (`quizás, tal vez, es probable que`), `basics_es_futuro_probabilidad` ise sadece modal gelecek/şart zamanlarına ayrılmalıdır. |
| `relativos_es` (B1)<br>_İlgi zamirleri (que / quien / donde)_ | `basics_es_que_quien_el_que` (B2)<br>_İlgi zamirleri incelikleri: que, quien, el que, lo que, cuyo_ | B1 dersi `que` ve `quien`i verirken B2 dersi `el que` ve `cuyo` vermektedir. Çakışma riski düşüktür ancak B1 dersi sınırlarını korumalıdır. | **Farklılaştır:**<br>- B1'de `que, quien, donde` temel ilgi zamirleri kalmalı.<br>- B2'de edatlı yapılar (`en el que, con quien`) ve `lo que, cuyo` odaklı tutulmalıdır. |

### 2.3 İngilizce (en)

| Ders 1 | Ders 2 | Çakışma Nedeni | Öneri / Çözüm |
|---|---|---|---|
| `cleft` (C1)<br>_Vurgulu cümle (cleft)_ | `basics_en_cleft_variations` (B2)<br>_Vurgu cümleleri: it-clefts ve wh-clefts_ | **Tam çakışma.** Her iki ders de aynı konuyu (`It was John who...`, `What I need is...`) anlatmaktadır. Birisi soru bankasına bağlı (4 soru), diğeri temel ders havuzundadır. | **Birleştir:**<br>- `cleft` (C1) soru bankasındaki 20 soru `basics_en_cleft_variations` ile konsolide edilmeli ya da biri "Temel Cleft Yapıları (B2)", diğeri "İleri Düzey All/Reverse/Pseudo Cleft (C1)" olarak ayrıştırılmalıdır. |
| `subjunctive` (C1)<br>_Subjunctive_ | `basics_en_subjunctive_mandative` (C1)<br>_Emir ve tavsiye dilek kipi (mandative subjunctive)_ | **Tam çakışma.** İki ders de aynı seviyede (C1) ve aynı yapıyı (`demand that he be`, `recommend that she go`) anlatmaktadır. | **Birleştir:**<br>- `subjunctive` dersi soru bankasına bağlıdır (19 soru). İki ders tek bir çatı altında birleştirilmeli; formulaic subjunctive (`basics_en_subjunctive_formulaic_clauses`) ayrı tutulmalıdır. |
| `inversion` (C1)<br>_Devrik yapı (inversion)_ | `basics_en_inversion_conditionals` (C1) & `basics_en_correlative_conjunctions` (C1) | `inversion` genel devrikliği anlatırken şart devrikliği ve `No sooner` devrikliği alt derslere bölünmüştür. | **Doğru pedagojik ayrım:**<br>- `inversion` genel kuralı (Negative adverbials: Never, Seldom, Rarely) tutmalı.<br>- Alt dersler şart ve zaman bağlaçları üzerine derinleşmelidir. (Mevcut hali korunabilir). |

---

## 3. Seviye Etiketleri ve Pedagojik Sıralama İncelemesi

Aşağıdaki dersler, CEFR (Avrupa Ortak Dil Çerçevesi) ve uluslararası sınav standartlarına (DELF, DELE, Cambridge) göre pedagojik olarak yanlış veya tartışmalı seviyelerde etiketlenmiştir:

| Dil | Ders Anahtarı (`topic`) | Mevcut Seviye | Önerilen Seviye | Gerekçe |
|---|---|---|---|---|
| **FR** | `basics_fr_possessifs` | A2 | **A1** | İyelik sıfatları (`mon, ma, mes, ton, ta, tes...`) A1'in ilk haftalarında aile ve eşya tanıtırken zorunludur. A2'ye bırakılması pedagojik olarak geçtir. |
| **FR** | `basics_fr_questions` | A2 | **A1** | Soru sorma (`est-ce que`, `où`, `quand`, `comment`) temel hayatta kalma A1 becerisidir. |
| **FR** | `basics_fr_demonstratifs` | A2 | **A1** | İşaret sıfatları (`ce, cet, cette, ces`) alışveriş ve günlük nesneleri işaret etmede A1 konusudur. |
| **ES** | `basics_es_posesivos` | A2 | **A1** | İspanyolca iyelik sıfatları (`mi, tu, su, nuestro...`) DELE A1 standardında A1'in temelidir. |
| **ES** | `basics_es_preguntas` | A2 | **A1** | Soru sözcükleri (`qué, cuál, dónde, cuándo, cómo...`) A1 iletişiminin vazgeçilmezidir. |
| **ES** | `basics_es_reflexivos` | A2 | **A1** | Günlük rutin fiilleri (`levantarse, ducharse, llamarse`) A1 seviyesinde kişinin kendisini ve gününü tanıtması için şarttır. |
| **EN** | `articles_en` | A2 | **A1** | `a / an / the` artikelleri İngilizce öğreniminin ilk adımıdır; A2 yerine A1 müfredatında yer almalıdır. |
| **EN** | `basics_en_future` | A2 | **A1 / A2** | `will` ve `going to` temel gelecek planları A1 sonu / A2 başıdır. Şu an A2'de durması kabul edilebilir ancak A1'e çekilebilir. |
| **EN** | `basics_en_cleft_variations` | B2 | **C1** | Cleft cümleleri Cambridge C1 Advanced (CAE) düzeyinde bir üslup yapısıdır; B2 için ağırdır. |

---

## 4. Önkoşul Haritası (`prereqs.ts`) Değerlendirmesi

Yapılan bütünlük denetiminde (döngü ve dil uyuşmazlığı testleri) sistemik bir hata bulunmamıştır. Ancak mantıksal sıralama açısından şu iyileştirmeler önerilir:

1. **`basics_en_causative` (B2):**
   - *Mevcut önkoşul:* `['passive_en']`
   - *Öneri:* `['basics_en_causatives_advanced']` (B1'deki temel ettirgen çatı) eklenmelidir.
2. **`basics_en_inversion_conditionals` (C1):**
   - *Mevcut önkoşul:* `['basics_en_conditionals']` (B1)
   - *Öneri:* `['basics_en_third_conditional']` (B2) ve `inversion` (C1) olmalıdır. Şart devrikliği doğrudan Type 2 ve Type 3 yapılarına dayanır.
3. **`inversion` (C1):**
   - *Mevcut önkoşul:* `['basics_en_questions']` (A1)
   - *Öneri:* A1 soru yapısından doğrudan C1 devrikliğe atlamak pedagojik bir kopukluktur. Araya `basics_en_emphasis` (B2) köprüsü eklenmelidir.
4. **`basics_fr_prepositions_geographie` (B1):**
   - *Mevcut önkoşul:* `['basics_fr_lieux']` (A2)
   - *Öneri:* `['basics_fr_articles']` (ülkelerin cinsiyeti artikellerle belirlendiği için) doğrudan ilişkili tutulmalıdır.

---

## 5. Eksik Konular (Boşluk Analizi)

Rehber'de yer almayan ve CEFR programlarında mutlaka bulunan temel başlıklar:

### Fransızca (fr)
1. **Sayılar, Saat ve Tarihler (A1 - Yüksek Öncelik):**
   - Fransızca 1–100 sayılar, 70/80/90 mantığı (`soixante-dix, quatre-vingts`), saat sorma (`Quelle heure est-il ?`) ve günler/aylar Rehber'de bağımsız bir ders olarak **yoktur**. A1'e `basics_fr_numbers_time` eklenmelidir.
2. **Vurgu Zamirleri (Pronoms Toniques) (A1 - Yüksek Öncelik):**
   - `moi, toi, lui, elle, nous, vous, eux, elles` ("C'est moi", "avec lui", "et toi ?"). Şu an zamirler dersi içinde kaybolmaktadır; A1'de bağımsız anlatılmalıdır.
3. **Yakın Gelecek (Futur Proche) (A1 - Orta Öncelik):**
   - `aller + infinitif` ("Je vais partir"). `futur_fr` B1 seviyesindedir; oysa futur proche A1'in ilk haftalarında öğretilir.

### İspanyolca (es)
1. **Sayılar ve Saat Sorma (A1 - Yüksek Öncelik):**
   - `¿Qué hora es? / Son las tres`, günler, aylar ve temel sayılar (1–100) A1'de bağımsız bir ders olarak bulunmamaktadır (`basics_es_numeros_tiempo`).
2. **Muy vs Mucho (A1/A2 - Yüksek Öncelik):**
   - Türk öğrencilerin en çok karıştırdığı `muy + sıfat/zarf` vs `mucho + isim / fiil + mucho` ayrımı müstakil bir ders olarak bulunmamaktadır.
3. **Emir Kipi Giriş (Imperativo Afirmativo Tú) (A2 - Orta Öncelik):**
   - Şu anki `imperativo_es` B1 seviyesindedir ve tüm şahısları/olumsuzları birden verir. A2 seviyesinde olumlu "tú" emirleri (`¡Come! ¡Habla! ¡Ven! ¡Haz!`) bağımsız olarak verilmelidir.

### İngilizce (en)
1. **Saat, Tarih ve Sıra Sayıları (A1 - Yüksek Öncelik):**
   - Telling the time, days of the week, months, ordinal numbers (`first, second, third`) bağımsız bir A1 dersi olarak eksiktir.
2. **Emir Kipi ve Öneriler (Imperatives & Suggestions) (A1 - Orta Öncelik):**
   - `Do, Don't, Please, Let's, Shall we` kalıpları A1 seviyesinde bağımsız ders olarak bulunmamaktadır.
3. **Miktar Sözcükleri Detayı (Countable / Uncountable & Quantifiers) (A2 - Orta Öncelik):**
   - `much, many, a lot of, a few, a little, few, little` ayrımı şu an çoğullar dersinin arkasında sıkışmıştır; müstakil bir ders hak etmektedir.

---

## 6. Derslerdeki Olgusal ve Terminolojik Bulgular

1. **İngilizce `basics_en_emphasis` (B2):**
   - Kural: *"Zarfları ve tek başına sıfatları nitelemek için so, isim tamlamalarında such kullanılır."*
   - *Not:* `so much / so many + isim` istisnası kural maddesinde belirtilmemiş, doğrudan örneklere bırakılmıştır. Kural metnine `"much ve many ile so kullanılır (such değil)"` notu eklenmelidir.
2. **İspanyolca `por_para` (B1):**
   - Kural açıklamaları başarılıdır; ancak pasif çatıda fail belirten `por` ("El libro fue escrito por Cervantes") kuralına bir madde ayrılmalıdır.
3. **Fransızca `basics_fr_c_est_vs_il_est` (A2):**
   - Kural: *"Mesleklerde Il est médecin denir, artikel gelirse C'est un bon médecin olur."*
   - *Not:* Bu ayrım Türk öğrenciler için kritiktir ve kural çok doğru formüle edilmiştir. Dersin başına bir referans tablosu eklenmesi anlaşılırlığı katbekat artıracaktır.

---

## 7. Sonuç ve Eylem Planı (Claude Code İçin Öneri Sırası)

1. **Aşama 1 (Çakışmaların Giderilmesi):**
   - `cleft` (C1) ile `basics_en_cleft_variations` (B2) birleştirilmeli veya farklılaştırılmalı.
   - `subjunctive` (C1) ile `basics_en_subjunctive_mandative` (C1) birleştirilmeli.
   - `basics_fr_lieux` ile `basics_fr_prepositions_geographie` sınırları netleştirilmeli.
2. **Aşama 2 (Seviye Etiketlerinin Düzeltilmesi):**
   - FR ve ES'deki `possessifs` ve `questions` dersleri A1 seviyesine taşınmalı.
   - `articles_en` A1 seviyesine taşınmalı.
3. **Aşama 3 (Eksik Derslerin Eklenmesi):**
   - Her üç dil için de A1 seviyesine "Sayılar, Saat ve Takvim" temel dersleri eklenmeli.
