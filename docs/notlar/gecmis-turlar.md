# Geçmiş turlar ve durum kayıtları

> Tarihli durum notları (Antigravity ve Claude Code), bitmiş turlar, eski devir notları.
> AGENTS.md'den 2026-11-08'de konuya göre ayrıldı; notlar tarihlidir, kronolojik sıralı değildir. Kurallar ve tuzaklar için `AGENTS.md`.

## Durum (2026-10-29)
- **Antigravity (2026-10-29):**
  - **#650: Logo/Simge ve Sayfa Başı Pozları / İllüstrasyonlar:**
    - Logo ve Amblem (`BrandMark`): `favicon.svg` ile tam uyumlu 3 kademeli SVG gradientleri eklendi (zümrüt yeşili yaprak tabanı, açık nane üst fasetler, altın taç kıvılcımı).
    - Dokunsal Geri Bildirim: `.brand-mark` için yaylı (spring) üzerine gelme ve tıklama mikro-etkileşimi tanımlandı (`translateY(-1px) scale(1.05)` ve yumuşak gölge).
    - Sayfa Başı Pozları (`PageHeader`): `hello` (`react-hello.webp`) ve `edit` (`head-edit.webp`) pozları eklendi. `.page-header-art` için hover anında hafif canlı perk-up animasyonu eklendi (reduced-motion uyumlu). `VerbLab` yükleme durumuna `art="write"` eklenerek başlık atlaması (layout shift) giderildi.
    - Tüm kontroller ve CI (typecheck, lint, birim testleri, Playwright E2E) yeşil geçti ve PR #650 birleştirildi.
  - **B2–C1 İleri Seviye Dilbilgisi Soruları (90 adet):** Açık lisanslı (CC BY 4.0) akademik kaynaklardan Fransızca (30: `basics_fr_subjonctif_passe`, `basics_fr_mise_en_relief`, `conditionnel_passe`), İspanyolca (30: `basics_es_subjuntivo_compuesto`, `condicionales`, `basics_es_oraciones_hendidas`) ve İngilizce (30: `inversion`, `cleft`, `mixed_conditionals`) ileri düzey karmaşık yapı soruları eklendi (`fr-b2c1-1.json`, `es-b2c1-1.json`, `en-b2c1-1.json`). Tekil doğru seçenekler, ipuçları ve detaylı Türkçe açıklamalar doğrulandı.
  - **Yapay Zekâ Özelliklerinin Uçtan Uca Doğrulanması:**
    - Serbest geri anlatım (`evaluateRetelling`): Hikâye özetleme, hedef kelime kullanımı, Türkçe geri bildirim, eksik/hatalı kullanım ve SDK hata haritalama senaryoları birim düzeyinde (`src/ai/productionModules.test.ts`) ve Hikâye ekranı UI entegrasyonunda (`src/ui/reading/StoryRetell.test.tsx`) doğrulandı.
    - Ters çeviri (`evaluateTranslation`): Referans cümleden bağımsız doğal çeviri takdiri, küçük aksan/uyum kayması ve hatalı anlam senaryoları birim düzeyinde ve oturum çalışma ekranında (`src/ui/session/ExerciseRunnerBackTranslation.test.tsx`) doğrulandı.
    - Canlı API ortam değişkeni desteği (`process.env.ANTHROPIC_API_KEY`) koşullu entegrasyon testine bağlandı.
  - **Doğrulama ve Sağlamlık:** `npm run typecheck`, `npx oxlint src api e2e` (0 hata, 0 uyarı), tüm yeni ve ilgili vitest testleri yeşil.

