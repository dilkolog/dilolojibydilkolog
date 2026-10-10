# Diloloji — İleri Seviye Pedagojik Gelişim Fikirleri ve Yol Haritası Kılavuzu

**Tarih:** 2026-10-10  
**Hazırlayan:** Antigravity (Kullanıcı Talebi Üzerine Fikir & Pedagoji Raporu)  
**Hedef Kitle:** Claude Code ve proje ekibi (uygulama mimarisi ve karar için devir notu)  
**Bağlam:** Diloloji'nin mevcut güçlü temeli (FSRS aralıklı tekrarı, cümle takipli okuma, dikte, gölgeleme, geri çeviri, sesli kitaplar, telaffuz analizi ve hata teşhisi) üzerine inşa edilebilecek, özellikle **B1'den B2/C1 akıcılığına geçişi hızlandıracak** ve uygulamayı gerçek bir poliglott laboratuvarına dönüştürecek 14 yenilikçi gelişim alanı.

---

## 1. Giriş ve Vizyon

Dil öğreniminde kelime ezberlemenin ötesine geçerek **doğal refleks, aktif üretim, ince anlam ayrımları ve zihinsel akıcılık** kazanılması hedeflenmektedir. Bu belgedeki fikirler; açık lisanslı verilerle (OER, Tatoeba, açık korpuslar) beslenebilecek, düşük/orta geliştirme maliyetine sahip ve uygulamanın mevcut sakin tasarım felsefesine (`DESIGN.md`: *"Cesaret veren koç, büyüyen bahçe"*) tam uyumlu pedagojik önerilerdir.

---

## 2. Temel Dil Becerisi Gelişim Fikirleri (1–6)

### 🎯 1. Hata Avcısı (*Spot the Error / Error Correction*)
* **Pedagojik Gerekçe:** İleri seviye (B2/C1) öğrenicilerin en büyük sorunu kuralları bilmemek değil; kendi dil alışkanlıklarından kaynaklanan küçük gramer/yazım tuzaklarını fark edememektir. Düzeltme egzersizleri dikkati ve kural bilincini keskinleştirir.
* **Nasıl Çalışır?**
  - Ekrana içinde tek bir kritik B2/C1 hatası bulunan cümle gelir.
  - Kullanıcı hatalı kelimeye dokunur (kelime vurgulanır) ve doğrusunu yazar ya da çoktan seçmeli olarak doğru alternatifi seçer.
* **Örnek Senaryolar:**
  - **FR:** *"Les lettres qu'il a **écrit** hier sont parties."* ➔ Hata: *écrit* ➔ Doğrusu: *écrites* (Participe passé COD antécédent uyumu).
  - **ES:** *"Aunque **está** lloviendo mañana, iremos al campo."* ➔ Hata: *está* ➔ Doğrusu: *esté* (Gelecekteki belirsiz şartta Subjuntivo).
  - **EN:** *"Hardly I had **arrived** when the phone rang."* ➔ Hata: *I had* ➔ Doğrusu: *had I* (Devrik yapı - Inversion).
* **Veri Kaynağı:** LanguageTool hata kuralları, BEA-2019 / Lang-8 açık hata korpusları.
* **Uygulama Yeri:** `Pratik` (Practice Hub) ➔ Oyunlar veya Gramer altında bağımsız bir kart.

---

### 🔄 2. Kalıp Cümle Dönüşümü (*Sentence Transformation / Rewrite*)
* **Pedagojik Gerekçe:** Cambridge C1 Advanced, DALF C1 ve DELE C1 sınavlarının en prestijli soru tipidir. Aynı düşünceyi farklı bağlaç, fiil veya sözdizimiyle ifade etme esnekliği kazandırır.
* **Nasıl Çalışır?**
  - İlk cümle ve bir **anahtar kelime** verilir.
  - İkinci cümlenin boşluğu, anahtar kelime kullanılarak ve ilk cümleyle **birebir aynı anlamı koruyacak** şekilde doldurulur (2–5 kelime).
