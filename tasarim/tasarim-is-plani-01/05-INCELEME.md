# 05 · Ayarlar ve profil bağlantısı

Öncelik: **P2**. Durum: kod incelemesi tamamlandı; canlı görsel doğrulama ve yeni tasarım uygulaması bekliyor.

## Mevcut olanlar

- 8 ana grup ve ayrı Yardım var: Hesap, Çalışma, Sorular, Ses, Görünüm, Bildirimler, Araçlar, Veriler.
- Arama tüm gruplarda satır bazlı çalışıyor; eşleşen kapalı açıklamalar açılıyor ve sonuç yok metni var.
- Gelişmiş ayarları açma ve seçili grup hatırlama mevcut. Grup sıfırlama geri al toastı kullanıyor.
- Ses bölümünde otomatik okuma, efektler, ses seviyesi, haptik, konuşma desteği, hız, dile özel ses seçimi bulunuyor.

## Tasarım işi

- Yeni grup sistemi icat etmeden satır açıklaması, aktif değer ve gelişmiş seçenek hiyerarşisini düzenle.
- Arama sonuçlarında bağlamın/grubun anlaşılmasını ve sıfırlama sonrası geri al görünürlüğünü kontrol et.
- Hesap alanından profil/avatar düzenlemesine geçişi yeni avatar koleksiyonuyla tutarlı hale getir.
- Veriler/sıfırlama eylemleri olağan görünüm tercihleriyle aynı ağırlıkta sunulmasın; mevcut onay akışları korunur.

Bunlar doğrulanmış canlı ekran hataları değil; kaynak yapısına dayalı tasarım ihtiyaçları ve görsel kontrolde sınanacak hipotezlerdir.

## Çizilecek durumlar

- Grup seçili
- Gelişmiş açık/kapalı
- Arama sonucu
- Sonuç yok
- Ayar değişti
- Varsayılana dön ve geri al
- Ses desteği yok
- Profil geçişi
- Veri işlemi onayı/hatası

## Teslimler

- 8 grup + Yardım için ortak satır/kart şablonu
- Arama ve gelişmiş görünüm maketleri
- Hesap → profil/avatar geçişi
- Sıfırlama/geri al ve veri işlemi görsel ayrımı

## Korunacaklar

- Ayarların mevcut kayıt şekli
- Grup anahtarları ve arama davranışı
- Varsayılana dön geri alma
- Veri silme/yedekleme onayları
- Gerçek tarayıcı ses desteği ve seçili ses

## Kabul ölçütleri

- Arama gruplar arası bağlamı korur ve sonuç yoktan çıkış sunar.
- Gelişmiş seçenekler keşfedilir ama ana tercihleri bastırmaz.
- Sıfırlama ile veri silme birbirinden açıkça ayrılır.
- Avatar ID/renk/kayıt geçmişi korunur.

## Önceki paketlerle ilişki

avatar-koleksiyonu-01 profil seçiminin asıl kaynağıdır; yeni avatar üretimi planlanmıyor.

## İncelenen kaynaklar

- `src/ui/settings/SettingsScreen.tsx` (origin/main)
- `src/ui/settings/StudySettings.tsx` (origin/main)
- `src/ui/settings/SoundSettings.tsx` (origin/main)
- `src/ui/settings/LookSettings.tsx` (origin/main)
- `src/ui/settings/DataSettings.tsx` (origin/main)
- `src/ui/account/AccountSettings.tsx` (origin/main)

## Yerel tasarım teslimi · 12 Kasım 2026

[ayarlar-deneyimi-01](../ayarlar-deneyimi-01/README.md): ortak grup/satır düzeni, arama, gelişmiş tercihler, profil bağlantısı ve veri işlemleri ayrımı hazır. 17 senaryo/37 ekran; ayrıntılı sınırlar ve kaynak eşleştirmesi paket içinde. Bu teslim canlı ekran karşılaştırması veya gerçek veri işlemlerinin test edildiği anlamına gelmez.
