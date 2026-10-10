# Kelime Koçu — Kullanılabilirlik ve Arayüz Denetimi Raporu

**Tarih:** 2026-10-10  
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
│   ├── Kelimeler ──────────────> Kelime listesi, filtreler, arama, kelime detay (Bana özel cümleler)
│   ├── Hatalar ────────────────> Hata türleri, zor kelimeler, odaklı pratik
│   └── Çeviri ─────────────────> Hızlı çeviri (DeepL), çeviri belleği, kelimeye ekleme
├── Okuma (Reading Hub)
│   ├── Metinler ───────────────> Kütüphane, seviyeli metinler, içe aktarma, podcast/dikte
│   ├── Sesli kitaplar ─────────> B1+ LibriVox & Gutenberg bölümlü sesli kitaplar
│   └── Hikaye ─────────────────> Kolay resimli hikâyeler (Global Storybooks)
├── Pratik (Practice Hub)
│   ├── Oyunlar ────────────────> Zamana karşı, eşleştirme, geri çeviri, kaçırdıkların, telaffuz, dilbilgisi, refleks, tuzak kelimeler, ses ayırt etme
│   ├── Fiiller ────────────────> Fiil laboratuvarı (Öğren, Çalış, Ustalık)
│   └── Yaz & konuş ────────────> Serbest günlük, sesli gölgeleme, LanguageTool denetimi
└── İlerleme (Progress) ─────────> Bahçe görünümü, CEFR kapsamı, haftalık çalışma, kör noktalar kartı, rozetler
[Üst Çubuk / Profil]
├── Profil ─────────────────────> Seviye, unvan, afiş/çerçeve, rozet vitrini
└── Ayarlar ────────────────────> Günlük süre/kelime, tema, yedekleme/eşitleme (hesap onayı/kota/güvenlik), AI anahtarı
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
- **Hesap Durumu ve Onay:** Onaysız ve onaylı hesap ayrımı şeffaf bir rozet ve durum metniyle gösterilir (#210); sunucu limitleri ve eşitleme durumu kullanıcıya açıkça iletilir.

### 4.9. İleri Seviye Pratik & Bilişsel İçgörü Kartları (9. Tur)
- **Dilbilgisi Soruları (`GrammarPractice.tsx`):**
  - B1–C1 seviyelerinde cloze, choice ve error soru modelleri. Kural açıklamaları (`explanation`) hatanın nedenini anında Türkçe açıklar; öğrenciyi kuramsal netliğe kavuşturur.
- **Tuzak Kelimeler / Faux Amis (`TrapRound.tsx`):**
  - Sözlükte ve kelime kartında belirgin bir "Tuzak kelime" çipi yer alır. Pratik turunda ise hedef dildeki anlam ile yanıltıcı benzer dil anlamı karşılaştırmalı sorulur.
- **Refleks Turu (`ReflexRound.tsx`):**
  - 3 saniyelik mikro geri sayımla günlük konuşma kalıplarını hatırlatma; öğrencinin zihinsel çeviri bariyerini aşmasını ve konuşma refleksini hızlandırmasını hedefler.
- **Zihin Tohumu (`MindSeed.tsx`):**
  - Bugün ekranında ekran başında kalmayı değil, ekranı kapatıp gün içinde hedef dilde düşünmeyi teşvik eden mikro-eylem önerisi.
- **Kör Nokta Röntgeni (`BlindSpots.tsx`):**
  - İlerleme ekranında öğrencinin en çok hata yaptığı dilbilgisi konularını, fiil çekimlerini ve tuzak kelimeleri tek bakışta analiz eder; tek tıkla doğrudan ilgili tamir turunu başlatır.

---

## 5. Tespit Edilen Kullanılabilirlik Sürtünmeleri

| No | Alan / Bileşen | Sürtünme Noktası | Heuristic / İlke | Durum |
|:---|:---|:---|:---|:---:|
| **1** | **Mobil Gezinme** (`.hub-tab`) | Üst sekmelerin (Kelimeler/Hatalar/Çeviri veya Oyunlar/Fiiller) ekran başlığının altında içerik gibi algılanıp gözden kaçabilmesi | Görünürlük & Keşfedilebilirlik | ✅ Çözüldü (#155) |
| **2** | **Okuma Sözlük İpucu** (`Reading.tsx`) | Metin içinde kelimeye tıklandığında açılan Popover'ın parmağın altında kalabilmesi veya metin satırını örtmesi | Ergonomi & Fitts Kanunu | ✅ Çözüldü (#125) |
| **3** | **Uzun İlerleme Sayfası** (`Progress.tsx`) | 8 farklı istatistik kartının tek sütunda ardışık dizilmesiyle oluşan dikey kaydırma yorgunluğu | Bilişsel Yük & Minimalizm | ✅ Çözüldü (#158) |
| **4** | **Çevrimdışı Durum Geri Bildirimi** | İnternet kesildiğinde DeepL çevirisi ve LanguageTool denetiminin hata vermesi veya sessiz kalması | Sistem Durumu Görünürlüğü | ✅ Çözüldü (#153) |
| **5** | **Sözlük Anlam Düzenleme** (`Dictionary.tsx`) | Kullanıcının kelimeye kendi çevirisini ekleme özelliğinin keşfedilmesinin zorluğu | Hatırlama yerine Tanıma | ✅ Çözüldü (#159) |
| **6** | **Geri Alma ve Hatırlayamama** (`Session.tsx`) | Kart cevabında emin olunmadığında veya hatırlanmadığında bekleme; yanlışlıkla basılan butonun geri alınması | Kullanıcı Denetimi & Özgürlüğü | ✅ Çözüldü (#188) |
| **7** | **Klavyeli Kullanımda Odak Kaybı** | Diyalog veya alt sayfa açılıp kapandığında odak noktasının tetikleyici butona her zaman dönememesi | Erişilebilirlik (WCAG 2.4.3) | ✅ Çözüldü (`ConfirmDialog`) |
| **8** | **Çoklu Seviye Seçimi** (`Words.tsx`) | Kelime listelerinde birden fazla CEFR seviyesini aynı anda filtreleme esnekliğinin olmaması | Kullanım Esnekliği & Verimliliği | ✅ Çözüldü (#159) |
| **9** | **Sesli Kitap Keşfi** (`AudiobooksPicker.tsx`) | Kütüphanede B1+ sesli kitapların bölümlü ve süre/seviye etiketleriyle seçilebilmesi | Hatırlama yerine Tanıma | ✅ Çözüldü (#200) |
| **10** | **Zayıf Telaffuz Pratiği** (`PronPractice.tsx`) | Azure ile puanlanan kelimelerden zayıf olanların (<75) ayrı bir alıştırma listesinde pratik edilememesi | Hataları Teşhis & Telafi | ✅ Çözüldü (#204) |
| **11** | **Kişiselleştirilmiş Cümleler** (`PersonalSentences.tsx`) | Standart sözlük örnekleri yerine ilgi alanlarına ve hedeflere özel cümle ihtiyacı | Öz-referans Etkisi | ✅ Çözüldü (#204) |
| **12** | **İçe Aktarma Hedef Belirsizliği** (`ImportPlacement.tsx`) | Toplu ekleme ve Kindle içe aktarmalarında hedef liste ve seviyenin baştan seçilememesi | Kullanıcı Denetimi & Özgürlüğü | ✅ Çözüldü (#204) |
| **13** | **Eşitleme Şeffaflığı ve Güvenliği** (`SyncSettings.tsx`, `DataSettings.tsx`) | Medya boyutu/kota durumu belirsizliği ve geri yükleme öncesi olası veri kaybı endişesi | Hataları Önleme & Görünürlük | ✅ Çözüldü (#197, #200) |
| **14** | **B1+ Dilbilgisi Tıkanması** (`GrammarPractice.tsx`) | Kelime bilinse dahi karmaşık yapıların (subjonctif, inversion) bağlam içinde pekiştirilememesi | Bilişsel Yük & Derin Öğrenme | ✅ Çözüldü (#211, #221) |
| **15** | **Yalancı Eşdeğer Yanılgıları** (`TrapRound.tsx`) | Benzer yazılan sözcüklerin hedef dildeki anlamının yanlış öğrenilmesi ve fark edilmemesi | Hataları Önleme | ✅ Çözüldü (#218) |
| **16** | **Konuşma Hızı ve Çeviri Refleksi** (`ReflexRound.tsx`) | Günlük kalıpların kafada önce Türkçeden çevrilmesi nedeniyle oluşan gecikme ve tutukluk | Hatırlama yerine Tanıma & Akıcılık | ✅ Çözüldü (#219) |
| **17** | **Zayıf Alanları Teşhis Zorluğu** (`BlindSpots.tsx`) | Hangi dilbilgisi veya fiil çekiminde sürekli hata yapıldığının dağınık kalması | Hataları Teşhis & Telafi | ✅ Çözüldü (#224) |
| **18** | **Çoklu Kullanıcı ve Hesap Ayrımı** (`useAccessStatus.ts`) | Cihazlar arası eşitlemede onaysız hesapların sunucu kaynaklarını tüketmesi ve belirsizlik | Sistem Durumu Görünürlüğü & Güvenlik | ✅ Çözüldü (#210) |

---

## 6. Erişilebilirlik (A11y) ve Kapsayıcılık Değerlendirmesi

1. **Kontrast Oranları:**
   - Slate zemin üzerinde `--lang-text` değerleri en az 6:1 oranında tutulmuştur.
   - Kehribar dilinde (`es`) beyaz metin yerine koyu kahverengi metin (`--on-lang: #451a03`) kullanılması WCAG AAA seviyesinde okunabilirlik sağlar (`DESIGN.md`).
2. **Klavye Erişilebilirliği:**
   - Oturum ekranında tuşlar (`1-4`, `Boşluk`, `Enter`, `Alt+U` Unuttum), diyaloglarda `Escape` tuşu ve `⌘K` paleti kusursuz çalışmaktadır.
   - Sütun grafiklerinde ok tuşlarıyla günlerin seslendirilmesi ve okunması (`a11y.e2e.ts`) örnek bir erişilebilirlik desenidir.
3. **Ekran Okuyucu Desteği:**
   - İkon düğmelerinin çoğunda `aria-label` veya gizli `.sr-only` metinler mevcuttur.
   - İkincil sekmelerde ve filtrelerde `aria-pressed` / `aria-selected` öznitelikleri doğru işletilmektedir.
4. **9. Tur Genişletilmiş Axe Kapsamı (#224):**
   - Yeni eklenen tüm bileşenler (`GrammarPractice`, `ReflexRound`, `TrapRound`, `PairsGame`, `MindSeed`, `BlindSpots`) açık, koyu ve sakin temaların tümünde axe-core WCAG 2.2 AA taramalarından 0 ihlalle geçirilmiştir.

---

## 7. Önceliklendirilmiş İyileştirme Önerileri (Yol Haritası)

### 🟢 Öncelik 1: Düşük Efor / Yüksek Etki (Hızlı Kazanımlar)
1. **İkincil Sekmelerde (Hub Tabs) Vurgu:** ✅ Yapıldı (#155):  
   `src/index.css` içindeki `.hub-tab` elemanlarının seçili durumuna alt çizgi göstergesi ve kaydırma ipucu eklendi.
2. **Çevrimdışı Durum Göstergesi:** ✅ Yapıldı (#153):  
   İnternet bağlantısı kesildiğinde üst çubukta sakin, sessiz bir `Çevrimdışı` rozeti (`OfflineBadge.tsx`) gösterilir; çevrimiçi olunca kaybolur.
3. **Geri Bildirim Süresi İpucu ve Hızlı Vazgeçme:** ✅ Yapıldı (#188):  
   Oturumda "Unuttum" çipi (`SessionForgot`, `Alt+U`) ile cevaba anında ulaşma ve geri alma (`revertReview`) buton görünürlüğü sağlandı.

### 🟡 Öncelik 2: Orta Vadeli Tasarım Rafinasyonları
4. **Okuma Kelime Seçiminde Bottom-Sheet:** ✅ Yapıldı (#125, 2026-10-09): dar ekranda kelime kartı alttan yükselen çekmece (`word-pop`, `useSheetSwipe`).
5. **İlerleme Ekranında Katlanabilir Kartlar:** ✅ Yapıldı (#158):  
   `Progress.tsx` ekranındaki kartlar (`GroupToggle`) ile katlanabilir hâle getirildi, açık/kapalı tercihleri yerel hafızada (`useGroups.ts`) saklanıyor.
6. **Birikmiş Tekrar Kolaylaştırıcı:** ✅ Yapıldı (2026-10-09): 50+ tekrar birikince Bugün'de "Kısa tur (15 soru)" (`shortRound`, `BACKLOG_AT`).

### 🔵 Öncelik 3: Deneyim Zenginleştirme
7. **Çoklu CEFR Filtreleme:** ✅ Yapıldı (#159):  
   Kelime listesinde aynı anda birden fazla CEFR seviyesini seçebilme imkânı (`WordsCefrFilter.tsx`, çoklu seçim chip'leri).
8. **Sözlük Düzeltme Notunun Keşfedilebilirliği:** ✅ Yapıldı (#159):  
   Sözlük detayında "Kendi anlamını ekle / düzelt" alanı için dokunsal kalem daveti ve belirginleştirilmiş buton.
9. **Sesli Kitaplar Kütüphanesi:** ✅ Yapıldı (#200):  
   Okuma ekranında LibriVox ve Gutenberg kaynaklı B1+ sesli kitapların bölüm, süre ve seviye filtreleriyle sunulması (`AudiobooksPicker.tsx`).
10. **Zayıf Telaffuz Pratiği Listesi:** ✅ Yapıldı (#204):  
    Oyunlar menüsünde ortalama puanı 75'in altındaki kelimeler için hedefe yönelik pratik kartı (`PronPractice.tsx`).
11. **Bana Özel Cümleler & AI Koç Notu:** ✅ Yapıldı (#200, #204):  
    Kullanıcının ilgi alanlarına göre tek tıkla karta eklenebilen örnek cümleler (`PersonalSentences.tsx`) ve oturum hata analizi (`SessionNote.tsx`).
12. **İçe Aktarmada Liste & Seviye Seçimi:** ✅ Yapıldı (#204):  
    Toplu ekleme, metin, Kindle ve Google Çeviri içe aktarmalarında hedef liste veya yeni liste belirleme (`ImportPlacement.tsx`).
13. **Veri Güvenliği ve Eşitleme Şeffaflığı:** ✅ Yapıldı (#197, #200, #207):  
    Geri yükleme öncesi otomatik cihaz kopyası (`safetyBackup.ts`), Ayarlar'da eşitlenen veri boyutu / kota göstergesi ve 3 MB medya koruması.

### 🟣 Öncelik 4: İleri Seviye Pedagojik Derinlik ve Akıcılık (9. Tur)
14. **Dilbilgisi Alıştırma Motoru:** ✅ Yapıldı (#211, #221):  
    B1–C1 dilbilgisi pratik motoru (`GrammarPractice.tsx`, `grammar.ts`), üç soru modeli ve 216 doğrulanmış alıştırma.
15. **Tuzak Kelimeler / Faux Amis Pratiği:** ✅ Yapıldı (#218):  
    Hedef dilde başka dille karışan sözcükler için pratik oyunu (`TrapRound.tsx`), 121 yeni kelime ve sözlükte tuzak çipi.
16. **Refleks Turu:** ✅ Yapıldı (#219):  
    3 saniye kuralıyla günlük konuşma kalıplarını hızla hatırlama oyunu (`ReflexRound.tsx`), 62 dört dilli kalıp.
17. **Ses Ayırt Etme (Minimal Çiftler):** ✅ Yapıldı (#222):  
    Wiktionary/Commons ses kayıt denetimiyle fonetik ayırt etme pratiği (`PairsGame.tsx`).
18. **Zihin Tohumu ve Kör Nokta Röntgeni:** ✅ Yapıldı (#224):  
    Bugün ekranında ekrandan bağımsız düşünme önerisi (`MindSeed.tsx`) ve İlerleme ekranında zayıf alanları tek tıkla tamir eden analiz kartı (`BlindSpots.tsx`).
19. **Hesap Onayı ve Erişim Güvenliği:** ✅ Yapıldı (#210):  
    Onaysız/onaylı hesap ayrımı, şeffaf durum bildirimi ve kota yönetimi (`api/_account.ts`, `data/access.ts`).

### 🟤 Öncelik 5: Bağlamsal Çıkarım, Canlı İçerik ve Dil Kaydı (10. Tur)
20. **Çıkarım Modu (Deduction Mode):** ✅ Yapıldı (#227, #237):  
    Okuma metinlerinde bilinmeyen kelimelerin bağlamdan tahmin edilmesi (`deduction.ts`, `maskPositions`), 10 gerçek metin üzerinde denetim ve 5 somut algoritma iyileştirmesi (`docs/veri/cikarim-modu-denetimi.md`).
21. **Günün Mikro Haberi Canlı Doğrulaması:** ✅ Yapıldı (#233):  
    RFI ve VOA bültenlerinin canlı RSS, MP3 ve transkript bağlantılarının script ile test edilmesi ve raporlanması (`docs/kaynaklar/gunun-haberi.md` Bölüm 7).
22. **Doğrulanmış İspanyolca Fonetik Kayıtları:** ✅ Yapıldı (#234):  
    İspanyolca ses ayırt etme çiftleri için Wikimedia Commons / Lingua Libre üzerinden 35 açık lisanslı ses kaydı (`docs/veri/es-ses-kayitlari.json`, `src/data/audio/es-pairs.json`).
23. **Kayıt Farkı (Register) Farkındalığı:** ✅ Yapıldı (#238):  
    Günlük / standart / resmî dil düzeyleri arasındaki farkları gösteren üçlü veri seti (`src/data/register/{fr,es,en}.json`) ve bölgesel argo / sahte dost riskleri denetim raporu (`docs/veri/kayit-farki-denetimi.md`).
24. **Eksik Doldurma ve Seviyeli Kelime Önerisi:** ✅ Yapıldı:  
    Cümle içi boşluk doldurma alıştırması (`FillMissing.tsx`) ve seviyeye uygun kelime önerme motoru (`SuggestWords.tsx`, `wordSuggest.ts`).

---

## 8. Sonuç

Kelime Koçu; temiz tipografisi (Lexend + Literata uyumu), tek dil vurgusu prensibi, dokunsal düğme basma hissi ve yargılamayan bahçe metaforuyla piyasadaki aşırı oyunlaştırılmış (gamified) ve dikkat dağıtıcı dil uygulamalarına kıyasla son derece dingin, ergonomik ve amaca odaklı bir kullanıcı deneyimi sunmaktadır.

9. ve 10. turlarla birlikte gelen ileri seviye B1–C1 dilbilgisi pratikleri, refleks kalıpları, tuzak kelime farkındalığı, çıkarım modu, canlı mikro haberler, kayıt farkı üçlüleri ve fonetik doğrulama; uygulamayı salt bir kelime ezberleme aracından çok boyutlu bir dil edinim, okuduğunu anlama ve akıcılık ekosistemine dönüştürmüştür.

