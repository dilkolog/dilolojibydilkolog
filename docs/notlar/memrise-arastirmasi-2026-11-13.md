# Memrise çalışma mantığı · İnternet araştırması

Araştırma tarihi: 13 Kasım 2026 (Europe/Istanbul).

Amaç: Memrise'in öğrenme akışını, tekrar kurallarını, içerik bağlarını ve ürün değişimini anlamak; Diloloji için uygulanabilir tasarım kararlarını ayırmak. Bu rapor uygulama değişikliği değildir.

## Yöntem ve güven sınırı

Resmî ürün güncellemeleri ve yardım belgeleri karşılaştırıldı; bilimsel ilkeler için araştırmacıların üniversite sayfaları okundu. Bir ticari inceleme ve bir kullanıcı tartışması yalnızca deneyim sorunlarına işaret eden gözlem olarak kullanıldı. Hesap açılarak mobil uygulama denenmedi; özel sunucu kodu, eğitim verisi, öneri ağırlıkları veya tüm dil çiftleri doğrulanmadı. İnternetteki ürün belgesinin varlığı, bütün kullanıcılara aynı özelliğin dağıtıldığını kanıtlamaz.

Etiketler: **Belgelenmiş** = resmî açıklama; **tarihsel** = ilgili eski sürümde belgelenmiş; **gözlem** = kullanıcı/yazar deneyimi; **öneri** = Diloloji için bizim çıkarımımız.

## 1. Önce sürümleri ayır

| Dönem / alan | Belgelerden çıkan ayrım |
|---|---|
| Klasik Memrise | Kurs/level, kelime öğrenme testleri, çiçek metaforu, tekrar ve mems |
| 31 Mart 2024 ayrımı | Eski topluluk kursları ayrı web sitesine taşındı |
| 2025 yenilenmesi | Hedefe göre Wordlists; karışık My Lessons akışı; kişisel My Words; etkinlik odaklı ilerleme |
| 2026 genişlemesi | Ana üründe özel kelime listelerinin dönüşü; mems ve AI görseli; hikâyeler, sınav hazırlığı ve ileri konuşma araçları |