* **Örnek Senaryolar:**
  - **FR:** *Cümle 1:* "Bien qu'il fasse froid, nous sortons." | *Anahtar:* **MALGRÉ** | *Çözüm:* "Nous sortons ___." ➔ *"malgré le froid"*
  - **ES:** *Cümle 1:* "Es necesario que estudies más para aprobar." | *Anahtar:* **DEBERÍAS** | *Çözüm:* "Tú ___ para aprobar." ➔ *"deberías estudiar más"*
  - **EN:** *Cümle 1:* "I haven't seen her for five years." | *Anahtar:* **TIME** | *Çözüm:* "The ___ was five years ago." ➔ *"last time I saw her"*
* **Veri Kaynağı:** OER Commons C1 materyalleri, açık Anki C1 desteleri.
* **Uygulama Yeri:** `Pratik` ➔ "Cümle Dönüşümü" alıştırma modu.

---

### 👂 3. Kulak Jimnastiği: Minimum Çiftler (*Minimal Pairs*)
* **Pedagojik Gerekçe:** Öğreniciler okurken anladıkları kelimeleri konuşma anında ayırt edememekten şikayetçidir. Özellikle Türkçede bulunmayan ses zıtlıkları (nazal ünlüler, kapalı/açık e, boğaz sesleri) algı blokajı yaratır.
* **Nasıl Çalışır?**
  - 10 saniyelik çok hızlı bir refleks oyunu.
  - 1 saniyelik bir ses çalar; ekranda 2 kart belirir. Kullanıcı duyduğu kelimeye dokunur.
* **Hedef Ses Zıtlıkları:**
  - **FR:** *dessus* (üzerinde) vs *dessous* (altında), *poisson* ([s]) vs *poison* ([z]), *tu* ([y]) vs *tout* ([u]), *vin* vs *vent* vs *vont* (nazal üçlü).
  - **ES:** *pero* (tek r) vs *perro* (çift r), *caza* ([θ]) vs *casa* ([s]), *caro* vs *carro*.
  - **EN:** *ship* ([ɪ]) vs *sheep* ([i:]), *bat* ([æ]) vs *bet* ([e]), *think* ([θ]) vs *sink* ([s]).
* **Veri Kaynağı:** Forvo CC kayıtları, Shtooka ses arşivi, Azure Speech TTS.
* **Uygulama Yeri:** `Pratik` ➔ Oyunlar ➔ "Kulak Jimnastiği".

---

### 🔗 4. Eşdizimlilik ve Edat Kalıpları (*Collocations & Verb Prepositions*)
* **Pedagojik Gerekçe:** Tekil kelime ezberi B1 seviyesinde tıkanır. B2/C1 akıcılığı kelimelerin **hangi fiil ve edatlarla doğal kümelendiğini** bilmekle mümkündür (*"make a mistake"* vs *"do a mistake"*).
* **Nasıl Çalışır?**
  - **Edat Doldurma:** Fiilden sonra hangi edatın geldiği sorulur:
    - *FR:* *décider ___ partir* ➔ **de**; *réussir ___ comprendre* ➔ **à**; *s'intéresser ___ l'art* ➔ **à**.
    - *ES:* *soñar ___ viajar* ➔ **con**; *darse cuenta ___ error* ➔ **de**; *pensar ___ ti* ➔ **en**.
    - *EN:* *depend ___* ➔ **on**; *interested ___* ➔ **in**; *accused ___* ➔ **of**.
  - **Doğal Eşleşme (Collocation Match):** *heavy rain* (strong rain değil), *poser une question* (faire değil).
* **Veri Kaynağı:** Wiktionary edat tabloları, Tatoeba kalıp taraması.
* **Uygulama Yeri:** Sözlük kartında "Birlikte Kullanılanlar" çipi ve Pratik'te hızlı eşleştirme.

---

