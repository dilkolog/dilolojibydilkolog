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

- **Sözlük paketi** (2026-10-07): üretildi ve eklendi (`src/data/wordpack/`, kaynak notu SOURCE.md).
  Her dil için en sık 8000 kelime; Türkçe anlam EN %61, FR %74, ES %77; diğer dillerdeki karşılık %80–93.
  Yeni dökümlerde çeviri tabloları anlamların içinde (`senses[].translations`); anlamlar kelimenin kendi
  tanımlarındaki sıraya göre diziliyor, kaba/hakaret etiketli anlamlar alınmıyor. Paketler JS değil düz JSON
  dosyası olarak sunuluyor: kurulum indirmesine girmiyor, dil ilk gerektiğinde iniyor ve `word-packs`
  önbelleğinde offline kalıyor. Yeniden üretirken sürümü değiştir (`applyPack` yalnızca sürüm değişince uygular).
  İspanyolca için ses kaydı yok (dökümde yok).
- **Paralel cümleler** (2026-10-07): yapıldı. Tatoeba sorgusu `showtrans:lang=tur,<diğer iki dil>` ile
  (`showtrans` yalnızca all/none/matching alır ve `showtrans:lang` ile birlikte kullanılamaz). Gerçek
  cümlelerin altında diğer iki dildeki hâli görünür (`Example.parallel`). Önceden getirilmiş cümlelerde
  yoktur; "Yeniden getir" ile gelir.
- Cümle zorluğu (i+1): cümleler sıklık listesi ve kullanıcının kendi kelimeleriyle derecelenir
  (`engine/sentenceFit.ts`). Liste son tam derecelendirmeden bu yana onda bir (en az 10 kelime) büyüyünce
  bütün kayıtlı cümleler yeniden derecelendirilir (`needsRescore`, 2026-10-07); yalnızca sırası değişen kelimeler yazılır.

## Fiil laboratuvarı (2026-10-06)
- [x] Pratik → Fiiller: öğrenme, alıştırma (yaz/seç/dinle/eşleştir/zamanı bul/hangi fiil), FSRS tekrarı, kalıplar (fiil aileleri), zamana karşı, kıyaslama, ustalık ve fiil bahçesi. Çekim oyunları buraya taşındı.
- [x] Lab verisi (favoriler, tekrar, bahçe) ve oyun rekorları yedeğe ve eşitlemeye girdi.
- [ ] Emir kipi (imperativo / impératif) ve passé simple.
- [ ] "Metinde gördüğün çekimler" listesi (okuma → Ustalık).
- [x] Gerçek sözlük paketini internetli ortamda derlemek (scripts/build-wordpack.ts).

