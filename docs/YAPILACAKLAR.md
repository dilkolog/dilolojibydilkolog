# Yapılacaklar — bilimsel temelli eklemeler

Çerçeve: Paul Nation'ın **dört kolu** (anlam odaklı girdi, anlam odaklı çıktı, dil odaklı çalışma,
akıcılık). Uygulama şu an güçlü olarak 3. kolda (aralıklı tekrar, geri çağırma, ayırt etme,
hata bankası). En büyük kazanç diğer üç kolu ve kişiselleştirmeyi güçlendirmekten gelir.

Öncelik: ⭐⭐⭐ yüksek etki / makul iş · ⭐⭐ orta · ⭐ deneysel. İş: S küçük, M orta, L büyük.

## Zaten var (dokunmadan bırakılacaklar)
Aralıklı tekrar (FSRS), test etkisi (geri çağırma), beceri bazlı kartlar (tanıma → üretim),
araya serpiştirme, karışan kelime kontrolü, hata bankası ve sülük müdahalesi, hafıza ipucu,
görsel + ses (ikili kodlama), dikte, konuşma, hikaye modu, metinden kelime çıkarma.

---

## 1. Kişiselleştirme ve hafıza modeli

- [x] ⭐⭐⭐ **FSRS'yi kendi geçmişine göre optimize et** (M)
  Varsayılan FSRS ağırlıkları milyonlarca kullanıcının ortalaması. Birkaç yüz tekrardan sonra
  kişisel ağırlıklar tahmin hatasını belirgin şekilde azaltıyor (FSRS benchmark'ları).
  Olay geçmişi zaten tutuluyor; optimizer (fsrs-browser / wasm) ile haftalık yeniden hesapla.
- [x] ⭐⭐⭐ **Hedef hatırlama oranı ayarı** (S)
  %85–95 arası seçim; düşük = daha az tekrar, yüksek = daha sağlam. Ayarda iş yükü tahmini göster.
- [x] ⭐⭐ **Gerçek vs. tahmini hatırlama grafiği** (S)
  Kalibrasyon eğrisi: "FSRS %90 dedi, sen %84 hatırladın". Modelin doğru çalıştığını görünür kılar.

## 2. Üstbiliş (metacognition)

- [x] ⭐⭐⭐ **Cevaptan önce güven derecesi + hiper-düzeltme** (M)
  Yüksek güvenle yapılan hatalar, düzeltildiğinde en iyi akılda kalanlar
  (Butterfield & Metcalfe 2001). Yazmalı sorularda "emin / tahmin" iki tuşu; emin-yanlışlara
  uzun, karşılaştırmalı geri bildirim ve ertesi gün öncelik.
- [x] ⭐⭐ **Kalibrasyon puanı** (S) — "Emin olduklarının %X'i doğru". Aşırı güveni azaltır.

## 3. Yeni kelimeyi ilk öğrenme anı

- [x] ⭐⭐⭐ **Ön-test (pretesting)** (S)
  Anlamı göstermeden önce tahmin ettir; yanlış tahmin bile sonraki öğrenmeyi artırıyor
  (Kornell, Hays & Bjork 2009; Richland 2009). Tanışma ekranına "Ne olabilir?" adımı.
- [x] ⭐⭐⭐ **Kriterli tekrar (successive relearning)** (M)
  Yeni ve unutulan kelime oturumdan ancak 2–3 kez ayrı aralıklarla doğru çağrılınca çıksın
  (Rawson & Dunlosky 2011–2013). Şu an tek doğru yetiyor mu kontrol et.
- [x] ⭐⭐ **Kendi cümlen (öz-referans + katılım yükü)** (S)
  Kelimeyi kendi hayatından bir cümleyle kaydetme seçeneği (Laufer & Hulstijn 2001'in katılım
  yükü hipotezi; öz-referans etkisi). AI'sız da çalışır, sadece saklanır ve sonra cloze olur.

## 4. Bağlam çeşitliliği ve girdi (1. kol)

- [x] ⭐⭐⭐ **Her tekrarda farklı örnek cümle** (M)
  Aynı bağlam ezber yapar; değişen bağlam aktarımı artırır (kodlama çeşitliliği,
  Pavlik & Anderson; Webb 2007). Kelime başına birden çok örnek; metin içe aktarmadan
  otomatik cümle toplama.
- [x] ⭐⭐⭐ **Okuma modu + kapsama ölçer** (M)
  Bir metinde bilinen kelime oranını hesapla; rahat okuma için ~%95–98 gerek (Hu & Nation 2000).
  Bilinmeyenler vurgulu, tıklayınca ekle. Metin içe aktarmanın üzerine kurulur.
- [x] ⭐⭐ **Cümle madenciliği (i+1)** (M)
  İçe aktarılan metinden *tam bir* bilinmeyen kelime içeren cümleleri ayıkla ve kart yap.
- [x] ⭐⭐ **Karşılaşma sayacı** (S) — Bir kelimeyi bağlamda kaç kez gördün; 8–12 karşılaşma
  hedefi (Webb 2007; Uchihara ve ark. 2019 meta-analizi).

## 5. Diller arası (EN/FR/ES'e özel — en büyük fırsat)

- [x] ⭐⭐⭐ **Kavram kartı: üç dil yan yana** (M)
  "advice / conseil / consejo" bağlantısı. Bir dildeki bilgi diğerine köprü olur (soydaş
  kolaylaştırması). Kelime ağına diller arası kenar.
- [x] ⭐⭐⭐ **Soydaş ve sahte dost tespiti** (M)
  Soydaşlar hızlı öğrenilir, onları ucuza geçir; sahte dostlar (EN *actually* / FR *actuellement*,
  ES *embarazada*) aktif girişim kaynağı — ayırt etme sorusuna sok. Basit benzerlik + elle liste.
- [x] ⭐⭐⭐ **FR/ES cinsiyet (artikel) alıştırması** (S)
  Artikel şu an sadece gösteriliyor. "le/la", "el/la" seçme sorusu + renk kodu
  (cinsiyet hataları ileri düzeyde bile kalıcı). Ayrı bir beceri kartı olabilir.
- [x] ⭐⭐ **Fiil çekim mini-alıştırması** (M) — sık fiiller için zaman/şahıs çekimi. 2026-10-05: FR 6, ES 7 zaman; kelime sayfasında sekmeler, oturumda kademeli açılma, Oyunlar → Çekim antrenmanı.

## 6. Dinleme ve telaffuz

- [x] ⭐⭐⭐ **Yüksek değişkenlikli ses (HVPT)** (S)
  Aynı kelimeyi farklı seslerle dinletmek tanımayı genelleştirir (Logan, Lively & Pisoni 1991;
  Thomson 2018). Sistemdeki birden çok sesi rastgele kullan.
- [x] ⭐⭐ **Minimal çift ayırt etme** (M) — FR *u/ou*, *dessus/dessous*; EN *ship/sheep*; ES *pero/perro*.
- [x] ⭐⭐ **Gölgeleme (shadowing)** (S) — örnek cümle çalınır, kaydedersin, art arda dinlersin
  (AudioRecorder zaten var).
- [x] ⭐ **Hız kademesi** (S) — doğru oldukça dinleme hızı 0.8 → 1.0 → 1.15.

## 7. Akıcılık (4. kol)

- [x] ⭐⭐⭐ **Akıcılık turu** (S)
  Sadece iyi bilinen kelimelerle, zaman baskısıyla hızlı geri çağırma (Nation'ın 4/3/2 mantığı).
  Amaç bilgi değil otomatikleşme; cevap süresini takip et ve ilerlemeyi göster.
- [x] ⭐⭐ **Tepki süresini zorluk sinyali yap** (S) — doğru ama yavaşsa "kırılgan" say.

## 8. Çıktı (2. kol)

- [x] ⭐⭐ **Geri anlatım** (M, AI) — hikaye bölümünü kendi cümlelerinle özetle; hedef kelimeler
  kullanıldı mı kontrol et (Swain'in çıktı hipotezi).
- [x] ⭐⭐ **Ters çeviri** (M, AI) — Türkçe cümleyi hedef dile çevir, sonra orijinalle karşılaştır.

## 9. Zamanlama, uyku, alışkanlık

- [x] ⭐⭐ **Uyku öncesi kısa tekrar + sabah kontrolü** (S)
  Öğrenmeden sonra uyku pekiştirmeyi destekliyor (Diekelmann & Born 2010). Akşam hatırlatıcısı
  "yeni kelimeleri şimdi gözden geçir", sabah ilk 5 soru onlardan.
- [x] ⭐⭐ **Uygulama niyeti (if-then planı)** (S)
  "Ne zaman ve nerede çalışacağım" sorusunu bir kez sor, hatırlatıcıyı ona bağla
  (Gollwitzer & Sheeran 2006 meta-analizi, orta-büyük etki).
- [x] ⭐ **Kısa oturum önerisi** (S) — uzun tek oturum yerine 2–3 kısa oturum (dağıtılmış pratik).

## 10. Kelime seçimi

- [x] ⭐⭐ **Sıklık bandı etiketi** (M)
  Kelime eklerken "ilk 1000 / 3000 / 10000 / nadir" etiketi (açık frekans listeleri).
  Sık kelimeler daha çok getiri sağlar (Nation 2006); öncelik sıralamasında kullan.

---

## Önerilen sıra
1. ~~Hızlı ve etkili: ön-test, artikel alıştırması, HVPT, akıcılık turu, hedef hatırlama ayarı.~~ (yapıldı)
2. ~~Orta: güven + hiper-düzeltme, kriterli tekrar, değişen örnek cümle, soydaş/sahte dost.~~ (yapıldı)
3. ~~Büyük: FSRS optimizasyonu, okuma modu + kapsama, kavram kartları.~~ (yapıldı)
4. AI gerektirenler (geri anlatım, ters çeviri) yazıldı; anahtar girilince uçtan uca denenecek.

## Açık kalanlar
- EN için fiil çekimi yok; kullanıcı istemiyor (2026-10-05), eklenmeyecek.
- **Azure telaffuz değerlendirmesi:** yapıldı (2026-10-06): Ayarlar > Ses'te anahtar ve bölge,
  kelime sayfasında "Söyle ve puanla". Sonraya bırakılanlar: oturumdaki konuşma sorularına
  Azure puanı, telaffuzu zayıf kelimelerin ayrı alıştırma listesi.
- **İçe aktarmada liste/seviye seçimi** (CSV, Kindle, metin; kitaptan aktarınca listeyi kitap
  adıyla oluşturmak): kullanıcı şimdilik istemedi (2026-10-06).
- **AI ile kişisel cümle bankası** (sonraya, 2026-10-06): her yeni kelime için kullanıcının
  ilgi alanlarına (profildeki hedeflere) göre 2–3 örnek cümle üretip karta eklemek. Kendine
  dair cümleler daha iyi hatırlanır (öz-referans etkisi). AI anahtarı var; maliyeti düşük.
- **Oturum sonunda AI'dan tek cümlelik yorum** (sonraya, 2026-10-06): o oturumun hatalarından
  ("le/la ayrımında 3 hata; dişil -ette sonlarına dikkat") kısa, somut bir öneri. Hata verisi
  zaten tutuluyor; yalnızca özetlemek gerekiyor.
- **Eşitleme izin listesini açmak** (sonraya, 2026-10-07; kullanıcı "daha sonra yaparız" dedi): kod hazır
  (`api/_allow.ts`, PR #11; bildirim kayıtları da aynı listeye bağlı). Açmak için Vercel'de `SYNC_ALLOWED` ortam
  değişkenine kullanıcı adı (ve varsa eşitleme kodunun kimliği) yazılır; boşken her şey açık. Yanlış ad yazılırsa
  kendi eşitlemen kapanır: önce kullanıcı adını doğrula.
- **Hesap, giriş ve erişim güvenliği** (sonraya, 2026-10-08; kullanıcı "ileride döneceğiz" dedi).
  Durum: hesap = kullanıcı adı + şifre, şifreden iki anahtar türetilir (veri şifreleme + sunucu
  erişimi); sunucu (`api/sync.ts`) yalnızca şifreli blob saklar. Kayıt herkese açık, kullanıcı
  adını ilk yazan sahiplenir. AI, kullanıcının kendi Anthropic anahtarıyla tarayıcıdan çağrılır;
  anahtar yalnızca IndexedDB'de durur (yedeğe ve senkrona girmez).
  Karar: kullanıcı teoride tek kullanıcı; amaç başkasının önemli şeylere (özellikle API anahtarı)
  erişmemesi. "Hesap + onay paneli + sunucu AI aracısı" şimdilik gereksiz bulundu.
  Seçenekler, küçükten büyüğe: (1) sunucuda hesap izin listesi (ortam değişkeni; listede
  olmayan kayıt olamaz/yazamaz; depolamayı ve ad kapmayı önler), (2) AI sunucudan geçerse
  anahtar yalnızca ortam değişkeninde, (3) isteğe bağlı uygulama kilidi (anahtarı parolayla
  şifreli sakla), (4) isteğe bağlı anahtarı şifreli hesap verisiyle cihazlar arası taşı,
  (5) Anthropic konsolunda uygulamaya ayrı anahtar + harcama sınırı.
  Başkalarına açılırsa: bekleyen/onaylı/askıda durumları, oturum jetonu, yönetici ekranı, sunucuda
  kota, şifre kurtarma anahtarı (e-posta veri kurtarmaz), AI için gizlilik metni güncellemesi.
  Dönmeden önce sorulacaklar: ileride başkalarına açılacak mı, birden çok cihaz var mı.

- **Sözlük paketi** (2026-10-07, büyütüldü): sıklık listesinin ilk 20 000 girdisi; listede çekimli biçim varsa
  (altyazı listesi: "allons") ait olduğu kelime girer ve biçim `f` tablosunda tutulur (sözlükte "allons" → aller).
  EN 16 476, FR 10 556, ES 9 383 kelime; Türkçe anlamlı kelime sayısı %20–65 arttı. Her kelimede tür (p) ve
  FR/ES isimlerde cinsiyet (g) var; listedeki "other" türlü kelimeye ve cinsiyetsiz isme pakettan dolar (Lexique
  kuralıyla aynı: kullanıcının seçtiğinin üstüne yazılmaz). Form tablosu yalnızca aramada kullanılır, listedeki
  kelimeyi başka kelimenin verisiyle doldurmaz. Yeni dökümlerde çeviri tabloları anlamların içinde
  (`senses[].translations`); anlamlar kelimenin kendi tanımlarındaki sıraya göre, kaba/hakaret etiketli anlamlar
  alınmıyor. Paketler düz JSON (gzip EN 1,8 MB, FR 0,9, ES 0,8): kurulum indirmesine girmiyor, dil ilk gerektiğinde
  iniyor ve `word-packs` önbelleğinde offline kalıyor. Yeniden üretirken sürümü değiştir (`applyPack` yalnızca
  sürüm değişince uygular); boyut için `LIMIT=…`.
  İspanyolca ses kayıtları Lingua Libre'den (Commons, `scripts/fetch-commons-audio.ts` → `*.audio.json`): %0 → %65.
  Örnek cümleler: en sık 3000 kelimeye ikişer Tatoeba cümlesi Türkçesiyle (`scripts/build-pack-sentences.ts`, `c` alanı);
  sözlük kartı bunları hemen ve internetsiz gösterir, internet varsa Tatoeba'nın zengin hâli yerine geçer.
- **Türkçe Vikisözlük ikinci kaynak** (2026-10-07): kaikki.org/trwiktionary dökümü (EN/FR/ES kelimeleri Türkçe
  tanımlı). Sıra: Türkçe editörlerin kelimenin ana türündeki kısa karşılıkları → İngilizce üzerinden pivot → diğer
  türlerdeki karşılıklar → Türkçe maddelerin çeviri tablolarından ters karşılık. Özel ad, kısaltma açılımı,
  büyük harfle başlayan ve tanım gibi uzun açıklamalar alınmaz. İngilizcede Türkçe anlamlı kelime %49 → %59 (1 743 yeni).
- **Sözlükte düzeltme ve bakılan kelimeler** (2026-10-07): sözlük kartında "Anlamı düzelt" (kendi anlamların
  paketinkinin yerine gösterilir, paketteki altta kalır; dil başına `dict:<dil>`, yedeğe ve eşitlemeye girer).
  Kartı 1,5 sn açık kalan kelime "bakıldı" sayılır; 2 kez bakılıp listede olmayan kelime Bugün'de tek tek önerilir
  (boş listede de), "×" bir daha önermez.
- **Geri dönüş noktaları** (2026-10-07): sunucu, eşitlenen çekirdeğin üzerine yazmadan önce günün ilk hâlini
  `sync/<id>/h-<gün>.bin` olarak saklar (şifreli, son 7 gün; eskisi silinir, istemci yazamaz). Ayarlar → hesap /
  eşitleme kodu altında "Geri dönüş noktaları" → "Bu güne dön": o günkü kopya yerel veriyle birleştirilir
  (`restoreFrom`); o gün olan kayıtlara `alive` işareti konur, böylece sonradaki silmeler diğer cihazlarda da geri
  alınır, sonradan eklenenler kalır.
- **Paralel cümleler** (2026-10-07): yapıldı. Tatoeba sorgusu `showtrans:lang=tur,<diğer iki dil>` ile
  (`showtrans` yalnızca all/none/matching alır ve `showtrans:lang` ile birlikte kullanılamaz). Gerçek
  cümlelerin altında diğer iki dildeki hâli görünür (`Example.parallel`). Önceden getirilmiş cümlelere
  arka planda, Tatoeba kimliğiyle tek tek sorularak eklenir (`fillParallel`, çalışma başına 24 cümle); liste ve
  sıra değişmez, bulunamayana boş `{}` yazılır ki tekrar sorulmasın.
- Cümle zorluğu (i+1): cümleler sıklık listesi ve kullanıcının kendi kelimeleriyle derecelenir
  (`engine/sentenceFit.ts`). Liste son tam derecelendirmeden bu yana onda bir (en az 10 kelime) büyüyünce
  bütün kayıtlı cümleler yeniden derecelendirilir (`needsRescore`, 2026-10-07); yalnızca sırası değişen kelimeler yazılır.

## Fiil laboratuvarı (2026-10-06)
- [x] Pratik → Fiiller: öğrenme, alıştırma (yaz/seç/dinle/eşleştir/zamanı bul/hangi fiil), FSRS tekrarı, kalıplar (fiil aileleri), zamana karşı, kıyaslama, ustalık ve fiil bahçesi. Çekim oyunları buraya taşındı.
- [x] Lab verisi (favoriler, tekrar, bahçe) ve oyun rekorları yedeğe ve eşitlemeye girdi.
- [x] Passé simple (2026-10-07): 4103 fiilin 4094'ünde; traire, extraire, absoudre gibi eksik (defective) fiillerde yok. Yalnızca laboratuvarda; Türkçeden zaman bulma sorusunda sorulmaz ("açtı" passé composé ile aynı).
- [x] Emir kipi (2026-10-07): laboratuvarda ayrı kip ("Emir kipi"); alıştırmalar yalnızca olan kişileri sorar (`personsOf`: FR tu/nous/vous, ES tú/usted/nosotros/vosotros/ustedes). Biçimler veriden türetilir (FR présent + sois/aie/sache/veuille, dönüşlüde lève-toi; ES tú présent'ten ya da di/haz/ve/pon/sal/sé/ten/ven ve bileşikleri, usted/nosotros/ustedes subjuntivo, vosotros -d, ir → vamos/id). Olumsuzu ayrı: ES no + subjuntivo, FR ne te lève pas. İspanyolca dönüşlü emir (levántate: vurgu kayar) yok. "Hangi fiil?" ve okumadaki biçim çözümlemesi emir kipini kullanmaz (biçimleri présent'inkiyle aynı).
- [x] "Metinde gördüğün çekimler" (2026-10-07): okuma bitirilince metindeki fiil çekimleri laboratuvara kaydedilir (`LabData.seen`, fiil başına en çok 24 biçim, eşitlemede birleşir); Ustalık'ta "Metinlerde gördüklerin" (biçim · zaman · kaç kez · hangi metin, dokununca o zamanı alıştırır) ve "Metinlerde en çok gördüğün fiiller".
- [x] Gerçek sözlük paketini internetli ortamda derlemek (scripts/build-wordpack.ts).

## 2026-10-07 ve 2026-10-08 Geliştirmeleri (#64–#93)
- [x] **Sözlük ve İçerik Genişletme (#64–#70):**
  - #64: İspanyolca ses kayıtlarının Lingua Libre / Commons üzerinden pakete eklenmesi (%0 → %65).
  - #65: Sözlük paketinin büyütülmesi (20.000 kelime, çekimli formlar `f` tablosu, zengin Tatoeba örnekleri).
  - #66: Kişisel sözlük büyümesi: sözlükte anlam düzeltme (`dict:<dil>`), bakılan kelimelerin takibi ve Bugün ekranında önerilmesi.
  - #67: Sözlük aramasında AI ile keşif ve anlam bulma desteği.
  - #68: Dinleme kütüphanesine podcast ve ses kaynaklarının eklenmesi ve genişletilmesi.
  - #69: Vikidia entegrasyonu ile kolay Fransızca/İspanyolca makalelerin okuma kütüphanesine eklenmesi.
  - #70: Klasik kamu malı okuma metinleri koleksiyonu (Ezop, La Fontaine, Samaniego; çevrimdışı).
- [x] **Fiil Laboratuvarı Geliştirmeleri (#71–#77):**
  - #71: Ayarlar → Kullanım ekranında fiil lab sekme ve mod sayaçları.
  - #72: Okuma metnindeki çekimli fiilden laboratuvara doğrudan geçiş köprüsü.
  - #73: Bugün ekranında Günün Fiili kartı.
  - #74: Çekim tablolarında 4 temel zamanda Türkçe form karşılıkları.
  - #75: Ustalık sekmesinde haftalık başarı oranı grafiği.
  - #76: Tablo üzerinde kaydırarak (swipe) zaman değiştirme.
  - #77: Ezber modu (Biliyorum/Bilmiyorum) ve ustalığa katkısı.
- [x] **CI ve Tasarım Sistemi (#78, #79):**
  - #78: CI dakikaları optimizasyonu (tek iş, tarayıcı önbellekleme, salt doküman değişikliklerini atlama).
  - #79: `DESIGN.md` tasarım sistemi rehberi (renk, tipografi, hareket tokenları ve bileşen standartları).
- [x] **Kişisel Öğrenme Analizi İyileştirmeleri (#80–#85):**
  - #80: Oyunlarda zamanı gelen kelimeler gerçek tekrar sayılır ve önceliklendirilir.
  - #81: Oyunlar sekmesinde "Önce bugünkü tekrarlar" uyarısı ve başlatma butonu.
  - #82: Okuma modunda sona gelindiğinde kelime karşılaşmalarının otomatik kaydedilmesi.
  - #83: Arama motoru robotlarının engellenmesi (robots.txt, meta noindex).
  - #84: Deyim ve kalıpların çoktan seçmeli yerine kendi cümlesinde bağlamla sorulması.
  - #85: Zamana karşı (Blitz) oyununda isteğe bağlı klavyeden yazma modu.
- [x] **Görsel Dokunuşlar ve Altyapı (#86–#89):**
  - #86: Kayan sekme göstergesi, kombo patlaması efekti, seviye rozeti animasyonu, okumada seçili cümlenin aydınlatılması.
  - #87: Kullanılmayan kodların temizliği, uygulama temasına uygun paylaşım kartı tasarımı.
  - #88: Sözlük dizini hızlandırma (paket dizini tek seferde derlenir).
  - #89: `AGENTS.md` devir teslim notunun güncellenmesi.
- [x] **Fiil Laboratuvarı Sadeleştirme ve Token Dönüşümleri (#90–#93):**
  - #90: Günlük tur modu (kişiselleştirilmiş 4-6 soruluk hızlı fiil turu, `labTour.ts`).
  - #91: Satır içi stillerin `index.css` sınıflarına taşınması.
  - #92: Kategori renklerinin `--cat-*` tokenlarına alınması (açık/koyu/sakin temalar).
  - #93: Fiil laboratuvarının 3 sekme ve 4 odaklı moda sadeleştirilmesi.

## 2026-10-08 ve 2026-10-09 Geliştirmeleri (#100–#124)
- [x] **Rozetler (#103, #105, #107, #109, #110, #112):** kazanılma tarihi kalıcı (geri yüklemede yeniden kutlama yok), kademeli rozetler (75 kart → 37), öğrenmeyi ödüllendiren yeni rozetler, oturum özetinde "sıradaki rozet", Profil'de zaman tüneli, metin denetimi.
- [x] **Çeviri (#111, #113, #114):** DeepL ile cümle çevirisi (sunucuda anahtar, her cihazda hazır), Çeviri ekranı (kısa metin, cümle cümle yan yana, kart yap, kelimelerime ekle), çeviri belleği (yedek + eşitleme), eksik çevirileri doldurma, okumada "Cümlenin Türkçesi".
- [x] **Metin birliği (#115):** "Kelimelerime ekle", "Kelimelerinde", "İşaretlenenler".
- [x] **Bugün sadeleşti (#116):** uzun günde yeni kelimeyi 8'e indirme önerisi, aynı anda tek öneri, ek çalışma günün tekrarları bitince.
- [x] **Dinlerken cümle takibi (#118):** duyulan cümle aydınlanır; "Bu cümleden dinle". SRT/VTT'li beslemelerde kesin, diğerlerinde yaklaşık.
- [x] **Okumada "Türkçesi" (#120):** her paragrafın altında Türkçesi; yalnızca ekrana gelen paragraflar, sırayla çevrilir.
- [x] **Geri çeviri ve dikte (#122):** çeviri belleğindeki cümleler Türkçesinden yazılır ve cümle kartı olur; okunan metin cümle cümle dikte edilir (kayıttan ya da cihaz sesiyle), sonunda kaçırılan kelimeler.
- [x] **Bugün'de cümle çalışması (#124):** günün tekrarları bitince cümle kartı tekrarı ya da geri çeviri önerilir.
- [x] **Altyapı (Antigravity: #101, #102, #104, #106, #108, #117, #119, #121, #123):** erişilebilirlik etiketi, birim testleri, klasik metinler, belge güncellemeleri, Fast Refresh uyarıları, kararsız E2E düzeltmesi.

## Sıradaki Olası İşler ve Açık Kalanlar (Güncel Durum)
- **Yeni alıştırmaların etkisi:** Kullanıcı 1–2 hafta sonra yedek verince geri çeviri ve diktenin kullanımı, dikte hataları ve cümle kartlarının tutma oranı incelenecek.
- **Fiil laboratuvarı mod sadeleştirmesi:** Ayarlar → Kullanım ekranındaki sayımlara bakılarak hiç kullanılmayan modların sadeleştirilmesi (birkaç hafta veri birikince).
- **Görsel test referansları:** GitHub Actions kotası açıldığında `gh workflow run snapshots.yml --ref main` ile Linux referans ekran görüntülerinin yenilenmesi (#86 sekme göstergesi, #81 Oyunlar notu, #85 Zamana karşı, #116 Bugün, #120/#122 okuma araç satırı ve Oyunlar değişti).
- **Kullanıcıya önerilen ama onun yapacağı:**
  - Ayarlar'da günlük yeni kelimeyi 20'den 5–8'e indirmesi (#52 birleşince Ayarlar "N yap" önerir).
  - İsterse yedek dosyasını (Ayarlar → Veriler → Yedeği indir) proje klasörüne koyup kişisel öğrenme analizi istemesi.


