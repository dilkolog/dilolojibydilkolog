# Performans ve Bundle Boyutu Analiz Raporu

Bu belge, **Diloloji** (önceki adıyla Kelime Koçu) uygulamasının üretim derlemesi (`vite build`) çıktı parçalarını, ilk açılış yükünü, bağımlılık kullanımını ve önbellek stratejilerini analiz eder. Kod değişikliği içermez; gelecekteki optimizasyonlar için somut bir durum tespiti ve yol haritasıdır.

Son analiz tarihi: 2026-10-10.

---

## 1. Genel Özet ve Temel Metrikler

| Metrik | Değer | Açıklama |
| :--- | :--- | :--- |
| **Toplam Derleme Süresi** | ~350–450 ms | Vite 8 + Rolldown mimarisi ile son derece hızlı derleme |
| **Toplam Varlık Sayısı** | 127 dosya | JS chunk'ları, CSS, Web Worker ve statik varlıklar |
| **PWA Precache Boyutu** | **6.34 MB** | Service Worker tarafından çevrimdışı kullanım için önbelleğe alınan toplam veri |
| **İlk Açılış JS Yükü (Ham)** | ~880 kB | `index.html` içinde doğrudan yüklenen ve `modulepreload` edilen scriptler |
| **İlk Açılış JS Yükü (Gzip)** | **~265 kB** | Ağ üzerinden ilk ziyarette transfer edilen gerçek sıkıştırılmış JS boyutu |
| **İlk Açılış CSS Yükü** | 141 kB (22.6 kB gzip) | Tek ana stil dosyası (`index-*.css`) |

---

## 2. En Büyük 10 Parça (Chunks)

Vite derleme çıktısında en yüksek disk ve transfer alanını kaplayan 10 dosya:

| # | Dosya Adı / İçerik | Ham Boyut | Gzip Boyutu | Yüklenme Zamanı |
| :-: | :--- | :-: | :-: | :--- |
| **1** | `es-sentences-*.js` (İspanyolca örnek cümleler) | **713.4 kB** | 209.5 kB | İspanyolca alıştırmalarda dinamik |
| **2** | `index-*.js` (Uygulama kabuğu, React, çekirdek) | **513.5 kB** | 163.8 kB | **İlk açılışta (Entry)** |
| **3** | `fr-*.js` (Fransızca sözlük & Tatoeba corpus) | **492.7 kB** | 116.8 kB | Fransızca sözlükte dinamik |
| **4** | `fr-sentences-*.js` (Fransızca örnek cümleler) | **415.6 kB** | 149.2 kB | Fransızca alıştırmalarda dinamik |
| **5** | `claude-*.js` (`@anthropic-ai/sdk`) | **317.0 kB** | 82.7 kB | Yalnızca AI serbest üretimde dinamik |
| **6** | `fr--*.js` (Fransızca CEFR & frekans listesi) | **303.8 kB** | 138.5 kB | Seviye/kapsam analizinde dinamik |
| **7** | `es-*.js` (İspanyolca CEFR & frekans listesi) | **302.3 kB** | 137.8 kB | Seviye/kapsam analizinde dinamik |
| **8** | `fr-*.js` (Fransızca fiil çekim tabloları) | **295.9 kB** | 90.9 kB | Fiil Laboratuvarı açılınca dinamik |
| **9** | `en-*.js` (İngilizce frekans listesi) | **278.1 kB** | 134.8 kB | İngilizce dil seçilince dinamik |
| **10** | `es-*.js` (İspanyolca fiil çekim tabloları) | **224.9 kB** | 56.3 kB | Fiil Laboratuvarı açılınca dinamik |

> **Gözlem:** En büyük parçaların 8 tanesi doğrudan dil veri paketleridir (cümleler, çekimler, sözlük, frekans). Kod tabanının kendisi (`index-*.js` hariç) son derece modüler ve hafiftir.

---

## 3. İlk Açılışta Yüklenen Kod ve Veri (Initial Boot Bundle)

Kullanıcı siteyi ilk kez açtığında (`index.html`) tarayıcıya gelen ve doğrudan çalıştırılan parçalar:

1. **Ana Uygulama Scripti (`index-*.js`, 513.5 kB / 163.8 kB gzip):**
   - React 19 çekirdeği ve JSX runtime
   - Temel durum yönetimi, navigasyon kabuğu (`AppSidebar`, alt sekme barı)
   - Ana ekran (`Today.tsx` / Bugün bileşenleri)
2. **Veritabanı Örneği (`instance-*.js`, 125.0 kB / 40.5 kB gzip):**
   - Dexie IndexedDB şeması ve ilklendirme mantığı
   - Scheduler (FSRS) temel yapılandırması
3. **Zaman ve Alıştırma Kılavuzları (`tenseGuide-*.js`, `exercises-*.js`, ~65 kB / 22 kB gzip):**
   - Günlük oturumun soru tipleri ve zaman ipuçları
4. **İkon ve Ses Yardımcıları (`speech-*.js`, `icons-*.js`, ~41 kB / 13.8 kB gzip):**
   - 24px SVG ikon havuzu ve Web Speech API yöneticisi
5. **Stil Dosyası (`index-*.css`, 141 kB / 22.6 kB gzip):**
   - CSS tokenları, karanlık/sakin tema değişkenleri, responsive ızgara ve animasyonlar

**Toplam İlk Açılış Transferi (Gzip): ~288 kB.**
Bu boyut, 4G bağlantıda ~150–250 ms, 3G bağlantıda ~600–900 ms içinde indirilebilecek seviyededir ve modern bir PWA için sağlıklı bir başlangıç bütçesidir.

---

## 4. Bağımlılıkların Kullanım Durumu (Dependency Audit)

