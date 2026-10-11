# Tuzak Kelime Listesi Denetimi Raporu

**Tarih:** 2026-10-11  
**Kapsam:** `src/data/traps/` altındaki 6 dosya (`fr.json`, `fr-2.json`, `es.json`, `es-2.json`, `en.json`, `en-2.json`) ve toplam **178 kayıt**.  
**Amaç:** `trap` (yanlış çağrışım) ve `meaning` (gerçek anlam) doğruluğu, `looks` biçimi, `text` cümle bağlamı, bölgesel kullanım farklılıkları (İspanya / Latin Amerika; UK / US), arayüz (`TrapChip`, `TrapRound`) uyumu ve tespit edilen sorunlar için önerilen düzeltme tablosu.  
**Kural:** Bu görevde JSON dosyaları doğrudan değiştirilmemiştir; tüm bulgular ve öneriler Claude Code için raporlanmıştır.

---

## 1. Genel Dağılım ve Özet

| Dosya | Dil | Kayıt Sayısı | Hedef Eşdeğerlik |
|---|---|---|---|
| `fr.json` | Fransızca | 25 | Fransızca kelime vs. İngilizce yalancı eşdeğer (false friend) |
| `fr-2.json` | Fransızca | 40 | Fransızca kelime vs. İngilizce / Türkçe ses benzerliği |
| `es.json` | İspanyolca | 23 | İspanyolca kelime vs. İngilizce yalancı eşdeğer |
| `es-2.json` | İspanyolca | 40 | İspanyolca kelime vs. İngilizce / Türkçe ses benzerliği |
| `en.json` | İngilizce | 9 | İngilizce kelime vs. Türkçe yalancı eşdeğer |
| `en-2.json` | İngilizce | 41 | İngilizce kelime vs. Türkçe yalancı eşdeğer |
| **Toplam** | | **178** | |

Tüm 178 kayıt incelenmiş; anlamsal açıdan pedagojik değerlerinin çok yüksek olduğu, hedef dili öğrenen Türk kullanıcıların en sık düştüğü hataları hedeflediği görülmüştür. Ancak arayüz entegrasyonunda aksaklığa yol açan 5 temel problem kategorisi tespit edilmiştir.

---

## 2. Tespit Edilen Sistemsel Sorunlar

### 2.1 Aksan Uyuşmazlığı (`lemma` aksansız, `text` aksanlı) — **Kritik Hata**
* **Sorun:** `src/engine/traps.ts` içindeki `trapOf` fonksiyonu:
  ```ts
  const norm = (s: string) => s.trim().toLowerCase()
  export const trapOf = (list, language, lemma) => 
    list.find((t) => t.language === language && norm(t.lemma) === norm(lemma))
  ```
  `norm` fonksiyonu yalnızca küçük harfe dönüştürmekte, aksanları normalize **etmemektedir**.
* **Sonuç:** `fr-2.json` dosyasında 7 kaydın `lemma` alanı aksansız yazılmıştır (`college`, `camera`, `deception`, `opportunite`, `pretentieux`, `resumer`, `commodite`). Kullanıcı okuma ekranında veya sözlükte `collège` kelimesine baktığında, `norm('college') === norm('collège')` **false** döndüğü için kelime sayfasındaki `TrapChip` rozeti **asla görünmemektedir**.

### 2.2 `looks` Alanında Parantezli Türkçe Açıklamalar
* **Sorun:** İlk dosyalarda (`fr.json`, `es.json`) `looks` alanı yalın olarak benzeyen kelimeyi içerirken (`looks: "actually"`), 2. seri dosyalarda (`fr-2.json`, `es-2.json`, `en-2.json`) parantezli açıklamalar eklenmiştir:
  - `looks: "yelek (vest)"`
  - `looks: "slip (kaymak)"`
  - `looks: "pasta (tatlı/kek)"`
  - `looks: "devis (yabancı para)"`
* **Sonuç:** `TrapChip.tsx` bileşeninde tooltip metni:
  `“${trap.looks}” gibi göründüğü için yanlış anlaşılır.`
  şeklindedir. Ekranda *« “yelek (vest)” gibi göründüğü için yanlış anlaşılır »* şeklinde bozuk ve hantal bir ifade üretilmektedir. `looks` alanı yalın olmalıdır.

### 2.3 `trap` Alanında "yalnızca / sadece" İfadeleri
* **Sorun:** Bazı kayıtlarda `trap` alanına açıklama niteliğinde "yalnızca/sadece" kelimeleri eklenmiştir:
  - `fr-brave`: `trap: "yalnızca cesur, yiğit"`
  - `fr-assurance`: `trap: "yalnızca özgüven"`
  - `fr-bureau`: `trap: "sadece ofis binası"`
  - `fr-voyage`: `trap: "yalnızca deniz yolculuğu"`
  - `es-firma`: `trap: "yalnızca ticari şirket"`
* **Sonuç:** `TrapChip` arayüzünde:
  `Tuzak kelime: “{trap.trap}” değil, “{trap.meaning}”`
  yazılmaktadır. Bu da ekranda *« Tuzak kelime: “yalnızca cesur, yiğit” değil, “iyi kalpli, dürüst (isimden önce)” »* şeklinde tuhaf bir Türkçe cümle oluşturmaktadır.

