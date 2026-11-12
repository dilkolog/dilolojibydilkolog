# Claude devri · İlk kullanım

Planın 01 alanı için 3 başlangıç adımı ve 9 örnek görünüm hazır. Önce index.html, galeri.html, BILESEN-SOZLESMESI.md. Bu bağımsız HTML tasarımıdır; üretim kodu değiştirilmedi. Canlı P0 ekran karşılaştırması ve fiziksel cihaz doğrulaması hâlâ bekliyor.

## Kaynaklar

- `src/ui/home/Onboarding.tsx`: STEP_TITLES 3, dakika 5/10/15/20/30, yeni kelime 3/5/8/12; isteğe bağlı ad, başlık odağı ve telefon FINE_POINTER davranışı.
- `src/ui/home/startLanguage.ts`: landing dili startLanguage üzerinden devralınır, finish sırasında forgetStartLanguage temizler. Gerçek anahtar korunmalı; kullanıcıya yeniden dil seçtirmeyi zorunlu yapma.
- `src/data/db.ts`: DEFAULT_SETTINGS dailyMinutes 10, newWordsPerDay 5. Diğer tüm varsayılan alanları koru.
- `src/ui/guide/GuidePlacementNudge.tsx`: en az 5 kullanıcı kelimesi ve diğer uygunluk koşulları; ertelenme dil bazlı. İsteğe bağlı test onboarding zorunluluğu değildir.
- `src/ui/guide/PlacementView.tsx`: gerçek test/sonuç/başlangıç dersi/sertifika davranışları korunmalı.

## onDone ve ilk kelime

Mevcut onDone Settings sözleşmesini koru: DEFAULT_SETTINGS üzerine activeLanguage, dailyMinutes, newWordsPerDay ve profile'nin diğer alanlarını koruyarak trim edilmiş name. Bu prototip yalnız seçenekleri gösteriyor; yeni bir Settings şeması tanımlamıyor. finish işlemi dışında landing tercihini veya kullanıcının eski ayarlarını temizleme.

İlk kelime tasarımı onboarding sonrası geçiştir, dördüncü adım değildir. Gerçek kelime ekleme/sözlük/örnek verisi üretim akışından gelmeli. Buradaki basit kelime-anlam formu mevcut WordForm'un tüm sözleşmesinin yerine geçmez. Kayıt başarısızsa başarı görünümü gösterme; prototipte backend yoktur.

## Test davetini erken gösterme

Planın ilk notunda “ilk başarı sonrası” öneri vardı. Kaynak incelendiğinde gerçek eşik 5 kelime olarak netleşti; bu paket o kuralı korur. Beş kelimeye ulaşıldığında bile goal, dismissal, placement sonucu, rehberde okunmuş ders ve test içeriği koşulları kontrol edilmeli. İptal/Şimdi değil gerçek dil bazlı dismissal mekanizmasına bağlanmalı. Sırf tasarımda davet var diye yeni kullanıcıya zorunlu sınav ekleme.

## Görsel aktarım

Mevcut card/btn/chip ve tokenları kullan. Native radio kartları veya mevcut erişilebilir seçim bileşeni tercih edilmeli; role=radio ekleyip ok tuşu davranışını unutma. Telefon klavyesini kendiliğinden açma. Geri/ileri dil, süre, yeni kelime ve adı korumalı. Her üç dilde başlık ve son butonun taşmadığını doğrula.

Karşılama görselleri önceki filiz-buyume-01 stage0/3/6; bu bir metafor, veri güdümlü ustalık göstergesi değil. Kaynak onbWelcome/onbFlags/onbGoal veya LANG_MONKI varlıklarını dosya olarak silme; başka kullanımları olabilir. Yeni raster üretilmedi. Avatar olarak Monki sunma kararı bu alandaki genel maskotları topluca silme talimatı değildir.

## Üretime taşınmayacaklar

Durum seçicisi, örnek sayılar, test geçiş modalı, hedefe geri dön atölye yolu ve “önizlemeye ekle” metinleri test araçlarıdır. Gerçek hesapta bunlarla ilerleme/kelime/seviye yazılmasın. Bu demo gerçek localStorage anahtarlarını okumaz/yazmaz; gerçek starter/placement tercihleri uygulama yardımcılarına bağlanmalı. “Varsayılan 10/5” metin/verisi güncel DEFAULT_SETTINGS ile yeniden kontrol edilmeli.

## Doğrulama

DOGRULAMA.json yerel tarayıcı kontrolleridir: 9 durum 375px; 3 dilde adsız bitirme; geri/ileri; bağımsız hedefler; ilk kelime ve 5 kelime sonrası nudge; erteleme; dokunmatik bağlamda başlık odağı. Gerçek telefon sanal klavyesi, ekran okuyucu, onDone/DB, gerçek test ve sertifika çalıştırılmadı. Uygulama entegrasyonunda gerekli repo ve cihaz kontrolleri ayrıca tamamlanmalı.
