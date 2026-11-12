# İkon tasarım devri / 01

9 Kasım 2026. Mevcut 103 SVG ikon yan yana incelendi. Kaynak: `src/ui/icons.tsx`; kullanım bağlamı: `src/appNav.ts`, `src/ui/ReaderTools.tsx` ve taşma menüleri. Tasarım kuralları: kökteki DESIGN.md. Bu paket altı **aday** içerir; uygulama dosyalarına dokunulmadı.

## Dosyalar

- `index.html`: mevcut/öneri karşılaştırması, 14/18/24 px ve açık/koyu önizleme.
- `svg/`: elde çizilmiş gerçek vektör adayları.
- `mevcut/`: inceleme anında mevcut React bileşenlerinden render edilmiş SVG kopyaları.
- `IconCandidates.tsx`: ayrı React adayları; üretim bileşenlerinin yerine doğrudan kopyalamadan önce kullanım yerini doğrula.
- `imagegen-kavram-panosu.png`: Image Gen üretimi görsel yön panosu. SVG kaynağı değildir; PNG’yi küçük ikonlara bölerek kullanma.
- `mevcut-set-inceleme.png`: incelenen tüm arayüz ikonları.
- `manifest.json`: kaynak/öneri eşleştirmesi.

## Kararlar

### Okuma

Mevcut: `ReadIcon`. Öneri: `ReadingNavIcon`.

Dosya simgesi belgeyi anlatıyor; okuma bölümünün kitap ve metin içeriği daha belirgin olabilir. Açık kitap, iki sayfa ve az sayıda satır. Kelimeler bölümündeki kapalı kitaptan ayrılıyor.

Entegrasyon adayı: src/appNav.ts: NAV içindeki reading; genel ReadIcon kullanımını topluca değiştirme.

### Pratik

Mevcut: `GameIcon`. Öneri: `PracticeNavIcon`.

Oyun kolu, Pratik bölümünü yalnızca oyunlardan ibaret gösteriyor. Üst üste çalışma kartları ve onay işareti: tekrar ve alıştırma anlamı.

Entegrasyon adayı: src/appNav.ts: yalnızca practice girdisi; games girdisindeki GameIcon kalsın.

### İlerleme

Mevcut: `ChartIcon`. Öneri: `ProgressNavIcon`.

Mevcut sütunlar düzensiz yükseklikte; küçük boyutta finans grafiği gibi okunabiliyor. Soldan sağa yükselen, daha açık aralıklı üç sütun. Küçük ölçekte kalabalığı önlemek için kavram panosundaki oku SVG’ye eklemedim.

Entegrasyon adayı: src/appNav.ts: progress girdisi; genel ChartIcon grafik etiketlerinde korunabilir.

### Diğer seçenekler

Mevcut: `MoreIcon`. Öneri: `MoreOptionsIcon`.

Üç kare ve daire uygulama ızgarasını çağrıştırıyor; taşma menüsü anlamı zayıf. Yatay üç nokta: yaygın ve sade taşma menüsü işareti.

Entegrasyon adayı: src/ui/verbs/LearnTab.tsx; src/ui/ListPage.tsx: menü tetikleyicileri.

### Gölgeleme

Mevcut: `ShadowingIcon`. Öneri: `ShadowingIcon`.

İki kırık çizgi nabız/sağlık sinyaline benziyor; konuşmayı tekrar etme anlamı açık değil. Birbirini izleyen iki konuşma balonu, öndekinde üç ses çizgisi. Etiketle birlikte kullanılmalı.

Entegrasyon adayı: src/ui/ReaderTools.tsx: Gölgele kontrolü.

### Dinlemeyi tekrar et

Mevcut: `EarMissIcon`. Öneri: `ListeningRetryIcon`.

Kesik çember içindeki kulak fazla küçülüyor; küçük boyutta noktalı bir lekeye dönüşüyor. Büyütülmüş kulak ve ayrı tekrar oku. Küçük kontrol boyutunda etiketsiz kullanma.

Entegrasyon adayı: EarMissIcon kullanılan dinleme hataları girişleri; alanın anlamı tekrar ise uygundur.

## Claude için entegrasyon sınırları

Önce AGENTS.md ve DESIGN.md oku. Mevcut 24 px viewBox, 1.8 çizgi, yuvarlak uçlar, currentColor ve yumuşak dolgu dilini koru. Aday TSX dosyası kendi bağımsız svg sarmalayıcısını içerir; üretime aktarırken mevcut `Icon`, `D`, `S` yardımcılarını kullanıp icon sınıfı/solid desteğini koru.

ReadingNavIcon açık kitap metaforu mevcut StoryIcon ile aynı aileye yakındır; aynı ekranda Hikâye ve Okuma yan yana ise etiketleri mutlaka koru. GameIcon gerçekten oyunlara götüren yerlerde kalmalı; Pratik için ayrı PracticeNavIcon kullan. ChartIcon’ın tüm kullanımlarını topluca ProgressNavIcon’a dönüştürme. MoreIcon’ın mevcut dört parçalı hali başka bir ızgara anlamında kullanılıyorsa koru; yalnızca taşma menüsünü üç noktaya dönüştür.

Kulak+tekrar okunun anlamı önceki 'dinlerken kaçırılanlar' alanından daha eylem odaklıdır. Yalnızca bu anlam uygunsa kullan; aksi halde mevcut etiket ve alan anlamına göre yeniden değerlendir. Gölgeleme simgesi tek başına yöntemi öğretmez; 'Gölgele' metni ve kısa açıklama kalmalı. Görseldeki üç ses çizgisi canlı kayıt göstergesi değildir.

Svg dosyaları dekoratif kullanımda aria-hidden=true taşır. Tek başına ikon düğmesinde erişilebilir ad düğmeye verilir. SVG’yi img olarak gösteriyorsan currentColor kapsayan sayfadan geçmez; uygulamada inline SVG veya mevcut React Icon deseni kullanılmalı. Bu galeride de inline render edildi.

14 px görünümü stres kontrolüdür. Yeni çok parçalı simgeleri mümkünse 18–22 px kullan; sıkışık bir toolbar için tüm çizgileri kalınlaştırma. Monki görselleri, madalya ve illüstrasyon ailesi bu değişikliğin dışında.

Kabul kontrolü: 375 px mobilde gezinme etiketleri ve eylemler; açık/koyu/sakin temada seçili/seçili olmayan durumlar; klavye odağı ve düğme adı. Bu tasarım değerlendirmesi, kullanıcılarla anlam tanıma testi yerine geçmez.
