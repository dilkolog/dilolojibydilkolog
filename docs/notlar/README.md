# Notlar dizini

AGENTS.md ajan için **kısa** devir notudur (kurallar, komutlar, tuzaklar). Konuya özgü ayrıntılı notlar burada.
Bir konuya dokunmadan önce ilgili dosyayı oku; notlardaki "yukarıdaki/aşağıdaki … notu" göndermeleri başka bir dosyada olabilir, `grep -rn "<ifade>" docs/notlar` ile ara.

**2026-11-08 güncellemesi:** `vercel.json` kaldırıldı, güvenlik başlıkları `security-headers.json`da (yalnızca `headers`; `functions`/`crons` Vercel'e özeldi). Sunucu kodu depoya `api/_blob.ts` üzerinden erişir (üretimde `wrangler.jsonc` `alias`ı onu R2'ye yönlendirir). Eski notlardaki `vercel.json` ve doğrudan `@vercel/blob` geçen yerler bu iki değişikliğe işaret eder.

| Dosya | Konu |
|---|---|
| [android-play.md](android-play.md) | **Android uygulaması (Play).** TWA kabuğu, Play Store süreci, kapalı test. |
| [bugun-ayarlar-arayuz.md](bugun-ayarlar-arayuz.md) | **Bugün, Ayarlar ve arayüz.** Bugün ekranı, Ayarlar, oturum ekranı, kısayollar, statik sayfalar, performans. |
| [calisma-ortami-test.md](calisma-ortami-test.md) | **Çalışma ortamı ve testler.** Depo, iki ajan düzeni, E2E portu ve kararsız testler, PR notları. |
| [gecmis-turlar.md](gecmis-turlar.md) | **Geçmiş turlar ve durum kayıtları.** Tarihli durum notları (Antigravity ve Claude Code), bitmiş turlar, eski devir notları. |
| [hesap-esitleme.md](hesap-esitleme.md) | **Hesap, giriş ve eşitleme.** Supabase girişi, onay, eşitleme motoru ve birleştirme kuralları, yedek, cihaz tercihleri, şifre. |
| [icerik.md](icerik.md) | **İçerik.** Rehber dışı içerik turları: kelime listeleri, B2–C1 içerik, içerik fabrikası, veri yamaları, sözlük paketi. |
| [kelimeler-listeler-sozluk.md](kelimeler-listeler-sozluk.md) | **Kelimeler, listeler ve sözlük.** Kelime sayfası, listeler, sözlük, kartlar, içe/dışa aktarma. |
| [monki-yz.md](monki-yz.md) | **Monki ve yapay zekâ.** Sitenin YZ anahtarı, düzeyler ve maliyet, Monki sohbeti ve modları, YZ özellikleri. |
| [ogrenme-motoru.md](ogrenme-motoru.md) | **Öğrenme motoru ve kişisel algoritma.** Soru türü seçimi, bağlam sorularının kapısı, ölçüm soruları, sülük yardımı, hafıza modeli. |
| [okuma-dinleme.md](okuma-dinleme.md) | **Okuma, dinleme ve video.** Okuma ekranı, metin ekleme (PDF, Word, bağlantı, fotoğraf), YouTube ve video, sesli kitap, haberler, dikte, gölgeleme. |
| [oyunlar.md](oyunlar.md) | **Oyunlar.** Oyunlar ekranı ve tek tek oyunlar. |
| [rehber-dersler-fiiller.md](rehber-dersler-fiiller.md) | **Rehber, dersler ve fiil laboratuvarı.** Rehber dersleri, sınav havuzu, fiil laboratuvarı, çekim ve zaman verisi, örnek cümleler. |
| [sunucu-guvenlik-dagitim.md](sunucu-guvenlik-dagitim.md) | **Sunucu, güvenlik ve dağıtım.** Cloudflare Worker, R2, Supabase tabloları, kotalar, güvenlik, e-posta/push, dağıtım ve hesap silme notları. |
| [tanitim-sayfasi.md](tanitim-sayfasi.md) | **Tanıtım sayfası.** Tanıtım (landing) sayfası, ilk açılış, dile göre paylaşım sayfaları ve giriş sayfası. |
| [tasarim-cizim-ses.md](tasarim-cizim-ses.md) | **Tasarım, çizimler ve ses.** Çizim setleri, simgeler, avatarlar, hareket, ses kimliği, yazdırma. |
| [tur-notlari.md](tur-notlari.md) | **Tur notları (çok konulu).** Birden çok konuyu içeren tarihli iş turları. |
| [xp-rozet-sosyal.md](xp-rozet-sosyal.md) | **XP, rozetler, bildirimler ve sosyal özellikler.** XP kuralları, rozetler, seviye, bildirim merkezi, arkadaşlar, lig, davet, şikâyet ve engelleme. |
| [yapilacaklar-fikirler.md](yapilacaklar-fikirler.md) | **Yapılacaklar ve fikirler.** Tasarım iyileştirme listesi, sıradaki olası işler, kullanıcıya önerilenler. |

- [Memrise çalışma mantığı — internet araştırması (13 Kasım 2026)](memrise-arastirmasi-2026-11-13.md): kaynaklı ürün incelemesi, sürüm farkları ve Diloloji önerileri.

- [Eski Memrise öğrenme motoru — derinleştirme (13 Kasım 2026)](eski-memrise-ogrenme-motoru-2026-11-13.md): klasik edinim, hata kuyruğu, test yönü, tolerans ve yeniden kurulum sözleşmesi.
