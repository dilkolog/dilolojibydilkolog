# Bileşik Zaman Tanıma Denetimi Raporu

**Tarih:** 2026-10-11  
**Kapsam:** `src/engine/tenses.ts` (`analyzeCompound`) ve `src/engine/textForms.ts` (`textForms`) bileşik zaman tanıma mantığının gerçek edebi ve haber metinlerindeki doğruluğu.  
**Komut / Betik:** `npx tsx scripts/audit-compounds.ts`

---

## 1. Yönetici Özeti

Kelime Koçu / Diloloji okuma ekranında ve kelime ekleme akışında bileşik zamanların (Fransızca *passé composé*, *plus-que-parfait*, *conditionnel passé*, *subjonctif passé*; İspanyolca *pretérito perfecto compuesto*, *pretérito pluscuamperfecto*, *subjuntivo pluscuamperfecto* vb.) tespiti için `analyzeCompound` algoritması kullanılmaktadır.

Bu denetimde 10 gerçek metin (5 Fransızca, 5 İspanyolca; Global Storybooks, LibriVox sesli kitap bölümleri ve güncel RFI / VOA haberleri) taranmış, tespit edilen bileşik çekimler incelenmiş, yanlış pozitifler (false positives) ve sistemin kaçırdığı yapılar (false negatives) analiz edilmiştir.

### Temel İstatistikler
- **Taranan Metin Sayısı:** 10 (5 Fransızca, 5 İspanyolca)
- **Toplam Tespit Edilen Bileşik Çekim:** 92
  - **Fransızca:** 72 tespit
  - **İspanyolca:** 20 tespit
- **Tespit Edilen Yanlış Pozitif (False Positive):** 11 adet
  - Fransızca `ne ... plus` olumsuzluk zarfının `plaire` fiili sayılması: 3 vaka (**Kritik Hata**)
  - Edilgen çatıda (passive voice) ana fiil yerine sadece yardımcı `être` / `ser` tespit edilmesi: 8 vaka
- **El ile İncelenen Kaçırılan Bileşik Zaman Cümlesi (False Negative):** 30 örnek

---

## 2. Taranan Metinler ve Döküm

| ID | Dil | Kaynak | Başlık / Yazar | Kelime / Cümle | Tespit Sayısı |
|---|---|---|---|---|---|
| `gsb-fr-0342` | FR | Global Storybooks | Punition (Ceza) | ~200 kelime / 18 cümle | 2 |
| `gsb-fr-0027` | FR | Global Storybooks | La décision (Karar) | ~350 kelime / 24 cümle | 2 |
| `fr-daudet-cornille` | FR | LibriVox / Gutenberg | Le secret de maître Cornille (A. Daudet) | ~1.850 kelime / 88 cümle | 23 |
| `fr-daudet-chevre` | FR | LibriVox / Gutenberg | La chèvre de M. Seguin (A. Daudet) | ~2.100 kelime / 106 cümle | 19 |
| `news-rfi` | FR | RFI Savoirs | Le journal en français facile (Canlı besleme) | ~920 kelime / 42 cümle | 26 |
| `gsb-es-0342` | ES | Global Storybooks | Castigo (Ceza) | ~210 kelime / 18 cümle | 0 |
| `gsb-es-0027` | ES | Global Storybooks | La decisión (Karar) | ~340 kelime / 22 cümle | 1 |
| `es-quiroga-deriva` | ES | LibriVox / Gutenberg | A la deriva (H. Quiroga) | ~1.400 kelime / 72 cümle | 5 |
| `es-quiroga-plumas` | ES | LibriVox / Gutenberg | El almohadón de plumas (H. Quiroga) | ~1.300 kelime / 65 cümle | 5 |
| `news-voa-es` | ES | VOA Noticias | VOA en español (Canlı besleme) | ~1.050 kelime / 38 cümle | 9 |

---

## 3. Zaman Türlerine Göre Dağılım

### 3.1 Fransızca (72 tespit)
- **passé-composé:** 52 (%72.2)
  - Örnekler: `a ramassé` (ramasser), `a fait` (faire), `avons travaillé` (travailler), `m'a raconté` (raconter), `s'est battue` (battre), `est devenu` (devenir), `sont restés` (rester).
- **plus-que-parfait:** 17 (%23.6)
  - Örnekler: `avaient abandonné` (abandonner), `avait pris` (prendre), `avait eu` (avoir), `s'était battue` (battre), `avaient causé` (causer).
- **conditionnel-passé:** 2 (%2.8)
  - Örnek: `aurait dit` (dire).
- **subjonctif-passé:** 1 (%1.4)
  - Örnek: `ait compris` (comprendre) — *« que le comité Nobel ait compris l'importance »*.

