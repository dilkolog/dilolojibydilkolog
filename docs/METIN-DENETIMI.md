# Arayüz Metni Denetim Raporu

Bu belge, Diloloji (önceki adıyla Kelime Koçu) uygulamasındaki kullanıcı arayüzü (UI) metinlerinde aynı veya benzer kavramlara farklı ekranlarda verilen adları, terminolojik tutarsızlıkları ve olası karışıklık noktalarını listeler. Kod değişikliği içermez; gelecekteki arayüz sadeleştirmeleri ve dil birliği için bir durum tespiti ve referans rehberidir.

Son denetim tarihi: 2026-10-10.

---

## 1. Kelime Havuzu ve Koleksiyon ("Kelimeler / Kelimelerim / Listen")

Kullanıcının kelime deposuna ve listesine atıfta bulunurken farklı sahiplik ve adlandırma biçimleri kullanılıyor:

| Arayüz Metni | Bulunduğu Yer | Bağlam |
| :--- | :--- | :--- |
| **Kelimeler** | `src/ui/Screens.tsx` (Alt gezinti barı) | Ana sekme başlığı |
| **Kelimelerim** | `src/ui/Words.tsx:207` | Kelime listesi ekranı geri butonu / başlığı |
| **Kelime listen** | `src/ui/TextImport.tsx`, `src/ui/SettingsScreen.tsx:717` | İçe/dışa aktarma ve ayar açıklamaları |
| **Listem** / **Listende** | `src/ui/Dictionary.tsx:213` (`dict-own` etiketi) | Sözlük kartında kelimenin varlığını belirten hap |
| **Listeme ekle** | `src/ui/LookupNudge.tsx:39` | Sözlükte bakılan kelime önerisi aksiyon butonu |
| **Listeye ekle** | `src/ui/KeyWords.tsx:136` | Okumadaki anahtar kelimeleri ekleme butonu |
| **Kelimelerime ekle** | `src/ui/verbs/LearnTab.tsx:259` | Fiil laboratuvarında fiili listeye ekleme |
| **Listeler** | `src/ui/Words.tsx:287` | Kullanıcının oluşturduğu özel seviye/kategori listeleri |

> **Tespit & Öneri:**
> - Kullanıcı butonlarında birinci şahıs eki ("Kelimelerime ekle", "Listeme ekle") ile üçüncü şahıs eki ("Listeye ekle") karışıyor.
> - Buton eylemlerinde tutarlı olarak **"Listeme ekle"** veya **"Kelimelerime ekle"** benimsenmeli.
> - Uygulamanın kullanıcıya hitabında "Kelime listen" / "Listende" kullanımı korunabilir; ancak özel oluşturulan "Listeler" (WordLists) ile ana kelime havuzu ("Kelimelerim") arasındaki ayrım daha belirgin tutulmalıdır.
>
> **Uygulandı (2026-10-09):**
> - Kişinin ana kelime havuzuna ekleyen düğmeler **"Kelimelerime ekle"** olarak standartlaştırıldı (`Dictionary`, `LookupNudge`, `KeyWords`, `Reading`).
> - Kelimenin havuzda olduğunu belirten etiket ve metinler **"Kelimelerinde"** yapıldı (`Dictionary`, `Dictogloss`, `Reading`, `TextImport`, `Words`, `AccentGame`).
> - Kullanıcının özel listeleri **"Listeler"** olarak korundu.
> - Kelimeye elle konan `review` bayrağı arayüzde **"İşaretlenenler"** olarak adlandırıldı (`WordSources`, `Words`).

---

## 2. Öğrenme ve Tekrar Süreçleri ("Tekrar / Gözden Geçir / Çalış / Pratik / Alıştırma")

FSRS aralıklı tekrarı, hedeflenmiş çalışma ve serbest alıştırmalar birbirine benzer fakat algoritmik olarak farklı işlevlerdir:

