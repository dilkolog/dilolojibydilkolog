# Claude için devir · Altı öğrenme alanı

## Durum
Kullanıcı altı tasarım alanının tamamını istedi. Hepsi bu pakette tasarlandı; üretime entegrasyon yapılmadı. Önce `galeri.html`, sonra `index.html` aç. Mevcut `avatar-koleksiyonu-01` paketinin yerine geçmez; onunla aynı ürün dili içindedir. Kullanıcının Monki istememesi avatar seçimine aitti; bu yeni pakette de Monki çizimi kullanılmadı, mevcut maskot kullanımları silinmedi.

Kaynak inceleme: yerel `origin/main` b1c059bbedb911aa967e60759c1a46c801cde56b (canlı sitede oturum açılarak test edilmedi). Uygulamaya aktarırken güncel main ve kök AGENTS.md / DESIGN.md esas alınmalı. HTML bağımsız prototiptir; React'e doğrudan kopyalanacak bir üretim bileşeni değildir. Mevcut class ve bileşenleri yeniden kullan.

## 1. Filiz ve yol
Hedefler `src/ui/home/Plant.tsx`, `src/ui/session/WordPlant.tsx`, `src/ui/home/DayPlant.tsx`, `src/ui/home/dayPlantStage.ts`, `src/engine/growth.ts`, `src/engine/mastery.ts`.

Önceki `filiz-buyume-01` içindeki 7 SVG yeniden kullanıldı. Görsel stage-0 = model -1 (tohum); stage-1…6 = model 0…5. Adlar mevcut STAGE_NAME sırasındadır: Yeni tanıştı, Tanıdık, Hatırlanıyor, Sağlam, Kullanılabiliyor, Oturdu. Yeni öğrenme aşaması veya eşik ekleme.

Kelime bitkisinin aşaması growthStage/memory modelinden gelsin; günlük bitki dayStage modelinden. 8/12 günlük tekrar hedefini kelime ustalığı gibi yorumlama. Sulama yalnızca görsel geri bildirimdir, seviye ya da XP kazandırmaz. Prototipteki “Büyüme geçişini izle” ve aşama seçicisi sadece atölye kontrolleridir; gerçek kullanıcı ekranına taşıma. Üretimde WordPlant'in mevcut doldur → büyü → halka sıfırla akışını koru. Tam yolculuğu her cevapta oynatma. Bu paket yeni bir 9.6 saniyelik animasyon üretmedi; önceki animasyon paketi korunur.

## 2. Ders sonuçları
Hedef `src/ui/games/GameResult.tsx` ve gerçek oturum sonuç bileşenleri. Mevcut accuracy 0–1, stats, missed, record, language, onAgain/onExit sözleşmelerini koru. Örnekler %80, %100, %50, XP32/40/20 ve süre2dk; gerçek ödül hesapları yerine sabit veri koyma. Tüm sonuçların ekrana anlamlı karşılığı olmalı; düşük doğrulukta destekleyici dil, kusursuz turda anlamsız eksik kelime listesi yok.

“Gözden geçir” eylemi missed kelimelerle gerçek bir tura bağlanabiliyorsa kullanılmalı. Mevcut onAgain sadece tekrar oynatıyorsa davranışı yanlış etiketleme. Mevcut kutlama ses/haptics davranışını iki kez tetikleme. Sonuç başlığını yeni ekrana odaklayıp canlı duyuruyu uygun şekilde bağla.

## 3. Rozetler
Hedefler `src/ui/profile/BadgeMoment.tsx`, `BadgeWatcher.tsx`, `badgeTier.ts`, `src/engine/badgeStats.ts` ve mevcut başarı envanteri. Yeni çizimler `badge-sprout`, `badge-flame`, `badge-book`, `badge-headphones`, `badge-chat`, `badge-compass`.

Bu ID'ler VARLIK ID'leridir; mevcut kazanım kayıtlarının anahtarları değildir. Altı rozetin örnek hedefleri bir tasarım önerisidir. Önce mevcut rozet tanımlarına uygun anlamla eşleştir; gerekirse sadece çizimi değiştir. 2 kazanılmış /4 kilitli örnek görünümü gerçek hesap verisi değildir. Kazanım tarihleri, mevcut eşikler, tier mantığı, görülmüş kayıtları ve senkronizasyon korunmalı. Yeni hedef gerekiyorsa mevcut ölçümlerin gerçekten sayıldığını doğrula; ölçülmeyen “10 konuşma” gibi bir hedefi otomatik devreye alma.

