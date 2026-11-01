# Yayın ve canlı doğrulama — 1 Kasım 2026

## Telefon testleri

`npx playwright install --with-deps chromium webkit` ardından `npm run test:e2e`.
Yalnızca iPhone: `npx playwright test --project='iPhone (WebKit)'` (önce misafir test derlemesi gerekir).
Profil iPhone 13 boyutlarını ve WebKit'i kullanır; fiziksel iPhone testi yerine geçmez.
CI iki tarayıcıyı da kurar. WebKit testlerinin yerel çalışması bu ortamda indirme alan adlarının 403 vermesi nedeniyle engellendi.
WebKit ayrı CI işinde çalışır; hassas ilk kurulum ve tema kontrastı akışları önce, kalan testler sonra çalıştırılır. Her test bir kez koşar. Başarısızlıkta `test-results` ve HTML raporu saklanır.
390×664 görünümünde ilk kurulumun üç adımı ve tema kontrastı Chromium'da doğrulandı; kısa ekranlarda dil kartları tek sütundur ve ana düğmeler ilk ekrana sığar.
Dokunma testlerinde `Touch` kurucusu yerine olay özellikleri kullanılır; IndexedDB temizliği uygulama kapatıldıktan sonra yapılır; kontrast ölçümünden önce sonlu animasyonlar beklenir.

## Gerçek hesaplarla iki cihaz

Durum: **kullanıcının isteğiyle şimdilik ertelendi**. Bu ortamda ayrılmış test hesapları veya canlı servis ayarları yok.

1. Yalnızca silinmesi için ayrılmış bir test hesabıyla iki bağımsız tarayıcı/cihazda giriş yap.
2. A'da benzersiz kelime ve kişisel cümle, B'de farklı kelime oluştur; iki tarafta eşitle, her iki kaydın iki cihazda da olduğunu doğrula.
3. İki cihaz çevrimdışıyken farklı kayıtlar oluştur; yeniden bağlanıp ters sırayla eşitle. İlk eşitleme çakışmasını da yeni hesapla tekrarla.
4. A'da resim/ses ekle; B'de dosyanın gerçekten açıldığını doğrula. Başarısız yüklemede çıkışın veriyi koruduğunu kontrol et.
5. A'da bir kelime sil, B'de eşitle; silinen kaydın geri gelmediğini doğrula.
6. Test hesabını sil. A ve B'de eski oturumla korunan isteklerin reddedildiğini; Auth, eşitleme, medya, hatırlatma ve arkadaş verilerinin kaldırıldığını sunucudan doğrula. Sonucu kaydet; yalnızca arayüz mesajı yeterli değildir.

## Yayın koşulları

`npm run deploy:cf` gerçek `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY` ve yetkili Cloudflare oturumu gerektirir. Ayarlar eksik olduğunda betik yayını durdurur. Test adresleriyle veya misafir derlemesiyle yayın yapılmamalı.

## Sözlük üretimi

Kaikki indirme alan adına ve kullanılan DeepL uç noktasına ağ erişimi, ayrıca `DEEPL_AUTH_KEY` gerekir. Anahtarı depoya ekleme. Kaynak yenileme, sıklık kuyruğu ve taslak üretme komutları için [kapsam belgesine](veri/sozluk-kapsami/README.md) bak. Taslak çevirileri incelemeden `reviewed` yapma. Mevcut ekler editoryal denetimlidir; yeni dış kaynak doğrulaması yapılmış sayılmaz.
