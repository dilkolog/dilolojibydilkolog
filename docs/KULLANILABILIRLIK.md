# Kelime Koçu — Kullanılabilirlik ve Arayüz Denetimi Raporu

**Tarih:** 2026-10-09  
**Kapsam:** Arayüz bileşenleri (`src/ui/`), kullanıcı akışları, mobil/masaüstü gezinme ergonomisi, bilişsel yük ve erişilebilirlik  
**Referans Belgeler:** [`DESIGN.md`](../DESIGN.md), [`METIN-DENETIMI.md`](METIN-DENETIMI.md), [`ANIMASYON-DENETIMI.md`](ANIMASYON-DENETIMI.md)

---

## 1. Giriş ve Amaç

Kelime Koçu, aralıklı tekrar (FSRS) algoritmasıyla yabancı dil kelime ve dil bilgisi edinimini destekleyen, mobil öncelikli bir PWA (Progressive Web App) uygulamasıdır. 

`DESIGN.md` rehberinde ortaya konan temel felsefe:
> **Kuzey Yıldızı:** *"Cesaret veren koç, büyüyen bahçe."*  
> **Karakter:** Sakin, dokunsal, dikkat dağıtmayan, yargılamayan, öğrenilen dilin rengiyle yaşayan bir arayüz.

Bu denetimin amacı; uygulamadaki temel akışları (günlük çalışma, kelime arama/ekleme, metin okuma, fiil çekimi alıştırmaları ve ilerleme takibi) kullanılabilirlik ilkeleri, bilişsel ergonomi, başparmak erişim bölgeleri (thumb zone) ve Nielsen Norman Group (NN/g) sezgisel değerlendirme (heuristic evaluation) kriterleri çerçevesinde incelemek, sürtünme noktalarını ve iyileştirme fırsatlarını belgelemektir.

---

## 2. Metodoloji ve Kriterler

Denetim sırasında aşağıdaki standartlar ve çerçeveler esas alınmıştır:

1. **Jakob Nielsen'in 10 Kullanılabilirlik İlkesi:**
   - Sistem durumunun görünürlüğü
   - Sistem ile gerçek dünya arasındaki uyum
   - Kullanıcı denetimi ve özgürlüğü (geri alma, çıkış)
   - Tutarlılık ve standartlar
   - Hataları önleme
   - Hatırlama yerine tanıma
   - Kullanım esnekliği ve verimliliği (kısayollar, ⌘K)
   - Estetik ve minimalist tasarım
   - Hataları teşhis etme ve kurtulma desteği
   - Yardım ve belgeleme
2. **Fitts Kanunu & Mobil Dokunma Ergonomisi:**
   - Asgari dokunma hedefi boyutu (en az 44×44 px / WCAG 2.2 AA Target Size).
   - Tek elle kullanımda başparmak erişim bölgesi (Thumb zone) uygunluğu.
3. **Bilişsel Yük ve Karar Sürtünmesi (Hick-Hyman Kanunu):**
   - Ekranda aynı anda sunulan seçenek sayısı ve birincil eylemin belirginliği ("Bir Birincil Kuralı").
4. **WCAG 2.2 Erişilebilirlik Kriterleri:**
   - Kontrast oranları, odak halkaları (`:focus-visible`), klavye gezintisi ve ekran okuyucu uyumu.

---

## 3. Bilgi Mimarisi ve Gezinme Ergonomisi

Uygulamanın ana bilgi mimarisi 5 birincil bölgeye ve bunların altındaki ikincil merkezlere ("hub") ayrılmıştır:

```
[Alt Çubuk / Kenar Çubuğu]
├── Bugün (Today) ───────────────> Günlük seans başlatma, FSRS özeti, seri ve odak
├── Kelimeler (Words Hub)
│   ├── Kelimeler ──────────────> Kelime listesi, filtreler, arama, kelime detay
│   ├── Hatalar ────────────────> Hata türleri, zor kelimeler, odaklı pratik
│   └── Çeviri ─────────────────> Hızlı çeviri (DeepL), çeviri belleği, kelimeye ekleme
├── Okuma (Reading Hub)
│   ├── Metinler ───────────────> Kütüphane, seviyeli metinler, içe aktarma, podcast/dikte
│   └── Hikaye ─────────────────> Kolay resimli hikâyeler (Global Storybooks)
├── Pratik (Practice Hub)
│   ├── Oyunlar ────────────────> Zamana karşı, eşleştirme, geri çeviri, kaçırdıkların
│   ├── Fiiller ────────────────> Fiil laboratuvarı (Öğren, Çalış, Ustalık)
│   └── Yaz & konuş ────────────> Serbest günlük, sesli gölgeleme, LanguageTool denetimi
└── İlerleme (Progress) ─────────> Bahçe görünümü, CEFR kapsamı, haftalık çalışma, rozetler
[Üst Çubuk / Profil]
├── Profil ─────────────────────> Seviye, unvan, afiş/çerçeve, rozet vitrini
└── Ayarlar ────────────────────> Günlük süre/kelime, tema, yedekleme/eşitleme, AI anahtarı
```

