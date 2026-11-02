# Türkçe karşılık kapsamı ve üretim akışı

30 Ekim 2026 çalışması. `summary.json` gerçek paketlerden ölçülür. `translation-queue.jsonl`
dil başına sıklığa göre ilk 200 çeviri adayını taşır. Aday olmak, çeviriye uygunluğu veya
özel ad olmadığını doğrulamaz; özellikle altyazı sıklık listelerindeki adlar ayrıca denetlenmelidir.
Tam eksik listeleri `*-missing.jsonl` olarak yerelde üretilir, Git'e alınmaz.

## Sonuç

| Dil | Önce Türkçe anlamlı | Sonra | Doldurulan mevcut kayıt | Yeni kalıp |
|---|---:|---:|---:|---:|
| EN | 15.417 | 15.473 | 42 | 14 |
| FR | 12.317 | 12.376 | 44 | 15 |
| ES | 11.155 | 11.229 | 59 | 15 |

Toplam 145 boşluk dolduruldu, 44 yeni kalıp eklendi; Türkçe karşılığı olan kayıt sayısı
38.889'dan 39.078'e çıktı. Yeni kayıtlar dahil sayım yapılır; yeni kalıplar tek sözcük değildir.
`src/data/wordpack-supplements/2026-10-30.json`, Codex'in ürettiği ve dilsel olarak
kontrol ettiği özgün editoryal çevirilerdir. İnsan onayı veya yeni bir dış kaynaktan doğrulama
iddiası taşımaz; kaynak ve inceleyen her kayıtta açıklanır.

## 1. Önceliklendirme

```bash
node scripts/wordpack-coverage.mjs
```

Sıra, paketin nesne sırasından değil `src/data/frequency/<dil>.txt` dosyasından alınır.
Anlamı bilinen mastara bağlı çekimler `form_resolved` olarak ayrılır. Özel ad olabilecek
kayıtlar, türü belirsiz olanlar ve kısaltmalar `manual_review` grubuna girer. Kapsam raporu
ilk 1.000 / 5.000 / 10.000 / 20.000 sıklık girdisi için doğrudan ve mastar üzerinden erişimi
ayrı sayar. Dolayısıyla doğrudan karşılığı eksik her kayıt yeni bir çeviri değildir.

## 2. Kaynak yenileme

```bash
node scripts/refresh-wordpack-sources.mjs .wordpack-cache tr en fr es
```

Resmî Kaikki kaynakları indirilir. SHA-256, indirme zamanı, ETag, Last-Modified, kaynak URL ve
lisans yerel `manifest.json` dosyasında tutulur. Başarısız indirmeler mevcut dosyayı ezmez.
ETag destekleniyorsa değişmeyen kaynak yeniden indirilmez. İngilizce dökümü birkaç GB olabilir.

**Bu ortamda uygulanamayan adım:** 30 Ekim'de Kaikki HTTPS isteği ağ politikası tarafından
CONNECT 403 ile engellendi. Yeni döküm indirilmedi; paketlerin kaynak tarihleri yenilenmiş gibi
gösterilmedi. DeepL anahtarı da ortamda tanımlı değildi; gerçek API çevirisi yapılmadı.

## 3. Üretim ve güvenli birleştirme

```bash
npx rolldown scripts/build-wordpack.ts -o /tmp/build-wordpack.mjs -p node
node --max-old-space-size=8192 /tmp/build-wordpack.mjs YENI_SURUM \
  .wordpack-cache/en.jsonl .wordpack-cache/fr.jsonl .wordpack-cache/es.jsonl \
  .wordpack-cache/trwiktionary.jsonl
```

Varsayılan sınır dil başına 50.000 (`LIMIT=...` ile değişir). Sıklık listesinden sonra,
Türkçe anlamı bulunan ek maddeler sınır içinde alınır. Var olan kayıtlar, sesler, cinsiyetler,
cümleler ve anlamlar korunur; yeni kaynaklar boş alanları tamamlar. Homografın İngilizce isim
ve fiil tabloları tür uyuşmuyorsa çaprazlanmaz. Etiketsiz çeviri tabloları farklı anlamlar
arasında birleştirilmez. İngilizce kaynak tanımı `d` alanında çeviri bağlamı için saklanır.

`WORDPACK_OUTPUT=/tmp/wordpack-review` ile paketleri önce ayrı dizine üretmek mümkündür.
Depodaki denetlenmiş ekler varsayılan olarak yeniden uygulanır. `WORDPACK_SUPPLEMENTS` ile
başka bir JSON dosyası belirtilebilir. Mevcut anlamı düzeltmek ayrı editoryal işlem gerektirir;
bu akış dolu anlamları kendiliğinden değiştirmez.

## 4. Bağlamlı çeviri taslakları

```bash
node scripts/translate-wordpack-missing.mjs \
  docs/veri/sozluk-kapsami/translation-queue.jsonl /tmp/translations-draft.jsonl --limit 100
```

`DEEPL_AUTH_KEY` çalışma ortamında tanımlanır; anahtar dosyaya veya komuta yazılmaz.
Sözcük türü ve mevcut tanım / örnek cümle bağlam olarak gönderilir. Tanımı veya örneği olmayan
kayıtlar otomatik çevrilmez: önce yeni döküm veya editoryal araştırmayla bağlam eklenir.
Çıktı her sözcükten sonra kaydedilir; tekrar çalıştırma daha önce kaydedilen sonuçları atlar.
API hatasında işlem durur; tamamlanan taslaklar korunur. Yalnızca `draft` üretilir, uygulama
çalışırken API çağrısı eklenmez.

Her taslak sözcük türü ve anlam açısından kontrol edildikten sonra `MeaningSupplement[]`
şeklinde JSON dosyasına aktarılır; `status: "reviewed"`, `reviewedBy` ve `source` doldurulur.
Sadece statüyü değiştirmek inceleme yerine geçmez. Uygulama betiği denetlenmemiş taslakları
almadığı gibi, tür çelişkisi veya boş kaynak gibi hatalarda yazmadan durur.

```bash
npx rolldown scripts/apply-reviewed-wordpack.ts -o /tmp/apply-wordpack.mjs -p node
node /tmp/apply-wordpack.mjs YENI_SURUM denetlenmis-ekler.json --dry
node /tmp/apply-wordpack.mjs YENI_SURUM denetlenmis-ekler.json
node scripts/wordpack-coverage.mjs
```

Yeni içerik kaydedildikten sonra `wordpack.test.ts`, `wordpackEnrichment.test.ts` ve sözlük
arama testleri çalıştırılır; kapsam değişimi raporla karşılaştırılır. Sürüm değişikliği mevcut
istemcilerin güncel paketi almasını sağlar; mevcut kişisel kelimeler kullanıcı düzenlemelerini
koruyan paket uygulama mekanizması üzerinden güncellenir.

## İkinci denetim — 1 Kasım 2026

189 kaydın tamamı tekrar incelendi; 19 karşılık düzeltildi ve örneklendirildi. Paket sürümü
`2026-11-01.1`; kayıt sayıları değişmedi. [Tam kontrol listesi](ikinci-denetim-2026-11-01.md).
Editoryal bir düzeltmenin `replaces` alanı, tam olarak hangi eski anlamların değiştirilebileceğini
belirtir. Farklı bir elle düzenlenmiş anlam varsa uygulama hata verir; o anlam ezilmez. Aynı
düzeltmeyi tekrar uygulamak değişiklik yapmaz.
