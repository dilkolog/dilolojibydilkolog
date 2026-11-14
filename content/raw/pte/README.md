# PTE örnek partisi — PR 1

Avustralya Work and Holiday (462) için işlevsel İngilizce hedefleyen Türk öğrencilerin çalışmasına yönelik özgün içerik. Bu parti **her görevden 20, toplam 100 öğedir**. İnternetten veya PTE soru bankalarından cümle alınmadı. Britanya yazımı kullanıldı. Görevler bir sınav puanı ya da vize sonucu garantisi sunmaz.

2026-11-14 tarihinde incelenen main: `cfdb8fa8`. **Araştırma belgesi yoktu**: `docs/sinavlar/PTE-462.md` bulunmadığından görev metnindeki uzunluklar esas alındı. `src/data/pte.ts` ve `scripts/build-pte.mjs` de henüz main'de yoktu; dolayısıyla `node scripts/build-pte.mjs` çalıştırıldı veya geçti denemez.

Veri biçiminin sahibi arayüz tarafıdır. Aşağıdaki denetleyici, o araç main'e gelene kadar ham örnek partisini denetlemek içindir. Arayüzün türlerine veya üretim mantığına alternatif bir uygulama katmanı değildir. Uygulama kodu ve üretilmiş uygulama verileri değiştirilmedi.

## Alanlar

Bütün JSON dosyalarının kökü dizidir. Kayıtlara görev metninde belirtilmeyen alan eklenmedi.

| Dosya | Alanlar | Uzunluk / biçim |
|---|---|---|
| `wfd.json` | `id`, `text`, `level`, `topic`, `tr` | Bir cümle, 7–12 kelime |
| `rs.json` | `id`, `text`, `level`, `tr` | Bir cümle veya soru, 6–11 kelime |
| `ra.json` | `id`, `text`, `level`, `topic`, `tr` | Bir paragraf, 2–3 cümle, 35–55 kelime |
| `fib.json` | `id`, `text`, `blanks`, `level`, `topic`, `tr` | Bir paragraf, 60–90 kelime; sırasıyla `[[1]]`…`[[4]]` |
| `asq.json` | `id`, `question`, `answers`, `level`, `tr` | Bir soru; kabul edilen her cevap 1–3 kelime |

- `id`: tür öneki ve dört haneli kalıcı sıra (`pte-wfd-0001` gibi); dosyalar arasında da benzersiz. Sonraki parti mevcut kimlikleri değiştirmeden `0021` ile devam eder.
- `text`: İngilizce cümle/paragraf; FIB'de boşluk işaretlerini içerir.
- `question`: ASQ İngilizce sorusu.
- `level`: `A2`, `B1` veya `B2`. Sözcük kontrolüne ek olarak cümle yapısı ve kavramsal yük editoryal olarak gözetildi.
- `topic`: `daily_life`, `work`, `travel`, `education`, `health`, `environment`, `technology` değerlerinden biri. RS ve ASQ şemasına bu alan eklenmedi.
- `tr`: İngilizce metnin doğal Türkçesi; ASQ'da sorunun, FIB'de **cevaplarla tamamlanmış paragrafın** çevirisi. Öğrenciye cevap sonrasında gösterilecek içeriktir.
- `blanks`: metindeki sıraya karşılık gelen dört nesne. Her nesnenin yalnız `answer` ve `options` alanları vardır. `answer` tek sözcüktür; `options`, cevabı tam bir kez içeren dört farklı tek sözcükten oluşur. Çeldiriciler hedef sözcükle aynı sözcük türündedir. Cevap konumu döndürülmüştür.
- `answers`: beklenen kısa cevabın kabul edilen biçimleri; sayısal cevaplarda yazı/rakam, uygun yerlerde artikelli/artikelsiz biçimler yer alır. Büyük/küçük harf değerlendirmesi arayüzün sorumluluğundadır; yalnız harf büyüklüğü farklı kopyalar eklenmedi.

Kelime sayımı boşlukla ayrılan birimler üzerinden yapılır; apostrof ve kısa çizgi sözcüğü bölmez. FIB'deki her boşluk bir kelime yerine geçer; hem işaretli hem tamamlanmış metnin sınırlar içinde olması denetlenir.

## Doğrulama

Depo kökünden, projenin bağımlılıkları kurulu olarak:

```sh
node content/raw/pte/validate.mjs
node --test content/raw/pte/validate.test.mjs
```

`validate.mjs`: tam alan kümesi, benzersiz kimlik/metin, dolu Türkçe, uzunluklar, paragraf/cümle sayıları, seviye oranları, dört sıralı boşluk, dört farklı seçenek, cevabın seçeneklerde bir kez bulunması ve kısa cevap uzunluğunu denetler. Ardından `level-check.ts` dosyasını geçici dizine derleyip çalıştırır. Geçici derleme depoya yazılmaz.

