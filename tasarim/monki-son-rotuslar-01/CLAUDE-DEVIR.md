# Monki son rötuşlar / 01 — Claude’a devir

10 Kasım 2026. Kapsam: önceki incelemede kalan `monki-video-listen`, `monki-animated-wink`, `monki-animated-celebrate` ve yeni el sallama denemesinin omuz birleşimi.

## Yapılanlar

- Dinleyen Monki yeniden üretildi: kahverengi gövde, tek yaprak, sade kulaklık, kapalı gözler. Kaynak `docs/gelen-gorseller/son-rotuslar-01/monki-video-listen.png`.
- Göz kırpma ve kutlama, tek ortak gövde katmanıyla yeniden kuruldu. Yaprak yakalığı kaldırıldı; yüz/gövde kareler arasında değişmez.
- Gözler ayrı vektör katmanıdır. Göz kırpmada tek göz kapanıp açılır. Kutlamada iki göz gülümserken iki kol kısa süre yükselir; iki küçük altın parıltı belirir.
- El sallama ikinci sürümünde omuz kapağı gövdenin arkasına alındı. Kolların dinlenme pozu, önceki doğal sarkık kol kaynağından aynı gövdeyle eşleştirildi. Avuç için ayrı ön katman kullanıldı; düz yatay kesim maskesinin yerine katman sırası değiştirildi.

## Dosyalar ve öncelik

| Mevcut / önceki | Yeni kaynak | Not |
|---|---|---|
| `src/assets/art/monki-video-listen.webp` | `docs/gelen-gorseller/son-rotuslar-01/monki-video-listen.png` | Ham beyaz zeminli resim; alfa temizliği ve boyutlandırma gerekir |
| `src/assets/art/monki-animated-wink.webp` | `monki-wink.webp` | Yeni 4,8 sn hareket denemesi |
| `src/assets/art/monki-animated-celebrate.webp` | `monki-celebrate.webp` | Yeni 4,8 sn hareket denemesi; eski kupa aksesuarı yerine kısa iki-el kutlaması |
| `monki-animasyon-01/monki-wave.webp` | `monki-wave-v2.webp` | Önceki denemenin yerine değerlendirilecek sürüm; eski kaynak silinmedi |

Her hareketin GIF, WebP ve MP4 sürümü var. Bunlar 512×512 beyaz zeminli önizlemelerdir. Ham PNG katmanları `assets/`, gerçek çalışır hareket kodu `motion.js` içindedir. Gövde katmanında göz ve kol yoktur; bu eksik bir son ürün değil, rig parçasıdır. `rest-arm-source.png` dosyasından yalnızca dinlenme kol bölgesi hareket sırasında maskelenerek kullanılır.

## Üretime aktarım

Canlı site veya kaynak `src/` dosyaları bu çalışmayla değiştirilmedi. PNG/WebP adlarını otomatik olarak mevcut dosyanın üzerine yazma: hedef 192 px, hareket süresi, tek seferlik oynatma ve gerçek kullanım yeri kontrol edilmeli. Eski animasyonlar 4 kareydi; yeni deneme nominal 25 fps ve duraklamalı 4,8 sn döngüdür. Kodlayıcılar aynı bekleme karelerini birleştirebilir.

Koyu tema için alfa/kenar kontrolü ve gerekiyorsa şeffaf nihai çıktı ayrıca hazırlanmalı. `prefers-reduced-motion` tarayıcı prototipinde sabit poz seçer; indirilebilir GIF/WebP dosyaları tercihi kendi başlarına bilemez. Boyutları esnetme; mevcut çizim ailesindeki ana kahverengi/tek yaprak/kapalı çizgi kuralını koru.

## Doğrulama

Üç hareket için 120’şer kare deterministik render edildi. GIF/WebP süre ve boyutları açılıp kontrol edildi. Mobil 375 px yatay taşma, hareket seçimi ve reduced-motion durumu tarayıcıda doğrulandı. Göz kırpma karesinde yalnızca ilgili göz bölgesinin hareket ettiği, ağız ve ayakların sabit kaldığı karşılaştırıldı. Bu bir tasarım prototipidir; üretim ekranlarının E2E/performance kontrolü entegrasyonda yapılmalı.
