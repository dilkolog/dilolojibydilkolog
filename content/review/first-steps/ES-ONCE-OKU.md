# İspanyolca ilk adım serisi

25 özgün metin: `es-r-000006`–`es-r-000030`. Başlıktaki 01–25 ve `firstStep.position` sıralamayı belirtir. Metinler Fransızca serinin çevirisi değildir: aileye telefon, büyükbaba ziyareti, istasyonda kahve, öğretmenin çalışma yeri ziyareti, ofis penceresinden selam ve pazarda aile sahneleri farklı anlatılar/sorularla yazıldı. Her metin iki paragraf, iki karşılıklı Türkçe paragraf ve üç anlama sorusu içerir. Yalnız şimdiki zaman; ser/estar/tener ağırlığı; mevcut plandaki presente, posesivos, negacion ve hay/estar hedefleri kullanılır.

## Ölçümler ve yöntem

Metin başına kelime sayısı, CEFR yüzdesi ve hedefler: `es-audit.md`. Ayrıntılı JSON: `es-audit.json` (liste dışı sözcükler, konu kullanım sayıları ve hatalar dahil). Son fabrika raporu: `content/reports/es-reading-0003.json`.

Sonuç: **25/25 kabul**, 50–75 kelime, **%96,55–100 CEFR uyumu**, sıfır ret. Altı metinde seviye uyarısı var: 15. metinde derecha/izquierda, 21–25. metinlerde manzana/manzanas. Bu sözcükler başlangıç listelerinde var; CEFR verisi aynı kelimeleri daha yüksek düzeyde/eksik sınıflıyor. Metinlerin tamamı %92 eşiğinin üstünde. Uyarılar gizlenmedi veya seviye verisi bu parti için değiştirilmedi.

Temel küme `src/data/frequency/es.txt` ilk 300 satırı + `src/data/starterLists/es.json` **w** alanlarıdır. Örnek cümleler kümeye girmez. Bilinen çekim/sözlük biçimleri ve açık düzenli çoğullar tanınır. Liste dışı şehir adları hedeflerde gösterilir: Madrid, México (Ciudad de México/Meksiko), Bogotá, Lima, Sevilla, Santiago, Mendoza, Medellín. En çok dört hedef sınırı şehirleri de kapsar.

Yeni **hedef** kelimenin metinde ilk görünüşü izlenir ve sonraki iki metnin her birinde yeniden görülmesi gerekir; son iki metin yeni hedef getirmez. Temel listeden ilk kez kullanılan her sözcük yeni hedef sayılmaz: bu küme başlangıçta bilindiği varsayılan kelimelerdir. Gerçek öğrencinin bunların hepsini bildiği garanti edilmez.

## Retler ve düzeltmeler

İlk denetimde 25 metin reddedildi; `es-initial-check.json` değişmeden saklanmıştır. Üç tür sorun vardı:

- İlk 300/başlangıç listeleri dışındaki azul, cerca, junto, delante, caliente, preguntas/palabras, escuchar gibi sözcükler sadeleştirildi. Şehir adlarının dışındaki yeni yükü büyütmek yerine izinli somut anlatımlar seçildi. Çeviri ve sorular da yeni metne uyarlandı.
- Erken görünen agua/trabajo/profesor/calle hedeflerinin sonraki iki metindeki tekrarları tamamlandı veya erken kullanım kaldırıldı. Olumsuzluk hedefinin mevcut sayaçta no yerine nunca/tampoco gibi biçimleri saydığı görüldü; üç metinde doğal nunca kullanımlarıyla iki kullanım sağlandı. Yağmur metninin hedefi, ser/estar/tener kullanımlarının belirlediği presente olarak seçildi.
- Denetleyici, una/unir, para/parir, calle/callar, tienda/tender ve cosas/coser eşsesliliklerinde isim/edatları yanlışlıkla subjuntivo sayıyordu. Yalnız bu İspanyolca belirsizlikler için açık işlev sözcüğü ve isim konumu ayrımı eklendi. Geçmiş/gelecek ve birleşik zamanlar bu muafiyetten yararlanmaz. Fui, tendré, he comido ve que él una/calle örneklerinin reddedildiği testlidir. Bu sınırlı kural genel bir sözdizim çözümleyicisi değildir; metinler ayrıca okunarak kontrol edildi.

İkinci turda kalan liste dışı kelimeler ve düzenleme sırasında oluşan `enl` yazım hataları yakalanıp düzeltildi. Bir sonraki turda kalan cosas eşseslilik hatası ve ret testinin yakaladığı fui yanlış muafiyeti giderildi. Son denetimde ret yoktur.

## Yeniden üretme

```sh
npm run content -- check es-reading-0003
npm run content -- first-steps es-reading-0003
npm run content -- sample es-reading-0003
npm run content -- build es
```

İş oluşturucunun hücre başına üç metinlik yeni rezervasyonu, başka bir işle paylaşılmadan bu seri için 6–30 aralığına genişletildi. Temalar metin düzeyindedir. Normal A1 kuralları değişmez; ilk adım profili Fransızca PR'da tanımlanır. Bu dilin PR'ında yalnız İspanyolca içerik, raporlar ve İspanyolca eşseslilik denetimi/testleri bulunur.

Yazarı Codex, metinlerin tamamını çeviri ve cevaplarıyla okuyup düzeltti. Bağımsız insan/Claude incelemesi yapılmış diye işaretlenmedi. Fabrikanın örneklem dosyası inceleme için bırakıldı. Türkçe eşleşmesinin otomatik kontrolü paragraf sayısı/doluluk biçim kontrolüdür; anlamı otomatik olarak ispatlamaz.
