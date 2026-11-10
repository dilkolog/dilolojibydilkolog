# Kaynak ve çıkarım yöntemi

Kaynak, kullanıcının yüklediği **Practica tu español — Las expresiones coloquiales** PDF'sidir. Yazarlar M.ª Dolores Martínez ve Isabel Ordeig; yayınevi SGEL. Dosya kimliği için SHA-256 ve orijinal dosya adı asıl JSON'un `sourceBook` alanında saklanır. Kitabın yayın yılı dosyanın teknik oluşturulma tarihinden türetilmedi.

PDF 55 sayfa. İlk 10 PDF sayfasında metin katmanı var; kalan 45 PDF sayfası çift kitap sayfası içeren tarama. Tarama sayfaları ikiye ayrılıp İspanyolca Tesseract modeliyle OCR uygulandı. OCR çıktısı tek başına doğru kabul edilmedi; kayıp sütunlar ve karışan ifadeler sayfa görüntüsüyle karşılaştırılarak düzeltildi. Tam OCR metni ve sayfa görselleri teslim dosyalarına veya Git'e konmadı.

Hedef kapsam, 10 ünitenin toplu ifade listeleri ve girişte özellikle vurgulanan ek bir tepkidir. Kitaptaki bütün serbest metinlerin içinde tesadüfen geçen her söz öbeğinin eksiksiz sözlüğü olduğu iddia edilmez.

- Toplu listelerde 148 öğretim maddesi var.
- Vurgu ünitesindeki bir maddede birlikte verilen üç farklı kalıp ve iki görme ifadesi ayrıldı: 3 ek aday.
- Öğrenim ünitesindeki üç maddede birlikte verilen ayrı kalıplar ayrıldı: 3 ek aday.
- Son ünitenin giriş konuşmasındaki `¡Vaya muermo!` ayrıca alındı: 1 ek aday.
- Böylece 155 normalleştirilmiş aday kaydedildi. Tek sözcüklü dört öğe ayrılınca 151 kayıt kaldı.

Her kayıttaki `source.pdfPage` PDF'nin 1 tabanlı sayfa numarasıdır. `printedPage` kitabın basılı sayfası, `side` taramadaki yarı, `sourceGroup` ilgili kaynak listesindeki madde numarasıdır. Ünite 10'daki ek ifade `opening_dialogue` bölümünden; diğerleri `target_list` bölümünden gelir. Birlikte verilen ama karşıtlık veya çekim gösteren biçimler kullanım notunda açıklanır; her çekim ayrı bir deyim sayılmadı.

Sözlük biçimleri okunabilirlik için normalleştirildi. Örneğin `ponerse a llorar como una Magdalena` → `llorar como una Magdalena`; `cara dura` kişi nitelemesi → `caradura`. Yer tutucular bazı başlıklarda korunur; bunlar uygulamanın `w` alanına doğrudan aktarılmamalıdır.

## İlave anlam kontrolü

`pagar a escote` için anlam farklılıkları nedeniyle [RAE–ASALE, escote](https://dle.rae.es/escote) ve [Wikcionario, a escote](https://es.wiktionary.org/wiki/a_escote) maddeleri açıldı (10 Kasım 2026). Türkçe temel karşılık ortak giderden kendi payını ödemek olarak yazıldı; örneklerde eşit bölüşme ayrıca belirtildi. Sözlüklerin tanımları veya örnekleri kopyalanmadı.

Diğer kayıtlar için bu dosya iki bağımsız dış kaynak denetimi yapıldığını söylemez. Buradaki iş, kullanıcının istediği ifade çıkarımı ve özgün anlam/örnek yazımıdır.
