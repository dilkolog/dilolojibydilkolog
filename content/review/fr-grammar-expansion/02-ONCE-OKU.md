# Fransızca dilbilgisi genişletmesi — 2/3

Bu PR üç yeni A1 konusuna 150 soru ekler; fabrikadaki toplam 220'den 370'e çıkar. Mevcut sorular değiştirilmez.

| Konu | İş | Yeni soru | Alt beceri | Choice / cloze / error | Son çözücü |
|---|---|---:|---:|---|---|
| Kişi ve vurgulu zamirler | fr-grammar-0006 | 50 | 5 × 10 | 25 / 18 / 7 | 50/50, 0 uyuşmazlık |
| İyelik ve işaret sıfatları | fr-grammar-0007 | 50 | 5 × 10 | 25 / 18 / 7 | 50/50, 0 uyuşmazlık |
| Sayılar, saat, tarih | fr-grammar-0008 | 50 | 5 × 10 | 25 / 18 / 7 | 50/50, 0 uyuşmazlık |

## Çözücü ve retler

Yazardan ayrı ikinci ajan, her soruyu answer/fix/alternatives/explanation alanları olmadan çözdü. 150 id'nin tümü kapsandı; id tekrarı/atlama yok. Hata sorularında bulduğu düzeltmeler de yazarın fix alanlarıyla tek tek karşılaştırıldı. İlk sonuçlar `initial/` altında değişmeden saklanır; son dosyalar `content/review/<iş>.solver.json` içindedir.

İlk turda iki belirsizlik bulundu:

- **fr-g-000312:** après-midi eril veya dişil kullanılabilir; cet ve cette ikisi de doğruydu. Tartışmasız eril été ile değiştirildi. Rehber'in cet après-midi örneği, öteki cinsiyet kullanımını yanlış saymak için kullanılmadı.
- **fr-g-000356:** 00.00 için minuit yanında resmî okumada zéro heure(s) mümkündü. Görev, günlük dilde tek sözcük olarak daraltıldı.

Bu iki kayıt ayrı anahtarsız turda yeniden çözüldü; artık üç partide de uyuşmazlık ve ret **sıfır**. Fabrika da 50/50 kabul, sıfır uyarı verir. Tartışmalı sorular %5 toleransı gerekçe gösterilerek bırakılmadı.

## Kural dayanağı ve sınırlar

Kaynak, `src/data/guide/lessons-fr-2.ts` içindeki bu üç dersin kural ve tablolarıdır. Bunlar fiil çekimi değil zamir/iyelik çekim tabloları ve sayı-saat kuruluş kurallarıdır; fiil tablosuyla doğrulanmış gibi gösterilmedi. Sayılarda Fransa standardı ve geleneksel yazım belirtilir; bölgesel septante/nonante seçenekleri yanlış diye sunulmaz. Saatlerde resmî/günlük dil ayrımı, iyelikte kime ait olduğu ve zamirlerde hangi kişinin kastedildiği görevde açıkça verilir.

Emin olunamayan iki kullanım (après-midi cinsiyeti, 00.00 okuması) yukarıda açıklandı ve belirsiz bağlamlar çıkarıldı. Son sorularda açıkta kural belirsizliği yok. Türkçe açıklamalar 1–2 cümledir; sorular özgündür. İnsan/anadili incelemesi yapılmış sayılmaz; fabrika örneklemleri hazırdır.

## Doğrulama

`npm run content -- check <iş>` üç iş için; `sample <iş>`; `build fr`. Son raporlar `content/reports/`, soru bazında Rehber dayanakları ve tam çözücü kapsaması bu klasördeki `*.audit.json` dosyalarındadır. Araç/istemci/yayın veri testleri: 28 test geçti. Uygulama kodu değişmez; CI yeşilse birleştirilir.
