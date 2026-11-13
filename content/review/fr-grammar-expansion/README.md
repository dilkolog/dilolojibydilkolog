# Fransızca dilbilgisi — 450 yeni soru raporu

Başlangıç: **70 soru / 2 konu**. Sonuç: **520 soru / 11 konu**. Fransızca toplamı İspanyolcanın 520 soruluk fabrika toplamına ulaşır. Mevcut 70 soru değiştirilmedi; yeni kimlikler fr-g-000071–fr-g-000520.

Plan sırası korundu: A1'de zaten 50 sorusu olan présent atlandı, diğer yedi konu tamamlandı; sonra A2'nin ilk iki konusu dolduruldu. Bu hedef içinde B1'e sıra gelmez. Son dağılım A1 **400**, A2 **120** sorudur; A2'deki eski passé composé/imparfait 20 soru bu toplamda korunur.

| Sıra | Seviye | Konu | Yeni soru | İlk çözücüde belirsiz | Son çözücüde ret |
|---|---|---|---:|---:|---:|
| 1 | A1 | Artikeller | 50 | 2 | 0 |
| 2 | A1 | Être ve avoir | 50 | 1 | 0 |
| 3 | A1 | Olumsuzluk | 50 | 0 | 0 |
| 4 | A1 | Kişi ve vurgulu zamirler | 50 | 0 | 0 |
| 5 | A1 | İyelik ve işaret sıfatları | 50 | 1 | 0 |
| 6 | A1 | Sayılar, saat ve tarih | 50 | 1 | 0 |
| 7 | A1 | Soru kurma | 50 | 2 | 0 |
| 8 | A2 | Sıfatlar | 50 | 0 | 0 |
| 9 | A2 | Passé composé | 50 | 0 | 0 |
| **Toplam** | | | **450** | **7** | **0** |

Her konuda beş alt beceriye 10'ar soru; 25 choice, 18 cloze, 7 error vardır. Yeni içerikte toplam 225 choice, 162 cloze, 63 error bulunur. Her soru özgündür; başka bir kaynaktan kopyalanmadı.

## Çözücü yöntemi

Üç ayrı, yazarı olmayan ajan oturumu 150'şer soruyu cevap anahtarı, fix, alternatives ve explanation olmadan çözdü. Bütün id'ler kapsandı; tekrar/eksik sonuç yok. Hata sorularındaki doğru düzeltmeler de karşılaştırıldı. İlk yedi belirsiz soru düzeltilip yeniden çözüldü; %5 toleransı kullanılarak şüpheli kayıt bırakılmadı. İlk ham çözümler `initial/`, son çözümler üst klasördeki `fr-grammar-0003.solver.json`–`0011.solver.json` dosyalarında.

## Emin olunamayanlar ve araç sınırları

- Professeur cinsiyeti ve rendez-vous sayısı belirsiz bağlamda tek cevap vermiyor; örnekler değiştirildi.
- Fatiguer geçişsiz kullanılabildiğinden a fatigué ifadesini zorunlu yanlış sayan bağlam çıkarıldı.
- Après-midi iki cinsiyetle; 00.00 ise farklı günlük/resmî okumalarla kullanılabilir. Yeni sorular bu belirsizlikleri taşımıyor.
- Combien des… belirli bir kümeden seçim yorumu taşıyabilir. Hata sorularında tartışmasız uyumsuzluk kullanıldı.
- Çekim çözümleyicisi çift yardımcı fiilli descendre/sortir kullanımında ve zamirlerin arasına giren cinsiyet parantezlerinde sınırlıydı. İki fiil örneği değiştirildi, üç parantez ipucuna taşındı; beşi de tekrar anahtarsız çözüldü.

Bu konuların ayrıntıları 01/02/03-ONCE-OKU.md içinde. Yayında bırakılmış, çözücünün hâlâ reddettiği ya da emin olamadığı kayıt yok. Fiil cevaplarından 50 être/avoir ve 50 passé composé mevcut çekim verisiyle ayrıca doğrulandı. Artikel, zamir, sayı ve sıfat cevapları fiil çekimi değildir; onların dayanağı ilgili Rehber kural/uyum tablolarıdır.

## Denetim çıktıları

- Her partide otomatik kontrol: **50/50 kabul, sıfır uyarı**.
- Her partide son bağımsız çözüm: **50/50, sıfır uyuşmazlık**.
- `*.audit.json`: her sorunun Rehber dayanağı; fiil sorularında motorun doğruladığı hücre/birleşik biçim.
- `content/reports/fr-grammar-0003.json`–`0011.json`: fabrika sonuçları.
- `content/review/fr-grammar-0003.md`–`0011.md`: 10'ar soruluk örneklemler.
- İnsan/anadili incelemesi yapılmış diye işaretlenmedi. Kullanıcının CI yeşilse birleştirme talimatı uygulanır.

Yeniden denetim: her iş için `npm run content -- check <iş>`, `sample <iş>`; yayın üretimi `npm run content -- build fr`.
