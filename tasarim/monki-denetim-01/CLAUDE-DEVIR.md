# Monki görsel denetimi — Claude’a devir

10 Kasım 2026. İncelenen kaynak: origin/main `bcf19328`, `src/assets/art/` içindeki 366 dosya. Yerel checkout eski olduğu için main arşivi ayrı dizine açıldı; kullanıcının mevcut çalışma dosyaları değiştirilmedi. Bu sayı 366 ayrı Monki pozu demek değildir: ikon, madalya, kapak, zemin ve diğer karakterler de dahildir. Envanterde `monkiRelated` işareti görsel aileye göre elle yapılan sınıflamayı gösterir; resim içeriği tanıma sonucu değildir.

## Yapılan inceleme

Tüm 366 dosya 7 toplu panoda tarandı. Sorunlu adaylar tekil kaynak boyutunda ayrıca incelendi. Üç animasyonun 4’er karesi de ayrı panoda incelendi. Statik import referansları main’de `.webp` geçen satırlardan toplandı; referans bulunmaması dosyanın kullanılmadığını kanıtlamaz. Canlı sunucudaki dağıtım sürümü ayrıca doğrulanmadı.

## Sonuç

- 3B bahçe görselleri ana 2B karaktere döndürüldü.
- Sarılaşmış altı Monki sahnesi kahverengi ana aileyle yeniden çizildi.
- A1–C2 altılısı tek aile olarak yenilendi. A1/B1 tekil olarak bozuk değildi; aile tutarlılığı için seçildi.
- Üç hava durumu sahnesinin kalabalık boyama arka planları kaldırıldı; küçük gösterimde ana siluet öne alındı.
- Gerçekçi siyah şempanze görünümündeki el sallama animasyonu için yeni **statik ana kare** üretildi. Animasyon teslim edilmedi.

## Üretim ve entegrasyon sınırı

Yeni PNG kaynakları `docs/gelen-gorseller/yeniden-tasarim-01/` içinde. Bu yeni alt klasör çalışma alanında izlenmeyen dosyalar olarak duruyor; ZIP kaynakları da içerir. Çalışma yereldir, commit/push/deploy yapılmadı. `src/assets/art/` dosyaları otomatik değiştirilmedi.

Ham resimler Image Gen çıktısıdır. Alfa maskesi, çok hafif zemin tonu, ortak boşluk/kırpma payı ve WebP son boyutları entegrasyon aşamasında kontrol edilmeli. Kaynakları esnetme; yeni resimlerin en-boy oranları eski dosyadan farklı olabilir. Boyutlar `yeniden-tasarimlar.json` içindedir. Başlıktaki 32–48 px kullanım için hava durumu adaylarını ayrıca gerçek ölçekte karşılaştır; büyük bir illüstrasyonun tüm ayrıntılarının küçükte seçilmesi beklenmemeli.

CEFR taç, diploma ve defne aksesuarları mevcut metaforun devamıdır; sertifikalı dil yeterliliği iddiası değildir. Etiketler UI’da seçilebilir metin olarak kalmalı. Yeni resimlerde harf veya seviye etiketi yok.

`monki-animated-wave.webp` mevcut 4 kareli animasyondur. Yeni PNG yalnızca bir ana pozdur: dosyanın üstüne koyma. Sonraki animasyon işi: aynı yüz/gövdeyi sabitleyerek 4 tutarlı kare; el hareketi küçük, ayak/kuyruk sabit, 192 px hedef, reduced-motion için statik kare. Diğer iki animasyonun yaprak yakalığı ve değişen kare oranları daha sonra aynı animasyon işi içinde düzenlenebilir. Bu teslim onların hareketini düzeltmiş sayılmaz.

## Korunan çizimler