## Durum (2026-10-28)
- **Antigravity (2026-10-28):**
  - İspanyolca ve İngilizce Açık Dilbilgisi Soruları (120 adet): Açık lisanslı (CC BY 4.0) akademik kaynaklardan 60 İspanyolca (`es-chv-1.json`, `es-chv-2.json`: `ser_estar`, `basics_es_presente`, `basics_es_gustar`, `por_para`, `preterito_imperfecto`, `subjuntivo`) ve 60 İngilizce (`en-esl-1.json`, `en-esl-2.json`: `basics_en_present_simple`, `basics_en_past_continuous`, `present_perfect`, `modals_en`, `basics_en_conditionals`, `passive_en`) dilbilgisi sorusu eklendi; tekil doğru cevaplar, ipuçları ve Türkçe açıklamalarla doğrulandı.
  - İngilizce Kolay Resimli Hikâyeler: `src/data/storybooks/en.json` Global Storybooks English kaynağından 14 yeni hikâye ile 15'ten 29 hikâyeye tamamlandı; ses, illüstrasyon ve Türkçe karşılıkları eşleştirildi (`scripts/build-en-storybooks.ts`, `storybooks.test.ts`).
  - E2E Test Sağlamlaştırması (`e2e/desktop.e2e.ts`, `e2e/a11y.e2e.ts`): Kayıt farkı testinde seçeneklerin yeni soru render edilmeden tıklanmaması için `.option:not([disabled])` görünürlüğü beklendi ve bölgesel not havuz örneklemesi için çoklu tur koruması sağlandı; sütun grafiği erişilebilirlik testinde odaklanma öncesi görünürlük kontrolü eklendi; dilbilgisi rehber hata testinde `error` soru tipi (`.grammar-word`) desteğiyle zaman aşımı ve flakiness tamamen önlendi.
  - #645: Uygulama akış testi (`src/flows/app.test.tsx`) asenkron UI beklemeleri `until` döngüsüyle yarış durumuna karşı sağlamlaştırıldı. `fr-fi-2.json` içindeki tekil doğru seçenek uyumu (`sonner`) sağlandı. `snapshots.yml` ile 32 adet Linux ekran görüntüsü referansı güncellendi. WCAG 2.5.3 (Label in Name) standartları kapsamında `AppSidebar`, `StudyCalendar`, `Profile`, `TextForms` ve `Guide` ekranlarındaki görünür metin ile accessible name uyuşmazlıkları giderildi.

## Durum (2026-10-27)
Birleşti: #37–#644.
- **Antigravity (2026-10-27):**
  - #644 (17. Tur): Sesli kitap kütüphanesi genişletmesi (FR 13->28, ES 10->25, EN ilk 17 bölüm eklendi; Daudet, Voltaire Candide, Quiroga, Bécquer Leyendas, Wilde The Happy Prince, Carroll Alice in Wonderland; `scripts/build-round17-audiobooks.ts`), Français interactif kaynaklı 60 dilbilgisi sorusu (`fr-fi-1.json`, `fr-fi-2.json`) ve açık lisanslı İspanyolca/İngilizce dilbilgisi kaynakları raporu (`docs/kaynaklar/acik-dilbilgisi.md`).
- **Antigravity (2026-10-20):**
  - #556: Tanıtım sayfası yeniden tasarımı (`Landing.tsx`, `lazy.css` `lp-*`).
  - #561: Quizlet / Memrise aktarma sihirbazı (`QuizletWizard.tsx`, sütun eşleştirme, takas, export).
  - #565: Davet edenin adını karşılama (`&kimden=Ad`, `Landing.tsx` kişisel karşılama kartı).
  - #566: Tanıtım sayfası mobil ergonomisi (hero buton aralıkları, davet karşılama kartı, değer önerisi çipleri).
  - #569: Haftalık özet mailinde kişisel hedef (`weekLine`, sunucu `cleanWeek` regex doğrulaması).
  - #570: Birleşik dağıtım ve canlı duman testi (`verify-deploy.mjs`, `smoke-live.mjs`).
  - #571: `loadGame` tek geçişli optimizasyon (8+ dizi filtresi tek bir O(N) geçişe indirgendi, `longestStreakFromDays`, 30 bin olayda ~16 ms ve denklik testi).
  - #572: CEFR seviye hedef planlayıcı (`goalPlanner.ts`, `GoalPlannerCard.tsx`, İlerleme'de seviye hedefi, kalan kelime, gün, günlük kota önerisi ve pace rozetleri).
