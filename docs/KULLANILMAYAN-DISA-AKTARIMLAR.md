# Kullanılmayan Dışa Aktarımlar Raporu

**Tarih:** 2026-10-10  
**Araç:** `ts-prune` (`tsconfig.app.json`) ve repo genelinde `git grep` taraması.  
**Kural:** `src/engine/` ve `src/ui/verbs/` dosyaları Claude Code sorumluluğunda olduğu için oradaki dışa aktarımlar silinmemiş, yalnızca listelenmiştir. Yalnızca `src/ui/` altında dosya içinde kullanılıp dışarıdan çağrılmayan kesin güvenli yardımcıların gereksiz `export` anahtar kelimeleri kaldırılmıştır.

---

## 1. Temizlenen Dışa Aktarımlar (`src/ui/`)

Aşağıdaki semboller yalnızca tanımlandıkları dosya içinde kullanılmakta olup proje genelinde başka hiçbir yerden içe aktarılmamaktadır. Başlarındaki gereksiz `export` anahtar kelimesi kaldırılarak modül içi (dahili) kapsama alınmıştır:

| Dosya | Sembol | Durum | Açıklama |
|---|---|---|---|
| `src/ui/pronunciation.ts` | `assessLocale` | Dahili yapıldı | Yalnızca `pronunciation.ts` içinde telaffuz tanıma çağrısında kullanılıyor. |
| `src/ui/pronunciation.ts` | `toWav16k` | Dahili yapıldı | Yalnızca `pronunciation.ts` içinde ses dönüştürmede kullanılıyor. |
| `src/ui/clipboardSuggest.ts` | `markOffered` | Dahili yapıldı | Yalnızca `clipboardSuggest.ts` içinde öneri takibinde kullanılıyor. |
| `src/ui/clipboardSuggest.ts` | `clipboardGranted` | Dahili yapıldı | Yalnızca `clipboardSuggest.ts` içinde izin denetiminde kullanılıyor. |
| `src/ui/glyphIcon.ts` | `glyphFor` | Dahili yapıldı | Yalnızca `glyphIcon.ts` içinde emoji glif eşlemesinde kullanılıyor. |
| `src/ui/wordOrder.ts` | `loadWordOrder` | Dahili yapıldı | Yalnızca `wordOrder.ts` içinde komşuluk sıralamasında varsayılan argüman olarak kullanılıyor. |
| `src/ui/backup.ts` | `BACKUP_EVERY_DAYS` | Dahili yapıldı | Yalnızca `backup.ts` içinde bayatlık kontrolünde kullanılıyor. |
| `src/ui/pushReminders.ts` | `localDay` | Dahili yapıldı | Yalnızca `pushReminders.ts` içinde tarih biçimlendirmede kullanılıyor. |
| `src/ui/knownMilestones.ts` | `KNOWN_MILESTONES` | Dahili yapıldı | Yalnızca `knownMilestones.ts` içinde kilometre taşı sınırlarında kullanılıyor. |
| `src/ui/BadgeWatcher.tsx` | `CELEBRATE_MAX` | Dahili yapıldı | Yalnızca `BadgeWatcher.tsx` içinde rozet anı sınırında kullanılıyor. |

---

## 2. Claude Code Alanındaki Kullanılmayan Dışa Aktarımlar (Dokunulmadı)

Aşağıdaki dışa aktarımlar Claude Code'un çalışma alanında (`src/engine/` ve `src/ui/verbs/`) yer aldığı için AGENTS.md devir kuralı gereğince silinmemiş, referans için listelenmiştir:

