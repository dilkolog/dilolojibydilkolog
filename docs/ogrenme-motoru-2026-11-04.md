# Öğrenme ve tekrar motoru incelemesi — 4 Kasım 2026

## Bulgular ve değişiklikler

- `SessionScreen.proceed` yalnız yanlış cevapta yeniden deneme üretiyordu. Motorun iki başarılı geri çağırma şartı, ilk doğru cevap sonrasında yeni soru gelmediğinden yarım kalabiliyordu. Devam eden yeniden öğrenmede de soru üretiliyor; aynı becerinin bekleyen sorusu varsa kuyruk çoğaltılmıyor. Kelime başına üç ek deneme sınırı korunuyor. Sınırda hâlâ zorlanılan kelime öğrenilmiş ilan edilmiyor; oturum özetinde zorlanılanlarda yer alıyor ve FSRS tekrarında kalıyor.
- Yeni kelimeler tüm oturuma karışıyordu. Üç kelimelik gruplar kullanılıyor; bir grubun dinamik pekiştirmeleri sonraki grubun önüne yerleşiyor. Bu, kalıcı öğrenme garantisi değil; tamamlanan grubun oturum içindeki görevlerini bitirme kuralı.
- Yeni kelimenin ilk sorusu rastgele bağlam sorusu olabiliyordu. İlk adım anlam tanıma; sonra anlam pekiştirme ve yazılı hatırlama. Rehberli gruplarda tahmin sorusundan önce tanıtım kartı gösteriliyor.
- Genel başarı oranı yeni kelimenin öğrenme adımını değiştiriyordu. Yeni ve pekiştirme adımları bu uyarlamadan korunuyor.
- Yazılı pekiştirme her zaman serbest pratik olarak kaydediliyordu; recall kartı hiç oluşmayabiliyordu. Rehberli tekrarda henüz olmayan becerinin ilk testi kart oluşturuyor; var olan becerinin aynı oturumdaki tekrarları FSRS aralığını büyütmüyor. Serbest pratik takvimi değiştirmiyor.
- Yakın zamanda öğrenilen kelimenin cevabı gerçek sınamadan önce varsayılan hatırlatma kartıyla gösteriliyordu. Kart yalnız tanıtımı yarım kalmış, henüz hiçbir becerisi sınanmamış kelimelerde gösteriliyor.
- Kapatılan soru türleri pekiştirmelerde ve ilk soruda atlanabiliyordu. Soru gösterilmeden önce tercihler uygulanıyor.
- Dinamik soru eklemek ilerleme yüzdesini geriye götürebiliyordu. İlerleme, soruları biten kelimeler üzerinden hesaplanıyor; grup ve öğrenme adımı ayrıca gösteriliyor. Isınma gibi kullanıcının eklediği yeni kelimeler hedefi genişletebilir.

## Karşılaştırma kaynakları ve sınırlar

Ürün hesaplarında canlı oturum denenmedi; karşılaştırma resmî kamu belgeleri üzerinden yapıldı. Kapalı algoritmaların birebir kopyası iddia edilmiyor.

