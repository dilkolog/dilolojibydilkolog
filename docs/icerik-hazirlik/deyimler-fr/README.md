# Fransızca deyimler — Antigravity sonrası düzeltme

**237 aktif deyim · 474 özgün örnek/çeviri · 237 bağlam sorusu · 10 editoryal paket.** İlk 260 kimlikten 23’ü gerekçeleriyle emekliye ayrıldı; kalan kimlikler yeniden numaralanmadı.

[63 düzeltme kararı](DENETIM-DUZELTMELERI.md) · [Makinece okunabilir kararlar](DENETIM-DUZELTMELERI.json) · [Çıkarılanlar](RETIRED.json) · [Toplu ZIP](arsivler/deyimler-fr-10-paket.zip) · [Devir](CLAUDE-DEVIR.md) · [Dizin](PAKET-DIZINI.json) · [Yapı kontrolü](DOGRULAMA.json)

| Paket | Tema | Aktif | Kartlar | Sorular | ZIP |
|---|---|---:|---|---|---|
| 01 | İlk karma paket | 14 | [Kartlar](INCELEME.md) | [Sorular](SORULAR.md) | [ZIP](arsivler/deyimler-fr-paket-01.zip) |
| 02 | Duygular ve tepkiler | 24 | [Kartlar](paquet-02/INCELEME.md) | [Sorular](paquet-02/SORULAR.md) | [ZIP](arsivler/deyimler-fr-paket-02.zip) |
| 03 | Konuşma ve iletişim | 26 | [Kartlar](paquet-03/INCELEME.md) | [Sorular](paquet-03/SORULAR.md) | [ZIP](arsivler/deyimler-fr-paket-03.zip) |
| 04 | Çalışma ve çaba | 25 | [Kartlar](paquet-04/INCELEME.md) | [Sorular](paquet-04/SORULAR.md) | [ZIP](arsivler/deyimler-fr-paket-04.zip) |
| 05 | Karar, risk ve tedbir | 26 | [Kartlar](paquet-05/INCELEME.md) | [Sorular](paquet-05/SORULAR.md) | [ZIP](arsivler/deyimler-fr-paket-05.zip) |
| 06 | İlişkiler ve dayanışma | 26 | [Kartlar](paquet-06/INCELEME.md) | [Sorular](paquet-06/SORULAR.md) | [ZIP](arsivler/deyimler-fr-paket-06.zip) |
| 07 | Para ve kaynaklar | 24 | [Kartlar](paquet-07/INCELEME.md) | [Sorular](paquet-07/SORULAR.md) | [ZIP](arsivler/deyimler-fr-paket-07.zip) |
| 08 | Zaman ve gündelik ritim | 21 | [Kartlar](paquet-08/INCELEME.md) | [Sorular](paquet-08/SORULAR.md) | [ZIP](arsivler/deyimler-fr-paket-08.zip) |
| 09 | Başarı ve güçlükler | 26 | [Kartlar](paquet-09/INCELEME.md) | [Sorular](paquet-09/SORULAR.md) | [ZIP](arsivler/deyimler-fr-paket-09.zip) |
| 10 | Anlama, sezgi ve yanılgı | 25 | [Kartlar](paquet-10/INCELEME.md) | [Sorular](paquet-10/SORULAR.md) | [ZIP](arsivler/deyimler-fr-paket-10.zip) |

## Denetim sonucu

Antigravity’nin `content/review/idioms/fr-*.md` raporları girdi alındı; raporlar değiştirilmedi. 33 sorunlu kaydın 20’si çıkarıldı, 13’ü gerçek kayıt ve ek kaynakla düzeltilip korundu. 30 şüpheli kaydın tamamı ikinci bağımsız kaynakla karşılaştırıldı; 27’si korundu, 3’ü kapsam dışında bırakıldı. Rapor gerekçelerindeki 22 ifade-kimlik uyuşmazlığı karar listesinde açıkça gösterildi.

Çıkarılanlar: 14 çekirdek tekrar/varyantı, 3 saydam ifade, 4 fiilsiz zarf/sıradan sıfat yapısı, yeterli güncel bağımsız kullanım doğrulanamayan 2 kayıt. Çekirdek `content/raw/idioms/fr-0000.json` korunmuştur. İlk paketin tarihsel teslimi [PAKET-01.md](PAKET-01.md) dosyasındadır; güncel sayımlar bu dizindedir.

26 örnek ve çevirisi düzeltildi; soru bağlamları eşitlendi. 13/24/25 numaralı kayıtlarda kişi yer tutucusu `pattern` alanına taşındı. Anlam ve örnekler özgündür; sözlük veya gazete metinleri kopyalanmadı.

## Kaynak ve hazırlık durumu

Kaynakların kendi kontrol tarihleri ve erişim yöntemleri JSON ile kaynak tablolarında ayrı gösterilir. Arama özetinden okunan kullanım, tam sayfa açılmış gibi sunulmaz. 117 numaralı kayıtta Le Robert’ın 403 notu korunurken iki erişilebilir ek kaynak kaydedildi.

Antigravity’nin temiz saydığı 197 kaydın öğretim içeriği korunmuştur. Düzeltilenlerin tekrar denetimi, bütün setin ikinci kaynak kapsamı, CEFR ataması, 31’lik tema düzeni ve uygulama şemasına geçiş bekler. Bu set hâlâ editoryal hazırlıktır; uygulamaya yayımlanmadı. İspanyolca deyimler Antigravity’dedir; İngilizce Codex’in sıradaki dilidir.

## Yeniden üretim

```sh
python3 docs/icerik-hazirlik/deyimler-fr/validate.py
python3 -m unittest discover -s docs/icerik-hazirlik/deyimler-fr -p 'test_*.py'
python3 docs/icerik-hazirlik/deyimler-fr/render.py
```

[SHA-256 listesi](arsivler/SHA256SUMS.txt) 11 ZIP’in bütünlüğünü doğrular. Kaynak JSON, Markdown ve arşiv aynı sayımları taşır; çıkarılan kimliğin sessizce geri gelmesi veya bir kimliğin kayıtsız kaybolması doğrulamada reddedilir.
