# Eski Memrise öğrenme motoru · Derinleştirme

13 Kasım 2026. Kullanıcının özellikle sevdiği klasik öğrenme deneyimine odaklanır. 2017 gözlemi, 2016 teknik dokümantasyonu ve 2021–2024 klasik ürün yardım belgeleri aynı sürümün birebir tarifi değildir; her bulgunun kapsamı aşağıda belirtilir.

## Temel sonuç

Eski deneyimin yeniden kurulabilecek güçlü yanı, ilk öğretim, oturum içi düzeltme, uzun vadeli tekrar ve görünür büyümenin birlikte çalışmasıdır. Sadece tekrar günlerini kopyalamak bu deneyimi oluşturmaz. Bu sonuç bir ürün/mimari çıkarımıdır; Memrise'in kapalı motorunu ele geçirdiğimiz veya tüm kuralları bulduğumuz anlamına gelmez.

## Kanıt düzeyleri

- **A — Resmî klasik yardım:** Kullanıcıya açıklanan davranış. Belgede geçen platform ve tarih için güçlü kanıt; bütün tarihsel sürümlere genellenmez.
- **B — Dönemin doğrudan incelemesi:** Kullanmış bir araştırmacının gözlemi. Oturum deneyimini anlatır; sunucudaki algoritmayı göstermez.
- **C — Eklenti yazarının kodu / API gözlemi:** Gerçek eski istemciye bağlanan üçüncü tarafın teknik izi. Entegrasyon noktalarını gösterir; Memrise'in bütün kodu ve kesin iş kuralı değildir.
- **D — Öneri:** Diloloji için tarafımızdan tasarlanan, Memrise'e mal edilmeyen davranış.

## 1. İlk karşılaşma gerçekten öğretim içeriyordu

