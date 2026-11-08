# Öğrenme motoru ve kişisel algoritma

> Soru türü seçimi, bağlam sorularının kapısı, ölçüm soruları, sülük yardımı, hafıza modeli.
> AGENTS.md'den 2026-11-08'de konuya göre ayrıldı; notlar tarihlidir, kronolojik sıralı değildir. Kurallar ve tuzaklar için `AGENTS.md`.

## Kişiye özel algoritma, Aşama 0: ölçüm (2026-11-01)
- Plan ve kaynaklar: `docs/KISISEL-ALGORITMA.md` (kaynaklar yalnız özet düzeyinde doğrulandı; "%85 kuralı" kelime hatırlama için gösterilmedi, aşırı iddia etme).
- `ReviewEvent.ctx` (`processAttempt` her cevapta doldurur: `elapsedDays`, `stabilityBefore`, `difficultyBefore`, `policy` = `POLICY` 'heuristic-v1', `reason`, `slot`, `probe`); politika değişirse `POLICY` adını değiştir.
- **Ölçüm soruları** `engine/probes.ts`: günde ≤2 rastgele kart (vadesi bugünden sonra, ≥2 gün önce çalışılmış), `practice` modunda (FSRS'e dokunmaz), `probe` = seçilme olasılığı; `useSessionStarters.startDay` `withProbes` ile ekler; `Settings.probes === false` kapatır (Ayarlar → Sorular). Yeni bir "olayın bağlamı" gerekirse `ctx`e ekle, yeni alan isteğe bağlı kalsın.
- `engine/forecastQuality.ts` (log kaybı, Brier, AUC, ECE, skill; yazılı/seçmeli ayrı) → İlerleme → Model tahmini kartında satır. Tür seçiminin olasılığı kaydedilmiyor (yalnız ölçüm soruları rastgele).


## Notlar
- **Cümle içi sorular iyi öğrenilince (2026-11-04):** boşluk doldurma (`mc_context`, `cloze_typed`), `discriminate`, `aspect_choice`, `idiom_complete` yani `direction: 'context'` olan bütün soru türleri, kelime `contextReady(state)` olana dek sorulmaz (`engine/mastery.ts`: tanıma kartı mezun + hatırlama kararlılığı ≥ `CONTEXT_READY_DAYS` = 7 gün). İlk haftalar düz soru: anlam seç (`mc_meaning`), resimden seç, anlamdan yazma (`typed_translation`). Kapı `exerciseTypesFor(skill, entry, opts, state)` dördüncü parametresiyle çalışır: `state` verilirse (yeni kelime için `null`) kapı açık değilse bağlam soruları elenir; hiç verilmezse (oyunlar, Boss, kullanılabilirlik kontrolleri) eleme yok. `pickExerciseType` her zaman uygular (eleme sonrası tür kalmazsa elenmemiş türlere düşer, fırlatmaz), `unlockedSkills` üretim/eşdizim becerisini yalnızca bağlam dışı sorusu varken açar, dünün kelimesinin "cümlede ikinci soru"su (`dailyPlan.ts` `inSentence`) ve `adaptExercise` da aynı kuralı izler. Eşiği değiştirmek: `CONTEXT_READY_DAYS`. Cümlede tekrar oyunu (`ContextReview`) ve ayrı oyunlar bundan etkilenmez.