### 2.4 `meaning` Alanında Parantezli Ek Açıklamalar
* **Sorun:** `TrapRound.tsx` mini oyununda 3 seçenekli soru oluşturulurken seçenekler doğrudan `word.meaning`, `word.trap` ve `other.meaning` alanlarından alınmaktadır.
  - `meaning: "harf (veya şarkı sözü)"`
  - `meaning: "çorap (veya ortalama/yarım)"`
  - `meaning: "çıkarmak (matematik), eksiltmek"`
  - `meaning: "frenk inciri (veya öğrenci müzik grubu)"`
  - `meaning: "birey, şahıs (veya özel)"`
* **Sonuç:** Seçenek düğmelerinde bu uzun parantezli açıklamalar buton sınırlarını taşırabilmekte ve diğer tek kelimelik çeldiriciler arasında doğru cevabın sırıtmasına yol açmaktadır. Anlam net ve tek odaklı olmalıdır.

### 2.5 Bölgesel Anlam ve Kullanım Farklılıkları
* **`es-manteca`:** İspanya'da katı domuz yağı (`manteca de cerdo`) iken, Arjantin, Uruguay ve Paraguay'da doğrudan standart tereyağı (`mantequilla` yerine) anlamına gelir.
* **`es-tuna`:** İspanya'da öğrenci müzik grubu iken, Meksika ve Latin Amerika'da kaktüs meyvesi (frenk inciri) anlamına gelir.
* **`en-biscuit`:** İngiltere'de bisküvi/kurabiye iken, ABD'de fırınlanmış tuzlu kahvaltı çöreğidir.
* **`en-chips`:** İngiltere'de patates kızartması (french fries), ABD'de patates cipsidir (crisps).

---

## 3. Sorunlu Kayıtlar ve Önerilen Düzeltme Tablosu

Aşağıdaki tablo, JSON dosyalarında Claude Code tarafından yapılması önerilen somut düzeltmeleri listelemektedir:

