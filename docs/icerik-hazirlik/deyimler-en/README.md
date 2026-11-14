# İngilizce deyimler — 500 kayıtlık uygulama taslağı

**500 kayıt**: değiştirilmemiş 16 çekirdek + 484 yeni deyim. `content/raw/idioms/en-0001.json`…`en-0016.json` temalı ham partilerdir. `src/data/idioms/en.json` fabrika ile üretilir. Anlam, kelimesi kelimesine çeviri ve örnek cümleler özgündür; kaynak örnekleri kopyalanmadı.

484 çekirdek dışı kaydın tamamına seçilmiş gerçek kullanım tanığı eklendi (`sourceChecks.selectedUsageWitness`). Tanıklar derlem örnekleri, tarihli atıflı alıntılar veya yayımlanmış metinlerdir; `src` sözlük kaynaklarını korur. Her kullanım tanığının yayıncısından farklı en az bir sözlük kaynağı vardır. Erişim yöntemi, tarih, ifade ve metin içi konum kaydedildi: 372 sayfa açılarak, 112 arama özeti üzerinden doğrulandı. Arama özeti tam sayfa erişimi olarak sunulmaz. Sıklık ölçümü yapılmadı; kaynak kaydı bağımsız anlam/örnek incelemesinin yerine geçmez.

## Seçim düzeltmeleri

- Eskimiş etiketi görülen adayların yerine güncel maddeler seçildi; örneğin `have ants in one's pants` yerine `have a frog in one's throat`.
- Aynı deyimin UK/US varyantları ayrı kayıtla sayılmadı; örneğin spanner/wrench, flog/beat a dead horse. Çekirdek tekrarları çıkarıldı.
- `put one's heads together` yerine `put heads together`, kalıp olarak `put your heads together` kullanıldı.
- `keep the wheels turning` kaynak belirsizliği nedeniyle `keep the ball rolling` ile değiştirildi.
- `get to the point` konuşmada asıl konuya geçme anlamıyla; `ride one's luck` şansı yaver giderek güçlüğü atlatma anlamıyla doğrulandı. Farklı anlamdaki yakın sayfalar kullanılmadı.
- `march to a different drummer` için eşdeğer deyim ailesi kaydı kullanıldı; tanıtım/reklam anlamındaki `beat the drum` kaynağı reddedildi.
- `bring up to speed`, `paint oneself into a corner`, `be between a rock and a hard place` ve `be as regular as clockwork` kaynakları doğrudan doğru anlamı gösteren maddelerle eşlendi.

## Doğrulama ve inceleme sınırı

- Derleyici geçici çıktı dizinine çalıştırıldı; yalnız EN çıktısı kopyalandı. FR/ES dosyalarına yazılmadı.
- `npx vitest run scripts/build-idioms.test.mjs src/data/idioms.test.ts`: 13/13 test.
- Çekirdek 0000 değişmedi; 484 yeni kayıtta en az iki farklı yayıncı adresi var.

**Paket taslaktır; Antigravity'nin bağımsız incelemesi ve sahibinin örneklemi bekler.** CEFR seviyeleri editoryal; resmî sıklık/CEFR sertifikası değildir. Sahibinin 2026-11-14 kararıyla 500 yaygın deyim korunur; temaların eşit olması gerekmiyor. Güncel kullanım ve bütün anlam/örnek eşleşmeleri inceleme sırasında tekrar kontrol edilmelidir; 500 sayısı inceleme tamamlandı demek değildir.

## Gerçek dağılım

| Seviye | Kayıt |
|---|---:|
| B1 | 36 |
| B2 | 244 |
| C1 | 220 |

| Tema | Kayıt |
|---|---:|
| body | 89 |
| animals | 39 |
| food | 38 |
| money | 29 |
| work | 25 |
| feelings | 24 |
| talk | 20 |
| mind | 20 |
| people | 25 |
| trouble | 12 |
| time | 23 |
| nature | 59 |
| luck | 27 |
| ease | 23 |
| decide | 24 |
| move | 23 |

Seçilmiş kullanım tanıkları: 372 `usage_page_opened`, 112 `usage_search_excerpt` (toplam 484). Tarihsel ek kanıtlar ayrıca korunur.

Yeniden üretim: `node scripts/build-idioms.mjs` bütün dillerin çıktılarını yazar; yalnız kendi dilini teslim eden ajan geçici `out` dizini kullanıp kendi dilinin dosyasını kopyalamalıdır.
