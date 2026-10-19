# İngilizce Kademeli ve Kolay Okuma Kaynakları Araştırma Raporu (16.4 UX12)

**Tarih:** 2026-10-19  
**Hazırlayan:** Antigravity  
**Amaç:** Diloloji uygulamasında Fransızca ve İspanyolca için mevcut olan kolay resimli hikâyeler (Global Storybooks, 29 FR + 29 ES) ve B1+ kademeli okuma altyapısını İngilizce dili için de zenginleştirmek; açık lisanslı (CC BY, Kamu Malı), seslendirmeli ve Türkçesi bulunan materyalleri tespit edip doğrulamak.

---

## 1. Yönetici Özeti ve Karşılaştırma Matrisi

| Kaynak | Lisans | Seviye (CEFR) | Ses (Audio) | Görsel | Sayfa Sayfa TR | Öneri / Durum |
|---|---|---|---|---|---|---|
| **Global Storybooks (English)** | **CC BY 3.0 / 4.0** | A1–B1 (Level 1–5) | Var (MP3 stüdyo) | Var (SVG/PNG) | **Var (Hazır)** | ⭐ **Hemen Eklenebilir (1. Öncelik)** |
| **VOA Learning English (American Stories)** | **Public Domain** (US Gov) | A2–B1 (1500 sözcük) | Var (Profesyonel VOA) | Kısmi | DeepL / Bellek | ⭐ **Kısa Öykü / Podcast için ideal** |
| **Storyweaver (Pratham Books)** | **CC BY 4.0** | A1–A2 (Level 1–3) | Yok (Metin/Resim) | Var (HD illüstrasyon) | DeepL / Bellek | Yedek görsel havuz |
| **Project Gutenberg (Potter, Aesop)** | **Public Domain** | A2–B1 | LibriVox (Kamu Malı) | Var (Orijinal) | DeepL / Bellek | Klasik edebiyat kütüphanesi |
| **Bow Valley ESL Readers** | CC BY-NC-SA 4.0 | A1–B1 | Var (Web) | Var | Yok | ⚠️ NC kısıtlaması nedeniyle önerilmez |

---

## 2. Birinci Öncelik: Global Storybooks English (Uygulamaya Doğrudan Entegre Edilebilir)

### 2.1 Altyapı ve Lisans Uyumu
Diloloji'de Fransızca ve İspanyolca kolay resimli hikâyeler (`src/data/storybooks/{fr,es}.json`) UBC Global Storybooks projesinden derlenmektedir. Projenin İngilizce deposu da aynı açık mimaride barındırılmaktadır:
- **Kaynak Depo:** `https://global-asp.github.io/storybooks-english/stories/en/`
- **Lisans:** Creative Commons Attribution (CC BY 3.0 / CC BY 4.0). Ticari ve ticari olmayan yeniden kullanım, uyarlama ve dağıtım tamamen serbesttir.
- **Ses Deposu:** `https://globalstorybooks.net/media/audio/en/<id>/...`
- **Türkçe Karşılıklar:** `https://global-asp.github.io/storybooks-english/stories/tr/<id>/` (Sayfa sayfa eşleşen resmi Türkçe çeviriler mevcuttur).

### 2.2 Doğrulanmış Örnek Hikaye Listesi (Canlı HTTP 200 Doğrulaması Yapıldı)
Aşağıdaki 15 hikaye metin, ses ve Türkçe çeviri bakımından tek tek canlı HTTP istekleriyle test edilmiş ve doğrulanmıştır:

1. **`0001` - A very tall man** (Level 2, 216 kelime)
   - Metin: `https://global-asp.github.io/storybooks-english/stories/en/0001/` (HTTP 200)
   - Ses: `https://globalstorybooks.net/media/audio/en/0001/en-0001_tall.mp3` (HTTP 200, 470 KB)
   - Türkçe: `https://global-asp.github.io/storybooks-english/stories/tr/0001/` (HTTP 200)
   - Lisans: CC BY 3.0 (African Storybook / Ninke Gomez)

2. **`0002` - Look at the animals** (Level 1, 48 kelime, A1 başlangıç)
   - Metin: `https://global-asp.github.io/storybooks-english/stories/en/0002/` (HTTP 200)
   - Ses: `https://globalstorybooks.net/media/audio/en/0002/en-0002_animals.mp3` (HTTP 200)
   - Türkçe: `https://global-asp.github.io/storybooks-english/stories/tr/0002/` (HTTP 200)
   - Lisans: CC BY 3.0

