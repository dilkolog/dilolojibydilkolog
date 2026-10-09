# Öğrenme Kaynakları Dizini

Bu dizin, Kelime Koçu'nun dinleme ve okuma kütüphanesine dahil edilebilecek açık lisanslı kolay hikâyeleri ve transkriptli yabancı dil podcastlerini belgeler.

---

## ⚡️ Doğrudan Uygulamaya Eklenebilir Kaynaklar (Zamanlı Altyazılı)

Aşağıdaki podcast beslemeleri, RSS akışlarında senkronize zamanlı altyazı (`<podcast:transcript>` türü WebVTT) sağladığı doğrulanmıştır. Kelime Koçu'nun dinleme ve cümle takip altyapısına (`src/engine/podcasts.ts`, `listenFollow.ts`) doğrudan bağlanabilir:

1. **Spanish Language Coach · Spanish for False Beginners** (İspanyolca, A2)
   - **RSS:** `https://rss.buzzsprout.com/2437041.rss`
   - **Altyazı:** WebVTT (`text/vtt`)
   - **Durum:** Doğrulandı (`verified: true`, `timedTranscript: "vtt"`). Buzzsprout üzerinden her bölüm için zaman damgalı altyazı sağlar.
2. **Radio Ambulante** (İspanyolca, B1-B2)
   - **RSS:** `https://www.omnycontent.com/d/playlist/e73c998e-6e60-432f-8610-ae210140c5b1/b3c9b6e7-72ba-45c4-aff9-b1e7012d213b/092b66a8-4329-4183-bb12-b1e7012d216f/podcast.rss`
   - **Altyazı:** WebVTT (`text/vtt`)
   - **Durum:** Doğrulandı (`verified: true`, `timedTranscript: "vtt"`). Omny Studio üzerinden VTT altyazı sağlar.

---

## 1. Kolay Sesli Hikâyeler (`storybooks.json`)

**Toplam Öğe Sayısı:** 90 hikâye (45 Fransızca, 45 İspanyolca)

- **Sesli Hikâyeler (58 adet):** 29 Fransızca ve 29 İspanyolca hikâye. Global Storybooks platformu üzerinden hem yazılı metin hem de profesyonel seslendirme (`audioUrl`) içerir. Listenin başında yer alırlar.
- **Yalnızca Metin Hikâyeler (`storybooks-text.json`, 32 adet):** 16 Fransızca (African Storybook) ve 16 İspanyolca (StoryWeaver) hikâye. Sayfa sayfa metinler, yazar, çizer, çevirmen ve CC BY lisans bilgileri ayrıntılı olarak çıkarılmıştır. Fransızca hikâyelerin 16'sının da tüm sayfa metinleri eksiksiz kaydedilmiştir. StoryWeaver (İspanyolca) platformu sayfa metinleri için oturum açma zorunluluğu (HTTP 401) getirdiğinden bu hikâyeler künye bilgileriyle listelenip hata durumuyla belgelenmiştir.

### Lisans ve Erişim Notları:
- **Lisans Filtresi:** Tüm hikâyeler kesin olarak **CC BY 3.0** ya da **CC BY 4.0** lisanslıdır. Global Storybooks'taki 11 Fransızca ve 11 İspanyolca hikâye ticari olmayan kullanım kısıtı taşıdığı için (`CC BY-NC`) elenmiş ve listeye alınmamıştır.
- **Ses Dosyaları:** Ses kayıtları UBC/Global Storybooks sunucularında (`globalstorybooks.net/media/audio/...`) barındırılmaktadır ve her hikâye için doğrudan MP3 bağlantısı sağlanmıştır.
- **StoryWeaver ve African Storybook:** StoryWeaver API'si ve web sayfaları Cloudflare koruması altında olduğundan toplu veri çekimlerinde istek sıklığına (rate limiting) dikkat edilmelidir.

---

## 2. İspanyolca Podcastler (`podcasts-es.json`)

**Toplam Öğe Sayısı:** 11 podcast şovu

- **Ücretsiz Transkript Sunanlar (7 şov):**
  - *Spanish Language Coach · Spanish for False Beginners* (RSS'te zamanlı altyazı mevcuttur)
  - *Siempre Spanish Beginner Podcast* (web sayfasında ücretsiz tam metin)
  - *Español con Juan* (web sitesinde blog yazısı olarak ücretsiz)
  - *Unlimited Spanish with Oscar* (web sitesinde ücretsiz metin ve PDF)
  - *Radio Ambulante* (web sitesinde eksiksiz transkript ücretsiz)
  - *Duolingo Spanish Podcast* (bölüm bazlı iki dilli transkript webde ücretsiz)
  - *LanguaTalk Spanish* (web sitesinde etkileşimli transkript)
- **Ücretli / Abonelik Gerektiren Transkriptler (4 şov):**
  - *Hoy Hablamos* (orta seviye günlük) ve *Hoy Hablamos Básico* (ücretli üyelik gerektirir)
  - *Charlas Hispanas* (ücretli üyelik gerektirir)
  - *Notes in Spanish Intermediate* (çalışma kağıtları ayrı satılır)

### Zamanlı Altyazı (`podcast:transcript`):
- *Spanish Language Coach* şovları Buzzsprout altyapısında olup doğrudan RSS akışında `<podcast:transcript>` etiketiyle senkronize VTT/SRT bağlantısı sağlar (kelime/cümle takibi için idealdir).

---

## 3. Fransızca Podcastler (`podcasts-fr.json`)

**Toplam Öğe Sayısı:** 9 podcast şovu (RFI yayınları halihazırda uygulamada entegre olduğundan listeye dahil edilmemiştir)

- **Ücretsiz Transkript Sunanlar (7 şov):**
  - *innerFrench* (Hugo Cotton): Tüm bölümlerin tam metin transkripti web sitesinde ücretsizdir.
  - *LanguaTalk Slow French* (Gaëlle): Web sitesinde interaktif transkript ücretsizdir.
  - *Duolingo French Podcast*: İki dilli tam transkript ücretsizdir.
  - *Français Authentique* (Johan Tekfak): Transkript ve PDF web sitesinde ücretsizdir.
  - *Français avec Pierre*: Bölüm metinleri blog yazısı olarak ücretsizdir.
  - *Choses à Savoir - Culture générale*: Kısa 2-3 dakikalık kültürel bölümlerin tam makale metni web sitesinde ücretsizdir.
  - *France Inter · Géopolitique*: Günlük köşe yazısı web sitesinde makale olarak ücretsiz mevcuttur.
- **Ücretli / Abonelik Gerektiren Transkriptler (2 şov):**
  - *One Thing In A French Day*: Tam transkript ücretli haftalık bülten aboneliği gerektirir.
  - *Learn French by Podcast*: Ayrıntılı ders kılavuzları satın alınır.

### Telif ve Erişim Notları:
- Podcast sesleri ve transkript metinleri genel olarak telif hakkına tabidir (All Rights Reserved). Uygulama içinde yerel veritabanında depolamak yerine kullanıcının web sayfası bağlantısına yönlendirilmesi veya meşru açık transkript akışlarından (VTT/SRT) dinamik olarak okunması tavsiye edilir.