- Claude Code (2026-10-20):
  - #557: Yedi iş turu (Anki zstd apkg, sesli tekrar, oturum unuttum kartları, offline sw testi vb.).
  - #558–#560: Tanıtım düzeltmeleri ve dil seçici.
  - #562–#563: Hesap menüsü geliştirmeleri.
  - #567: Okuma araç çubuğu ve disleksi dostu yazı tipi (Açık/Disleksi/Serif, punto/genişlik).
  - #568: Oyun önerileri ve arama.

Birleşti: #37–#285 (aşağıdaki liste kronolojik değil, konuya göre birikmiş).
## Devir: yeni hesapta ne yapılmalı (2026-10-13)
Yeni Claude hesabı bu dosyayı okuyup şuradan devam eder. Kullanıcıya her yanıt Türkçe; CI yeşil PR'ı sormadan birleştir.
1. **Tasarım/çizim işi rafta.** Yeni görsel gelirse (`docs/gelen-gorseller/` ya da sohbet): önce damalı/beyaz zemini söker (`remove_white`, kenardan başlayan için `border_only`), `src/assets/art/*.webp` yap, `drawnArt.ts`/`StatusArt.tsx`/`gameArt.ts`e bağla. Hepsi işlendi (aşağıdaki "Çizimler, dördüncü parti"); yeni set `docs/gelen-gorseller/`a yüklenir (sohbet sırasında araya giren görseller dosya olarak kaydedilmez).
2. **Fiil örnek cümleleri:** sıklık listesindeki anlamlı fiiller ve sık dönüşlüler iki dilde de bitti (2026-10-14; ES 3131 + 389 dönüşlü, FR 1331 + 314 dönüşlü cümle, partiler `docs/veri/ornek-cumle-partileri/`). Kalan: İspanyolcada yalnızca nadir/teknik fiiller; **iki dilde de bitti** (2026-10-14): çekimli biçimi sıklık listesinde geçen gerçek fiillerin hepsinin cümlesi var; sıralamada kalanlar isim eşsesli (voiture, police, chambre…), argo ya da çok nadir. Kalan ~1.240 FR ve ~60 ES fiil sıklık listesinde hiç geçmiyor (değeri düşük). Ayrıntı yukarıdaki "Fiil örnek cümleleri, elle yazılan partiler" notunda.
3. **Kalan kod işleri:** `loadGame` günlük özeti (~30 bin cevapta yeniden değerlendir; okuma tarafı `allEvents` önbelleğiyle hafifledi, 2026-10-14); ~~`useSessionStarters`, okuyucu paragrafı `memo`~~ yapıldı (2026-10-13, aşağıdaki not); ~~CSP zorunluya geçiş~~ yapıldı (2026-10-20).
4. **Sahibinin yapacakları:** Supabase kurulumu, Resend alan adı doğrulaması (`RESEND_FROM`, `_dmarc`) ve `ADMIN_TOKEN` rotasyonu sahibi tarafından **yapıldı** (2026-10-17, sahibi bildirdi); bunları bir daha hatırlatma. Kalanlar: görsel test referansları (Actions kotası dönünce `gh workflow run snapshots.yml --ref main`), Safari'de elle deneme, yeni yedekle kişisel öğrenme analizi.
5. **Doğrulama sırası her değişiklikte:** `npm run typecheck`, `npx oxlint src api e2e`, `npx vitest run`, `npx vite build` + E2E (`E2E_PORT=4180 npx playwright test -c pw.tmp.config.ts e2e/phone.e2e.ts e2e/desktop.e2e.ts e2e/a11y.e2e.ts --workers=4`, uzun sürer: arka planda koştur, log'a yaz). Yüke bağlı kararsız testler tek başına tekrar çalıştırılır.


## Notlar
- Antigravity 1–5. tur ve araştırmalar (#153, #155, #156, #158, #159, #160, #161, #165, #166, #170, #172, #173, #175, #177, #179, #181, #183):
  - #153: Çevrimdışı göstergesi (üst çubukta sessiz çevrimdışı rozeti, çevrimiçi olunca kaybolur).
  - #155: Alt sekmelerin görünürlüğü (seçili sekme göstergesi ve kaydırma ipucu).
  - #156: Test boşlukları (src/engine/ altında test edilmemiş 5 modüle kapsamlı birim testleri: `hours`, `workloadForecast`, `incoming`, `accents`, `milestones`).
  - #158: İlerleme ekranında katlanan kartların seçimini hatırlama (`Progress.tsx`, `useGroups.ts`, `GroupToggle`).
  - #159: Çoklu CEFR filtresi ve sözlük düzeltme notunun keşfedilebilirliği (Kelimeler filtresinde çoklu seviye seçimi, Sözlük'te dokunsal kalem daveti).
  - #160: `Words.tsx` (1634 satır) modüler bileşenlere ayrıldı (`WordForm.tsx`, `WordListView.tsx`, `Words.tsx` 377 satıra indi).
  - #161: `SettingsScreen.tsx` (844 satır) modüler bileşenlere ayrıldı (`StudySettings`, `AnswerSettings`, `SoundSettings`, `LookSettings`, `ReminderSettings`, `ToolsSettings`, `DataSettings`, `settingsWidgets`; ana ekran 194 satıra indi).
  - #165: LibriVox ve Gutenberg B1+ sesli kitaplar envanteri (`docs/kaynaklar/audiobooks-fr.json`, `audiobooks-es.json`, `README.md`).
  - #166: COERLL dil bilgisi içerikleri araştırma raporu (`docs/kaynaklar/coerll.md`).
  - #170: `Progress.tsx` (655 satır) modüler bileşenlere ayrıldı (`WeekHero.tsx`, `ProgressCharts.tsx`, `ProgressMemory.tsx`, `ProgressTests.tsx`, `progressShared.ts`; ana ekran 187 satıra indi).
  - #172: E2E sağlamlığı (fonksiyonel rota eşlemeleri ve dinamik görünürlük beklemeleri).
  - #173: Dahili kullanılan dışa aktarımların temizlenmesi ve raporu (`docs/KULLANILMAYAN-DISA-AKTARIMLAR.md`).
  - #177: İkon denetimi raporu (`docs/IKON-DENETIMI.md`) ve telefon koyu tema ekran görüntüleri.
  - #179: Yeni bölünen UI bileşenlerine kapsamlı birim testleri (`TextForms.test.tsx`, `CoverageCard.test.tsx`, `WordCard.test.tsx`, `ReadingLibrary.test.tsx`, `AppSidebar.test.tsx`).
  - #181: Erişilebilirlik (a11y) test kapsamının genişletilmesi (`e2e/a11y.e2e.ts`: Onboarding adımları, Çekimler kartı, mobil kelime alt çekmecesi ve oturum özeti axe taramaları).
  - #183: Dokümantasyon ve durum güncellemeleri (`AGENTS.md`, `KULLANILABILIRLIK.md`, `YAPILACAKLAR.md`, `ANTIGRAVITY-GOREVLER.md`).
  - #185: TV5Monde & DELE Ahora telif ve kullanım şartları araştırma raporu (`docs/kaynaklar/tv5monde-dele-ahora.md`).
- Antigravity 6. tur (#187, #190):
  - 6.1: LibriVox ses kitapları bölüm bazlı metin-ses eşleştirme (`scripts/build-audiobook-chapters.ts`, `src/data/audiobooks/{fr,es}.json`, `src/data/audiobooks.ts`, `docs/kaynaklar/audiobooks-chapters.md`). 23 doğrulanmış bölüm (13 FR + 10 ES).
  - 6.3: Yeni özelliklere kapsamlı birim testleri (`src/ui/shared/useSwipeAway.test.tsx`, `src/ui/verbs/LabTourCard.test.tsx`, `src/ui/dictionary/TranslateScreen.test.tsx`, `src/ui/session/SessionForgot.test.tsx`, `src/engine/__tests__/listenFollow.test.ts`).
  - 6.4: Erişilebilirlik (a11y) test kapsamının genişletilmesi (`e2e/a11y.e2e.ts`: Çeviri ekranı açık/koyu/sakin tema ve sonuç durumları, okuma dışarıda çalış ve çekimler kartları, oturum unuttum soru ve cevap durumları, çevrimdışı rozeti axe taramaları, `clippedContent` ikon denetimi).
  - 6.5: Metin denetimi raporu (`docs/METIN-DENETIMI.md`), Diloloji isim güncellemesi (`README.md`, `package.json`, `extension/`).
  - 6.6: Performans ve bundle boyutu analiz raporu (`docs/PERFORMANS.md`).
  - Hızlı eklenen kelimelerde hedef liste şeffaflığı: Sözlük (`NotFound`, `SavedCard`, `DayWord`), Okuma (`WordCard`) ve `MissingWords` ekranlarında kelimenin hangi listeye gideceği `.word-hero-target-tag` etiketiyle açıkça gösterildi.

- Claude Code (#168 ve sonrası):
  - Çekim listesi (`textForms.ts`, bileşik zamanlar, fiil tekrarına ekleme köprüsü),
  - Büyük ekran dosyalarının bölünmesi (`Onboarding`, `SessionSummary`, `AppScreens`, `appNav`, `lazyScreens`, `AppSidebar`, `ReadingLibrary`, `CoverageCard`, `WordCard`),
  - Dinlerken takip geliştirmeleri (`listenFollow.ts`, `Listening.tsx`),
- Çeviri (#111, #113, #114, #120): DeepL ile cümle çevirisi (her cihazda hazır), Çeviri ekranı, çeviri belleği, okumada "Cümlenin Türkçesi" ve paragraf altında "Türkçesi".
- Dinleme ve üretim (#118, #122):
  - dinlerken duyulan cümle aydınlanır, "Bu cümleden dinle" (`src/engine/listenFollow.ts`; zamanlı altyazılı beslemelerde kesin, diğerlerinde yaklaşık);
  - Okuma → "Dikte": metin cümle cümle dinlenip yazılır (`src/ui/reading/TextDictation.tsx`);
  - Oyunlar → "Geri çeviri": çeviri belleğindeki cümleler Türkçesinden yazılır, denenen her cümle cümle kartı olur (`src/engine/backTranslation.ts`).
- Dinleme ve konuşma devamı (#125, #127): dikte hataları kaydedilir (`src/engine/earMisses.ts`, `meta 'earMisses'`, yedek + eşitleme) → Oyunlar → "Kaçırdıkların" ve İlerleme kartı; Okuma → "Gölgele" (cümle cümle, kaydın kendi sesiyle; `ShadowControls` her sesle çalışır). Ses panelinin `rangeRef`'i parça bitince çözülen Promise döndürür.
- CEFR seviyeleri (#129): FLELex/ELELex → `src/data/cefr/{fr,es}.txt` (`scripts/build-cefr.ts`, CC BY-NC-SA, `SOURCE.md`); kelime ayrıntısı/sözlükte seviye, İlerleme'de seviyeye göre kapsam, eksik kelimelerde A1–B2. Uygulamadaki eski "seviye sistemi" bilerek kaldırılmıştı; bu yalnızca ölçüm ve seçim için.
- Metin seviyesi tahmini denendi, **yapılmadı**: kısa metinlerde konuya özgü kelimeler (%7–15) listelerde olmadığı için tahmin gürültülü çıktı; kişisel kapsam (%) daha iyi gösterge.
- Yazma denetimi (#131): LanguageTool'un ücretsiz API'si tarayıcıdan doğrudan (CORS açık), yalnızca dokununca; Günlük ve Hikaye özetinde. Şartları: dakikada ≤20 istek, görünür bağlantı.
- İçerik kaynakları raporu ve listeleri (#130, #135, #137, #138): `docs/kaynaklar/` (açık lisanslı hikâyeler, transkriptli podcastler, tam envanter).
- Kolay resimli hikâyeler (#133): Global Storybooks'tan 29 FR + 29 ES (CC BY), `scripts/build-storybooks.ts` → `src/data/storybooks/{fr,es}.json` (sayfa metni, tam ses, sayfa resimleri, künye, sayfa sayfa Türkçe). Okuma → "Kolay resimli hikâyeler"; `ReadingText.turkish/images/credit`; "Türkçesi" bu metinlerde kendi Türkçesini kullanır (DeepL'e gitmez). Listede `audioUrl` yalnızca başlık sayfasının sesiydi; tam ses sayfadaki `#audioplayer`'dan alınır.
- Güvenlik ve yeni alan adı (#139): `nigalingo.online` izni, CSP (report-only), `docs/GUVENLIK.md`, güvenlik başlıkları (`x-frame-options`, `strict-transport-security` vb.).
- Hata koruması ve savunmacı tarihler (#136, #148): okuma kütüphanesinde `Date` saklanan metinler (`addedTime()`, #136); `meta` ve yedek kayıtlarında `Date` veya `{}` gelebilecek alanların çökmesini önleyen savunmacı `timeOf()` ve otomatik normalizasyon (#148).
- Veri araştırmaları (#142–#147): `docs/veri/` altında isim cinsiyeti tamamlama (#142), fiil kapsamı (#143), İspanyolca ses kaynakları (#144), eksik Türkçe anlamlar (#145), Tatoeba örnek cümle kapsamı (#146), bozuk ses bağlantıları denetimi (#147).
- Animasyon denetimi (#141): `docs/ANIMASYON-DENETIMI.md` hareket tokenları ve takılma analizleri.
- Bugün sadeleşti (#116): tek öneri, uzun günde "yeni kelimeyi 8'e indir", ek çalışma günün tekrarı bitince; tekrarlar bitince cümle kartı / geri çeviri kutucuğu (#124).
- Rozetler (#103, #105, #107, #109, #110, #112): kazanılma günlüğü, kademeli rozetler, zaman tüneli.
- Antigravity: #101, #102, #104, #106, #108, #115 (metin birliği), #117/#119/#123/#126 (Fast Refresh uyarıları; oxlint artık 0 uyarı), #121 (kararsız E2E), #128 (img alt metinleri), #130, #135, #137, #138, #141–#148.
- Fiil laboratuvarı sadeleştirme (#90 günlük tur, #93 3 sekme/4 mod, #97 arama şeridi + katlı listeler, #99 sade ders başlığı). Tur mantığı: `src/engine/labTour.ts`.
- Fiil laboratuvarı listesi (#71–#77).
- Tasarım kuralları `DESIGN.md` (#79).
- Kişisel öğrenme analizinden çıkanlar:
  - #80: oyunlarda tekrar zamanı gelen kelime gerçek tekrar sayılır;
  - #81: Oyunlar'da "önce bugünkü tekrarlar" notu;
  - #82: okumada sona gelince karşılaşmalar kaydedilir;
  - #84: deyimler cümle içinde sorulur;
  - #85: Zamana karşı'da yazma modu.
- Görsel dokunuşlar (#86).
- Kod temizliği (#87) ve sözlük dizini hızlandırma (#88).
- Antigravity: #64–#70, #83, #91 (satır içi stiller), #92 (kategori renk tokenları).

- **Rehber sınav havuzu (2026-10-17, 15. tur Antigravity ile paylaşıldı: `docs/ANTIGRAVITY-GOREVLER.md` §15):** dersin sınavı artık havuzdan 3 soru çeker: `lesson.check` (kendi 3 sorusu) + `src/data/guide/checks/*.json` (`checkPools.ts`, `import.meta.glob`: yeni dosya = yeni soru; biçim `{language, source, lessons: {<topic>: [{prompt, options, answer, why}]}}`, dosya adı dil koduyla başlar). `lessonOf.ts` `checkPool` (kendi + ek, aynı `prompt` bir kez), `checkFor` (karıştırır, şıkları da karıştırır: "hepsi doğru" gibi konuma bağlı şık varsa sırayı korur), `tryFor` ("Hemen dene") havuzda sınavın çekmediklerinden de besler. `checkPools.test.ts` biçimi, benzersizliği ve ders anahtarlarının varlığını denetler; **`POOL_REQUIRED` şimdi 3, Antigravity 15.1'i bitirince 10 yapılacak.** Ders listesi/havuz sayıları `docs/veri/rehber-ders-listesi.md` (`WRITE_GUIDE_MANIFEST=1 npx vitest run src/data/guide/guideManifest.test.ts` ile yeniden üretilir). **Yerel tuzak:** `import.meta.glob` klasörüne yeni dosya koyunca vitest o modülün eski çıktısını `node_modules/.vitest-cache`ten sunabilir (yeni dosya "yok" görünür): `rm -rf node_modules/.vitest-cache`. Sırada (Claude Code): tekrarda havuzdan seçme ve yanlışları öne alma, seviye belirleme ekranı (15.4 verisiyle), "Bugünün dersi" + haftalık hedef, Rehber rozetleri, ders sayfasında adımlar/mini gezinti, iki katmanlı ilerleme çubuğu, terim kartı (15.3 verisiyle), "Bu dersin kelimeleri", "Hata bildir", 15.2 raporunun uygulanması.
- **Rehber turu, 2026-10-18 (Antigravity 15. tur ile paylaşıldı):** (1) **Bugünün dersi** (`GuideLessonNudge`: yol sırasındaki ders + `lessonMinutes` + haftalık hedef `Settings.guideGoal`, `engine/guideGoal.ts`; Rehber ilerleme kartında hedef seçici) ve **Seviyeni bul** önerisi (`GuidePlacementNudge`, ≥5 kendi kelimesi, Rehber'i kullanmamış, bir kez; `Screen guide { placement }`). (2) **Ders adımları** (`LessonSteps`: Öğren/Gör/Dene/Sına yapışık çubuk; sınav sırasında gizlenir, yoksa soruyu örter ve axe `target-size` verir) ve iki katmanlı ilerleme çubuğu (okundu / öğrenildi). (3) **Sınav sırası:** önce son seferde yanlış, sonra hiç sorulmamış, sonra en eski doğru (`engine/guideQuestions.ts`, cihaza özel `localStorage 'diloloji:guide-questions:<dil>'`, eşitlenmez). (4) **Seviye testi** (`PlacementView`, `engine/guidePlacement.ts`, veri `data/guide/placement/*.json`: kolaydan zora, %60 altı seviyede biter; "biliyorum say" dersleri `KNOWN_DAY` (2000-01-01) ile okundu işaretler, öğrenildi değil, tekrar adımı dolu: XP/sertifika/haftalık hedef şişmez, `markKnown`/`unmarkKnown`). (5) **Terim kartı** (`data/guide/terms.ts` `termsIn`, `LessonTerms`; veri `terms/*.json`). (6) **Hata bildir** (`ReportIssue`, `GuideReportsCard`, `engine/guideReports.ts`; cihazda `localStorage 'diloloji:guide-reports'`, "Hepsini kopyala" ile yazara verilir, eşitlenmez). (7) **Birleşen dersler:** `data/guide/aliases.ts` (`LESSON_ALIASES`), açılışta `loadMarks` ilerlemeyi taşır (`migrateAliasedMarks`); ders silmek yerine her zaman buraya satır ekle. (8) İçerik denetimi uygulaması ve yapılmayanlar: `docs/veri/rehber-icerik-denetimi.md` §8. **Depo** `nigalingobydilkolog` adına taşındı (eski ad yönlendirir; bu oturumun git yetkisi eski ad için, `origin` adresini yeni ada çevirme).
- **Üç yeni haber beslemesi (2026-10-11, Antigravity 11.6 raporu, `docs/kaynaklar/gunun-haberi.md` §8):** `salut-linfo` (FR, çocuklar için franceinfo bülteni, A2–B1, sesli), `hoyhablamos` (ES, B1–B2, sesli), `bbc-6min` (EN, 6 Minute English, sesli). BBC beslemesi `http://` yazdığı için `FEEDS`te `upgradeHttp: true`: `parseFeed(xml, { upgradeHttp })` yalnızca o beslemede bağlantı ve ses adresini https'e çevirir (diğerlerinde http öğeler hâlâ elenir). **Doğrulandı (Antigravity 12.1, #267, `docs/kaynaklar/gunun-haberi.md` §9):** madde bağlantılarının alan adları (`hosts`: radiofrance.fr/franceinfo.fr, hoyhablamos.com, bbc.co.uk/bbc.com) canlı ağda sınandı: üç besleme de 5/5 madde `allowedArticle`dan geçer, metin ve ses akışı çalışır; değişiklik gerekmedi. Bir madde yine de "açılmıyor" derse `scripts/check-news-feeds.ts --feeds <kimlik>` çıktısındaki gerçek `link` alan adına bak. Hepsi telifli içerik: yalnızca kullanıcı isteyince okunur, kopyası saklanır ama paylaşılmaz.
- **Bileşik zaman denetimi uygulandı (2026-10-11, Antigravity 11.3 raporu, `docs/veri/bilesik-zaman-denetimi.md`):** `textForms.ts` `compoundAt` (metin, `compoundsAround` ve yazılan çekim aynı kuralı kullanır): araya `-ment/-mente` zarfları girebilir (`isBetween`), ters soru (`a-t-il compris`, `deInvert`), edilgen zincir (`ont été retrouvés` → *retrouver*, `PASSIVE_PP`), `s'en est allé` / `nous nous en sommes` (`reflexivePronoun` en/y). `tenses.ts` `INVARIANT_PP`: plaire, pleuvoir… ortacı çoğul/dişil almaz ("n'ont plus" artık *plaire* değil); tek başına `plus` çekim listesine girmez. **Kişisiz bileşik biçimler (2026-10-11):** `infinitif-passe` (*après avoir mangé*, *sans être parti*), `participe-compose` (*ayant mangé*), `infinitivo-compuesto` (*después de haber comido*, *haberme dicho*), `gerundio-compuesto` (*habiendo comido*) yeni `Tense` değerleri; kişi yok (`persons` boş), fiil laboratuvarında listelenmez, yalnızca okuyucu/Çekimler bulur. Fransızca `être` + ortaç yalnızca edat/kip fiilinden sonra (`BE_INFINITIVE_LEADS`) ya da `d'` ile mastar sayılır (tek başına "être parti" öneri vermez); `INFINITIVE_LEADS` yazılan çekimde baştaki edatı atar; İspanyolca bitişik zamirler `esAuxOf` ile ayıklanır. **Tuzak kelime denetimi (11.5):** `trapOf` aksansız karşılaştırır (`fr-college` kaydı `collège` sayfasında çıkar); kayıt kimlikleri günlük anahtarı olduğu için aksansız kaldı, `looks` yalın, `trap` "yalnızca" almaz, `meaning`de "(veya …)" yok (`traps.test.ts` denetler).
- **Antigravity turu (2026-10-20):** (1) **Davet edenin adı:** `FriendsCard.tsx` davet linkine `&kimden=Ad` ekler (`invite.ts` `cleanName`, `captureInvite`, `pendingInviteInfo`), `Landing.tsx` tanıdık bir isimle sıcak karşılama kartı gösterir (#565). (2) **Tanıtım sayfası mobil ergonomisi:** hero buton aralıkları, davet karşılama kartı, değer önerisi çipleri ve bölüm ritmi ferahlatıldı (#566). (3) **Haftalık özet mailinde kişisel hedef:** `weekLine` (`weekly.ts`) kullanıcının günlük yeni kelime hedefine göre "bu hafta N kelime daha" veya "haftalık hedefe ulaşıldı" satırı ekler; sunucu `cleanWeek` (`push.ts`) bu deseni katı regex ile doğrular (#569). (4) **Birleşik canlı duman testi:** `verify-deploy.mjs` ve `smoke-live.mjs` birleştirildi; başlıklar, bundle Supabase anahtarları, açık API uçları ve gerçek canlı hesapla tam eşitleme turu tek komutta (#570). (5) **`loadGame` tek geçişli optimizasyon:** 8+ dizi filtresi tek bir $O(N)$ döngüye indirgendi, `longestStreakFromDays` ile 30 bin olayda ~16 ms'de hesaplanır; matematiksel denklik testi `loadGamePerfEquivalence.test.ts` (#571).

- Antigravity 12. tur maddeleri (12.2–12.9).
- `docs/ANTIGRAVITY-GOREVLER.md`: Antigravity'nin görev listesi (turlar, dosya sahipliği, PR kontrol listesi).
