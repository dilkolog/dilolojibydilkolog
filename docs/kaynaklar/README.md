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
- **Global Storybooks Tüm Hikâyeler Envanteri (`storybooks-all.json`, 80 adet):** Global Storybooks platformundaki 40 Fransızca ve 40 İspanyolca hikâyenin tamamı listelenmiştir. Her hikâye için kimlik (`0001`…), başlık, seviye (1–5), sayfadaki özgün lisans metni, ses kaydı (`hasAudio`), Türkçe sürüm (`hasTurkish`) ve Kelime Koçu'nda yer alma durumu (`inApp`) belgelenmiştir. 58 hikâye (29 FR + 29 ES) uygulamada entegredir (`inApp: true`); kalan 22 hikâye CC BY-NC lisansı nedeniyle elenmiştir (`inApp: false`).

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

---

## 4. B1+ Klasik Sesli Kitaplar (`audiobooks-fr.json`, `audiobooks-es.json`)

**Toplam Öğe Sayısı:** 35 doğrulanmış eser (17 Fransızca, 18 İspanyolca)

LibriVox ve Project Gutenberg işbirliğiyle hazırlanan, B1–B2 seviyesindeki dil öğrenenler için uygun uzunlukta (kısa öykü, fabl, bölümlü anlatı) kamu malı klasik eserler.

