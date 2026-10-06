# "Videolarda duy": YouTube API anahtarı

Kelime sayfasındaki **Videolarda duy** bölümü (`/api/clips`) kelimenin YouTube videolarında geçtiği anları
bulur. Videoları bulmak için YouTube'un resmî arama API'sini kullanır; bunun için **ücretsiz** bir anahtar gerekir.
Anahtar yokken bölüm "YouTube API anahtarı gerekiyor" der, uygulamanın geri kalanı etkilenmez.

## Anahtarı almak (bir kez, birkaç dakika)

1. https://console.cloud.google.com adresinde bir proje aç (ya da var olanı seç).
2. "APIs & Services" > "Library" > **YouTube Data API v3** > Enable.
3. "APIs & Services" > "Credentials" > "Create credentials" > **API key**.
4. Anahtarı kısıtla: "API restrictions" altında yalnızca YouTube Data API v3'ü seç.
5. Vercel'de projenin "Settings" > "Environment Variables" bölümüne `YOUTUBE_API_KEY` adıyla ekle, sonra yeniden yayınla.

## Kota

Günlük ücretsiz kota 10 000 birim; bir arama 100 birim, yani günde yaklaşık 100 kelime araması
(rakamlar Google'ın güncel koşullarına göre değişebilir, kendi konsolundan kontrol et). Tasarım kotayı
korur: arama yalnızca "Videolarda ara"ya basınca başlar, sunucu cevabı bir hafta önbelleğe alır
(`s-maxage=604800`) ve tarayıcı cihazda bir hafta saklar. Kota dolarsa bölüm "yarın tekrar dene" der.

## Nasıl çalışır

- Arama: `search.list` (`type=video`, `videoCaption=closedCaption`, `videoEmbeddable=true`, `relevanceLanguage`).
- Her bulunan videonun altyazısı (elle yazılmış varsa o, yoksa otomatik) uygulamanın `/api/youtube` ile
  de kullandığı YouTube oyuncu API'sinden alınır; kelimenin (herhangi bir çekimiyle) geçtiği satırlar zamanlarıyla döner.
- Oynatıcı `youtube-nocookie.com/embed` ile açılır; satırdan bir saniye önce başlar, bir saniye sonra durur.

## Sınırlar

- Altyazıyı almak resmî olmayan bir uç noktaya dayanır (mevcut `/api/youtube` gibi); YouTube değiştirirse kırılabilir.
- Otomatik altyazılar yanlış yazabilir; sonuçta "otomatik altyazı" etiketi çıkar.
- Uç nokta herkese açıktır: adresi bilen biri kotanı harcayabilir. Tek kişilik kullanımda sorun değil;
  paylaşılacaksa bir istek sınırı ya da giriş denetimi eklenmeli.
