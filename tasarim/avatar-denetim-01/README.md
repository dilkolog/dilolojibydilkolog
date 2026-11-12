# Avatar alanı — tasarım incelemesi

10 Kasım 2026. Kullanıcının Safari ekran görüntüsü ve `origin/main` (`b1c059bb`) incelendi. 15 ücretsiz portre ve 27 kazanılabilir seçenek olmak üzere 42 görsel karşılaştırıldı. [Toplu görsel](mevcut-avatarlar.jpg), [dosya envanteri](envanter.json), [Claude devir notları](CLAUDE-DEVIR.md).

Bu paket incelemedir; yeni çizim veya uygulanmış arayüz içermez. Canlı oturumda etkileşim testi yapılmadı. Ekran görüntüsündeki görünüm kodla karşılaştırıldı; yerel eski checkout ile güncel main yollarının farklı olduğu gözetildi.

## İyi taraflar

Tilki, panda, kedi, penguen, tavşan ve ahtapot gibi temel portreler küçük ölçekte tanınıyor. Yuvarlak arka plan, sıcak çizgi ve seçili kartın dil rengiyle çevrelenmesi korunabilir. Monki'nin farklı hâllerini öğrenme ilerlemesiyle kazanmak markaya uygun. Kodda seviye, seri, yenilen boss ve öğrenilen kelime koşulları zaten tanımlı; yeniden ödül kuralı icat etmek gerekmiyor.

## Öncelikli sorunlar

1. **Ödüllerin çoğu avatar için hazırlanmış portre değil.** Tam boy Monki, kitap, yıldız ve canavar illüstrasyonları küçük kareye yerleştirilmiş. Ücretsiz hayvan yüzleri alanı doldururken tam boy figürün yüzü çok küçük kalıyor. Sorun yalnız dosya çözünürlüğü değil; kadraj ve görsel ağırlık.
2. **Çizim dili tam eşit değil.** Köpek, ayı, aslan, geyik ve kaplanda daha çok tüy detayı veya hacim var; tilki/panda/ahtapot daha sade. Kurbağanın yeşili diğer pastel zeminlere göre çok parlak. Kronos fazla ayrıntılı, altın yıldız daha parlak ve hacimli; küçük avatar ölçüsünde ana setle aynı aileyi oluşturmuyor.
3. **Kilitli alan silik bir görsel kalabalığına dönüşüyor.** `.earned-avatar.is-locked .emoji-monki` için `grayscale(0.85)` ve `opacity: 0.6` kullanılıyor. Ayrıntılar, küçük figür ve kilit üst üste binince ne kazanılacağı seçilemiyor.
4. **Başlık durumla uyuşmuyor.** “Kazanılan avatarlar” altında açılmamış seçenekler de var. “Özel avatarlar” veya “Monki koleksiyonu” daha doğru; açılan/kilitli durum ayrıca gösterilmeli.
5. **Kazanma koşulu ilk bakışta görünmüyor.** Kodda `title` ve kilitli karta basınca toast var. Kullanıcının her kartı yoklaması gerekiyor. Kart adı ve kısa koşul görünür olmalı; “Seviye 8”, “7 günlük seri” gibi.
6. **Düzenleme araçlarının hiyerarşisi zayıf.** Üstte karakter şeridi, aşağıda tam figürler, altında etiketsiz renkler var. Rengin avatar zeminini mi, kapağı mı değiştirdiği anlaşılmıyor. Ücretsiz çizilmiş portreler Avatar içinde sabit kendi zeminlerini kullanırken bazı kapaklar ve tam figürler profil renginden etkileniyor; bu nedenle etki avatar türüne göre değişebiliyor.
7. **Seviye aynı bölgede tekrarlanıyor.** Avatarın altındaki 7 ve yanındaki “Seviye 7” birlikte görünümü kalabalıklaştırıyor. Profil başlığındaki bir gösterim yeterli olabilir; XP alanı zaten ilerlemeyi ayrıntılı veriyor.

## Önerilen yön

- Üstte seçili avatarın büyük önizlemesi ve adı; yanında açık durum veya gereken hedef.
- “Karakterler” ve “Özel avatarlar” ayrımı. Özel koleksiyonda “Açılanlar” ve “Tümü” filtresi.
- İsim ve kısa koşul taşıyan, daha rahat aralıklı kartlar. İlk tasarım denemesinde 72 px görsel alanı ve 96 px civarı kart genişliği; telefon için 3–4 sütun ekran genişliğine göre denenmeli. Bunlar öneridir, test edilmiş uygulama ölçüleri değildir.
- Kilitli karakter tanınabilir renkte kalsın; durum kilit rozeti ve koşul yazısıyla anlatılsın. Sadece renge bağlı durum iletimi kullanılmasın.
- Renk bölümüne “Profil rengi” etiketi ve etkisini gösteren önizleme.
- Seçim anında kaydediliyorsa kısa “Kaydedildi” geri bildirimi; “Bitti”nin düzenleyiciyi kapattığı anlaşılır olsun.

## Çizim önceliği

Önce genel kart kadrajı ve ölçek standardı. Ardından Kronos ve çok ayrıntılı hayvan portreleri; sonra ödül Monki'leri için aynı standartta baş/üst gövde avatarları. Tam boy mevcut çizimler kendi hikâye ve kutlama kullanımında kalabilir. Avatar için otomatik yüz kırpması yapılmamalı: taç, şapka ve kulaklar elle belirlenen güvenli alana sığmalı.

Daha önce hazırlanmış Monki yenileme adayları otomatik olarak bu avatar ölçüsünü sağlıyor sayılmaz. Yeni adaylar 32, 48 ve 88 px'te; açık/koyu zeminlerde ve seçili/kilitli hâllerde ayrıca karşılaştırılmalı.
