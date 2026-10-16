# Diloloji — Resim Arama, Hava Durumu ve Klip Ağı Doğrulama Raporu (14. Tur)

**Tarih:** 2026-10-17  
**Kapsam:** Antigravity 14. Tur — Ağ gerektiren dış servislerin (Wikimedia Commons, Openverse, Pixabay, Google Görseller köprüsü, Open-Meteo Weather ve YouGlish/YouTube oEmbed) canlı doğrulama, hız sınırı (rate limit), CORS ve lisans denetimleri.

---

## 1. Resim Arama Servisleri Karşılaştırma ve Canlı Doğrulama

Uygulama kelime kartlarına görsel eklemek için üç katmanlı hibrit bir arama motoru (`src/data/imageSearch.ts`) ve harici arama köprüsü (`src/ui/ImagePicker.tsx`) kullanmaktadır:

| Servis | API / Endpoint | Kimlik Doğrulama | CORS | Hız Sınırı (Rate Limit) | Lisans & Atıf Modeli |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Wikimedia Commons** | `commons.wikimedia.org/w/api.php` | Anahtarsız | Açık (`origin=*`) | ~200 istek/dk (kibar kullanım) | CC-BY, CC-BY-SA, Kamu Malı (Sanatçı + lisans zorunlu) |
| **Openverse** | `api.openverse.org/v1/images/` | Anahtarsız (Anonim) | Açık | 20 istek/dk (burst), 200 istek/gün (sustained) | CC0, CC-BY, CC-BY-SA (Sanatçı + kaynak atfı) |
| **Pixabay HD** | `pixabay.com/api/` | İsteğe Bağlı API Anahtarı (`localStorage`) | Açık (`access-control-allow-origin: *`) | 100 istek/dk (ücretsiz anahtar) | Pixabay Content License (Ticari/kişisel serbest, atıf önerilir) |
| **Google Görseller** | `google.com/search?tbm=isch` | Harici Bağlantı Köprüsü | N/A (Sekme dışı) | Sınırsız (tarayıcı içi) | Değişken telifli (kullanıcı panodan doğrudan yapıştırır) |

### 1.1 Canlı Ağ Test Çıktıları

#### Wikimedia Commons Testi
- **Sorgu:** `pomme -band -album filetype:bitmap`
- **İstek Süresi:** ~1274 ms (DNS + MediaWiki API)
- **Yanıt Kodu:** `HTTP/2 200 OK`
- **Süzgeç Davranışı:** `NOISY_TITLE_PATTERN` (`band`, `album`, `census`, `cemetery`, `stamp`, `coin`) süzgeci sayesinde müzik grubu kapakları ve nüfus sayımı grafikleri ayıklanarak doğrudan nesne fotoğraflarına ulaşılır.

#### Openverse Testi (Canlı Başlık Analizi)
```http
HTTP/2 200 
date: Fri, 16 Oct 2026 22:09:38 GMT
content-type: application/json
server: cloudflare
x-ratelimit-limit-anon_burst: 20/min
x-ratelimit-available-anon_burst: 19
x-ratelimit-limit-anon_sustained: 200/day
x-ratelimit-available-anon_sustained: 199
```
*Bulgu:* Anonim aramalarda dakikalık 20 istek kotası tekil kelime aramaları için uygundur. Sayfa boyutu `Math.min(limit, 20)` ile sınırlandırılmıştır.

#### Pixabay Testi ve Güvenli Yedekleme
- **Geçersiz Anahtar Testi:** `https://pixabay.com/api/?key=invalid_demo_key&q=apple` -> `HTTP/2 400 Bad Request`
- **Hata Yönetimi Doğrulaması:** `searchImages()` fonksiyonunda Pixabay anahtarı geçersiz olduğunda veya kota bittiğinde `try/catch` bloğu sessizce hatayı yakalayarak Commons + Openverse ortak havuzuna geri döner (kullanıcıya hata fırlatılmaz).

#### Google Görseller & Pano Yapıştırma Akışı
- Uygulama `https://www.google.com/search?tbm=isch&q=<kelime>&safe=active` bağlantısı sunar.
- Kullanıcı Google Görseller sekmesinde istediği resmi "Resmi Kopyala" ile panoya aldığında, `ImagePicker` bileşeni `navigator.clipboard.read()` API'si ile panodan görseli otomatik okur ve istemci tarafında optimize WebP formatına sıkıştırır (`shrinkImage`).

---

## 2. Hava Durumu Servisi (Open-Meteo) Doğrulaması

Ana sayfadaki karşılama kahramanına (`DayMark`) hava koşullu selam ve avatar (`weather-rain.webp`, `weather-snow.webp`, `weather-cloudy.webp`, `weather-thunder.webp`) sağlayan Open-Meteo entegrasyonunun teknik özellikleri:

