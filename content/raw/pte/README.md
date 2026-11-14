# PTE 24 — Tam içerik paketi (PR 2)

Toplam **580 özgün öğe**: 150 WFD, 150 RS, 80 RA, 80 FIB, 120 ASQ. Bu PR, örnek PR #805'in üstüne **480 yeni öğe** ekler. İlk 100 öğenin kimlikleri, cevapları, metinleri ve çevirileri değiştirilmedi; ilk 20 kayıt/dosya SHA-256 kontrolüyle korunur. Yeni kimlikler 0021'den devam eder.

Hedef, Work and Holiday (462) bağlamında **PTE 24** eşiğine hazırlanan Türk öğrenciler: A1 üstü / A2 başı. Araştırma kaynağı: `belge/pte-462` dalında `docs/sinavlar/PTE-462.md`, **Ek Bölüm** (2026-11-14). Dağılım her görevde **%20 A1, %50 A2, %30 B1**; B2 yok. FIB'de 40 kısa (60–90), 40 uzun (120–180 kelime) paragraf bulunur. Yeni uzun 30 paragraf beş, diğerleri dört boşlukludur; toplam 350 boşluk.

## Alanlar ve sınırlar

Dosyalar JSON dizileridir. Görev metnindeki alan adları korundu; veri biçiminin sahibi arayüz tarafıdır. Uygulama kodu değiştirilmedi.

| Dosya | Alanlar | Biçim |
|---|---|---|
| wfd.json | id, text, level, topic, tr | Tek cümle, 8–12 kelime; hedef ses 3–5 sn |
| rs.json | id, text, level, tr | Tek cümle/soru, 6–14 kelime; hedef ses 3–9 sn |
| ra.json | id, text, level, topic, tr | Tek paragraf, 2–3 cümle; bu pakette 35–60 kelime |
| fib.json | id, text, blanks, level, topic, tr | Yarısı 60–90, yarısı 120–180 kelime; 4–5 boşluk |
| asq.json | id, question, answers, level, tr | Genel bilgi sorusu; her kabul edilen cevap 1–3 kelime |

- `id`: kalıcı `pte-<tür>-0001` biçimi; numaralar yeniden kullanılmaz.
- `text` / `question`: özgün İngilizce metin / kısa soru. İnternet veya PTE soru bankalarından alınmadı.
- `level`: A1, A2 veya B1; kelime ailesi tavanı ve editoryal yapı değerlendirmesi.
- `topic`: daily_life, work, travel, education, health, environment, technology. RS/ASQ'ya bu alan eklenmedi.
- `tr`: doğal Türkçe çeviri; FIB'de doğru cevaplarla tamamlanmış paragrafın, ASQ'da sorunun çevirisi. Cevap sonrasında gösterilecek içeriktir.
- `blanks`: metin sırasındaki `{ answer, options }` nesneleri. İşaretler `[[1]]`…`[[4]]` veya `[[5]]`; cevap tek kelime, seçenekler cevabı bir kez içeren dört farklı tek kelime. Çeldiriciler aynı sözcük türündedir. Cevap konumları çeşitlidir.
- `answers`: kabul edilen kısa yanıtlar; sayıların yazı/rakam, uygun artikel ve yaygın ifade varyantları dâhildir. Büyük/küçük harf normalleştirmesi arayüzün sorumluluğundadır. Soru metinlerinde Britanya yazımı tutarlıdır; `neighbor` gibi bir yanıt varyantının kabulü, metinlerde Amerikan yazımı kullanıldığı anlamına gelmez.

Kelime sayımı boşlukla ayrılan birimlerdir; apostrof/kısa çizgi birimi bölmez. FIB'de hem işaretli hem tamamlanmış metin denetlenir. Ses üretilmedi: kelime uzunluğu ölçülmüş ses süresi değildir. Gerçek TTS/kayıt süresi ses/arayüz aşamasında ayrıca ölçülmelidir.

## Doğrulama

Kontrol edilen main'de `src/data/pte.ts` ve `scripts/build-pte.mjs` henüz yok. Dolayısıyla bu üretim aracının çalıştığı iddia edilmiyor. Önceki partinin yerel denetleyicisi tam paket sayılarına uyarlandı; arayüz aracı main'e geldiğinde onunla tekrar doğrulanmalıdır.

```sh
node content/raw/pte/validate.mjs
npx vitest run content/raw/pte/validate.test.mjs
```

