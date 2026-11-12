# Diloloji · Tasarım iş planı

11 Kasım 2026 · Beş alanın kod ve akış incelemesi

**Sonuç:** Beş alanın da temel işlevleri mevcut. En büyük yeni tasarım ihtiyacı konuşma–dinleme durumlarının ortaklaşması, okuma araçlarının öncelik sırası ve Bugün ekranındaki karar hiyerarşisi. İlk kullanım ve ayarlar için kapsamlı yeniden yapım yerine seçici iyileştirme öneriliyor.

Bu teslim bir iş planıdır. Yeni ekran maketleri veya uygulama değişikliği yapılmadı. Kaynak yerel `origin/main` b1c059bbedb911aa967e60759c1a46c801cde56b. Uzak dal bu incelemede güncellenmedi; güncel üretimle aynı olduğu varsayılmamalı. Canlı hesapta ekran gezintisi yapılmadı. Görsel yoğunluk ve mobil yerleşimle ilgili maddeler, ilk doğrulama turunda sınanacak hipotezlerdir.

## Tek tek inceleme sonucu

| Alan | Zaten mevcut | Asıl tasarım işi | Öncelik |
|---|---|---|---|
| İlk kullanım | 3 adım, dil devralma, süre/kelime hedefi, odak yönetimi | Karşılama yoğunluğu, hedef açıklaması, isteğe bağlı seviye testi daveti | P2 |
| Konuşma–dinleme | Kayıt/önizleme, puanlama, kelime geribildirimi, üç tur dinleme, gölgeleme | Ortak kayıt kontrolü, durumlar ve hata yönlendirmesi, sonuç hiyerarşisi | P1 |
| Okuma | Çeviri, dikte, gölgeleme, çoklu seçim, mobil alt panel ve masaüstü yan panel | Araçları önceliklendirme, kelime paneli, okumaya dönüş | P1 |
| Bugün | Başla/devam, kısa tur, yarım oturum, odak listesi, tamamlandı/boş durumları | Tek açık ana eylem, kalan iş/süre, kapsam ve ikincil alanlar | P1 |
| Ayarlar | 8 grup + Yardım, arama, gelişmiş ayarlar, sıfırlama ve geri al | Satır/aktif değer düzeni, arama bağlamı, profil bağlantısı ve veri işlemi ayrımı | P2 |

Ayrıntılar: [İlk kullanım](01-INCELEME.md), [Konuşma–dinleme](02-INCELEME.md), [Okuma](03-INCELEME.md), [Bugün](04-INCELEME.md), [Ayarlar](05-INCELEME.md).

## İş sırası

### 0. P0 — Mevcut site ve hazır paketleri uzlaştır

**Önce yapılmalı.** Güncel üretim dalı ve gerçek ekran görüntüleriyle bu kod incelemesini karşılaştır. Hangi tasarım paketlerinin uygulandığını dosya/ekran bazında işaretle. Önceki “hazır” paketler, siteye uygulanmış kabul edilmesin.

İlk kullanım için yeni/temiz profil; diğer ekranlar için örnek verili bir test profili kullan. Gerçek kişisel kaydı sıfırlayarak ilk kullanım testi yapma. Mobil375px ve masaüstü 1440px başlangıç görüntüleri, akışların gerekli durumlarıyla kaydedilsin.

**Çıktı:** “mevcut / hazırlanmış ama bağlanmamış / gerçekten eksik” matrisi. Her bulguya ekran/kod kanıtı ve güven seviyesi. Yanlışlanan tasarım hipotezleri backlogdan çıkarılır.

### 1. P1 — Konuşma–dinleme

Önce durum panosu, sonra kayıt/sonuç maketi, sonra dinleme/gölgeleme kontrol düzeni. Kaydetme ile puanlamayı ayır; tek mikrofon butonuna iki farklı söz verme. Yeni çizim gerekip gerekmediğini mevcut nomic ve pratik ikonlarını gördükten sonra belirle.

**Tamamlanma kapısı:** izin reddi ve destek yok dahil tüm durumlar; açık/koyu/sakin; gerçek ses sınırlarının korunması; mikrofon olmadan çıkış.

### 2. P1 — Okuma

Önce araç çubuğu öncelikleri; sonra kelime alt/yan paneli. Önceki kelime kartını görsel referans al; mevcut işlevleri kaybetme. Dinleme kontrolleri bir önceki işin ortak bileşenlerini kullanır.

**Tamamlanma kapısı:** uzun metin/çeviri, klavye, tek ve çoklu seçim, dinleme/dikte/gölgeleme koşulları ve okumaya dönüş.

### 3. P1 — Bugün

Önce dokuz durumun yerleşim matrisi, sonra ana görev ve kısa tur, sonra odak listesi ve gün sonu. Filiz/boş durum paketlerini tekrar çizmek yerine doğru bağlama yerleştir.

**Tamamlanma kapısı:** yarım oturum ile günlük başlatma çatışmaz; görev yok ve tamamlandı ayrılır; günlük kapsam ve kalan iş doğru görünür.

### 4. P2 — İlk kullanım

Mevcut üç adımı koruyarak sadeleştirme. Önceki adımların tasarım dili ve Bugün ekranına ilk geçiş burada birleşir. Seviye testi isteğe bağlı ayrı davet; onboarding zorunluluğu değil.

**Tamamlanma kapısı:** tüm diller, isimsiz tamamlama, geri/ileri seçim koruma, telefonda klavye ve başlık odağı.

