# Fransızca deyimler — düzeltme sonrası devir

> Güncel uygulama taslağı: **500 kayıt**. Bu dizinin 237 kayıtlık tarihsel editoryal seti ve kimlikleri korunur; aktarım, kaynak yöntemleri ve bekleyen denetim için [UYGULAMA-PAKETI.md](UYGULAMA-PAKETI.md).


Antigravity’nin 33 sorunlu ve 30 şüpheli kaydı içeren raporları alındı. Üretici Codex’in 63 kararı ana dizindeki `DENETIM-DUZELTMELERI.md` ve `.json` dosyalarındadır. Asıl girdi raporları depodaki `content/review/idioms/fr-*.md` dosyalarında değişmeden korunur.

## Güncel veri

10 editoryal paket, 237 aktif kayıt, 474 örnek/çeviri ve 237 bağlam sorusu bulunur. İlk 260 kimlikten 23’ü `RETIRED.json` içinde gerekçeleriyle saklanır; kimlikler başka ifadelere verilmez. `fr-idioms-*.json` asıl kaynaktır; Markdown ve ZIP, `render.py` ile üretilir. `pattern` alanı, sözlük biçiminden ayrılan kişi yer tutucusunu taşır. `answerIndex` sıfır tabanlıdır.

`independentReview.status = reported_clean` Antigravity’nin ilk raporunda temiz saydığı kayıtları belirtir; `pending_recheck` üreticinin düzelttiği ve Antigravity’nin tekrar incelemesini bekleyen kayıtları gösterir. İkisi de insan onayı veya CEFR sertifikası değildir. `level: null` korunmuştur.

Kaynak yöntemleri: `dictionary_entry_opened`, `dictionary_search_excerpt`, `usage_page_opened`, `usage_search_excerpt`. Arama özetiyle sınırlı erişimin notunu silmeyin. Le Robert’ın eski 403 kaydı yerinde durur; 117’ye ayrıca açılarak okunan Wiktionnaire `miné` maddesi ve L’Est Républicain kullanım kaynağı eklendi.

## Tekrar denetim

1. Değişen soruları ilgili `SORULAR.md` dosyasında cevap anahtarı görmeden çözün; sonra JSON ile karşılaştırın.
2. 63 kararın her birini eski raporla ve gerçek ifadeyle eşleştirin; 22 gerekçede başka deyim adı geçtiği için yalnız gerekçe sözcüklerini izleyerek kayıt silmeyin.
3. Uzun örnekler en çok 16 kelimeye indirildi; deyimin kesintisiz kullanımı, çeviri ve tek cevap yeniden incelensin.
4. Sonraki aşamada 31’lik temalı parti düzeni, tüm kayıtlarda ikinci kaynak, CEFR dağılımı ve `docs/DEYIM-PAKETI.md` uygulama şeması tamamlanır. Mevcut editoryal JSON doğrudan uygulama verisi değildir.

İspanyolca deyimler Antigravity’ye aittir; `icerik/deyimler-es` dalına yazmayın. Fransızca ve ardından İngilizce toplama Codex’tedir. Kullanıcı hazır yapmadıkça PR #773 taslak kalır.

## Araçlar

Ana dizinden `python3 validate.py` veri/kimlik/kaynak/örnek/soru tutarlılığını kontrol eder. `python3 -m unittest discover -s . -p 'test_*.py'` doğrulayıcının kayıpsız kimlik ve sınır ihlallerini yakaladığını sınar. `render.py` depo içinde okunabilir dosyalar, dizin, tarama ve 11 ZIP üretir. Toplu ZIP açıldığında `validate.py` tek başına çalışır; `render.py` tarama için Git checkout’u ister.