### ⚠️ 5. Tuzak Kelimeler (*Yalancı Eşdeğerler / Faux Amis*)
* **Pedagojik Gerekçe:** Türkçedeki Fransızca alıntılar veya İngilizceye benzeyen İspanyolca sözcükler öğrenicide sahte bir güven hissi yaratarak büyük anlam karmaşalarına yol açar.
* **Nasıl Çalışır?**
  - Sözlükte ve kartlarda bu kelimelerin üzerine dokunsal bir **"⚠️ Tuzak Kelime"** rozeti konur.
  - "Tuzaklara Düşme!" test modülü: Cümlede kelimenin gerçek anlamı mı yoksa tuzak anlamı mı kastedildiği sorulur.
* **Kritik Örnekler:**
  - **FR:** *actuellement* ("aslında" değil, *"şu anda"*); *attendre* ("katılmak" değil, *"beklemek"*); *sensible* ("mantıklı" değil, *"duyarlı"*); *blessé* ("kutsanmış" değil, *"yaralı"*).
  - **ES:** *embarazada* ("mahcup" değil, *"hamile"*); *éxito* ("çıkış" değil, *"başarı"*); *constipado* ("kabız" değil, *"soğuk algınlığı"*).
* **Veri Kaynağı:** Hazır açık yalancı eşdeğer listeleri.
* **Uygulama Yeri:** Kelimeler sekmesinde özel rozet/filtre ve mini sınav.

---

### 📻 6. RFI & VOA ile "Günün 2 Dakikalık Mikro Haberi"
* **Pedagojik Gerekçe:** Kitaplar harika bir edebi temel sağlar; ancak yaşayan, çağdaş B2/C1 dili günlük haberlerde ve güncel olaylarda akar.
* **Nasıl Çalışır?**
  - **RFI Savoirs (*Le journal en français facile*):** Fransız Kamu Radyosu her gün sade ve anlaşılır Fransızca ile tam transkriptli 10 dakikalık bülten yayınlar (ücretsiz açık RSS).
  - **VOA Learning English (*As It Is*):** İngilizce için her gün sesli ve resimli 2 dakikalık mikro bültenler (Kamu Malı / Public Domain).
  - Okuma ekranının en üstüne "Günün 2 Dakikalık Haberi" vitrini gelir.
  - Kullanıcı her sabah 1 adet güncel olayı dinleyip senkronize cümle takibiyle okur (`listenFollow.ts` altyapımız hazırdır).
* **Uygulama Yeri:** `Okuma` (Reading Hub) üst vitrini.

---

## 3. İleri Düzey Akıcılık ve Bilişsel Dilbilim Fikirleri (Vizyon 2.0: 7–14)

### 🔁 7. Çift Yönlü Çeviri Döngüsü 2.0 (*The Bidirectional Loop / Schliemann Metodu*)
* **Pedagojik Gerekçe:** Tarihin en büyük poliglottlarının (Heinrich Schliemann, Luca Lampariello) ana dili seviyesine ulaşma tekniğidir. Ana dil düşünce kalıpları ile hedef dilin doğal sözdizimi arasındaki mesafeyi kapatır.
* **Nasıl Çalışır?**
  1. **1. Gün:** Kullanıcı okuduğu metinden beğendiği 2–3 cümleyi Türkçeye çevirir (veya kayıtlı çevirisini inceler).
  2. **2. Gün (24 saat sonra):** Orijinal yabancı cümle **tamamen gizlenir**, sadece kullanıcının dünkü Türkçe cümlesi gösterilir: *"Bunu hedef dile geri çevir."*
  3. **Yüzleşme Anı (Diff View):** Kullanıcının yazdığı ile orijinal yazarın cümlesi alt alta gelir; aradaki sözdizimi, edat ve kelime tercih farkları renkle vurgulanır.
* **Uygulama Yeri:** Oyunlar ➔ "Geri Çeviri" modunun "Döngü Modu" (Loop Mode).

---

### 🧩 8. Bağlamdan Kelime Çıkarımı (*Lexical Deduction / Sansürlü Okuma*)
* **Pedagojik Gerekçe:** B2/C1 okuyucusunun en büyük gücü bilinmeyen kelimeleri sözlüğe bakmadan cümlenin bağlamından çıkarabilmesidir. Her bilinmeyende sözlüğe dokunmak bu zihinsel kası tembelleştirir.
* **Nasıl Çalışır?**
  - Okuma ekranında (hikaye veya haber) zor bir kelime varsayılan olarak `[ ? ]` şeklinde sansürlü gelir.
  - Kullanıcı dokunmadan önce cümlenin gidişatından kelimenin anlamını zihninde tahmin etmeye zorlanır.
  - Dokununca kelime açılır ve *"Tahminin ne kadar yakındı? (Tam bildim / Yaklaştım / Şaşırttı)"* diye sorulur.
