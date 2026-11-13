# Fransızca dilbilgisi genişletmesi — 3/3

Bu son PR, A1 soru kurma ile ilk iki A2 konusu sıfatlar ve passé composé için 150 yeni soru ekler. Toplam 370'ten **520**'ye çıkar; dizinin tamamında **450 yeni** soru vardır.

| Konu | İş | Yeni soru | Alt beceri | Choice / cloze / error | Son çözücü |
|---|---|---:|---:|---|---|
| Soru sözcükleri ve soru kurma | fr-grammar-0009 | 50 | 5 × 10 | 25 / 18 / 7 | 50/50, 0 uyuşmazlık |
| Sıfatlar: uyum ve yer | fr-grammar-0010 | 50 | 5 × 10 | 25 / 18 / 7 | 50/50, 0 uyuşmazlık |
| Passé composé | fr-grammar-0011 | 50 | 5 × 10 | 25 / 18 / 7 | 50/50, 0 uyuşmazlık |

## Bağımsız çözüm ve retler

Yazar olmayan üçüncü ajan, answer/fix/alternatives/explanation alanları çıkarılan soruları çözdü. Her işte 50 farklı id; kayıp ve tekrar yok. İlk solver dosyaları `initial/`, son sonuçlar `content/review/<iş>.solver.json` içindedir. Hata sorularında not ettiği düzeltmeler yazarın fix alanlarıyla ayrıca karşılaştırıldı.

İlk turda **fr-g-000419 ve fr-g-000420** tartışmalı bulundu: combien des… belirli bir kümeden seçim anlamında de + les olarak okunabilir. Bu yüzden des zorunlu yanlış sayılmadı. Yanlış sözcük du yapıldı; ardından çoğul billets/chambres geldiği için bu biçim açıkça uyumsuzdur. İki kayıt yeniden anahtarsız çözüldü ve du → de düzeltmesi tek cevap olarak doğrulandı.

## Çekim tablosuyla ek kontrol

50 passé composé sorusunun tamamında doğru cevapla doldurulmuş cümle, mevcut `textForms`/`analyzeCompound` çekim çözümlemesinde passé composé olarak tanındı. Soru bazında fiil, zaman ve birleşik biçim `fr-grammar-0011.audit.json` içindedir. Yardımcı fiil, ortaç, kişi ve cinsiyet uyumu bağımsız çözücü tarafından da incelendi.

Bu ek doğrulama iki araç sınırını ortaya çıkardı:

- Descendre/sortir gibi iki yardımcı fiille farklı kullanımları olan fiillerde motorun tek varsayılanı, dilbilgisel olarak doğru être örneğini tanımayabiliyor. **000497** arriver, **000500** revenir ile değiştirildi; Fransızcada ilk biçimlerin yanlış olduğu iddia edilmedi.
- **000503, 000505, 000508** kayıtlarında öznenin cinsiyetini anlatan parantez, nous…nous / vous…vous arasına girince çözümleyici dönüşlü yapıyı kaçırıyordu. Bilgi ipucuna taşındı; fiil, kişi ve hedef anlam aynı kaldı.

Bu beş yeni görünüm de anahtar verilmeden tekrar çözüldü. Son durumda solver 50/50 ve sıfır uyuşmazlık; fabrika 50/50 kabul ve sıfır uyarı. Motorun bu sınırları uygulama kodunu değiştirmeden, doğrulanabilir örneklerle yönetildi. Gelecekte iki yardımcı fiilli içerik üretiminde bu sınıra dikkat edilmeli.

## Dayanak ve doğrulama

Soru kurma: `src/data/guide/lessons-fr-2.ts` basics_fr_questions. Sıfat ve passé composé: `src/data/guide/lessons-fr.ts` basics_fr_adjectifs / basics_fr_passe_compose. Dönüşlülerde COD/COI istisnalarını karıştıran karmaşık örnekler kullanılmadı; doğrudan dönüşlü temel kullanımlar seçildi. Soru hedefi açık; metindeki fiil/sıfat kökü ve zaman ipucu rastgele eş anlamlı cevap gerektirmez.

`check` ve `sample` üç iş için, `build fr` ve 28 araç/istemci/yayın veri testi geçti. İnsan/anadili örneklemi yapılmış diye işaretlenmedi; 10'ar soruluk örneklemler hazır. İlk PR'daki eski kayıt farkı E2E not beklentisi düzeltmesi bu dala da alınır. CI yeşilse önceki PR'lardan sonra birleştirilir.
