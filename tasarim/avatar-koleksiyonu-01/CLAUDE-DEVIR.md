# Claude için uygulama devri

## Teslim ve amaç
40 Monki dışı profil portresi hazır. 26 mevcut figür yeniden çizildi, 14 yeni figür eklendi. Ortak yakın yüz kadrajı, sıcak koyu kontur ve pastel dairesel zemin kullanıldı. Bu klasör tasarım ve çalışan bağımsız HTML prototipi içerir; uygulama kodu değiştirilmedi.

Önce `galeri.html`, ardından `index.html` ve `onizlemeler/` dosyalarını incele. Dosya eşleştirmesi `data.json`: `id`, `src`, `existing`, `oldSrc`, `category`, `requirement`, `sheet`, `cell`. Raster teslimler 384×384 PNG ve WebP; dış köşeler şeffaftır, portrelerin kendi pastel zeminleri vardır.

## Üretime aktarım
Mevcut `src/ui/profile/avatarArt.ts` envanteri ve Avatar bileşenlerini güncel main üzerinden incele. Bu çalışma eski bir checkout içinden hazırlanmıştır; üretime aktarırken güncel main esas alınmalıdır.

26 mevcut Monki dışı ID korunmalıdır. Yeni 14 ID: `red-panda`, `otter`, `capybara`, `hedgehog`, `raccoon`, `sloth`, `squirrel`, `elephant`, `parrot`, `whale`, `seal`, `axolotl`, `turtle`, `bee`.

Yeni seçim ekranında Monki ve varyantları sunulmasın. Ancak mevcut kullanıcıların kayıtlı Monki `profile.emoji` değerlerini silme veya sessizce başka karaktere dönüştürme. Eski kayıtların render desteğini kullanıcı yeni bir avatar seçene kadar koru. Monki'nin uygulama maskotu veya sohbet karakteri olarak kullanımı bu talepten etkilenmez.

Monki dışı eski özel figürlerin açılma koşullarını koru; `data.json` mevcut koşulların eşleştirmesini içerir. 14 yeni hayvanın başlangıçtan erişilebilir olması TASARIM ÖNERİSİDİR, mevcut bir ürün kuralı değildir. Prototipte 28 hayvan erişilebilir, 12 özel figür kilitlidir. Örnek istatistikler: mastered=6, longestStreak=3, bossesDefeated=0. Gerçek uygulamada mevcut kullanıcı istatistikleri kullanılmalı.

## Ekran davranışı
- Kilitli figürler renkli kalır. Tıklanınca önizlemede kazanma koşulu gösterilir; kullan butonu devre dışıdır.
- Kart seçimi önizleme açar; “Bu avatarı kullan” seçimi onaylar. Bu, mevcut anlık kayıt davranışından önerilen bir değişikliktir. Gerçek kaydın başarı/hata geri bildirimi uygulamada bağlanmalı.
- Arama Türkçe karakter toleranslıdır; kategori ve kullanılabilirlik filtresi birlikte çalışır.
- “Profil rengi” çerçeve ve profil kartını değiştirir. Portrelerin kendi renklerini değiştirme. Mevcut uygulamada rengin etkisi avatar türüne göre değiştiği için görünür önizleme önerildi.
- Fotoğraf girdisi yalnızca yerel önizlemedir. Üretimde mevcut yükleme, kırpma ve hata yönetimi kullanılmalı. Özel dosya boyutu/tür sınırları henüz prototipte uygulanmadı.
- Örnek profil Ali, seviye 7, 1295/1344 XP. Bunları sabit üretim verisi yapma.
- Erişilebilir buton adları, seçili durum, odak halkası, canlı geri bildirim ve reduced-motion desteği var. Klavye ve gerçek ekran okuyucu testi entegrasyonda tamamlanmalı.

## Kapsam ve doğrulama
Prototip üretim React bileşeni değildir. API, hesap kaydı, gerçek kilit açma, analiz olayları, yükleme servisi ve sunucu testi yapılmadı. `DOGRULAMA.json` sadece yerel tarayıcı kontrolleridir. 375px mobil görünüm, açık/koyu tema ve masaüstü görüntüleri eklendi.

Mevcut tam boy boss, sticker veya Monki varlıklarını genel olarak silme; bu portreleri avatar alanına bağla. Eski figürlerin oyun sahnelerinde kullanılması ayrı bir kapsamdır. Portreler 40–96px görünüm için tasarlandı; son küçük boyut görsel kontrolü uygulama içinde yapılmalı. Lexend font lisansı `assets/LEXEND-LICENSE` içinde.
