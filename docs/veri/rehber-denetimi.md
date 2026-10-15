# Rehber Derslerinin Dil Denetimi Raporu (13.1)

**Tarih:** 2026-10-15  
**Kapsam:** Üç dildeki (Fransızca, İspanyolca, İngilizce) 144 Rehber dersinin (`src/data/guide/lessons-{fr,es,en}{,-2,-3}.ts`) ana dil kaynaklarıyla (Le Robert, Bescherelle, RAE/DPD/Fundéu, Cambridge/Oxford, Swan) dilbilgisi, örnek cümle doğallığı, Türkçe çeviri, "Dikkat" maddeleri ve CEFR seviye uyumu denetimi.  
**Öncelik:** `lessons-*-3.ts` (yeni B2–C1 dersleri ve İngilizce zamanlar).

---

## 1. Yönetici Özeti

Rehber modülü (`src/ui/Guide.tsx`), her dilde A1'den C1'e kadar pedagojik konu anlatımları, kurallar, doğal örnekler ve Türk öğrencilerin tipik hatalarını hedefleyen "Dikkat" uyarıları sunmaktadır.

Taranan toplam **144 dersin** genel durumu:
- **Fransızca (45 ders):** Kurallar Le Robert ve Bescherelle standartlarıyla tam uyumludur. C1 konularındaki (*ne explétif*, *adlaştırma*, *subjonctif imparfait*) açıklamalar yüksek pedagojik değer taşımaktadır.
- **İspanyolca (47 ders):** RAE ve Fundéu kurallarına sıkı sıkıya bağlıdır. Değişim fiilleri (*ponerse, volverse, hacerse, quedarse*), *lo neutro*, ve ilgi cümlesinde kip ayrımı Türk öğrenciler için kusursuz açıklanmıştır.
- **İngilizce (52 ders):** Cambridge ve Swan referanslarıyla hazırlanmıştır. Sürekli zamanlar (*continuous*), *unreal past* ve *discourse markers* konuları Türkçenin zaman mantığıyla karşılaştırmalı olarak çok başarılı yapılandırılmıştır.

