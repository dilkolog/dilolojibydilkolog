# Yapılacaklar ve fikirler

> Tasarım iyileştirme listesi, sıradaki olası işler, kullanıcıya önerilenler.
> AGENTS.md'den 2026-11-08'de konuya göre ayrıldı; notlar tarihlidir, kronolojik sıralı değildir. Kurallar ve tuzaklar için `AGENTS.md`.

## Tasarım iyileştirme listesi (2026-10-13, sıradaki Claude yapar; önem sırasıyla)
1. ~~**Koyu ve sakin temada çizimleri denetle.**~~ Yapıldı (2026-10-14). Bütün çizimler koyu (`#1e293b`) ve sakin (`#1d2027`) zeminde, 40 ve 72 px boyutta tek sayfada denendi; her ekran da iki temada, telefonda ve masaüstünde görüntülendi. Hiçbiri okunmaz değildi, ama koyu kahve dış çizgiler zemine karışıyordu (en çok: Bugün'deki 22 px seri koru `streak-0`, ejderha madalyası, dal/köprü sahneleri). Çözüm tek bir token: `--art-edge` (açıkta `none`, koyu ve sakinde `drop-shadow(0 0 1px rgb(255 255 255 / 0.5))`). `index.css`teki tek kural bunu çizim gösteren bütün `<img>` sınıflarına uygular (`streak-picture`, `quest-art`, `wl-cover`, `avatar img`…). **Yeni bir çizim sınıfı eklenirse o listeye koy** (DESIGN.md "Çizim Kenarı Kuralı"). Arka plan levhası (`.art-plate`) denendi ama karakterleri kutuya hapsettiği için seçilmedi.
2. ~~**Hazır ama kullanılmayan çizimler.**~~ Yapıldı (2026-10-14): ortak `ui/Sticker.tsx` (`<Sticker name size className>`). Yerleri: `sleep` → Bugün "Bugün tekrar yok", Fiil laboratuvarı tekrar boşken, Cümle kartları tekrar beklemiyorken, Geri dönüş noktaları boşken; `think` → Hikâye yazılırken ve Notlarından sınav hazırlanırken (`.sticker-wait`, bekleme süresince nefes alır), YZ kullanımı boşken, fiil listesi boşken; `cry` → Haber/Dinleme getirilemeyince; `read` → okuma bitince; `music` → Sesli tekrar bitince, Kaçırdıkların boşken; `coffee` → günün ilk yarısı bitince (özet); `thumbs` → her oyunun sonunda %100'de (`GameResult`), zorluk kartı boşken; `heart` → Sözlük "Kaydettiklerin", favori fiil listesi boşken; `hello` → Resim etiketleme ve topluluk kütüphanesi boşken. `badge-*` (emblem'lerin kopyası) ve `onb-flags` (Fransız bayrağı yok) silindi. `quest-read/speak` o görevler gelene kadar bekliyor. Toast'lara çıkartma konmadı (DESIGN.md "Tek Set Kuralı").
3. ~~**Düz metinle kalan boş durumlar.**~~ Yapıldı (2026-10-14): `EmptyState` artık `sticker` de alır (`art` yerine); Kaçırdıkların, Geri çeviri (`art="sentences"`), Resim etiketleme `EmptyState` oldu; zorluk kartı, YZ kullanımı, Geri dönüş noktaları, topluluk kütüphanesi ve fiil listesi `.sticker-note` (küçük çıkartma + metin). Cümle kartları zaten `EmptyState`ti.
**Kullanıcının kararı (2026-10-14): tasarım işleri (4–8) sonraya kaldı; öncelik kod ve içerik.**
4. **Sayfa başlıklarında Monki yok:** `PageHeader art` yalnızca Okuma, Telaffuz, İlerleme, Fiil lab'da; Kelimeler, Oyunlar, Ayarlar, Sözlük, Çeviri, Yaz ve konuş, Hikâye, Cümle kartları için yeni poz gerekir (kullanıcı üretir: arama, çeviri, oyun…).
5. **Bugün ve oturum:** seri alevi yan menü/İlerleme/Profil'de hâlâ eski SVG; yeni kelime tanıtım ve hatırlatma kartlarında Monki yok; oturumda doğru/yanlış cevapta küçük yüz (`face-*` hazır, yalnızca sohbette); oturum başında kısa selam yok.
6. **Marka:** sahibi Monki başlı logoyu beğenmedi (2026-10-14): kenar çubuğu, ilk açılış, hesap ekranı ve `favicon.svg` eski yaprak/balon; uygulama simgesi (`public/pwa-*`) hâlâ Monki (onu da eskisine çevirmek isterse sahibine sor). Paylaşım kartı yalnızca rozet ve kilometre taşında; seri, seviye atlama, haftalık özet için de eklenebilir.
7. **Görsel test referansları** (Linux) yenilenmeli: Actions kotası dönünce `gh workflow run snapshots.yml --ref main` (Bugün, Ayarlar, Profil, Oyunlar, oturum, karşılama değişti).
8. **Kullanıcının üretebileceği yeni görseller (isteğe bağlı):** sayfa başlığı pozları, 3–4 boş durum sahnesi (hatalar, cümle kartı, resim etiketleme, ortak liste), oturum içi doğru/yanlış tepkileri, bitki büyüme aşamaları.

## Sıradaki olası işler
- LibriVox + Gutenberg (B1+ sesli kitaplar), COERLL (Français interactif) dil bilgisi içeriği — `docs/kaynaklar` raporundaki sıra.
- Kullanıcı 1–2 hafta sonra yeni yedek verince öğrenme analizi: geri çeviri ve dikte kullanılıyor mu, dikte en çok hangi kelimeleri kaçırıyor, cümle kartlarının tutma oranı.
- Fiil laboratuvarı Ayarlar → Kullanım'daki sayımlara bakıp hiç kullanılmayan modları sadeleştirmek (birkaç hafta veri birikince).

## Kullanıcıya önerilen ama onun yapacağı
- Ayarlar'da günlük yeni kelimeyi 20'den 5–8'e indirmesi (#52 birleşince Ayarlar "N yap" önerir).
- İsterse yedek dosyasını (Ayarlar → Veriler → Yedeği indir) proje klasörüne koyup kişisel öğrenme analizi istemesi.
