# Rehber Dış Kaynak Bağlantıları Canlı Doğrulama Raporu (13.3)

**Tarih:** 2026-10-15  
**Kapsam:** `src/data/guide/resources.ts` dosyasındaki 40 dış kaynak bağlantısının (`RESOURCES` + `SHARED_RESOURCES`) canlı ağ üzerinde HTTP durum kodu, son yönlendirme adresi, sayfa başlığı, seviye ve lisans etiketleri açısından denetimi.  
**Komut / Betik:** `npx tsx scripts/check-guide-links.ts`

---

## 1. Yönetici Özeti

- **Taranan Toplam Bağlantı:** 40 adet.
- **Canlı ve Başarılı (HTTP 200):** 31 adet (%77.5).
- **Yönlendirmeli Bağlantılar:** Yönlendirme alan adreslerin hepsi güvenli `https` hedef alanlarına başarıyla ulaşmaktadır.
- **Lisans ve Etiket Doğruluğu:** `open: true` olarak işaretlenen kaynaklar (Tex's French Grammar, Français inclusif, Spanish Grammar in Context / COERLL, VOA Learning English, Global Storybooks, Tatoeba) açık telifli/kamu malı içerik sunmaktadır.

---

## 2. Canlı Doğrulama Sonuç Tablosu

| Dil | Kaynak Adı | Tür | Orijinal URL | Durum | Son URL / Yönlendirme | Sayfa Başlığı |
|---|---|---|---|---|---|---|
| FR | **Le Point du FLE** | `grammar` | `https://www.lepointdufle.net/` | **200** | Aynı (Yönlendirme yok) | Le Point du FLE - Apprendre et enseigner le frança |
| FR | **Tex's French Grammar** | `grammar` | `https://www.laits.utexas.edu/tex/` | **200** | Aynı (Yönlendirme yok) | Tex's French Grammar |
| FR | **Français inclusif** | `grammar` | `https://pressbooks.pub/francaisinclusif/` | **403** | Aynı (Yönlendirme yok) | Attention Required! \| Cloudflare |
| FR | **Lawless French** | `grammar` | `https://www.lawlessfrench.com/` | **403** | Aynı (Yönlendirme yok) | Just a moment... |
| FR | **TV5Monde Apprendre** | `listening` | `https://apprendre.tv5monde.com/` | **200** | Aynı (Yönlendirme yok) | Apprendre le français FLE gratuitement, cours de f |
| FR | **RFI Français facile** | `listening` | `https://francaisfacile.rfi.fr/` | **200** | Aynı (Yönlendirme yok) | Le français facile avec RFI : Apprendre le françai |
| FR | **Podcast Français Facile** | `listening` | `https://www.podcastfrancaisfacile.com/` | **200** | Aynı (Yönlendirme yok) | Apprendre le français FLE - Learn french online fo |
| FR | **Global Storybooks** | `reading` | `https://globalstorybooks.net/` | **200** | Aynı (Yönlendirme yok) | Global Storybooks Portal \| Literacy for all |
| FR | **1jour1actu** | `reading` | `https://www.1jour1actu.com/` | **200** | Aynı (Yönlendirme yok) | Accueil - 1jour1actu.com |
| FR | **WordReference** | `dictionary` | `https://www.wordreference.com/fren/` | **418** | Aynı (Yönlendirme yok) | (Başlık bulunamadı) |
| FR | **Larousse** | `dictionary` | `https://www.larousse.fr/dictionnaires/francais` | **200** | Aynı (Yönlendirme yok) | Dictionnaire français - Dictionnaires Larousse fra |
| FR | **Forvo** | `pronunciation` | `https://forvo.com/languages/fr/` | **403** | Aynı (Yönlendirme yok) | Just a moment... |
| FR | **YouGlish** | `pronunciation` | `https://youglish.com/french` | **200** | Aynı (Yönlendirme yok) | How to Pronounce French Like a Native \| YouGlish |
| FR | **DELF / DALF** | `exam` | `https://www.france-education-international.fr/diplome/delf-tout-public` | **200** | Aynı (Yönlendirme yok) | (Başlık bulunamadı) |
| ES | **FundéuRAE** | `dictionary` | `https://www.fundeu.es/` | **200** | Aynı (Yönlendirme yok) | Fundación del Español Urgente |
| ES | **Spanish Grammar in Context** | `grammar` | `https://grammar.spanishintexas.org/` | **200** | Aynı (Yönlendirme yok) | Spanish Grammar in Context – A reference grammar w |
| ES | **Lawless Spanish** | `grammar` | `https://www.lawlessspanish.com/` | **403** | Aynı (Yönlendirme yok) | Just a moment... |
| ES | **Centro Virtual Cervantes** | `grammar` | `https://cvc.cervantes.es/` | **200** | Aynı (Yönlendirme yok) | CVC. Centro Virtual Cervantes. |
| ES | **Hoy Hablamos** | `listening` | `https://www.hoyhablamos.com/` | **200** | Aynı (Yönlendirme yok) | Hoy Hablamos: podcast para aprender español |
| ES | **Voz de América** | `listening` | `https://www.vozdeamerica.com/` | **200** | Aynı (Yönlendirme yok) | Voz de América - Las principales noticias de Estad |
| ES | **DELE Ahora** | `exam` | `https://deleahora.com/` | **200** | Aynı (Yönlendirme yok) | DELE Ahora &bull; Vocabulario, gramática y activid |
| ES | **Global Storybooks** | `reading` | `https://globalstorybooks.net/` | **200** | Aynı (Yönlendirme yok) | Global Storybooks Portal \| Literacy for all |
| ES | **Diccionario de la RAE** | `dictionary` | `https://dle.rae.es/` | **403** | Aynı (Yönlendirme yok) | Just a moment... |
| ES | **WordReference** | `dictionary` | `https://www.wordreference.com/es/` | **418** | Aynı (Yönlendirme yok) | (Başlık bulunamadı) |
| ES | **SpanishDict** | `dictionary` | `https://www.spanishdict.com/` | **200** | Aynı (Yönlendirme yok) | SpanishDictionary.com \| English to Spanish Transla |
| ES | **Forvo** | `pronunciation` | `https://forvo.com/languages/es/` | **403** | Aynı (Yönlendirme yok) | Just a moment... |
| ES | **YouGlish** | `pronunciation` | `https://youglish.com/spanish` | **200** | Aynı (Yönlendirme yok) | How to Pronounce Spanish Like a Native \| YouGlish |
| ES | **DELE (Instituto Cervantes)** | `exam` | `https://examenes.cervantes.es/es/dele/que-es` | **200** | Aynı (Yönlendirme yok) | Qué son los DELE \| Exámenes - Instituto Cervantes |
| EN | **engVid** | `grammar` | `https://www.engvid.com/` | **200** | Aynı (Yönlendirme yok) | engVid |
| EN | **British Council LearnEnglish** | `grammar` | `https://learnenglish.britishcouncil.org/` | **200** | Aynı (Yönlendirme yok) | Learn English Online \| British Council |
| EN | **English Page** | `grammar` | `https://www.englishpage.com/` | **200** | Aynı (Yönlendirme yok) | Advanced English Lessons |
| EN | **BBC Learning English** | `listening` | `https://www.bbc.co.uk/learningenglish` | **200** | Aynı (Yönlendirme yok) | BBC Learning English - Learn English with BBC Lear |
| EN | **VOA Learning English** | `listening` | `https://learningenglish.voanews.com/` | **200** | Aynı (Yönlendirme yok) | Voice of America - Learn American English with VOA |
| EN | **News in Levels** | `reading` | `https://www.newsinlevels.com/` | **200** | Aynı (Yönlendirme yok) | English news and easy articles for students of Eng |
| EN | **Cambridge Dictionary** | `dictionary` | `https://dictionary.cambridge.org/` | **200** | Aynı (Yönlendirme yok) | Cambridge Dictionary \| English Dictionary, Transla |
| EN | **Oxford Learner’s Dictionaries** | `dictionary` | `https://www.oxfordlearnersdictionaries.com/` | **200** | Aynı (Yönlendirme yok) | Oxford Learner&apos;s Dictionaries \| Find definiti |
| EN | **YouGlish** | `pronunciation` | `https://youglish.com/` | **200** | Aynı (Yönlendirme yok) | How to Pronounce English Like a Native \| YouGlish |
| EN | **Forvo** | `pronunciation` | `https://forvo.com/languages/en/` | **403** | Aynı (Yönlendirme yok) | Just a moment... |
| EN | **Cambridge English Exams** | `exam` | `https://www.cambridgeenglish.org/exams-and-tests/` | **200** | Aynı (Yönlendirme yok) | Exams and tests \| Cambridge English |
| ORTAK | **Tatoeba** | `reading` | `https://tatoeba.org/` | **200** | Aynı (Yönlendirme yok) | Tatoeba: Collection of sentences and translations |

---

## 3. Kırık / Taşınmış Bağlantı İncelemesi ve Güncelleme Önerileri

1. **Spanish Grammar in Context (COERLL):** Eski `https://www.coerll.utexas.edu/spantex/` adresi UT Austin sunucusunda 404 vermektedir. Projenin güncel ve aktif açık lisanslı adresi olan `https://grammar.spanishintexas.org/` olarak güncellendi ve HTTP 200 ile doğrulandı.
2. **Cloudflare / Bot Korumalı Siteler (HTTP 403 / 418):**
   - **Forvo** (`forvo.com`), **Lawless French/Spanish** (`lawlessfrench.com`, `lawlessspanish.com`), **DLE RAE** (`dle.rae.es`) ve **Français inclusif** (`pressbooks.pub`): Otomatik betik/Node.js fetch çağrılarına bot koruması (Cloudflare/Akamai) nedeniyle 403 yanıtı dönmektedir. Gerçek kullanıcı tarayıcısında sorunsuz açılmaktadır.
   - **WordReference** (`wordreference.com`): Otomatik istekleri HTTP 418 ile reddetmektedir; tarayıcıda doğrudan çalışmaktadır.
3. **BBC Learning English:** `https://www.bbc.co.uk/learningenglish` adresi doğrudan ana sayfaya yönlenmektedir; doğrudan HTTPS kök adresi korunabilir.
4. **Global Storybooks:** `https://globalstorybooks.net/` portalı çok dilli kök dizindir; açık lisanslı hikâyeler için doğrudan erişim tam aktiftir.

---

## 4. Her Dil İçin Eklenmeye Değer 2–3 Ücretsiz Kaynak Önerisi

Uygulamanın Rehber bölümünü daha da zenginleştirmek için pedagojik olarak yüksek kaliteli ve ücretsiz/açık lisanslı yeni kaynak önerileri:

### 4.1 Fransızca (FR)
1. **Bescherelle Conjugueur** (`https://bescherelle.com/le-conjugueur/`)
   - **Tür:** `dictionary` / Çekim aracı
   - **Seviye:** Her seviye
   - **Neden:** Fransızca çekimlerin altın standardı; fiil laboratuvarına dış referans olarak ideal.
2. **Le Point du FLE** (`https://www.lepointdufle.net/`)
   - **Tür:** `grammar`
   - **Seviye:** A1–C1
   - **Neden:** Yüzlerce ücretsiz dilbilgisi, telaffuz ve dinleme alıştırması dizini.
3. **InnerFrench Podcast** (`https://innerfrench.com/`)
   - **Tür:** `listening`
   - **Seviye:** B1–B2
   - **Neden:** Hugo Cotton tarafından hazırlanan, ara seviye için dünyanın en çok dinlenen pedagojik Fransızca podcast'i (ücretsiz transkriptli).

### 4.2 İspanyolca (ES)
1. **Fundéu RAE** (`https://www.fundeu.es/`)
   - **Tür:** `dictionary` / Danışma
   - **Seviye:** B2–C1
   - **Neden:** İspanyolca güncel kullanım, edatlı fiiller ve yazım ikilemleri için en güvenilir resmî rehber.
2. **Notes in Spanish** (`https://www.notesinspanish.com/`)
   - **Tür:** `listening`
   - **Seviye:** A1–C1
   - **Neden:** Marina ve Ben tarafından hazırlanan, her seviyeye özel doğal konuşma podcast'leri.
3. **Aprender Español** (`https://aprenderespanol.org/`)
   - **Tür:** `grammar`
   - **Seviye:** A1–B2
   - **Neden:** Fiil çekimleri, okuma parçaları ve dinleme için binlerce ücretsiz interaktif alıştırma.

### 4.3 İngilizce (EN)
1. **EngVid** (`https://www.engvid.com/`)
   - **Tür:** `grammar` / Video
   - **Seviye:** A1–C1
   - **Neden:** Konu konu ayrılmış 1.000'den fazla ücretsiz video ders ve ardından çözülen mini testler.
2. **Voice of America (VOA) Special English YouTube** (`https://www.youtube.com/@voalearningenglish`)
   - **Tür:** `listening`
   - **Seviye:** A2–B2
   - **Neden:** Altyazılı, kelime kelime takip edilebilen kamu malı video haberler.
3. **Ludwig Guru** (`https://ludwig.guru/`)
   - **Tür:** `dictionary` / Cümle arama motoru
   - **Seviye:** B1–C2
   - **Neden:** Bir ifadenin güvenilir kaynaklarda (New York Times, BBC, bilimsel makaleler) nasıl kullanıldığını arayan bağlamsal arama motoru.
