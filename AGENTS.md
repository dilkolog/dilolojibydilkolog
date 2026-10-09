# Kelime Koçu — ajanlar için devir notu

Bu dosya, projede çalışacak bir yapay zekâ ajanının (Claude Code'dan devralan) bilmesi gerekenleri toplar.
Son güncelleme: 2026-10-09.

## Kullanıcıyla çalışma kuralları
- **Kullanıcıya her yanıt Türkçe.** Özet, rapor, liste, soru, ara notlar dahil. İngilizce özet verme (kullanıcı birkaç kez itiraz etti).
- Kod, kod yorumları ve commit mesajları İngilizce (projenin mevcut dili). PR başlık/açıklamaları Türkçe.
- **CI'ı geçen (yeşil) PR'ları kullanıcıya sormadan sırayla birleştir** (`gh pr merge N --merge --delete-branch`); kullanıcı her seferinde onay istenmesinden yoruldu (2026-10-08). Kırmızıysa önce düzelt. Birleştirdiklerini kısaca Türkçe bildir.
- **Tasarım kuralları: `DESIGN.md`** (renk/yazı/köşe/gölge/hareket tokenları, bileşenler, Yap/Yapma, bilinen sapmalar). Arayüz yazmadan önce oku. Sitenin kendi sınıflarını/bileşenlerini kullan (`card`, `section-title`, `chip`, `btn`, `Toggle`, `ConfirmDialog`, `note`, `habit-nudge`, `hour-list`, `Popover`/`MenuItem`…); yeni görsel dil uydurma.
- CI'ı sürekli yoklama (polling) yapma; sonuç gerekiyorsa bir kez bak.
- **Üst üste kurulu PR'larda:** alttakini birleştirmeden ÖNCE üstündekinin tabanını main'e çevir (`gh pr edit <üstteki> --base main`). Yoksa `--delete-branch` taban dalı silince GitHub üstteki PR'ı kapatır (2026-10-08'de #49'da oldu; dal geri oluşturulup PR yeniden açıldı).
- Commit sonu: `Co-Authored-By: <model adı> <noreply@…>` tarzı bir satır kullanılıyordu; PR açıklaması sonu "🤖 Generated with …" satırı. Kendi aracının kuralına uy.

## Proje
- React 19 + Vite 8 PWA, Dexie/IndexedDB (`src/data/db.ts`), FSRS (`ts-fsrs`) ile aralıklı tekrar, Vercel Functions (`api/`), Vercel Blob (eşitleme, şifreli). Vercel planı **Hobby** (cron günde 1 kez → 24 ayrı günlük cron kullanılıyor, #44).
- Diller: EN/FR/ES öğreniliyor, arayüz Türkçe.
- Komutlar:
  - `npm run typecheck` (= `tsc -b && tsc -p tsconfig.api.json`)
  - `npx oxlint src api e2e`
  - `npx vitest run` (birim, ~900 test)
  - `npx vite build && npx playwright test e2e/phone.e2e.ts e2e/desktop.e2e.ts e2e/a11y.e2e.ts --workers=4` (E2E, ~3 dk; `E2E_PORT` için aşağıya bak)
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
- **`vite preview` `/api`'yi canlı siteye (kelime-koc.vercel.app) yönlendirir.** E2E'de `startWithSamples` çeviriyi varsayılan olarak 503 ile kapatır (yoksa testler gerçek DeepL'i çağırır). Çeviri isteyen test, başladıktan sonra kendi taklidini kurar; URL'yi glob ile değil, işlevle eşle: `(u) => u.pathname === '/api/translate' && u.searchParams.has('usage' | 'text')`.
- Sesli (dinleme) metinler okumada **önce gizli** açılır ("önce dinle" turları). Testte metne tıklamadan önce "Turları bırak"a bas.
- Çeviri: sunucu `api/translate.ts` (DeepL, anahtar Vercel ortam değişkeni `DEEPL_AUTH_KEY`; anahtarı asla koda ya da sohbete yazma). Her çeviri cihazdaki **çeviri belleğinde** (`meta 'translations'`, `src/engine/translationMemory.ts`) saklanır, yedeğe ve eşitlemeye girer; aynı cümle bir daha sunucuya gitmez. Kotayı koruyan kod (sırayla çeviri, yalnızca ekrana gelen paragraf) bu deseni bozmasın.
- Kullanıcının makinesindeki `design-drift` eklentisinin kancası, yoldaki boşluk yüzünden her dosya yazımında hata basıyor; projeyle ilgisi yok.

## Durum (2026-10-09)
Birleşti: #37–#124.
- Çeviri (#111, #113, #114, #120): DeepL ile cümle çevirisi (her cihazda hazır), Çeviri ekranı, çeviri belleği, okumada "Cümlenin Türkçesi" ve paragraf altında "Türkçesi".
- Dinleme ve üretim (#118, #122):
  - dinlerken duyulan cümle aydınlanır, "Bu cümleden dinle" (`src/engine/listenFollow.ts`; zamanlı altyazılı beslemelerde kesin, diğerlerinde yaklaşık);
  - Okuma → "Dikte": metin cümle cümle dinlenip yazılır (`src/ui/TextDictation.tsx`);
  - Oyunlar → "Geri çeviri": çeviri belleğindeki cümleler Türkçesinden yazılır, denenen her cümle cümle kartı olur (`src/engine/backTranslation.ts`).
- Bugün sadeleşti (#116): tek öneri, uzun günde "yeni kelimeyi 8'e indir", ek çalışma günün tekrarı bitince; tekrarlar bitince cümle kartı / geri çeviri kutucuğu (#124).
- Rozetler (#103, #105, #107, #109, #110, #112): kazanılma günlüğü, kademeli rozetler, zaman tüneli.
- Antigravity: #101, #102, #104, #106, #108, #115 (metin birliği), #117/#119/#123 (Fast Refresh uyarıları), #121 (kararsız E2E).
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

- Depo **özel (private)**; Actions kotası bu ay dolu, CI çalışmıyor. PR'lar yerelde tam doğrulamayla (typecheck, oxlint, vitest, E2E) birleştiriliyor. Görsel test referansları (Linux) kota dönünce `gh workflow run snapshots.yml --ref main` ile yenilenmeli (#86 sekme göstergesi, #81 Oyunlar notu, #85 Zamana karşı, #116 Bugün, #120/#122 okuma araç satırı ve Oyunlar değişti).
- **Aynı klasörde iki ajan:** Antigravity ile Claude Code aynı anda `~/Downloads/kelime-koc`'ta çalışınca, dal değiştirme commit edilmemiş değişiklikleri sildi (2026-10-08). Claude Code artık ayrı bir git worktree'de (`~/Downloads/kelime-koc-claude`) çalışıyor. Başka dala geçmeden önce `git status`'a bak; commit edilmemiş başkasına ait değişiklik varsa dokunma.
- **E2E portu:** iki klasör aynı anda test koşarsa aynı önizleme sunucusunu paylaşıp birbirinin derlemesini test eder (`reuseExistingServer`). Port `E2E_PORT` ile ayarlanır: Claude Code `E2E_PORT=4180`, Antigravity `E2E_PORT=4181`. İki ajan aynı anda yoğun test koşunca bazı birim/E2E testleri zaman aşımıyla düşebilir; tek başına tekrar çalıştırıp doğrula.

## Sıradaki olası işler
- Kullanıcı 1–2 hafta sonra yeni yedek verince öğrenme analizi: geri çeviri ve dikte kullanılıyor mu, dikte en çok hangi kelimeleri kaçırıyor, cümle kartlarının tutma oranı.
- Fiil laboratuvarı Ayarlar → Kullanım'daki sayımlara bakıp hiç kullanılmayan modları sadeleştirmek (birkaç hafta veri birikince).

## Kullanıcıya önerilen ama onun yapacağı
- Ayarlar'da günlük yeni kelimeyi 20'den 5–8'e indirmesi (#52 birleşince Ayarlar "N yap" önerir).
- İsterse yedek dosyasını (Ayarlar → Veriler → Yedeği indir) proje klasörüne koyup kişisel öğrenme analizi istemesi.

## Daha fazla bağlam
- `PLAN.md`, `docs/YAPILACAKLAR.md` (yapılanlar ve açık kalanlar, tarihli notlar), `docs/YOUTUBE.md`.
- PR açıklamaları neyin neden yapıldığını Türkçe ve ayrıntılı anlatıyor: `gh pr view N`.