* **Uygulama Yeri:** `Okuma` ekranında "Çıkarım Modu" (Deduction Mode) düğmesi.

---

### ⚡️ 9. 3 Saniye Kuralı: Refleks Otomatizasyonu (*Rapid-Fire Retrieval*)
* **Pedagojik Gerekçe:** Konuşurken duraksamanın temel sebebi, bilginin uzun süreli hafızadan konuşma motoruna aktarılma hızının (retrieval speed) yavaş olmasıdır.
* **Nasıl Çalışır?**
  - Gramer kuralı veya uzun cümle sorulmaz. Hayatta en sık kullanılan durum kalıpları için **3 saniyelik mikro-meydan okumalar**:
    - *"Nasıl 'Fikrimi değiştirdim' dersin?"* ➔ `J'ai changé d'avis` / `He cambiado de opinión` / `I changed my mind`.
    - *"Nasıl 'Bana uyar' dersin?"* ➔ `Ça me va` / `Me parece bien` / `Works for me`.
    - *"Nasıl 'Lafı bile olmaz' dersin?"* ➔ `De rien / Je t'en prie` / `No hay de qué` / `Don't mention it`.
  - Kullanıcı düşünmeden mikrofona söyler veya tek tıkla doğrular.
* **Uygulama Yeri:** `Pratik` ➔ Oyunlar ➔ "Refleks Turu".

---

### 🧠 10. Düşünceyi Hedef Dilde Kurma: İç Monolog Koçu (*Internal Monologue Prompts*)
* **Pedagojik Gerekçe:** Dil sadece ekranda soru çözerken değil, günlük hayatta zihnin içinde yaşatıldığında kalıcı olur.
* **Nasıl Çalışır?**
  - Bugün ekranında her gün küçük bir **"Günün Zihin Tohumu"**:
    - *"Bugün seni en çok ne güldürdü? 2 cümleyle zihninde Fransızca canlandır."*
    - *"Yarın yapacağın ilk 3 işi İspanyolca sırala."*
    - *"Şu an odanda gördüğün 3 nesneyi sıfatlarıyla birlikte İngilizce tarif et."*
  - Kullanıcı bunu isterse mikrofona söyler (Speech-to-text metne döker, LanguageTool hafif bir geri bildirim verir), isterse kafasında kurup "Düşündüm ✓" der.
* **Uygulama Yeri:** `Bugün` (Today) ekranı altında günün bitiş kartı.

---

### 🎭 11. Sosyal Dil Uyumu ve Kayıt Farkı (*Register Shift: Sokak vs Salon vs Ofis*)
* **Pedagojik Gerekçe:** İleri seviye bir öğrenici sadece doğru kelimeyi değil, **doğru ortamda doğru kelimeyi** seçebilmelidir (*Soutenu / Courant / Familier*).
* **Nasıl Çalışır?**
  - Aynı düşüncenin 3 farklı dildeki tonu eşleştirilir:
    - *Yemek:* **la bouffe** (günlük/sokak) vs **la nourriture** (standart) vs **les mets** (şık restoran/edebi).
    - *İş:* **el curro / laburo** (argo/günlük) vs **el trabajo** (standart) vs **el empleo / la labor** (resmi).
    - *Yorgun:* **knackered / beat** (günlük) vs **tired** (standart) vs **exhausted / fatigued** (resmi).
  - Soru formatı: *"Bir iş mülakatındasın, bu durumu hangi cümleyle ifade edersin?"*
* **Uygulama Yeri:** `Pratik` ➔ Kelimeler veya Oyunlar altında mini test.

---

