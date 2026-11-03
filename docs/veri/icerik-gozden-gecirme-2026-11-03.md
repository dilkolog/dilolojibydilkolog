# B2–C1 içerik turu: ana dil gözden geçirme listesi (2026-11-03)

Bu turun içeriği özgün yazıldı, **ana dilini konuşan biri tarafından okunmadı**. Aşağıda ne eklendiği, hangi dosyada durduğu ve gözden geçirirken nelere bakılacağı var. Hatalı bir şey bulunursa dosyada düzeltmek yeter (hepsi JSON, ilgili veri testleri biçimi ve tek doğru cevabı denetler). Her dosyadan sonra `rm -rf node_modules/.vitest-cache && npx vitest run src/data` koşulur.

| Alan | Dosya | Dil başına | Nelere bak |
|---|---|---|---|
| Hazır başlangıç listeleri (12 B2–C1 tema) | `src/data/starterLists/{fr,es,en}.json` (listenin sonundaki temalar) | 12 tema × 15 kelime | Türkçe anlam doğru mu, örnek cümle doğal mı, FR/ES isimlerde artikel ve cinsiyet |
| Cümle dönüşümü (C1) | `src/data/grammar/{fr,es,en}-18.json` (`rewrite_*`) | 30 | İkinci cümle birincisiyle aynı anlamı veriyor mu, `answer`/`alternatives` dışında başka doğru biçim var mı |
| Metin akışı (C1) | `src/data/flow/{fr,es,en}-7.json` | 6 paragraf | Her boşlukta tek bağlaç uyuyor mu, yanlış seçenekler gerçekten yanlış mı |
| Sınav okuma/dinleme (C1) | `src/data/examReading/{fr,es,en}.json` (`*-attention-c1`, `*-langues-c1`, `*-surtourisme-c1` ve eşleri) | 3 metin | Sorulardaki tek doğru şık, metnin doğal olması |
| Sınav yazma görevleri (C1) | `src/data/examTasks/{fr,es,en}.json` (`*-synthese*`, `*-compte-rendu*`, `*-rapport*`) | 3 görev | Kalıpların (phrases) doğallığı, kelime aralığı |
| C1 diyaloglar | `src/data/dialogues/{fr,es,en}-5.json` | 3 diyalog | "Doğru" cevabın gerçekten tek uygun cevap olması; yanlışların üslup bakımından kötü olması |
| Eşdizim (B2–C1) | `src/data/collocations/{fr,es,en}-6.json` | FR 24, ES 25, EN 25 | Kalıbın gerçekten kullanıldığı biçimde yazılması, örnek cümle |
| Kayıt farkı | `src/data/register/{fr,es,en}-8.json` | 8 | Günlük / standart / resmî üç söyleyişin gerçekten farklı kayıtta olması |
| Rehber dersleri | `src/data/guide/lessons-{fr,es,en}-7.ts` | 1 ders | Kuralların doğruluğu (özellikle FR `après que` + indicatif, ES `deber de`, EN `in case`/`unless`) |
| Rehber sınav havuzu | `src/data/guide/checks/fr-7.json`, `es-6.json`, `en-7.json` | 12 soru | Tek doğru cevap, "doğru" şıkkın bağlama göre ikinci bir seçenekle çakışmaması |
| Rehber dilbilgisi soruları | `src/data/grammar/{fr,es,en}-19.json` | 12 | Boşluk cevabının tek olması (`alternatives` yeterli mi) |
| Özgün okuma metinleri | `src/data/advancedReadings/{fr,es,en}.json` | 5 metin | Doğal akış, seviye (B2 / C1), Türkçe özetin doğruluğu |
| İspanyolca B2/C1 seviye tahmini | `src/data/cefr/es.txt` (satır başına seviye, B2 ve C1 bölümlerinin sonları) | ~2.970 kelime | Açıkça yanlış seviye ya da kaçmış kaba/özel ad/alıntı; yöntem `src/data/cefr/SOURCE.md` |

## Özellikle risk taşıyanlar
- **Tek doğru cevap.** Seçenekli sorularda ("hangisi doğru") bağlama göre ikinci bir şıkkın da uyması en olası hata. Özellikle: FR `dès que` + futur simple / futur antérieur (her ikisi de doğru olabilir; sorularda yalnızca bir biçim sunuldu), ES `soler`/`tener que` karışımı, EN `provided that`/`as long as` (eş anlamlı, aynı soruda birlikte sunulmadı).
- **Resmî ve günlük kayıt.** Kayıt farkı ve diyaloglarda "resmî" söyleyişin aşırı ağır ya da yapay kaçıp kaçmadığı.
- **Türkçe çeviriler.** Metinlerin `tr` alanları serbest çeviridir; kelime kelime değil anlam odaklı. Yanlış anlam varsa düzeltilmeli.
- **Seviye tahminleri (İspanyolca).** Kelime seviyeleri kullanım sıklığına göre tahmindir, ders kitabı ölçümü değil.

## Bilinen sınırlar
- Hiçbir metin sesli okunarak denenmedi (cihaz sesi telaffuzları ayrıca iyi olmayabilir, özellikle uzun C1 cümlelerinde).
- Bu içerikler bir konuşur tarafından onaylanınca bu dosya silinebilir ya da "gözden geçirildi" notuyla güncellenebilir.
