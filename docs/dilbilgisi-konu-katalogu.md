# Fransızca ve İspanyolca dilbilgisi konu kataloğu

Pratik → Oyunlar → Dilbilgisi soruları artık düz bir etiket dizisi yerine kategori, alt konu ve çalışma seçimi sunar. Fransızcada 191, İspanyolcada 209 başlık, dil başına 16 ana kategori altında A1–C2 aralığına dağıtılır. Bu bir konu haritasıdır; CEFR etiketleri içerik planlama için yaklaşık giriş seviyelerini gösterir.

## Düzen

İsimler ve artikeller; belirleyiciler ve miktar; sıfatlar ve karşılaştırma; zamirler; fiillerin temelleri; haber kipi ve zamanlar; dilek kipi; koşul ve varsayım; emir, mastar ve ortaçlar; çatı ve özel yapılar; zarflar, sayılar ve zaman ifadeleri; edatlar; sorular ve olumsuzluk; cümleler ve bağlaçlar; anlatım, vurgu ve metin; yazım ve kullanım.

Arama, Türkçe açıklamalar ve yabancı dilde kalıplar üzerinde çalışır; aksan ve Türkçe harf farklılıklarını tolere eder. Seviye seçimi hem görünür konuları hem de tura alınan soruları sınırlar. Kategori seçimi yalnız o kategorinin sorularından karma tur başlatır. B2 ve C1 birlikte seçilebilir. Hazır konular filtresi, seçili seviyede soru bulunan konuları gösterir.

## İçerik ekleme sözleşmesi

- Katalog dosyaları: `src/data/grammarCatalog/fr.json` ve `es.json`. Her konunun kalıcı `id`, `level`, Türkçe `title` ve örnek yapıların bulunduğu `description` alanları vardır.
- Mevcut soru kimlikleri ve `topic` değerleri değiştirilmez. Eski geniş konu paketleri **karma alıştırmalar** adıyla kendi başlıklarında korunur. Soru etiketi kesinleşmeden bu sorular birden fazla ayrıntılı alt konuya kopyalanmaz.
- Yeni sorunun `topic` alanı doğrudan katalogdaki konu `id` değerini kullanmalıdır. Böylece başlık, soru sayısı ve hazır durumu kendiliğinden güncellenir. Yeni katalog başlıkları `topicName` tarafından tanınır; ayrıca eski `TOPIC_NAME` tablosuna kopyalanmaları gerekmez.
- “Yakında”, ilgili başlıkta hiç soru olmadığı anlamına gelir. Başka seviyede sorusu bulunan başlıkta **Bu seviyede soru yok** yazılır. Boş konu açılabilir fakat başka sorulardan tur başlatmaz. Seçimi temizleme tüm kategorilere ve seviyelere döner.
- Eski geniş başlıklardaki soru sonuçları ve aralıklı tekrar kayıtları aynen kullanılır. Katalog, öğrenme geçmişini değiştirmez.

Doğrulama: tüm mevcut FR/ES soru etiketlerinin tek bir katalog başlığına bağlanması, kalıcı kimliklerin benzersizliği, seviyeler, boş konu akışı, aksansız arama, seviye/kategoriyle gerçek tur seçimi ve dil değişiminde seçim temizliği. Tarayıcı kontrolleri mevcut sekiz soruluk konu turunu ve iki dilde 375 piksel görünümü de kapsar.