2026 resmî topluluk rehberi, ilk aşamada yaklaşık 800 eski kursun kelime listesi olarak aktarıldığını söylüyor. Bu, bütün eski kursların taşındığı anlamına gelmez. Aynı rehberde arşiv kurslarının uygulamada olmadığı açıklamasıyla, eski mobil senkronizasyon talimatları yan yana duruyor: sayfa içi eski talimatlar da eleştirel okunmalı. [Güncel topluluk rehberi](https://explore.memrise.com/community-courses)

2026 güncelleme yazısında eski ana deneyim “self-study courses” olarak anılıyor. Podchats orta/ileri İngilizce konuşmasına yönelik; Stories için İspanyolca, Fransızca, İngilizce ve Almanca açıklanıyor. Bunları her dilde eşit kapsamlı tek bir müfredat sanmamak gerekir. [Ürün güncellemeleri](https://www.memrise.com/blog/changes-to-the-memrise-app)

## 2. Çekirdek öğrenme döngüsü

Ürün yaklaşımı üç bağlantı kuruyor: kelimeyi öğrenmek, gerçek bağlamda duymak ve iletişimde kullanmak. 2025 ekip anlatımı My Lessons'ı kelime, telaffuz, video ve konuşmayı bağlayan oturum olarak tanımlıyor. My Journey anlatımında tanınan, bağlamda anlaşılan ve konuşmada kullanılan kelimeler ayrıştırılıyor. [Ekip tanıtımı](https://www.memrise.com/blog/team-update-full-walkthrough)

**Çıkarım:** Asıl tasarım değeri, farklı modları aynı menüde toplamak kadar, aynı hedef kelimeleri bu modlar arasında taşıyabilmek. Bu, kamuya açıklanmış bir veritabanı şeması iddiası değildir.

## 3. Hangi kelimeler çalışılıyor?

2025 Wordlists belgesinde bir dil için tek aktif liste anlatılıyor. Liste değiştirilebiliyor ve ilerleme saklanıyor. Liste, o akıştaki ders ve tekrarların kaynağı olarak tanımlanıyor; bitiş koşulu listedeki kelimelerin öğrenilmesi. “Known” işareti kelimeyi Learn/Review'dan çıkarıyor; “Difficult” fazladan çalışmayı önceliklendiriyor. [Wordlists](https://memrisebeta.zendesk.com/hc/en-us/articles/35854605720977-What-are-Wordlists)

**Sınır:** Bunu 2026 ürününün bütün ekranları için evrensel kuyruk kapsamı saymıyoruz. Aktif liste değiştiğinde eski listelerin vadesi gelen kelimelerinin küresel kuyrukta nasıl ele alındığı, erişilen belgelerle kesinleşmedi. Diloloji'de kapsam kullanıcıya açık yazılmalı.

## 4. İlk öğrenme ve çiçek mantığı

Klasik sistemin yardımında yeni bir kelime, öğrenme testleriyle çiçek açma hedefine bağlanıyor. Çoktan seçme, yazma, sözcükleri sıralama ve dinleme türleri var. [Klasik yeni kelime öğrenme](https://memrise.zendesk.com/hc/en-us/articles/360016181397-How-can-I-Learn-New-Words-on-the-website)

Ayrı tarihsel açıklama normal maddeler için 6, orta kolaylıktakiler için 4, kolaylar için 3 test anlatıyor. Kolaylık, önceki öğrencilerin doğruluğundan kestiriliyor; kullanıcı kolay maddede hata yaparsa kendisi için normal sürece dönebiliyor. Eşik yüzdeleri açıklanmıyor. [3/4/6 test açıklaması](https://memrise.zendesk.com/hc/en-us/articles/360015974638-Why-am-I-only-tested-3-or-4-times-instead-of-6-on-some-items)

**Öneri:** Filiz, öğrenmenin okunabilir görseli olabilir. “Çiçek açtı” = “artık kalıcı olarak unutmazsın” veya “dili konuşabiliyorsun” denmemeli. İlk edinim, uzun vadeli hatırlama ve üretim farklı kanıtlar gerektirir. Mevcut Diloloji filiz aşamaları gerçek öğrenme durumuna bağlanmalı; altı doğru cevap sayacına çevrilmemeli.

## 5. Tekrarın zamanı: belgelenmiş SRS

13 Mayıs 2024 tarihli resmî ana ürün belgesindeki aralıklar:

`4 saat → 12 saat → 24 saat → 6 gün → 12 gün → 48 gün → 96 gün → 6 ay`

Doğru cevap daha uzun aralığa geçiriyor; yanlış cevap ilk aralığa, yani 4 saate döndürüyor. Bunlar ardışık bekleme aralıkları olarak sunuluyor; başlangıç gününden itibaren mutlak tarihler değildir. [SRS belgesi](https://memrisebeta.zendesk.com/hc/en-us/articles/24998764126097-How-does-the-spaced-repetition-system-work)

**Sınır:** Bu kamuya açıklanan takvimdir; güncel sunucunun bütün kullanıcılar için birebir böyle çalıştığı, FSRS/SM-2 kullandığı, yanıt süresini nasıl ağırlıklandırdığı veya hatada oturum içi tekrarın tam sırası doğrulanmış değildir. İncelenen belgelerde bu ayrıntılar yok. Bir doküman takvimi, algoritma kaynak kodu yerine geçmez.

## 6. Sıradaki etkinliği seçmek başka bir karar

My Lessons yardımına göre sistem etkinlik türlerini 15 adıma kadar önceden planlayabiliyor; gerçek kelime, video ve konuşma içeriği ilerledikçe yükleniyor. Learn, Review, Sentence Builder, Pronunciation, video ve konuşma birlikte bulunuyor. Çoğu etkinlik atlanabiliyor; bazı başlangıç öğrenmeleri hariç. İçeriği olmayan ilk adımda, örneğin sıfır kelimelik Review'da, geçiş/alternatif sunuluyor. [Lessons](https://memrisebeta.zendesk.com/hc/en-us/articles/35854655370385-What-are-Lessons)

**Çıkarım:** Kelimeyi ne zaman hatırlatacağını hesaplamak ile bugünkü dersin modunu seçmek iki ayrı karar katmanı. Diloloji önerisi: mevcut tekrar motoru korunurken üstüne süre, kullanıcı hedefi, uygun içerik ve izin durumunu dikkate alan bir etkinlik akışı tasarlanabilir. Memrise'in yayımlanmamış öncelik formülünü bildiğimiz iddia edilmemeli.

## 7. Test biçimleri aynı beceriyi ölçmez

Resmî test belgesi dört aile anlatıyor: parçaları sıralama, yazma, dört seçenekten çeviri seçme, sesten yazma/seçme. [Test türleri](https://memrisebeta.zendesk.com/hc/en-us/articles/4578351044625-What-features-and-modes-are-available-in-the-app-How-will-I-be-tested)

Classic Review'da bu türlere anlama testi de ekleniyor; solan çiçeği tekrar açtırma anlatımı kullanılıyor. [Review](https://memrisebeta.zendesk.com/hc/en-us/articles/4628866100881-What-is-Review-mode)

Difficult Words, geçmiş hatalar ve elle işaretlemeyle sorunlu maddelere yoğunlaşıyor; yazmada destek sunabiliyor. [Difficult Words](https://memrisebeta.zendesk.com/hc/en-us/articles/4629328871953-What-is-Difficult-Words-mode)

2024 Speed Review açıklaması zaman baskısı, üç can, yanlış/süre dolumunda can kaybı ve 15 ardışık doğruda ek can içeriyor. Bu, tarihli mod davranışıdır; yeni sürümlerde aynı skor sisteminin her yerde kaldığı sonucu çıkarılmaz. [Speed Review](https://memrisebeta.zendesk.com/hc/en-us/articles/4629148290961-What-is-Speed-Review)

**Öneri:** Seçeneği tanımak, ipuçsuz yazmak ve konuşmada üretmek ayrı tutulmalı. Hızlı tur sonucu tek başına konuşma başarısı veya kalıcı ustalık sayılmamalı. Motor güncellemesinde hangi cevapların zamanlayıcıya kanıt sayılacağı açık olmalı; aynı oturumda çok sayıda kolay seçim testi uzun vadeli başarıyı şişirmemeli.

## 8. Videolar rastgele içerik tüketimi değil

2024 Videos yardımında videolar bilinen kelime kapsamına göre gruplandırılıyor; düşük kapsamda önce ilgili kelimeleri öğrenme öneriliyor. Transkript/altyazı desteği içeriğe göre değişiyor. İzleme sonunda “ne kadar anladın?” soruluyor; düşük anlayış bildirimi yeni kelime çalışmasına yönlendiriyor. [Videos](https://memrisebeta.zendesk.com/hc/en-us/articles/10519006261265-What-is-the-Videos-tab)

**Çıkarım:** Bu hem içerik hazırlama hem de geri besleme döngüsü. Bilinen kelime oranı gerçek dinleme anlayışıyla aynı ölçüm değildir: hız, bağlama özgü anlam ve deyimler de etkiler. Diloloji'de video olmadan da metin + lisanslı/doğru ses kaydıyla benzer bağ kurulabilir. Kaynak hakları ve transcript–kelime eşleşmesi içerik üretiminin parçasıdır.

## 9. Konuşma ve telaffuz

MemBot konuşma yardımında gerçek durum alıştırması, önerilen yanıtlar ve dilbilgisi düzeltmeleri açıklanıyor. Yanıtları gerçek kişi üretmiyor; resmî metin de AI'nin hata yapabileceğini belirtiyor. [Conversations](https://memrisebeta.zendesk.com/hc/en-us/articles/10517737383953-What-is-the-Conversations-tab)

AI Buddies; gramer, rol yapma, çeviri, kültür ve fiil çekimi gibi amaçlara ayrılıyor. 2025 belgesi Pro erişimi ve kaynak/hedef dil kısıtları veriyor; Türkçe arayüzden öğrenen kişinin aynı araçlara eriştiği varsayılmamalı. [AI Buddies](https://memrisebeta.zendesk.com/hc/en-us/articles/29222065964817-Introducing-AI-buddies)

Kelime bilgi ekranında anlam/literal anlam, durum, yazı sistemi, gerçek ses/video ve desteklenen maddelerde telaffuz pratiği var. Medya ve Pronunciation Buddy kapsamı her dil/maddede aynı değil. [Word Information](https://memrisebeta.zendesk.com/hc/en-us/articles/34228239196177-What-is-Word-Information)

**Öneri:** Diloloji'de kayıt, sesin yazıya çevrilmesi, telaffuz puanı ve anlamca doğru cevap ayrı durumlar olmalı. Ses tanımanın kelimeyi yazması tek başına iyi telaffuz kanıtı değildir. Aynı hedef kelimeyi öğrenme → dinleme/okuma → görevli konuşmada kullanma zinciri, boş sohbetten daha değerlendirilebilir bir görev sunar.

## 10. İlerleme ve motivasyon

My Activities, öğrenilen/tekrar edilen kelimeleri, izlenen/anlaşılan videoları ve tamamlanan konuşmaları izliyor; kendi başına bildirim göndermeyen bir yansıtma alanı. [My Activities](https://memrisebeta.zendesk.com/hc/en-us/articles/34227724083857-What-is-My-Activities)

Eylül 2025 geçiş rehberi puanların kaldırıldığını, Scenarios yerine Wordlists geldiğini ve mini-player seçiminin My Lessons'a taşındığını söylüyor. Eski puanlı sürüm açıklamalarını güncel motivasyon modeliyle karıştırmamak gerekir. Bu tek belge, ürünün bütün yüzeylerinde seri/can bulunmadığını kanıtlamaz. [Yeni deneyim rehberi](https://explore.memrise.com/new-experience)

My Words, öğrenmeye başlanmış ve öğrenilmiş maddeleri topluyor; known/difficult kontrolü ve tekrar modlarına erişim sunuyor. [My Words](https://memrisebeta.zendesk.com/hc/en-us/articles/24999052105617-What-is-the-My-Words-feature)

**Öneri:** Diloloji'de XP/rozetler kaldırılmak zorunda değil. Bunun yanında “bugün yaptım”, “zaman geçince hatırladım” ve “bir görevde kullanabildim” ayrı gösterilmeli. Öz bildirime dayalı anlayış ile testle ölçülmüş başarı açık etiketlenmeli. Etkinlik adedi doğrudan CEFR seviyesi değildir.

## 11. Mems ve bizim görsel çalışmalarımız

Mayıs 2026 resmî güncellemesi kelimeye görsel hafıza çağrışımı ekleyen Mems'i geri getiriyor; görsel AI ile de üretilebiliyor. [Mems güncellemesi](https://www.memrise.com/blog/changes-to-the-memrise-app)

**Öneri:** Kelime çağrışım resmi, avatar/rozet/süs çizimiyle farklı işleve sahip. Çağrışım kişiye özgü olabilir; gramer ve gerçek anlamı çarpıtmamalı. Diloloji'de pahalı ve zorunlu her-kelime resmi yerine isteğe bağlı kişisel hafıza notu denenebilir. Görseli görmek ile kelimeyi ipuçsuz hatırlamak aynı test olmamalı.

## 12. Bilim neyi destekliyor?

Karpicke–Roediger (2008) deneyinde öğrenilmiş yabancı dil kelimelerini tekrar tekrar hatırlamaya çalışmak, gecikmeli hatırlamada belirgin yarar sağlıyor. Sadece yeniden okumakla farkı var. [Yazarın üniversitesindeki özet](https://profiles.wustl.edu/en/publications/the-critical-importance-of-retrieval-for-learning/)

Cepeda ve arkadaşları (2006), 317 deneyde dağıtılmış çalışmayı değerlendiriyor; iyi tekrar aralığının hedeflenen saklama süresiyle birlikte değiştiğini vurguluyor. [Araştırmacının sayfası](https://www.yorku.ca/ncepeda/publications/CPVWR2006.html)

**Sınır:** Bu bulgular Memrise'in belirli gün aralıklarının en iyi olduğunu, AI konuşmasının öğretmenle eşdeğerliğini veya belli ders sayısında akıcılık sağlayacağını kanıtlamaz. Bilimsel ilke desteği ile ürünün etkinlik çalışması farklıdır. İncelenen kaynaklardan Diloloji veya FSRS karşısında doğrudan üstünlük sonucu çıkarılamaz.

## 13. Kullanıcı gözlemleri: soruna işaret eder, yaygınlığı ölçmez

25 Ekim 2026 tarihli Fransızca incelemesinin yazarı doğal kısa videoları ve kısa konuşmaları olumlu buluyor; modların bulunmasını ve web/mobil tutarlılığını eleştiriyor. Yazı affiliate bağlantı açıklaması taşıyor ve başka bir dil ürününün sitesinde yayımlanıyor; tarafsız performans ölçümü sayılmamalı. [Ticari inceleme](https://copycatcafe.com/blog/memrise)

Bir Reddit kullanıcısı yeni listelerde toplu ekleme/görüntüleme sorunları ve eski özel sütunların eksikliğini bildiriyor. Hatanın hâlen sürdüğü veya herkesi etkilediği doğrulanmadı. [Kullanıcı tartışması](https://www.reddit.com/r/memrise/comments/1uo3b5r/now_that_they_have_community_word_lists_on/)

**Öneri:** Özellik sayısından önce keşfedilebilirlik, kayıt güvenilirliği, kaynak/örnek/özel alanların korunması ve sürümler arası ilerleme tutarlılığı doğrulanmalı.

## 14. Diloloji için öncelikli çıkarımlar

Bunlar Memrise'in birebir uygulanacak kuralları değil; araştırmadan çıkan tasarım önerileridir. Güncel Diloloji kaynak/ekran denetimi yapılmadan “sitede eksik” diye işaretlenmemeli.

| Öncelik | Öneri | Kabul göstergesi |
|---|---|---|
| P1 | Bir hedef kelimeyi tekrar, okuma/dinleme ve görevli konuşma arasında bağla | Görev kaynağını ve ilgili kelimeleri görmek, aynı kelimeye dönebilmek |
| P1 | Bugün ekranında sıradaki etkinliğin nedenini ve süresini göster | Kullanıcı ne yapacağını ve nedenini okuyabilir; uygun alternatif bulunur |
| P1 | İlk öğrenme, gecikmeli hatırlama ve kullanım kanıtını ayır | Seçenekli soru başarısı konuşma ustalığı diye gösterilmez |
| P1 | Kısa oturum içinde vadesi gelen tekrar ve yeni kelime yükünü dengele | Yığılmış tekrar varsa yeni içerik kullanıcıya şeffaf biçimde sınırlanabilir |
| P2 | Filizi gerçek aşama/tekrar ihtiyacıyla eşleştir | Animasyon motor çıktısının görseli olur; bağımsız başarı sayacı olmaz |
| P2 | Zor maddeye hedefli destek ve yeniden ölçme sun | İpucu kullanımından sonra bağımsız hatırlama ayrıca kaydedilir |
| P2 | İsteğe bağlı kişisel çağrışım notu | Not anlam/örnek/sesin yerini almaz ve kolayca gizlenebilir |

Örnek öneri oturumu: süreye uygun vadesi gelen tekrar → hedef listeden az sayıda yeni kelime → aynı kelimeleri içeren kısa metin/ses → bu kelimelerle görevli cümle/konuşma → sonuç ve sonraki tekrar. Sayılar ve dağılım öğrenme deneyleriyle belirlenmeli; bu sıra Memrise'in açığa çıkarılmış gizli formülü değildir.

Ürün önerisi için kavramsal veri ayrımı: madde kimliği ve içerik kaynakları; kullanıcıya ait tekrar durumu; görevlerde karşılaşma/kullanım olayları; hatırlama ile ilgili ölçüm; öz bildirim; tamamlanan etkinlik. Mevcut şema genişletilmeden önce hangi verilerin zaten tutulduğu incelenmeli. Bu rapor veri tabanı değişikliği istemez.

## 15. Açık kalan sorular

- 2026 sürümünde gerçek SRS takvimi, kullanılan model ve dil/kullanıcı grubu farkları.
- Oturum içi yanlışların kaç soru sonra geri geldiği; yazım toleransı ve yanıt hızı ağırlıkları.
- Liste değiştirilince global tekrar kuyruğunun davranışı.
- Konuşmada kullanılan kelimeyi sayma, çekim/lemma eşleştirme ve anlama ölçütleri.
- Türkçe kaynak dilli Fransızca/İspanyolca/İngilizce çiftlerinde bütün AI/medya özelliklerinin fiilî erişimi.
- Web/iOS/Android güncel sürümleri arasındaki tam farklar; ücretsiz/Pro sınırları.

Sonraki inceleme, bu soruları test hesabıyla ve zarar vermeyen kontrollü görevlerle doğrulamalı. Özel algoritma veya gizli kod erişimi yapılmadı.

## Ek: değerlendirilip temel alınmayan belge

[Memrise GitHub ürün belgesi](https://github.com/Memrise/memrise-prd/blob/main/README.md) geniş bir özellik ve prototip envanteri sunuyor; eski/yeni ilerleme ve farklı erişim açıklamalarını birlikte içeriyor. Sunucu uygulamasının kaynak kodu değil. Bu raporda fiyat, kesin teknik zamanlayıcı veya tüm dillerde kullanılabilirlik kanıtı olarak kullanılmadı.