Ana altı Monki pozu, yüz ifadeleri, seviye kıyafetleri, sonuç çizimleri, rol sahneleri ve çoğu sticker mevcut karakteri yeterince iyi koruyor; sırf yeni üretim olsun diye değiştirilmedi. Ağlama/facepalm sticker’ları çizim kalitesi nedeniyle değil, yanlış cevapta kullanılırsa yargılayıcı olabilecekleri için kullanım notu aldı. Daha ayrıntılı rozet/ikon aileleri ayrı tasarım ailesidir; bu tur yeniden çizilmedi. Yeni dosyalar dahi referansla son görsel kontrolden geçmeli; bu bir kullanıcı testi veya bütün ekranların görsel regresyon testi değildir.

## Dosya eşleştirmesi

| Mevcut dosya | Yeni kaynak | Neden |
|---|---|---|
| `src/assets/art/empty-garden.webp` | `empty-garden.png` | 3B oyuncak görünümü, önlük ve gerçekçi ışık ana çizim ailesinden ayrılıyor. |
| `src/assets/art/milestone-sprout.webp` | `milestone-sprout.png` | 3B karakter ve parlayan parçacıklar; ana Monki konturuyla uyuşmuyor. |
| `src/assets/art/monki-scanner.webp` | `monki-scanner.png` | Sarı gövde, başta çift filiz ve küçük harf kümeleri karakteri değiştiriyor. |
| `src/assets/art/onb-welcome.webp` | `onb-welcome.png` | Sarı gövde, farklı yüz oranları ve harfli kitap mevcut karakter ailesinden uzak. |
| `src/assets/art/scene-journal.webp` | `scene-journal.png` | Altın sarı karakter ve çok küçük sayfa detayları. |
| `src/assets/art/scene-library.webp` | `scene-library.png` | Sarı karakter, farklı gövde oranı ve ayrıntılı raf kompozisyonu. |
| `src/assets/art/scene-search-empty.webp` | `scene-search-empty.png` | Sarı karakter, büyüteçte iri göz ve yoğun küçük simgeler. |
| `src/assets/art/scene-sentences.webp` | `scene-sentences.png` | Sarı gövde ve kartların üstündeki yazılar küçük ölçekte tutarsız. |
| `src/assets/art/cefr-monki-a1.webp` | `cefr-monki-a1.png` | Tek başına kullanılabilir; altılı CEFR ailesinde ortak oranları kurmak için yeniden çizildi. |
| `src/assets/art/cefr-monki-a2.webp` | `cefr-monki-a2.png` | Başta çift filiz, açık kahve gövde ve beyaz çıkartma kenarı. |
| `src/assets/art/cefr-monki-b1.webp` | `cefr-monki-b1.png` | Tek başına kullanılabilir; diğer seviyelerle oran ve kontur eşleşmesi için yenilendi. |
| `src/assets/art/cefr-monki-b2.webp` | `cefr-monki-b2.png` | Farklı yüz/gövde oranı, başta çift filiz ve zemin gölgesi. |
| `src/assets/art/cefr-monki-c1.webp` | `cefr-monki-c1.png` | Kitap sırtlarında yazı ve farklı aksesuar ağırlığı; aileyi sadeleştirme adayı. |
| `src/assets/art/cefr-monki-c2.webp` | `cefr-monki-c2.png` | Tüylü uzuvlar ve çift filiz; daha gerçekçi karakter oranları. |
| `src/assets/art/weather-rain.webp` | `weather-rain.png` | Detaylı manzara, çerçeve ve resim dokusu küçük başlıkta Monki’yi geri plana atıyor. |
| `src/assets/art/weather-snow.webp` | `weather-snow.png` | Dokulu kar/orman arka planı ve çok küçük ayrıntılar. |
| `src/assets/art/weather-thunder.webp` | `weather-thunder.png` | Boyama tarzı gece manzarası, ışık ve kalabalık çerçeve ana karakter dilinden farklı. |
| `src/assets/art/monki-animated-wave.webp` | `monki-animated-wave.png` | Gerçekçi siyah tüylü şempanze, uzun uzuvlar ve yaprak yakalık farklı bir karakter gibi. |
