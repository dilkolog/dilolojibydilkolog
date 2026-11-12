# Fransızca ilk adım serisi

25 özgün metin: `fr-r-000006`–`fr-r-000030`. Başlıklardaki 01–25 ve `firstStep.position` okuma sırasını belirtir. Hedef kitle Türkçe konuşan yetişkinlerdir. Her metinde iki Türkçe karşılıklı paragraf ve ana fikir, ayrıntı, çıkarım amaçlı üç soru vardır. Yalnız şimdiki zaman kullanılır. Être/avoir ile başlayan seri, mevcut plandaki A1 iyelik, olumsuzluk, soru ve présent konularını uygular.

## Tekrar ve sözcük sınırı

İzinli temel küme, `src/data/frequency/fr.txt` ilk 300 satırı ile `src/data/starterLists/fr.json` içindeki **w** alanlarıdır; örnek cümleler kümeye katılmaz. Çekim verisi ve sözlük biçimleri, açık düzenli çoğul/cinsiyet dönüşümleri tanınır. Özel adlar da liste dışı sözcüktür ve hedeflerde gösterilir. Paris, Bruxelles, Montréal, Dakar, Lyon, Liège ve Lausanne böyle listelenmiştir.

Hedef sözcüklerin metinde ilk görülüşü izlenir. Yeni hedef sonraki iki metnin her birinde yeniden geçer; yalnız kelime kartında görünmesi yetmez. Son iki metin yeni hedef getirmez. Temel listedeki her ilk kullanım yeni hedef kabul edilmez: liste, öğrencinin başlangıçta bildiği varsayılan kümedir. Bu varsayım gerçek kullanıcı kelime bilgisiyle aynı değildir.

`fr-audit.md` metin başına kelime sayısını, CEFR uyumunu ve hedefleri; JSON karşılığı konu kullanım sayılarını ve liste dışındaki sözcükleri verir. Son denetimde 25/25 kabul, bütün metinlerde %100 CEFR uyumu ve sıfır uyarı vardır. CEFR yüzdesi hedefler/özel adlar hariçtir; ilk 300 denetimi bunları muaf tutmaz.

## Fabrikanın retleri ve düzeltmeler

İlk denetimde 24 metin reddedildi; değişmeden saklanan `fr-initial-check.json` öğe ve gerekçeleri gösterir. Başlıca nedenler ilk 300/başlangıç dışında kalan sac, tasse, verre, assiette, repas gibi sözcükler ve erken görünen eau/café/travail/cours hedeflerinin sonraki iki metinde eksik olmasıydı. Bunlar sadeleştirme ve tekrar eklemeyle düzeltildi. Fransızca kesmeli biçimlerin j/n parçalarının kelime sanılması da denetleyicide düzeltildi; `j’ai`, `l’eau` gibi biçimler bileşenlerine göre değerlendirilir.

Sonraki turlarda altı metinde kalan liste dışı kelimeler, bir olumsuzluk hedefinin tek kullanımı, yinelenen bir soru şıkkı ve rötuş sırasında 13. metne erken giren rue hedefi yakalandı. Kelimeler izinli seçeneklerle değiştirildi, olumsuzluk iki kullanıma çıkarıldı, şık yenilendi ve rue erken metinden çıkarıldı. Son rapor `content/reports/fr-reading-0003.json` içindedir.

## Yeniden üretme

```sh
npm run content -- check fr-reading-0003
npm run content -- first-steps fr-reading-0003
npm run content -- sample fr-reading-0003
npm run content -- build fr
```

İş oluşturucu hücre başına üç metin ayırdığı için yeni, henüz başka işe paylaşılmamış 6–30 aralığı bu tek seri için 25'e genişletildi; temalar metin düzeyindedir. Genel A1 kuralları gevşetilmedi: yalnız `firstStep` işaretli A1 metinleri 40–80 kelime ve en çok dört hedef istisnasını kullanır. Sıra denetimi yayın derlemesinde de çalışır.

Otomatik denetimler anlamın ve Türkçenin insan tarafından onaylandığı anlamına gelmez. Metinleri, çevirileri ve cevap gerekçelerini yazan Codex ayrıca okuyarak düzeltti; bağımsız insan/Claude incelemesi yapılmış diye işaretlenmedi. Fabrikanın örneklem dosyası inceleme için bırakıldı.
