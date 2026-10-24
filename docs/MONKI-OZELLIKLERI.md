# Monki: yeni özellik listesi (2026-10-21)

Sahibi "hepsini sırayla yap" dedi. Bu dosya, işi devralacak Claude oturumu için yapılacakları sırayla, kod noktalarıyla verir. Her madde ayrı bir PR olabilir (küçük olanlar birleşebilir). Her PR'da yerelde `npm run typecheck`, `npx oxlint src api e2e`, `npx vitest run` ve ilgili E2E çalıştırılır; yeşilse sormadan birleştirilir (AGENTS.md). Kullanıcıya her yanıt Türkçe.

## Monki'nin bugünkü hâli (kod haritası)

- Panel ve sohbet: `src/ui/monki/Monki.tsx` (lazy; App'te `ready && data`, düğme oturum/özet dışında). Çizim `MonkiMascot.tsx`. Geçmiş dil başına `localStorage 'diloloji:monki:<dil>'` (cihazda, son 30 mesaj, eşitlenmez; API'ye son 12 mesaj gider).
- Köprü: `monkiBus.ts` `askMonki({text, mode?, scenario?, send?})`, `AskMonki.tsx` (yalnızca YZ anahtarı varken), `asks.ts` (`wordAsk`, `missAsk`, `sentenceAsk`).
- YZ: `src/ai/claude.ts` `monkiTurn(apiKey, MonkiRequest)` → `{reply, suggestions, say}`; kurallar `monkiModeRules`; maliyet anahtarı `monki`. Modlar: `chat | quiz | roleplay | mistakes | words`. İstek bağlamı: `engine/monkiContext.ts` (`weakWordsOf`, `mistakesForMonki`), `monki/monkiWords.ts` (`talkWords`).
- Düzeltme → cümle kartı: `monki/corrections.ts` `parseCorrection`, `SaveCorrection`, `SaveAllCorrections`.
- Sesli rol yapma: `MonkiReply.say` + `speak`, mikrofon `listen`; anahtarlar `diloloji:monki-voice`.
- Bugün önerisi: `monki/MonkiNudge.tsx` (günde bir, `localStorage 'diloloji:monki-nudge'`).
- Testler: `Monki.test.tsx`, `AskMonki.test.tsx`, `asks.test.ts`; E2E `e2e/monki.e2e.ts` (Anthropic taklit eder; yanıt taklitleri `say` alanını da vermeli).
- Kurallar: kullanıcıya görünen metinde "AI" değil "YZ"; sınıf adında `is-`/`level-` öneki kullanma (cssSplit); yeni ayar anahtarı `diloloji:` öneki alır ve hesapla gitsin isteniyorsa `data/devicePrefs.ts` `LOCAL_PREFIXES`a eklenir; maliyet saymak için `ai/claude.ts`'te yeni bir kullanım anahtarı verilir; hiçbir şey kullanıcıya sormadan kelime/kart eklememeli; YZ yalnızca kullanıcı isteyince çağrılır (kendiliğinden istek atma).

## Sıra ve maddeler

Önerilen sıra: 13 (hafıza) altyapı olduğu için önce, sonra 1, 2, 3 ... Ama 13 büyük; istersen 1 ve 2'yi 13'ten önce yap ve hafızayı sonra bağla.

### 13. Hafıza (altyapı) — YAPILDI (2026-10-24)
Uygulama: `engine/monkiMemory.ts` (notlar, en çok 12, 110 karakter), `ui/monki/memoryStore.ts` (`localStorage diloloji:monki-memory:<dil>`, kapatma `diloloji:monki-memory-off`; `devicePrefs` ile hesapla taşınır). Model her cevapta `remember` (0–2 not) döndürür, ayrı istek yok; `MonkiRequest.memory` sonraki turda istemine girer. Panelde başlıkta "Hatırladıkları": liste, tek tek sil, hepsini sil, hatırlama aç/kapa. Türetilmiş bilgiler (yazı hata defteri, kör nokta) şimdilik notlara girmiyor: madde 3 onları bağlama ekler.
Monki seni hatırlar: "geçen hafta ser/estar'da zorlanıyordun". Şimdi geçmiş cihazda 30 mesajla sınırlı.
- Küçük bir "Monki'nin bildiği" özeti: son oturumların konuları, tekrar eden hata türleri (yazı hata defteri `engine/writingErrors.ts`, kör nokta `engine/blindSpots.ts`), zayıf kelimeler, son sohbetten çıkan 3–5 not. Ham sohbet değil, kısa notlar (en çok ~10 satır).
- Saklama: `meta 'monkiMemory'` ya da `localStorage 'diloloji:monki-memory:<dil>'` + `devicePrefs` ile hesapla taşı (`BACKUP_VERSION` artırma gerekmez: `Backup.prefs` zaten var).
- Kullanıcı görebilmeli ve silebilmeli: Ayarlar'da "Monki'nin hatırladıkları" listesi, tek tek sil, hepsini sil. Kapatma anahtarı.
- Özet YZ ile üretilirse kullanıcı isteyince/oturum sonunda tek istek, maliyet `monki_memory`.
- `monkiTurn` istemine yalnızca bu notlar girer (kullanıcının yazdığı uzun metinler değil).