Fabrikanın mevcut `check.ts` iş emri şeması yalnız FR/ES içindir; İngilizce çekim tablosunu yüklemek desteklenmez. Bu nedenle PTE verisine FR/ES işi uydurulmadı. İngilizce uyarlama fabrikanın **aynı** `levelRank`, `LEVEL_FIT`, `parseCefrList` ve `readingKey` işlevlerini; `src/data/cefr/en.txt` ve İngilizce sözlük paketinin biçim→madde tablosunu kullanır. Fabrikadaki gibi yazılı biçim, sözlük biçimi ve kök için bulunan en düşük seviye alınır; desteklenmeyen İngilizce fiil çözümleyicisi çağrılmaz. Büyük harfli bilinmeyen kelimelere özel ad istisnası tanınmaz. Bu, her çekimin listede ayrıca yazılı olmasını gerektirmeyen **sözcük ailesi** denetimidir.

Görev metni daha sıkı olduğu için fabrikanın %92 eşiği yerine bu partide **%100 seviye ve altı** aranır; FIB seçenekleri ve ASQ cevapları da hesaba katılır. Bütün 100 öğe geçti. Beş test geçti; kısa metin, çift kimlik, ek alan, eksik cevap, tekrar eden seçenek ve yanlış boşluk numarası gibi bozuk girdiler reddedildi. Bu kontroller çeldiricilerin anlamını veya Türkçe çevirinin doğruluğunu otomatik olarak kanıtlamaz.

Bağımsız çözücü, Türkçe çevirileri ve cevap anahtarını görmeden 20 FIB paragrafındaki **80 boşluğu** çözdü: ilk kontrolde 80/80 anahtarla eşleşme, ikinci makul doğru şık yok; doğallık düzeltmelerinden sonra son sürüm de aynı çözücü tarafından tekrar kontrol edildi. Doğallık önerileri doğrultusunda `which train to take` kullanıldı, gereksiz tekrarlar temizlendi ve kolej bağlamındaki `passengers` → `students` düzeltildi. ASQ da anahtarsız çözüldü: yün sorusundaki ikinci doğru hayvan olasılığı, yetişkin böceğin bacak sayısı sorusuyla giderildi; kimya terimi sorusu, gündelik alışverişte ücret iadesi sorusuyla değiştirildi. Doğru kısa cevap varyantları genişletildi. B2 metinlerin A2–B1'e göre daha ağır olduğu not edildi; iki B2 öğe istenen %10 payıdır.

## Örnek parti raporu

| Görev | Öğe | A2 | B1 | B2 | Min.–maks. kelime | Ortalama |
|---|---:|---:|---:|---:|---:|---:|
| WFD | 20 | 10 | 8 | 2 | 8–10 | 8,55 |
| RS | 20 | 10 | 8 | 2 | 7–10 | 7,65 |
| RA | 20 | 10 | 8 | 2 | 37–47 | 38,65 |
| FIB | 20 | 10 | 8 | 2 | 60–74 | 66,95 |
| ASQ | 20 | 10 | 8 | 2 | 6–15 | 9,55 |
| **Toplam** | **100** | **50** | **40** | **10** | | |

ASQ uzunluk sütunu soruyu ölçer; 1–3 kelime sınırı ise her cevaba uygulanır. FIB ortalaması işaretli ve tamamlanmış metinde aynıdır.

| Görev | Gündelik | İş | Seyahat | Eğitim | Sağlık | Çevre | Teknoloji |
|---|---:|---:|---:|---:|---:|---:|---:|
| WFD | 3 | 4 | 3 | 3 | 2 | 3 | 2 |
| RS | 6 | 4 | 3 | 3 | 2 | 0 | 2 |
| RA | 3 | 3 | 3 | 3 | 2 | 3 | 3 |
| FIB | 2 | 5 | 3 | 3 | 2 | 3 | 2 |
| ASQ | 6 | 0 | 2 | 4 | 4 | 4 | 0 |

RS ve ASQ konu sayıları yalnız rapor için yapılan editoryal sınıflandırmadır; JSON'a alan eklenmedi. Denetlenebilir kimlik eşlemesi (son dört hane):

- RS: gündelik `0001,0004,0006,0008,0010,0013`; iş `0011,0014,0019,0020`; seyahat `0002,0012,0015`; eğitim `0003,0007,0017`; sağlık `0005,0018`; teknoloji `0009,0016`.
- ASQ: gündelik `0001,0004,0005,0008,0015,0020`; eğitim `0002,0009,0014,0018`; sağlık `0003,0012,0013,0017`; seyahat `0010,0016`; çevre `0006,0007,0011,0019`.

PR 1 örnek onayı bekler. Onay gelmeden PR 2 için kalan 130 WFD, 130 RS, 60 RA, 60 FIB ve 100 ASQ yazılmayacak. Nihai sayılar ve oranlar: WFD/RS için 75 A2 + 60 B1 + 15 B2; RA/FIB için 40 + 32 + 8; ASQ için 60 + 48 + 12.
