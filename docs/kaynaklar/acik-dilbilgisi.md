# İspanyolca ve İngilizce Açık Lisanslı Dilbilgisi Kaynakları Raporu

**Tarih:** 2026-10-27  
**Kapsam:** İspanyolca ve İngilizce dillerinde ticari / serbest kullanım kısıtlaması taşımayan (CC BY 4.0 ve CC0) açık eğitim kaynakları (OER).  
**Amaç:** Kelime Koçu ve Diloloji platformunda telif riski olmadan (NC/SA kısıtlamalarına takılmadan) doğrudan soru bankasına aktarılabilecek güvenilir akademik kaynakların tespiti ve şablonlanması.  
**İlgili Görev:** 17. Tur §17.3.

---

## 1. Giriş ve Lisans Politikası

Diloloji projesinde kullanılan tüm dilbilgisi ve alıştırma verileri şu katı kurallara tabidir:
1. **NC (Non-Commercial) Yasaktır:** CC BY-NC veya CC BY-NC-SA lisanslı materyaller (ör. UT Austin *Spanish Grammar in Context*) projenin gelecekteki olası sürdürülebilirlik modelleri ve mobil mağaza dağıtımıyla çelişebileceği için kod deposuna veri olarak alınamaz.
2. **SA (ShareAlike) Kısıtları:** SA maddesi türetilen tüm uygulamanın aynı lisansla dağıtılmasını zorunlu kılabilir; bu nedenle çekirdek kodla birleşen JSON verilerinde tercih edilmez.
3. **Kabul Edilen Lisanslar:** Yalnızca **Creative Commons Attribution (CC BY 4.0 / CC BY 3.0)**, **CC0 (Kamu Malı Feragatnamesi)** ve **Kamu Malı (Public Domain)** kaynaklar doğrudan kabul edilir.

---

## 2. İspanyolca Açık Lisanslı Kaynaklar (OER)

### 2.1. *¡Chévere! Introductory Spanish I & II*
- **Yazarlar:** Brown, Escudero, Montoya & Small (State University of New York - SUNY OER)
- **Dağıtım / Platform:** LibreTexts Humanities & SUNY Pressbooks
- **Bağlantı:** `https://human.libretexts.org/Bookshelves/Languages/Spanish/First-year_Spanish_Bookshelf/Introductory_Spanish_I_(Brown_Escudero_Montoya_and_Small)`
- **Lisans:** **Creative Commons Attribution 4.0 International (CC BY 4.0)**
  - *Sayfadaki lisans beyanı:* "Licensed under CC BY 4.0. You are free to share and adapt the material for any purpose, even commercially."
- **Kapsam ve Seviye:** CEFR A1–A2 (Temel İspanyolca I & II).
- **İçerik Türü:** Düzenli fiil çekimleri (-ar, -er, -ir), *ser* vs *estar*, *gustar* ve ilgi fiilleri, iyelik sıfatları, şimdiki zaman ve yakın gelecek.
- **Biçim:** Çoktan seçmeli ve boşluk doldurmalı yüzlerce alıştırma cümlesi.

### 2.2. *Ahora Entendemos*
- **Yazar:** Denise Hatcher (Central College)
- **Dağıtım:** LibreTexts Languages
- **Bağlantı:** `https://human.libretexts.org/Bookshelves/Languages/Spanish/Ahora_Entendemos_(Hatcher)`
- **Lisans:** **Creative Commons Attribution 4.0 International (CC BY 4.0)**
- **Kapsam ve Seviye:** CEFR A2–B2 (Orta ve İleri Düzey).
- **İçerik Türü:** 13 fiil zamanı, *pretérito indefinido* vs *pretérito imperfecto*, *subjuntivo* kipleri, *por* vs *para*, doğrudan ve dolaylı nesne zamirleri.
- **Biçim:** Her konu ardından bağlamsal cümle alıştırmaları ve kural özeti.

### 2.3. *Tarea Libre: First-Year Spanish*
- **Yazarlar:** Moon, Lee, Harmon & Meléndez-Ballesteros (California Community Colleges OER)
- **Dağıtım:** LibreTexts / ASCCC OERI
- **Lisans:** **Creative Commons Attribution 4.0 International (CC BY 4.0)**
- **Kapsam:** ~1.400 etkileşimli soru bankası (A1–B1).

---

## 3. İngilizce Açık Lisanslı Kaynaklar (ESL / EFL OER)

### 3.1. *ESL Grammar The Way You Like It*
- **Yazar:** Don Bissonnette (South Seattle College)
- **Dağıtım:** LibreTexts Languages & Open Textbook Collection
- **Bağlantı:** `https://human.libretexts.org/Bookshelves/Languages/English_as_the_Second_Language/ESL_Grammar_The_Way_You_Like_It_(Bissonnette)`
- **Lisans:** **Creative Commons Attribution 4.0 International (CC BY 4.0)**
- **Kapsam ve Seviye:** CEFR A2–B2 (Beginner, Intermediate, Advanced modülleri).
- **İçerik Türü:** Bütün zamanlar (*Present Perfect*, *Past Continuous*), modal fiiller (*can, must, should, have to*), koşul cümleleri (*Conditionals 0, 1, 2, 3*), edilgen çatı (*Passive Voice*).
- **Biçim:** Boşluk doldurma ve seçenekli cümle manipülasyonları.

### 3.2. *College ESL Writers: Applied Grammar and Composing Strategies*
- **Yazarlar:** Barbara Hall & Elizabeth Wallace (University System of Georgia / Affordable Learning Georgia)
- **Dağıtım:** Galileo Open Learning Materials & LibreTexts
- **Lisans:** **Creative Commons Attribution 4.0 International (CC BY 4.0)**
- **Kapsam ve Seviye:** CEFR B1–B2.
- **İçerik Türü:** Cümle yapısı, bağlaçlar, edatlar (*in/on/at*), zaman uyumu, ilgi cümlecikleri (*relative clauses*).

---

## 4. Veri Aktarım Şablonu

Bu kaynaklardan üretilecek soru dosyaları, Diloloji'nin `GrammarExercise` tipine ve `TOPIC_NAME` standartlarına birebir uyarlanmalıdır:

```json
{
  "id": "es-chv-ser_estar-01",
  "language": "es",
  "level": "A1",
  "topic": "ser_estar",
  "type": "choice",
  "prompt": "Madrid ___ la capital de España.",
  "answer": "es",
  "options": ["es", "está", "son"],
  "hint": "kalıcı kimlik ve tanım için ser fiili kullanılır",
  "explanation": "Başkent, coğrafi kimlik ve değişmez tanımlamalar için « ser » fiili kullanılır: « Madrid es la capital ».",
  "source": "¡Chévere! Introductory Spanish, SUNY OER, CC BY 4.0 (uyarlandı)"
}
```

---

## 5. Sonuç ve Önerilen Yol Haritası

1. **İspanyolca için:** *¡Chévere!* ve *Ahora Entendemos* modülleri üzerinden A1–B1 seviyelerinde 80+ soru doğrudan derlenebilir.
2. **İngilizce için:** *ESL Grammar The Way You Like It* ve *College ESL Writers* kitaplarından B1–B2 seviyesinde 80+ soru oluşturulabilir.
3. Her soru tek doğru cevaplı, Türkçe açıklamalı ve açık atıflı (`source`) olacaktır.
