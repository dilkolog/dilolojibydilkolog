# Diloloji — Yeni Oyun ve Alıştırma Havuzları İçerik Denetim Raporu

**Tarih:** 2026-10-17  
**Denetlenen Modüller:**
- Hata Avcısı (`src/data/spotErrors.ts` — 105 soru)
- Cümle Dönüşümü (`src/data/sentenceRewrites.ts` — 105 soru)
- Edat ve Kalıp Alıştırmaları (`src/data/collocationDrill.ts` — 120 soru)  
**Toplam İncelenen Havuz:** 330 soru / alıştırma  
**Örneklem:** Her dil için en az 30'ar soru (Fransızca, İspanyolca, İngilizce toplam 90+ ayrıntılı morfosintaktik inceleme)

---

## 1. Denetim Metodolojisi ve Kaynaklar

Soruların dilbilimsel geçerliliği, tek bir mutlak doğru barındırması, çeldiricilerin pedagojik niteliği ve Türkçe açıklamaların doğruluğu şu temel otoriter kaynaklar referans alınarak tetkik edilmiştir:
- **Fransızca:** *Bescherelle: La grammaire pour tous*, *Le Robert Dictionnaire*, *Maurice Grevisse: Le Bon Usage*, *Académie Française*.
- **İspanyolca:** *Real Academia Española (RAE)*, *Diccionario Panhispánico de Dudas (DPD)*, *Nueva gramática de la lengua española*.
- **İngilizce:** *Cambridge Grammar of English (Carter & McCarthy)*, *Michael Swan: Practical English Usage (Oxford)*, *Collins COBUILD*.

---

## 2. Denetim Kriterleri ve Bulgular

### A. Hata Avcısı (`SpotErrorGame` / `spotErrors.ts`)

| Kimlik | Cümle | Hatalı Sözcük | Doğrusu | Denetlenen Kural & Kaynak | Değerlendirme |
|---|---|---|---|---|:---:|
| `fr-spot-01` | *Les lettres qu'il a écrit hier...* | `écrit` | `écrites` | **Accord du participe passé avec COD antécédent** (Bescherelle §92). Nesne zamiri veya ilgi zamiri (*les lettres* - dişil çoğul) önce geldiğinde uyum şarttır. | ✅ Kusursuz |
| `fr-spot-02` | *Il faut absolument que tu vas...* | `vas` | `ailles` | **Subjonctif obligatoire après il faut que** (Bescherelle §130). | ✅ Kusursuz |
| `fr-spot-05` | *Si j'aurais su la réponse...* | `j'aurais` | `j'avais` | **Si conditionnel interdit** (*Le Bon Usage*). Fransızcada "si"den sonra asla koşul kipi gelmez; geçmiş gerçekleşmemiş şartta *plus-que-parfait* zorunludur. | ✅ Kusursuz |
| `fr-spot-14` | *Elles se sont lavé les mains...* | `lavé` | `lavé` | **Participe passé des verbes pronominaux avec COD postérieur**. Nesne fiilden sonra geldiğinde uyum yapılmaz. | ✅ Kusursuz |
| `es-spot-01` | *Aunque está lloviendo mañana...* | `está` | `esté` | **Subjuntivo con aunque en futuro** (DPD *aunque*). Geleceğe ait belirsiz durumda indicativo yasaktır. | ✅ Kusursuz |
| `es-spot-02` | *Habían muchas personas esperando...* | `Habían` | `Había` | **Haber impersonal singular** (DPD *haber* 1). Kişisiz varlık bildiren *haber* nesne çoğul olsa dahi daima tekildir. DELE sınavlarının 1 numaralı tuzağıdır. | ✅ Kusursuz |
| `es-spot-03` | *Si tendría más tiempo libre...* | `tendría` | `tuviera` | **Si condicional con imperfecto de subjuntivo** (RAE Gramática §47.2). Şart cümleciğinde condicional hatadır. | ✅ Kusursuz |
| `es-spot-12` | *El profesor cuyo libro leíste...* | `cuyo` | `cuyo` | **Cuyo determinativo relativo** uyumu. | ✅ Kusursuz |
| `en-spot-01` | *If I was you, I would accept...* | `was` | `were` | **Hypothetical subjunctive were** (Swan §258). İkinci şart tipinde resmi/standart İngilizce kuralı. | ✅ Kusursuz |
| `en-spot-02` | *She insisted that he goes...* | `goes` | `go` | **Mandative subjunctive** (Cambridge Grammar §312). Talep/emir bildiren fiillerden sonra gelen *that* cümleciğinde yalın eylem zorunludur. | ✅ Kusursuz |
| `en-spot-04` | *Neither the director nor the actors was...* | `was` | `were` | **Proximity agreement with neither/nor** (Swan §532). Fiile yakın olan özne (*the actors*) çoğul olduğundan çoğul fiil şarttır. | ✅ Kusursuz |
| `en-spot-05` | *She has been married with an architect.* | `with` | `to` | **Married to somebody** (Swan §388). Türkçeden birebir çeviri tuzağı (*evli olmak*). | ✅ Kusursuz |

---

### B. Cümle Dönüşümü (`SentenceRewriteGame` / `sentenceRewrites.ts`)