### 3.1. Güçlü Yönler
- **Doğrudan Akış:** Uygulama açıldığında ilk durak `Bugün` ekranıdır; kullanıcının ne yapması gerektiği konusunda hiçbir belirsizlik yaratmaz.
- **Tek Vurgu Rengi:** Öğrenilen dilin rengi (EN mavi, FR pembe, ES kehribar) tüm arayüzü tutarlı bir şekilde boyar; kullanıcı nerede olursa olsun hangi dilde çalıştığını hisseder.
- **Hızlı Arama ve Komut Paleti (`⌘K`):** Klavye kullanıcıları için kelimelere, fiillere ve ekranlara saniyeler içinde zıplama imkânı sunar (`CommandPalette.tsx`).

### 3.2. Gezinme Sürtünmeleri
1. **İkincil Sekmelerin (Hub Tabs) Keşfedilebilirliği:**
   - Telefonda `Kelimeler`, `Okuma` ve `Pratik` ekranları üstte yatay kaydırılabilir `.hub-tab` şeridi kullanır. 
   - Örneğin `Pratik` sekmesine tıklandığında varsayılan olarak `Oyunlar` açılır. Bir kullanıcının `Fiil Laboratuvarı`na veya `Yaz & konuş` alanına geçebilmek için üstteki sekmeyi fark etmesi gerekir. Küçük ekranlarda bu sekmeler sayfa başlığının altında bazen içerik gibi algılanabilmektedir.
2. **Üst Çubuk ve Alt Çubuk Arasında Kalan Alan:**
   - Telefonda yapışık üst çubuk (`--topbar-h`) ve alt gezinti çubuğu dikey ekran alanının yaklaşık 110-120 px'ini kaplar. Klavye açıldığında (özellikle dikte veya günlük yazarken) görünür alan oldukça daralmaktadır.

---

## 4. Ekran Ekran Kullanılabilirlik İncelemesi

