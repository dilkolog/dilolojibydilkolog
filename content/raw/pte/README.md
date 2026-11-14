# PTE örnek partisi — PR 1, araştırma sonrası sürüm

Hedef, Work and Holiday (462) bağlamında **PTE 24** eşiğine hazırlanan Türk öğrenciler: A1 üstü / A2 başı. Kaynak: `belge/pte-462` dalındaki `docs/sinavlar/PTE-462.md`, **Ek Bölüm** (2026-11-14). Önceki “araştırma belgesi yoktu” notu artık geçerli değildir. Araştırma dalı içerik dalına birleştirilmedi; yalnız okundu.

Beş dosyanın her birinde 20 özgün öğe var. Her dosyada **4 A1, 10 A2, 6 B1**; toplamda **20 A1, 50 A2, 30 B1**. B2 yok. Mevcut kimlikler korundu. İnternetten veya sınav kaynaklarından cümle alınmadı; Britanya yazımı kullanıldı. PR 1 örnek onayı bekler; kalan 480 öğe onaydan sonra PR 2'de yazılacak.

## Alanlar ve uzunluklar

Dosyalar JSON dizileridir. Görevdeki alanlara ek alan konmadı; veri biçiminin sahibi arayüz tarafıdır.

| Dosya | Alanlar | Biçim |
|---|---|---|
| wfd.json | id, text, level, topic, tr | Tek cümle, 8–12 kelime; hedef ses 3–5 sn |
| rs.json | id, text, level, tr | Tek cümle/soru, 6–14 kelime; hedef ses 3–9 sn |
| ra.json | id, text, level, topic, tr | Tek paragraf, 2–3 cümle; bu partide 35–60 kelime |
| fib.json | id, text, blanks, level, topic, tr | 10 öğe 60–90, 10 öğe 120–180 kelime; 4–5 boşluk |
| asq.json | id, question, answers, level, tr | Genel bilgi sorusu; her kabul edilen cevap 1–3 kelime |

- `id`: kalıcı `pte-<tür>-0001` biçimi; her dosyada 0001–0020. Sonraki parti 0021'den devam eder.
- `text` / `question`: özgün İngilizce metin / kısa soru.
- `level`: A1, A2 veya B1. Seviye dağılımı dosya başına 4/10/6.
- `topic`: daily_life, work, travel, education, health, environment, technology. RS ve ASQ'ya alan eklenmedi.
- `tr`: doğal Türkçe çeviri; FIB'de cevaplarla tamamlanmış paragrafın, ASQ'da sorunun çevirisi. Cevap sonrasında gösterilir.
- `blanks`: metin sırasıyla eşleşen `{ answer, options }` nesneleri. İşaretler `[[1]]`…`[[4]]` (beş boşluklu öğede `[[5]]`); her boşlukta dört farklı tek sözcüklük seçenek ve bunlardan biri olan tek sözcüklük cevap. Bu örnek partide bütün öğeler dört boşlukludur; denetleyici beşi de destekler. Çeldiriciler hedefle aynı sözcük türündedir.
- `answers`: uygun kısa cevapların yazım/rakam ve gerekli artikel varyantları. Harf büyüklüğü normalleştirmesi arayüzün sorumluluğundadır.

Kelime sayımı boşlukla ayrılan birimlerdir; apostrof/kısa çizgi birimi bölmez. FIB'de hem işaretli hem cevaplarla tamamlanmış metin denetlenir. Ses dosyası üretilmedi: kelime aralığı, ölçülmüş ses süresi demek değildir. Gerçek TTS/kayıt süresi arayüz/ses üretimi sırasında ayrıca ölçülmelidir.

## Doğrulama

Arayüzün `src/data/pte.ts` ve `scripts/build-pte.mjs` dosyaları kontrol edilen main'de henüz yok. Dolayısıyla bu üretim aracının geçtiği iddia edilmiyor. Mevcut yerel denetleyici, araç main'e gelene kadar kullanılır; uygulama kodu değiştirilmedi.

```sh
node content/raw/pte/validate.mjs
node --test content/raw/pte/validate.test.mjs
```