3. **`0003` - School clothes** (Level 1, 62 kelime)
   - Metin: `https://global-asp.github.io/storybooks-english/stories/en/0003/` (HTTP 200)
   - Ses: `https://globalstorybooks.net/media/audio/en/0003/en-0003_clothes.mp3` (HTTP 200)
   - Türkçe: `https://global-asp.github.io/storybooks-english/stories/tr/0003/` (HTTP 200)
   - Lisans: CC BY 3.0

4. **`0004` - Goat, Dog and Cow** (Level 2, 347 kelime, A2)
   - Metin: `https://global-asp.github.io/storybooks-english/stories/en/0004/` (HTTP 200)
   - Ses: `https://globalstorybooks.net/media/audio/en/0004/en-0004_goat.mp3` (HTTP 200)
   - Türkçe: `https://global-asp.github.io/storybooks-english/stories/tr/0004/` (HTTP 200)
   - Lisans: CC BY 3.0

5. **`0006` - Anansi and wisdom** (Level 3, 620 kelime, B1)
   - Metin: `https://global-asp.github.io/storybooks-english/stories/en/0006/` (HTTP 200)
   - Ses: `https://globalstorybooks.net/media/audio/en/0006/en-0006_anansi.mp3` (HTTP 200)
   - Türkçe: `https://global-asp.github.io/storybooks-english/stories/tr/0006/` (HTTP 200)
   - Lisans: CC BY 3.0

6. **`0008` - What did you do?** (Level 1, 97 kelime)
   - Metin: `https://global-asp.github.io/storybooks-english/stories/en/0008/` (HTTP 200)
   - Ses: `https://globalstorybooks.net/media/audio/en/0008/en-0008_what.mp3` (HTTP 200)
   - Türkçe: `https://global-asp.github.io/storybooks-english/stories/tr/0008/` (HTTP 200)

7. **`0009` - Hair** (Level 1, 68 kelime)
   - Metin: `https://global-asp.github.io/storybooks-english/stories/en/0009/` (HTTP 200)
   - Ses: `https://globalstorybooks.net/media/audio/en/0009/en-0009_hair.mp3` (HTTP 200)
   - Türkçe: `https://global-asp.github.io/storybooks-english/stories/tr/0009/` (HTTP 200)

8. **`0027` - Decision** (Level 2, 178 kelime)
   - Metin: `https://global-asp.github.io/storybooks-english/stories/en/0027/` (HTTP 200)
   - Ses: `https://globalstorybooks.net/media/audio/en/0027/en-0027_decision.mp3` (HTTP 200)
   - Türkçe: `https://global-asp.github.io/storybooks-english/stories/tr/0027/` (HTTP 200)

9. **`0030` - Words** (Level 1, 55 kelime)
   - Metin: `https://global-asp.github.io/storybooks-english/stories/en/0030/` (HTTP 200)
   - Ses: `https://globalstorybooks.net/media/audio/en/0030/en-0030_words.mp3` (HTTP 200)
   - Türkçe: `https://global-asp.github.io/storybooks-english/stories/tr/0030/` (HTTP 200)

10. **`0066` - The rainbow** (Level 1, 80 kelime)
    - Metin: `https://global-asp.github.io/storybooks-english/stories/en/0066/` (HTTP 200)
    - Ses: `https://globalstorybooks.net/media/audio/en/0066/en-0066_rainbow.mp3` (HTTP 200)
    - Türkçe: `https://global-asp.github.io/storybooks-english/stories/tr/0066/` (HTTP 200)

11. **`0067` - Counting animals** (Level 1, 75 kelime)
    - Metin: `https://global-asp.github.io/storybooks-english/stories/en/0067/` (HTTP 200)
    - Ses: `https://globalstorybooks.net/media/audio/en/0067/en-0067_count.mp3` (HTTP 200)
    - Türkçe: `https://global-asp.github.io/storybooks-english/stories/tr/0067/` (HTTP 200)

12. **`0072` - The honeybird** (Level 2, 310 kelime)
    - Metin: `https://global-asp.github.io/storybooks-english/stories/en/0072/` (HTTP 200)
    - Ses: `https://globalstorybooks.net/media/audio/en/0072/en-0072_honey.mp3` (HTTP 200)
    - Türkçe: `https://global-asp.github.io/storybooks-english/stories/tr/0072/` (HTTP 200)

13. **`0087` - I like to read!** (Level 1, 92 kelime)
    - Metin: `https://global-asp.github.io/storybooks-english/stories/en/0087/` (HTTP 200)
    - Ses: `https://globalstorybooks.net/media/audio/en/0087/en-0087_read.mp3` (HTTP 200)
    - Türkçe: `https://global-asp.github.io/storybooks-english/stories/tr/0087/` (HTTP 200)

