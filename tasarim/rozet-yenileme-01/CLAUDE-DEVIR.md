# Claude için rozet devri

## Kapsam ve kaynak
Bu paket mevcut rozet koleksiyonunun eksiksiz varlık denetimidir: 93 ACHIEVEMENTS, 43 istatistik, 40 benzersiz başarı çizimi, 8 amblem. Kaynak yerel origin/main b1c059bbedb911aa967e60759c1a46c801cde56b. Üretim koduna bağlanmadı; güncel main ile tekrar karşılaştırarak aktar.

Önce `galeri.html`, sonra `index.html`, sonra `ENVANTER.json` oku. `data.js` JSON'un tarayıcı için eşidir. Yeni raster dosyalar assets/yeni altında PNG/WebP384×384; atlas assets/kaynak altında korunur.

## Kesin eşleştirme: istatistik → önerilen çizim

| Mevcut istatistik | Eski varlık | Yeni varlık |
|---|---|---|
| typedCorrect | medal-hundred | medal-typing |
| freeSentencesCorrect | medal-hundred | medal-sentences |
| nightDays | medal-daynight | medal-night |
| earlyDays | medal-daynight | medal-dawn |
| guideLessonsLearned | guide-teach | medal-guide-lessons |
| guideCertsEarned | guide-passed | medal-guide-cert |
| guidePlacementDone | guide-review | medal-guide-placement |
| conjugationCorrect | medal-gear-quill | medal-conjugation |
| formsPracticed | medal-vine-pencil | medal-forms |
| verbsMastered | medal-peak-gear | medal-verbs |
| maxCombo | medal-three-flames | medal-combo |
| comebacks | medal-phoenix | medal-comeback |

`src/ui/shared/drawnArt.ts` içindeki MEDAL_OF bu istatistik bazındaki eşlemeyi zaten destekliyor; drawnMedal API'si değişmek zorunda değil. Özellikle ortak `hundred` ve `daynight` değişkenlerini dosya içeriğiyle topluca değiştirme: iki ayrı metrik için iki yeni import gerekir. 10 benzersiz eski varlık →12 yeni varlık sayısının nedeni budur.

Rehber Monki dosyaları başka ekranlarda da kullanılıyor. GuideTeach/guidePassed/guideReview orijinallerini değiştirme veya silme; yalnızca MEDAL_OF rehber eşlemelerini yeni madalyalara yönlendir. Diğer 38 varlık için yeniden çizim önerisi yok. 8 amblem CATEGORY_EMBLEM ve EMBLEM içinde ayrı anlamda kullanılıyor, kazanılan rozet gibi ele alınmamalı.

## Korunacak ürün sözleşmesi
- `src/engine/gamification.ts` ACHIEVEMENTS içindeki 93 kimlik, stat, goal, title ve description bu paket nedeniyle değişmemeli.
- Başarı ailesi, `medalTier`, BadgeLog, unlockedAt, kazanılmış-kalır davranışı, senkronizasyon ve badgeSeen kayıtları korunmalı.
- Bronz/Gümüş/Altın/Özel, aile içi hedef sırasından hesaplanır. Bu önizleme aynı algoritmayı uygular. Altın renkli çizim çerçevesi gerçek “Altın” kademesi anlamına gelmez; gerçek metin/ikon etiketi sürmeli.
- Mevcut sabit kenar yıldızlarını evrensel seviye göstergesi sanma. Yeni dosyalarda kenar yıldızı yok. Korunan eski dosyalar aynı kalır; gerekiyorsa dış seviye etiketiyle açıklaştır.
- Aynı ailenin 1/10/100 hedefleri tek simge paylaşabilir; her basamağa yeni asset üretme. Özellikle yazma rozetinde sabit 100 yazısı kaldırılır; kazanım sayıları arayüz metninden gelmelidir.

## Render ve etkileşim
Hedef `src/ui/words/Medal.tsx`: BadgeMedal stat ile drawnMedal seçiyor; aynı fallback Medal bileşeni kalmalı. Küçük görsel testleri 32/48/96px kaydedildi. Ana koleksiyon için 48–72px tercih edilebilir; çok küçük yerde metin/tooltip anlamı desteklemeli. Gerçek CSS padding/opacity ile tekrar dene. Bu testler kullanıcı okunurluk deneyi değildir.

Yeni koleksiyon önizlemesi kilitli çizimleri renkli tutar ve açık “Kilitli” etiketi/ilerleme ekler. Bu bir tasarım önerisidir; gerçek uygulamanın progress hesaplarını ve odak/tooltip davranışlarını koru. %40 yalnızca prototip seçeneği. Üretimde her başarı için gerçek value/goal kullanılmalı.

`src/ui/profile/BadgeMoment.tsx` kutlama ve çoklu kazanımı; BadgeWatcher, badgeTier ve badgeSeen akışını değiştirme. Görsel değişimi aynı oturumda yeniden kazanım tetiklememeli. Yeni popup, paylaşım veya XP kuralı eklenmedi.

## Değerlendirme sınırları
Çizimler yan yana temas panosunda ve yerel karşılaştırma ekranında görsel olarak değerlendirildi. Canlı sitedeki kişisel kullanıcı koleksiyonu, gerçek kazanım kaydı, ekran okuyucu ve gerçek cihaz test edilmedi. Çizim kararları tasarım yargısıdır. `DOGRULAMA.json` yalnızca yerel prototip doğrulamasıdır; üretim entegrasyonu sonrası proje kontrollerini ayrıca çalıştır.

## Diğer paketlerden farkı
`ogrenme-deneyimi-01` içindeki 6 kavramsal rozetin rastgele mevcut başarı ID'lerine bağlanmasını önlemek için bu eşleştirilmiş paket üretildi. Mevcut başarı görselleri için buradaki 12 stat eşlemesi öncelikli tasarım önerisidir. Yeni hedef veya rozet sistemi ekleme.