| Arayüz Metni | Bulunduğu Yer | Ne Anlama Geliyor? |
| :--- | :--- | :--- |
| **Tekrar** / **Tekrarlar** | `src/ui/Screens.tsx:649` ("Karışık tekrar"), `src/ui/Games.tsx` ("Günün tekrarları"), `src/ui/verbs/ReviewTab.tsx` | Algoritmik FSRS aralıklı tekrarı |
| **Gözden geçir** | `src/ui/WordSources.tsx:16`, `src/ui/Words.tsx:1364` | Kullanıcının kelimeye elle koyduğu `review` bayrağı filtresi |
| **Çalış** / **Bu listeyi çalış** | `src/ui/WordDetail.tsx:248`, `src/ui/Words.tsx:1448`, `src/ui/WordLists.tsx:215` | Belirli bir kelime veya liste için anlık oturum başlatma |
| **Pratik** / **Serbest pratik** | `src/ui/Screens.tsx:671`, `src/ui/Mistakes.tsx:73` | İlerlemeyi/FSRS'i etkilemeyen serbest çalışma |
| **Alıştırma** | `src/ui/verbs/PracticeTab.tsx`, `src/ui/ErrorReport.tsx:123` | Fiil lab soru modları veya hata odaklı mini testler |
| **Fiil ısınması** | `src/ui/Screens.tsx:623` | En çok karıştırılan zaman için 2 dakikalık hızlı hedefli tur |
| **Fiil çekimi tekrarı** | `src/ui/Screens.tsx:612` | Unutulmak üzere olan çekimler için FSRS turu |

> **Tespit & Öneri:**
> - `Gözden geçir` terimi, hem genel bir "tekrar etme" çağrışımı yapıyor hem de sistemde teknik bir işaretleme (`review` bayrağı) olarak kullanılıyor. Bu durum kullanıcının FSRS tekrarı ile özel işaretli kelimeleri karıştırmasına yol açabilir. Bayrak için **"İşaretlenenler"** veya **"İnceleme listesi"** denmesi karışıklığı önler.
> - "Pratik" ve "Alıştırma" terimleri yerine standart bir hiyerarşi oluşturulabilir: FSRS için **"Tekrar"**, özel hedefler için **"Çalış"**, test/quiz modları için **"Alıştırma"**.

---

## 3. Silme, Kaldırma ve Çıkarma Eylemleri ("Sil / Kaldır / Çıkar")

Bir ögeyi sistemden veya listeden uzaklaştırırken farklı fiiller kullanılıyor:

| Eylem | Bulunduğu Yer | Metin |
| :--- | :--- | :--- |
| Kelimeyi tamamen silme | `src/ui/WordDetail.tsx:255`, `src/ui/Words.tsx:1438` | `Kelimeyi sil` / `Sil (N)` |
| Kendi eklediğin örnek cümleyi silme | `src/ui/WordExamples.tsx:123` | `Cümleyi sil` |
| Otomatik corpus cümlesini listeden gizleme | `src/ui/WordExamples.tsx:263` | `Bu cümleyi kaldır` |
| Listeden kelime çıkarma | `src/ui/Words.tsx:1424` | `Listeden çıkar` |
| Favorilerden fiil çıkarma | `src/ui/verbs/LearnTab.tsx:248` | `Favorilerden çıkar` |
| Grafikten seçimi temizleme | `src/ui/WordGraph.tsx:191` | `Seçimi kaldır` |
| Kütüphane kitabını silme | `src/ui/Reading.tsx:506`, `1155` | `${item.title} sil` / `Kitabı sil` |
| Seviyeyi silme | `src/ui/WordLists.tsx:231` | `Sil` |

