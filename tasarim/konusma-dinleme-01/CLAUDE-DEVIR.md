# Claude devri · Konuşma–dinleme

## Teslim
Tasarım planının 02 alanı için 4 ayrı akış ve 15 ortak durum hazır. index.html ve durumlar.html ile başla. Bu HTML prototipidir; üretim kodu değiştirilmedi. Kod/akış kaynakları KAYNAKLAR.json içinde. Canlı siteyle ekran karşılaştırması yapılmadı; ilk entegrasyon öncesinde bu kontrol hâlâ yapılmalı. Ortak iş planındaki P0 doğrulaması tamamlandı sayılmamalı.

## Hedef kaynaklar ve korunacaklar

- `src/ui/practice/AudioRecorder.tsx`: 8 sn, idle/recording/review, onSave(blob), boş kayıt, izin hatası. Kelime kaydı puanlama değildir; seçilen kayıt gerçekten saklandığında başarı göster.
- `src/ui/practice/PronunciationCheck.tsx`: 12 sn, kayıt bitince assessPronunciation, gerçek sonuç/score, onScore, model ses/kaydım, PronTips. Gereksiz yeni onay adımı ekleme; prototipte telaffuz kaydı doğrudan checking'e gider. Fonksiyonel davranış korunarak düzen uygula.
- `src/ui/reading/Listening.tsx`: AudioPanel native audio, hız, devam konumu, üç tur, kaynak hatası, yerel/çevrimdışı ses ve metin takibi. Prototipteki browser TTS oynatıcısı üretimde native audio'nun yerine geçmesin.
- `src/ui/reading/Shadow.tsx`: gerçek model → kayıt → sırayla karşılaştırma. answerMs metne bağlı, en fazla 15 sn. Mevcut canlı analyser verisi varsa koru; simülasyon halkasını gerçek ses dalgası gibi sunma. Gölgeleme kaydı bellek içindedir, kalıcı kelime kaydıyla karıştırma.
- `src/ui/settings/SoundSettings.tsx`: seçili ses, hız, efekt/haptik ve destek koşulları korunur. Bu tasarım nedeniyle global ses tercihlerini sıfırlama.

## Aktarım adımları

1. Güncel üretim/ana dalı kaynak sürümle karşılaştır; zaten değişmiş alanları yeniden bozma.
2. VoiceTarget ve durum paneli düzenini mevcut card/btn/chip/Toggle/tokenlar üzerinde uygula.
3. Kelime kaydı ve telaffuz buton adlarını ayır. “Bu kaydı kullan” kelime kaydına; puan gerçek servis sonucuna bağlıdır.
4. Telaffuz sonucunda önce tek öneri, sonra isteğe bağlı detay. Tonlama yalnız servis sağlarsa. Tüm sözcük etiketleri rengin yanında metinle anlaşılır olsun.
5. Dinleme turu ve metin görünürlüğünü gerçek round/hidden değerlerine bağla. Native kontroller, hız ve kayıtlı devam konumu kaybolmasın.
6. Gölgelemenin sırayla karşılaştırmasını koru. Bu prototipte karşılaştırma düğmesi yalnız yerel dosyalı dinleme önizlemesine yönlendirir; gerçek ardışık ses karşılaştırmasını implement etmez.
7. Gerçek izin, boş kayıt, servis hatası ve ses kaynağı hatası için uygun durumları bağla. İzin hatasıyla servise ulaşılamamasını aynı mesajda toplama. Yeniden deneme kaydı koruyabiliyorsa koru; yoksa yeniden kayıt gerektiğini açık söyle.

## Üretime taşınmayacaklar

Durum seçicisi, örnek izni ver, örnek sonucu göster, vurgu seçicisi, statik 82/54 puanları, sabit kelime geri bildirimleri ve tasarım atölyesi dosya girdisi test araçlarıdır. Üretim akışına aktarılmaz. Sayfa mikrofon istemez ve puanlama servisine ses göndermez. Kayıt varmış gibi gerçek kullanıcı geçmişi yazma.

Tarayıcı sesi yalnız İspanyolca voice mevcutsa çalışır; bu, gerçek audio altyapısının tam doğrulaması değildir. Yerel dosya için ObjectURL oluşturulur ve değiştirme/kaldırma/pagehide sırasında bırakılır. Üretimde güvenilir yükleme/önbellek/kayıt temizliği mevcut yardımcılarla yürüsün.

## Tasarım ve dosya kökeni

Yeni raster asset üretilmedi. ogrenme-deneyimi-01 içindeki 8 ikon inline SVG olarak yeniden kullanıldı. Lexend/Literata yerel font ve lisansları assets içinde. Kayıt durumu için --record tokenı önerildi; bu HTML'de açık/koyu değerleri var. Üretimde token adını mevcut ses/kayıt tokenlarıyla karşılaştır; varsa onu kullan, yoksa DESIGN.md ve sakin temayla birlikte tanımla.

## Kabul ve kalan doğrulama

Yerel kontroller DOGRULAMA.json içinde. Dört modun tüm kullanılabilir durumlarında 375px taşma kontrolü yapıldı; dosya/hız, örnek sayaçlar, dialog, Escape, metin turları ve hareket tercihleri sınandı. Gerçek mikrofon, telaffuz servisi, işitilerek ses kontrolü, fiziksel mobil cihaz ve ekran okuyucu bu teslimde doğrulanmadı.

Entegrasyonda gerçek kullanıcı izniyle kayıt, ret, boş ses, yavaş servis, servis hatası, iptal, sayfa değiştirme ve arka plana alma denenmeli. Ses kaydı durmalı, MediaStream trackleri kapanmalı, timer/Blob URLler bırakılmalı. Mevcut kayıt boyutu/MIME ve gönderim sözleşmesi korunmalı. API/session/anahtar davranışı bu tasarım nedeniyle değişmemeli.

Kontroller geçmeden bu prototip “üretime entegre edildi” veya “telaffuz analiz sistemi tamamlandı” diye sunulmasın.