### Fransızca Sesli Kitaplar (`audiobooks-fr.json`, 17 adet):
- **Jean de La Fontaine:** *Fables de La Fontaine* (Livre 01, 02, 03, 04, 05 — hayvanlar üzerinden ahlak ve insan doğası dersleri; B1)
- **Charles Perrault:** *Histoires ou Contes du temps passé avec des moralités* (Cendrillon, Le Petit Chaperon rouge, Le Chat botté; B1) ve *Contes en vers* (Peau d'Âne, Grisélidis; B1)
- **Guy de Maupassant:** *Le Horla* (psikolojik gerilim başyapıtı; B2), *Les contes de la bécasse* (Normandiya kırsalı öyküleri; B1)
- **Alphonse Daudet:** *Lettres de mon moulin* (La chèvre de M. Seguin, Le secret de Maître Cornille; B1), *Tartarin de Tarascon* (Güney Fransa mizahı; B1)
- **Victor Hugo:** *Claude Gueux* (toplumsal adalet ve vicdan romanı; B2)
- **Émile Zola:** *J'accuse...!* (Dreyfus Olayı açık mektubu; B2)
- **Jules Verne:** *Les forceurs de blocus* (Amerikan İç Savaşı deniz serüveni; B2)
- **Prosper Mérimée:** *Carmen et la Vénus d'Ille* (tutkulu Çingene Carmen ve esrarengiz heykel; B2)
- **Jules Lemaître:** *ABC: Petits Contes* (harflerle başlayan kısa ve eğitici masallar; B1)
- **Voltaire:** *Candide ou L'optimisme* (felsefi yergi ve hayat dersi; B2)

### İspanyolca Sesli Kitaplar (`audiobooks-es.json`, 18 adet):
- **Esopo (çev. Townsend):** *Las Fábulas de Esopo* (Cilt 1, 3, 4 — kısa ve akıcı antik fabllar; B1)
- **Horacio Quiroga:** *Cuentos de la selva para los niños* (yağmur ormanı hayvan masalları; B1), *Cuentos de Amor de Locura y de Muerte* (sarsıcı Latin Amerika öyküleri; B2)
- **Gustavo Adolfo Bécquer:** *Rimas* (lirik romantik dörtlükler; B1), *Leyendas* (Orta Çağ gotik efsaneleri; B2)
- **Pedro Antonio de Alarcón:** *El Capitán Veneno* (huysuz askerin aşkla yumuşaması; B1), *Novelas Cortas* (gerçekçi kısa anlatılar; B2)
- **Rubén Darío:** *Abrojos* (erken dönem modernizm şiirleri; B1), *Simplemente Darío* (seçme lirik şiirler; B1)
- **Guy de Maupassant (çev. İspanyolca):** *Bola de sebo* (Fransa-Prusya savaşı taşra taşlaması; B1)
- **Charles Perrault (çev. İspanyolca):** *Cuentos de Hadas* (klasik masalların edebi İspanyolcası; B1)
- **Jacob & Wilhelm Grimm (çev. José S. Viedma):** *Cuentos de Hadas* (Cilt 1 ve Cilt 2 — Pamuk Prenses, Külkedisi; B1)
- **Abraham Valdelomar:** *El Caballero Carmelo* (Peru edebiyatının onur ve sevgi temalı horoz öyküsü; B1)
- **Esteban Echeverría:** *La Cautiva* (Arjantin pampalarında cesur kurtuluş destanı; B2)
- **Anonim Tarihi Metin:** *Historia de la célebre Reina de España Doña Juana* ('Deli Juana'nın trajik hikâyesi; B1)

### Doğrulama ve Teknik Standartlar:
- **Doğrudan MP3 Erişimi:** Tüm ses dosyaları `archive.org/download/...` üzerinden doğrudan ve CORS dostu MP3 URL'si olarak sağlanır. `HEAD` isteği ile HTTP 200 ve `audio/mpeg` durumu doğrulanmıştır.
- **Doğrulanmış Metinler:** Project Gutenberg (`gutenberg.org/ebooks/...`) veya Wikisource üzerinden eşleşen tam metin bağlantıları mevcuttur; tüm bağlantılar HTTP 200 döndürmektedir.
- **Kamu Malı Güvencesi:** Tüm eserlerin yazarları 70+ yıl önce vefat etmiş olup metinleri kamu malıdır (Public Domain). LibriVox gönüllü seslendirmeleri ise CC0 / Public Domain olarak lisanslanmıştır.

---

## 5. Dil Bilgisi Açık Kaynak Araştırması (`coerll.md`)

- **UT Austin COERLL (Français interactif):** CC BY 4.0 açık lisanslı ~600 sayfalık ders kitabı ve zengin dil bilgisi/alıştırma arşivi. A1'den B2'ye tam müfredat sağlar; doğrudan uygulamaya entegrasyon için tam uygundur.
- **Spanish Grammar in Context:** CC BY-NC-SA 4.0 lisanslıdır; ticari olmayan (NC) kısıt nedeniyle doğrudan koda eklenmez, harici bağlantı olarak önerilir.

---

## 6. İçerik Kullanım Şartları ve Telif Hakları Araştırması (`tv5monde-dele-ahora.md`)

- **TV5Monde (Apprendre le français):** Kamu yayıncısı konsorsiyumu; tüm hakları saklıdır (All Rights Reserved). Açık lisans yoktur. Doğrudan içerik kopyalama yasaktır; harici link verme serbesttir.
- **DELE Ahora (deleahora.com):** Özel yayın girişimi; tüm hakları saklıdır. Ücretsiz web alıştırmaları reklam/e-kitap modeliyle çalışır. Kopyalama kesinlikle yasaktır; harici link serbesttir.
- Rapor, her iki platform için telif analizini, karar matrisini ve resmi izin talep e-posta taslaklarını içerir.

---

## 7. Bölüm Bazlı Metin-Ses Eşleştirilmiş Klasik Ses Kitapları (`audiobooks-chapters.md`)

- **Bölüm Parçalama:** `scripts/build-round17-audiobooks.ts` Gutenberg metinlerini bölüm bölüm ayıklar ve LibriVox doğrudan MP3 bağlantılarıyla (`HEAD` ile doğrulanmış HTTP 200) eşleştirir.
- **Veri Dosyaları:** 
  - `src/data/audiobooks/fr.json` (28 bölüm; Daudet *Lettres de mon moulin*, Voltaire *Candide*, Maupassant, La Fontaine)
  - `src/data/audiobooks/es.json` (25 bölüm; Quiroga *Cuentos de Amor de Locura y de Muerte*, Bécquer *Leyendas*)
  - `src/data/audiobooks/en.json` (17 bölüm; Oscar Wilde *The Happy Prince*, Lewis Carroll *Alice's Adventures in Wonderland* — ilk İngilizce kütüphanesi)
- **Entegrasyon Modülü:** `src/data/audiobooks.ts` (`loadAudiobookChapters`, `chapterToReadingText`).

---

## 8. İngilizce Sesli İçerik Envanteri (`english-audio.md`)

- **Global Storybooks English:** CC BY 4.0 açık lisanslı ~30 resimli hikâye ve tam ses kaydı (A1–B1). Hemen eklenebilir.
- **VOA Learning English:** US Kamu Malı (Public Domain); CORS açık doğrudan MP3'ler ve basitleştirilmiş seviyeli haberler (B1–B2). Hemen eklenebilir.
- **LibriVox + Project Gutenberg (İngilizce):** Kamu Malı (Public Domain); B1–B2 klasik kısa öyküler bölüm bazlı eşleştirilebilir.
- **Simple English Wikipedia (Spoken Articles):** CC BY-SA 4.0; sesli ansiklopedi makaleleri.
- **BBC Learning English (6 Minute English):** Tüm hakları saklıdır (All Rights Reserved); üçüncü taraf uygulamalara içerik gömmek YASAKTIR. Yalnızca harici bağlantı verilebilir.

---

## 9. Açık Lisanslı Gramer Alıştırmaları Envanteri (`gramer-alistirmalari.md`)

- **Açık Kaynaklar (CC BY / OER):** UT Austin COERLL (*Tex's French Grammar*, *Spanish Grammar in Context*), Boise State University (*Français inclusif*), ASCCC OERI (*Entrada Libre*), OER Commons (*Advanced Academic Grammar for ESL*).
- **Zor Seviye (B2/C1) Konu Dağılımı:** Fransızca subjonctif istisnaları, participe passé uyumları, pronoms relatifs composés; İspanyolca subjuntivo vs indicativo derin ayrımları, ser/estar, por/para; İngilizce inversion, cleft sentences, mixed conditionals.
- **Entegrasyon Yolları:** Pressbooks `.h5p` arşivlerinden `content.json` çıkarma, açık AnkiWeb desteleri (`.apkg`), Tatoeba regex tabanlı otomatik cloze motoru.
- **Karar Seçenekleri:** Claude Code için 3 mimari alternatif ve standart `GrammarExercise` JSON şeması.

---

## 10. Tuzak Kelimeler (Yalancı Eşdeğerler) Envanteri (`tuzak-kelimeler.md`)

- **Genişletme:** `src/data/traps/fr-2.json` (+40), `es-2.json` (+40), `en-2.json` (+41) ile toplam 121 yeni doğrulanmış tuzak kelime.
- **Kapsam:** İngilizceye benzeyenler (*cave, actual, contestar, sensible*) ve Fransızca/İngilizce kökenli Türkçe kelimelerin hedef dilde farklı anlam taşıdığı durumlar (*baston, chef, patron, servant, pasta, cola, cabinet, season, condition*).
- **Veri Kalitesi:** Tüm lemmalar benzersiz kimliklerle (`<dil>-<lemma>`) ve özgün doğal örnek cümlelerle `src/data/traps.test.ts` testlerinden geçmektedir.

---

## 11. Günün Mikro Haberi Kaynak Araştırması (`gunun-haberi.md`)

- **Kapsam:** RFI (Journal en français facile), VOA Learning English (As It Is), VOA Noticias en español, RTVE ve DW beslemeleri.
- **Doğrulanmış Bağlantılar:** RFI güncel podcast RSS (`rfi.fr/fr/podcasts/journal-français-facile/podcast`), Audiomeans CDN doğrudan MP3 ve CORS `*` akışı; VOA Public Domain ses ve tam transkript altyapısı.
- **Karar:** Fransızca için RFI (1. tercih), İngilizce ve İspanyolca için VOA (kamu malı lisansı ile 1. tercih). RTVE indirme engeli nedeniyle elenmiştir.

---

## 12. Açık Lisanslı Dilbilgisi Kaynakları Raporu (`acik-dilbilgisi.md`)

- **Kapsam:** İspanyolca ve İngilizce için telif sorunu olmayan (CC BY 4.0 veya CC0) açık eğitim kaynakları (OER).
- **İspanyolca Kaynaklar:** *¡Chévere! Introductory Spanish* (SUNY OER, CC BY 4.0), *Ahora Entendemos* (Denise Hatcher, CC BY 4.0), *Tarea Libre* (CCC OER, CC BY 4.0).
- **İngilizce Kaynaklar:** *ESL Grammar: The Way You Like It* (Don Bissonnette, CC BY 4.0), *College ESL Writers: Applied Grammar and Composing Strategies* (Hall & Wallace, CC BY 4.0).
- **Alıştırma Verileri:** UT Austin / COERLL *Français interactif* (CC BY 4.0) kaynaklı 60 yeni Fransızca dilbilgisi sorusu (`src/data/grammar/fr-fi-1.json`, `fr-fi-2.json`).





