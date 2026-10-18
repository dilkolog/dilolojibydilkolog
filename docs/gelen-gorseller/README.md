# Gelen görseller

Nano Banana Pro (ya da başka bir araçla) ürettiğin görselleri **buraya yükle**; ajan buradan alıp işler ve uygulamaya bağlar.

## Nasıl yüklenir
- GitHub'da bu klasörü aç → **Add file → Upload files** → görselleri sürükle → **main** dalına commit et.
- Ya da Claude Code/Antigravity oturumunda dosya olarak ekle (sohbete yapıştırılan görsel çoğu zaman yalnızca ekranda görünür, dosya olarak kaydedilmez).

## Kurallar
- **Dosya adı serbest**, ama anlamlı olsun (ör. `rozet-amblemleri.jpg`, `gorev-simgeleri.png`). İçinde ne olduğunu ve kaç parça olduğunu istemde söylemen yeterli.
- Bir dosyada bir set (ızgara) olabilir; ajan parçalara ayırır.
- JPG ya da PNG; beyaz ya da düz zemin olsun. "Şeffaf" diye damalı zemin çizdiren görseller de gelebilir: ajan o zemini söker.
- İşlenen görseller `src/assets/art/` altına WebP olarak girer; buradaki kaynak dosyalar yedek olarak kalır (silmene gerek yok).

## İşlenenler (2026-10-13)
Kıyafetli Monki (B), seri alevi, hesap durumları, hayvan avatarları, ayarlar simgeleri, liste kapakları, Monki çıkartmaları ve görev simgeleri işlendi ve bağlandı (`AGENTS.md` "Çizimler, dördüncü parti"). Rozet amblemleri (10) zaten `emblem-*`/`medal-*` olarak kullanılıyor; yeniden bağlanmadı.

## İşlenenler (2026-10-14)
- **A sayfa başlıkları** (`eğitim:oyun.jpg`) → `head-*.webp`: Kelimeler, Oyunlar, Ayarlar, Sözlük, Çeviri, Yaz & konuş, Hikâye, Cümle kartları başlıkları.
- **B oturum tepkileri** (`Monki reactions.jpg`) → `react-*.webp`: cevap kutusunun üstünde (doğru / yanlış / unuttum); selam, yeni kelime ve seri tepkileri hazır bekliyor.
- **C boş durumlar** (`Monki holding a broom.jpg`) → `scene-*.webp`: Hatalar (hepsi düzeldi), Cümle kartları, Resim etiketleme, boş ortak liste.
- **D paylaşım afişleri** (`Three separate horizontal banners .jpg`) → `share-{streak,level,week}.webp`: seviye atlama, seri rozetleri ve haftanın özeti paylaşımı.
- **E logo** (`monki head.jpg`): denendi, sahibi beğenmedi (2026-10-14); kenar çubuğu, ilk açılış, hesap ekranı ve sekme simgesi (`favicon.svg`) yine eski yaprak/konuşma balonu (`BrandMark`). Uygulama simgesi (`public/pwa-*`) Monki kaldı.

## İşlenenler (2026-10-18)
- **Yeni görev simgeleri seti (9)** (`Gemini_Generated_Image_z8y6ogz8y6ogz8y6.jpg`): 3x3 ızgara ayrıştırıldı, beyaz arka planı antialiasing ile şeffaflaştırıldı ve `src/assets/art/quest-{sprout,target,chain,recall,dictation,ear,dialogue,speed,trophy}.webp` olarak kaydedildi.
- `src/ui/drawnArt.ts` içindeki `QUEST_ART` haritasına bağlandı; haftalık meydan okumalardaki geçici fallback simgeleri (`studyDays` -> `questSpeed`, `bossWins` -> `questTrophy`, `journalEntries` -> `questDictation`) doğrudan kendi özel çizimlerine kavuştu. `NEW_QUEST_ART` nesnesiyle dışa aktarıldı.

## Bekleyenler
Yok. Yeni set gelirse buraya yükle; adını ve kaç parça olduğunu yaz.