Tam alan kümesi, benzersiz kimlik/metin, cümle/paragraf ve kelime sınırları, B2 yasağı, her görevde %20/%50/%30 dağılımı, FIB kısa/uzun yarıları, sıralı 4–5 boşluk, dört farklı seçenek, cevabın tam bir kez bulunması ve kısa cevaplar denetlenir.

Fabrikanın mevcut `check.ts` iş emri şeması yalnız FR/ES içindir; İngilizce çekim tablosunu yüklemek desteklenmez. Bu nedenle PTE verisine FR/ES işi uydurulmadı. İngilizce uyarlama fabrikanın **aynı** `levelRank`, `LEVEL_FIT`, `parseCefrList` ve `readingKey` işlevlerini; `src/data/cefr/en.txt` ve İngilizce sözlük paketinin biçim→madde tablosunu kullanır. Fabrikadaki gibi yazılı biçim, sözlük biçimi ve kök için bulunan en düşük seviye alınır; desteklenmeyen İngilizce fiil çözümleyicisi çağrılmaz. Büyük harfli bilinmeyen kelimelere özel ad istisnası tanınmaz. Bu, her çekimin listede ayrıca yazılı olmasını gerektirmeyen **sözcük ailesi** denetimidir.



Fabrikanın %92 eşiği yerine **%100 seviye ve altı** aranır; seçenek ve kısa yanıtlar da kapsanır, bilinmeyen büyük harflilere özel ad istisnası verilmez. Sonuç: **580/580 öğe** geçti. **7/7 test**, bozuk girdileri ve ilk örnek partinin değişmezliğini sınar. Bu, dilbilgisi/çeviri/anlam doğruluğunun otomatik kanıtı değildir.

Yeni 60 FIB paragrafı, anahtar ve Türkçeler gösterilmeden bağımsız çözücüye verildi. İlk kontrolde çift doğru şıklar ve bir bozuk seçenek seti bulundu; düzeltildi. Tekrar kontrolde **270 yeni boşlukta ikinci makul doğru şık veya cevapsız boşluk yoktu**. Son küçük değişiklikler de yeniden çözüldü. 100 yeni ASQ da anahtarsız okundu; geniş tanımlar daraltıldı veya uygun alternatifler eklendi. İlk partinin 80 FIB boşluğu önceki turda ayrıca kontrol edilmişti. Bu denetim bir ana dili konuşurunun ölçümlü seviye sertifikası değildir.

## Arayüze devir: süre ve puanlama

Bu bilgiler JSON şemasına eklenmedi ve bu PR'da uygulanmadı.

| Görev | Hazırlık / cevap | Kayıt | Puanlama |
|---|---|---|---|
| WFD | Soru başına ayrı süre yok | Ses bir kez çalar; hedef 3–5 sn | Doğru yazılan her doğru kelime +1; yanlış 0, eksi yok |
| RS | Hazırlık yok; cevap 15 sn | Ses sonrası kısa ton; 3 sn sessizlikte kapanır | İçerik 3: tümü doğru sırada; 2: en az yarısı; 1: yarısından azı; 0: hiç/alakasız. Telaffuz ve akıcılık ayrı ölçütlerdir |
| RA | 30–40 sn hazırlık; cevap süresi metne bağlı | Kısa ton; 3 sn sessizlikte kapanır | İçerikte kelime değiştirme/atlama/ekleme birer hata; telaffuz ve akıcılık ayrıca değerlendirilir |
| FIB | Soru başına ayrı süre yok | Kayıt yok | Her doğru boşluk +1; yanlış 0, eksi yok |
| ASQ | Hazırlık yok; cevap 10 sn | Ses sonrasında ton olmadan açılır; 3 sn sessizlikte kapanır | Tam/yanlış: 1 veya 0; kısmi puan yok |

WFD ve FIB'de ayrı soru süresi olmaması, gerçek sınavdaki bölüm süresinin olmadığı anlamına gelmez. Ham alıştırma puanları PTE genel puanı 24'e doğrudan çevrilemez.

## Tam paket raporu

| Görev | Öğe | A1 | A2 | B1 | Kelime min.–maks. | Ortalama |
|---|---:|---:|---:|---:|---:|---:|
| WFD | 150 | 30 | 75 | 45 | 8–11 | 9.34 |
| RS | 150 | 30 | 75 | 45 | 7–11 | 7.63 |
| RA | 80 | 16 | 40 | 24 | 35–46 | 38.00 |
| FIB | 80 | 16 | 40 | 24 | 60–137 | 95.55 |
| ASQ | 120 | 24 | 60 | 36 | 4–16 | 8.91 |