## 4. Boş ve hata durumları
Hedef `src/ui/shared/EmptyArt.tsx`, `EmptyState.tsx` ve kullanım yerleri. Yeni çizim → anlam eşleşmesi:
- empty-first → ilk kelime / boş bahçe
- empty-search → sonuç bulunamadı
- empty-offline → bağlantı yok
- empty-done → bugünkü tekrarlar bitti
- empty-sentences → kayıtlı cümle yok
- empty-error → geçici işlem hatası

Mevcut PictureKind sözleşmesini kontrol ederek ekle/eşleştir; mevcut sahneleri topluca silme. Offline metnindeki “kaydedilmiş çalışmalar” ancak o ekranda gerçekten çevrimdışı erişim varsa gösterilmeli. Hata, yükleniyor, filtre sonucu boş ve gerçek boşluk farklı durumlardır. Ağ hatasında boş koleksiyon gösterme. Yeniden dene gerçek yeniden deneme olmalı; çift tıklama ve loading yönetimi eklenmeli. Prototip ağ isteği yapmaz. Dekoratif görseller alt=""; bilgi metinde bulunur.

## 5. Pratik ikonları
Hedef `src/ui/shared/icons.tsx` ve pratik kartları. 24×24 viewBox, stroke 1.8, round uçlar, currentColor. İsimler `practice-{listening,speaking,writing,matching,idioms,reading,review,sound}.svg`. Dinleme ile ses düğmesini, konuşma ile sohbeti, okuma ile deyimi ayrı tut. 16/20/24px ve dil renkleriyle kontrol et. SVG dosyalarını üretimde mevcut Icon yardımcılarına uyarlamak daha doğru; tüm img ikonlarını CSS filtresiyle renklendirme. Buradaki ikonlar `ikonlar-01` paketinin tamamının yerine geçmez, pratik alanı içindir.

## 6. Kelime ve deyim kartı
Hedef `src/ui/words/WordCard.tsx` ve deyim/pratik kartları. Mevcut WordCard bir okuma kelimesinin alt panelidir; birçok aksiyonu vardır. Yeni görsel sırayı mevcut lookup/known/unknown/add/ignore/listen/sheet davranışlarını kaybetmeden uygula. Mobil alt panel davranışını sırf bu bağımsız örnek tam sayfa diye kaldırma.

Hiyerarşi: hedef kelime → anlam → telaffuz/kaydet → özgün örnek → öğrenme durumu. Hedef metinlerde `lang="es"` + Literata. Arayüz Lexend. Örnekler bu çalışma için yazıldı; PDF metni taşınmadı. “estar en las nubes” dalgın olmak/aklı başka yerde olmak bağlamında kullanılır. Yerel save geçici prototip durumudur; gerçek DB'ye bağlı değildir. Ses browser speechSynthesis, üretimde mevcut ses/cache/voice tercihlerini kullan. Cevap yokken doğru/yanlış rengi gösterme. Geri bildirim seçicileri prototip aracıdır; gerçek değerlendirme motoruna bağlanmalı. Gerçek üretimde uydurma “yarın” tarihi gösterme, planlayıcının tarihi gelsin.

## Aktarım sırası ve kabul
Önce ikon + durum çizimleri, ardından kart hiyerarşisi, sonuç ekranı, filiz ekran düzeni ve rozetler. Bu sıra bağımlılıkları azaltan öneridir, uygulama taahhüdü değildir.

Kabul: üç dil vurgusu, açık/koyu, 375px, gerçek uzun metin, klavye, ekran okuyucu, prefers-reduced-motion, loading/error/empty haller. Gerçek kullanıcı verisi, FSRS/XP/rozet geçmişi değişmemeli. Kod entegrasyonu yapılınca repo gerekli kontrolleri çalıştır; DOGRULAMA.json yalnızca bağımsız önizleme kontrolleridir. Gerçek ses çıkışı ve gerçek cihaz erişilebilirliği bu çalışmada doğrulanmadı.

## Kaynak ve tekrar üretim
`CIZIM-ENVANTERI.json` kaynak levha hücrelerini verir: 4 sütun ×3 satır, row-major, 0 tabanlı. Her hücre 384×384'e aktarıldı; alfa<150 dış gürültü temizlendi. Kaynak levha değiştirilmeden korundu. Yaratıcı üretim ImageGen; canvas yalnızca teknik ayırma/dışa aktarım için kullanıldı. Font lisansları assets içinde.
