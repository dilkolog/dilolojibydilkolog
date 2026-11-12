# Okuyucu bileşen ve etkileşim sözleşmesi

## Yerleşim

Masaüstünde metin sütunu ve sabit genişlikli yan alan. Kelime paneli yan alanın yerini alır; metin genişliği seçim sırasında değişmez. Panel sayfa kaydıkça görünür alan içinde tutulur.

Mobilde kelime paneli nonmodal alt bölgedir; tam ekran modal veya sayfa değişimi değildir. Metinle etkileşim devam eder. Maksimum yükseklik 66dvh; içerik kendi içinde kayar. Kapatma başlığı görünür kalır. Alt boşluk eklenerek son paragrafların panel üstüne taşınabilmesi sağlanır. Başlığı 70px'ten fazla aşağı sürüklemek veya Escape kapatır. Native dialog yalnız açıklama/metin ekleme pencerelerinde kullanılır.

## Sözcük seçimi

- Metindeki sözcüğe dokun → başlık, anlam, ses, kaydetme ve tam karşılaşılan cümle.
- Paneli kapat → kaynak sözcüğe preventScroll ile odak dönüşü.
- Tab ile metindeki mevcut sözcüğe gir; ← → komşu sözcüğe, Enter anlamına gider. Tüm sözcükleri yüzlerce Tab durağına dönüştürmeyen roving tabindex uygulanır.
- Noktalama aynı sözcük biriminde tutulur; nokta tek başına sonraki satıra düşmez. Uzun sözcükler ve 42px yazı dar ekranda taşmamalı.
- Çıkarımda ilk dokunuş gizli sözcüğü açar, ikinci dokunuş anlamı açar; gizliyken accessible name cevabı söylemez.

## Durum ayrımı

Yeni, öğreniliyor, bilinen ve yok sayılan birbirinden ayrıdır. Örnek renklendirmeler kalıcı kullanıcı verisi değildir. “Bilmiyorum”, otomatik “öğreniliyor” demek değildir. Kelime ekleme ve bilinme işaretleme ayrı eylemlerdir. Üretimde gerçek token/status ve mevcut kayıt eylemleri kullanılır.

Panelde ana ekleme düğmesi bağlam kutusundan önce gelir; uzun cümle, ana eylemi gereksiz yere ekran dışına itmez. Tam cümle ve kaynak metin bağı kaybolmaz. Örnek mini sözlükte olmayan sözcüğe sahte anlam yazılmaz.

## Ana çubuk ve modlar

Ana çubuk: Türkçesi, Dinle, Görünüm, Çalışma modları. Menülerde native details/summary kullanıldı; gerçek ARIA menüsü iddiası yok. Mobil açılır alan çubuğun tamamına hizalanır; sağa taşmaz.

| Mod | Tam metin | Paragraf Türkçesi | Kelime paneli |
|---|---|---|---|
| Normal / çıkarım / çekimler | Görünür | Kullanıcı tercihine bağlı | Açılabilir |
| Dinleme1 ve3 | Gizli | Gizli | Kapatılır |
| Dinleme2 | Görünür | Tercihe bağlı | Açılabilir |
| Dikte | Gizli | Gizli | Kapatılır |
| Gölgeleme | Görünür | Tercihe bağlı | Açılabilir |

Diktede cevap açıldığında yalnız çalışılan örnek cümle/çevirisi görünür, tam metin açılmaz. Dikte karşılaştırması burada elle inceleme; gerçek puan/cevap motoru yok. Gölgelemede mikrofon açılmaz. Modlar arası geçiş model sesi durdurur. Çoklu seçime geçiş bu prototipte normal okumaya döner; üretimde mevcut birlikte çalışabilme kuralları ayrıca değerlendirilmelidir.

## Kütüphane ve metinler

Boş kütüphane, aramada sonuç yok, yükleniyor ve kütüphane yükleme hatası farklı durumlar. Hata ekranı metinlerin silindiğini söylemez. Yeniden deneme bu HTML'de örnek görünümü açar, gerçek veri kurtarma işlemi yapmaz.

Metin ekleme: yalnız sekmede, başlık/metin zorunlu. Kullanıcı içeriği HTML olarak çalıştırılmaz. Örnek metin 138 sözcük, diğer metinlerin sayısı içerikten hesaplanır. Okuma tamamlandı önizlemesi XP/FSRS/gerçek okuma kaydı üretmez. Sekme içinde metinden kütüphaneye gidip dönüş konumu tutulur; kalıcı cihazlar arası devam konumu uygulanmadı.

## Görünüm ve hareket

Prototip yazı boyutu 17–42px; 42px stres testi varsayılan 21px'in iki katıdır. Bu, mevcut üretim ayarının 4 adımını değiştirme önerisi değildir. Sepya/dar/geniş/ferah/sans/odak seçenekleri mevcut ReaderPrefs mantığına bağlanmalı. Vurgu seçici yalnız tasarım rengini değiştirir; örnek içerik İspanyolca kalır. Sakin ve reduced-motion geçişleri durdurur.
