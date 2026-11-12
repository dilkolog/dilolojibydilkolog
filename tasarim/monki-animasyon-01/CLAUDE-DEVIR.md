# Monki — el sallama animasyon denemesi / 01

10 Kasım 2026. Kullanıcının isteği: bir animasyon denemesi. Önceki yenileme paketindeki `monki-animated-wave.png` referans alındı. Image Gen ile gövde ve kol ayrı görsel katmanlar olarak üretildi; hareket Canvas üzerinde kodlandı. Bu bir video üretim modeli çıktısı veya kare kare yeni karakter çizimi değildir.

## İzleme

`index.html` oynat/duraklat, baştan oynat ve sabit poz kontrolleri sunar. `monki-wave.gif` hızlı önizleme, `monki-wave.webp` hareketli resim, `monki-wave.mp4` video çıktısıdır. İndirilebilir dosyalar beyaz zeminli 512×512; ham katmanlar şeffaf PNG’dir. Çalışma uygulamaya bağlanmadı.

## Hareket

4,8 saniyelik döngüde ilk 1,5 saniye iki hafif el sallama, ardından yaklaşık 3,3 saniye bekleme. Yalnızca sol taraftaki kol omuz pivotu çevresinde döner. Yüz, gövde, ayaklar ve kuyruk sabittir. Katmanların orijinal PNG’leri `assets/`, koordinat ve açı anahtarları `rig.json`, çalışır hareket kodu `animation.js` içindedir. Alt gövde ikinci kez ön katman olarak çizilerek omuz birleşimi gizlenir. Gelecekte vektör eklemli rig yapılırsa bu raster kapatma yaklaşımı yerine gerçek omuz katmanları tercih edilebilir.

## Uygulamaya aktarmadan önce

- Bu bir hareket dili denemesidir. Mevcut dört kareli WebP’nin üstüne otomatik yazılmadı. Yüz/gövde oranını ve omuz dikişini hedef 192 px ölçekte son kez kontrol et.
- Prototip `prefers-reduced-motion` tercihinde otomatik oynamaz ve sekme gizlenince durur. GIF/WebP dosyaları kendi başına bu tercihi bilemez; uygulamada medya sorgusuyla sabit poz seçilmeli. Sayfada sonsuz döngü yerine ilk açılışta bir kez oynatma değerlendirilebilir.
- Ham PNG katmanları ilk deneme için yeterli; çok düşük alfa seviyesindeki kenar pikselleri nedeniyle koyu tema için son alfa/kenar kontrolü gerekir. İndirilebilir bu deneme çıktıları beyaz zeminlidir, şeffaf çıkartma olarak sunulmamalı.
- Yeni bir animasyon kütüphanesi gerekmez. Aynı hareket CSS/Canvas veya uygun bir sprite çıktısına taşınabilir. Boyutları esnetme.

## Kontrol

120 kare 25 fps’te deterministik render edildi. GIF ve WebP açılıp 512×512 ve toplam 4800 ms oldukları doğrulandı; kodlayıcılar bekleme kısmındaki aynı kareleri birleştirebilir. İki hareket pozunda yüzün orta bölgesi, ayaklar ve göbek piksellerinin sabit kaldığı kontrol edildi. Oynat/duraklat, sabit poz, 375 px görünüm ve hareket azaltmada otomatik oynamama tarayıcıda doğrulandı. Üretim uygulaması veya gerçek cihaz performansı sınanmadı.
