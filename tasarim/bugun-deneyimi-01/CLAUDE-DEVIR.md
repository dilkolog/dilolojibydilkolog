# Claude devri · Bugün ekranı

Planın 04 alanı için 10 durum hazır; 9 plan durumuna “gün tamam ama yarım tur var” eklendi. Önce index.html, galeri.html, DURUM-MATRISI.md ve BILESEN-SOZLESMESI.md oku. Üretim kodu değiştirilmedi. Kaynak incelemesi KAYNAKLAR.json sürümüdür; canlı ekran P0 karşılaştırması yapılmış sayılmamalı.

## Hedefler

`src/ui/home/Screens.tsx`, `HomeParts.tsx` FocusLine, `SessionResumeCard.tsx`, `DayPlant.tsx`, `dayPlantStage.ts`, `TodayTime.tsx`; plan/quick davranışları için `src/engine/dailyPlan.ts`.

## Önce davranışı koru

- `remaining`, plan.counts, answeredToday, estimatedMinutes ve progress gerçek motor/oyun durumundan gelsin. Örnek DTO'yu üretim iş modeli yapma.
- Kısa turda kaynak SHORT_ROUND=15 ve BACKLOG_AT=50. shortRound yalnız exercise ve reason!=new alır. Yeni kelimeleri kısa tura dahil etme. Süreli tur için gerçek roundForMinutes kullanılır; bu prototipin dakika×3 hesabı kullanılmaz.
- waitingNew/newBlockedBy: limit, backlog, budget, none_left açıklamalarını koru. Yeni kelimeler blokluyken sırf butonu güzel görünüyor diye yeni çalışma açma. onExtraNew, onEarlyReview, onFocusReason ve diğer mevcut callbackleri kaldırma; koşullu ikincil alana yerleştir.
- Gün tamam, bugün tekrar yok ve seçili listede görev yok farklı durumlardır. Scope başlığı doğru olsun; gerçek günlük toplamı filtrelenmiş liste sayısıyla karıştırma.
- Günlük soru ilerlemesi ile kelime ustalığı/FSRS ayrı. Bugün tekrar yokken çiçek açıp tüm öğrenmenin bittiğini ima etme.

## Yarım oturumun önceliği

Kaynak SessionResumeCard, günlük scheduler'da soru kalmasa da readSessionDraft(language) üzerinden görünür. Bu özellik korunmalı. Ana eylemi yarım tura döndürürken taslağı gerçekten okuyup onResume/onStart davranışına bağla. Taslak kelime sayısı bir Set(entryId) sayısıdır; kalan soru sayısı değildir.

Aynı veriyi iki komponentte ayrı okuyup iki eşit devam düğmesi üretme. Taslak asenkron yüklenirken kullanıcı odaktaki Başla düğmesinin anlamını beklenmedik biçimde değiştirmeme/odak koruma konusunu gerçek arayüzde doğrula. Taslak okuma hatasını “taslak yok” diye kalıcı temizleme işlemiyle çözme. Taslak başka listeden kalmışsa gerçek kapsamını göster; liste değiştirince taslağı silme.

## Yerleşim

Ana kart: kapsam/kısa etiket → bir başlık → sayı ve tahmini süre → soru nedenleri → ana eylem/isteğe bağlı kısa tur → kapsam seçimi. Yan kartlarda soru ilerlemesine karıştırılmadan örnek hafta ve okuma/dinleme/konuşma süresi. Geniş ekranda tek bakış, telefonda ana eylem önce.

Kısa tur ikinci düzey menüdedir; gerçek cihazda erişilebilirliğini doğrula. Native details/summary kullanıldı; ARIA menü davranışı iddia edilmez. Her durumda bir baskın ana eylem var. Ek çalışma alanları kapanabilir; mevcut haftalık meydan okumalar, beceriler, alışkanlık/kurulum/yedek ipuçları veya MonologueCard işlevleri bu tasarım nedeniyle silinmemeli. Bu paket onların tüm alt ekranlarını yeniden tasarlamaz.

## Aktarım ve varlıklar

Filiz SVG'leri önceki filiz-buyume-01 paketinden; model -1…5 ile görsel 0…6 eşleştirmesi açık yapılır. Kaynaktaki eski POTS dizisinin uzunluğuna körlemesine yeni indeks uygulama. Tilki avatarı avatar-koleksiyonu-01, ilk kelime sahnesi ogrenme-deneyimi-01 kaynaklı. Yeni raster üretimi yok. Mevcut DayPlant günlük/dil bazında son gösterilen aşamayı hatırlama ve aşama geçişi davranışını koru; her renderda tohumu yeniden başlatma. Sakin/reduced-motion seçenekleri korunmalı. Gerçek profil adı/level/avatar değerlerini kullan; Ali/Seviye 7 sabit veri olmasın.

Kayıt tokenları, dil vurgusu, Lexend/Literata, kart/button stilleri mevcut DESIGN.md ve CSS tokenları üzerinden uygulanmalı. Bu paketin CSS'ini toptan uygulama sayfasına ekleme.

## Üretime taşınmayacaklar

Durum seçicisi, örnek ilerleme düğmeleri, sabit sayı/tarih/hafta tikleri, örnek kelime listesi ve modal açıklamalar inceleme araçlarıdır. Normal formdan kelime yazmak burada yalnız tek soruluk örnek görünümü açar; gerçek sözlük verisi oluşturmaz. Rotaya geçiş düğmeleri bu bağımsız pakette açıklama penceresi gösterir; gerçek okuma/dinleme/kelime ekranlarına entegrasyon yapılmadı. Kullanıcıya yapılmış gibi gösterme.

## Kabul

DOGRULAMA.json yerel kontrolleri listeler. Gerçek veriyle yarım tur+gün tamam, filtreli plan+başka listelerde tekrar, kısa turda yeni kelime olmaması, süre bütçesi, günlük hedef bitişi ve zaman dilimi ayrıca doğrulanmalı. Gerçek ekran okuyucu ve fiziksel cihaz kontrolü yapılmadı. Repo gerekli kontrollerini entegrasyonda çalıştır; prototip testleri onların yerine geçmez.