Denetleyici tam alan kümesini, kimlik/metin benzersizliğini, uzunlukları, cümle/paragraf sayısını, seviye dağılımını, FIB kısa/uzun yarılarını, 4–5 sıralı boşluğu, dört seçeneği ve cevabın bir kez bulunmasını denetler. B2 reddedilir. Seviye uyarlaması geçici dizinde derlenir; çıktı depoya yazılmaz.

Fabrikanın mevcut `check.ts` iş emri şeması yalnız FR/ES içindir; İngilizce çekim tablosunu yüklemek desteklenmez. Bu nedenle PTE verisine FR/ES işi uydurulmadı. İngilizce uyarlama fabrikanın **aynı** `levelRank`, `LEVEL_FIT`, `parseCefrList` ve `readingKey` işlevlerini; `src/data/cefr/en.txt` ve İngilizce sözlük paketinin biçim→madde tablosunu kullanır. Fabrikadaki gibi yazılı biçim, sözlük biçimi ve kök için bulunan en düşük seviye alınır; desteklenmeyen İngilizce fiil çözümleyicisi çağrılmaz. Büyük harfli bilinmeyen kelimelere özel ad istisnası tanınmaz. Bu, her çekimin listede ayrıca yazılı olmasını gerektirmeyen **sözcük ailesi** denetimidir.


Bu partide %92 yerine **%100 seviye ve altı** aranır; seçenekler ve kısa cevaplar da kontrol edilir. Büyük harfli bilinmeyenlere özel ad istisnası yoktur. Sonuç: **100/100 geçti, 6/6 test geçti**. Testler bozuk şema/kimlik/uzunluk/cevapları, yanlış boşlukları, B2 yasağını, beş boşluk desteğini ve iki uzunluk aralığı arasındaki yasak bandı kapsar.

Araştırma sonrası değişen FIB'nin 20 paragrafı, anahtar ve Türkçeler gösterilmeden bağımsız çözücüye yeniden çözdürüldü: **80/80 eşleşme**, ikinci makul doğru şık yok. İşaret ettiği yazım, özne-fiil uyumu ve doğallık sorunları giderildi. Anlam, çeviri ve telaffuz kolaylığı yalnız kelime listesiyle kanıtlanmaz; örnek onayı bu nedenle hâlâ gereklidir.

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

## Parti raporu

| Görev | Öğe | A1/A2/B1 | Min.–maks. kelime | Ortalama |
|---|---:|---|---:|---:|
| WFD | 20 | 4/10/6 | 8–10 | 8.90 |
| RS | 20 | 4/10/6 | 7–9 | 7.60 |
| RA | 20 | 4/10/6 | 35–40 | 37.65 |
| FIB | 20 | 4/10/6 | 60–136 | 96.80 |
| ASQ | 20 | 4/10/6 | 6–14 | 9.55 |

ASQ uzunlukları soruya aittir; cevaplar 1–3 kelimedir. FIB'de 10 kısa + 10 uzun paragraf bulunur. Konu dağılımları:

| Görev | Gündelik | İş | Seyahat | Eğitim | Sağlık | Çevre | Teknoloji |
|---|---:|---:|---:|---:|---:|---:|---:|
| WFD | 3 | 4 | 3 | 3 | 2 | 3 | 2 |
| RS | 6 | 4 | 3 | 3 | 2 | 0 | 2 |
| RA | 3 | 3 | 3 | 3 | 2 | 3 | 3 |
| FIB | 2 | 5 | 3 | 3 | 2 | 3 | 2 |
| ASQ | 6 | 0 | 2 | 4 | 4 | 4 | 0 |

RS/ASQ yalnız rapor için sınıflandırıldı; JSON'a konu alanı eklenmedi. Kimliklerin son dört hanesi:

- RS: gündelik 0001,0004,0006,0008,0010,0013; iş 0011,0014,0019,0020; seyahat 0002,0012,0015; eğitim 0003,0007,0017; sağlık 0005,0018; teknoloji 0009,0016.
- ASQ: gündelik 0001,0004,0005,0008,0015,0020; eğitim 0002,0009,0014,0018; sağlık 0003,0012,0013,0017; seyahat 0010,0016; çevre 0006,0007,0011,0019.

Nihai hedefler: WFD/RS için 30 A1 + 75 A2 + 45 B1; RA/FIB için 16 + 40 + 24; ASQ için 24 + 60 + 36. Kalanlar, örnek onayından sonra bu dağılımları tamamlar.
