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
  - `npx vitest run` (birim, ~810 test)
  - `npx vite build && npx playwright test e2e/phone.e2e.ts e2e/desktop.e2e.ts e2e/a11y.e2e.ts --workers=4` (E2E, ~2 dk)
  - Görsel testler: `e2e/visual.e2e.ts` — referanslar **yalnızca Linux** (`*-linux.png`). macOS'ta `--ignore-snapshots` ile çalıştır. **`*-darwin.png` dosyalarını asla commit etme.**
- Referans görüntüleri yenilemek: `gh workflow run snapshots.yml --ref <dal>` (CI'da Linux'ta çeker, iki kez doğrular, dala commit eder).
- CI: `.github/workflows/ci.yml` — tek iş (kontrol + birim + E2E), yalnızca PR'larda; main'e push'ta ve yalnızca `.md`/`docs/` değişince çalışmaz, taslak PR'da çalışmaz. Elle: Actions → CI → Run workflow.
- **Actions dakikaları sınırlı** (özel depo, ücretsiz plan: ayda 2.000 dk; 2026-10-08'de doldu, işler "payments failed / spending limit" hatasıyla başlamadı). Gereksiz push yapma; bir PR'a art arda küçük commit'ler atmak yerine yerelde tam doğrulayıp tek seferde push'la. Ekran görüntüsü yenilemeyi (snapshots.yml) yalnızca görünüm gerçekten değiştiğinde çalıştır.

## Bilinen tuzaklar
- **macOS dosya sistemi büyük/küçük harf duyarsız:** `twinTense.ts` ile `TwinTense.tsx` aynı klasörde olamaz (tsc hata verir). Mantık dosyasına farklı ad ver (ör. `tenseTwin.ts`, `moodRound.ts`).
- Playwright'ın `page.clock` sabit saati, sahte `Date`'i IndexedDB'ye düz nesne olarak yazdırır. Tarih okurken `addedTime()` gibi savunmacı yardımcılar kullan (`src/engine/types.ts`).
- E2E'de örnek kelimeler yüklendikten sonra `packApplied(page)` (e2e/helpers.ts) sözlük paketinin uygulanmasını bekler (#53 ile geldi).
- Örnek cümlenin `form` alanı boş (`''`) olabilir (#62): kelime cümlede geçmiyor demek. Boşluk doldurma/bağlam soruları `form`u olan cümleleri kullanır; yeni kod da `ex.form`un dolu olduğunu varsaymasın.
- Fiil laboratuvarı verisi: `LabData` (`src/engine/labProgress.ts`): `records['fiil|zaman']`, `tally['zaman|kişi']` (`weakestCell`, `weakPersons`), `kinds` (hata türleri). Kayıt için `recordLabAnswer` (`src/ui/verbs/labShared.ts`).
- Bir `useEffect` içinden gelen `reload` sonuçları dil değişince atılıyor (`languageRef`, #51 birleşti) — bu deseni koru.
- Kullanıcının makinesindeki `design-drift` eklentisinin kancası, yoldaki boşluk yüzünden her dosya yazımında hata basıyor; projeyle ilgisi yok.

## Durum (2026-10-08 gece)
Birleşti: #37–#77. Fiil laboratuvarı görev listesinin 7 maddesi bitti (#71 kullanım sayacı, #72 Okuma→laboratuvar testi, #73 Günün fiili, #74 çekimlerin Türkçesi, #75 haftalık ilerleme, #76 kaydırarak zaman, #77 Ezber'de bildim/bilemedim). Antigravity: #64–#70 (sözlük paketi sesleri ve 35.000 kelime, kişisel sözlük, sözlükte keşif, podcast'ler, Vikidia, klasik metinler).

- Depo Actions kotası yüzünden **geçici olarak public** yapıldı (2026-10-08). Kullanıcının planı: iş bitince yeniden private'a almak; sonraki işlerde CI'ı az dakikayla çalıştırmak (yukarıdaki CI notu).
- Görsel test referansları: #73, #74, #76 için yenilendi; sonraki görünüm değişikliklerinde `gh workflow run snapshots.yml --ref <dal>`.

## Sıradaki olası işler
- Tasarım kuralları bölümü / `premium-design` becerisi (kullanıcı Antigravity'den istemişti, yapılmadı).
- Fiil laboratuvarı Ayarlar → Kullanım'daki sayımlara bakıp hiç kullanılmayan modları sadeleştirmek (birkaç hafta veri birikince).

## Kullanıcıya önerilen ama onun yapacağı
- Ayarlar'da günlük yeni kelimeyi 20'den 5–8'e indirmesi (#52 birleşince Ayarlar "N yap" önerir).
- İsterse yedek dosyasını (Ayarlar → Veriler → Yedeği indir) proje klasörüne koyup kişisel öğrenme analizi istemesi.

## Daha fazla bağlam
- `PLAN.md`, `docs/YAPILACAKLAR.md` (yapılanlar ve açık kalanlar, tarihli notlar), `docs/YOUTUBE.md`.
- PR açıklamaları neyin neden yapıldığını Türkçe ve ayrıntılı anlatıyor: `gh pr view N`.