### 🧱 12. Paragraf İskeleti ve Bağlaç Mantığı (*Discourse Flow & Cohesion*)
* **Pedagojik Gerekçe:** B1 öğrencisi tekil cümleler kurar; B2/C1 öğrencisi ise cümleleri mantıksal olarak birbirine bağlar (*zıtlık, neden, imtiyaz, sonuç*).
* **Nasıl Çalışır?**
  - 3-4 cümlelik kısa bir paragraf verilir. Ancak cümlenin yönünü değiştiren kilit bağlaçlar boştur:
    - Fransızca: *néanmoins, toutefois, en revanche, d'autant plus que, pourvu que*.
    - İspanyolca: *sin embargo, no obstante, por ende, a pesar de que, de ahí que*.
    - İngilizce: *furthermore, nevertheless, whereas, in light of, consequently*.
  - Kullanıcı düşüncenin akış yönüne göre doğru bağlacı yerleştirir. Doğrudan akademik makale ve iş e-postası akıcılığı kazandırır.
* **Uygulama Yeri:** `Pratik` ➔ "Metin Akışı & Bağlaçlar" kartı.

---

### 🩺 13. Kişisel Kör Nokta Röntgeni (*Weakness X-Ray & Targeted Surgery*)
* **Pedagojik Gerekçe:** Genel tekrar yapmak yerine öğrenicinin gizli kalmış zaaflarına cerrahi müdahale yapmak zaman kazandırır.
* **Nasıl Çalışır?**
  - İlerleme ekranında mevcut verilerden (`LabData`, `earMisses`, `pronScores`) türetilen net bir teşhis kartı:
    - *"Fransızcada dişil kelimelerde %91 başarıdasın, ancak *-eur* ve *-ence* ile biten soyut isimlerde hata oranın %48."*
    - *"İspanyolcada tekil şahıs çekimlerin kusursuz, ancak 'Vosotros / Ustedes' çoğul dönüşlü fiillerde duraksıyorsun."*
  - Kartın altında tek bir aksiyon butonu: **"Kör Noktayı Onar (8 Soru)"**.
* **Uygulama Yeri:** `İlerleme` (Progress) ekranı üst analiz kartı.

---

### 📈 14. Fonetik Dalga Formu Takibi (*Prosody & Pitch Curve Shadowing*)
* **Pedagojik Gerekçe:** Kelimeleri doğru sesletmek yetmez; dilin ezgisini, yükselen ve alçalan tonlama gruplarını (intonation) yakalamak gerekir.
* **Nasıl Çalışır?**
  - Gölgeleme (Shadowing) sırasında orijinal sesin ton çizgisi (Pitch contour) görsel bir dalga olarak akar.
  - Kullanıcı mikrofona konuştuğunda kendi sesinin ton çizgisi orijinal çizginin üzerine biner.
  - Kullanıcı nerede tonlamayı yükseltip nerede düşürmesi gerektiğini gözüyle görür.
* **Uygulama Yeri:** Okuma ➔ "Gölgele" panelinin gelişmiş modu.

---

## 4. Karşılaştırma ve Önceliklendirme Matrisi (14 Fikir)