> **Tespit & Öneri:**
> - Kalıcı veri kaybı içeren işlemler için **"Sil"** (`Kelimeyi sil`, `Kitabı sil`) kullanılırken, bir koleksiyondan veya ekrandan çıkarma işlemleri için **"Kaldır"** veya **"Çıkar"** (`Favorilerden çıkar`, `Listeden çıkar`, `Seçimi kaldır`) kullanılmış.
> - Bu ayrım mantıklı olmakla birlikte, örnek cümlelerdeki `Cümleyi sil` ve `Bu cümleyi kaldır` ayrımı kullanıcıya aradaki teknik farkı (kendi cümlen vs. corpus önerisi) tam hissettirmeyebilir.

---

## 4. Güçlük, Hata ve Zayıflık İfadeleri ("Zor / Zayıf / Hatalı / Zorlanan")

Kullanıcının zorlandığı veya hata yaptığı yerler için kullanılan terimler:

| Kavram | Bulunduğu Yer | Kullanılan Terimler |
| :--- | :--- | :--- |
| Manuel zor kelime işareti | `src/ui/DifficultButton.tsx`, `src/ui/Words.tsx:1410` | `Zor diye işaretle` / `Zor işaretini kaldır` / `Zor kelimeler` |
| Sistem tarafından tespit edilen zayıflık | `src/ui/Progress.tsx:256`, `src/ui/AudioReview.tsx:11`, `src/ui/SwipeCards.tsx:103` | `Zorlandığın kelimeler` / `Zayıf kelimeler` / `En zayıflar` |
| Açık hatalar | `src/ui/Mistakes.tsx:80`, `src/ui/WordDetail.tsx:480` | `Açık hata` / `Hatalarını düzelt` / `Hatalı` |
| Fiil zamanlarındaki zayıflık | `src/ui/verbs/MasteryTab.tsx`, `src/ui/TenseWeakness.tsx` | `Zayıf noktaların` / `Zorlandığın çekimler` / `Zayıf zaman` |
| Okuma metni seviyesi | `src/ui/Reading.tsx:37`, `src/ui/WikipediaPicker.tsx:7` | `Zorlayıcı` / `Çok zor` |

> **Tespit & Öneri:**
> - Kullanıcının kendi iradesiyle işaretlediği durumlar için **"Zor kelimeler"** (Difficult),
> - Algoritmanın başarı oranına göre belirlediği durumlar için **"Zayıf noktalar"** veya **"Zorlandıkların"** terimi ayrıştırılmalıdır. `SwipeCards`'taki "En zayıflar" ile `Progress`'teki "Zorlandığın kelimeler" aynı metriği temsil ediyorsa tek bir ad altında birleştirilmelidir.

---

## 5. Süreç Bitişleri ve Onaylar ("Tamam / Bitti / Kaydet")

Oturum, tur ve görev bitişlerinde kullanılan kutlama ve durum bildirimleri:

| Ekran | Bitiş Metni |
| :--- | :--- |
| Ana Oturum (Bugün) | `Bugünün görevi tamam!` (`Screens.tsx:551`), `Günün ilk yarısı tamam.` (`Screens.tsx:1000`) |
| Eşleştirme Oyunu | `Tamamlandı!` (`MatchGame.tsx:93`) |
| Fiil Günlük Turu | `Bugünkü fiil turun bitti` (`LabTour.tsx:153`) |
| Fiil Tekrarı | `Tekrar bitti` (`ReviewTab.tsx:54`) |
| Konuşma/Üretim Görevi | `Görev bitti` (`Produce.tsx:527`) |
| Toplu Seçim Modu | `Seç` → `Bitti` (`Words.tsx:1239`) |

> **Tespit & Öneri:**
> - "Tamamlandı" ile "Bitti" dönüşümlü kullanılıyor. Oturum başarıyla tamamlandığında **"Tamamlandı!"**, kullanıcı can kaybıyla veya yarıda kestiğinde **"Bitti"** ayrımı yapılabilir ya da tüm günlük turlar için pozitif bir dil ("Günün turu tamamlandı!") standartlaştırılabilir.

---

## 6. Özet Öneri Tablosu