### 5. P2 — Ayarlar ve profil bağlantısı

Son sırada ortak kontrol/satır diliyle tutarlılık turu. Yeni grup ve arama sistemi ekleme; mevcut davranışı netleştir. Avatar paketi profilde tek kaynak olsun.

**Tamamlanma kapısı:** tüm gruplar, arama/sonuç yok, gelişmiş seçenekler, sıfırlama/geri al ve veri işlemlerinin ayrımı.

### 6. Ortak son kontrol ve Claude devri

Her alan için önce/sonra, durum listesi, token/bileşen eşleştirmesi ve korunacak sözleşme hazırlanır. Tasarım: ChatGPT. Üretim koduna aktarım: Claude. Uygulama sonrası gerçek görsel ve işlev doğrulaması ayrı iş olarak tamamlanır; prototip testleri onun yerine geçmez.

## Planın büyüklüğü ve sınırları

`BACKLOG.json` içinde 17 iş var: 2 ortak iş + her alan için 3 tasarım/teslim işi. P0 doğrulama tüm alanların başlangıç bağımlılığıdır. Konuşma–dinleme → okuma → Bugün → ilk kullanım → ayarlar önerilen odak sırasıdır; her alanın tasarımı tamamlandıkça Claude'a ayrı teslim edilebilir.

S/M/L göreli kapsam gösterir, gün tahmini değildir: S tek metin/durum düzeni, M bir akış/bileşen ailesi, L birden çok ekran/durum ve ortak kontrol. Canlı ekran doğrulaması yapılmadan bitiş tarihi veya kesin çizim sayısı verilmedi.

Bu plan yeniden 40 avatar, tüm rozetler veya tüm Monki çizimlerini üretmeyi içermez. Mevcut paketlerin uygulama durumunu kontrol eder. Onay bekleme adımı yok; ürün davranışı/ölçüm tanımı değişecekse bu, yalnızca görsel değişiklikten ayrı açıkça belirtilir.

## Her teslim için ortak kabul ölçütü

- Aktif dil rengi EN/FR/ES; açık/koyu/sakin; prefers-reduced-motion.
- Lexend arayüz, Literata hedef dil; doğru `lang` niteliği.
- 375px ve 1440px, uzun içerik ve büyütülmüş yazı; yatay taşma ve kapanmayan panel yok.
- Klavye ve görünür odak; durum yalnızca renk/hareketle anlatılmaz.
- Yükleme, hata, destek yok ve gerçek boş içerik birbirinden ayrılır.
- Mevcut ID, kayıt, FSRS, XP, seri, rozet, okuma konumu ve ayar davranışları korunur.
- Her yeni görsel benzersiz ad, kaynak, ölçü ve kullanım notuyla teslim edilir; yeni görsel gerekmiyorsa üretilmez.

## 11 Kasım 2026 · Tasarım ilerlemesi

Konuşma–dinleme için `../konusma-dinleme-01/` paketi hazır: dört akış, 15 ortak durum ve yerel tarayıcı kontrolleri. 02-A/B/C görevlerinin ayrıntılı durumları BACKLOG.json içinde güncellendi. Canlı siteyle P0 karşılaştırması ve üretim entegrasyonu henüz tamamlanmadı. Sıradaki tasarım alanı okuma.

## 12 Kasım 2026 · Okuma tasarımı

Okuma için `../okuma-deneyimi-01/` paketi hazır: 17 durum, okuyucu araçları, kelime alt/yan paneli ve kütüphane. 03-A/B/C durumları BACKLOG.json içinde güncellendi. Canlı P0 karşılaştırması ve üretim aktarımı bekliyor. Sıradaki tasarım alanı Bugün ekranı.

## 12 Kasım 2026 · Bugün tasarımı

`../bugun-deneyimi-01/` paketi hazır: 10 durum, tek ana eylem, kısa tur, kapsam ve gün sonu. 04-A/B/C güncellendi. “Gün tamam, yarım tur var” kaynak davranışı ayrıca korundu. Canlı P0 karşılaştırması ve üretim aktarımı bekliyor. Sıradaki alan ilk kullanım.

## 12 Kasım 2026 · İlk kullanım tasarımı

`../ilk-kullanim-01/` hazır: üç adım, dokuz görünüm, ilk kelime ve koşullu/isteğe bağlı seviye testi daveti. 01-A/B/C güncellendi. Kaynaktaki en az beş kelime koşulu korundu. Canlı P0 ve gerçek onDone/veri/test akışı doğrulaması bekliyor. Sıradaki tasarım alanı ayarlar ve profil bağlantısı.

## 12 Kasım · Beş alanın yerel prototipleri hazır

Ayarlar ve profil son teslimi: [paket](../ayarlar-deneyimi-01/README.md), [galeri](../ayarlar-deneyimi-01/galeri.html), [Claude devri](../ayarlar-deneyimi-01/CLAUDE-DEVIR.md). 8 ana grup + ayrı Yardım, 17 senaryo ve 37 ekran. Yerel mobil/masaüstü kontrolleri geçti. İlk kullanım, konuşma–dinleme, okuma, Bugün ve ayarlar için tasarım prototipleri böylece hazır. Yukarıdaki ilk incelemenin “yeni maket yok” ifadesi tarihsel plan sürümünü anlatır; sonraki teslimler bu bölüm ve önceki ilerleme kayıtlarındadır. Üretime entegrasyon ve canlı davranış eşliği tamamlanmış değildir. ORT-01 ve ORT-02 açık kalır.
