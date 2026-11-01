# Kişiye özel öğrenme algoritması: bilim, plan, ölçüm

Amaç: sosyal ağların "ne kadar kaldığına" değil, **gecikmeli kalıcılığa** (bir hafta, bir ay sonra hâlâ biliyor mu) göre
ayarlanan bir öğrenme sistemi. Önce ölçeriz, sonra ayarlarız: ölçülmeyen şey iyileştirilemez ve "kişiselleştirme" kolayca
kendi kendini onaylayan bir yanılsamaya döner.

## Okunan kaynaklar ve sınırları (özet düzeyinde doğrulandı, tam metin okunmadı)

| Kaynak | Ne diyor | Burada nasıl kullanılıyor / sınır |
|---|---|---|
| Ye, Su, Cao 2022 (FSRS/DSR modeli) | Hatırlanabilirlik, kararlılık, zorluk üç durum; aralık buna göre | Zaten kullanılıyor (`ts-fsrs`) |
| Tabibian ve ark. 2019 (PNAS, "Enhancing human learning via spaced repetition optimization") | Tekrar zamanlaması bir kontrol problemidir; Duolingo verisinde doğal deneyle desteklendi | Bulgu **gözlemsel**: rastgele atama yok. "İşe yarar" kanıtı değil ipucu |
| Wilson ve ark. 2019 (Nature Comm., "The Eighty Five Percent Rule") | İkili sınıflandırma ve gradyan inişli modellerde ~%85 doğruluk en hızlı öğrenmeyi verir | Kapsamı bu modellerle (algısal öğrenme dahil) sınırlı; **kelime hatırlama için gösterilmedi**. "Hedef %85" demek aşırı iddiadır; tekrar hedefi (`desiredRetention` ~%90) ayrı bir iş yükü/kalıcılık dengesi |
| Roediger ve Karpicke 2006 (test etkisi) | Kendini sınamak yeniden okumaktan kalıcıdır | Ölçüm sorularının kendisi de gerçek bir tekrardır |
| Lindsey ve ark. 2014 (kişiselleştirilmiş tekrar) | Öğrenci/madde özelliği + zamanlama modeli kalıcılığı artırdı | Tek çalışma, kendi koşulları |

Kural: bir şeyi "bilimsel" diye eklemeden önce kendi verimizde ölçülebilir olmalı.

## Aşama 0: ölçüm altyapısı (bu belge, 2026-11-01)

1. **Bağlam kaydı** (`ReviewEvent.ctx`: `elapsedDays`, `stabilityBefore`, `difficultyBefore`, `policy`, `reason`, `slot`, `probe`).
   Her cevap, kararın verildiği andaki durumla saklanır. `policy` = `heuristic-v1`; algoritma değişince adı değişir ve
   eski/yeni karşılaştırılabilir. Geriye uyumlu: alan isteğe bağlı, yedek sürümü artmadı.
2. **Ölçüm soruları** (`engine/probes.ts`): günde en çok 2 kart, vadesi **bugünden sonra** olan (≥2 gün önce çalışılmış, ≥2
   tekrarlı, olgun) kelimelerden **rastgele** seçilir ve oturumun ortasına konur. Pratik modundadır: FSRS durumunu değiştirmez.
   Seçilme olasılığı (`probe` = k/n) olayda saklanır; yani bu alt küme, "erken sorulsaydı ne olurdu" için yanlısız örnektir
   (ters olasılık ağırlığı mümkün). En az 10 uygun kart yoksa hiç sorulmaz. Ayarlar → Sorular → "Ölçüm soruları" ile kapanır.
3. **Tahmin kalitesi** (`engine/forecastQuality.ts`): log kaybı, Brier, AUC, ECE ve "beceri" (modelin log kaybı, herkese
   hep ortalamayı söyleyen tahminciye göre ne kadar iyi). Yazılı cevaplar ayrı raporlanır (seçmeli sorunun tahmin tabanı
   yok: şansla doğru bilme). İlerleme → Model tahmini kartında tek satır.

### Dürüst sınırlar
- Soru **türü** seçimi (`pickExerciseType`) için seçilme olasılığı **kaydedilmiyor**; yalnızca ölçüm soruları rastgele ve
  olasılığı bilinir. Tür seçimini sonradan değerlendirmek (off-policy) şimdilik mümkün değil.
- Ölçüm soruları cihaz başına çalışır; tek kullanıcıda bile veri yavaş birikir (günde ≤2).
- ECE ve AUC küçük örnekte gürültülüdür; kartlar 20 cevap altında susar.

## Sonraki aşamalar (hepsi Aşama 0 verisi yeterli olunca)
1. **Durum**: öğrenen başına hiyerarşik Bayes (cihazda), madde zorluğu (Elo/IRT), tepki süresi akıcılığı.
2. **Politika**: günlük plan = kısıtlı seçim (kazanç/maliyet), bandit ile tür/format; ölçüt: ölçüm sorularında doğru oranı.
3. **İçerik önerisi**: i+1 (bilinen kelime kapsamı) ile metin/diyalog seçimi.
4. **N-of-1**: madde düzeyinde randomizasyon (aynı kişide A/B), sonuç gecikmeli ölçüm sorularıyla.
