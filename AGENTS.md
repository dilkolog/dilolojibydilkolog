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
- CI: `.github/workflows/ci.yml` — `check` + e2e 3 parça.

## Bilinen tuzaklar
- **macOS dosya sistemi büyük/küçük harf duyarsız:** `twinTense.ts` ile `TwinTense.tsx` aynı klasörde olamaz (tsc hata verir). Mantık dosyasına farklı ad ver (ör. `tenseTwin.ts`, `moodRound.ts`).
- Playwright'ın `page.clock` sabit saati, sahte `Date`'i IndexedDB'ye düz nesne olarak yazdırır. Tarih okurken `addedTime()` gibi savunmacı yardımcılar kullan (`src/engine/types.ts`).
- E2E'de örnek kelimeler yüklendikten sonra `packApplied(page)` (e2e/helpers.ts) sözlük paketinin uygulanmasını bekler (#53 ile geldi).
- Örnek cümlenin `form` alanı boş (`''`) olabilir (#62): kelime cümlede geçmiyor demek. Boşluk doldurma/bağlam soruları `form`u olan cümleleri kullanır; yeni kod da `ex.form`un dolu olduğunu varsaymasın.
- Fiil laboratuvarı verisi: `LabData` (`src/engine/labProgress.ts`): `records['fiil|zaman']`, `tally['zaman|kişi']` (`weakestCell`, `weakPersons`), `kinds` (hata türleri). Kayıt için `recordLabAnswer` (`src/ui/verbs/labShared.ts`).
- Bir `useEffect` içinden gelen `reload` sonuçları dil değişince atılıyor (`languageRef`, #51 birleşti) — bu deseni koru.
- Kullanıcının makinesindeki `design-drift` eklentisinin kancası, yoldaki boşluk yüzünden her dosya yazımında hata basıyor; projeyle ilgisi yok.

## Durum (2026-10-08 akşamı, Claude Code'dan devir)
Birleşti: #37–#61 (fiil laboratuvarı yığını, kelime çalışması, oturuma fiil çekimleri #59, tabloda zayıf kişiler #61 dahil).

Açık:
- **#62** (`import-row-reason`) toplu eklemede satırın neden eklenemediğini yazıyor; kelimenin geçmediği cümle de ekleniyor (boşluk doldurmada kullanılmıyor, `form: ''`). Yerelde tüm testler geçti; CI yeşilse birleştir.
- **Bu devir notunun PR'ı** (`agents-handoff`): yeşilse birleştir.

## Görevler (sırayla; her biri ayrı küçük PR)
Kullanıcı fiil laboratuvarı fikirlerini "sırayla, parça parça" istedi. 1 (#59) ve 2 (#61) bitti. Kalanlar:

1. **Laboratuvar sekme/mod kullanım sayacı.** `src/ui/screenUsage.ts` içindeki `recordVisit(screen)` var. `src/ui/verbs/VerbLab.tsx` içinde `setTab` her çağrıldığında `recordVisit(`verbs:${t}`)`, alıştırma modu değişince `recordVisit(`verbs:practice:${mode}`)`. Kullanım özeti (`usageSummary`) nerede gösteriliyorsa (Ayarlar/İlerleme) laboratuvar satırlarının okunur Türkçe adları olsun. Birim testi ekle.
2. **Okuma → laboratuvar köprüsü.** Okuma'da (`src/ui/Reading.tsx`) çekimli bir fiile dokununca açılan kartta "Fiil laboratuvarında aç" düğmesi: laboratuvarı o fiil + o zamanla açsın (Reading zaten `{ form, lemma, tense }` çıkarıyor, ~399. satır). App'te VerbLab'e başlangıç fiili/zamanı geçirme yolu var mı bak (`openVerbLab` e2e yardımcısı ve `initialTab` örnek).
3. **Bugün'de "Günün fiili" kartı.** Fiillerim listesinden (yoksa sıklık listesinden) güne göre sabit bir fiil (labShared'deki `dayPerson` gibi kararlı hash), tek dokunuşla laboratuvarda açılsın. Mevcut kart sınıflarını (`card`, `habit-nudge`) kullan; Bugün ekranını kalabalıklaştırma, ısınma kartıyla birlikte tek satır olabilir.
4. **Çekimlerin altında Türkçe karşılık** (bekliyorum, bekliyorsun…). Önce présent/presente ve passé composé/pretérito. Türkçe ünlü uyumu ve ünsüz yumuşaması dikkat (gitmek → gidiyorum, beklemek → bekliyorum, okumak → okuyorum). Fiilin Türkçe anlamı sözlük paketinden (`usePackGloss`). Emin olunmayan durumda hiç gösterme. Bol birim testi.
5. **Ustalıkta zaman içinde ilerleme** (Ustalık sekmesi): haftalık doğru/yanlış ya da ustalık puanı çizgisi. Gerekirse `LabData`'ya günlük özet alanı ekle (eski veriyle uyumlu, opsiyonel alan).
6. **Telefonda kaydırarak zaman değiştirme:** tablo üzerinde yatay kaydırma (swipe) ile `TenseBar`'daki ←/→ ile aynı sırada önceki/sonraki zaman. Dikey kaydırmayı bozmasın.
7. **Ezber modu bildim/bilemedim kaydı:** LearnTab'daki Ezber (gizli tablo, `• • •`'e dokunup açma) sonunda "bildim / bilemedim" kaydı → `recordForm` / `recordCheck` ile ustalığa sayılsın.

Diğer işler (fiil maddelerinden sonra ya da kullanıcı isterse):
- **Sözlük paketi + FR/EN/ES Lingua Libre sesleri** (aşağıda "Yarım kalan işler" 1). Girdilerin hepsi hazır: `~/kelime-koc-data/kaikki/` (FR ses listesi de tamam).
- **Tasarım kuralları:** kullanıcı Antigravity'nin `premium-design` becerisi / AGENTS.md'ye tasarım bölümü hazırlamasını istiyordu; bu dosya main'de, hazırlanabilir.
- Görsel test referansları değişen ekranlarda `gh workflow run snapshots.yml --ref <dal>` ile yenilenmeli.

## Kullanıcıya önerilen ama onun yapacağı
- Ayarlar'da günlük yeni kelimeyi 20'den 5–8'e indirmesi (#52 birleşince Ayarlar "N yap" önerir).
- İsterse yedek dosyasını (Ayarlar → Veriler → Yedeği indir) proje klasörüne koyup kişisel öğrenme analizi istemesi.

## Daha fazla bağlam
- `PLAN.md`, `docs/YAPILACAKLAR.md` (yapılanlar ve açık kalanlar, tarihli notlar), `docs/YOUTUBE.md`.
- PR açıklamaları neyin neden yapıldığını Türkçe ve ayrıntılı anlatıyor: `gh pr view N`.
