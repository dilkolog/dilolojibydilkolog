# Monki paneli — tasarım devri / 01

10 Kasım 2026. Kullanıcı tasarım sorumluluğunu bu çalışmaya, uygulamaya bağlamayı Claude’a ayırdı. Bu klasör çalışan üretim uygulamasını değiştirmeyen, bağımsız bir HTML/CSS/JS prototipidir. Önce AGENTS.md ve DESIGN.md okunmalı.

## İnceleme temeli

Yerel checkout main’den eski. Bu nedenle güncel bilinen main `bcf19328` içindeki Monki.tsx ve CSS ayrıca okundu. Main’de Hatırladıkları/Temizle zaten Brain/Trash ikonlarına dönüşmüş ve ilk öneri tek seçeneğe indirilmiş. Tasarım önerisi bu iyileştirmeleri yok saymıyor; eski taşan yazılı başlığın düzeltilmesini yeni kazanım gibi sunmuyor.

`mevcut-main.html` ana başlık iskeletini ve main CSS’ini aynı örnek metinle statik yeniden kurar; emblemler ve tüm runtime davranışları dahil değildir. `mevcut-main.png` canlı dağıtımdan alınmış ölçüm veya screenshot değildir. `baseline-*.css` yalnızca bu referans görünümünü yeniden üretmek için kopyalanmış CSS’tir; üretime taşınmamalı.

## Önerilen değişiklikler

- Başlık: 42 px avatar, kısa alt satır, 44 px menü ve kapat düğmeleri. Hatırladıkları/temizleme/kullanım tek menüde; hatırlama kontrolü gizlenmez, bir ek dokunuşla erişilir.
- Çalışma türü: seçili tür görünür bir kontrol; diğer türler açılan listede. Sohbet, Sınav, Rol yap, Hatalarım korunur. Telaffuz ve Günün sohbeti varlık koşulları mevcut koddan alınmalı; prototipte yalnızca görünümü göstermek için açıklar.
- Konuşma: küçük metin etiketleri, Türkçe UI’da Lexend, hedef dilde Literata. Büyük kalıcı Monki çizimi konuşmayı aşağı itmez; büyük poz yalnızca boş/kurulum durumunda.
- Öneriler: ilk durumda tek öneri (main’de zaten var); cevap sonrasında en fazla iki öneri görünür. Bunlar gerçek YZ önerilerine bağlanır; ilk mesaja demo önerilerini sabitleme.
- Yazma: alt alan sabit, konuşma ayrı kayar. Gönder düğmesi boşken devre dışı. Enter gönderir; Shift+Enter satır açar; IME kompozisyonunda gönderilmez.
- Kullanım: küçük özet görünür, ayrıntısı menüden erişilir. Maliyet/daily limit/bütçe kodları aynen korunur.
- Hata: kısa açıklama ve tekrar deneme. Kullanıcının taslağı kaybolmamalı. Teknik/ağ hatasında üzgün Monki çizimiyle kullanıcı suçlu hissettirilmez.
- Mobil öneri tam boy katmandır; bu, alt gezinmeyi örtme davranışı için ayrıca uygulama kararı gerektirir. Tam ekran modal uygulanırsa aria-modal, arka plan inert, odak tuzağı ve kapatınca odak iadesi birlikte ele alınmalı. Mevcut masaüstü nonmodal davranışını yanlışlıkla modala çevirme.

## Korunması gereken mevcut işlevler

`monkiTurn`, istemci anahtarı/onay durumu, Türkçe hata mesajları, dil başına sohbet saklama, MAX_KEPT/recent sınırları, yazma/sınav/kelime odaklı dış bağlamlar (words/write/exam), onSynced/MonkiBus açılışları, kelime hedefleri ve günlük konuşma ilerlemesi, düzeltmeyi cümle olarak kaydetme, sesli okuma açık/kapalı, telaffuz modu, mikrofonun bitirip gönderme davranışı, günlük limit ve maliyet sayımı, hatırlama açık/kapalı ve not silme korunmalı. Bu prototip bu mantıkları tekrar uygulamaz; backend bağlantısı için yeni kaynak değildir.

## Teknik aktarım

CSS değerleri mevcut renk ailelerinden, radius ve fontlardan alındı. Üretimde bu prototipin ayrı sarmalayıcılarını kopyalamak yerine `.monki-*`, mevcut Popover/MenuItem, Dialog, Icon ve token desenlerine taşı. Prototipte sade üç nokta kullanıldı; ikon aday paketindeki MoreOptionsIcon düşünülebilir. İkon seti veya yeni kütüphane ekleme.

Prototipteki iOS benzeri alt çubuk yalnızca görsel ölçü örneğidir; üretime sahte sistem kontrolü ekleme. PWA’da env(safe-area-inset-bottom), sanal klavye/visualViewport ve gerçek cihazda yazma alanı kontrolü yapılmalı. Masaüstü ekranı burada 420×650 panel boyutu önerisini gösterir; bu boyut yeni zorunlu kırılım değildir.

## Doğrulama

Playwright ile 12 durum 375×812 / 420×650 boyutlarında kaydedildi; menü, tür seçimi, sahne, tek not silme, örnek mesaj yazma, kayıt görünümü ve kapat/aç akışları kontrol edildi. Açık/koyu/sakin görünümler ve yatay taşma kontrolü geçti. Bu testler üretim Monki API’si, mikrofon, gerçek mobil klavye, anahtar veya hesap sistemini sınamaz. Demo mesajları sunucuya gitmez; notlar yalnızca prototip belleğinde değişir. Tam uygulama E2E’si entegrasyon sonrası yapılmalı.

Ek kontrol: galerilerde tüm resimler 375/1280 px’te yüklendi; yatay taşma yok. 320×568 ve 430×932 panel görünümü, diyalog erişilebilir adı ve Escape sonrası odağın tür seçiciye dönmesi de doğrulandı.
