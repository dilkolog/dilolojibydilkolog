# Claude ve Antigravity için devir — 10 Fransızca paket

## Teslim

Kullanıcının bu oturumdaki isteğiyle ilk paket dâhil toplam 10 paket tamamlandı. 260 kayıt, 520 özgün Fransızca örnek ve Türkçe çevirisi, 260 dört seçenekli anlam sorusu var. Ana dizin `README.md`, veri listesi `PAKET-DIZINI.json`. İlk JSON kökte, diğerleri `paquet-02`–`paquet-10` klasörlerinde.

`fr-idioms-*.json` dosyaları asıl veri kaynağıdır. Markdown ve ZIP dosyaları bunlardan üretilir. İlk paketin 26 kimliği korundu; bütün aralık `fr-idiom-000001`–`fr-idiom-000260`. `answerIndex` sıfır tabanlıdır. `level: null` henüz seviye atanmadığını belirtir; uygulamanın kabul edeceği nihai CEFR değeri değildir.

Kaynaklar: Larousse, Wiktionnaire/Wiktionary, Académie française, CNRTL/TLFi, Usito ve bir Le Robert kaydı. 259 kaydın sözlük maddesi açıldı. `fr-idiom-000117` için arama sonucundaki tanım okundu fakat doğrudan Le Robert erişimi 403 verdi; `dictionary_search_excerpt` alanı ve notu korunmalı. Kaynak kontrolü örneklerin veya CEFR düzeylerinin bağımsız onayı değildir.

## Bağımsız denetim

Fransızca üretici Codex, denetleyici Antigravity olarak ayrılmıştı. Bu teslimde bağımsız denetim yapılmış gibi işaretlenen kayıt yoktur. Claude entegrasyonda bu ayrımı korusun.

1. Önce her paketin `SORULAR.md` dosyasını çöz. Anlamların baştan göründüğü `INCELEME.md` dosyasını kör çözüm için kullanma.
2. Her kimlik için bulduğun harfi, ikinci geçerli seçenek bulunup bulunmadığını, gerekçeni ve gerekli düzeltmeyi ayrı rapora yaz. Sonra JSON anahtarıyla karşılaştır.
3. Örneklerin doğallığı, Türkçe çevirinin doğruluğu, seçilen anlam ve çeldiriciler ayrıca değerlendirilmeli. Birbiriyle yakın anlamlı deyimleri bağlama göre ayır; cümledeki yakın anlamlı iki Türkçe seçeneği birlikte doğru bırakma.
4. Tam görev planındaki CEFR dağılımı elde edilince düzeyleri ata. Sözlüğün deyimi tanımlaması seviye sertifikası değildir. `DENETIM-NOTLARI.md` dosyasındaki kapsam ve kullanım notlarına bak.
5. Yalnız gerçekten tamamlanan bağımsız incelemelerde `independentReview` alanını güncelle. Mevcut doğrulayıcı, ilk teslimde bütün kayıtların beklemede ve düzeylerin atanmamış olduğunu denetler; sonraki aşamada bu koşullar bilinçli olarak uyarlanmalı.

## Entegrasyon

- Bu bir editoryal devir şemasıdır. Uygulamanın `GrammarExercise`, `starterLists` veya içerik fabrikası şemasıyla doğrudan uyumlu kabul etme. Henüz uygulama kodu, veri yükleyicisi veya `public/content` değişmedi.
- Önce hedef modülü ve gerçek çıktı şemasını belirle; sonra veriyi dönüştür. Yalnızca öğrenim içeriği eklemek için yeni arayüz veya yükleyici oluşturulması gerekmeyebilir.
- `MEVCUT-ICERIK-TARAMASI-TUMU.md` ve `src/data/starterLists/fr.json` içindeki `idioms_everyday` dâhil mevcut kayıtları incele. Aynı deyimi yeni uygulama kimliğiyle ekleyip öğrenci ilerlemesini bölme. Mevcut kimlikleri koru; editoryal kimlikten uygulama kimliğine eşleme tut.
- Paketler arasında birebir ifade ve örnek tekrarı kontrol edildi. Anlamdaş deyimler ayrı öğrenim hedefleri olarak bulunabilir; bu sayılar birbirinden bütünüyle ayrı 260 anlam kavramı değildir.
- Önce JSON üzerinde düzelt, ardından `render.py` ile okunabilir dosyaları ve arşivleri yenile. Markdown'ı tek başına değiştirirsen sonraki üretimde değişiklik kaybolur.
- Uygulamaya dönüştürülen veriyi ilgili veri testlerinden ayrıca geçir. Buradaki belge/veri teslimi için uygulama derlemesi veya tarayıcı testi çalıştırılmadı.
- İspanyolca rolümüz denetleyicidir. Bu set Fransızcadır; İspanyolca derlemenin teslim alınıp incelendiği iddia edilmez.

## Kontrol ve arşivler

`python3 docs/icerik-hazirlik/deyimler-fr/validate.py`

Kayıt sayıları, kimlik aralığı, normalleştirilmiş ifade ve örnek tekilliği, çevirilerin doluluğu, dört benzersiz seçenek, cevap indeksleri, doğru cevabın karşılıkla uyuşması, kaynak alanları ve dengeli cevap dağılımı kontrol edilir. Dilsel doğruluk ve tek doğru cevabın anlamsal kanıtı bu araçla sağlanmaz.

`python3 docs/icerik-hazirlik/deyimler-fr/render.py`

Markdown, dizin, yapı raporları, mevcut içerik taraması ve arşivleri yeniden üretir. Toplu ZIP, kaynakları ve araçları bir kez içerir; içinde tekli ZIP'ler tekrar yer almaz. Tekli ZIP'ler yalnız ilgili paketi incelemek içindir; bütün seti doğrulamak ve yeniden üretmek için toplu ZIP'i kullan.
