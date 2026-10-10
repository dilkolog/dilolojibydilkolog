# Diloloji — İleri Seviye Pedagojik Gelişim Fikirleri ve Yol Haritası Önerileri

**Tarih:** 2026-10-10  
**Hazırlayan:** Antigravity (Kullanıcı Talebi Üzerine Fikir & Pedagoji Raporu)  
**Hedef Kitle:** Claude Code ve proje ekibi (uygulama mimarisi ve karar için devir notu)  
**Bağlam:** Diloloji'nin mevcut güçlü temeli (FSRS aralıklı tekrarı, cümle takipli okuma, dikte, gölgeleme, geri çeviri, sesli kitaplar, telaffuz analizi ve hata teşhisi) üzerine inşa edilebilecek, özellikle **B1'den B2/C1 akıcılığına geçişi hızlandıracak** yenilikçi gelişim alanları.

---

## 1. Giriş ve Amaç

Kullanıcının dil öğrenme yolculuğunda kelime ezberlemenin ötesine geçerek **doğal refleks, aktif üretim ve ince anlam ayrımları** kazanması hedeflenmektedir. Bu belgedeki 6 fikir; açık lisanslı verilerle (OER, Tatoeba, açık korpuslar) beslenebilecek, düşük/orta geliştirme maliyetine sahip ve uygulamanın mevcut sakin tasarım felsefesine (`DESIGN.md`) tam uyumlu önerilerdir.

---

## 2. 6 Temel Gelişim Fikri Detayları

### 🎯 1. Hata Avcısı (*Spot the Error / Error Correction*)

* **Pedagojik Gerekçe:** İleri seviye (B2/C1) öğrenicilerin en büyük sorunu kuralları bilmemek değil; kendi dil alışkanlıklarından kaynaklanan küçük gramer/yazım tuzaklarını fark edememektir. Düzeltme egzersizleri dikkati ve kural bilincini keskinleştirir.
* **Nasıl Çalışır?**
  - Ekrana içinde tek bir kritik B2/C1 hatası bulunan cümle gelir.
  - Kullanıcı hatalı kelimeye dokunur (kelime vurgulanır) ve doğrusunu yazar ya da çoktan seçmeli olarak doğru alternatifi seçer.
* **Örnek Senaryolar:**
  - **FR:** *"Les lettres qu'il a **écrit** hier sont parties."* ➔ Hata: *écrit* ➔ Doğrusu: *écrites* (Participe passé COD antécédent uyumu).
  - **ES:** *"Aunque **está** lloviendo mañana, iremos al campo."* ➔ Hata: *está* ➔ Doğrusu: *esté* (Gelecekteki belirsiz şartta Subjuntivo).
  - **EN:** *"Hardly I had **arrived** when the phone rang."* ➔ Hata: *I had* ➔ Doğrusu: *had I* (Devrik yapı - Inversion).
* **Veri Kaynağı:** LanguageTool hata kuralları, BEA-2019 / Lang-8 açık hata korpusları veya kural tabanlı sentetik hata üretimi.
* **Uygulama Yeri:** `Pratik` (Practice Hub) ➔ Oyunlar veya Gramer altında bağımsız bir kart.

---

### 🔄 2. Kalıp Cümle Dönüşümü (*Sentence Transformation / Rewrite*)

* **Pedagojik Gerekçe:** Cambridge C1 Advanced, DALF C1 ve DELE C1 sınavlarının en prestijli soru tipidir. Aynı düşünceyi farklı bağlaç, fiil veya sözdizimiyle ifade etme esnekliği kazandırır.
* **Nasıl Çalışır?**
  - İlk cümle ve bir **anahtar kelime** verilir.
  - İkinci cümlenin boşluğu, anahtar kelime kullanılarak ve ilk cümleyle **birebir aynı anlamı koruyacak** şekilde doldurulur (2–5 kelime).
* **Örnek Senaryolar:**
  - **FR:**
    - *Cümle 1:* "Bien qu'il fasse froid, nous sortons."
    - *Anahtar:* **MALGRÉ**
    - *Tamamlama:* "Nous sortons ___." ➔ *"malgré le froid"*
  - **ES:**
    - *Cümle 1:* "Es necesario que estudies más para aprobar."
    - *Anahtar:* **DEBERÍAS**
    - *Tamamlama:* "Tú ___ para aprobar." ➔ *"deberías estudiar más"*
  - **EN:**
    - *Cümle 1:* "I haven't seen her for five years."
    - *Anahtar:* **TIME**
    - *Tamamlama:* "The ___ was five years ago." ➔ *"last time I saw her"*
