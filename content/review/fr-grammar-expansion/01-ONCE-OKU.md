# Fransızca dilbilgisi genişletmesi — 1/3

Amaç, fabrikadaki Fransızca soru sayısını 70'ten 520'ye çıkarmak: planda sırayla yedi eksik A1 ve ilk iki A2 konusu, konu başına 50 yeni soru. Mevcut présent 50 ve passé composé/imparfait 20 sorusu korunur. Bu parti ilk üç konuyu kapsar; toplamı 220'ye taşır. B1'e 450 yeni soruluk hedef içinde sıra gelmez.

| Konu | İş | Yeni soru | Alt beceri | Choice / cloze / error | Son çözücü |
|---|---|---:|---:|---|---|
| Artikeller | fr-grammar-0003 | 50 | 5 × 10 | 25 / 18 / 7 | 50/50, 0 uyuşmazlık |
| Être ve avoir | fr-grammar-0004 | 50 | 5 × 10 | 25 / 18 / 7 | 50/50, 0 uyuşmazlık |
| Olumsuzluk | fr-grammar-0005 | 50 | 5 × 10 | 25 / 18 / 7 | 50/50, 0 uyuşmazlık |

## Gerçek bağımsız çözüm

Soruların answer, alternatives, fix ve explanation alanları çıkarıldı. Yazar olmayan ayrı çözücü oturumu yalnız soru, şık ve ipuçlarını gördü; ham/yayınlanmış cevap dosyalarını okumaması istendi. Her soruyu çözdü ve tekliği değerlendirdi. İlk çözüm dosyaları `initial/` altında değişmeden durur. Son çözümler `content/review/fr-grammar-0003.solver.json`–`0005.solver.json` içindedir. Yazar bunların sonuçlarını kendisi üretmedi.

İlk turdaki üç ret/belirsizlik:

- **fr-g-000078:** professeur bağlamı cinsiyet belirtmiyordu; le yanında la professeur kullanımı da mümkündü. İsim frère olarak değiştirilip tekrar çözüldü.
- **fr-g-000087:** rendez-vous yazımı tekil/çoğulu ayırmıyordu; un/des ikisi de mümkün olabiliyordu. Tekil important sıfatıyla bağlam sabitlendi.
- **fr-g-000159:** fatiguer geçişsiz de kullanılabildiğinden a fatigué cümlesini doğrudan yanlış saymak güvenli değildi. Yalnız être ile bağlanan content du voyage kullanıldı.

Üç değişiklik ayrı anahtarsız turda tekrar çözüldü. Son durumda reddedilen soru yok. Otomatik fabrika denetimleri de üç partide 50/50 kabul, sıfır uyarı verir. Çözücü tek id atlamadı; id kümeleri ve tekrarlar ayrıca doğrulandı. Kullanıcının isteği gereği %5 toleransla tartışmalı soru bırakılmadı: son uyuşmazlık **sıfır**.

## Kural ve tablo dayanağı

Rehber: `src/data/guide/lessons-fr.ts` içindeki `basics_fr_articles`, `basics_fr_etre_avoir`, `basics_fr_negation` kuralları/tabloları. Être/avoir cevaplarının tamamı mevcut `conjugateTense(..., 'present')` hücreleriyle karşılaştırıldı; hücre ve kişi her sorunun audit JSON'unda kayıtlıdır. Artikel ve olumsuzluk parçaları fiil çekimi değildir: bunlar ilgili Rehber tabloları ve kurallarıyla, ardından bağımsız çözümle doğrulandı. Sözlükteki tek cinsiyet etiketiyle professeur gibi kullanım farklılıkları yok sayılmadı.

Açıkta kalan emin olunamayan kural yok. Çağdaş cinsiyet kullanımı ve geçişsiz fiil yorumu taşıyan bağlamlar bu partiden çıkarıldı; kural tartışması öğrencinin tek cevap vermesine bırakılmadı. İnsan/anadili örneklemi yapılmış diye işaretlenmedi; fabrikanın 10'ar soruluk örneklemleri incelemeye hazırdır.

## Tekrar üretme

Her iş için `npm run content -- check <iş>` ve `sample <iş>`; yayın için `npm run content -- build fr`. Raporlar `content/reports/` altında; öğe bazında kaynak/çekim hücresi kanıtı bu klasördeki `*.audit.json` dosyalarında. Özgün soru cümleleri yazıldı; başka sitelerden soru alınmadı.

Veri testleri: `scripts/content/content.test.ts`, `src/data/contentPublished.test.ts`, `src/data/content.test.ts` — 28 test geçti. Yalnız içerik/plan/üslup/rapor değişir; uygulama kodu değişmez. CI yeşil olmadan birleştirilmez.

## CI'da bulunan mevcut E2E beklentisi

İlk CI koşusunda birim/typecheck/lint ve WebKit geçti; masaüstü kayıt farkı testi yalnız belirli bölge adlarını içeren notlara izin verdiği için, geçerli “más claro que el agua” deyim notunda başarısız oldu. Test artık ekrandaki üç söyleyiş ve Türkçe düşünceyle gerçek veri kaydını eşleştiriyor; notu veriyle birebir karşılaştırıyor ve notu olmayan kayıtta açıklamanın görünmediğini de denetliyor. Sabit saatle bir turda iki durum da kapsanıyor; ürün verisi veya uygulama davranışı değiştirilmedi. Yerel Chromium'da hedef E2E testi geçti. Test dosyası değiştiği için tam yerel kod kontrolleri de çalıştırıldı; CI yenilendi.

Tam yerel doğrulama: typecheck geçti; oxlint sıfır hata (mevcut wordCounts.tsx uyarısı); Vitest 631 dosyada 3474 test geçti, 1 dosya/test atlandı. Üretim derlemesi ve düzeltilen masaüstü E2E testi (yerel Chromium) geçti.
