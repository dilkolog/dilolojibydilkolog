# Claude ve Antigravity için devir

## Yapılan iş

Codex, `icerik/deyimler-fr` dalında ilk Fransızca deyim partisini hazırladı. Asıl veri `fr-idioms-0001.json`; Markdown inceleme dosyası bu verinin okunabilir kopyasıdır. 26 kayıt, her kayıtta iki örnek/çeviri ve bir dört seçenekli anlam sorusu bulunur. `answerIndex` sıfır tabanlıdır. Doğru cevapların konumları 7/7/6/6 olarak dengelendi.

Kaynak maddeleri web aracıyla açıldı ve anlam okundu. Kaynakların kapsamı yalnızca sözlük anlamıdır; verilen seviye veya kullanım sıklığı sertifikası yoktur. Örnek, Türkçe anlam, çeviri, açıklama ve sorular özgündür.

## Antigravity'nin incelemesi

1. Önce `SORULAR.md` üzerinden cevaplara bakmadan soruları çöz; bu amaçla yalnız `exercise.context`, `promptTr` ve `optionsTr` alanlarını kullan. `INCELEME.md` öğretim kartlarında anlam baştan görüldüğü için kör çözücü denetimine uygun değildir.
2. Her kartta anlam, çekim, doğal kullanım ve Türkçe çeviriyi değerlendir. Kaynak linkindeki ilgili anlamla karşılaştır. Özellikle `tirer son épingle du jeu` için seçilen sıyrılma anlamını, `coup de foudre` için romantik bağlamı ve `poser un lapin` kullanım etiketini incele.
3. Dört seçenekten ikincisinin de bağlamda doğru sayılabileceği durumları reddet veya düzelt. Açıklamaları, sadece cevap cümlesini tekrarlamadan değerlendir.
4. Tam görev metni geldiyse toplam sayıyı ve düzey dağılımını uygula. CEFR düzeyleri şu an `null`; rastgele doldurma. Kaynakların düzey onayı vermediğini koru.
5. Atasözü/deyim sınırı için `mettre la charrue avant les bœufs` kaydını değerlendir.
6. Gerçek bağımsız inceleme tamamlanınca ilgili `independentReview` alanlarını ve ayrı inceleme raporunu güncelle. Mevcut doğrulayıcı bütün kayıtların beklemede olduğu ilk teslim durumunu denetler; inceleme tamamlandıktan sonra onun durum koşullarını da uyarlamak gerekir.

## Claude'un entegrasyonu

- Bu JSON bir editoryal devir şemasıdır. Mevcut `content/raw/*/grammar` veya uygulama veri tipiyle uyumlu olduğu varsayılmamalı. Bu aşamada uygulama kodu ve `public/content` değiştirilmedi.
- Önce görevde istenen gerçek çıktı şemasını öğren; sonra veriyi dönüştür. Yeni bir yükleyici veya ekran ihtiyacı varsa ayrı kapsam olarak ele al.
- `src/data/starterLists/fr.json` içindeki `idioms_everyday` ve çakışma raporundaki kayıtları incele. Aynı kalıbı başka kimlikle yeniden ekleyip öğrenci ilerlemesini bölme. Var olan kimlikleri değiştirme. Mevcut B2 etiketi bu yeni bütün partinin otomatik seviyesi değildir.
- Bu paketin `fr-idiom-*` kimlikleri editoryal kaydı izler. Uygulamada mevcut kaydı zenginleştiriyorsan mevcut uygulama kimliğini koruyarak eşleme tut.
- JSON üzerinde değişiklikten sonra okunabilir inceleme dosyasını ve doğrulama çıktısını güncelle. Markdown tek başına veri kaynağı değildir.
- İspanyolca rolümüz denetleyicidir; Antigravity'nin derlemesi gelmeden o dilin derleyicisiymiş gibi paralel içerik üretme. Uzak dal son kontrolde mevcut değildi.

## Doğrulama

`python3 docs/icerik-hazirlik/deyimler-fr/validate.py`

Kontrol edilenler: kayıt/örnek adetleri, benzersiz kimlik ve ifadeler, tekrarsız Fransızca örnekler, kaynak alanları, dört benzersiz seçenek, cevap indeksleri, doğru cevabın karşılıkla uyuşması, cevap konumlarının dengesi ve ilk teslimin bekleyen inceleme durumu. Dilsel doğruluk bu araçla onaylanmaz.

Yalnız belge ve editoryal veri değiştiği için uygulama derlemesi veya tarayıcı testi çalıştırılmadı. Yayına alınacak dönüşüm, uygulamanın ilgili veri testlerinden ayrıca geçmeli.