| No | Fikir | Geliştirdiği Beceri | Hedef Seviye | Geliştirme Yükü | Pedagojik Etki |
|:---:|:---|:---:|:---:|:---:|:---:|
| **1** | **Hata Avcısı (Spot the Error)** | Gramer & Odaklanma | B2 – C1 | Orta (Mevcut soru motoru) | ⭐️⭐️⭐️⭐️⭐️ |
| **2** | **Cümle Dönüşümü (Rewrite)** | Aktif Üretim & Sözdizimi | B2 – C1 | Orta | ⭐️⭐️⭐️⭐️⭐️ |
| **3** | **Minimum Çiftler (Ses Ayırt Etme)** | Fonetik & Kulak Eğitimi | A2 – B2 | Düşük (Mikro oyun) | ⭐️⭐️⭐️⭐️ |
| **4** | **Eşdizimlilik (Collocations)** | Doğallık & Akıcılık | B1 – B2 | Düşük / Orta | ⭐️⭐️⭐️⭐️⭐️ |
| **5** | **Tuzak Kelimeler (Faux Amis)** | Anlam Koruması | A2 – B2 | Çok Düşük (Rozet + Liste) | ⭐️⭐️⭐️⭐️ |
| **6** | **Günün Mikro Haberi (RFI / VOA)** | Canlı Dil & Güncellik | B1 – C1 | Düşük (Mevcut RSS) | ⭐️⭐️⭐️⭐️⭐️ |
| **7** | **Çift Yönlü Çeviri Döngüsü 2.0** | Ana Dil Engeli Aşma | B1 – C1 | Düşük (Geri çeviri eklentisi) | ⭐️⭐️⭐️⭐️⭐️ |
| **8** | **Bağlamdan Anlam Çıkarımı** | Bağımsız Okuma | B1 – B2 | Düşük (Okuma sansür modu) | ⭐️⭐️⭐️⭐️ |
| **9** | **3 Saniye Kuralı (Refleks)** | Konuşma Hızı & Otomatizm | A2 – B2 | Düşük (Hızlı geri çağırma) | ⭐️⭐️⭐️⭐️⭐️ |
| **10** | **İç Monolog Koçu** | Zihinsel Yaşantı | A2 – C1 | Çok Düşük (Günlük prompt) | ⭐️⭐️⭐️⭐️⭐️ |
| **11** | **Sosyal Dil Uyumu (Register)** | Sosyal Dil Zekâsı | B2 – C1 | Düşük (Seçenekli kart) | ⭐️⭐️⭐️⭐️ |
| **12** | **Paragraf İskeleti & Bağlaçlar** | Söylem Akışı & Bütünlük | B2 – C1 | Orta (Cloze paragraf) | ⭐️⭐️⭐️⭐️⭐️ |
| **13** | **Kişisel Kör Nokta Röntgeni** | Cerrahi İyileştirme | Tüm Seviyeler | Düşük (Mevcut log analitiği) | ⭐️⭐️⭐️⭐️⭐️ |
| **14** | **Fonetik Dalga Formu Takibi** | Vurgu, Tonlama & Ezgi | B1 – C1 | Orta / Yüksek (Web Audio API) | ⭐️⭐️⭐️⭐️ |

---

## 5. Claude Code İçin Tavsiye Edilen Aşama Sıralaması

Geliştirici ekibin iş yükünü dengelemek adına önerilen 3 aşamalı uygulama planı:

1. **Aşama 1 — Hızlı Kazanımlar (Hafif Kod, Yüksek Etki):**
   - **Tuzak Kelimeler (Faux Amis):** ~50 kelimelik liste ile sözlükte rozet ve filtre.
   - **İç Monolog Koçu:** Bugün ekranında her gün 1 adet zihinsel konuşma daveti.
   - **Minimum Çiftler:** 2 kartlı 10 saniyelik fonetik mikro oyun.
   - **3 Saniye Kuralı:** Pratik sekmesinde hayati kalıpların refleks testi.
2. **Aşama 2 — Ciddi Pedagojik Derinlik (B2/C1 Sıçraması):**
   - **Çift Yönlü Çeviri Döngüsü 2.0:** Geri çeviride ertesi gün yazarın orijinal cümlesiyle diff karşılaştırması.
   - **Hata Avcısı & Cümle Dönüşümü:** [`docs/kaynaklar/gramer-alistirmalari.md`](kaynaklar/gramer-alistirmalari.md) OER verileriyle beslenen soru kartları.
   - **Kişisel Kör Nokta Röntgeni:** İlerleme ekranında cerrahi zaaf analizi ve 8 soruluk onarım seansı.
3. **Aşama 3 — Güncel Medya ve İleri Ses Deneyimi:**
   - **Günün Mikro Haberi:** RFI ve VOA bültenlerinin Okuma kütüphanesine otomatik vitrin olması.
   - **Paragraf İskeleti & Fonetik Dalga Formu Takibi:** İleri düzey okuma ve gölgeleme modülleri.

---

*Bu belge, gelecekteki turların planlanması ve mimari kararlar için canlı bir referans kılavuz olarak saklanmaktadır.*