`package.json` içindeki harici kütüphanelerin maliyet/kullanım analizi:

| Paket | Boyut Katkısı | Kullanım Yeri & Davranışı | Durum |
| :--- | :--- | :--- | :--- |
| **`@anthropic-ai/sdk`** | 317 kB (82.7 kB gzip) | `src/ai/usage.ts`: Yalnızca kullanıcı Claude API anahtarı girip serbest cümle değerlendirmesi istediğinde dinamik `import()` edilir. | **Çok İyi:** İlk açılışa 0 bayt etki eder. |
| **`sql.js`** | 39.7 kB + wasm | `src/data/ankiImport.ts`: Yalnızca `.apkg` Anki destesi içe aktarılırken dinamik yüklenir. | **Çok İyi:** İhtiyaç anına kadar ertelenmiştir. |
| **`fflate`** | ~25 kB | `src/data/ankiImport.ts` ve yedekleme: Zip sıkıştırma/açma için lazy kullanılır. | **Optimize.** |
| **`d3-force`** | ~35 kB | `src/ui/WordGraph.tsx`: Sadece Kelimeler → Ağ Görünümü açıldığında yüklenir. | **Optimize.** |
| **`dexie`** | ~110 kB | `src/data/db.ts`: Tüm uygulamanın offline IndexedDB omurgası. | **Gerekli:** İlk açılışta yüklenmesi zorunludur. |
| **`ts-fsrs`** | ~15 kB | `src/engine/scheduler.ts`: Aralıklı tekrar hesaplamaları. | **Hafif ve gerekli.** |

---

## 5. Sözlük Paketleri ve Sesli İçerik Önbellek Stratejisi

- **Sözlük Paketleri (`loadPack`):**
  - Sözlük paketleri ve Tatoeba örnek cümleleri tek parça halinde bundle'a gömülmemiştir.
  - Yalnızca kullanıcının o an aktif olarak çalıştığı dil için (`fr`, `es`, `en`) talep edildiğinde çekilir ve IndexedDB/bellek önbelleğine alınır.
- **LibriVox Sesli Kitapları ve Global Storybooks:**
  - Ses dosyaları (MP3) doğrudan LibriVox / Archive.org ve Global Storybooks CDN'lerinden HTTP menzil istekleriyle (stream) oynatılır.
  - Uygulama bundle'ına hiçbir ses MP3'ü dahil edilmemiştir; bu sayede PWA önbelleği şişirilmemiştir.
- **Service Worker Önbelleği (`dist/sw.js`):**
  - Workbox `generateSW` stratejisi ile 127 varlığın tamamı (tüm dillerin sözlük ve cümle chunk'ları dahil, 6.34 MB) önbelleğe alınmaktadır.
  - Bu yaklaşım, ilk ziyaret sonrasında uygulamanın metroda veya uçak modunda tamamen çevrimdışı açılmasını garanti eder; ancak ilk ziyarette arka planda 6 MB indirme yapar.

---

## 6. Öneriler (Etkisi Büyük, Riski Düşük Sırayla)

Aşağıdaki iyileştirmeler uygulamanın ilk açılış hızını ve veri tüketimini daha da optimize etmek için önerilmektedir:

### 1. Fiil Kılavuzu ve Kurallarının Ana Bundle'dan Ayrılması
- **Etki:** ~40 kB tasarruf (ilk açılışta ~14 kB gzip azalması)
- **Risk:** Çok düşük
- **İlgili Dosyalar:** `src/engine/tenseGuide.ts`, `src/engine/tenses.ts`, `src/AppScreens.tsx`
- **Açıklama:** `tenseGuide` ve geniş çekim kuralları ilk açılışta `Today` ekranı için zorunlu değildir. Fiil Laboratuvarı (`VerbLab.tsx`) veya Çekimler Kartı (`TextForms.tsx`) açıldığında dinamik olarak yüklenmesi ana bundle'ı 500 kB sınırının altına indirecektir.

### 2. İspanyolca ve Fransızca Cümle Chunk'larının Sıkıştırılması
- **Etki:** ~300 kB tasarruf
- **Risk:** Düşük
- **İlgili Dosyalar:** `scripts/build-corpus.ts`, `src/data/wordpack.ts`
- **Açıklama:** `es-sentences-*.js` (713 kB) ve `fr-sentences-*.js` (415 kB) içinde tekrarlayan JSON anahtarları yerine, sütun bazlı veya sıkıştırılmış metin formatı (tsv benzeri string) kullanılarak ham dosya boyutu %30–40 oranında küçültülebilir.

### 3. PWA Service Worker Precache Kapsamının İncelenmesi
- **Etki:** İlk arka plan indirmesinde ~3–4 MB mobil veri tasarrufu
- **Risk:** Orta (çevrimdışı stratejisi dikkatle test edilmeli)
- **İlgili Dosyalar:** `vite.config.ts`
- **Açıklama:** Kullanıcı yalnızca Fransızca öğreniyorsa, Service Worker'ın İspanyolca (`es-sentences`, `es-aspect`, `es-*.js`) chunk'larını peşin olarak indirmesi yerine `RuntimeCaching` (kullanıldıkça önbelleğe alma) stratejisine geçilebilir.

### 4. İkon Setinin Ağaç Budaması (Tree-shaking)
- **Etki:** ~10 kB tasarruf
- **Risk:** Düşük
- **İlgili Dosyalar:** `src/ui/icons.tsx`
- **Açıklama:** 82 ikon tek bir dosyadan dışa aktarıldığı için bazı bundler yapılandırmalarında kullanılmayan ikonlar da chunk içinde kalabilmektedir. İkonların alt kategorilere bölünmesi veya doğrudan SVG optimizasyonu sağlanabilir.
