# İlk kullanım bileşen ve durum sözleşmesi

## Üç adım

1. Hoş geldin: ne yapacağını kısa anlatır; Başlayalım.
2. Dil: native radio kartları; landing seçimi varsa işaretli gelir ama değiştirilebilir.
3. Hedef: süre, yeni kelime üst sınırı ve isteğe bağlı ad; bitirince uygulamaya geçiş.

Ayrı bir özet/onay adımı eklenmedi. Hedef ekranındaki kısa özet seçimlerle aynı anda güncellenir. İlk kelime ve seviye testi, başlangıç adım sayacına dahil değildir.

## Seçimler

Dil ve hedefler native radio input/label/fieldset/legend ile kuruldu. Ok tuşlarıyla grup içinde seçim ve görünür odak korunur. Kart yüzeyi tıklanabilir; sadece küçük yuvarlak işareti hedeflemek gerekmez.

Günlük süre ve yeni kelime sayısı bağımsız tercihlerdir. 5dk seçince12 kelime seçimi otomatik zorla düşürülmez. Prototip aynı bağımsızlığı korur; gerçek planlayıcı süre/tekrar bütçesine göre uygun soruları seçer. “Her gün kesin 12 kelime” vaadi yok.

Ad yalnız tamamlamada trim edilir. Boş ad kabul edilir; metin isimsiz cümle kurar. Ad HTML olarak yorumlanmaz; uzun ad dar ekranda sarılır. 80 karakter sınırı bu prototip girdisi içindir; üretimde mevcut profil doğrulaması esas alınır.

## Odak ve telefon

Adım değişince tabindex=-1 başlık programatik odaklanır ve sayfa üste gelir. Başlığın çevresinde siyah etkileşim halkası çizilmez; buton/radio/input görünür odakları korunur. Telefonda ad inputuna otomatik focus verilmez. Masaüstünde kaynak FINE_POINTER tercihiyle uyumu entegrasyonda değerlendir; gerçek sanal klavye ayrıca denenmeli.

Hedef seçiminde bütün sayfayı yeniden çizmek yerine radio ve özet güncellenir; ad alanındaki yazı/klavye durumu gereksiz yere kaybolmaz. Mobilde ilk karşılama dışında büyük bitki sahnesi gizlenir, soru ve seçimler öne gelir.

## İlk kelime

Kaynak onboarding bitince onDone çağırır. Burada ilk kelime görünümü, o çağrıdan sonraki uygulama durumunun tasarımıdır. Üretimde bu paketteki örnek forma yönlendirmek yerine mevcut kelime ekleme akışı kullanılmalı.

Bir kelimeyi eklemek, o kelimede ustalık veya tamamlanmış öğrenme aşaması demek değildir. Başarı rozeti, XP ve seviye sonucu uydurulmaz. Örnek kaydı yalnız sekmededir.

## İsteğe bağlı seviye testi

Kaynak GuidePlacementNudge koşulları: words>=5; hedef bulunmaması; dil için ertelenmemiş olması; önceden placement sonucu olmaması; okunmuş rehber dersi olmaması; o dil için test içeriği bulunması. Bu koşulların hepsi korunmalı. Eşik tek başına bütün uygunluk kuralı değildir.

Prototipte placement görünümü 5 örnek kelime ve diğer engelleyici koşulların olmadığı durumu temsil eder. İlk kelime sonrası davet gösterilmez. Şimdi değil dil bazlıdır; bu prototipte yalnız bellekte tutulur. Gerçek dismissKey/localStorage kaydı değiştirilmedi. Teste bak yalnız geçiş penceresi açar; sınavı çözmez, CEFR veya sertifika üretmez.

## İnceleme araçları

Durum seçicisi, hedefe geri dön düğmesi ve örnek kelime sayıları atölye aracıdır. Aynı hesabı tekrar tekrar onboarding'e sokmak veya kayıtları sıfırlamak için kullanılmaz. Dil değişirken örnek kelime sayıları diğer dile taşınmaz; bu sınırlı demo gerçek çok dilli veri tabanı değildir.