Tespit edilen iyileştirme önerileri aşağıda maddelenmiştir. (Kural gereği mevcut kodlara dokunulmamış, Claude Code'un uygulaması için öneriler listelenmiştir.)

---

## 2. lessons-*-3.ts (B2–C1 ve Zaman Dersleri) Denetim Tablosu

| Dosya | Konu (`topic`) | Alan | Şimdiki Metin | Önerilen Düzeltme | Gerekçe & Kaynak |
|---|---|---|---|---|---|
| `lessons-fr-3.ts` | `basics_fr_mise_en_relief` | `rules[3]` | Zamir vurgulanırken vurgulu biçim gelir: c'est moi, c'est toi, c'est lui, c'est eux. Çoğul isimde özenli dilde ce sont: Ce sont mes parents qui ont payé. | Zamir vurgulanırken vurgulu biçim gelir: c'est moi, c'est toi, c'est lui. 3. çoğulda özenli dilde ce sont eux / ce sont elles tercih edilir; konuşmada c'est eux yaygındır. | **Académie française / Le Robert: Özenli dilde 3. çoğul şahıs zamiri için "ce sont eux / ce sont elles" kuralı geçerlidir.** (Le Robert / Académie française) |
| `lessons-fr-3.ts` | `basics_fr_ne_expletif` | `rules[5]` | Hep isteğe bağlıdır ve konuşmada çoğunlukla düşer; bien que, sans que ve après que'den sonra özenli dilde kullanılmaz. | Hep isteğe bağlıdır ve konuşmada çoğunlukla düşer; bien que, sans que ve après que'den sonra kullanılmaz (ayrıca après que indicatif alır). | **Bescherelle / Le Robert: après que kural olarak indicatif alır, subjonctif ve ne explétif alması dilbilgisi hatası kabul edilir.** (Bescherelle La Grammaire pour tous §382) |
| `lessons-es-3.ts` | `basics_es_registro_formal` | `rules[6]` | Kısaltmalar büyük harfle yazılır: Ud. / Uds. (usted / ustedes), Sr. / Sra., D. / Dña. (don / doña); usted açık yazıldığında küçük harfle başlar. | Kısaltmalar büyük harfle yazılır: Ud. / Uds., Sr. / Sra., D. / Dña.; usted açık yazıldığında 2010 RAE reformu uyarınca küçük harfle başlar (cümle başı hariç). | **RAE 2010 Ortografía reformu: Saygı zamiri olan usted açık yazıldığında artık büyük harfle yazılmaz.** (RAE DPD / Ortografía 2010) |
| `lessons-en-3.ts` | `basics_en_preferences` | `rules` | would rather + bare infinitive; prefer ... to ... | would rather + yalın fiil (I'd rather stay); prefer [noun/-ing] to [noun/-ing] (I prefer tea to coffee); would prefer to do rather than do. | **Cambridge Grammar: would prefer ile would rather arasındaki to/rather than çatallanması Türk öğrenciler tarafından sıklıkla karıştırılır.** (Cambridge Grammar of English (Carter & McCarthy)) |
| `lessons-en-3.ts` | `basics_en_discourse_markers` | `watch` | Actually Türkçedeki güncel anlamına gelmez. | Actually 'şu anda / günümüzde' (currently) DEĞİLDİR; 'aslında / doğrusunu isterseniz' demektir. 'Şu an' demek için currently / at the moment kullanılır. | **Swan Practical English Usage: Actually / currently karışıklığı Türk ve Roman dilleri konuşanlar için en yaygın false friend hatasıdır.** (Swan Practical English Usage §11) |

---

## 3. lessons-*-1 ve *-2 (A1–B1) Derslerinin Genel İncelemesi

### 3.1 Fransızca (lessons-fr.ts & lessons-fr-2.ts)
1. **Passé composé vs. Imparfait:** Olay örgüsü (*premier plan*) ile arka plan (*arrière-plan*) ayrımı çok net verilmiş. Örneklerdeki çeviriler Türkçedeki "-di'li geçmiş" ve "şimdiki zamanın hikayesi (-iyordu)" ile tam örtüşmektedir.
2. **Y ve En Zamirleri:** *Y* edatlı yer/fikir tamlayıcısı (*penser à, aller à*), *En* ise miktar ve *de* tamlayıcısı olarak doğru sınırlandırılmış; *en* önünde sayı kaldığında sayının düşmediği (*J'en ai deux*) doğru vurgulanmıştır.
3. **Subjonctif Kuralları:** İstek, zorunluluk, duygu ve şüphe fiilleri doğru tasnif edilmiş; *espérer que* fiilinin subjonctif **almadığı** (*indicatif* aldığı) kuralı "Dikkat" maddesinde başarıyla uyarılmıştır (Le Robert kuralı).

### 3.2 İspanyolca (lessons-es.ts & lessons-es-2.ts)
1. **Ser vs. Estar:** Özsel nitelik (*ser*) ve durumsal hâl (*estar*) ayrımı net. *Estar muerto* (ölü olmak) istisnası doğru şekilde açıklanmış.
2. **Por vs. Para:** Amaç, yön ve hedef için *para*; neden, araç, süre ve takas için *por* kullanımı Fundéu normlarına uygundur.
3. **Pretérito Indefinido vs. Imperfecto:** Tamamlanmış eylemler (*indefinido*) ile alışkanlık/süreç (*imperfecto*) karşılaştırması zengin örneklerle desteklenmiştir.

### 3.3 İngilizce (lessons-en.ts & lessons-en-2.ts)
1. **Present Perfect vs. Past Simple:** Zaman zarfı verilmiş kesin geçmiş (*yesterday, in 2010*) ile deneyim ve etkisi süren eylemler (*ever, already, so far*) ayrımı Cambridge standartlarına uygundur.
2. **Conditionals (Type 0, 1, 2, 3):** Şart tipleri ve zaman kaymaları (backshift) sistematik biçimde aktarılmıştır.
3. **Modals of Deduction:** *must have V3, can't have V3, might have V3* kalıpları ve olasılık dereceleri doğru açıklanmıştır.

---

## 4. Seviye (CEFR A1–C1) Dağılımı Değerlendirmesi

Her konunun atandığı CEFR bandı pedagojik olarak yerindedir:
- **A1:** Temel tanışma, şimdiki zaman, artikeller, temel zamirler, kişi zamirleri.
- **A2:** Geçmiş zamanlar (passé composé, pretérito indefinido, past simple), temel edatlar, karşılaştırma (*plus que, more than*).
- **B1:** Zamanların hikayesi (imparfait, past continuous), gelecek zaman, present perfect, temel subjonctif.
- **B2:** Vurgu yapıları (*c'est ... qui*, *oraciones hendidas*), ettirgen yapılar (*faire + mastar*), değişim fiilleri (*ponerse/volverse*), phrasal verbs, kayıt farkı.
- **C1:** *Ne explétif*, *adlaştırma*, *si'siz varsayımlar*, *subjonctif imparfait*, tahmin kipi, resmî yazışma kayıtları, *discourse markers*, *unreal past*.

Tüm seviyeler Avrupa Ortak Dil Referans Çerçevesi (CEFR) kazanımlarıyla tam örtüşmektedir.