### `src/engine/index.ts` Barrel Dosyası
`src/engine/index.ts` merkezi bir dışa aktarma (barrel) dosyası olarak görev yapmaktadır; motorun alt modüllerinden pek çok fonksiyon ve tipi re-export eder. Ancak uygulamanın çoğu yeri doğrudan ilgili alt modülü içe aktarmaktadır (`from '../engine/...'`):
- `Session`: `WEAK_R`, `MAX_EXTRA_MISTAKE_ITEMS`, `INTERFERENCE_WINDOW_DAYS`, `INTRO_GAP`, `graduatedGap`, `adaptExercise`, `suggestBreak`, `mixInTyping`, `typeStrongCloze`, `typedFollowUp`, `startSession`, `retryItem`, `completeItem`, `skipRemaining`, `summarize`, `firstSittingEnd`, `RETRY_GAP`, `RELEARN_TARGET`, `MAX_RETRIES`, `GRADUATED_GAPS`, `BREAK_AFTER`, `TYPING_SHARE`, `STRONG_RECOGNITION_DAYS`, `currentItem`, `isFinished`, `SPLIT_ABOVE_MINUTES`
- `Plans & Practice`: `buildMistakePlan`, `buildPracticePlan`, `buildDeckPlan`, `isDueFor`, `pickGameWords`, `pickFluencyWords`, `median`, `pickAudioWords`, `FLUENCY_MIN_WORDS`
- `Stats & Progress`: `studyStreak`, `answeredToday`, `ACTIVE_RETRIEVABILITY`
- `Extract & Text`: `stem`, `splitSentences`, `cleanToken`, `extractCandidates`, `findExampleSentences`, `STOP`
- `Gamification & Badges`: `comboMultiplier`, `xpForAnswer`, `computeXp`, `levelFromXp`, `medalTier`, `achievements`, `badgeSeries`, `closestStep`, `mergeBadgeLogs`, `longestStreak`, `perfectDays`, `crossedMilestone`, `BASE_XP`, `INTRO_XP`, `COMBO_GAP_MS`, `xpToNext`, `levelTitle`, `emptyStats`, `ACHIEVEMENTS`, `BADGE_CATEGORIES`, `badgeCategory`
- `Quests & Stories`: `pickStoryWords`, `parseStoryText`, `dailyQuests`, `dayMetrics`, `questStatus`, `questBonus`, `QUESTS`
- `Insights`: `streakWithFreezes`, `MAX_FREEZES`, `buildWordGraph`

### `src/engine/` Alt Modülleri
- `src/engine/labTour.ts`: `TourKind`, `TourReason`
- `src/engine/listening.ts`: `MinimalPair`
- `src/engine/listHealth.ts`: `ListHealth`
- `src/engine/lists.ts`: `levelRank`, `LevelGroup`
- `src/engine/memoryCurve.ts`: `CurvePoint`, `MemoryCurve`
- `src/engine/news.ts`: `FeedItem`
- `src/engine/optimizer.ts`: `Review`
- `src/engine/pitch.ts`: `downsample`
- `src/engine/podcasts.ts`: `Podcast`
- `src/engine/profileStyle.ts`: `DEFAULT_BANNER`, `DEFAULT_FRAME`, `TitleOption`
- `src/engine/race.ts`: `WeeklyRace`
- `src/engine/retire.ts`: `RETIRE_STABILITY_DAYS`
- `src/engine/textForms.ts`: `TextForm`
- `src/engine/translationMemory.ts`: `MemoryLang`, `MEMORY_MAX`, `memoryKey`
- `src/engine/turkishVerb.ts`: `TurkishTense`
- `src/engine/weekly.ts`: `WeekSummary`
- `src/engine/workload.ts`: `onVacation`
- `src/engine/workloadForecast.ts`: `WorkloadForecast`, `NEW_WORD_MINUTES`

### `src/ui/verbs/` Alt Modülleri
- `src/ui/verbs/labShared.ts`: `DayForm`
- `src/ui/verbs/moodRound.ts`: `MoodQuestion`
- `src/ui/verbs/PatternsTab.tsx`: `PatternShape`
- `src/ui/verbs/PracticeTab.tsx`: `PracticeMode`, `RoundResult`
- `src/ui/verbs/ReviewTab.tsx`: `Asked`
- `src/ui/verbs/tenseTwin.ts`: `Twin`