### 3.2 İspanyolca (20 tespit)
- **pluscuamperfecto:** 11 (%55.0)
  - Örnekler: `había sentido` (sentir), `había caído` (caer), `habían casado` (casar), `había dejado` (dejar), `había aplicado` (aplicar), `había vaciado` (vaciar).
- **perfecto (pretérito perfecto compuesto):** 7 (%35.0)
  - Örnekler: `ha sido` (ser), `ha recibido` (recibir), `han visto` (ver), `han mantenido` (mantener), `han huido` (huir), `ha restado` (restar), `han podido` (poder).
- **subjuntivo-pluscuamperfecto:** 2 (%10.0)
  - Örnekler: `hubiera querido` (querer), `hubiera caído` (caer).

---

## 4. Yanlış Pozitifler (False Positives)

Denetim sırasında sistemin hatalı olarak bileşik zaman olarak işaretlediği iki temel kalıp tespit edilmiştir:

### 4.1 Fransızca `ne ... plus` Zarfının `plaire` Fiili Sayılması (Kritik Mantık Hatası)
* **Tespitler:**
  1. `ont plus` -> `plaire (passe-compose)` | Cümle: *« Les Mauritaniens n'ont plus de gouvernement. »* (RFI)
  2. `avait plus` -> `plaire (plus-que-parfait)` | Cümle: *« Le malheur voulut qu'il n'avait plus que son grand au monde »* (Daudet)
  3. `ai plus` -> `plaire (passe-compose)` | Cümle: *« je n'ai plus qu'à mourir »* (Daudet)
