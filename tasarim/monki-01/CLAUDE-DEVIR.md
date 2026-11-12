# Claude için tasarım devri — Monki / 01

Önce kökteki AGENTS.md ve DESIGN.md dosyalarını oku. Bu klasör tasarım önerisi içerir; yeni ürün davranışı otomatik olarak varsayılmamalıdır. Dosya yolları entegrasyon adaylarıdır, kesin bağlama talimatı değildir.

## Kullanım eşleştirmesi

| Görsel | Kullanım anı | Önerilen metin | Yükseklik |
|---|---|---|---|
| `01-aciklayan-monki` | Dil bilgisi açıklaması veya ilk kullanım rehberi | Birlikte bakalım. | 160–220 px |
| `02-dinleyen-monki` | Konuşma turundan önceki hazır durumu | Seni dinlemeye hazırım. | 120–160 px |
| `03-birlikte-tekrar` | Zor gün desteği veya tekrar daveti | İstersen küçük bir adımla yeniden deneyelim. | 120–160 px |
| `04-tekrar-hos-geldin` | Uzun aradan sonra ilk çalışma daveti | Kaldığımız yerden, kendi hızında. | 180–240 px |
| `05-kelime-bahcesi` | Bahçe tanıtımı veya haftalık gelişim anlatısı | Küçük tekrarlar, büyüyen bir bahçe. | 180–240 px |
| `06-ilk-iletisim` | Tamamlanmış ilk konuşma görevi özeti | Bir konuşmayı tamamladın. | 140–180 px |

## Uygulama yaklaşımı

- Seçilen WebP dosyalarını `src/assets/art/` altına İngilizce işlev adlarıyla taşı; PNG kaynaklarını tasarım klasöründe koru. Öneriler: `monki-explain`, `monki-listen`, `monki-retry`, `monki-welcome-back`, `monki-garden`, `monki-first-conversation`.
- Yeni pozlar için `src/ui/monki/MonkiMascot.tsx` mevcut desenini değerlendir. Tüm çizimleri açılış paketine statik eklemek yerine yalnızca ilgili ekranın yüklemesine kat.
- `object-fit: contain` kullan; kafa, yaprak veya kuyruğu kesme. Sabit kutu için gerçek en-boy oranını manifestten al; görsel yüklenirken yer kaymasını önle.
- Ana içerik ve birincil eylem önce gelsin. Telefonda bu illüstrasyonları her sorunun üstüne büyük yerleştirme. Özellikle 04/05 sahnelerini dar kartlarda 120 px altına indirme; gerekirse metinle yetin.
- Görsel yanındaki metni tekrar ediyorsa `alt=""`; tek başına bilgi taşıyorsa bağlama uygun Türkçe alternatif metin. Dekoratif resim kendi başına tıklanabilir kontrol olmasın.
- PNG/WebP içindeki mavi ayrıntılar sabittir. CSS hue-rotate ile dili değiştirme: ten ve yaprak renkleri bozulur. Dil vurgusunu kart ve düğmeler taşısın.
- DESIGN.md çizim kenarı kuralına göre ilgili img sınıfını `--art-edge` kapsamına al. Mevcut img sınıfı zaten kapsanıyorsa tekrar gölge ekleme.
- Pozlar statiktir. Sürekli sallanma, sıçrama veya poz döngüsü ekleme. Gereken tek seferlik giriş hareketi `prefers-reduced-motion` ile kapatılmalı.

## Anlam sınırları

- Dinleyen Monki, mikrofon gerçekten açık değilken 'dinliyorum' durumu gibi sunulmasın. Metin 'hazırım' demeli; kayıt durumu ayrıca açıkça gösterilmeli.
- Tekrar pozu yanlış cevapta kullanıcıyı yargılamayan, isteğe bağlı destek içindir. Her yanlışta otomatik panel açma.
- Geri dönüş pozu bir ara sonrası karşılamadır; kaçırılan gün veya kaybedilen seri üzerinden suçluluk üretme.
- Bahçe çizimi anlatı illüstrasyonudur; mevcut Plant büyüme verisi veya aşamalarının yerine geçmez.
- İlk iletişim görseli yalnızca ilgili görev tamamlandıysa gösterilmeli; seviye sertifikası, telaffuz doğruluğu veya gerçek dil yeterliliği kanıtı sayılmamalı.

## Önceki tasarım incelemesinden arayüz işleri

1. Monki mobil başlığında Hatırladıkları / Temizle eylemlerini taşma menüsüne almayı değerlendir; başlıkta avatar, ad ve kapat kalsın. 375 px genişlikte açıklamayla eylemler çakışıyordu.
2. Çalışma ekranının altındaki yüzen Monki düğmesi, yardımcı eylemlere yer bırakmalı. Klavye ve geri bildirim çekmecesi açıkken de kontrol et.
3. Küçük işlevsel simgelerde mevcut çizgi ikon setini kullan; ayrıntılı illüstrasyonları 20 px düğme ikonuna dönüştürme.

## Görsel doğrulama

Galeride beyaz, koyu, Fransızca ve İspanyolca zeminleri, ayrıca 128 px görünümünü kontrol et. PNG ve WebP alfa kanalları teknik olarak doğrulandı. Küçük boyutta ten çizgisi ve gölgelendirme referanslardan biraz daha yumuşak; bu paket yeni stil standardı değil, mevcut aileye ek önerisidir. Entegrasyonda 375 px açık/koyu/sakin tema ve ekran taşması kontrolü yapılmalı. Henüz uygulamaya eklenmediği için bu pakete ait uygulama E2E sonucu yoktur.