Toplam: **116 A1, 290 A2, 174 B1**. ASQ uzunluğu soruyu ölçer; yanıtlar 1–3 kelimedir. FIB boşlukları tek sözcüklü olduğundan işaretli/tamamlanmış kelime sayıları aynıdır.

| Görev | Gündelik | İş | Seyahat | Eğitim | Sağlık | Çevre | Teknoloji |
|---|---:|---:|---:|---:|---:|---:|---:|
| WFD | 27 | 24 | 22 | 23 | 18 | 19 | 17 |
| RS | 62 | 46 | 17 | 11 | 5 | 2 | 7 |
| RA | 13 | 11 | 12 | 12 | 10 | 11 | 11 |
| FIB | 12 | 14 | 12 | 12 | 10 | 10 | 10 |
| ASQ | 55 | 15 | 11 | 18 | 8 | 12 | 1 |

RS/ASQ konu dağılımları yalnız rapor için editoryal ana konu sınıflandırmasıdır. JSON şemasına eklenmedi. Tam kimlik eşlemesi (son dört hane):

- RS / daily_life: 0001, 0004, 0006, 0008, 0010, 0013, 0021, 0022, 0023, 0024, 0025, 0028, 0029, 0030, 0032, 0033, 0035, 0036, 0037, 0038, 0039, 0040, 0041, 0042, 0043, 0045, 0046, 0049, 0050, 0051, 0055, 0056, 0057, 0058, 0062, 0066, 0067, 0068, 0071, 0072, 0075, 0076, 0077, 0082, 0083, 0085, 0086, 0090, 0093, 0096, 0099, 0100, 0104, 0105, 0107, 0109, 0114, 0115, 0119, 0134, 0135, 0139.

- RS / work: 0011, 0014, 0019, 0020, 0026, 0027, 0034, 0047, 0054, 0063, 0074, 0089, 0091, 0101, 0111, 0112, 0113, 0116, 0117, 0118, 0120, 0122, 0123, 0124, 0125, 0127, 0128, 0129, 0130, 0131, 0132, 0133, 0136, 0137, 0138, 0140, 0141, 0142, 0143, 0144, 0145, 0146, 0147, 0148, 0149, 0150.

- RS / travel: 0002, 0012, 0015, 0048, 0052, 0059, 0060, 0069, 0080, 0081, 0087, 0088, 0097, 0108, 0110, 0121, 0126.

- RS / education: 0003, 0007, 0017, 0031, 0044, 0061, 0070, 0084, 0094, 0098, 0103.

- RS / health: 0005, 0018, 0053, 0073, 0092.

- RS / environment: 0065, 0078.

- RS / technology: 0009, 0016, 0064, 0079, 0095, 0102, 0106.

- ASQ / daily_life: 0001, 0004, 0005, 0008, 0015, 0020, 0021, 0024, 0025, 0030, 0031, 0032, 0033, 0034, 0035, 0037, 0038, 0040, 0041, 0049, 0050, 0053, 0054, 0055, 0056, 0059, 0060, 0061, 0063, 0064, 0067, 0069, 0074, 0075, 0077, 0081, 0082, 0083, 0084, 0086, 0087, 0088, 0090, 0091, 0094, 0098, 0099, 0105, 0106, 0107, 0109, 0110, 0112, 0113, 0115.

- ASQ / work: 0016, 0051, 0095, 0096, 0097, 0100, 0101, 0102, 0104, 0108, 0114, 0116, 0118, 0119, 0120.

- ASQ / travel: 0010, 0017, 0048, 0057, 0058, 0076, 0078, 0079, 0089, 0103, 0117.

- ASQ / education: 0002, 0009, 0014, 0018, 0026, 0027, 0028, 0029, 0036, 0039, 0042, 0043, 0044, 0045, 0046, 0047, 0066, 0085.

- ASQ / health: 0003, 0012, 0013, 0022, 0023, 0052, 0062, 0068.

- ASQ / environment: 0006, 0007, 0011, 0019, 0065, 0070, 0071, 0072, 0073, 0080, 0092, 0111.

- ASQ / technology: 0093.

PR 2 içerik teslimidir. Uygulama bağlantısı, ses üretimi, gerçek süre ölçümü ve resmî puanlamanın uygulamadaki karşılığı arayüz/ses işinin kapsamındadır.
