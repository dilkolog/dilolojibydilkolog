# Teslim kontrolü — 14 Kasım 2026

> Güncel uygulama taslağı: **500 kayıt**. Bu dizinin 237 kayıtlık tarihsel editoryal seti ve kimlikleri korunur; aktarım, kaynak yöntemleri ve bekleyen denetim için [UYGULAMA-PAKETI.md](UYGULAMA-PAKETI.md).


- 10 kaynak JSON’da 237 aktif deyim, 474 özgün örnek/çeviri ve 237 bağlam sorusu bulunur.
- İlk 260 kimlik aktif veya RETIRED.json içinde açıkça kayıtlıdır; 23 kimlik çıkarılmış, hiçbiri başka ifadeye verilmemiştir.
- Antigravity raporlarındaki 33 sorunlu ve 30 şüpheli kaydın her biri için gerekçeli karar vardır; bütün şüphelilerde ikinci kaynak kaydı bulunur.
- Aktif, işaretlenmiş kayıtlarda en az iki bağımsız kaynak alan adı vardır. Tam sayfa ve arama özeti yöntemleri ayrılır; erişim sınırları gizlenmez.
- Bütün örnekler en çok 16 kelimedir; her kayıtta iki Fransızca örnek ve Türkçe çeviri vardır. 26 örnek/çeviri bu turda düzeltildi.
- Soru bağlamı ikinci örnekle aynıdır; dört seçenek farklı, cevap indeksi geçerlidir. Mevcut anahtarlar yeniden dengelenmek için değiştirilmedi; A/B/C/D sayıları 60/59/61/57’dir.
- Kaynak JSON, öğretim kartları, cevap anahtarsız sorular, paket dizini ve 11 ZIP yeniden üretildi; arşiv bütünlüğü ve SHA-256 listesi kontrol edildi.
- Doğrulayıcının kimlik kaybı, uzun örnek, eksik ikinci kaynak, eksik karar ve soru bağlamı bozulmalarını reddettiği testlerle sınandı.
- Çekirdek fr-0000.json, uygulama deyim verileri, İspanyolca ve İngilizce dosyaları korunmuştur.
- `git diff --check` geçti.

Antigravity’nin düzeltmeleri tekrar okuması, CEFR dağılımı, bütün setin ikinci kaynak kapsamı ve uygulama şemasına geçiş sürer. Yapı denetimi dilsel tek cevap kanıtının veya insan onayının yerine geçmez; PR taslak kalır.