Mayıs 2017 TESL-EJ incelemesinde yeni kelime önce anlam, seçilmiş mem ve sesle tanıtılıyor; sonra aynı oturumda farklı testlerde tekrar karşılaşılıyor. Yanlışta mem, anlam ve ses yeniden gösteriliyor; doğru cevabı yeniden üretme isteniyor. Kullanıcının oturum boyutunu ayarlayabildiği de anlatılıyor. **B.** [Ryan Nicklas, TESL-EJ](https://tesl-ej.org/wordpress/issues/volume21/ej81/ej81m1/)

**D:** “Göster → sor → yanlışsa açıklayıp yeniden denetle” döngüsü tasarımın merkezinde olmalı. Cevap ekrandayken kopyalayabilmek ile daha sonra ipuçsuz hatırlamak ayrı olaylar olarak tutulmalı. Burada bütün maddelerin aynı sırayla çoktan seçme/yazma evrelerinden geçtiği iddia edilmiyor.

## 2. İlk öğrenme bitişi tek doğru cevap değildi

Resmî Mart 2022 açıklaması normal maddelerde 6 test, orta kolaylıktakilerde 4, kolaylarda 3 test anlatıyor. Kolaylık, önceki öğrencilerin doğruluğuna göre belirleniyor; kolay maddede kullanıcı hata yaparsa kendisi için normal akışa dönebiliyor. Yüzde eşikleri yayımlanmamış. Kapsam resmî Memrise kurslarının kolay maddeleri; her topluluk kursu için bu uyarlama garanti değil. **A.** [3/4/6 test](https://memrise.zendesk.com/hc/en-us/articles/360015974638-Why-am-I-only-tested-3-or-4-times-instead-of-6-on-some-items)

**D:** Diloloji'de “öğreniliyor” durumu açık olmalı; tamamlama tek doğru seçeneğe bağlanmamalı. 3/4/6 eşiğini doğrudan kopyalamadan önce mevcut edinim ölçütü ve ipucunun etkisi incelenmeli. Topluluk verisi yokken “Memrise gibi toplu zorluk kestirimi yapıyoruz” denmemeli.

## 3. Yanlış kelimeler oturum kuyruğuna yeniden giriyordu

Peek Next eklentisinin kaynak kodu, sonraki kutuyu tahmin etmenin yanlış yapılmış eski kelimelerin araya eklenmesi nedeniyle sapabileceğini belirtiyor. Bu, hata sonrası oturum sırasının dinamik değiştiğine doğrudan teknik iz. Eklenti üçüncü tarafa ait; kendisini sunucu algoritması olarak sunmuyoruz. **C.** [Kaynak](https://raw.githubusercontent.com/cooljingle/memrise-peek-next/master/Memrise_Peek_Next.user.js)

**Bilmediğimiz:** Hata kaç soru sonra geri geliyordu; kaç kez dönüyordu; hangi puanda bırakılıyordu; web/mobil aynı mıydı? Bu ayrıntılar bu izden çıkarılamaz.

**D:** Önerilen yeniden kurulumda yanlışın ardından düzeltme gösterilir, başka maddelerle araya mesafe konur, sonra bağımsız test yapılır. Aralık sabit “3 soru” diye sunulmaz; kısa oturumlarda aralık için uygun madde yoksa ayrı davranış tanımlanır. Sürekli hata yapan kullanıcıyı bitmeyen kuyruğa hapsetmemek için oturum sınırı ve sonraki destek oturumu gerekir. Bunlar bizim ürün kararlarımızdır.

## 4. İlk öğrenme ile uzun dönem takvimi ayrı izleniyordu

Auto Learn eklentisi ilk öğrenme kutularında oturum seviyesi ve büyüme durumu üzerinden çalışıyor; gerekli aşamaları atlatmaya yönelik bir eklenti. Bu kod yalnızca okundu; kurulmadı, çalıştırılmadı veya bir hesaba bağlanmadı. Varlığı ilk edinimin ayrı aşamaları olduğuna teknik izdir, orijinal planlayıcının tüm kurallarını vermez. **C.** [Eklenti kaynağı](https://raw.githubusercontent.com/cooljingle/memrise-auto-learn/master/Memrise_Auto_Learn.user.js)

2016'da yazılmış gayriresmî API gözleminde kelime içeriği ile kullanıcı durumu ayrılıyor. Kullanıcı kaydında doğru/yanlış toplamları, büyüme, son/sonraki tekrar tarihi ve aralık; cevap kaydında soru biçimi, süre, yön ve takvimi güncelleme işareti görülüyor. Bunların varlığı, hepsinin zamanlamada ağırlıklı kullanıldığını kanıtlamaz. Eski uç noktalara istek gönderilmedi. **C.** [Teknik gözlem](https://github.com/carpiediem/memrise-enhancement-suite/wiki/Unofficial-Documentation-for-the-Memrise-API)

**D:** Öğretim sırası, cevap değerlendirme, uzun dönem zamanlama ve görsel durum farklı sorumluluklar olmalı. Böylece mevcut FSRS korunurken ilk öğrenme deneyimi ayrıca iyileştirilebilir. “Büyüme seviyesi” alanını doğrudan altı filiz SVG'sine eşlemek hatalı olabilir; tarihsel örneklerde büyüme değeri altıyı aşar.

## 5. SRS için kamuya açıklanan kural var

Klasik topluluk yardımının 2024 sürümünde şu aralıklar bulunuyor:

`4 saat → 12 saat → 24 saat → 6 gün → 12 gün → 48 gün → 96 gün → 6 ay`

Doğru sonraki aralığa, yanlış 4 saate döndürüyor. Vade her level içinden görülebiliyor. **A.** [Klasik SRS](https://memrise.zendesk.com/hc/en-us/articles/360015889057-How-does-the-spaced-repetition-system-work)

**Sınır:** 2012, 2017 ve 2024 sürümlerini aynı takvim saymıyoruz. Hatadan sonraki oturum içi tekrar, günler sonraki vade güncellemesiyle aynı işlem değildir. Kesin geç kalma telafisi, erken pratik davranışı ve kısmen doğru yanıt güncellemesi henüz belgelenmedi.

**D:** Sevilen kullanıcı deneyimiyle zamanlayıcının istatistiksel başarısı ayrı değerlendirilmelidir. Eski takvimin mevcut Diloloji motorundan daha iyi olduğunu gösteren eş koşullu bir ölçüm bulunmadı. İyi bir karşılaştırma aynı içerik ve süreyle gecikmeli, ipuçsuz hatırlama ve terk oranını ölçer.

## 6. Soru biçimleri ve yönler farklıydı

Klasik yardım dört aile veriyor: yazma, çoktan seçme, kelime parçalarını sıralama, dinleme. Dinlemede sesten yazma/seçme ve ses seçenekleri bulunabiliyor. **A.** [Test türleri](https://memrise.zendesk.com/hc/en-us/articles/360015973818-How-many-testing-types-are-there)

Yön yardımına göre yazma/sıralamanın soru–cevap sütunları level üzerinden belirlenebiliyor; çoktan seçmelinin yönü ilerledikçe değişebiliyor. Bu, “her soruda hedef dili yazıyordun” genellemesini desteklemez. **A.** [Yönler](https://memrise.zendesk.com/hc/en-us/articles/360015887097-Test-Directions-overview)

**D:** Aynı kelimenin anlamını tanımak, hedef dilde yazmak ve sesini çözmek ayrı başarı göstergeleri olabilir. Bunların tek ustalık değerine ne kadar etki edeceği bir model kararıdır. Soru türünü değiştirmek kendi başına yeni becerinin kazanıldığını kanıtlamaz. Kesin tarihsel test sırası elimizde yok.

## 7. Cevap değerlendirme sandığımızdan ayrıntılıydı

2021 noktalama rehberi varsayılan aksan/noktalama toleransı ve kursa bağlı strict modu anlatıyor; parantezli sözcükler isteğe bağlı olabiliyor. Noktalama için istisnalar da var. Buradan “bütün işaretler her zaman siliniyordu” sonucu çıkmaz. **A.** [Yazma/sıralama değerlendirme](https://memrise.zendesk.com/hc/en-us/articles/360015886897-A-Guide-to-Typing-Tests-Tapping-Tests-and-Memrise-Punctuation)

Alternatif cevaplar için ayrı alan var; başına alt çizgi eklenen alternatif kabul edilirken sunumdan gizlenebiliyor. Belge alternatiflerin yazma testinde kabul edildiğini, çoktan seçme/sıralamada aynı şekilde çalışmadığını belirtiyor. **A.** [Alternatifler](https://memrise.zendesk.com/hc/en-us/articles/360015973458-How-can-I-add-alternative-words-as-correct-answers)

**D:** Diloloji'de “anlamca doğru”, “yazım ayrıntısı eksik”, “gerçekten yanlış” ve “yazım pratiği istendiği için yanlış” ayrımı açık olmalı. İspanyolca `si/sí`, Fransızca `a/à` gibi anlam taşıyan farklar mekanik biçimde silinmemeli. Memrise'in eski toleransının her örneği iyi ürün kararı sayılmaz.

## 8. Akıcılık küçük etkileşimlerden de geliyordu

2022 Android ayarlarında doğru metin tamamlanır tamamlanmaz kabul eden Auto-detect bulunuyor. Öğrenme/tekrar/hızlı tekrar oturum büyüklükleri ve tapping tercihi ayarlanabiliyor. Belge web ve uygulama ayarlarının birbirini etkilemediğini ayrıca söylüyor. **A.** [Öğrenme ayarları](https://memrise.zendesk.com/hc/en-us/articles/360015973638-What-are-my-Learning-Settings-and-how-can-I-change-them-on-Android)

**D:** Bilişsel çaba dışındaki tıklamalar azaltılabilir. Ancak kısmi cevap tam cevabın önekiyse erken kabul sorun yaratabilir. Klavye kompozisyonu, aksan girişi ve erişilebilirlik test edilmeden otomatik geçiş eklenmemeli. Bu rapor otomatik geçiş kodu eklemiyor.

## 9. Ses ve içerik modeli de öğrenmeyi şekillendiriyordu

Kurs oluşturucu bir maddeye birden çok ses kaydı ekleyebiliyor; testte bunlardan rastgele biri seçilebiliyor. **A.** [Ses kayıtları](https://memrise.zendesk.com/hc/en-us/articles/360015973418-How-can-I-add-audio-to-my-course)

Veritabanında ek sütunlar, yazma/tapping kuralları, aksan klavyesi ve level oluşturma gibi ayarlar bulunuyor. Kurs içeriği motorun soru biçimini etkileyebiliyor. **A.** [Veritabanı ayarları](https://memrise.zendesk.com/hc/en-us/articles/360015973318-What-can-be-edited-in-a-Database)

**D:** Bir sesi ezberlemek ile kelimeyi farklı konuşmacılarda tanımak farklı hedeflerdir. Yeni motor taslağı ses/yazı/alternatif cevap/örnek bağlamı için yeterli içeriğe sahip olmalı; içerik yokken ilgili testi sunmamalı.

## 10. Ek modların rolleri ayrıydı

Difficult Words geçmiş hatalarla ve elle işaretlemeyle yoğun çalışma sağlıyor. Elle işaretlenen maddeyi kullanıcı kaldırabiliyor; belge oturumda en çok 20 madde gösterildiğini belirtiyor. **A.** [Zor kelimeler](https://memrise.zendesk.com/hc/en-us/articles/360015887577-What-are-Difficult-Words)

Speed Review zaman baskısı ve canlarla hızlı tanımayı çalıştırıyor; klasik belgede en az üç öğrenilmiş ve tekrara hazır maddeyle açılıyor. **A.** [Hızlı tekrar](https://memrise.zendesk.com/hc/en-us/articles/360015887997-What-is-Speed-Review)

**D:** Hızlı tanıma ana öğrenme bitiş koşulu olmasın. Elle zor işareti, tekrar vadesi ve ilk öğrenme durumu birbirine indirgenmesin. Yanlışın kök nedeni aksan, anlam, ses veya karışan benzer kelime olabilir; hedefli destek buna göre sunulabilir.

## 11. Filiz ve mems için sonuç

Klasik yeni kelime yardımında çiçeği açtırma ilk öğrenme metaforu. Classic Review solan çiçeği yeniden açtırma anlatımını kullanıyor. **A.** [İlk öğrenme](https://memrise.zendesk.com/hc/en-us/articles/360016181397-How-can-I-Learn-New-Words-on-the-website), [Classic Review](https://memrise.zendesk.com/hc/en-us/articles/360016181457-What-is-Classic-Review-How-can-I-review-words-and-phrases-on-the-website)

Mems'in kaldırılması için resmî tarih 5 Eylül 2022; mobilde sonraki haftalar belirtiliyor. Bu nedenle 2017 memli deneyimle 2024 klasik deneyimin bütün parçalarını aynı tarihsel ürün sanmamalıyız. **A.** [Mems değişikliği](https://memrise.zendesk.com/hc/en-us/articles/8805604634513-Mems-removal-is-scheduled-for-Monday-5-September)

**D:** Filiz görseli gerçek edinim/tekrar durumunu anlaşılır kılmalı. Solma, ceza veya öğrenilen her şeyin silinmesi gibi sunulmamalı. Çağrışım notu hatada geri çağrılabilir; bağımsız testte gizlenir. Mevcut `filiz-buyume-01` varlıkları bir motor değil, durum göstergesidir.

## 12. Yeniden kurulabilecek deneyim sözleşmesi — öneri, tarihsel algoritma değil

1. Kullanıcı kısa bir öğrenme turu ve içerik kapsamı seçer.
2. Yeni madde anlam/ses/örnek ve isteğe bağlı kişisel çağrışımla tanıtılır.
3. Önceden tanımlanmış edinim görevleri, mevcut içeriğe göre uygun soru biçimleriyle sunulur.
4. Yanlış cevapta fark ve doğru biçim açıklanır; gerekiyorsa destekli düzeltme yapılır.
5. Daha sonra araya başka maddeler girerek bağımsız hatırlama yeniden ölçülür.
6. Destekli ve bağımsız başarı ayrı tutulur; belirli sınırda edinim tamamlanır.
7. Uzun dönem vadesi mevcut tekrar motorunca planlanır.
8. Görünür filiz durumu, sonraki çalışma zamanı ve zor maddeler sonuç ekranında gösterilir.

Oturum içi yoğun karşılaşmaların her biri bağımsız uzun dönem başarı gibi zamanlayıcıyı şişirmemeli. Kaydı kesilirse kullanıcı kaldığı yerden devam edebilmeli; aynı cevap iki kez işlenmemeli. Oturum sınırı nedeniyle bitmeyen kelime başarısızlık gibi sunulmamalı. Bunlar gelecekteki taslak için kabul maddeleridir; kod veya şema değiştirilmedi.

## 13. Hangi kurallar hâlâ bulunamadı?

| Soru | Şu anki durum |
|---|---|
| Her edinim seviyesinde tam soru sırası | Dönem/platform için doğrulanmış tam tablo yok |
| Hata kaç soru sonra dönüyor? | Kuyruğa dönüş izi var; sayı yok |
| Hatalı maddede kaç başarılı dönüş yeterli? | Kesin kural yok |
| Benzer/karıştırıcı seçenekler nasıl seçiliyor? | İçerik seçenekleri teknik izlerde var; tam seçim formülü yok |
| Yanıt süresi vade mi puan mı etkiliyor? | Süre kaydı var; nedensel kural gösterilmiş değil |
| Erken tekrar ve geç kalma vade güncellemesi | Tam tarihsel kural yok |
| Yazım hatası/near miss ile tamamen yanlış aynı mı? | Platform/tarih bazında doğrulanmış tam geçiş tablosu yok |
| Bütün sürümlerde 6 aşama aynı oturumda mı bitiyor? | Böyle bir garanti yok; sürüm farkı dikkate alınmalı |

Yayımlanmış 2017 istemci dosyası olduğu söylenen değiştirilmiş bir gist bulundu, ancak ham dosyaya erişim başarısız oldu; tam içerik incelenemedi. Bu nedenle ondan özgün planlayıcı kuralları çıkarılmadı. Üçüncü taraf değişiklikli dosyalar orijinal motorun doğrulanmış sürümü sayılmamalı.

## 14. Sonraki çalışma nasıl ölçülmeli?

Önce eski deneyimi hatırlatan kısa bir edinim prototipi; sonra mevcut akışla eş içerik/süre üzerinden karşılaştırma. Ölçüler: ertesi gün ve bir hafta sonra ipuçsuz hatırlama, kelime başına süre, gerekli destek sayısı, oturumu bırakma ve tekrar yükü. Kullanıcının “öğreniyorum” hissi ayrıca sorulur. Tercih edilen etkileşimle daha iyi hafıza sonucunun aynı anda gelip gelmediği ölçülür.

Bu, mevcut motoru kaldırma veya eski takvime geçme kararı değildir. İlk hedef, sevilen öğretim akışını kanıtlanmış parçalarıyla tarif etmek ve bilinmeyenleri görünür bırakmaktır.