- [Anki: Deck Options](https://docs.ankiweb.net/deck-options.html): öğrenme adımları, başarısızlıkta yeniden öğrenme, yeni/öğrenme/tekrar sıralaması, FSRS ile kısa öğrenme adımları. Aynı gün aşırı tekrar yerine sınırlı pekiştirme ve sonraki günlerin tekrarları ayrılıyor. Buradaki aralar dakika sayacı değil, araya giren sorularla uygulanıyor.
- [Quizlet: Studying with Learn](https://help.quizlet.com/hc/en-us/articles/360030986971-Studying-with-Learn): hedef ve tanışıklığa göre çalışma yolu, soru türü ve cevap yönü tercihleri, yanlış yazılan cevapları tekrar yazma seçeneği.
- [Memrise Community Courses: Learn New Words](https://memrise.zendesk.com/hc/en-us/articles/360016181397-How-can-I-Learn-New-Words-on-the-website): anlam seçme, dokunma, yazma ve dinleme testleriyle aşamalı çalışma. Community Courses belgesi güncel ana Memrise uygulamasının tüm davranışları olarak yorumlanmadı.

Bu üç kaynaktan alınan ilkeler, Diloloji'nin mevcut FSRS ve beceri kayıtlarıyla birleştirildi. Mevcut kullanıcı verileri sıfırlanmıyor; çevrimdışı çalışma ve serbest pratik ayrımı korunuyor.

## Ek düzeltmeler ve doğrulama

- Kelimeyi doğru hatırlayıp yalnız artikelini atlamak (`la maison` → `maison`) yanlış sözcük ailesi olarak değerlendirilmez; `near/article` geri bildirimi alır.
- Kısa tekrar yeni kelimeleri tanıtımsız sormaz. Süre/soru sınırı bir tanıtımı ilk testinden ayırmaz; bu noktada sınır yumuşak uygulanır.
- Bir cevaptan sonra becerinin tüm soru türleri kapatılırsa yeniden deneme hata vererek oturumu durdurmaz; anlam tanıma sorusuna döner.
- Öğrenme/motor/oturum test grubu: 180 dosyada 1.206 test geçti. Son eklenen regresyonlar ayrıca doğrulandı; gerçek ekranda tanıtım → iki anlam sorusu → yazılı hatırlama ve recall kartının kaydı sınandı.
- Genel test paketi: 3.007 başarılı, 2 atlanan; tek hata bütün oyunları soğuk yükleyen smoke testinin varsayılan 5 saniyelik sınırıydı. Ayrı 30 saniyelik çalıştırma geçti; yalnız bu çoklu tembel yükleme testinin süre sınırı 30 saniyeye çıkarıldı.
- Chromium: ertesi gün cevabı göstermeden tekrar ve yeni kelime görevinin tanıtımla başlaması, 2/2 başarılı. Sistem Chromium'u kullanıldı. WebKit/fiziksel cihaz doğrulaması bu değişiklik için yapılmadı.
- Typecheck ve değişen dosyaların lint kontrolü geçti. Hesapsız test derlemesi başarılı. Üretim derlemesi ortamda Supabase giriş ayarları bulunmadığı için engellendi; canlıya dağıtım yapılmadı.

## Güncel main ile yayın hazırlığı — PR #730

- Değişiklikler `84da1a70` ana dalı üzerine taşındı; ölçüm sorularının `probe` işaretleri ve güncel soru türü/bağlam kuralları korundu.
- Motor/oturum testleri: 182 dosyada 1.250 başarılı.
- Genel paket: 594 dosyada 3.280 başarılı, 9 zamanlama/süre hatası, 1 atlanan test. Başarısız testlerin bulunduğu 7 dosya, tek işçi ve 30 saniyelik sınırla tekrar çalıştırıldı: 60/60 geçti. Aynı dosyalar değişikliksiz ana dalda da 60/60 geçti. Toplu çalıştırmanın tek seferde tamamen yeşil olduğu iddia edilmiyor.
- Tip kontrolü (istemci/API/betik/Worker ve eklenti), lint, gizli anahtar taraması ve bağımlılık denetimi geçti; 0 güvenlik açığı.
- Chromium: ertesi gün cevabı önceden göstermeden tekrar, yeni kelime görevi ve oturum ayarları, 3/3 başarılı.
- Üç dil × açık/koyu tema × telefon/masaüstü: 12 görsel senaryo Linux'ta güncellendi ve ikinci çalıştırmada 12/12 doğrulandı. Sistem Chromium'u kullanıldı; WebKit bu ortamda çalıştırılmadı.
- Kullanıcı Actions kotasının dolduğunu bildirdi ve Actions kontrollerini atlamayı açıkça istedi. Yeni Actions işi başlatılmıyor; yayın mevcut Cloudflare Workers Builds bağlantısından yapılacak. Yerel Supabase/Cloudflare gizlisi eklenmedi, misafir derlemesi üretime yüklenmedi.
