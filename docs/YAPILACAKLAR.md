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
- **Azure telaffuz değerlendirmesi:** yapıldı (2026-10-06; #204): Ayarlar > Ses'te anahtar ve bölge,
  kelime sayfasında "Söyle ve puanla", Oyunlar'da "Telaffuz çalışması" listesi (`PronPractice.tsx`, `pronWeak.ts`; puanı <75 olanlar). Oturumdaki konuşma sorularına puanlama opsiyonel bırakıldı.
- **İçe aktarmada liste/seviye seçimi:** yapıldı (#204): Toplu ekle, metinden, Kindle ve Google Çeviri içe aktarmalarında liste ve seviye seçimi veya yeni liste oluşturma (`useImportList.ts`, `ImportPlacement.tsx`).
- **AI ile kişisel cümle bankası:** yapıldı (#204): her kelime için kullanıcının ilgi alanlarına ve hedeflerine göre 3 örnek cümle üretip tek tıkla karta ekleme (`PersonalSentences.tsx`, öz-referans etkisi).
- **Oturum sonunda AI'dan tek cümlelik yorum:** yapıldı (#200): oturumun hatalarından örüntü analizi ve tek tıkla AI koç yorumu (`SessionNote.tsx`, `sessionNote.ts`).
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
- [x] **Kaçırdıkların (#125):** dikte hataları kaydedilir; Oyunlar'da kendi cümleleriyle dinle-yaz, İlerleme'de kart. Telefonda yapışık öğeler üst çubuğun altına girmez.
- [x] **Gölgeleme (#127):** Okuma → Gölgele, cümle cümle, kaydın kendi sesiyle (yoksa cihaz sesi).
- [x] **CEFR seviyeleri (#129):** FLELex/ELELex; kelime ayrıntısı, sözlük, İlerleme'de seviye kapsamı, eksik kelimelerde seviye.
- [x] **Yazma denetimi (#131):** LanguageTool ile yazım ve dil bilgisi (AI gerekmez).
- [x] **Kaynak listeleri (#130, Antigravity):** `docs/kaynaklar/`.
- [x] **Kolay resimli hikâyeler (#133):** 58 sesli hikâye (FR/ES), sayfa resimleri ve kendi Türkçeleriyle.
- [ ] ~~Metin seviyesi rozeti~~: denendi, kısa metinlerde güvenilir çıkmadı (konuya özgü kelimeler listelerde yok); yapılmadı.
- [x] **Altyapı (Antigravity: #101, #102, #104, #106, #108, #117, #119, #121, #123):** erişilebilirlik etiketi, birim testleri, klasik metinler, belge güncellemeleri, Fast Refresh uyarıları, kararsız E2E düzeltmesi.

## 2026-10-10 Geliştirmeleri (#153–#201)
- [x] **Kullanılabilirlik ve Tasarım İyileştirmeleri (#153, #155, #158, #159):**
  - #153: Çevrimdışı göstergesi (`OfflineBadge.tsx`, sakin üst rozet).
  - #155: Alt sekmelerin görünürlüğü (seçili sekme göstergesi ve kaydırma ipucu).
  - #158: İlerleme ekranında katlanan kartların seçimini hatırlama (`GroupToggle`, `useGroups.ts`).
  - #159: Çoklu CEFR filtresi ve sözlük düzeltme notunun keşfedilebilirliği (dokunsal kalem daveti).
- [x] **Kod Tabanı Modülerleştirme (#160, #161, #170):**
  - #160: `Words.tsx` (1634 satır) modüler bileşenlere ayrıldı (`WordForm`, `WordListView`).
  - #161: `SettingsScreen.tsx` (844 satır) modüler bileşenlere ayrıldı (`StudySettings`, `AnswerSettings`, `SoundSettings` vb.).
  - #170: `Progress.tsx` (655 satır) modüler bileşenlere ayrıldı (`WeekHero`, `ProgressCharts`, `ProgressMemory`, `ProgressTests`).
- [x] **İçerik ve Araştırma (#165, #166, #177, #187, #190, #200):**
  - #165: LibriVox + Gutenberg B1+ sesli kitaplar envanteri (`audiobooks-fr.json`, `audiobooks-es.json`, `README.md`).
  - #166: COERLL dil bilgisi içerikleri araştırma raporu (`docs/kaynaklar/coerll.md`).
  - #177: İkon denetimi raporu (`docs/IKON-DENETIMI.md`) ve telefon koyu tema ekran görüntüleri.
  - TV5Monde ve DELE Ahora içerik kullanım şartları ve telif hakları raporu (`docs/kaynaklar/tv5monde-dele-ahora.md`).
  - #187, #190: LibriVox ses kitapları bölüm bazlı metin-ses eşleştirme (23 doğrulanmış bölüm, `src/data/audiobooks/{fr,es}.json`, `docs/kaynaklar/audiobooks-chapters.md`).
  - #200: Okuma kütüphanesinde LibriVox sesli kitap bölüm seçici bileşeni (`AudiobooksPicker.tsx`).
- [x] **Yeni Özellikler ve Öğrenme Akışı (#182, #188, #192, #195, #200, #204):**
  - #182: Çekim listesi ve fiil tekrarı köprüsü (`textForms.ts`, dönüşlü ve bileşik zamanlar `s'est lavé`, metinde cümlenin aydınlatılması, fiil laboratuvarı tekrar kuyruğuna ekleme).
  - #188: Soru ekranında "Unuttum" butonu (Alt+U, cevabı gösterir, yanlış sayar, `SessionForgot`).
  - #188: Fiil turu kartını sola kaydırarak veya kapat butonuyla gizleme (`useSwipeAway.ts`).
  - #192: Yeni özelliklere kapsamlı birim testleri (`useSwipeAway`, `TourCard`, `TranslateScreen`, `SessionForgot`, `listenFollow`).
  - #195: Marka ve isim güncellemesi: Uygulama adı "Diloloji" olarak güncellendi (`README.md`, `package.json`, browser extension).
  - #200: Oturum sonu yapay zekâ değerlendirme notu (`SessionNote.tsx`, `sessionNote.ts`) ve eşitleme boyutu göstergesi.
  - #204: AI ile kişisel cümle bankası (`PersonalSentences.tsx`), zayıf kelimeler için telaffuz çalışması listesi (`PronPractice.tsx`, `pronWeak.ts`), içe aktarmada liste ve seviye seçimi (`useImportList.ts`, `ImportPlacement.tsx`).
- [x] **Güvenlik Kopyası, Eşitleme Medya Sınırı ve Uçtan Uca Eşitleme Testi (#197, #198, #199, #207):**
  - #197: Eşitlemede 3 MB'tan büyük veya iletilemeyen medyayı atlayıp çekirdek veriyi eşitleme (`SyncResult.skipped`, `SyncSettings` uyarısı).
  - #197: Geri yükleme öncesi cihaz durumunu otomatik saklama (`safetyBackup.ts`) ve Ayarlar → Veriler'de "Önceki hâle dön" ile kurtarma.
  - #198: Cihazlar arası eşitleme çatışma ve birleştirme kuralları (`mergeRules.test.ts`, `syncConflict.test.ts`).
  - #199: Güvenlik kopyası geri alma ve atlanan medya uyarısı için arayüz birim ve a11y testleri (`DataSettings.test.tsx`, `SyncSettings.test.tsx`, `e2e/a11y.e2e.ts`).
  - #207: İki ayrı tarayıcı bağlamı ile uçtan uca şifreli eşitleme E2E testi (`e2e/sync.e2e.ts`: kelime ekleme, yarış/çatışma çözümü, kelime silme tombstone ve ayar senkronizasyonu).
- [x] **Performans ve Bundle Optimizasyonu (#196, #201):**
  - #196: Kapsamlı performans, ilk açılış yükü ve chunk boyutu analiz raporu (`docs/PERFORMANS.md`).
  - #201: Cümle parçaları için sütun bazlı `{ s, t }` ve kompakt TSV çözücü desteği (`wordpack.ts`, `wordpackSentences.test.ts`).
- [x] **İçerik ve Araştırma Envanteri (#165, #166, #177, #187, #190, #200, #206):**
  - #206: İngilizce sesli içerik envanteri ve lisans değerlendirme raporu (`docs/kaynaklar/english-audio.md`: Global Storybooks, VOA Learning English, LibriVox, Simple English Wikipedia, BBC).
- [x] **Test Sağlamlığı ve Erişilebilirlik (#156, #172, #173, #179, #181, #194, #208, #224):**
  - #156: Test edilmemiş 5 engine modülüne kapsamlı birim testleri (`hours`, `workloadForecast`, `incoming`, `accents`, `milestones`).
  - #172: E2E test sağlamlaştırma (dinamik görünürlük beklemeleri ve fonksiyonel rota eşlemeleri).
  - #173: Dahili kullanılan dışa aktarımlar raporu ve temizliği (`docs/KULLANILMAYAN-DISA-AKTARIMLAR.md`).
  - #179: Bölünen yeni UI bileşenlerine birim testleri (`TextForms`, `CoverageCard`, `WordCard`, `ReadingLibrary`, `AppSidebar`).
  - #181, #194, #208, #224: Genişletilmiş erişilebilirlik (a11y) test kapsamı (Onboarding, Çekimler kartı, mobil çekmece, oturum özeti, Çeviri temaları, Unuttum durumu, çevrimdışı rozeti, sesli kitaplar, telaffuz çalışması, kişisel cümleler, liste seçimi, kota satırı, Dilbilgisi soruları, Refleks turu, Tuzak kelimeler, Ses ayırt etme, Zihin tohumu ve Kör noktalar kartı açık/koyu/sakin temalarda axe doğrulaması).

## 2026-10-10 Geliştirmeleri — 9. Tur (#209–#225)
- [x] **Hesap Onayı ve Erişim Denetimi (#210):**
  - Güvenli çoklu kullanıcı mimarisi: Onaysız hesaplar kelime ekleyip çalışabilir; onaylı hesaplar sunucu eşitleme, DeepL çeviri, YouTube altyazısı ve AI servislerini kullanır (`api/_account.ts`, `data/access.ts`, `useAccessStatus.ts`).
- [x] **Dilbilgisi Soruları & Genişletme (#211, #221):**
  - B1–C1 dilbilgisi pratik motoru (`GrammarPractice.tsx`, `grammar.ts`). Boşluk doldurma (cloze), seçenekli (choice) ve hatalı kelime bulma (error) soru tipleri.
  - Açık lisanslı alıştırma envanteri (`docs/kaynaklar/gramer-alistirmalari.md`).
  - Mevcut 96 sorunun pedagojik denetimi (`docs/veri/gramer-gozden-gecirme.md`).
  - 120 yeni doğrulanmış soru (`src/data/grammar/{fr,es,en}-2.json`, subjonctif, participe passé, inversion, cleft, mixed conditionals vb.).
- [x] **Tuzak Kelimeler / Yalancı Eşdeğerler (#218):**
  - Hedef dilde başka dille karışan sözcükler için pratik oyunu (`TrapRound.tsx`, `traps.ts`).
  - 121 yeni doğrulanmış kelime ve örnek cümle (`src/data/traps/{fr,es,en}-2.json`).
  - Kelime detay sayfasında ve Sözlük'te "Tuzak kelime" çipi. Rapor: `docs/kaynaklar/tuzak-kelimeler.md`.
- [x] **Refleks Turu (#219):**
  - 3 saniye kuralıyla günlük konuşma kalıplarını hızla hatırlama oyunu (`ReflexRound.tsx`, `reflex.ts`).
  - 62 yeni dört dilli paralel kalıp (`src/data/reflex/phrases-2.json`, TR/FR/ES/EN).
- [x] **Ses Ayırt Etme Kayıt Denetimi (#222):**
  - `MINIMAL_PAIRS` listesindeki yeni çiftlerin Wiktionary ve Commons üzerindeki ana dil konuşmacısı sayısı denetimi ve açık lisanslı kaynak raporu (`docs/veri/minimal-cift-kayitlari.md`).
- [x] **Zihin Tohumu & Kör Nokta Röntgeni:**
  - Bugün ekranında ekrandan uzakta hedef dilde düşünme önerisi (`MindSeed.tsx`, `mindSeed.ts`).
  - İlerleme ekranında öğrencinin en zayıf olduğu konuları tespit edip doğrudan tamir oyununa yönlendiren kart (`BlindSpots.tsx`, `blindSpots.ts`).
- [x] **Günün Mikro Haberi Araştırması (#225):**
  - RFI Journal en français facile, VOA Learning English ve VOA Noticias için RSS, doğrudan MP3 akışı, tam transkript ve lisans fizibilite raporu (`docs/kaynaklar/gunun-haberi.md`).

## 2026-10-10 Geliştirmeleri — 10. Tur (#227–#238)
- [x] **Günün Mikro Haberi Canlı Doğrulaması (#233):**
  - `scripts/check-news-feeds.ts` betiği ile RFI, VOA Learning English ve VOA Noticias canlı RSS/MP3/transkript akışları test edildi.
  - Canlı doğrulama sonuçları, çalışan doğrudan ses ve metin URL'leri ve mimari öneriler `docs/kaynaklar/gunun-haberi.md` Bölüm 7'ye eklendi.
- [x] **İspanyolca Fonetik Ses Çifti Yedeği (#234):**
  - `MINIMAL_PAIRS.es` içindeki 38 kelime Wikimedia Commons ve Lingua Libre üzerinde tarandı; 35 kelimenin (%92,1) açık lisanslı MP3/WAV kayıtları, konuşmacıları ve lisansları `docs/veri/es-ses-kayitlari.json` dosyasına işlendi.
  - Eksik 3 kelime için alternatif çift önerileri (`docs/veri/minimal-cift-kayitlari.md` Bölüm 6) ve yerel ses eşleme altyapısı (`src/data/audio/es-pairs.json`) hazırlandı.
- [x] **Çıkarım Modu Maskeleme Kuralı Denetimi (#237):**
  - `src/engine/deduction.ts` `maskPositions` kuralı Fransızca ve İspanyolca dillerinde 10 gerçek metin üzerinde (storybook, audiobook, news) sıfır ve 1.000 kelime bilinen senaryolarda analiz edildi (`scripts/audit-deduction.ts`, `docs/veri/cikarim-modu-denetimi.md`).
  - Çift tireli birleşmeler (`abril--vivieron`), kişi adları (`Francet`) ve soru/zamir tireleri (`Est-ce`, `Imaginez-vous`) gibi pedagojik pürüzler belgelendi; 5 somut regex/algoritma çözümü sunuldu.
- [x] **Kayıt Farkı (Register) Üçlüleri Denetimi (#238):**
  - `src/data/register/{fr,es,en}.json` içerisindeki 42 adet günlük / standart / resmî karşılık üçlüsü (`bouffer / manger / se restaurer` vb.) Wiktionary, DRAE ve Oxford etiketleriyle denetlendi (`docs/veri/kayit-farki-denetimi.md`).
  - İspanyolca'daki İspanya odaklı argo (`curro`, `tío`, `pasta`, `guay`, `vale`), Arjantin'deki tehlikeli sahte dost (`curro` = dolandırıcılık) ve İngilizce nüanslar (`scoff`, `knackered`) belgelenip düzeltme önerileri sunuldu.
- [x] **Eksik Doldurma ve Seviyeli Kelime Önerisi:**
  - Cümle içi boşluk tamamlama alıştırması (`FillMissing.tsx`) ve seviyeye uygun kelime önerme motoru (`SuggestWords.tsx`, `wordSuggest.ts`).

## 2026-10-11 Geliştirmeleri — 11. Tur (#244–#251)
- [x] **Yeni Özelliklerin Uçtan Uca Testleri (#244):**
  - `e2e/desktop.e2e.ts` ve `e2e/phone.e2e.ts` üzerinde 5 yeni uçtan uca test: Bileşik zaman kelime ekleme ("j'ai mangé" -> "manger ekle"), Okuma ekranında bileşik zaman kartı ("ai" veya "mangé" dokunulduğunda tüm çekim ve zaman), Çıkarım modunda mobil alt çekmece akışı, YZ ile eksikleri doldur / kelime öner taklidi ve Kayıt farkı bölge notu gösterimi.
- [x] **Genişletilmiş Erişilebilirlik (a11y) Taramaları (#246):**
  - `e2e/a11y.e2e.ts` dosyasına tüm yeni ekran ve durumlar için telefon görünümünde, açık ve koyu temalarda `axe` taramaları eklendi: Dilbilgisi soruları (soru + cevap), Refleks turu (süreli/süresiz), Tuzak kelimeler (soru + cevap), Ses ayırt etme, Kayıt farkı (bölgesel not görünürken), Geri çeviri döngü çipleri, Zihin tohumu, Kelime öner, Kör nokta röntgeni ve Bileşik zaman kartı (26 test, 0 ihlal).
- [x] **Bileşik Zaman Tanıma Denetimi (#247):**
  - `scripts/audit-compounds.ts` betiği ile 10 gerçek edebi ve haber metni (5 FR, 5 ES) taranarak 92 bileşik çekim incelendi.
  - Fransızca `ne ... plus` yapısının hatalı olarak `plaire` fiili sayılması (`ont plus`, `avait plus`, `ai plus`) tespit edildi; 30 kaçırılan cümle örneği (bileşik mastarlar, devrik sorular, BETWEEN zarfları) ve 5 çözüm önerisi `docs/veri/bilesik-zaman-denetimi.md` raporunda belgelendi.
- [x] **Kayıt Farkı (Register) Listesi Genişletmesi (#248):**
  - `src/data/register/{fr-2,es-2,en-2}.json` ile her dilde 21 yeni üçlü (toplam 63 yeni üçlü, diller genelinde 105 kayıt) eklendi.
  - Selamlaşma, rica, izin, özür, telefon, e-posta, sipariş, yol, buluşma ve fiyat senaryoları kapsandı; İspanyolca bölgesel kullanımlara bilgilendirici `note` etiketleri yazıldı (`docs/veri/kayit-farki-genisleme.md`).
- [x] **Tuzak Kelime (False Friends) Listesi Denetimi (#249):**
  - 178 kaydın tamamı taranarak Fransızca 7 kayıtta `lemma` aksansız yazıldığı için `trapOf` eşleşmesinin bozulduğu kritik hata saptandı.
  - `looks`, `trap` ve `meaning` alanlarındaki anlatım bozuklukları ve buton taşma riskleri incelenerek 41 maddelik düzeltme tablosu ve savunmacı normalize önerisi `docs/veri/tuzak-kelimeler-denetimi.md` raporunda sunuldu.
- [x] **Haber Kaynağı Adaylarının Canlı Ağ Denetimi (#251):**
  - `scripts/check-news-feeds.ts` betiği aday kaynakları (`--candidates`) test edecek şekilde genişletildi.
  - Fransızca (*Salut l'info!*, *1jour1actu*, *TV5Monde*), İspanyolca (*Hoy Hablamos*, *Radio Ambulante*, *DW*) ve İngilizce (*BBC 6 Minute English*, *News in Levels*, *NPR*) canlı ağ üzerinden denetlendi; çalışan doğrudan ses akışları ve transkript durumları `docs/kaynaklar/gunun-haberi.md` Bölüm 8'e eklendi.

## 2026-10-12 – 2026-10-15 Geliştirmeleri — 12. ve 13. Turlar (#300–#359)
- [x] **Rehber, Mini Sınav ve Tekrar Kartı (#344, #349, #351, #352–#355):**
  - **Rehber Merkezi (`Guide.tsx`):** 121 kapsamlı dilbilgisi ve kullanım rehberi dersi (`src/data/guide/`), A1–B2 seviye anlatımları, zengin örnekler, zaman ve formül tabloları.
  - **Mini Sınav (`GuideQuiz.tsx`):** Her dersin sonunda 3 soruluk interaktif sınav, başarıyla bitirince "Öğrenildi" durumu ve yeşil tik.
  - **Bugün Hatırlatma Kartı (`GuideDueCard.tsx`):** Öğrenilen derslerin aralıklı tekrarı için Bugün ekranında "Hatırlıyor musun?" kartı ve doğrudan mini sınav başlatma.
  - **Hata Köprüsü:** Dilbilgisi alıştırması veya fiil laboratuvarında yanlış yapıldığında "Konunun dersi" / "Bu zamanın anlatımı" köprüsüyle derse geçiş.
  - **Denetim & Testler:** Tüm dersler pedagojik olarak tarandı (#352), mini sınavlar denetlendi (#353), iç/dış bağlantılar doğrulandı (#354); telefon, masaüstü ve axe WCAG AA a11y testleri yazıldı (#355).
- [x] **Supabase Auth ve Eşitleme (#344, #345, #348, #350, #356):**
  - **1. Aşama (Auth, #344, #345):** Supabase Auth entegrasyonu, e-posta/şifre ile güvenli giriş ve kayıt, Türkçe şablonlar (onay/şifre sıfırlama) ve Google OAuth altyapısı.
  - **2. Aşama (Tablolar, #348):** Vercel Blob yerine PostgreSQL `sync_parts` tablosu (`core` ve `media`), RLS güvenlik kuralları ve onaylı hesap ayrımı (`put_sync_part`).
  - **2b Aşaması (İlişkisel Veriler, #350):** `friend_cards`, `shared_lists`, `reminders`, `server_flags`, `sync_keys` tabloları.
  - **Güvenlik Duman Testi (#356):** `scripts/smoke-supabase.mjs` betiği ile RLS ve açık anahtar sınırlarının doğrulanması (`docs/SUPABASE.md`).
- [x] **Kartlar, Arkadaşlar, Seri Kurtarma ve İlerleme Raporu (#343, #344, #358):**
  - **Kartlar (`SwipeCards.tsx`):** Oyunlar → Kartlar ekranında dokunsal kart çevirme (`.flash-turn`), "Biliyorum / Bilmiyorum" ayrımı, tur içinde 3 kart sonra hatırlatma (`COME_BACK_AFTER[0] = 3`), sonuç ekranı ve "Takıldıklarını çalış" ile odaklı yeni tur.
  - **Arkadaşlar (`FriendsCard.tsx`):** Arkadaşlık kodu ile ekleme/çıkarma, "Bugün" ve "Bu hafta" puanlama ve liderlik sıralaması.
  - **Seri Kurtarma (`StreakRepair.tsx`):** Kaçırılan günlerde Bugün ekranında telafi kartı, %70 başarı gerektiren 10 soruluk telafi sınavı ve seriyi geri kazanma.
  - **İlerleme Raporu (`ShareProgress.tsx`):** İlerleme ekranında "Paylaş" menüsü: Tek tıkla "Yazdır ya da PDF" çıktısı alma, "Excel (.xlsx)" indirme (en az 7 ayrı çalışma sayfası ile kelime, fiil, dinleme, okuma, hata ve seviye dökümü).
  - **E2E Doğrulaması (#358):** Kartlar, Arkadaşlar, Seri kurtarma ve İlerleme raporu için `e2e/desktop.e2e.ts` uçtan uca testleri.
- [x] **Hesap Ekranı ve Yasal Sayfalar (#344, #346, #347, #349):**
  - Eski salt anahtarlı hesap yapısı kaldırılarak modern Supabase hesap paneli oluşturuldu (`AccountScreen.tsx`). Şifre güncelleme, onay rozeti, e-posta doğrulama ve hesabı silme imkânı.
  - Gizlilik politikası (`PrivacyPolicy.tsx`) ve kullanım koşulları (`TermsOfUse.tsx`) sayfaları eklendi.
- [x] **Görsel Zenginleşme ve Monki Tasarım Sistemi (#305–#343):**
  - Sevimli karakterimiz Monki'nin el çizimi illüstrasyonları (karşılama, boş durumlar, etkinlik pozları, seviyeye göre kıyafetler, oturum tepkileri).
  - Yeni rozet madalyaları, seri alevi animasyonları, hayvan avatarları, liste kapak fotoğrafları ve açılış adımı çizimleri.
- [x] **Dilbilgisi Çoktan Seçmeli Soru Genişletmesi (#359):**
  - 10'dan az çoktan seçmeli soruya sahip tüm dilbilgisi konularına (`src/data/grammar/{fr,es,en}-9.json`) toplam 68 özgün soru eklendi (FR: 16, ES: 25, EN: 27). Mini sınav soru havuzu zenginleştirildi.

## 2026-10-15 / 2026-10-16 Gece Bakım, Temizlik ve Test Kapsamı Turları (#361–#367)
- [x] **Gece Bakım Turu 1 — Derleme ve Kullanılmayan Dışa Aktarım Temizliği (#361):**
  - Vite/Rolldown derleme uyarıları giderildi: `WeeklyNudge.tsx`, `syncTarget.ts` ve `syncRunner.ts` içindeki etkisiz dinamik içe aktarımlar (`[INEFFECTIVE_DYNAMIC_IMPORT]`) statik içe aktarıma alındı.
  - Sadece kendi dosyasında kullanılan 8 dışa aktarım modül içine çekildi (`DictionarySaved.tsx` `SAVED_SHOWN`, `downscaleImage.ts` `MAX_SIDE`/`fitSize`, `games/shared.tsx` `RECORD_MIN_PCT`, `incoming.ts` `READ_WORDS`, `monkiWords.ts` `TALK_WORDS`, `useScreenHistory.ts` `routeKey`, `App.tsx` `NavMark`). `docs/KULLANILMAYAN-DISA-AKTARIMLAR.md` güncellendi.
- [x] **Gece Bakım Turu 2 — Kelime Türetme Motoru Akraba Denetimi (#362):**
  - `scripts/audit-derive.ts` ile EN, FR, ES dillerindeki en sık 6.000 kelime üzerinde kelime türetme motoru denetlendi.
  - Rastlantısal yazım benzerliğiyle yanlış köke bağlanan 15 kelime `src/engine/derive.ts` içindeki `FALSE_COUSINS` listesine eklendi (`sting|resting`, `tire|retire`, `coupable|couper`, `chanter|chantage`, `creación -> crear`). Birim testleri yazıldı.
- [x] **Gece Bakım Turu 3 — Motor (Engine) Birim Test Kapsamının Tamamlanması (#363):**
  - Doğrudan testi bulunmayan 5 çekirdek motor modülü için 27 yeni birim testi yazıldı:
    - `src/engine/__tests__/rng.test.ts`: Mulberry32 deterministikliği, tohum bağımsızlığı, dizi karıştırma (`shuffle`) ve eleman seçme (`pick`).
    - `src/engine/__tests__/collocations.test.ts`: Eşdizim filtreleme, dil kısıtlaması, harf duyarsızlığı ve azami adet sınırı.
    - `src/engine/__tests__/trueFalse.test.ts`: Doğru/Yanlış alıştırma motoru, sözcük türü (partOfSpeech) uyumlu çeldirici seçimi ve kendi anlamını çeldirici yapmama güvencesi.
    - `src/engine/__tests__/tenseGuide.test.ts`: Zaman rehberi, Türkçe pedagojik köprü (`TENSE_BRIDGE`) alanları ve üst-dilsel pedagojik geri bildirim (`formFeedback` — yanlış zaman veya yanlış şahıs ayrımı).
    - `src/engine/__tests__/quests.test.ts`: Günlük görev üretimi (`dailyQuests`), metrik toplamı (`dayMetrics`), görev durumu (`questStatus`) ve bonus XP (`questBonus`).
- [x] **Gece Bakım Turu 4 — Arayüz (UI) Yardımcı Modülleri Test Kapsamı (#364):**
  - Arayüzde doğrudan testi bulunmayan 5 kritik yardımcı modül için 24 yeni birim testi yazıldı:
    - `src/ui/flameTier.test.ts`: Seri (streak) alevi kademelerinin (0..4) gün eşiklerine (3, 7, 30, 100 gün) göre doğru hesaplanması.
    - `src/ui/badgeTier.test.ts`: Başarı madalyası aşamaları (`TIER_NAME`) ve madalya kademelerine göre sıralama (`byTier`: bronz < gümüş < özel < altın).
    - `src/ui/dayPlantStage.test.ts`: Günlük çalışma çiçeği büyüme evreleri (-1 tohum, 0-4 beşte birlik ilerleme, 5 tamamlama).
    - `src/ui/articleQuestion.test.ts`: Fransızca sesli/sessiz harf ayrımı (sessiz harfte le/la; sesli harf ve sessiz h'de l' düşmesini önlemek için un/une) ve İspanyolca artikel (el/la) soru üretimi.
    - `src/ui/knownMilestones.test.ts`: Kapsamlı okuma bilinen kelime toplamı (`knownTotal`), hedef kilometre taşları (`milestone`), haftalık büyüme (`weeklyGrowth`) ve hedef tahminleme (`goalForecast`).
- [x] **Gece Bakım Turu 5 — Rehber Pedagojik Zenginleştirmesi ve Açık Kaynaklar (#366):**
  - Dilbilgisi kuralları ve dikkat notları zenginleştirildi: İngilizce'de kurumlarda artikel düşmesi (`go to school`), `been to` vs `gone to`, `try to` vs `try -ing`, doğa kanunlarında backshift yapılmaması; Fransızca'da zamanla anlamı değişen fiiller (`savoir`/`connaître`), `y` zamirinin insan yerine kullanılamayışı, `probable` (indicatif) vs `possible` (subjonctif); İspanyolca'da aynı öznede mastar kullanımı, `trabajar para` vs `trabajar por`, `si`'den sonra asla presente de subjuntivo gelmemesi.
  - Açık öğrenme kaynakları: `SHARED_RESOURCES` içine `Wiktionary`, `Project Gutenberg` ve `LibriVox` eklendi.
- [x] **Gece Bakım Turu 6 — Motor & Arayüz Test Kapsamı Genişletmesi (#367):**
  - Doğrudan testi bulunmayan 6 çekirdek motor ve arayüz modülü için 26 yeni birim testi yazıldı:
    - `src/engine/__tests__/bosses.test.ts`: Sülük (leech) tespiti, HP formülü (`4 + min(6, wrong)`), yenilen boss'un yeni hata yapılmadıkça gelmemesi ve rövanş (`rematch: true`) mantığı.
    - `src/engine/__tests__/race.test.ts`: Haftalık yarış motoru, Pazartesi yerel hafta başlangıcı (`weekStart`), geçen haftanın aynı gününe kadar olan XP kıyası ve galibiyet serisi (`streak`).
    - `src/engine/__tests__/tenseBrief.test.ts`: FR ve ES dillerindeki 30 zamanın kısa tanımları, Türkçe etiketleri ve pedagojik açıklamalarının tamlığı.
    - `src/ui/guideProgress.test.ts`: Rehber derslerinin okundu (`markRead`), öğrenildi (`markChecked`) ve ertelendi (`markPutOff`) durumlarının yönetimi, yerel depolama ve eski dizi biçiminden göç.
    - `src/ui/tenseStats.test.ts`: 90 günlük fiil çekim istatistiklerinden en zayıf zamanın (`weakestTense`) tespiti (asgari 3 cevap ve <%80 başarı eşiği).
    - `src/ui/dictSentences.test.ts`: Sözlük örnek cümlelerinin 30 günlük yerel önbellek (`MAX_AGE`) ve paket yedeği (`examplesFromPack`) yönetimi.
- [x] **Gece Bakım Turu 7 — Rehber Pedagojik Zenginleştirmesi (2. Dalga, #368):**
  - İspanyolca (`lessons-es.ts` - `prep_es`): Kişisel 'a' (`a personal`) kuralı (belirli bir insan/evcil hayvan doğrudan nesne olduğunda 'a' edatı gelmesi: `Busco a mi hermano` vs `Busco mi teléfono`), yeni örnek ve dikkat uyarısı.
  - Fransızca (`lessons-fr.ts` - `participe_passe`): « en » zamirinin doğrudan nesne gibi görünmesine rağmen geçmiş zaman ortacında asla uyum (`accord`) almaması kuralı (`J'en ai cueilli` - `cueillies` değil), yeni örnek ve sınav uyarısı.
  - İngilizce (`lessons-en.ts`):
    - `basics_en_plurals_quantifiers`: `few` (olumsuz, neredeyse hiç yok) vs `a few` (olumlu, az da olsa var) ve `little` vs `a little` ayrımı, örneği ve dikkat uyarısı.
    - `modals_en`: `must` modalının geçmiş zamanının olmaması, geçmiş zorunluluk için daima `had to` kullanılması kuralı ve uyarısı (`Yesterday I had to work`).
- [x] **Gece Bakım Turu 8 — Veri & Rehber Modülleri Test Kapsamı ve Çıktı Temizliği (#369):**
  - `src/data/__tests__/tombstones.test.ts` (6 test): Senkronizasyon silme kayıtları (`tombMap`), zaman damgası çakışmalarının çözümü, harita birleştirme (`mergeTombs`), silinme durumu (`isDead`) ve silinen kimlikler kümesi (`deadIds`).
  - `src/data/guide/lessonOf.test.ts` (7 test): Rehber ders seçici motoru (`lessonsOf`, `lessonFor`, `lessonTitle`, `practiceTopic`, `englishTenseLessons`, `checkFor`, `checkableTopics`).
  - `src/data/__tests__/deriveLookup.test.ts` (4 test): Kelime türetme sözlük arama motoru (`makeLookup`), paket kelimeleri ve kullanıcı kelimeleri önceliklendirmesi.
  - `.gitignore`: Denetim betiği çıktıları (`*-output.json`) git takip dışına alındı.
- [x] **Gece Bakım Turu 9 — Rehber İleri Seviye (B2/C1) Dilbilgisi Zenginleştirmesi (#370):**
  - Fransızca (`lessons-fr.ts` - `subjonctif`): Resmî Fransızca'daki *ne explétif* kuralı (`avant que`, `à moins que`, `avoir peur que` sonrasında 'ne'nin olumsuzluk/pas taşımaması: `Rentrons avant qu'il ne fasse nuit`), yeni örneği ve dikkat uyarısı.
  - İspanyolca (`lessons-es.ts` - `condicionales`): *como si* (sanki ...-mış gibi) kalıbının ardından daima geçmiş subjuntivo (imperfecto veya pluscuamperfecto de subjuntivo) alması, asla presente/indicativo kullanılmaması kuralı (`Me mira como si no me conociera`), yeni örneği ve dikkat uyarısı.
  - İngilizce (`lessons-en.ts` - `inversion`): Şart cümlelerinde devriklik (*conditional inversion* - `Had I known`, `Were I you`, `Should you need help`), yeni örneği (`Had I known about the traffic, I would have taken the train`) ve `If had I known` hatasına karşı dikkat uyarısı.
- [x] **Gece Bakım Turu 10 — Arayüz & Fiil Mantığı Birim Test Kapsamı (#371):**
  - Doğrudan testi bulunmayan 5 kritik arayüz ve fiil mantığı modülü için 32 yeni birim testi yazıldı:
    - `src/ui/gardenSkyCalculations.test.ts` (10 test): Bahçe gökyüzü evreleri (`skyPhase`: sabah/gündüz/akşam/gece saat sınırları), Türkçe evre adları (`PHASE_NAME`), güneş ve ay eğrisi koordinatları (`bodyPosition`), kelebek ve arı ziyaretçi hesaplamaları (`visitors`).
    - `src/ui/labels.test.ts` (7 test): Dil karşılama mesajları (`HELLO`), dil adları ve kodları (`LANGUAGE_NAME`, `LANGUAGE_SHORT`, `SPEECH_LANG`), beceri, seviye ve parça adları, hata ipuçları (`ERROR_HINT`), kural ve istisna metin üretimi (`genderRuleText` — Fransızca ve İspanyolca eril/dişil kural ve istisnaları).
    - `src/ui/personalInterests.test.ts` (4 test): Profil ilgi alanları ve hikaye konularının birleştirilmesi (`interestsOf`), boşluk budama, boş değer filtreleme, mükerrer temizliği ve azami 8 öge kısıtlaması.
    - `src/ui/splitHelp.test.ts` (5 test): Ayar yardım metinlerinin bölünmesi (`splitHelp`: 24 karakter altı bölünmeme, nokta/ünlem/soru işareti ayrımı, çok satırlı açıklamaların korunması).
    - `src/ui/verbs/tenseTwin.test.ts` (6 test): İki dilli fiil laboratuvarı eş zaman eşleştirmesi (`otherLab`: fr <-> es), zaman tablosu sorgusu (`twinOf`: Fransızca présent -> İspanyolca presente), passé composé -> pretérito pedagojik fark notu, Fransızca'da être ile kurulan bileşik zamanlarda pedagojik uyarı üretimi.
- [x] **Gece Bakım Turu 11 — Rehber Pedagojik Zenginleştirmesi (3. Dalga, #372):**
  - İngilizce (`lessons-en.ts` - `prep_en`): `marry` ve `divorce` fiillerinin etken kullanımda edatsız olması (`She married John`), durum/sıfat kullanımında `to` alması (`She is married to John`), `married with` hatasına karşı dikkat uyarısı ve yeni örnek.
  - Fransızca (`lessons-fr.ts` - `negation_fr`): `ne … pas encore` (henüz değil) yapısının diğer olumsuzlukların aksine `pas` sözcüğünü koruması kuralı (`Le train n'est pas encore arrivé`), dikkat uyarısı ve yeni örnek.
  - İspanyolca (`lessons-es.ts` - `ser_estar`): `ser rico` (varlıklı olmak) vs `estar rico` (yiyeceğin lezzetli olması) ayrımı (`Esta sopa está riquísima`), `es rico` hatasına karşı dikkat uyarısı ve yeni örnek.
- [x] **Gece Bakım Turu 12 — Arayüz & Veri Modülleri Test Kapsamı (#373):**
  - Doğrudan testi bulunmayan 5 kritik yardımcı ve veri modülü için 21 yeni birim testi yazıldı:
    - `src/ui/density.test.ts` (4 test): Arayüz liste yoğunluk modu (`getDensity`, `setDensity`, `applyDensity` ve `localStorage` / `dataset.density` entegrasyonu).
    - `src/ui/wordListId.test.ts` (3 test): Liste kimlik üretimi (`newListId`: `list:` ön eki, alfanümerik format ve benzersizlik güvencesi).
    - `src/ui/whatsNewLogic.test.ts` (6 test): Yenilikler kartı gösterim mantığı (`whatsNewDue`: kelime eşiği denetimi [en az 10 kelime], sürüm kontrolü ve `markWhatsNewSeen` / `whatsNewSeen` kalıcılığı).
    - `src/ui/summaryGardenWords.test.ts` (3 test): Oturum sonu bahçe bitkisi sıralaması (`sceneWords`: ustalık aşaması ilerleyen kelimelerin önceliklendirilmesi ve en fazla 9 bitki ile sınırlandırma).
    - `src/data/__tests__/friends.test.ts` (5 test): Arkadaş kodu gösterimi (`showCode`: 8 karakterde tireli bölme), son 14 günlük XP filtresi (`recentDays`: 13 günden eski, gelecek ve sıfır/negatif puanların ayıklanması) ve `FriendsError` sınıfı.
- [x] **Gece Bakım Turu 13 — Oyunlar & Arayüz Mantığı Test Kapsamı (#374):**
  - Doğrudan testi bulunmayan 5 yardımcı ve oyun modülü için 20 yeni birim testi yazıldı:
    - `src/ui/skeletonFor.test.ts` (6 test): Ekran yükleme iskeleti seçici (`skeletonFor`: home, list, detail, settings, session ve grid varsayılanı).
    - `src/ui/chunkError.test.ts` (6 test): Kod parçası yükleme / ağ hatası tespiti (`isChunkError`: ChunkLoadError, dinamik içe aktarım ve modül betik hataları, ilgisiz hata ayrımı).
    - `src/ui/repairTry.test.ts` (3 test): Seri tamir sınavı deneme kontrolü ve yerel kayıt (`repairTried`, `markRepairTried`).
    - `src/ui/games/aspectPair.test.ts` (2 test): Geçmiş zaman görünüş ikilileri tanımı (`ASPECT_PAIR`: Fransızca passé composé vs imparfait, İspanyolca pretérito vs imperfecto).
    - `src/ui/games/accentedWords.test.ts` (3 test): Aksanlı kelime oyunu filtreleme motoru (`accentedWords`: aksan/inceltme içeren kelimelerin ayıklanması, `ACCENT_MIN_WORDS` eşiği).
- [x] **Gece Bakım Turu 14 — Veri Servisleri & Geri Alma Mantığı Test Kapsamı (#375):**
  - Doğrudan testi bulunmayan 5 kritik veri ve yardımcı modül için 17 yeni birim testi yazıldı:
    - `src/data/__tests__/grammarCheck.test.ts` (6 test): LanguageTool dilbilgisi denetim servisi (`checkGrammar`: azami karakter sınırı, çevrimdışı ağ hatası, 429 kota aşımı, sunucu hatası, imla/üslup/dilbilgisi tür ayrımı ve azami 4 düzeltme önerisi).
    - `src/data/__tests__/cefr.test.ts` (4 test): CEFR kelime seviyesi yükleme (`loadCefr`: İngilizce null kontrolü, Fransızca ve İspanyolca seviye haritaları, önbellek tekliği güvencesi).
    - `src/data/__tests__/familyLinks.test.ts` (2 test): Kelime ailesi karşılıklı bağlama (`linkEntries`: iki kelimeyi çift yönlü `wordFamily` listesine ekleme, mükerrer bağlantıyı önleme).
    - `src/ui/saveSentence.test.ts` (3 test): Cümle kaydetme motoru (`saveSentence`: boş metin reddi, mükerrer cümle kontrolü, boşluk temizleme ve FSRS kartı üretimi).
    - `src/ui/undo.test.ts` (2 test): Güvenli kelime silme ve geri alma (`changeWordsWithUndo`, `deleteWordsWithUndo`: kelime enstantanesi alma, değişiklik yürütme ve "Geri Al" bildirimi tetiklendiğinde geri yükleme).
- [x] **Gece Bakım Turu 15 — Oturum, Kart & Metin Yeniden İnşa Mantığı Test Kapsamı (#376):**
  - Doğrudan testi bulunmayan 5 kritik yardımcı modül için 19 yeni birim testi yazıldı:
    - `src/ui/session/wordFit.test.ts` (2 test): Oturum büyük yazı tipi için kelime uzunluğu hesaplama (`wordFit`: CSS değişkeni `--len`).
    - `src/ui/session/keys.test.ts` (4 test): Oturum klavye kestirmesi ve odak yönetimi (`modalOpen`, `ownsKey`: input, textarea, button, select ayrımı).
    - `src/ui/dictoglossReconstruct.test.ts` (5 test): Metin dinleme ve yeniden yazma mantığı (`glossParagraphs`: 30-90 kelime aralığı filtresi, `recallCheck`: anlam kelimelerini tespit etme ve hatırlanma kontrolü, `sentenceWith`: kelimeyi içeren cümleyi ayıklama).
    - `src/ui/gameList.test.ts` (3 test): Oyun kataloğu doğrulaması (`GAME_LIST`: benzersiz oyun kimlikleri, isim ve emoji tamlığı, dilbilgisi oyunları işareti).
    - `src/ui/progressCardSvg.test.ts` (5 test): İlerleme kartı SVG üretimi (`cardSvg`: 1080x1350 boyutları, XML güvenli karakter kaçışı, dark/light/banner temaları, hedefler, rozetler ve ilgi alanları).
- [x] **Gece Bakım Turu 16 — Veri Kuyruğu, Çeviri Hafızası, Liste Seçenekleri & Ses Mantığı Test Kapsamı (#377):**
  - Doğrudan testi bulunmayan 4 kritik veri ve arayüz modülü için 21 yeni birim testi yazıldı:
    - `src/data/__tests__/earLog.test.ts` (2 test): Dikte kaçırılan kelime kaydı (`noteDictation`: kelime ve durum eşleştirmesi, `db.saveEarLog` kaydı ve eşzamanlı yazımlarda sıra/kuyruk güvenliği).
    - `src/data/__tests__/backItems.test.ts` (2 test): Geri çeviri pratik havuzu (`loadBackItems`: çeviri hafızası ve cümle kartlarının harmanlanması, kartı bulunanların elenmesi, veri tabanı hatasında güvenli boş liste dönüşü).
    - `src/ui/listOptions.test.ts` (9 test): Kelime listesi ve alt seviye yerleşim seçenekleri (`placementOptions`: liste ve seviyeleri düz seçeneklere dönüştürme, özel "listesiz" etiketi; `placementValue`: eşleşen seviye veya liste değeri; `parsePlacement`: liste ve seviye ayrıştırma; `progressLine`: grup ilerleme metni formatı).
    - `src/ui/speech.test.ts` (8 test): Web Speech API ve ses sentezi yönetimi (`canSpeak`: tarayıcı desteği tespiti; `voicesFor`: yabancı dil ön eki eşleşmesi, anlamsız/şaka seslerin filtrelenmesi, premium/enhanced kalite sıralaması; `speak`: önceki konuşmayı iptal etme ve ses hızı ayarı; `isAudioPlaying`: ses çalma durumu tespiti; `stopSpeaking`: ses ve doğal ses motorunu durdurma).
- [x] **Gece Bakım Turu 17 — Rehber B1/B2 İngilizce İnteraktif Pekiştirme Sınavları (#378):**
  - Rehberde daha önce mini sınavı bulunmayan 10 ileri düzey İngilizce dersi için 3'er soruluk (toplam 30 soru) pedagojik açıklamalı interaktif pekiştirme sınavları (`check`) eklendi:
    - `gerund_infinitive` (B1 - 3 soru): `avoid doing`, `look forward to doing` (edat to), `stop to do` vs `stop doing` ayrımı.
    - `conn_en` (B1 - 3 soru): `despite` (isim öbeği) vs `although` (cümle), `unless` (olumlu yapı), `therefore` (sonuç zarfı).
    - `prep_en` (B1 - 3 soru): `depend on`, etken `married John` (edatsız) vs `is married to`, `apologise for doing`.
    - `colloc_en` (B1 - 3 soru): `make a mistake`, `do me a favour`, `heavy rain` (sağanak yağmur eşdizimi).
    - `reported_speech` (B1 - 3 soru): `told me that` (nesne alımı), dolaylı sorularda düz cümle sırası ve zaman kayması, olumsuz emirde `not to + fiil`.
    - `modals_en` (B1 - 3 soru): `mustn't` (kesin yasak) vs `don't have to`, geçmişte zorunluluk olmaması (`didn't have to`), geçmişe güçlü çıkarım (`must have + V3`).
    - `passive_en` (B1 - 3 soru): `was built in 1894`, present continuous passive (`is being painted`), ettirgen yapı (`had it repaired`).
    - `relatives_en` (B1 - 3 soru): kişilerde özne `who`, iyelik `whose`, virgüllü ek bilgi cümlelerinde `that` yasağı.
    - `mixed_conditionals` (B2 - 3 soru): geçmiş koşul -> bugünkü sonuç (`if had done ..., would be ... now`), genel özellik -> geçmiş sonuç (`if weren't ..., would have done`), `if` yan cümlesine `would` gelmeme kuralı.
    - `participle_clauses` (B2 - 3 soru): öncelikli eylemde `having + V3`, edilgen anlamda geçmiş zaman ortacı (`startled`), ortaçlarda olumsuzluk (`not knowing`).
- [x] **Gece Bakım Turu 18 — Rehber B1/B2 Fransızca İnteraktif Pekiştirme Sınavları (#379):**
  - Rehberde daha önce mini sınavı bulunmayan 10 ileri düzey Fransızca dersi için 3'er soruluk (toplam 30 soru) pedagojik açıklamalı interaktif pekiştirme sınavları (`check`) eklendi:
    - `futur_fr` (B1 - 3 soru): `dès que` ardından `futur simple` (`arriveras`), `si + présent -> futur` (`pourras`), öncelikli eylemde `futur antérieur` (`aurai lu`).
    - `pronoms_y_en` (B1 - 3 soru): yer zamiri `y` (`j'y vais`), miktar/sayı zamiri `en` (`j'en ai pris quatre`), dolaylı nesne `leur` (`leur téléphone`).
    - `prep_fr` (B1 - 3 soru): `décider de faire`, `réussir à faire`, görüş sorma `penser de` vs düşünme `penser à`.
    - `colloc_fr` (B1 - 3 soru): `poser une question`, `prendre une décision`, `faire attention`.
    - `conn_fr` (B1 - 3 soru): isim öbeğiyle `malgré la pluie`, olumsuz koşul `sinon`, olumlu lehte gerekçe `grâce à`.
    - `subjonctif` (B2 - 3 soru): `il faut que tu fasses`, olumsuz düşünce `ne pas penser que` + `subjonctif` (`qu'il ait`), `avant que` + `subjonctif` (`fasse`) ve `ne explétif`.
    - `conditionnel_passe` (B2 - 3 soru): gerçekleşmemiş şart `si + plus-que-parfait -> conditionnel passé` (`aurais pris`), `si` sonrasında `conditionnel` yasağı (`si j'avais eu`), geçmiş sitem `aurais dû`.
    - `participe_passe` (B2 - 3 soru): öne geçen doğrudan nesne uyumu (`les lettres ... écrites`), `en` zamiriyle ASLA uyum yapılmama kuralı (`j'en ai cueilli`), dönüşlü fiilde nesne arkadaysa uyumsuzluk (`s'est lavé les mains`).
    - `discours_indirect_fr` (B2 - 3 soru): geçmiş aktarımda `présent -> imparfait` (`était`), `futur -> conditionnel` (`viendrait`), `qu'est-ce que -> ce que`.
    - `pronoms_relatifs` (B2 - 3 soru): edat + cansız nesne `pour laquelle`, `à` ile birleşim `auquel` (`faire face à`), bileşik edatla `duquel` (`près duquel`, `dont` yasağı).
- [x] **Gece Bakım Turu 19 — Rehber B1/B2 İspanyolca İnteraktif Pekiştirme Sınavları (#380):**
  - Rehberde daha önce mini sınavı bulunmayan 11 ileri düzey İspanyolca dersi için 3'er soruluk (toplam 33 soru) pedagojik açıklamalı interaktif pekiştirme sınavları (`check`) eklendi:
    - `subjuntivo` (B1 - 3 soru): WEIRDO istek (`quiero que vengas`), olumsuz düşünce (`no creo que tenga`), geleceğe dönük `cuando` + `subjuntivo` (`cuando llegues`).
    - `por_para` (B1 - 3 soru): amaç/hedef için `para` (`para aprender`), sebep/engel için `por` (`por la lluvia`), süre (`por dos horas`) ve son teslim tarihi (`para el lunes`).
    - `condicionales` (B1 - 3 soru): gerçekçi koşul `si + presente` (`si tengo`), hayali koşul `si + imperfecto de subjuntivo -> condicional` (`tuviera / viajaría`), geçmiş hayali koşul (`hubieras dicho`).
    - `perifrasis` (B1 - 3 soru): eylemi bırakmak `dejar de + mastar`, tekrar yapmak `volver a + mastar`, süreklilik `llevar + süre + gerundio` (`llevo tres años estudiando`).
    - `pronombres_atonos` (B1 - 3 soru): `le/les + lo/la -> se lo` dönüşümü (`se lo di`), `gustar` çoğul özne uyumu (`me gustan`), mastara bitişik zamir (`explicármelo`).
    - `relativos_es` (B1 - 3 soru): edat sonrası tanımlı ilgi zamiri (`en la que`), tüm cümleyi özetleyen nötr `lo que`, iyelik ilgi sıfatı `cuyo/cuya` (`cuya madre`).
    - `conn_es` (B1 - 3 soru): karşıtlık `sin embargo`, isim/mastarla `a pesar de`, resmi neden bağlacı `ya que`.
    - `prep_es` (B1 - 3 soru): `soñar con`, `depender de`, geçişli fiilde insan nesnesiyle kişisel `a` (`busco a mi hermana`).
    - `colloc_es` (B1 - 3 soru): `tener éxito` (başarılı olmak), `hacer una pregunta` (soru sormak), `dar un paseo` (yürüyüş yapmak).
    - `se_pasivo` (B2 - 3 soru): çoğul nesneyle `se pasiva refleja` uyumu (`se venden`), tekil nesne uyumu (`se habla`), insan nesnesiyle `se impersonal` (`se busca a los culpables`).
    - `estilo_indirecto` (B2 - 3 soru): geçmiş aktarımda `presente -> imperfecto` (`estaba`), `pretérito -> pluscuamperfecto` (`había perdido`), emir kipinden `imperfecto de subjuntivo`ya geçiş (`cerrara`).
- [x] **Gece Bakım Turu 20 — Rehber A2/C1 İnteraktif Pekiştirme Sınavları & %100 Ders Kapsamı (#381):**
  - Rehberde daha önce kendi özel mini sınavı bulunmayan son 12 ders (3 Fransızca A2, 4 İspanyolca A2, 2 İngilizce A2 ve 3 İngilizce C1) için de 3'er soruluk (toplam 36 soru) pedagojik açıklamalı interaktif pekiştirme sınavları (`check`) eklendi; böylece 144 rehber dersinin tamamı (%100) özel pekiştirme sınavına kavuştu ve `src/data/guide/lessons.test.ts` içinde her dersin en az 3 soruluk `check` dizisine sahip olması zorunlu kılındı:
    - Fransızca A2 (`lessons-fr.ts`):
      - `articles_quantite` (3 soru): sayılamayan isimlerle `du / de la`, olumsuzda `ne ... plus de`, miktar zarfıyla `beaucoup de`.
      - `passe_imparfait` (3 soru): kesilen eylemde `imparfait` (`dormais`), geçmiş alışkanlıkta `imparfait` (`allions`), belirli süreli bitmiş eylemde `passé composé` (`ai étudié`).
      - `negation_fr` (3 soru): birleşik zamanda `vu personne` dizilimi, `pas` koruyan `ne ... pas encore`, kısıtlama bildiren `ne ... que` ve partitif korunumu.
    - İspanyolca A2 (`lessons-es.ts`):
      - `ser_estar` (3 soru): etkinlik yeri `ser` vs kişi konumu `estar`, yiyecek lezzetinde `estar rico`, kalıcı karakter `ser` vs anlık ruh hâli `estar`.
      - `preterito_imperfecto` (3 soru): süren eylem `duchaba` vs bölen olay `sonó`, çocukluk alışkanlığı `comía`, geçmiş saat betimlemesi `eran las nueve`.
      - `comparativos_es` (3 soru): eşitlik `tan ... como`, sayıdan önce `más de`, düzensiz karşılaştırma `mejor`.
      - `imperativo_es` (3 soru): olumsuz `tú` emrinde `subjuntivo` (`no abras`), olumlu emirde bitişik zamir ve vurgu (`cómpratela`), olumsuz emirde önde zamir (`no se lo digas`).
    - İngilizce A2 & C1 (`lessons-en.ts`):
      - `articles_en` (A2 - 3 soru): okunuşa göre `a university / an engineer`, soyut genel isimde artikelsiz kullanım (`Life`), müzik aletleriyle `play the piano`.
      - `present_perfect` (A2 - 3 soru): `since` ile süregelen durum (`have worked`), belirli geçmiş zamanda `past simple` (`watched`), `has gone to` vs `has been to` ayrımı.
      - `inversion` (C1 - 3 soru): `Never have I seen`, 3. tip koşulda `if`siz devriklik (`Had I known`), `No sooner ... than` kalıbı.
      - `cleft` (C1 - 3 soru): yer vurgusunda `It was ... that`, `Wh-cleft` tekil fiil uyumu (`What I need is`), kişi vurgusunda `It was ... who`.
      - `subjunctive` (C1 - 3 soru): `recommend that ... resign`, `It is essential that ... be`, yardımcı fiilsiz olumsuz `that ... not sign`.
- [x] **Gece Bakım Turu 21 — Rehber Klavye Kestirmeleri, Sesli Zaman Örnekleri & Fiil Laboratuvarı Derin Bağlantıları (#382):**
  - `src/ui/LessonCheck.tsx`: Seçenek düğmelerinde görsel olarak gösterilen `1`–`4` tuş rozetleri için gerçek klavye kestirme dinleyicisi (`keydown`: `1`–`4` ile seçenek işaretleme, `Enter` ile sonraki soruya geçme) eklendi.
  - `src/data/guide/lessonOf.ts` & `src/ui/Guide.tsx`: Fransızca ve İspanyolca fiil/kip derslerini (`imperativo_es`, `basics_fr_imperatif`, `basics_es_pluscuamperfecto`, `condicionales` vb. dâhil 23 ders) doğrudan Fiil Laboratuvarındaki ilgili zamanla eşleştiren `lessonTense` yardımcısı eklendi; ders içindeki "Fiil laboratuvarında çalış" düğmesi artık ilgili zamanı doğrudan açıyor (`onVerbs(targetTense)`).
  - `src/ui/verbs/TenseLessonSheet.tsx` & `src/ui/Guide.tsx`: Zaman anlatım penceresindeki (`TenseLessonSheet`) örnek cümlelere sesli telaffuz (`Dinle`) düğmeleri ve Rehber → Zamanlar sekmesinden açıldığında doğrudan o zamanla Fiil Laboratuvarına geçiş sağlayan "Fiil laboratuvarında çalış" düğmesi eklendi.
- [x] **Gece Bakım Turu 22 — Rehber Sıralı Ders Geçişi & Zaman/Hatırlatıcı Birim Testleri (#383):**
  - `src/ui/Guide.tsx` (`LessonView`): Bir dersin sonunda müfredat sırasındaki bir sonraki derse (`Sıradaki ders`) ana listeye dönmeye gerek kalmadan tek tıkla geçiş sağlayan kart eklendi.
  - `src/ui/GuideReviewNudge.test.tsx` (2 test): Bugün ekranındaki Rehber tekrar hatırlatıcısının (`GuideReviewNudge`) boş durumda gizlenmesi, günü gelen derste ("Hatırlıyor musun?") gösterilmesi, tıklanınca dersi açması ve "Şimdi değil" ile ertelenmesi doğrulandı.
  - `src/data/tenseLesson.test.ts` (1 kapsamlı doğrulama testi): Fransızca (12 zaman) ve İspanyolca (14 zaman) Fiil Laboratuvarındaki tüm 26 zamanın `TENSE_LESSON` içinde eksiksiz pedagojik alanlara (`summary`, `uses`, `formation`, `examples`, `watch`, `tip`, `turkish`) sahip olduğu güvence altına alındı.
- [x] **Gece Bakım Turu 23 — Yeni Diloloji Logo ve Uygulama İkonu Tasarımı (#384):**
  - Gemini ile tasarlanan ve seçilen yeni **Modern "D" Konuşma Balonu + Çift Yapraklı Filiz + Açık Kitap Sayfaları + Altın Kıvılcım** logosu vektörel olarak işlendi (`scripts/build-icons.mjs`).
  - Uygulama içi marka amblemi (`src/ui/icons.tsx` — `BrandMark`), açılış ekranı (`index.html`), sekme simgesi (`public/favicon.svg`), bildirim rozeti (`public/notification-badge.png`) ve tüm PWA/iOS uygulama simgeleri (`public/pwa-512.png`, `public/pwa-192.png`, `public/pwa-maskable-512.png`, `public/apple-touch-icon.png`) yeni logoyla güncellendi.
- [x] **Gece Bakım Turu 24 — "Videolarda Duy" (`/api/clips`) Özelliğinin Onarımı (#385):**
  - `api/clips.ts` & `src/engine/clips.ts`: Vercel ortamındaki geçersiz `YOUTUBE_API_KEY` (`400 API_KEY_INVALID`) ve YouTube `/api/timedtext` hız sınırı (`429`) nedeniyle çalışmayan "Videolarda duy" özelliği için anahtar ve kota gerektirmeyen **YouGlish altyazı dizini + YouTube oEmbed** birincil hızlı kaynağı (`~300 ms`) ve **YouTube Innertube arama** yedek hattı eklendi.
  - `api/_captions.ts`: Altyazı yanıtlarında HTTP durum kodu ve HTML hata sayfası (`429 Sorry...`) denetimi eklendi.
  - `src/data/clips.ts`, `src/ui/Clips.tsx` & `api/_origin.ts`: Boş sonuçların `localStorage`'da 7 gün önbelleklenmesi engellendi, "Yeniden ara" düğmesine önbellek atlama (`fresh`) desteği ve `diloloji-*.vercel.app` kaynak izni eklendi.
- [x] **Gece Bakım Turu 25 — Monki Açılış Ekranı Aktif Karakter Animasyonu (#386):**
  - `src/ui/monki/MonkiMascot.tsx` & `src/ui/monki/Monki.tsx`: Monki karşılama/kurulum ekranlarına (`monki-setup` ve `monki-hello`) otomatik poz geçişli (`wave` → `cheer` → `hang` → `think`), hedef dilde konuşma balonlu (`¡Hola!`, `¡Vamos!` vb.) ve dokunulduğunda zıplayıp poz değiştiren etkileşimli `MonkiStage` bileşeni eklendi.
  - `src/lazy.css` & `src/index.css`: Yaylanmalı zıplama (`monki-dance`, `monki-hop-burst`), zıplamayla senkronize dinamik zemin gölgesi (`monki-shadow-pulse`), süzülen konuşma balonu ve kıvılcım animasyonları eklendi.
- [x] **Gece Bakım Turu 26 — Sevimli İstatistik Maskotları (Filiz, Yıldız, Kitap) & Karşılıklı Arkadaşlık Senkronizasyonu (#387):**
  - **Uyumlu Çizim Maskotlar (`src/assets/art/stat-sprout.webp`, `stat-star.webp`, `stat-book.webp`, `src/ui/drawnArt.ts`):** `StreakPicture` ateş karakteriyle tam uyumlu sıcak kawaii çizim tarzında, koyu kahve hatlı ve gülen yüzlü sevimli Filiz (`yeni kelime`), Yıldız (`güçlenen` / `aktif kelime`) ve Açık Kitap (`kelime öğreniliyor`) karakterleri şeffaf WebP olarak eklendi (`STAT_ART`).
  - **Arayüz Bütünlüğü (`src/ui/SessionSummary.tsx`, `src/ui/Screens.tsx`, `src/ui/Profile.tsx`, `src/index.css`):** Oturum sonu kutlama çubuğunda (`SessionSummary`), Bugün ekranı durum kartında (`Screens.tsx`) ve Profil istatistiklerinde (`Profile.tsx`) ince SVG hat ikonları yerine aynı sevimli çizim karakterleri kullanıldı; koyu temada `--art-edge` kenar aydınlatması uygulandı.
  - **Karşılıklı Arkadaşlık Desteği (`api/_friends.ts`):** Arkadaş ekleme tek taraflı takip modelinden iki yönlü (karşılıklı) arkadaşlık modeline taşındı. Biri sizin kodunuzu eklediğinde veya siz birini eklediğinizde iki taraf da birbirini anında liderlik panosunda görür; `friendsOf` hem takip edilenleri hem de takipçileri harmanlayarak listeye dahil eder.
- [x] **Gece Bakım Turu 27 — Arkadaş Takipçileri PostgREST Sözdizimi Onarımı & Birim Testleri (#388):**
  - `api/_friends.ts`: `tableFriends.followers` içerisindeki `in.()` filtre sözdizimi PostgREST standardına (`in.(id1,id2,...)`) uygun hâle getirildi.
  - `src/data/friends.test.ts`: Takipçi listeleme, karşılıklı arkadaşlık ve boş takipçi kümesi birim testleriyle güvenceye alındı (3/3 geçti).
- [x] **Gelişim Turu 28 — İleri Seviye Pedagojik Özellikler (Günün Mikro Haberi, Hata Avcısı, Cümle Dönüşümü) (#389):**
  - **Günün 2 Dakikalık Mikro Haberi (`src/ui/DailyNewsHero.tsx`, `src/ui/Reading.tsx`, `src/ui/icons.tsx`, `src/index.css`):**
    - Okuma ekranının en üstüne Fransızca için RFI Savoirs (*Le journal en français facile*), İngilizce ve İspanyolca için VOA açık bültenlerinden günün en anlaşılır haberini getiren canlı mikro haber vitrini eklendi.
    - Metin kelime dağarcığı kapsamını otomatik hesaplama (`coverageLine`), tahmini okuma süresi, sesli dinleme rozeti ve tek tıkla senkronize cümle takibiyle okuma başlatma desteği sağlandı.
  - **Hata Avcısı / Spot the Error (`src/data/spotErrors.ts`, `src/ui/games/SpotErrorGame.tsx`, `src/ui/Games.tsx`, `src/ui/gameList.ts`):**
    - B2/C1 seviyesinde en kritik gramer ve sözdizimi tuzaklarını (Fransızca participe passé COD uyumu, subjonctif zorunlulukları; İspanyolca haber impersonal tekilliği, aunque ile subjuntivo; İngilizce negative inversion, mandative subjunctive, preposition gerund) içeren 45 uzmanlık sorusu hazırlandı.
    - Cümledeki kelimeleri dokunulabilir etkileşimli çiplere bölen, hatalı kelime tıklandığında 3 seçenekli düzeltme ve derinlemesine Türkçe gramer kuralı açıklaması sunan yeni oyun modu geliştirildi.
  - **Cümle Dönüşümü / Sentence Transformation (`src/data/sentenceRewrites.ts`, `src/ui/games/SentenceRewriteGame.tsx`):**
    - Cambridge C1 Advanced, DALF C1 ve DELE C1 sınav standartlarında, zorunlu anahtar kelime verilerek cümlenin anlamı bozulmadan tamamlanmasını gerektiren 45 C1 dönüşüm alıştırması geliştirildi.
    - Büyük ve küçük harf, kesme işareti ve boşluk toleranslı bulanık denetim motoru (`isRewriteAnswerCorrect`), adım adım harf ipucu butonu ve detaylı kural izahı eklendi.
  - **Birim Testleri & Kapsamlı Doğrulama:**
    - `src/data/spotErrors.test.ts` (4 test), `src/data/sentenceRewrites.test.ts` (5 test), `src/ui/games/SpotErrorGame.test.tsx` (1 test), `src/ui/games/SentenceRewriteGame.test.tsx` (1 test), `src/ui/DailyNewsHero.test.tsx` (1 test) eklendi; tüm testler (390 dosya, 2018 test) %100 başarıyla geçti.
- [x] **Gelişim Turu 29 — Eşdizimlilik ve Edat Kalıpları Oyunu & Kelimeye Kendi Bağlamını Bağlama (#390):**
  - **Edat ve Kalıplar Oyunu (`src/data/collocationDrill.ts`, `src/ui/games/CollocationsGame.tsx`, `src/ui/Games.tsx`, `src/ui/gameList.ts`):**
    - B1/B2/C1 seviyesinde fiil-edat bağımlılıkları (*décider de, réussir à, s'intéresser à, soñar con, depender de, depend on, be interested in, accuse of* vb.) ve doğal eşdizimleri (*heavy rain, make a mistake, do someone a favour, poser une question, tomar una decisión, dar un paseo* vb.) test eden 54 soru hazırlandı (FR, ES ve EN için 18'er soru).
    - Cümledeki kilit edat/kelime boşluğunu (`___`) 4 seçenekten seçtiren, klavye kısayolları (`1`–`4`, `Enter`), sesli telaffuz (`speakAsync`), Türkçe pedagojik kural açıklaması ve rekor/log kaydı sunan tam donanımlı yeni oyun modu geliştirildi.
    - `GAME_LIST` ve `GamesScreen` içinde `Dilbilgisi` kategorisine kaydedildi.
  - **Kelimeye Kendi Bağlamını Bağlama (*First Encounter Context*):**
    - Okunan kitap, haber, masal ya da kaydedilen cümlenin bağlamı (`FirstEncounterContext`: `title`, `sentence`, `at`) IndexedDB `meta.firstEncounters` tablosuna kaydedilir.
    - `finishReading` (`reading.ts`) ve `useFinishReading.ts` okunan metindeki tüm kelimelerin geçtiği cümleleri ve metin başlığını otomatik kaydeder (ilk karşılaşma bozulmadan korunur).
    - `WordForm` ve `keepSentence` üzerinden eklenen kelimeler de kaynak metin ve cümleleriyle hafızaya bağlanır.
    - `WordDetail.tsx` kelime sayfasında *"İlk karşılaştığın yer"* kutusu (kitap/haber başlığı, tarih ve alıntı cümle) gösterilir.
    - `WordJourney.tsx` kelimenin yolculuk zaman tüneline `first_met` adımı eklenir.
    - `exportBackup`, `restoreBackup` ve `mergeBackups` (cihazlar arası senkronizasyon) tam desteklenir.
  - **Birim Testleri & Kapsamlı Doğrulama:**
    - `src/data/collocationDrill.test.ts` (6 test), `src/ui/games/CollocationsGame.test.tsx` (1 test), `src/data/db.test.ts` (firstEncounters testleri), `src/engine/__tests__/reading.test.ts` (firstEncounters testleri), `src/engine/__tests__/journey.test.ts` (first_met testleri) eklendi; tüm testler (392 dosya, 2025 test) %100 başarıyla geçti.
- [x] **Gelişim Turu 30 — Test ve Rehber Soru Havuzlarının Zenginleştirilmesi (+90 İleri Seviye Soru & 4. Rehber Sınav Soruları):**
  - **Hata Avcısı (Spot Errors — `src/data/spotErrors.ts`):** Soru havuzu 45'ten 75'e çıkarıldı (+10 FR, +10 ES, +10 EN). Fransızca (*dont vs que, avoir l'air uyumu, subjonctif passé, quoique, se laver les mains COD, c'est moi qui ai, ce qui vs ce que, faire + infinitif, après que + indicatif, y vs en*), İspanyolca (*ojalá + subjuntivo, por vs para, confiar en, este problema, antes de que, haber impersonal / hubieron, querer que, conocer vs saber, si + imperfecto de subjuntivo, gustar dolaylı tümleç*), İngilizce (*no sooner ... than, hardly ... when, cleft agreement, look forward to + gerund, despite vs although, seldom does he make, be used to + gerund, uncountable advice, would rather someone did, had better + bare infinitive*).
  - **Cümle Dönüşümü (Sentence Rewrites — `src/data/sentenceRewrites.ts`):** Soru havuzu 45'ten 75'e çıkarıldı (+10 FR, +10 ES, +10 EN). Cambridge C1, DALF C1 ve DELE C1 standartlarında yeni kilit kelime dönüşümleri (*PEUT-ÊTRE, FAUTE, DOUTE, AUSSITÔT, RÉPUTÉ, BEAU, IMPORTE, DONNÉ, COMPTE, SURPRISE, PROBABLEMENTE, NADA, POR, HABER, PARECE, HINCAPIÉ, ACORDARTE, PUNTO, CASUAL, REMEDIO, WISH, CONDITION, BURST, NEEDN'T, SELDOM, SUCCEEDED, BUT, COME, RESEMBLANCE, CAN'T*).
  - **Eşdizimlilik ve Edat Kalıpları (Collocation Drills — `src/data/collocationDrill.ts`):** Soru havuzu 54'ten 84'e çıkarıldı (+10 FR, +10 ES, +10 EN: her dile 28 soru). Kilit fiil-edat ve doğal eşdizimler (*s'intéresser à, finir par, faire attention à, remercier pour, porter plainte, compter sur, rendre visite à, garder son sang-froid, rêver de, poser une question, acostumbrarse a, enamorarse de, tomar una decisión, preocuparse por, llevar a cabo, consistir en, echar de menos, quejarse de, hacer la vista gorda, dar un paseo, prevent from, pay attention to, belong to, take into account, come to a standstill, succeed in, make a mistake, draw a conclusion, prone to, bear in mind*).
  - **Rehber Dersleri Mini-Sınav Zenginleştirmesi (`src/data/guide/lessons-{fr,es,en}.ts`):** Fransızca (*subjonctif, participe_passe*), İspanyolca (*subjuntivo, por_para*) ve İngilizce (*inversion, cleft, subjunctive*) kilit ileri düzey derslerine 4. kontrol soruları eklendi.
  - **Test Güvenliği ve Dayanıklılık:** `src/data/spotErrors.test.ts`, `src/data/sentenceRewrites.test.ts`, `src/data/collocationDrill.test.ts` eşikleri 25'e yükseltildi. `SpotErrorGame.test.tsx` aktif cümle eşleşmesi tam cümle düzeyine çıkarıldı, `FillMissing.test.tsx` asenkron yığın beklemesi CPU yüküne karşı güçlendirildi.
- [x] **Dış Kaynak Bağlantıları Canlı Doğrulaması (#365):**
  - `scripts/check-guide-links.ts` ile 40 dış kaynak canlı ağda tarandı, `Spanish Grammar in Context` yeni adresi (`https://grammar.spanishintexas.org/`) doğrulanarak 200 OK alındı (`docs/kaynaklar/rehber-baglantilari.md`).

## Sıradaki Olası İşler ve Açık Kalanlar (Güncel Durum)
- **13.9 Görsel Referansları Yenileme:** GitHub Actions kotası açıldığında `gh workflow run snapshots.yml --ref main` ile Linux referans ekran görüntülerinin güncellenmesi (Bugün, Rehber, Ayarlar → Hesap, Kartlar).
- **Yeni Özelliklerin Etkisi:** Kullanıcı düzenli çalıştıkça Kartlar, Rehber mini sınavları ve seri kurtarma mekanizmasının tutundurma (retention) verileri izlenecek.
- **Kullanıcıya önerilen:**
  - İsterse yedek dosyasını veya Supabase senkronizasyonunu kullanarak birden çok cihazda çalışmaya başlaması.







