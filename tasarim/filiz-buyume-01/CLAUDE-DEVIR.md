# Filiz büyümesi — animasyon tasarım denemesi / 01

10 Kasım 2026. Kullanıcı, sekiz Monki animasyonu listesinden sonra filiz büyümesini öne aldı ve Memrise’daki öğrenmeyle büyüme fikrini referans verdi. Bu paket o önceliğe odaklanır; diğer yedi Monki animasyonu burada tamamlanmış sayılmaz.

## Tasarım

Mevcut Diloloji terracotta saksıları ve kalın kahverengi konturlar referans alındı. Image Gen ile `assets/cizim-yonu.png` üretildi; hareket için aynı yönde ayrıca katmanlı SVG çizildi. Renk/biçim yön görseli ile SVG birebir otomatik vektörleştirme değildir. Memrise görsel varlıkları kullanılmadı.

Büyüme resimlerin yalnızca çapraz solmasıyla yapılmaz: gövde gerçek SVG yolu boyunca uzar, yapraklar kendi köklerinden dönerek açılır, tomurcuk ortaya çıkar ve altı taç yaprak sırayla açılır. Saksı ve toprağın ana çizimi sabittir. Görsel açılışta bir kez oynar; döngü ayrıca seçilebilir. Bütün yolculuk 9,6 saniyelik hızlandırılmış bir gösterimdir.

## Mevcut öğrenme sistemi korunmalı

`src/engine/growth.ts` zaten FSRS/beceri başına kalıcı hatırlama üzerinden büyüme ve sağlık hesaplıyor; `src/ui/Plant.tsx` zaten -1 ve 0–5 aşamalarını çizip büyüme/sulama animasyonları veriyor. Bu prototip o mantığın yerine geçmez, görsel alternatif araştırmasıdır.

Eşleme: -1 tohum; 0 introduced / Yeni tanıştı; 1 familiar / Tanıdık; 2 recallable / Hatırlanıyor; 3 strong / Sağlam; 4 production_ready / Kullanılabiliyor; 5 mastered / Oturdu. Bir doğru cevap veya bir düğme basışı otomatik olarak aşama sayılmaz. Sağlık ve büyüme ayrı kalmalı. `Sula` yalnızca damlaları gösterir ve aşamayı değiştirmez; gerçek sağlık iyileşmesi mevcut modelden gelmeli. Uzun dönem ilerleme aşamasını sırf kullanıcı ara verdi diye sıfırlama.

## Dosyalar

- `index.html`: oynat/duraklat, sonraki aşama, doğrudan aşama seçimi, sulama, dil rengi ve döngü kontrolü.
- `growth.js`: deterministik hareket ve aşama interpolasyonu; `window.plantAnimation.drawAt(seconds)` dışa aktarım için.
- `plant-source.svg`: hareketli öğe kimliklerini koruyan olgun bitki SVG’si.
- `stage-0.svg`–`stage-6.svg`: yedi sabit durum; numaralar örnek galerisinin sırasıdır, motor stage değeri değildir.
- `stage-0.png`–`stage-6.png`: beyaz zeminli 512×512 sabit önizlemeler.
- GIF, hareketli WebP ve MP4: beyaz zeminli 512×512 önizleme çıktıları.
- `asamalar.jpg`: yedi durumu tek karede gösterir.

## Uygulamaya aktarma

Üretim uygulamasına bağlanmadı. `Plant` bileşenine kontrollü bir görsel alternatif olarak taşınabilir; öğrenme motoru değişmemeli. Sayfada yüzlerce bitki varsa hepsini sürekli oynatma. Gerçek aşama artışında yalnızca ilgili kısa geçiş oynatılmalı; tüm yaşam yolculuğu her cevapta tekrar başlamamalı. Görseldeki sulama, tomurcuk ve çiçek rengi ayrı kontrol edilebilir.

`prefers-reduced-motion` durumunda aynı aşamalar sabit pozlarla değişir. GIF/WebP dosyaları bu tercihi kendileri algılayamaz; uygulama sabit SVG seçmeli. Tarayıcı prototipi sayfa gizlenince durur. Dil seçimi yalnızca örnek kelimeyi ve vurgu/çiçek paletini değiştirir. Saksı ve yeşil yapraklar dilden bağımsızdır.

Büyük illüstrasyon ayrıntılarını 24 px ikonuna aynen sıkıştırma. Mevcut Plant’in küçük ölçekteki sadeleştirme yaklaşımı korunmalı. Verilen SVG’ler şeffaf zeminlidir; video/GIF önizlemeler beyaz zeminde render edilmiştir.

## Doğrulama

240 kare 25 fps’te render edildi. Yedi statik poz oluşturuldu. İki farklı büyüme karesinde saksının alt gövdesi piksel olarak aynı kaldı; üst bitki değişti. Tarayıcıda aşama seçimi/ilerletme, son aşamada sınır, sulamanın ilerlemeyi değiştirmemesi, dil rengi, 375 px yatay taşma ve hareket azaltmada sabit son poz doğrulandı. Üretim öğrenme motorunun gerçek verileri veya canlı uygulama sınanmadı.
