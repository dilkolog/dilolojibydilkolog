# Teslim kontrolü

10 Kasım 2026 tarihli üretici kontrolü:

- 155 çıkarım adayı, 151 alınan çok sözcüklü ifade, 4 ayrılan tek sözcük.
- 151 benzersiz kayıt ve 302 birbirinden farklı özgün İspanyolca örnek; her örnekte Türkçe çeviri.
- İspanyolca örneklerin her biri en çok 16 sözcük.
- 10 ünitenin kayıt sayıları: 15, 16, 16, 15, 14, 14, 19, 13, 16, 13.
- Kaynak PDF, basılı sayfa, tarama yarısı ve hedef madde numarası saklandı.
- CSV ile JSON'un anlam ve örnek alanları birebir karşılaştırıldı.
- OCR/metin çıktısıyla yapılan normalleştirilmiş tam cümle taramasında 302 örnek için eşleşme bulunmadı. Bu, anlamca benzer senaryoları bütünüyle dışlayan bir denetim değildir.
- Mevcut 326 İspanyolca kayıtla ifade biçimi karşılaştırıldı: 26 biçim eşleşmesi ve 14 olası yakınlık raporlandı. Mevcut dosyalar değiştirilmedi.
- ZIP bütünlüğü, arşivden açılmış verinin doğrulanması ve Markdown iç bağlantıları kontrol edildi.

Bunlar yapı ve üretici kontrolleridir. Bağımsız dil incelemesi ve yayına dönük iki bağımsız kaynak doğrulaması tamamlandı anlamına gelmez. Uygulama kodu değişmediği için uygulama derlemesi ve tarayıcı testi çalıştırılmadı.

Düzeltme önce JSON'da yapılır; `python3 render.py` CSV, ünite görünümleri, doğrulama çıktısı ve ZIP'i yeniden üretir. Çıkarım dizinini etkileyen değişikliklerde `PDF-TERIM-DIZINI.json` da bilinçli olarak güncellenmelidir.
