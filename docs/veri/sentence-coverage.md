# Tatoeba Örnek Cümle Kapsamı (3.000–10.000 Kelime Aralığı)

**Tarih:** 2026-10-09  
**Kapsam:** `src/data/frequency/{en,fr,es}.txt` sıklık listelerindeki 3.001–10.000 arası (dil başına 7.000 kelime).  
**Veri Kaynağı:** [Tatoeba Dışa Aktarımları](https://downloads.tatoeba.org/exports/per_language/) (CC BY 2.0 FR).  
**Yöntem:** [`scripts/build-pack-sentences.ts`](../../scripts/build-pack-sentences.ts) algoritması: Form tablosu (`pack.f`) ile çekim eşleme; doğrudan Türkçe çeviriler (`fra-tur`, `spa-tur`) ve İngilizce köprüsü (`fra-eng` ve `spa-eng` üzerinden `eng-tur`).

---

## 1. Genel Kapsam Özeti (3.000–10.000 Aralığı, 7.000 Kelime)

| Dil | Hedef Kelime | Cümlesi Olan Kelime | Cümle Kapsamı (%) | Türkçe Çevirili Cümlesi Olan | Türkçe Çeviri Kapsamı (%) |
|---|---|---|---|---|---|
| **İngilizce (EN)** | 7.000 | **6.812** | **%97,3** | **6.323** | **%90,3** |
| **Fransızca (FR)** | 7.000 | **6.298** | **%90,0** | **5.875** | **%83,9** |
| **İspanyolca (ES)** | 7.000 | **6.617** | **%94,5** | **6.172** | **%88,2** |

---

## 2. Sıklık Dilimlerine Göre Kapsam Dağılımı

Kelime sıklığı azaldıkça cümle ve çeviri kapsamındaki seyir:

### 2.1. İngilizce (EN)
- **Toplam Taranan Cümle:** 2.038.137 cümle (Türkçe bağlantılı: 675.225 cümle)

| Sıklık Aralığı | Kelime Sayısı | Cümlesi Olan | Cümle (%) | Türkçe Çevirisi Olan | Çeviri (%) |
|---|---|---|---|---|---|
| **3.000 – 5.000** | 2.000 | 1.983 | %99,2 | 1.914 | **%95,7** |
| **5.000 – 7.500** | 2.500 | 2.447 | %97,9 | 2.258 | **%90,3** |
| **7.500 – 10.000** | 2.500 | 2.382 | %95,3 | 2.151 | **%86,0** |
| **Toplam (3k–10k)** | **7.000** | **6.812** | **%97,3** | **6.323** | **%90,3** |

### 2.2. Fransızca (FR)
- **Toplam Taranan Cümle:** 727.867 cümle
- **Türkçe Çeviri Bağlantısı:** 260.265 cümle (*Doğrudan FR-TR: 12.317, İngilizce köprülü: 247.948*)

| Sıklık Aralığı | Kelime Sayısı | Cümlesi Olan | Cümle (%) | Türkçe Çevirisi Olan | Çeviri (%) |
|---|---|---|---|---|---|
| **3.000 – 5.000** | 2.000 | 1.866 | %93,3 | 1.772 | **%88,6** |
| **5.000 – 7.500** | 2.500 | 2.245 | %89,8 | 2.093 | **%83,7** |
| **7.500 – 10.000** | 2.500 | 2.187 | %87,5 | 2.010 | **%80,4** |
| **Toplam (3k–10k)** | **7.000** | **6.298** | **%90,0** | **5.875** | **%83,9** |

### 2.3. İspanyolca (ES)
- **Toplam Taranan Cümle:** 442.407 cümle
- **Türkçe Çeviri Bağlantısı:** 193.402 cümle (*Doğrudan ES-TR: 36.836, İngilizce köprülü: 156.566*)

| Sıklık Aralığı | Kelime Sayısı | Cümlesi Olan | Cümle (%) | Türkçe Çevirisi Olan | Çeviri (%) |
|---|---|---|---|---|---|
| **3.000 – 5.000** | 2.000 | 1.946 | %97,3 | 1.873 | **%93,7** |
| **5.000 – 7.500** | 2.500 | 2.366 | %94,6 | 2.217 | **%88,7** |
| **7.500 – 10.000** | 2.500 | 2.305 | %92,2 | 2.082 | **%83,3** |
| **Toplam (3k–10k)** | **7.000** | **6.617** | **%94,5** | **6.172** | **%88,2** |

---

## 3. Öne Çıkan Bulgular ve Değerlendirme

1. **Paket Genişletmeye Son Derece Uygun:** Mevcut sözlük paketleri ilk 3.000 kelimeyi örnek cümleyle (`c` alanı) donatmıştır. Analiz gösteriyor ki paket 10.000 kelimeye genişletilse dahi kelimelerin **%84–%90'ı için doğrudan Türkçe çevirili yüksek kaliteli örnek cümle** hazırdır.
2. **Köprü Çevirinin Gücü:** Fransızca ve İspanyolca'da doğrudan Türkçe çevirili cümle sayısı azdır (FR: 12.317, ES: 36.836). Ancak `fra-eng` ve `spa-eng` bağlantıları üzerinden İngilizce köprü kurulduğunda kullanılabilir çevirili cümle havuzu FR'de **260 bine**, ES'te **193 bine** fırlamaktadır.
3. **Cümlesi Olmayan Kelimeler:** Cümlesi bulunmayan az sayıdaki kelime (~%3–%10) genellikle çok nadir özel isimler, teknik terimler veya bölgesel arkaik biçimlerdir.
