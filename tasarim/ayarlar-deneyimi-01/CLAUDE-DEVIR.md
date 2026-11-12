# Claude · Ayarlar devri

## Uygulama hedefi

Mevcut `SettingsScreen` düzenini koruyarak grupları, ayar adı/açıklama/değer hiyerarşisini ve profil geçişini iyileştir. Bu klasördeki JS bir React uygulaması veya ayar motoru değildir. Kaynak ekranların davranışlarını yerel önizleme mantığıyla değiştirme.

| Tasarım parçası | Üretimde eşleştirilecek yer |
|---|---|
| Grup listesi, arama ve gelişmiş görünüm | `src/ui/settings/SettingsScreen.tsx` |
| Varsayılana dönüş, değişmiş grup ve anahtarlar | `src/ui/settings/settingsDefaults.ts` |
| Günlük süre, yeni kelimeler, tekrar ayarları | `src/ui/settings/StudySettings.tsx` |
| Cevap kontrolü, ipucu | `src/ui/settings/AnswerSettings.tsx` |
| Otomatik ses, hız, konuşma desteği | `src/ui/settings/SoundSettings.tsx` |
| Tema, metin boyutu ve gezinme tercihleri | `src/ui/settings/LookSettings.tsx` |
| Hatırlatma/bildirim izin durumları | `src/ui/settings/ReminderSettings.tsx` |
| Araçlar, kısayollar, çevrimdışı | `src/ui/settings/ToolsSettings.tsx` |
| Yedekleme, dışa aktarma, dil/cihaz verisi | `src/ui/settings/DataSettings.tsx` |
| Hesap ve profil geçişi | `src/ui/account/AccountSettings.tsx` ve güncel profil düzenleyici |
| Yardım | `src/ui/settings/HelpSettings.tsx` |

## Korunacak davranışlar

- Mevcut sekiz grup kimliği `s-account`…`s-data` ve ayrı `s-help`; gerçek arama bütün mevcut satırları aramaya devam etmeli. Maketteki temsilî satırlar tam veri envanteri değildir.
- Üretimdeki `MORE_KEY`, seçili grup hafızası ve eşitlenen cihaz tercihleri korunmalı. Maket yalnızca sayfa belleği kullanır.
- Gerçek varsayılanları `DEFAULT_SETTINGS` ve `settingsDefaults.ts` belirler. Retention önizlemede yüzde gösterilir; kaynak değerinin birimi ve dönüşümü kontrol edilmeli. Maketteki örnek bildirim/araç tercihleri yeni veri alanı önerisi değildir.
- Reset düğmesi yalnızca kaynakta `RESET_KEYS` tanımlı gruplarda görünmeli. Kişisel plan, hatırlatmalar ve ses dili gibi hariç tutulan tercihleri sıfırlama.
- Mevcut 6 saniyelik geri al korunmalı. Makette yalnızca sıfırlanan grubun örnek anahtarları geri alınır. Kaynakta tüm ayar anlık görüntüsünü geri getirme davranışı vardır; bunu değiştirmenin veri etkisi ayrıca değerlendirilmelidir. Bu paket davranış değişikliğini uygulanmış saymaz.
- `canListen`/gerçek ses listesi/izin durumları kaynak olarak kullanılmalı. Desteksiz senaryosu gerçek destek tespiti değildir. Mikrofon veya bildirim izni yalnızca mevcut kullanıcı akışındaki gibi istenir.
- Grup tercihini sıfırlama, dil ilerlemesini sıfırlama, cihaz verisini silme, yedek geri yükleme ve hesabı silme birbirine bağlanmamalı. Mevcut `ConfirmDialog`, yedek geri alma ve hata akışlarını koru. Makette sadece cihaz verisi onay/hata yerleşimi çizildi; diğer işlemler üretimden kaldırılmamalı.

## Profil ve figürler

Kanonik kaynak `tasarim/avatar-koleksiyonu-01/` ve kendi manifestidir. Burada 8 WebP sadece yerleşim örneği. Üretimde 40 figür, kazanılma/kilit durumu, kullanıcı fotoğrafı, mevcut renk seçenekleri ve eski kayıtlar korunmalı. Ad/renk/kimlik alanlarının mevcut model eşleştirmesini yap; örnek JS nesnesini veri şeması olarak alma. Yeni seçimlere Monki ekleme; mevcut Monki kimlikli kullanıcı kayıtlarını sessizce değiştirme. Monki uygulama maskotu olarak başka yerlerde kalabilir.

## Görsel uygulama ve doğrulama

`DESIGN.md` tokenlarını ve mevcut `Toggle`, `ConfirmDialog`, `card`, `btn` bileşenlerini kullan. Bu paketteki `base.css` yalnızca taşınabilir maketin bağımlılığıdır; bütünüyle uygulamaya yapıştırma. Arama ve sayfa geçişlerinde odak davranışını gerçek React bileşenleriyle doğrula. Bildirim, hesap/eşitleme ve veri işlemlerinin gerçek durumlarını mevcut kaynak veriden al; maketteki örnek metinleri kullanıcıya gerçek durum gibi gösterme.

Yerel kontroller `DOGRULAMA.json` içinde. Canlı mobil/masaüstü başlangıç görüntüleri, ekran okuyucu, iki kat metin, gerçek hesap ve veri akışları entegrasyon sonrasında hâlâ gerekli. Paylaşılan planın ORT-01 ve ORT-02 maddeleri tamamlanmış değildir.
