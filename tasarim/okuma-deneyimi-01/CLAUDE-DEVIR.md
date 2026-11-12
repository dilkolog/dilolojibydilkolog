# Claude için okuma tasarımı devri

Tasarım planının 03 alanı için 17 önizleme durumu hazır. index.html ve galeri.html ile başla. Bu bağımsız HTML prototipidir; üretim kodu değiştirilmedi. P0 canlı ekran karşılaştırması hâlâ tamamlanmalıdır; tasarımın hazır olması entegrasyonun bittiği anlamına gelmez.

## Hedef dosyalar

- `src/ui/reading/Reading.tsx`: selected/adding/dictation/listenFirst/shadowing ve reader layout sözleşmeleri. Mevcut useSheetSwipe, useWordSheetLayout ve okuma konumunu koru.
- `src/ui/reading/ReaderTools.tsx`: görünürlüğü koşullu Türkçesi/dikte/gölgeleme/çıkarım/çekimler/bitir/çoklu/birlikte oku. Yeni hiyerarşiyi bu eylemleri silmeden uygula.
- `src/ui/words/WordCard.tsx`: hedef anlam düzeni; lookup, bilinen/bilinmeyen, ekleme, yok sayma, skip, ses, fiil çözümü/lab/ders, cümle kaydı ve Monki yardımcıları korunmalı. Prototip mini sözlüğünü üretim sözlüğünün yerine koyma.
- `src/ui/reading/ReaderAside.tsx`: toplu işaretleme ve AddingCard; kaynak cümle ve metin başlığı/first encounter bilgisi kaybolmamalı.
- `src/ui/reading/ReadingHome.tsx`: var olan kütüphane, kitap/bölüm, haber, ekleme ve kaynak seçicilerinin davranışlarını koru. Prototipteki tek hikâyeyi gerçek kütüphane modeli gibi kopyalama.
- `src/ui/reading/Listening.tsx`: native audio, zaman takip/altyazı eşlemesi, hız, üç tur ve yerel kayıtlar. Buradaki speechSynthesis örneği üretimdeki native player'ın yerine geçmez.
- `src/ui/reading/readerSettings.ts`: mevcut ReaderPrefs alanları korunmalı. Prototipteki17–42px aralık stres testi içindir; gerçek 4 boyut adımını izinsiz değiştirmenin gerekçesi değildir.

## Tasarım kararları

Anlam paneli metin sütununu yeniden daraltmıyor. Masaüstünde yardımcı sütun yer değiştiriyor; mobilde nonmodal alt panel var. Kapat düğmesi, Escape ve aşağı sürükleme; kaynak sözcüğe odak dönüşü uygulanmalı. Hareketli panel klavye/ekran okuyucu deneyiminde ayrıca doğrulanmalı. İçerik önüne backdrop koyarak metin seçimini kilitleme.

Görünüm ve çalışma araçları ayrı menülerde. Tüm araçları aynı ağırlıkta ana satıra koyma. Mevcut callback/capability koşulları önemli: birlikte oku callback yoksa, ses desteği yoksa veya EN dilinde çekimler uygun değilse gösterim bu koşullara bağlı kalmalı. Prototip tüm bunları ES örneğinde tasarlar; dillerin tümünde aynı yetenek varmış gibi bağlama.

Kelimelerime ekle eylemi anlamın ardından ve bağlamdan önce. Biliyorum, bilmiyorum ve yok say ayrıdır. Çoklu seçimde gerçek token/lemma tekilliği ve mevcut onMark sözleşmesi korunmalı. Prototip token IDlerini IndexedDB kayıt kimliği gibi kullanma.

## Üretime taşınmayacaklar

Durum seçicisi, örnek hikâye/mini sözlük durumları, sahte ortak oda görünümü, statik örnek çekim listesi, örnek hata/yükleme bitirme düğmeleri ve test sıfırlaması tasarım araçlarıdır. Gerçek uygulamada mevcut analiz/veri/çeviri/sözlük motorları kullanılmalı. Kaydet düğmeleri yalnız prototip belleğine yazar; gerçek hesap durumunu kanıtlamaz. Dikte otomatik puan hesaplamaz; gerçek cevap motoruna bağla.

Prototipte Monki açıklasın, sözlükte aç ve cümleyi parçala eylemleri açıklama penceresi gösterir; gerçek servis/ekran geçişleri entegre edilmemiştir. Yeni AI isteği veya ücretli sağlayıcı ekleme. Gölgeleme yalnız durum yerleşimi; gerçek kayıt/karşılaştırma için mevcut Shadow akışı ve konusma-dinleme-01 devri esas alınır.

İsteğe bağlı seviye etiketi uydurulmadı. Hikâye özgün örnektir; CEFR sertifikalı içerik değildir. Kullanıcının eklediği metne otomatik anlam/çeviri uydurulmaz. İçerik düz metin olarak güvenli render edilmeli.

## Dosya kökeni ve önceki paketler

17 sözcüklük mini sözlük, 5 paragraf 10 cümle ve 138 sözcüklük hikâye bu çalışma için yazıldı. Gerçek veri sayıları panelde hesaplanır. Yeni raster çizim yok; ogrenme-deneyimi-01 ikonları ve yerel font/lisansları kullanıldı. Önceki kart tasarımı hiyerarşi referansıdır, mevcut WordCard işlevlerini azaltma yetkisi değildir. Koyu/sepya ve kelime durumu renkleri üretim tokenlarına bağlanmalı; bu prototipteki sabit örnek değerleri üretim CSS'ine dağınık kopyalama.

## Kabul ve sınırlar

DOGRULAMA.json yalnız yerel prototip testlerini kaydeder. 17 durumun 375px taşma kontrolü, 42px yazı, klavye/odak, çeviri/metin gizleme, toplu seçim, çıkarım ve metin ekleme yapıldı. Canlı ekran, fiziksel cihaz, ekran okuyucu ve gerçek ses/veri/çeviri servisleri test edilmedi.

Entegrasyonda uzun kelime ve anlam, gerçek sanal klavye, panel scroll ve swipe, metne dönüş, zaman eşlemeli dinleme, yedek/senkronizasyonla sözcük ekleme ayrıca doğrulanmalı. Okuma kaydı, öğrenme geçmişi, FSRS ve XP bu tasarım nedeniyle değişmemeli.
