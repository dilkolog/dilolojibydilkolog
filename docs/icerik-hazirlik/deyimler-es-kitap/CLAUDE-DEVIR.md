# Claude için devir — İspanyolca kitap çıktısı

## Tamamlanan iş

Kullanıcının isteği: PDF'den yalnız deyim/kalıpları al, anlamları ve örnekleri özgün yaz. Sonuç: 151 ifade, her biri için Türkçe anlam, iki özgün İspanyolca örnek ve Türkçe çevirileri. Örneklerin her biri en çok 16 sözcük. Kitaptaki sorular, cevaplar, açıklamalar, resimler ve tam OCR metni aktarılmadı.

Asıl veri `es-kitap-ifadeler.json`. Aynı içeriğin CSV kopyası ve 10 üniteye ayrılmış Markdown görünümü var. `PDF-TERIM-DIZINI.json` 155 adayın hangilerinin alındığını veya neden ayrıldığını gösterir. Tek sözcüklü dört öğe dışarıda tutuldu. Bu setin tamamı yalnız mecaz deyimler değildir: `kind` alanı deyim, kalıplaşmış ifade ve konuşma dili nitelemesini ayırır.

İlk on Fransızca paket ve Antigravity'nin mevcut İspanyolca dosyaları değiştirilmedi. Karşılaştırma için `icerik/deyimler-es` dalının `cdc40431` commit'indeki 16 başlangıç + 310 yeni kayıt, yalnız ifade biçimi bakımından okundu. 26 biçim eşleşmesi ve 14 olası yakınlık raporlandı; bunlar yeni uygulama kaydı olarak körlemesine eklenmemeli.

## Entegrasyon sırasında

1. Mevcut deyim paketinin iki bağımsız kaynak koşulunu bu çıktı sağlıyormuş gibi gösterme. PDF kaynak seçimini destekler; bütün kayıtlarda bağımsız sözlük + gerçek kullanım kontrolü henüz yok. `pagar a escote` için yapılan iki sözlük kontrolü de bütün sete genellenemez.
2. Antigravity'nin İspanyolca dosyalarını bu çıktıdan otomatik olarak ezme. Önce eşleşme raporunu ve anlamları karşılaştır. Aynı deyim için mevcut uygulama kimliğini ve kullanıcı ilerlemesini koru.
3. Projedeki `docs/DEYIM-PAKETI.md` şemasına dönüştürürken `w` ve `pat` ayrımını yap. Başlıklardaki algo veya alguien yer tutucularını `pat` alanına taşı. `form`, yazılacak örnekteki gerçek hâliyle birebir bulunmalı; şu an bu teslim form alanı üretmez.
4. `lit`, gerekiyorsa `eq`, üslup, bölge, tema ve CEFR alanlarını bağımsız incelemeden sonra tamamla. Bu PDF çıktısında `level: null`, `reviewStatus: pending`; rastgele seviye veya genel bölge etiketi verilmedi.
5. Sert veya kırıcı kullanım notlarını koru: örneğin beden benzetmesi `estar como una foca`, kişi nitelemeleri ve `mandar a alguien a freír espárragos`. Yalnız nötr deyim kabul eden yayına bu öğeleri doğrudan alma.
6. Sayfalardaki kitabın örneklerini kopyalamadan yeni içerik üretildi. Kaynak PDF'nin cevap anahtarı veya son sözlüğü yüklenen kopyada bulunmadığı için bunlardan doğrulanmış sonuç iddia etme.
7. Bu dosyalar editoryal teslimdir; `src/` ve `content/raw/idioms/es-*.json` değiştirilmedi. Yayına dönüşen içerik ayrıca mevcut derleyici ve veri testlerinden geçmeli.

## Kontrol

`python3 validate.py` bu klasörden çalışır. 151 benzersiz ifade, 302 tekrarsız örnek, dolu Türkçe karşılıklar, 16 sözcük sınırı, kaynak sayfaları, çıkarım dizini ve CSV/JSON eşitliği denetlenir. Anlam doğruluğu ve bağımsız dil denetimi bu araçla onaylanmaz.