* **Veri Kaynağı:** OER Commons C1 materyalleri, açık Anki C1 desteleri veya açık sınav pratik setleri.
* **Uygulama Yeri:** `Pratik` ➔ "Cümle Dönüşümü" alıştırma modu.

---

### 👂 3. Kulak Eğitimi: "Minimum Çiftler" (*Minimal Pairs*)

* **Pedagojik Gerekçe:** Öğreniciler okurken anladıkları kelimeleri konuşma anında ayırt edememekten şikayetçidir. Özellikle Türkçede bulunmayan ses zıtlıkları (nazal ünlüler, kapalı/açık e, boğaz sesleri) doğrudan algı blokajı yaratır.
* **Nasıl Çalışır?**
  - 10 saniyelik çok hızlı bir refleks oyunu.
  - 1 saniyelik bir ses çalar; ekranda 2 kart belirir. Kullanıcı duyduğu kelimeye dokunur.
* **Hedef Ses Zıtlıkları:**
  - **FR:**
    - *dessus* (üzerinde) vs *dessous* (altında)
    - *poisson* (balık / [s]) vs *poison* (zehir / [z])
    - *tu* ([y]) vs *tout* ([u])
    - *vin* ([ɛ̃]) vs *vent* ([ɑ̃]) vs *vont* ([ɔ̃]) (nazal üçlü)
  - **ES:**
    - *pero* (ama / tek r) vs *perro* (köpek / çift r)
    - *caza* ([θ]) vs *casa* ([s])
    - *caro* vs *carro*
  - **EN:**
    - *ship* ([ɪ]) vs *sheep* ([i:])
    - *bat* ([æ]) vs *bet* ([e])
    - *think* ([θ]) vs *sink* ([s])
* **Veri Kaynağı:** Forvo CC kayıtları, Shtooka ses arşivi veya Azure Speech TTS.
* **Uygulama Yeri:** `Pratik` ➔ Oyunlar ➔ "Kulak Jimnastiği (Ses Ayırt Etme)".

---

### 🔗 4. Eşdizimlilik ve Edat Kalıpları (*Collocations & Verb Prepositions*)

* **Pedagojik Gerekçe:** Tekil kelime ezberi B1 seviyesinde tıkanır. B2/C1 akıcılığı kelimelerin **hangi fiil ve edatlarla doğal kümelendiğini** bilmekle mümkündür ("make a mistake" vs "do a mistake").
* **Nasıl Çalışır?**
  - **Edat Doldurma:** Fiilden sonra hangi edatın geldiği sorulur:
    - *FR:* *décider ___ partir* ➔ **de**; *réussir ___ comprendre* ➔ **à**; *s'intéresser ___ l'art* ➔ **à**.
    - *ES:* *soñar ___ viajar* ➔ **con**; *darse cuenta ___ error* ➔ **de**; *pensar ___ ti* ➔ **en**.
    - *EN:* *depend ___* ➔ **on**; *interested ___* ➔ **in**; *accused ___* ➔ **of**.
  - **Doğal Eşleşme (Collocation Match):**
    - *heavy rain* (strong rain değil), *fast food* (quick food değil), *poser une question* (faire değil).
* **Veri Kaynağı:** Wiktionary edat kullanım tabloları, Tatoeba kalıp taraması.
* **Uygulama Yeri:** Sözlük kartında "Birlikte Kullanılanlar" çipi ve Pratik'te hızlı eşleştirme kartı.

---

### ⚠️ 5. Tuzak Kelimeler (*Yalancı Eşdeğerler / Faux Amis*)

* **Pedagojik Gerekçe:** Türkçedeki Fransızca alıntılar veya İngilizceye benzeyen İspanyolca sözcükler öğrenicide sahte bir güven hissi yaratarak büyük anlam karmaşalarına yol açar.
* **Nasıl Çalışır?**
  - Sözlükte ve kartlarda bu kelimelerin üzerine dokunsal bir **"⚠️ Tuzak Kelime"** rozeti konur.
  - Özel bir "Tuzaklara Düşme!" test modülü: Cümlede kelimenin gerçek anlamı mı yoksa tuzak anlamı mı kastedildiği sorulur.