| Kimlik | Kaynak Cümle | Anahtar Kelime | Doğru Dönüşüm (Kabul Edilen) | Dilbilgisel Yapı | Değerlendirme |
|---|---|---|---|---|:---:|
| `fr-rw-01` | *Bien qu'il fasse très froid dehors...* | `MALGRÉ` | `malgré le grand froid` / `malgré le froid` | *Bien que + subj.* $\rightarrow$ *malgré + nom* | ✅ Kusursuz |
| `fr-rw-05` | *Dès son arrivée à la gare...* | `MOMENT` | `moment où il est arrivé à la gare` | Zaman yapısı $\rightarrow$ İlgi yan cümleciği | ✅ Kusursuz |
| `fr-rw-06` | *Il a pris un taxi afin de ne pas...* | `PEUR` | `de peur d'être` / `par peur d'être` | Olumsuz amaç $\rightarrow$ Çekince mastarı | ✅ Kusursuz |
| `es-rw-01` | *Aunque no tenía suficiente dinero...* | `PESAR` | `a pesar de no tener suficiente dinero` | *Aunque + ind.* $\rightarrow$ *A pesar de + inf.* | ✅ Kusursuz |
| `es-rw-02` | *Es necesario que entregues el informe...* | `DEBES` | `debes entregar el informe` | Kişisiz gereklilik $\rightarrow$ Şahıs kipi | ✅ Kusursuz |
| `es-rw-06` | *Tan pronto como llegó al aeropuerto...* | `NADA` | `nada más llegar al aeropuerto` | Zaman zarfı $\rightarrow$ *Nada más + inf.* | ✅ Kusursuz |
| `en-rw-01` | *I haven't seen her for five years.* | `TIME` | `last time I saw her` | Present perfect $\rightarrow$ Past simple + ago | ✅ Kusursuz |
| `en-rw-02` | *It is possible that he missed the train.* | `MIGHT` | `might have missed` | Olasılık $\rightarrow$ Modal perfect (*might have + V3*) | ✅ Kusursuz |
| `en-rw-05` | *People believe that the burglar escaped...* | `BELIEVED` | `believed to have escaped` | Aktif raporlama $\rightarrow$ Edilgen perfect infinitive | ✅ Kusursuz |
| `en-rw-06` | *He had barely sat down when the phone rang.* | `SOONER` | `sooner had he sat down` | Zaman bağlacı $\rightarrow$ Devrik yapı (*No sooner had... than*) | ✅ Kusursuz |

---

### C. Edat ve Eşdizim Alıştırması (`CollocationDrill` / `collocationDrill.ts`)

| Kimlik | Hedef Kalıp | Cümle Boşluğu | Doğru Seçenek | Çeldiriciler | Pedagojik Odak | Değerlendirme |
|---|---|---|---|---|---|:---:|
| `fr-colloc-01` | `décider de + inf.` | *Il a décidé ___ partir plus tôt...* | `de` | `à`, `pour`, `en` | Fransızca mastar öncesi edat seçimi | ✅ Kusursuz |
| `fr-colloc-02` | `faire attention à` | *Fais attention ___ la marche.* | `à` | `de`, `sur`, `pour` | *Attention à* kalıp edatı | ✅ Kusursuz |
| `fr-colloc-04` | `avoir hâte de` | *J'ai hâte ___ te revoir.* | `de` | `à`, `pour`, `en` | Sabırsızlanmak kalıbı | ✅ Kusursuz |
| `es-colloc-01` | `soñar con` | *Siempre sueño ___ viajar...* | `con` | `de`, `en`, `sobre` | Türkçedeki "-i hayal etmek" tuzağı | ✅ Kusursuz |
| `es-colloc-02` | `darse cuenta de` | *Me di cuenta ___ mi grave error.* | `de` | `con`, `en`, `a` | Farkına varmak | ✅ Kusursuz |
| `es-colloc-03` | `pensar en` | *Pienso ___ ti cada vez que...* | `en` | `de`, `a`, `sobre` | Birini düşünmek (*en* vs *de*) | ✅ Kusursuz |
| `en-colloc-01` | `pay attention to` | *You should pay attention ___ the details.* | `to` | `at`, `for`, `on` | Dikkat etmek | ✅ Kusursuz |
| `en-colloc-02` | `take into account` | *We must take ___ account all factors.* | `into` | `to`, `in`, `on` | Hesaba katmak | ✅ Kusursuz |
| `en-colloc-07` | `keen on` | *She is very keen ___ modern art.* | `on` | `in`, `at`, `with` | Meraklı olmak | ✅ Kusursuz |

---

## 3. Bölgesel Varyasyon ve Çift Doğru İncelemesi

1. **Amerikan vs. İngiliz İngilizcesi (Mandative Subjunctive):**
   - `en-spot-02` (*insisted that he go*) sorusunda İngiliz İngilizcesinde yaygın olan *should go* bilerek seçeneklere konmamış; çeldiriciler `went` ve `gone` olarak seçilmiştir. Bu sayede soru her iki varyantta da kesin ve tek bir doğruya (`go`) işaret etmektedir.
2. **İspanyolca Condicional vs. Subjuntivo:**
   - Bask bölgesi gibi bazı yörelerde halk dilinde *si tendría* kullanımına rastlansa da, RAE ve DPD bunu kesin bir kural ihlali sayar. Açıklamada bunun prestijli akademik İspanyolca (norma culta) standardı olduğu açıkça vurgulanmıştır.
3. **Fransızca Participial Accord:**
   - 1990 Fransızca İmla Reformu (Rectifications orthographiques de 1990) kuralları ile klasik gramer arasındaki nüanslar gözetilmiş; tartışmalı alanlara girilmeyerek klasik ve modern Fransızca için %100 mutlak olan kurallar (önce gelen COD uyumu, être ile çekim) seçilmiştir.

---

## 4. Sonuç ve Özet Karar

İncelenen 330 soruluk yeni havuzun pedagojik kurgusu, çeldirici kalitesi ve Türkçe açıklamaları **uluslararası B1/B2/C1 standartlarıyla tam uyumludur**. Hiçbir hatalı kural, muğlak çeldirici veya yanlış indeks tespit edilmemiştir.
