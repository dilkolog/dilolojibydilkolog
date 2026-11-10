# Fransızca deyimler — 10 paket

**260 deyim ve kalıp · 520 özgün Fransızca örnek ve Türkçe çevirisi · 260 bağlam sorusu.** Kullanıcının istediği toplam 10 paket tamamlandı; ilk paket korunup dokuz yeni paket eklendi. Her pakette 26 kayıt, 52 örnek ve 26 soru var.

[On paketi birlikte indir](arsivler/deyimler-fr-10-paket.zip) · [Claude için devir](CLAUDE-DEVIR.md) · [Makinece okunabilir dizin](PAKET-DIZINI.json) · [Doğrulama](DOGRULAMA.json) · [Teslim kontrolü](TESLIM-KONTROLU.md)

| Paket | Tema | İnceleme | Cevap anahtarsız sorular | ZIP |
| --- | --- | --- | --- | --- |
| 01 | İlk karma paket | [Kartlar](INCELEME.md) | [Sorular](SORULAR.md) | [İndir](arsivler/deyimler-fr-paket-01.zip) |
| 02 | Duygular ve tepkiler | [Kartlar](paquet-02/INCELEME.md) | [Sorular](paquet-02/SORULAR.md) | [İndir](arsivler/deyimler-fr-paket-02.zip) |
| 03 | Konuşma ve iletişim | [Kartlar](paquet-03/INCELEME.md) | [Sorular](paquet-03/SORULAR.md) | [İndir](arsivler/deyimler-fr-paket-03.zip) |
| 04 | Çalışma ve çaba | [Kartlar](paquet-04/INCELEME.md) | [Sorular](paquet-04/SORULAR.md) | [İndir](arsivler/deyimler-fr-paket-04.zip) |
| 05 | Karar, risk ve tedbir | [Kartlar](paquet-05/INCELEME.md) | [Sorular](paquet-05/SORULAR.md) | [İndir](arsivler/deyimler-fr-paket-05.zip) |
| 06 | İlişkiler ve dayanışma | [Kartlar](paquet-06/INCELEME.md) | [Sorular](paquet-06/SORULAR.md) | [İndir](arsivler/deyimler-fr-paket-06.zip) |
| 07 | Para ve kaynaklar | [Kartlar](paquet-07/INCELEME.md) | [Sorular](paquet-07/SORULAR.md) | [İndir](arsivler/deyimler-fr-paket-07.zip) |
| 08 | Zaman ve gündelik ritim | [Kartlar](paquet-08/INCELEME.md) | [Sorular](paquet-08/SORULAR.md) | [İndir](arsivler/deyimler-fr-paket-08.zip) |
| 09 | Başarı ve güçlükler | [Kartlar](paquet-09/INCELEME.md) | [Sorular](paquet-09/SORULAR.md) | [İndir](arsivler/deyimler-fr-paket-09.zip) |
| 10 | Anlama, sezgi ve yanılgı | [Kartlar](paquet-10/INCELEME.md) | [Sorular](paquet-10/SORULAR.md) | [İndir](arsivler/deyimler-fr-paket-10.zip) |

Her paketin asıl verisi kendi `fr-idioms-XXXX.json` dosyasıdır. İlk paketin eski dosya yolları ve 26 kimliği korundu; yeni kimlikler `fr-idiom-000027`–`fr-idiom-000260` aralığındadır. İlk paketin kendi kontrolü [DOGRULAMA-PAKET-01.json](DOGRULAMA-PAKET-01.json), önceki teslim notu [PAKET-01.md](PAKET-01.md) dosyasındadır.

## Kaynak ve kalite durumu

259 kaydın dayandığı sözlük maddesi açıldı. `fr-idiom-000117` için Le Robert tanımı arama sonucunda okundu; doğrudan sayfa erişimi 403 döndürdüğü için bu kayıt **madde açılmış gibi işaretlenmedi**. Ayrıntı [paket 05 kaynaklarında](paquet-05/KAYNAKLAR.md).

Kaynaklar yalnız sözlük anlamı içindir. Tanımlar, sözlük örnekleri, ses ve görseller kopyalanmadı. Anlamlar, kullanım açıklamaları, örnekler, çeviriler ve sorular özgün yazıldı.

Bağımsız dil ve soru denetimi bekliyor; üreticinin kendi kontrolü bunun yerine geçmez. Tam görevdeki CEFR dağılımı hâlâ doğrulanmadığından düzeyler `null` bırakıldı. Paketler uygulamaya bağlanmadı. Yerleşik söyleyişler ve bazı kalıplaşmış ifadeler de bulunur; daha dar bir deyim tanımı isteniyorsa sınırdaki kayıtlar [denetim notlarında](DENETIM-NOTLARI.md) işaretli.

Mevcut derslerle örtüşen kalıplar [toplu tarama raporunda](MEVCUT-ICERIK-TARAMASI-TUMU.md). Bu 260 kaydın tamamı sitede ilk kez görülecek ifadeler olarak sayılmamalı. [İlk dar tarama](MEVCUT-ICERIK-TARAMASI.md) tarihsel referans olarak korundu; iki taramanın yöntemleri farklıdır.

## Yeniden üretim

```sh
python3 docs/icerik-hazirlik/deyimler-fr/validate.py
python3 docs/icerik-hazirlik/deyimler-fr/render.py
```

İlk komut 10 paketi birlikte kontrol eder; ikincisi Markdown dosyalarını, mevcut içerik taramasını, paket dizinini ve 11 ZIP'i üretir. [SHA-256 listesi](arsivler/SHA256SUMS.txt) arşivleri doğrulamak içindir. Bağımsız inceleme tamamlandığında doğrulayıcının ilk teslim durumunu bekleyen koşulları da güncellenmeli.