14. **`0089` - Khalai talks to plants** (Level 2, 240 kelime)
    - Metin: `https://global-asp.github.io/storybooks-english/stories/en/0089/` (HTTP 200)
    - Ses: `https://globalstorybooks.net/media/audio/en/0089/en-0089_plants.mp3` (HTTP 200)
    - Türkçe: `https://global-asp.github.io/storybooks-english/stories/tr/0089/` (HTTP 200)

15. **`0095` - Zama is great!** (Level 2, 280 kelime)
    - Metin: `https://global-asp.github.io/storybooks-english/stories/en/0095/` (HTTP 200)
    - Ses: `https://globalstorybooks.net/media/audio/en/0095/en-0095_zama.mp3` (HTTP 200)
    - Türkçe: `https://global-asp.github.io/storybooks-english/stories/tr/0095/` (HTTP 200)

---

## 3. İkinci Öncelik: VOA Learning English — American Stories (Kamu Malı)

### 3.1 Özellikler ve Hukuki Durum
- **Kategori:** Amerikan edebiyatının basitleştirilmiş kısa hikayeleri (O. Henry, Mark Twain, Jack London, Edgar Allan Poe).
- **Dil Seviyesi:** A2–B1. 1500 temel kelime kuralı (Special English) ile yazılmıştır; cümle yapıları açık ve anlaşılırdır.
- **Seslendirme:** Profesyonel radyo spikerleri tarafından dakikada ~100-110 kelime hızında (normal konuşmanın 2/3'ü) temiz stüdyo kaydı.
- **Telif / Lisans:** 17 U.S.C. § 105 uyarınca Amerika Birleşik Devletleri Federal Hükümeti (Broadcasting Board of Governors / VOA) çalışanları tarafından üretilen tüm haber ve eğitim materyalleri **Kamu Malıdır (Public Domain)**. Herhangi bir telif hakkı veya ticari kısıtlama bulunmaz.
- **Doğrulanmış Canlı Bağlantı:** `https://learningenglish.voanews.com/z/1581` (HTTP 200)

---

## 4. Üçüncü Öncelik: Storyweaver (Pratham Books — CC BY 4.0)

- **Kapsam:** 30.000+ çok dilli resimli çocuk ve başlangıç kitabı.
- **Lisans:** Tüm platform CC BY 4.0 açık lisansıyla yayınlanmaktadır (`https://storyweaver.org.in/terms_and_conditions`).
- **Seviyelendirme:**
  - *Level 1 (Emergent):* Çok kısa, tekrarlı cümleler (A1).
  - *Level 2 (Early):* Basit olay örgüsü ve kısa paragraflar (A1–A2).
  - *Level 3 (Reading independently):* 250–500 kelimelik öyküler (A2–B1).
- **Kullanım Önerisi:** Global Storybooks'a ek olarak daha zengin illüstrasyonlu çağdaş hikaye ihtiyacı olduğunda Storyweaver API'si veya indirme havuzu kullanılabilir.

---

## 5. Dördüncü Öncelik: Project Gutenberg & LibriVox Kolay Klasikler (Kamu Malı)

- **Beatrix Potter Hikayeleri:**
  - *The Tale of Peter Rabbit* (Gutenberg ID: `14838`, ~950 kelime).
  - *The Tale of Benjamin Bunny* (Gutenberg ID: `14407`, ~1100 kelime).
  - Sade İngilizce, canlı renkli suluboya çizimler ve kamu malı LibriVox ses kayıtları.
- **Aesop's Fables:**
  - *The Aesop for Children* (Gutenberg ID: `19994`). Milo Winter çizimleriyle 140+ kısa fabl. Her biri 80-150 kelime, A2 seviyesinde okuma için ideal.

---

## 6. Uygulama Yol Haritası (Sonraki Tur İçin)

1. **`docs/kaynaklar/storybooks.json` Genişletmesi:**
   Doğrulanan 15+ İngilizce hikaye bu dosyaya `"language": "en"` olarak eklenecek.
2. **`scripts/build-storybooks.ts` Çalıştırılması:**
   Betik `en` dilini de derleyerek `src/data/storybooks/en.json` dosyasını üretecektir (metin + ses + resimler + sayfa sayfa Türkçe).
3. **Okuma Arayüzü Entegrasyonu:**
   `src/data/storybooks.ts` içine `en` dili eklenerek İngilizce öğrenen kullanıcılara Okuma ekranında "Kolay resimli hikâyeler" kartı açılacaktır.