### 1. Günün sohbeti — YAPILDI (2026-10-24)
Uygulama: `engine/dailyTalk.ts` (`dailyTalkWords`: açık hatalar, bugün vadesi gelenler, öğrenilenler; ≥3 kelime yoksa sohbet yok), `ui/monki/dailyTalkStore.ts` (`diloloji:monki-daily`), panelde "Günün sohbeti" çipi (`words` modu, `daily`), sonunda `TalkSummary` (kullanılan/kullanılmayan, "Kullanmadıklarla devam et"; özet gelince gün kapanır), Bugün'de `MonkiNudge` (açık hata yoksa günün sohbetini önerir).
Bugünkü zayıf kelimelerle 3–5 turluk kısa konuşma; bitince "bugün şunları kullandın" özeti.
- Yeni mod ya da `words` modunun günlük sürümü: `talkWords` ile kelimeler, hedef sayısı sabit (5 kelime), `usesWord` ile kullanılanlar işaretlenir.
- Tur sayısı biter bitmez özet kartı: kullanılan/kullanılmayan kelimeler, "kullanmadıklarını kartlarına ekle" yok; sadece listele.
- Bugün'de `MonkiNudge` bu modu önerebilsin; günde bir kez.

### 2. Gramer koçu — YAPILDI (2026-10-24)
Uygulama: `asks.ts` `lessonAsk`/`habitAsk`; Rehber dersinde "Başka anlat", mini sınavda yanlış cevapta "Monki açıklasın" (`LessonCheck` `lesson` prop'u), Yazı hata defterinde her tür için "Monki'ye sor". Kör nokta kartlarına henüz eklenmedi.
Rehber dersinde takılınca "bunu bana başka anlat"; ders kuralını senin yanlış cümlenle örnekle.
- `ui/Guide.tsx` `LessonView`: ders sonuna (ve yanlış sınav cevabında) `AskMonki`. Metin: ders kuralının özeti + yanlış cevap/senin cümlen (≤700 karakter, `asks.ts` desenine yeni `lessonAsk`).
- Yazı hata defterinden (`WritingNotebook`) ve kör nokta bulgularından aynı düğme.

### 3. "Neden yanlış?" ve aynı hatayı hatırlatma — YAPILDI (2026-10-24)
Uygulama: `missAsk` kelimenin sayaçlarını (`history`: ≥3 yanlış) soruya ekler (`Feedback` → `ExerciseRunner` `wordState()`), model deseni kalıba bağlar.
Oturum geri bildiriminde `missAsk` zaten var. Eksik olan: aynı hatayı tekrar yaparsan Monki'nin "bunu geçen hafta da karıştırmıştık" demesi.
- Hata tekrarı `lastAnswers`/`weekMisses` ve kelimenin sayaçlarından; yalnızca kullanıcı Monki'ye sorduğunda bağlama eklenir. Hafıza (13) varsa oradan.

### 5. Telaffuz koçu — YAPILDI (2026-10-24)
Uygulama: `MonkiMode 'pron'` (kural `claude.ts` `monkiModeRules`), `MonkiRequest.pron` (en zayıf 5 kelime + puan, `weakPronWords`), panelde "Telaffuz" çipi (yalnızca zayıf kelime varsa; `App` `loadPronWords`, panel açılınca okunur), modelin `say` alanı = okunacak kelime (cihaz sesiyle çalınır), kullanıcı mikrofonla söyler; Monki tanıyıcının yazıya çevirdiğine bakar, "duyduğum yazıya göre" der, puan vermez. Gerçek mikrofonla denenmedi.
Azure puanı düşük kelimeleri alıp "bu sesi şöyle çıkar" der; sesli tekrar ister.
- `engine/pronWeak.ts` (`meta 'pronScores'`), `PronPractice.tsx`, `ai/claude.ts` `pronTips`. Monki'de yeni mod `pron`: zayıf kelimeler bağlama girer, kullanıcı söyler (`listen`), Monki geri bildirir (Azure yoksa tarayıcı tanıması + yaklaşık, açıkça "kulağıma göre" der).
- Gerçek mikrofonla denenemez; testte taklit.

### 6. Yazı arkadaşı — YAPILDI (2026-10-24)
Uygulama: Günlük'te "Takıldım" (`asks.ts` `stuckAsk`, `MonkiMode 'write'`): metin + görev gider, Monki yazıyı düzeltmez/yazmaz, 2–3 devam yolu ve yönlendirici soru verir.
Günlük yazarken yanında durur; yalnızca istenince "devam etmek için şu kalıbı dene" önerir.
- `ui/Produce.tsx` Günlük alanında küçük "Monki'ye takıldım" düğmesi: o ana kadar yazılan metin + hedef (sınav görevi varsa `engine/examTasks.ts`) → 2–3 devam önerisi (cümle başı kalıpları, kelime önerisi). Düzeltme değil, yönlendirme; yazıyı kendisi değiştirmez.

### 7. Sınav provası — YAPILDI (2026-10-24)
Uygulama: sınav görevi seçiliyken ve ≥20 kelimeyken "Monki puanlasın" (`examAsk`, `MonkiMode 'exam'`): dört ölçüt 0–5 + toplam/20, Türkçe gerekçe, "resmî puan değil" notu, tek en değerli düzeltme.
DELF/DELE/Cambridge tarzı yazma görevlerinde puan ve gerekçe.
- `data/examTasks/*.json` görevleri; Günlük'te görev seçiliyken "Monki'den puan iste": ölçüt tablosu (içerik, düzen, dil, kelime hazinesi) 0–5 ve Türkçe gerekçe. "Resmî sınav puanı değildir" notu görünür kalmalı. Maliyet `exam_score`.

### 9. Haftalık koç notu Monki'den
`WeeklyNudge` YZ koçu yorumu (`ai/claude.ts` `weekNote`, `engine/weekly.ts` `weekDigest`) Monki sohbetine açılsın: "Gelecek hafta için plan yapalım mı?" Monki haftanın özetini bağlam alır, 3 maddelik plan önerir. Kullanıcı kabul ederse plan hiçbir yere yazılmaz (yalnızca sohbette); isterse `Settings.weeklyTimeGoal`/günlük yeni kelime ayarını öneri olarak gösterir ("N yap" düğmesi, kullanıcı basarsa).

### 10. Okurken Monki
Okumada bir paragrafı seçince "bunu sadeleştir / bu cümleyi parçala".
- `Reading.tsx`/`ReaderAside`: çoklu seçim ya da paragraf menüsüne `AskMonki`. Şu an `sentenceAsk` tek cümle gönderiyor; paragraf için ≤700 karakter kırp. Sürüm: hedef dilde sadeleştirme (A2) + Türkçe açıklama.

### 11. Zor gün modu
Üst üste yanlışta ya da uzun aradan dönünce oturum ortasında "kolay bir tur yapalım mı?".
- `Session.tsx`: `isLeech` yardımı ve 3 üst üste yanlış zaten var (`engine/leechHelp.ts`). Monki konuşmaz, panel açılmaz: küçük bir kart/toast; kabul ederse `insertLater` ile kolay `mc_meaning` soruları ekle (zamanlamayı etkilemeyen `reason: 'practice'`). Oturumda Monki paneli `aria-modal` olduğundan kısayollar dursun diye açma, sadece kart.

### 12. Arkadaşlarla Monki
Düello/lig sonucunu Monki yorumlasın, rövanş önersin. Düşük öncelik, eğlence. `DuelGame.tsx` sonuç ekranı ve `FriendLeague.tsx`: ek çağrı yapmadan hazır metin şablonları (YZ çağrısı gerekmesin); Monki poz çizimleri mevcut `MonkiMascot` pozlarından.

### 14. Maliyet göstergesi
Ayarlar'da "bu ay Monki'ye ne kadar harcadın" ve günlük sınır.
- Kullanım sayımı zaten var (Ayarlar → Kullanım → YZ, maliyet anahtarları `monki`, `monki_*`). Monki satırlarını ayrı topla, günlük soru sınırı ayarı (`Settings`'e yeni alan; 0 = sınırsız). Sınıra gelince panel nedenini söyler ve Ayarlar'a götürür.

### 4. Kelime hikâyesi
Kök ve ekler ağacındaki kelimenin köken ve akrabalarını kısa hikâye olarak anlatır.
- `ui/MorphemeTree.tsx`, `engine/derive.ts` `familyOf`, kelime sayfasındaki köken (`cleanEtymology`). `wordAsk`'a "kelime hikâyesi" modu: köken + aile üyeleri bağlama girer; hikâye 4–5 cümle, Türkçe, örnekler hedef dilde.

### 8. Yeni rol yapma sahneleri — YAPILAMAZ (şimdilik)
`Monki.tsx` `SCENES` her sahne için çizim ister (`ROLE_ART`, `MISSION_ART`). Çizimi sahibi üretmeden yeni sahne ekleme. Sahibine hangi sahneleri istediğini (doktor, kiracı, iş mülakatı…) ve çizim ihtiyacını bildir.

## Her maddede yapılacaklar
- Yeni YZ çağrısı: `ai/claude.ts`'te kullanım anahtarı (maliyet sayımı), `Settings`/anahtar yoksa Monki'nin mevcut "Ayarlar'a git" yönlendirmesi.
- Testler: birim (saf mantık + bileşen), `Monki.test.tsx` desenindeki taklit, gerekirse `e2e/monki.e2e.ts`'e bir senaryo (`say` alanı dahil).
- `AGENTS.md`'ye kısa not (tarih, ne eklendi, hangi anahtarlar) ve bu dosyada maddeyi "yapıldı (PR no)" olarak işaretle.
- Gerçek YZ çıktısı ve mikrofonla denenemeyen yerleri notta açıkça belirt.