* **Kritik Örnekler:**
  - **FR:**
    - *actuellement:* "aslında" değil, **"şu anda / günümüzde"** demek.
    - *attendre:* "katılmak" (attend) değil, **"beklemek"** demek.
    - *sensible:* "mantıklı" (sensible) değil, **"duyarlı / hassas"** demek.
    - *blessé:* "kutsanmış" (blessed) değil, **"yaralı"** demek.
  - **ES:**
    - *embarazada:* "mahcup/utanmış" (embarrassed) değil, **"hamile"** demek.
    - *éxito:* "çıkış" (exit) değil, **"başarı"** demek.
    - *constipado:* "kabız" değil, **"soğuk algınlığı / nezle"** demek.
* **Veri Kaynağı:** Hazır açık yalancı eşdeğer listeleri (kamu malı / CC).
* **Uygulama Yeri:** Kelimeler sekmesinde özel bir filtre/liste etiketi ve mini sınav.

---

### 📻 6. RFI & VOA ile "Günün 2 Dakikalık Mikro Haberi"

* **Pedagojik Gerekçe:** Kitaplar harika bir edebi temel sağlar; ancak yaşayan, çağdaş B2/C1 dili günlük haberlerde ve güncel olaylarda akar.
* **Nasıl Çalışır?**
  - **RFI Savoirs (*Le journal en français facile*):** Fransız Kamu Radyosu her gün tüm dünyada olup bitenleri sade ve anlaşılır Fransızca ile tam transkriptli bülten olarak sunar (ücretsiz açık RSS).
  - **VOA Learning English (*As It Is*):** İngilizce için her gün sesli ve resimli 2 dakikalık mikro bültenler (Kamu Malı / Public Domain).
  - Okuma ekranının en üstüne "Günün 2 Dakikalık Haberi" banner'ı gelir.
  - Kullanıcı her sabah 1 adet güncel olayı dinleyip senkronize cümle takibiyle okur (`listenFollow.ts` motorumuz bunu doğrudan destekler).
* **Uygulama Yeri:** `Okuma` (Reading Hub) üst vitrini.

---

## 3. Karşılaştırma ve Önceliklendirme Matrisi

| No | Fikir | Geliştirdiği Beceri | Hedef Seviye | Geliştirme Eforu | Pedagojik Etki |
|:---:|:---|:---:|:---:|:---:|:---:|
| **1** | **Hata Avcısı (Spot the Error)** | Gramer & Odaklanma | B2 – C1 | Orta (Mevcut soru motoru) | ⭐️⭐️⭐️⭐️⭐️ |
| **2** | **Cümle Dönüşümü (Rewrite)** | Aktif Üretim & Sözdizimi | B2 – C1 | Orta | ⭐️⭐️⭐️⭐️⭐️ |
| **3** | **Minimum Çiftler (Ses Ayırt Etme)** | Fonetik & Kulak Eğitimi | A2 – B2 | Düşük (Mikro oyun) | ⭐️⭐️⭐️⭐️ |
| **4** | **Eşdizimlilik (Collocations)** | Doğallık & Akıcılık | B1 – B2 | Düşük / Orta | ⭐️⭐️⭐️⭐️⭐️ |
| **5** | **Tuzak Kelimeler (Faux Amis)** | Anlam Koruması | A2 – B2 | Çok Düşük (Etiket + Liste) | ⭐️⭐️⭐️⭐️ |
| **6** | **Günün Mikro Haberi (RFI / VOA)** | Canlı Dil & Güncellik | B1 – C1 | Düşük (Mevcut RSS oynatıcı) | ⭐️⭐️⭐️⭐️⭐️ |

---

## 4. Claude Code İçin Tavsiye Edilen Adımlar

Bu fikirlerin uygulanabilirliği konusunda geliştirici için önerilen adım sıralaması:

1. **Hızlı Kazanım (1–2 gün):**
   - **Tuzak Kelimeler (Faux Amis):** ~50 kritik kelimelik statik liste ile kelime detayına rozet ve filtre eklenmesi.
   - **Minimum Çiftler:** Mevcut ses altyapısıyla 2 seçenekli 10 soruluk bir kulak oyunu bileşeni.
2. **Orta Vadeli Derinlik:**
   - **Gramer & Cümle Dönüşümü:** [`docs/kaynaklar/gramer-alistirmalari.md`](kaynaklar/gramer-alistirmalari.md) raporundaki OER verileriyle beslenen bir "Ustalık / Mastery" pratik kartı.
3. **Süreklilik:**
   - **Günün Mikro Haberi:** RFI ve VOA beslemelerinin Okuma kütüphanesine otomatik vitrin olarak bağlanması.

---

*Bu belge, gelecekteki turların planlanması ve mimari kararlar için bir referans kılavuz olarak saklanmaktadır.*