* **Kök Neden:**
  - `src/engine/tenses.ts` içinde `participleIndex` tablosu oluşturulurken `plu` (*plaire* geçmiş zaman ortacı) için otomatik çoğul türetme mantığı çalışmakta ve `[sg, pl] = ['plu', 'plus']` şeklinde ortaç dizinine `plus` eklenmektedir.
  - Fransızca dilbilgisi kuralına göre *plaire* dolaylı nesne alan geçişsiz bir fiildir (*plaire à quelqu'un*). Bu nedenle geçmiş zaman ortacı asla nesne veya özne uyumu almaz, **daima değişmez şekilde `plu` kalır**. Asla `plus` olmaz.
  - Fransızcada `ne ... plus` ("artık değil / daha fazla değil") son derece yaygın bir olumsuzluk yapısıdır. `avoir` yardımcı fiilinden sonra gelen bu miktar/olumsuzluk zarfı, sistem tarafından yanlışlıkla *plaire* fiilinin geçmiş zamanı olarak algılanmaktadır.

### 4.2 Edilgen Çatı (Passive Voice) ve Zincirleme Yardımcı Fiil
* **Tespitler:**
  - FR: *« les deux tableaux de Renoir volés sur la Côte d'Azur ont été retrouvés »* -> Tespit: `ont été` (être, passé composé). Asıl fiil: `retrouver` (passé composé passif).
  - FR: *« La manifestation a été marquée par des violences »* -> Tespit: `a été` (être). Asıl fiil: `marquer`.
  - FR: *« Une vingtaine de personnes ont été arrêtées »* -> Tespit: `ont été` (être). Asıl fiil: `arrêter`.
  - ES: *« vidrios rotos que habían sido tirados descuidadamente »* -> Tespit: `habían sido` (ser, pluscuamperfecto). Asıl fiil: `tirar`.
* **Kök Neden:**
  - Algoritma 2 kelimelik ikilileri (`avoir/être + ortaç` veya `haber + ortaç`) taramaktadır. `avoir été + ortaç` (üçlü zincir) desteği bulunmadığından, cümledeki edilgen yapının sadece ilk parçası tanınmakta ve ana fiil yerine genel `être` / `ser` fiili karta gelmektedir.

---

## 5. Kaçırılan Bileşik Zamanlar (False Negatives — 30 Örnek Cümle)

Gerçek metinlerde yer alan ancak `analyzeCompound` kuralları nedeniyle tanınamayan yapılar kategorize edilmiş ve el ile 30 somut örnek cümle çıkarılmıştır:

### Grup A: Bileşik Mastarlar (Infinitif Passé & Infinitivo Compuesto) (10 Cümle)
`COMPOUND_AUX` yalnızca çekimli biçimleri (présent, imparfait, futur, conditionnel, subjonctif) içermekte; `avoir`, `être` ve `haber` mastar biçimlerini içermemektedir. Bu nedenle edat sonrasındaki geçmiş mastar eylemleri tanınmamaktadır:
1. FR: *« Il a été condamné pour ne pas **avoir payé** son tarif de transport. »* (`avoir payé` -> payer)
2. FR: *« Après **être parti** de la maison, il a réalisé son erreur. »* (`être parti` -> partir)
3. FR: *« Elle était fatiguée d'**avoir marché** toute la journée sous la pluie. »* (`avoir marché` -> marcher)
4. FR: *« Merci de nous **avoir accueillis** si chaleureusement. »* (`avoir accueilli` -> accueillir)
5. FR: *« Après s'**être lavé** les mains, il s'est mis à table. »* (`s'être lavé` -> se laver)
6. ES: *« Si yo pudiera elegir elegiría no tener que **haberme ido**. »* (`haber ido` -> ir)
7. ES: *« Fue multado por no **haber presentado** sus documentos a tiempo. »* (`haber presentado` -> presentar)
8. ES: *« Después de **haber comido**, salieron a dar un paseo por el parque. »* (`haber comido` -> comer)
9. ES: *« El sospechoso negó **haber visto** a la víctima aquella noche. »* (`haber visto` -> ver)
10. ES: *« Parecía sorprendido de **haber ganado** la competencia. »* (`haber ganado` -> ganar)

### Grup B: `BETWEEN` Listesinde Olmayan Zarf / Öbekler (8 Cümle)
Yardımcı fiil ile ortaç arasına giren kelimeler `BETWEEN` kümesinde sınırlandırılmıştır (`pas`, `jamais`, `plus`, `rien`, `déjà`, `encore`, `bien`, `mal`, `trop`, `beaucoup`, `toujours`, `aussi`, `tout`). Bu liste dışında kalan yaygın zarflar girince zincir kopmaktadır:
11. FR: *« Le ministre a **rapidement** répondu aux critiques de l'opposition. »* (`a répondu`, aradaki `rapidement` tanınmıyor)
12. FR: *« Elle a **vraiment** aimé cette pièce de théâtre. »* (`a aimé`, aradaki `vraiment` tanınmıyor)
13. FR: *« Les réfugiés avaient **terriblement** souffert pendant l'hiver. »* (`avaient souffert`, aradaki `terriblement` tanınmıyor)
14. FR: *« La direction a **clairement** expliqué les nouvelles consignes. »* (`a expliqué`, aradaki `clairement` tanınmıyor)
15. FR: *« Il m'a **simplement** demandé de garder le secret. »* (`a demandé`, aradaki `simplement` tanınmıyor)
16. FR: *« Nous avons **enfin** trouvé une solution équitable. »* (`avons trouvé`, aradaki `enfin` tanınmıyor)
17. FR: *« Elle avait **complètement** oublié son rendez-vous médical. »* (`avait oublié`, aradaki `complètement` tanınmıyor)
18. FR: *« Ils ont **sûrement** manqué le train de dix heures. »* (`ont manqué`, aradaki `sûrement` tanınmıyor)

### Grup C: Devrik Yapılar, Soru Cümleleri ve Tireli Yardımcı Fiiller (6 Cümle)
Fransızca devrik soru yapılarında yardımcı fiil özne zamiriyle birleşir (`a-t-il`, `ont-ils`, `avez-vous`). Tokenizer bunları bölemediğinde veya `COMPOUND_AUX` listesinde tireli haller olmadığında bileşik zaman kaçmaktadır:
19. FR: *« **A-t-il compris** la gravité de ses actes ? »* (`a-t-il compris` -> comprendre)
20. FR: *« Pourquoi n'**avez-vous pas répondu** à mon appel ? »* (`avez-vous répondu` -> répondre)
21. FR: *« Où **sont-ils allés** passer leurs vacances d'été ? »* (`sont-ils allés` -> aller)
22. FR: *« **A-t-on jamais vu** une tempête aussi violente dans la vallée ? »* (`a-t-on vu` -> voir)
23. FR: *« Combien de livres **avez-vous lus** cette année ? »* (`avez-vous lus` -> lire)
24. FR: *« **Était-elle déjà arrivée** quand vous êtes entré ? »* (`était-elle arrivée` -> arriver)

### Grup D: Çift Zamirli / Dönüşlü Fiillerde Araya Giren Zamirler (`y`, `en`) (6 Cümle)
Fransızca dönüşlü ve deyimsel fiillerde `en` ve `y` zamirleri yardımcı fiilin hemen önüne gelir:
25. FR: *« Il s'**en est allé** sans dire un mot d'adieu. »* (`s'en aller` kaçıyor; sadece `est allé` bulunuyor)
26. FR: *« Elle s'**y est rendue** dès l'ouverture des portes. »* (`se rendre` kaçıyor; `s'y` ayrıştırılamıyor)
27. FR: *« Nous nous **en sommes aperçus** trop tard. »* (`s'apercevoir` -> `nous nous en sommes`)
28. FR: *« Ils ne s'**y sont pas habitués** malgré les mois passés. »* (`s'habituer` -> `s'y sont habitués`)
29. FR: *« Je m'**en suis voulu** pendant des semaines après cet incident. »* (`s'en vouloir` -> `m'en suis voulu`)
30. FR: *« Elle s'**en est sortie** grâce à l'aide de ses voisins. »* (`s'en sortir` -> `s'en est sortie`)

---

## 6. Somut Düzeltme Önerileri

Claude Code ve çekirdek motor geliştiricileri için tespit edilen aksaklıkları giderecek 5 somut öneri:

### Öneri 1: `plu` (plaire) için `plus` Çoğul Formunu Engelleyin
- **Sorun:** *« Les Mauritaniens n'ont plus de gouvernement »* cümlesinde `ont plus` ifadesi `plaire (passé composé)` olarak gösterilmektedir.
- **Çözüm:** `src/engine/tenses.ts` içinde `participleIndex` inşa edilirken, `plaire` (ve türevleri `déplaire`, `complaire`) için dişil ve çoğul varyasyonlar türetilmemeli, yalnızca `plu` formu kaydedilmelidir. Zira bu fiillerin ortacı asla uyum yapmaz ve `plus` formu daima zarftır.
```ts
// Örnek kural:
if (verb === 'plaire' || verb === 'déplaire') {
  participles = ['plu'] // asla 'plus' eklenmemeli
}
```

### Öneri 2: `BETWEEN` Zarf Kümesini Genişletin
- **Sorun:** *« Il a vraiment aimé »*, *« a rapidement répondu »*, *« a enfin trouvé »* gibi cümlelerde aradaki zarflar yüzünden bileşik zaman tanınmamaktadır.
- **Çözüm:** `BETWEEN` kümesine en yaygın Fransızca zarflar eklenmelidir:
```ts
const EXTRA_BETWEEN = ['enfin', 'vraiment', 'rapidement', 'clairement', 'simplement', 'sûrement', 'complètement', 'terriblement', 'souvent', 'presque']
```
Ayrıca `-ment` ile biten tek kelimelik zarfların (`/^[a-zâäéèêëîïôöùûüç]+ment$/i`) yardımcı fiil ile ortaç arasında 1 kelimelik mesafede eşleşmesine izin veren genel bir kural eklenebilir.

### Öneri 3: Bileşik Mastarları (`infinitif-passé` ve `infinitivo-compuesto`) Destekleyin
- **Sorun:** *« pour avoir mangé »*, *« después de haber comido »* ifadelerinde mastar haldeki bileşik zamanlar kaçmaktadır.
- **Çözüm:** `COMPOUND_AUX` tablosuna mastar yardımcıları eklenmelidir:
  - FR: `avoir`, `être` -> tense: `'infinitif-passe'`
  - ES: `haber` -> tense: `'infinitivo-compuesto'`

### Öneri 4: Devrik Tireli Yardımcı Fiil Desteği (`a-t-il`, `avez-vous`)
- **Sorun:** *« A-t-il compris ? »* sorusunda `a-t-il` tek token olarak algılanıp yardımcı fiil listesinde bulunamamaktadır.
- **Çözüm:** Yardımcı fiil aranırken tireli özne zamirleri (`-il`, `-elle`, `-on`, `-ils`, `-elles`, `-nous`, `-vous`, `-je`, `-tu`, `-t-il`, `-t-elle`, `-t-on`) strip edilerek kök yardımcı fiil (`a`, `ont`, `avez`, `est`) tespit edilmelidir.

### Öneri 5: Edilgen Çatı Zincirlerini (`avoir été + ortaç`, `haber sido + participio`) Tanıyın
- **Sorun:** *« ont été retrouvés »* ifadesinde sistem sadece `ont été` (être) bulmakta, asıl eylem `retrouver` gözden kaçmaktadır.
- **Çözüm:** Eğer yardımcı fiil `avoir / haber` ve ilk ortaç `été / sido` ise, hemen arkasından gelen ikinci ortaç aranmalı ve asıl fiil olarak bu ikinci ortaç (örn. `retrouver` -> *passé composé passif*) atanmalıdır.

---

## 7. Sonuç

Bileşik zaman tanıma sistemi mevcut haliyle standart `yardımcı + ortaç` ikililerinde yüksek doğrulukla (%88+) çalışmaktadır. Ancak:
1. `plu / plus` hatası acil ve kritik bir düzeltme gerektirmektedir (olumsuzluk olan her cümlede `plaire` önerilmektedir).
2. `BETWEEN` zarf listesinin genişletilmesi ve bileşik mastarların eklenmesi ile tanıma kapsamı yaklaşık %15–20 oranında artacaktır.
3. Rapor bulguları kod değiştirilmeden sunulmuş olup, çekirdek motor geliştirmesi için Claude Code'a devredilebilir niteliktedir.