| ID | Dosya | Alan | Mevcut Değer | Önerilen Düzeltme | Gerekçe |
|---|---|---|---|---|---|
| `fr-college` | `fr-2.json` | `lemma` | `"college"` | `"collège"` | Aksan eksikliği `trapOf` eşleşmesini engelliyor |
| `fr-college` | `fr-2.json` | `looks` | `"kolej (özel lise)"` | `"kolej"` | Tooltip içinde yalın gösterim |
| `fr-college` | `fr-2.json` | `meaning` | `"ortaokul (collège)"` | `"ortaokul"` | Oyun şıkkında gereksiz parantez |
| `fr-camera` | `fr-2.json` | `lemma` | `"camera"` | `"caméra"` | Aksan eksikliği eşleşmeyi engelliyor |
| `fr-camera` | `fr-2.json` | `looks` | `"kamera (fotoğraf makinesi)"` | `"kamera"` | Tooltip sadeleşmesi |
| `fr-deception` | `fr-2.json` | `lemma` | `"deception"` | `"déception"` | Aksan eksikliği eşleşmeyi engelliyor |
| `fr-deception` | `fr-2.json` | `looks` | `"deception (aldatma)"` | `"deception"` | Tooltip sadeleşmesi |
| `fr-deception` | `fr-2.json` | `meaning` | `"hayal kırıklığı (déception)"` | `"hayal kırıklığı"` | Oyun şıkkı sadeleşmesi |
| `fr-opportunite` | `fr-2.json` | `lemma` | `"opportunite"` | `"opportunité"` | Aksan eksikliği eşleşmeyi engelliyor |
| `fr-opportunite` | `fr-2.json` | `looks` | `"opportunity (fırsat)"` | `"opportunity"` | Tooltip sadeleşmesi |
| `fr-opportunite` | `fr-2.json` | `meaning` | `"uygunluk, yerindelik (opportunité)"` | `"uygunluk, yerindelik"` | Oyun şıkkı sadeleşmesi |
| `fr-pretentieux` | `fr-2.json` | `lemma` | `"pretentieux"` | `"prétentieux"` | Aksan eksikliği eşleşmeyi engelliyor |
| `fr-pretentieux` | `fr-2.json` | `looks` | `"pretentious (numaracı)"` | `"pretentious"` | Tooltip sadeleşmesi |
| `fr-resumer` | `fr-2.json` | `lemma` | `"resumer"` | `"résumer"` | Aksan eksikliği eşleşmeyi engelliyor |
| `fr-resumer` | `fr-2.json` | `looks` | `"resume (devam etmek)"` | `"resume"` | Tooltip sadeleşmesi |
| `fr-resumer` | `fr-2.json` | `meaning` | `"özetlemek (résumer)"` | `"özetlemek"` | Oyun şıkkı sadeleşmesi |
| `fr-commodite` | `fr-2.json` | `lemma` | `"commodite"` | `"commodité"` | Aksan eksikliği eşleşmeyi engelliyor |
| `fr-commodite` | `fr-2.json` | `looks` | `"commodity (ticari mal)"` | `"commodity"` | Tooltip sadeleşmesi |
| `fr-brave` | `fr-2.json` | `trap` | `"yalnızca cesur, yiğit"` | `"cesur, yiğit"` | "değil" ile cümle bozuluyor |
| `fr-brave` | `fr-2.json` | `meaning` | `"iyi kalpli, dürüst (isimden önce)"` | `"iyi kalpli, dürüst"` | Oyun şıkkında parantez olmamalı |
| `fr-assurance` | `fr-2.json` | `trap` | `"yalnızca özgüven"` | `"özgüven"` | "değil" ile anlatım bozukluğu |
| `fr-bureau` | `fr-2.json` | `trap` | `"sadece ofis binası"` | `"ofis odası"` | "değil" ile anlatım bozukluğu |
| `fr-bureau` | `fr-2.json` | `meaning` | `"çalışma masası (veya yazı masası)"` | `"çalışma masası"` | Oyun şıkkı sadeliği |
| `fr-voyage` | `fr-2.json` | `trap` | `"yalnızca deniz yolculuğu"` | `"deniz yolculuğu"` | "değil" ile anlatım bozukluğu |
| `fr-veste` | `fr-2.json` | `looks` | `"yelek (vest)"` | `"yelek"` | Tooltip sadeleşmesi |
| `fr-slip` | `fr-2.json` | `looks` | `"slip (kaymak)"` | `"slip (İng.)"` | Yalınlaştırma |
| `fr-slip` | `fr-2.json` | `meaning` | `"külot (iç çamaşırı)"` | `"külot"` | Oyun şıkkı sadeliği |
| `fr-particulier` | `fr-2.json` | `meaning` | `"birey, şahıs (veya özel)"` | `"birey, şahıs"` | Oyun şıkkı sadeliği |
| `es-firma` | `es-2.json` | `trap` | `"yalnızca ticari şirket"` | `"şirket, firma"` | Anlatım bozukluğu önleme |
| `es-letra` | `es-2.json` | `meaning` | `"harf (veya şarkı sözü)"` | `"harf"` | Oyun şıkkı sadeliği |
| `es-manteca` | `es-2.json` | `meaning` | `"katı yağ (veya domuz yağı)"` | `"katı yağ"` | Oyun şıkkı sadeliği |
| `es-media` | `es-2.json` | `meaning` | `"çorap (veya ortalama/yarım)"` | `"çorap"` | Oyun şıkkı sadeliği |
| `es-restar` | `es-2.json` | `meaning` | `"çıkarmak (matematik), eksiltmek"` | `"çıkarmak, eksiltmek"` | Parantezsiz net tanım |
| `es-salado` | `es-2.json` | `meaning` | `"tuzlu (veya şanssız)"` | `"tuzlu"` | Oyun şıkkı sadeliği |
| `es-tuna` | `es-2.json` | `meaning` | `"frenk inciri (veya öğrenci müzik grubu)"` | `"frenk inciri"` | Oyun şıkkı sadeliği |
| `es-tarjeta` | `es-2.json` | `meaning` | `"kart (kredi kartı, kartvizit)"` | `"kart"` | Oyun şıkkı sadeliği |
| `en-sympathetic`| `en-2.json` | `looks` | `"sempatik (sevimli)"` | `"sempatik"` | Tooltip sadeleşmesi |
| `en-pasta` | `en-2.json` | `looks` | `"pasta (tatlı/kek)"` | `"pasta"` | Tooltip sadeleşmesi |
| `en-pension` | `en-2.json` | `looks` | `"pansiyon (otel)"` | `"pansiyon"` | Tooltip sadeleşmesi |
| `en-chef` | `en-2.json` | `looks` | `"şef (amir/müdür)"` | `"şef"` | Tooltip sadeleşmesi |
| `en-fabric` | `en-2.json` | `looks` | `"fabrika"` | `"fabrika"` | Doğru ve yalın |

---

## 4. `src/engine/traps.ts` İçin Mimari İyileştirme Önerisi

Veri dosyalarındaki olası aksan hatalarından bağımsız olarak, `trapOf` fonksiyonunun daha savunmacı olması önerilir:

```ts
// src/engine/traps.ts
const stripAccents = (s: string) =>
  s.trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')

export const trapOf = (list: readonly TrapWord[], language: TargetLanguage, lemma: string) => {
  const target = stripAccents(lemma)
  return list.find((t) => t.language === language && stripAccents(t.lemma) === target)
}
```
Bu 3 satırlık değişiklik yapıldığında, veri tabanındaki aksanlı veya aksansız tüm formlar hatasız eşleşecek ve gelecekteki olası veri tutarsızlıkları tamamen önlenecektir.

---

## 5. Sonuç

178 tuzak kelime kaydı zengin ve başarılı bir korpus sunmaktadır. Yukarıdaki düzeltme tablosundaki 41 nokta Claude Code tarafından uygulandığında ve `trapOf` savunmacı normalize fonksiyonuna kavuşturulduğunda, kullanıcı arayüzü ve mini oyun akışı kusursuz hale gelecektir.
