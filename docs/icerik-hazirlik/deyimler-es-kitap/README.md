# İspanyolca — PDF'den çıkarılan deyim ve kalıplar

**151 ifade · 302 özgün örnek ve Türkçe çevirisi · 10 ünite.** Kullanıcının isteğiyle kitaptan yalnızca ifade seçimi alındı. Türkçe anlamlar, kullanım açıklamaları ve örnek cümleler Codex tarafından özgün yazıldı. Kitabın açıklamaları, örnekleri ve alıştırmaları aktarılmadı.

- [Asıl veri: JSON](es-kitap-ifadeler.json)
- [Tablo: CSV](es-kitap-ifadeler.csv)
- [Çıkarılan terimler ve elenenler](PDF-TERIM-DIZINI.json)
- [Mevcut İspanyolca kayıtlarla eşleşmeler](MEVCUT-PAKET-ESLESMELERI.json)
- [Claude için devir](CLAUDE-DEVIR.md)
- [Kaynak ve çıkarım yöntemi](KAYNAK-NOTU.md)
- [Yapı kontrolü](DOGRULAMA.json)
- [Teslim kontrolleri](TESLIM-KONTROLU.md)

| Ünite | Konu | İfade | Örnek | İnceleme |
| --- | --- | --- | --- | --- |
| 01 | Duygular | 15 | 30 | [Oku](uniteler/unite-01.md) |
| 02 | İş ve çalışma | 16 | 32 | [Oku](uniteler/unite-02.md) |
| 03 | Para | 16 | 32 | [Oku](uniteler/unite-03.md) |
| 04 | Sağlık ve beden | 15 | 30 | [Oku](uniteler/unite-04.md) |
| 05 | İnsan ilişkileri | 14 | 28 | [Oku](uniteler/unite-05.md) |
| 06 | İşleri yapış biçimi | 14 | 28 | [Oku](uniteler/unite-06.md) |
| 07 | Vurgu ve pekiştirme | 19 | 38 | [Oku](uniteler/unite-07.md) |
| 08 | Karakter ve tepkiler | 13 | 26 | [Oku](uniteler/unite-08.md) |
| 09 | Ders ve öğrenim | 16 | 32 | [Oku](uniteler/unite-09.md) |
| 10 | Konuşma tepkileri | 13 | 26 | [Oku](uniteler/unite-10.md) |

Bu sayı yalnızca mecaz deyimlerden oluşmaz; kitapta öğretilen kalıplaşmış tepkiler ve konuşma dili nitelemeleri de türleriyle kaydedildi. Tek sözcüklü `pasarse`, `venga`, `vaya`, `ánimo` deyim listesine alınmadı. `¡Vaya muermo!` birden çok sözcüklü ayrı bir tepki olarak eklendi.

Mevcut `icerik/deyimler-es` dalındaki 326 kayıtla karşılaştırmada 26 ifade biçim eşleşmesi ve 14 yakın eşleşme adayı bulundu. Bunların anlam veya örnekleri bu dosyaya kopyalanmadı; var olan dosyalar değiştirilmedi. Yakın eşleşmeler otomatik birleştirme kararı değildir.

Bu bir PDF çıkarım ve özgün yazım teslimidir; uygulamaya bağlanmadı. Bağımsız dil denetimi, bölge/üslup ve CEFR etiketleri bekliyor. Mevcut proje rehberinin yayın için istediği iki bağımsız kaynak koşulu bütün kayıtlarda tamamlanmış sayılmaz. Henüz uygulama ham veri şemasına aktarılmadı.

Kontrol: `python3 docs/icerik-hazirlik/deyimler-es-kitap/validate.py`. ZIP tek başına açıldığında kendi klasöründen `python3 validate.py` çalıştırılabilir.

JSON değişikliklerinden sonra `render.py` CSV, ünite dosyaları ve ZIP’i yeniden üretir.
