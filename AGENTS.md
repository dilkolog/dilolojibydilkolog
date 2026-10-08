# Kelime Koçu — ajanlar için devir notu

Bu dosya, projede çalışacak bir yapay zekâ ajanının (Claude Code'dan devralan) bilmesi gerekenleri toplar.
Son güncelleme: 2026-10-08.

## Kullanıcıyla çalışma kuralları
- **Kullanıcıya her yanıt Türkçe.** Özet, rapor, liste, soru, ara notlar dahil. İngilizce özet verme (kullanıcı birkaç kez itiraz etti).
- Kod, kod yorumları ve commit mesajları İngilizce (projenin mevcut dili). PR başlık/açıklamaları Türkçe.
- **CI'ı geçen (yeşil) PR'ları kullanıcıya sormadan sırayla birleştir** (`gh pr merge N --merge --delete-branch`); kullanıcı her seferinde onay istenmesinden yoruldu (2026-10-08). Kırmızıysa önce düzelt. Birleştirdiklerini kısaca Türkçe bildir.
- Tasarımda sitenin kendi sınıflarını/bileşenlerini kullan (`card`, `section-title`, `chip`, `btn`, `Toggle`, `ConfirmDialog`, `note`, `habit-nudge`, `hour-list`, `Popover`/`MenuItem`…); yeni görsel dil uydurma.
- CI'ı sürekli yoklama (polling) yapma; sonuç gerekiyorsa bir kez bak.
- **Üst üste kurulu PR'larda:** alttakini birleştirmeden ÖNCE üstündekinin tabanını main'e çevir (`gh pr edit <üstteki> --base main`). Yoksa `--delete-branch` taban dalı silince GitHub üstteki PR'ı kapatır (2026-10-08'de #49'da oldu; dal geri oluşturulup PR yeniden açıldı).
- Commit sonu: `Co-Authored-By: <model adı> <noreply@…>` tarzı bir satır kullanılıyordu; PR açıklaması sonu "🤖 Generated with …" satırı. Kendi aracının kuralına uy.

## Proje
- React 19 + Vite 8 PWA, Dexie/IndexedDB (`src/data/db.ts`), FSRS (`ts-fsrs`) ile aralıklı tekrar, Vercel Functions (`api/`), Vercel Blob (eşitleme, şifreli). Vercel planı **Hobby** (cron günde 1 kez → 24 ayrı günlük cron kullanılıyor, #44).
- Diller: EN/FR/ES öğreniliyor, arayüz Türkçe.
- Komutlar:
  - `npm run typecheck` (= `tsc -b && tsc -p tsconfig.api.json`)
  - `npx oxlint src api e2e`
  - `npx vitest run` (birim, ~790 test)
  - `npx vite build && npx playwright test e2e/phone.e2e.ts e2e/desktop.e2e.ts e2e/a11y.e2e.ts --workers=4` (E2E, ~2 dk)
  - Görsel testler: `e2e/visual.e2e.ts` — referanslar **yalnızca Linux** (`*-linux.png`). macOS'ta `--ignore-snapshots` ile çalıştır. **`*-darwin.png` dosyalarını asla commit etme.**
- Referans görüntüleri yenilemek: `gh workflow run snapshots.yml --ref <dal>` (CI'da Linux'ta çeker, iki kez doğrular, dala commit eder).
- CI: `.github/workflows/ci.yml` — `check` + e2e 3 parça.

## Bilinen tuzaklar
- **macOS dosya sistemi büyük/küçük harf duyarsız:** `twinTense.ts` ile `TwinTense.tsx` aynı klasörde olamaz (tsc hata verir). Mantık dosyasına farklı ad ver (ör. `tenseTwin.ts`, `moodRound.ts`).
- Playwright'ın `page.clock` sabit saati, sahte `Date`'i IndexedDB'ye düz nesne olarak yazdırır. Tarih okurken `addedTime()` gibi savunmacı yardımcılar kullan (`src/engine/types.ts`).
- E2E'de örnek kelimeler yüklendikten sonra `packApplied(page)` (e2e/helpers.ts) sözlük paketinin uygulanmasını bekler (#53 ile geldi).
- Bir `useEffect` içinden gelen `reload` sonuçları dil değişince atılıyor (`languageRef`, #51 birleşti) — bu deseni koru.
- Kullanıcının makinesindeki `design-drift` eklentisinin kancası, yoldaki boşluk yüzünden her dosya yazımında hata basıyor; projeyle ilgisi yok.

## Açık PR'lar ve birleştirme sırası (2026-10-08 akşamı)
Birleşti: #37–#45, #47, #51, #44, #46, #48.

Bağımsız (main'e):
- **#52** kelime çalışması: gerçekçi süre, hatırlama erken, beceri sırası, iki oturum, ertesi gün cümlede, kazanımlar
- **#53** sözlük paketi sonradan eklenen kelimelere de uygulanıyor (+ kararsız görsel testin düzeltmesi)
- (#52 ve #53'ün son commit'ini referans yenileme botu attı; bot commit'i CI'ı tetiklemez → main'i dala alıp push et ki CI çalışsın.)

Fiil laboratuvarı yığını — **bu sırayla**, her adımda önce üsttekinin tabanını main'e çevir:
1. **#49** temel zamanlara göre ustalık + hata türüne göre alıştırma (taban: main)
2. **#50** gerçek cümlede çekim + öteki dilde aynı fiil (taban: verb-lab-mastery)
3. **#54** tek "Fiillerim" listesi, Zorlandıklarım → Ustalık, başlık sadeleştirme (taban: verb-lab-sentences)
4. **#55** kip seçimi, Söyle modu, kalıp tablosu, Bugün'de fiil ısınması (taban: verb-lab-2)

#52 ve #53 kendi ekran görüntüsü referanslarını yeniledi; ikisi birden birleşince `e2e/visual.e2e.ts-snapshots/*.png` çakışabilir → birleştirmelerden sonra referansları `gh workflow run snapshots.yml --ref <dal>` ile yeniden çek.

## Yarım kalan işler
1. **FR/EN Lingua Libre sesleri → sözlük paketi.**
   - Dal: `fr-en-audio` (betik `scripts/fetch-commons-audio.ts` ağ hatalarına dayanıklı ve kaldığı yerden devam eder hâle getirildi; henüz PR yok).
   - Girdiler: **`~/kelime-koc-data/kaikki/`** (proje dışında; ~7 GB, Vite/git/editör taramasın diye). İçerik: kaikki dökümleri (English/French/Spanish.jsonl, trwiktionary.jsonl, eswiktionary.jsonl) ve `lingualibre-en.audio.json`, `lingualibre-es.audio.json`, `lingualibre-fr.audio.json`. Klasör yoksa dökümler https://kaikki.org/ adresinden yeniden indirilebilir. (2026-10-08'de buraya taşındı; FR listesi tamam: 306.569 kelime.)
   - FR listesi: `npx rolldown scripts/fetch-commons-audio.ts -o /tmp/a.mjs -p node && node /tmp/a.mjs fr ~/kelime-koc-data/kaikki/lingualibre-fr.audio.json` (yarıda kalırsa aynı komut `.partial`'dan devam eder).
   - Paket: `npx rolldown scripts/build-wordpack.ts -o /tmp/w.mjs -p node && node /tmp/w.mjs <yeni-sürüm> <jsonl'ler…> <*.audio.json'lar…>`; sürümü değiştir (ör. `2026-10-08.1`), cümleler için `scripts/build-pack-sentences.ts`. Sonra PR.
2. **Laboratuvar sekmeleri için kullanım sayacı** — #46 (screenUsage.ts) birleşince `VerbLab` sekme değişimlerinde `recordVisit('verbs:<tab>')`.
3. **Ekran görüntüsü referanslarının genel yenilenmesi** (yukarıda).
4. **SYNC_ALLOWED** (api/_allow.ts) etkinleştirme ertelendi: kullanıcının kullanıcı adı gerekiyor; yanlış ad kullanıcının kendi eşitlemesini kapatır.

## Kullanıcıya önerilen ama onun yapacağı
- Ayarlar'da günlük yeni kelimeyi 20'den 5–8'e indirmesi (#52 birleşince Ayarlar "N yap" önerir).
- İsterse yedek dosyasını (Ayarlar → Veriler → Yedeği indir) proje klasörüne koyup kişisel öğrenme analizi istemesi.

## Daha fazla bağlam
- `PLAN.md`, `docs/YAPILACAKLAR.md` (yapılanlar ve açık kalanlar, tarihli notlar), `docs/YOUTUBE.md`.
- PR açıklamaları neyin neden yapıldığını Türkçe ve ayrıntılı anlatıyor: `gh pr view N`.