| Kavram | Mevcut Karışık Terimler | Önerilen Standart Terim |
| :--- | :--- | :--- |
| Kelime Koleksiyonu | Kelimeler / Kelimelerim / Listen / Kelime listen | **Kelimelerim** (Sayfa) / **Kelimelerime ekle** (Düğme) / **Kelimelerinde** (Durum) *(Uygulandı)* |
| Algoritmik FSRS | Tekrar / Çalış / Günün tekrarları | **Tekrar** / **Tekrara başla** |
| Manuel İşaretli Kelimeler | Gözden geçir / Review | **İşaretlenenler** *(Uygulandı)* |
| Algoritmik Zayıf Kelimeler | Zayıf kelimeler / En zayıflar / Zorlananlar | **Zayıf kelimeler** |
| Manuel Zor İşareti | Zor diye işaretle / Zor kelimeler | **Zor işaretle** / **Zor kelimeler** |
| Süreç Bitişi | Bitti / Tamamlandı / Görev bitti | **Tamamlandı** (Başarı) / **Bitti** (Sona erme) |

---

## 7. Son Turlarda Eklenen Yeni Özelliklerin Metin Denetimi (6. Tur)

Son turlarda uygulamaya dahil edilen yeni arayüz metinleri, `DESIGN.md` ve dil birliği ilkelerine göre denetlenmiştir:

| Yeni Özellik | Arayüz Metni & Konumu | Değerlendirme & Dil Uyumu |
| :--- | :--- | :--- |
| **"Unuttum" Düğmesi** | `Session.tsx:612` ("Unuttum" çipi), `Session.tsx:558` ("Hatırlayamadığını söyledin: sorun değil, cevaba bak; kelime yakında tekrar gelecek.") | **Çok Başarılı:** Yargılamayan, suçluluk hissettirmeyen ve öğrenciyi sakinleştiren üslup. "Emin değilim" ile karıştırılmaması için ayrı çip olarak konumlandırılmış. Kısayol (Alt+U) ipucu açık. |
| **Çekimler Kartı** | `TextForms.tsx` ("Metindeki çekimler", "N kez", "Metinde göster", "Laboratuvarda aç") | **Tutarlı:** Kısa ve eylem odaklı. "Metinde göster" tıklandığında ilgili cümlenin aydınlanması ile birebir örtüşüyor. |
| **Çeviri Ekranı** | `TranslateScreen.tsx` ("Çeviri", "cümle cümle, yan yana", "Kelimelerime ekle", "Çeviriyi kopyala", "Cümle kartı olarak kaydedildi") | **Standartlara Tam Uyumlu:** Kelime havuzuna ekleme butonu Bölüm 1'de belirlenen **"Kelimelerime ekle"** standardına harfiyen uyuyor. Son çevirilerdeki yön etiketleri ("FR → TR") yalın. |
| **"Dışarıda Çalış" Kartı** | `ReadingLibrary.tsx` ("Dışarıda çalış", "Açık kaynaklar ve harici siteler") | **Sade:** Uygulama sınırları dışındaki üçüncü taraf eğitim kaynaklarını (TV5Monde, DELE Ahora) kullanıcıya dürüstçe ve beklenti yaratmadan sunuyor. |
| **Cümle Takip Ayarı** | `Reading.tsx` ("Şu an bu cümle okunuyor", "1 noktayla ayarlandı", "Ayarı sıfırla") | **Kullanıcı Odaklı:** "Zaman damgası senkronizasyonu" gibi teknik terimler yerine kullanıcının doğrudan yaşadığı deneyimi ("Şu an bu cümle okunuyor") tarif ediyor. |
| **Fiil Turu Gizleme** | `LabTour.tsx` ("Bugünlük gizle", "Bugünün fiil turu gizlendi; yarın yine çıkar.", "Geri al") | **Net ve Geçici:** Kullanıcıya işlemin kalıcı bir silme olmadığını, ertesi gün otomatik geri geleceğini ve dilerse anında "Geri al"abileceğini net bildiriyor. |