- **Sağlayıcı:** Open-Meteo (`https://open-meteo.com`)
- **Lisans ve Şartlar:** Ticari olmayan ve açık kaynaklı projeler için tamamen ücretsiz. API anahtarı gerekmez.
- **CORS:** İstemci taraflı doğrudan çağrılara açık (`access-control-allow-origin: *`).
- **Uç Noktalar:**
  1. Geocoding API: `https://geocoding-api.open-meteo.com/v1/search?name=<sehir>&count=1&language=tr&format=json`
  2. Forecast API: `https://api.open-meteo.com/v1/forecast?latitude=<lat>&longitude=<lon>&current=weather_code,temperature_2m,is_day`

### 2.1 Canlı Yanıt Verisi (Örnek İstek)
```json
{
  "latitude": 41.02444,
  "longitude": 28.940546,
  "generationtime_ms": 0.0437,
  "current_units": {
    "weather_code": "wmo code",
    "temperature_2m": "°C",
    "is_day": ""
  },
  "current": {
    "time": "2026-10-16T22:00",
    "weather_code": 61,
    "temperature_2m": 11.0,
    "is_day": 0
  }
}
```

### 2.2 Çevrimdışı ve Gizlilik Koruması
- **Popüler Şehirler Sözlüğü (`POPULAR_CITIES`):** İstanbul, Ankara, İzmir, Antalya, Bursa, Adana, Trabzon, Paris, Londra, Madrid, Barselona, Berlin, Roma, Amsterdam, Tokyo, New York şehirleri için koordinatlar doğrudan kaynak kodunda tanımlıdır. Kullanıcı bu şehirlerden birini girdiğinde harici geocoding isteği dahi atılmaz.
- **İstemci Önbelleği:** Alınan hava durumu verisi `localStorage` içinde `CACHE_TTL_MS = 30 * 60 * 1000` (30 dakika) boyunca saklanır. Uygulama her açıldığında gereksiz ağ trafiği oluşturmaz.
- **Konum İzni:** Uygulama kullanıcıdan zorunlu GPS konumu istemez; kullanıcı Profil ayarlarında isterse şehir adını manuel olarak belirtebilir.

---

## 3. YouGlish ve YouTube oEmbed Hızlı Yolu Doğrulaması (#385)

YouTube API anahtarlarının kota kısıtlamalarına ve hız sınırlarına takılmadan "Videolarda duy" özelliğinin çalışabilmesi için kurulan YouGlish altyazı dizini ve YouTube oEmbed meta veri çıkarma mimarisi canlı test edilmiştir.

### 3.1 5 Örnek Video ile YouTube oEmbed Doğrulaması

Uç nokta: `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=<id>&format=json`

| # | Video ID | Yanıt Kodu | Gecikme | Başlık | Kanal / Sanatçı |
| :--- | :--- | :--- | :--- | :--- | :--- |
| 1 | `dQw4w9WgXcQ` | `200 OK` | 205 ms | "Rick Astley - Never Gonna Give You Up (Official Video) (4K Remaster)" | Rick Astley |
| 2 | `jNQXAC9IVRw` | `200 OK` | 69 ms | "Me at the zoo" | jawed |
| 3 | `9bZkp7q19f0` | `200 OK` | 67 ms | "PSY - GANGNAM STYLE(강남스타일) M/V" | officialpsy |
| 4 | `kJQP7kiw5Fk` | `200 OK` | 71 ms | "Luis Fonsi - Despacito ft. Daddy Yankee" | LuisFonsiVEVO |
| 5 | `JGwWNGJdvx8` | `200 OK` | 77 ms | "Ed Sheeran - Shape of You (Official Music Video)" | Ed Sheeran |

*Doğrulama Sonucu:* 5/5 video için ortalama yanıt süresi **97 ms** olarak ölçülmüştür. YouTube oEmbed API anahtarı istememekte, video başlığı ve kanal sahibini eksiksiz döndürmektedir.

### 3.2 YouGlish Altyazı Dizini Canlı Testi

Uç nokta: `https://youglish.com/pronounce/<kelime>/<dil>`

| Dil | Örnek Kelime | HTTP Kodu | Gecikme | `jsonData` Durumu |
| :--- | :--- | :--- | :--- | :--- |
| **Fransızca** | *bonjour* | `200 OK` | 235 ms | Mevcut (`has jsonData: true`) |
| **İspanyolca** | *amigo* | `200 OK` | 84 ms | Mevcut (`has jsonData: true`) |
| **İngilizce** | *serendipity* | `200 OK` | 79 ms | Mevcut (`has jsonData: true`) |

*Sonuç:* YouGlish altyazı dizini üzerinden video ID ve zaman damgaları (start cue) başarıyla çekilmekte, ardından oEmbed ile başlıklar zenginleştirilerek istemciye tam `Clip` nesneleri olarak sunulmaktadır.