### 4.1. Bugün (TodayScreen)
- **Rol:** Günün başlangıç noktası, yönlendirici ana kontrol paneli.
- **İnceleme:**
  - Günün tekrarı varsa tek bir büyük `Başla` butonu bulunur; tekrarlar bittiğinde durum kartı "Bugünlük tamam" mesajına ve serbest seçeneklere evrilir (#116 ve #124 ile sadeleşti).
  - Kullanıcının önünde karmaşık göstergeler yerine bitki/tohum metaforu ve net bir sayaç (`X kelime tekrarı`) yer alır.
- **Kullanılabilirlik Fırsatı:** Uzun süre girilmediğinde biriken tekrarlar (ör. 80+ kelime) kullanıcıda psikolojik yorgunluk ("backlog effect") yaratabilir. Mevcut sistemdeki *"uzun günde 8 kelimeye indir"* önerisi oldukça başarılıdır; ancak bu önerinin daha görünür bir mikro-aksiyon olarak tek tıkla uygulanabilmesi sürtünmeyi daha da azaltacaktır.

### 4.2. Oturum ve Çalışma Akışı (Session)
- **Rol:** Kelime öğrenme ve FSRS aralıklı tekrar döngüsü.
- **İnceleme:**
  - Kartlar dokunsaldır; hedef kelime büyük serif (`Literata`) fontla merkezde sunulur.
  - Cevap girdikten sonra alt kenardan açılan geri bildirim sayfası (`.sheet-in`), doğru/yanlış ayrımını hem renk hem ses hem de dokunsal ikonla net bir şekilde verir.
  - Klavyede `1`, `2`, `3`, `4` veya `Boşluk` / `Enter` tuşlarıyla hızlıca ilerlenebilir.
- **Kullanılabilirlik Fırsatı:**
  - Yanlış cevap verildiğinde doğru cevap gösterilir; ancak kullanıcının hatasını analiz etmesi için gereken süre bazen bir sonraki soruya hızla geçme isteğiyle kaybolabilir. Hatalı kelimelerde "Neden yanlış?" (ör. harf hatası, cinsiyet hatası, anlam karışması) teşhisi `formDiagnosis` motoruyla üretilmektedir; bu bilginin geri bildirim kartında daha belirgin özetlenmesi öğrenme kalitesini artıracaktır.

### 4.3. Kelimeler, Hatalar ve Çeviri (Words Hub)
- **Kelimeler:**
  - Arama çubuğu anında filtreleme yapar.
  - Kelime detayına dokunulduğunda modal yerine akıcı kart genişlemesi sağlanır.
  - CEFR seviye etiketleri (`A1`, `B2`) kullanıcının seviyesini anlamasını kolaylaştırır (#129).
- **Hatalar:**
  - Hata türlerine göre kümeleme (yazım, cinsiyet, zaman) kullanıcının zayıf yönünü fark etmesini sağlar.
- **Çeviri:**
  - DeepL ile anlık çeviri, çevrilen her cümlenin çeviri belleğine eklenmesi ve tek tıkla "Kelimelerime ekle" butonu sayesinde pratik bir veri toplama aracı haline gelmiştir (#111, #120).
- **Kullanılabilirlik Fırsatı:**
  - Sözlük kartında bir kelimeye kendi Türkçe anlamını yazma (düzeltme notu ekleme) özelliği mevcuttur; ancak bu alan varsayılan olarak katlı/gizli durduğu için yeni kullanıcılar tarafından keşfedilmesi zordur.

### 4.4. Okuma ve Hikaye (Reading Hub)
- **Metinler & Podcastler:**
  - Cümle cümle dinleme ve takip özelliği (`listenFollow.ts`) harika bir dinleme-okuma senkronizasyonu sunar.
  - Cümleye dokunulduğunda "Cümlenin Türkçesi", "Bu cümleden dinle", "Dikte et", "Gölgele" gibi araç satırı çıkar.
- **Kolay Resimli Hikâyeler:**
  - Global Storybooks entegrasyonu (#133) başlangıç seviyesindeki (A1-A2) kullanıcılar için görsel destekli zengin bir deneyim sunmaktadır. Sayfa sayfa çeviri ve tam ses entegrasyonu kusursuzdur.
- **Kullanılabilirlik Fırsatı:**
  - Okuma ekranında bir kelimeye dokunulduğunda çıkan popover menü dar ekranlarda bazen metnin üzerini kapatabilmektedir. Popover yerine ekranın altından hafifçe yükselen bir mikro-çekmece (bottom sheet) mobil okuma akışını daha kesintisiz kılabilir.

### 4.5. Pratik: Fiil Laboratuvarı ve Oyunlar
- **Fiil Laboratuvarı:**
  - Geçmişte çok karmaşık olan yapı #90, #93, #97 ve #99 ile 3 sekmeli (Öğren, Çalış, Ustalık) ve 4 modlu sade bir yapıya kavuşturulmuştur.
  - Çekim tablosunda zayıf kişilerin turuncu alt çizgiyle (`.weak-cell`) gösterilmesi doğrudan hedefe yönelik çalışmayı teşvik eder.
- **Oyunlar:**
  - "Geri çeviri" (#122) ve "Kaçırdıkların" (#125) doğrudan kullanıcının kendi çalışma verisini oyuna dönüştürdüğü için ezber yerine aktif üretim sağlar.
  - "Zamana karşı" oyununda yazma modu (#85) klavye kullanımını pekiştirir.
- **Kullanılabilirlik Fırsatı:**
  - Fiil laboratuvarında 6 çekimli tabloda mobilde yatay kaydırma gerekebilmektedir; tablonun kompakt modunda kişi zamirleri (`je/tu/il`) ile fiil gövdesinin hizalanması dar ekranlarda dikkatle korunmalıdır.

### 4.6. İlerleme ve Bahçe (Progress)
- **Bahçe Metaforu:** Kelimelerin tohum -> filiz -> yaprak -> çiçek aşamaları öğrenene yargılayıcı bir puan tablosu yerine organik bir büyüme hissi verir.
- **Grafikler:** Haftalık çalışma ve saat dağılımı (`BestHours.tsx`) sade çubuklarla sunulur; karmaşık finansal gösterge paneli havasından uzaktır.
- **Kullanılabilirlik Fırsatı:**
  - İlerleme ekranı oldukça uzundur. Mobilde kullanıcı tüm kartları (Bahçe, Kapsam, Haftalık Ritim, En İyi Saatler) görmek için çok fazla kaydırma yapmak zorundadır. Üst kısımdaki hızlı atlama düğmeleri (`JumpNav`) faydalıdır ancak daha belirginleştirilebilir.

### 4.7. Profil ve Oyunlaştırma (Profile)
- **Rozetler:** Rozetlerin kademeli oluşu ve ne zaman kazanıldığını gösteren zaman tüneli (#103, #112) motivasyonu destekler.
- **Unvanlar ve Özelleştirme:** Avatar emojisi, çerçeve ve afiş seçimi kullanıcıya kişisel alan hissi verir.
- **Kullanılabilirlik Fırsatı:**
  - Rozetlerin kazanılma kriterleri bazı rozetlerde çok genel kalmaktadır; kullanıcının bir sonraki adıma ne kadar kaldığını gösteren ilerleme çubuğu mevcuttur ancak detay diyaloğunda daha vurgulu sunulabilir.

### 4.8. Ayarlar ve Veri Güvenliği (Settings)
- **Şeffaflık:** Vercel Blob senkronizasyonu şifrelidir; AI anahtarı cihazda saklanır ve yedek dosyasına dahil edilmez (`#139`, `GUVENLIK.md`).
- **Veri Sahipliği:** Yedeği tek tıkla indirme ve geri yükleme imkânı kullanıcının verisini sahiplenmesini sağlar.

---

## 5. Tespit Edilen Kullanılabilirlik Sürtünmeleri

| No | Alan / Bileşen | Sürtünme Noktası | Heuristic / İlke | Şiddet |
|:---|:---|:---|:---|:---:|
| **1** | **Mobil Gezinme** (`.hub-tab`) | Üst sekmelerin (Kelimeler/Hatalar/Çeviri veya Oyunlar/Fiiller) ekran başlığının altında içerik gibi algılanıp gözden kaçabilmesi | Görünürlük & Keşfedilebilirlik | Orta |
| **2** | **Okuma Sözlük İpucu** (`Reading.tsx`) | Metin içinde kelimeye tıklandığında açılan Popover'ın parmağın altında kalabilmesi veya metin satırını örtmesi | Ergonomi & Fitts Kanunu | Düşük |
| **3** | **Uzun İlerleme Sayfası** (`Progress.tsx`) | 8 farklı istatistik kartının tek sütunda ardışık dizilmesiyle oluşan dikey kaydırma yorgunluğu | Bilişsel Yük & Minimalizm | Orta |
| **4** | **Çevrimdışı Durum Geri Bildirimi** | İnternet kesildiğinde DeepL çevirisi ve LanguageTool denetiminin hata vermesi veya sessiz kalması | Sistem Durumu Görünürlüğü | Düşük |
| **5** | **Sözlük Anlam Düzenleme** (`Dictionary.tsx`) | Kullanıcının kelimeye kendi çevirisini ekleme özelliğinin keşfedilmesinin zorluğu | Hatırlama yerine Tanıma | Düşük |
| **6** | **Geri Alma (Undo) Süresi** (`Session.tsx`) | Kart cevabında yanlışlıkla basılan butonun geri alınması için sunulan sürenin kısalığı | Kullanıcı Denetimi & Özgürlüğü | Orta |
| **7** | **Klavyeli Kullanımda Odak Kaybı** | Diyalog veya alt sayfa açılıp kapandığında odak noktasının tetikleyici butona her zaman dönememesi | Erişilebilirlik (WCAG 2.4.3) | Düşük |
| **8** | **Çoklu Seviye Seçimi** (`Words.tsx`) | Kelime listelerinde birden fazla CEFR seviyesini aynı anda filtreleme esnekliğinin olmaması | Kullanım Esnekliği & Verimliliği | Düşük |

---

## 6. Erişilebilirlik (A11y) ve Kapsayıcılık Değerlendirmesi

1. **Kontrast Oranları:**
   - Slate zemin üzerinde `--lang-text` değerleri en az 6:1 oranında tutulmuştur.
   - Kehribar dilinde (`es`) beyaz metin yerine koyu kahverengi metin (`--on-lang: #451a03`) kullanılması WCAG AAA seviyesinde okunabilirlik sağlar (`DESIGN.md`).
2. **Klavye Erişilebilirliği:**
   - Oturum ekranında tuşlar (`1-4`, `Boşluk`, `Enter`), diyaloglarda `Escape` tuşu ve `⌘K` paleti kusursuz çalışmaktadır.
   - Sütun grafiklerinde ok tuşlarıyla günlerin seslendirilmesi ve okunması (`a11y.e2e.ts`) örnek bir erişilebilirlik desenidir.
3. **Ekran Okuyucu Desteği:**
   - İkon düğmelerinin çoğunda `aria-label` veya gizli `.sr-only` metinler mevcuttur.
   - İkincil sekmelerde ve filtrelerde `aria-pressed` / `aria-selected` öznitelikleri doğru işletilmektedir.

---

## 7. Önceliklendirilmiş İyileştirme Önerileri (Yol Haritası)

### 🟢 Öncelik 1: Düşük Efor / Yüksek Etki (Hızlı Kazanımlar)
1. **İkincil Sekmelerde (Hub Tabs) Vurgu:**  
   `src/index.css` içindeki `.hub-tab` elemanlarının seçili durumuna hafif bir alt çizgi göstergesi (`useTabIndicator` deseni) veya daha belirgin bir arka plan kontrastı eklenerek hangi alt bölümde olunduğu netleştirilmeli.
2. **Çevrimdışı Durum Göstergesi:**  
   Tarayıcı çevrimdışı olduğunda (`navigator.onLine === false`), Çeviri ve LanguageTool düğmelerinde küçük bir "Çevrimdışı" rozeti gösterilerek gereksiz tıklama ve hata hissi önlenmeli.
3. **Geri Bildirim Süresi İpucu:**  
   Çalışma oturumunda cevaptan vazgeçme / geri alma (`revertReview`) butonunun görünürlük süresi ve dokunma alanı belirginleştirilmeli.

### 🟡 Öncelik 2: Orta Vadeli Tasarım Rafinasyonları
4. **Okuma Kelime Seçiminde Bottom-Sheet:** ✅ Yapıldı (2026-10-09): dar ekranda kelime kartı alttan yükselen çekmece (`word-pop`, `useSheetSwipe`).  
   Mobilde okunan metinde kelimeye dokunulduğunda, kelimenin üstünü kapatan popover yerine ekranın altından yükselen kompakt bir anlam/telaffuz kartı kullanılmalı.
5. **İlerleme Ekranında Katlanabilir Kartlar:**  
   `Progress.tsx` ekranındaki ikincil analizler (ör. "En İyi Saatler", "Hata Geçmişi") varsayılan olarak katlı veya segmentli bir yapıya kavuşturularak sayfa boyu kısaltılmalı.
6. **Birikmiş Tekrar Kolaylaştırıcı:** ✅ Yapıldı (2026-10-09): 50+ tekrar birikince Bugün'de "Kısa tur (15 soru)" (`shortRound`, `BACKLOG_AT`).  
   50'den fazla tekrar biriktiğinde Bugün ekranında çıkan *"Yeni kelimeleri duraklat / tekrarı böl"* uyarısı doğrudan tek tıkla oturum boyutunu 15'e bölen bir hızlı filtre sunmalı.

### 🔵 Öncelik 3: Deneyim Zenginleştirme
7. **Çoklu CEFR Filtreleme:**  
   Kelime listesinde aynı anda `A1` ve `A2` seviyelerini seçebilme imkânı (`chip` çoklu seçim modu).
8. **Sözlük Düzeltme Notunun Keşfedilebilirliği:**  
   Kelime detayında "Kendi anlamını ekle" alanı için küçük bir kalem ikonuyla doğrudan düzenleme hissi verilmesi.

---

## 8. Sonuç

Kelime Koçu; temiz tipografisi (Lexend + Literata uyumu), tek dil vurgusu prensibi, dokunsal düğme basma hissi ve yargılamayan bahçe metaforuyla piyasadaki aşırı oyunlaştırılmış (gamified) ve dikkat dağıtıcı dil uygulamalarına kıyasla son derece dingin, ergonomik ve amaca odaklı bir kullanıcı deneyimi sunmaktadır.

Yukarıda sıralanan küçük sürtünme noktalarının (özellikle mobil ikincil sekme netliği, okuma popover yerleşimi ve biriken tekrar yumuşatmaları) giderilmesiyle, uygulamanın kullanılabilirlik standardı en üst seviyeye taşınacaktır.
