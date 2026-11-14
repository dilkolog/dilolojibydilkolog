# Fransızca deyimler — 500 kayıtlık uygulama taslağı

Uygulama verisi artık **500 kayıt**: değiştirilmemiş 16 çekirdek + önceki editoryal setten 224 aktarım + 260 yeni deyim. Ham kayıtlar `content/raw/idioms/fr-NNNN.json`; çıktı `src/data/idioms/fr.json` yalnız fabrika ile üretildi. Yeni kayıtlarda anlamlar, kelimesi kelimesine çeviriler ve örnekler özgündür.

## Önceki denetimin korunması

Antigravity'nin `content/review/idioms/fr-*.md` dosyaları değiştirilmedi. 33 sorunlu + 30 şüpheli kayda ilişkin **63 karar**, ana dizindeki `DENETIM-DUZELTMELERI.{json,md}` içinde durur. 33 sorunludan 20 çıkarılmış, 13 düzeltilmiş; 30 şüpheliden 27 korunmuş, 3 çıkarılmıştır. İlk 260 editoryal kimlikten 23 emekli; **237 tarihsel aktif kayıt**, 474 örnek ve 237 bağlam sorusu aynı kimlik/cevaplarla korunur. İlk raporda temiz sayılan 197 kaydın tarihsel öğretim içeriği yeniden yazılmadı.

Bu 237 kaydın 13'ü, fiilsiz/atasözü/saydam veya o örnekte yalnız gerçek anlamı öğreten yapılar oldukları için uygulama paketi aktarımına alınmadı. Bunlar tarihsel setten silinmedi ve yeni deyimlere kimlikleri verilmedi. Diğer 224 kayıtta `editorialId` asıl editoryal kayda bağlantıdır; uygulama derleyicisi bunu paket dışı bırakır.

| Uygulamaya alınmayan tarihsel kimlik | İfade |
|---|---|
| fr-idiom-000113 | revenir sur ses pas |
| fr-idiom-000189 | en un clin d'œil |
| fr-idiom-000190 | en un tour de main |
| fr-idiom-000191 | à la dernière minute |
| fr-idiom-000192 | à la Saint-Glinglin |
| fr-idiom-000194 | quand les poules auront des dents |
| fr-idiom-000195 | tous les trente-six du mois |
| fr-idiom-000196 | une fois n'est pas coutume |
| fr-idiom-000197 | au fil de l'eau |
| fr-idiom-000198 | au jour le jour |
| fr-idiom-000201 | sur le pouce |
| fr-idiom-000202 | entre chien et loup |
| fr-idiom-000204 | à pas de loup |

## Kaynaklar ve derleyici

484 çekirdek dışı kaydın tamamına seçilmiş gerçek kullanım tanığı eklendi (`sourceChecks.selectedUsageWitness`). Tanıklar derlem örnekleri, tarihli atıflı alıntılar veya yayımlanmış metinlerdir; `src` sözlük kaynaklarını korur. Her kullanım tanığının yayıncısından farklı en az bir sözlük kaynağı vardır. Erişim yöntemi, tarih, ifade ve metin içi konum kaydedildi: 324 sayfa açılarak, 160 arama özeti üzerinden doğrulandı. Arama özeti tam sayfa erişimi olarak sunulmaz. Sıklık ölçümü yapılmadı; kaynak kaydı bağımsız anlam/örnek incelemesinin yerine geçmez.

Académie française'ın gerçek dokuzuncu baskı madde adresleri sözcük yerine numaralı kimlik taşıdığından derleyicide dar bir destek eklendi: yalnız HTTPS, resmî alan adı, `A9` madde biçimi, tarihli doğrulama ve deyime ilişkin açık madde konumu varsa kabul edilir. Bu bir kaynak okuma kanıtı değildir; URL ön kontrolünün gerçek kaynakları reddetmesini giderir. Fransızca tekil URL başlığı/çoğul deyim karşılaştırması da eklendi. Sahte URL sorgu parametresi üretilmedi.

## Doğrulama ve inceleme sınırı

- Fabrika geçici çıktı dizinine çalıştırılıp yalnız Fransızca çıktı kopyalandı; ES/EN çıktılarına yazılmadı.
- `npx vitest run scripts/build-idioms.test.mjs src/data/idioms.test.ts`: 14/14 test.
- Tarihsel editoryal `validate.py` ve 7 Python testi geçti.
- Çekirdek 0000, İspanyolca dosyaları ve denetçi raporları korunur.

**Bu paket taslaktır.** Önceki 63 düzeltmenin tekrar denetimi ve yeni/aktarılmış uygulama kayıtlarının Antigravity incelemesi, ardından sahibinin örneklemi bekler. CEFR atamaları editoryaldir. Sahibinin 2026-11-14 kararıyla 500 yaygın deyim korunur; temaların eşit olması gerekmiyor. Aşağıdaki dağılım bu tercihi yansıtır; CEFR seviyeleri editoryaldir. 500 sayısına ulaşılması bağımsız dil denetiminin tamamlandığı anlamına gelmez.

## Gerçek dağılım

| Seviye | Kayıt |
|---|---:|
| B1 | 44 |
| B2 | 279 |
| C1 | 177 |

| Tema | Kayıt |
|---|---:|
| body | 138 |
| animals | 41 |
| food | 31 |
| money | 22 |
| work | 22 |
| feelings | 19 |
| talk | 32 |
| mind | 26 |
| people | 43 |
| trouble | 28 |
| time | 6 |
| nature | 38 |
| luck | 8 |
| ease | 1 |
| decide | 32 |
| move | 13 |

Seçilmiş kullanım tanıkları: 324 `usage_page_opened`, 160 `usage_search_excerpt` (toplam 484). Tarihsel ek kanıtlar ayrıca korunur.

Yeniden üretim: `node scripts/build-idioms.mjs` bütün dillerin çıktılarını yazar; yalnız kendi dilini teslim eden ajan geçici `out` dizini kullanıp kendi dilinin dosyasını kopyalamalıdır.
