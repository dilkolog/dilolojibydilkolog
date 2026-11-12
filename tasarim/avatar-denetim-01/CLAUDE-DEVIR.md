# Claude için devir

Bu bir tasarım denetimidir; uygulama kodu veya yeni avatar görseli üretilmedi. Kaynak `origin/main` b1c059bb. İlgili dosyalar:

- `src/ui/profile/Profile.tsx`: seçim editörü, kilit koşulları, seçim anında kayıt, renkler.
- `src/ui/profile/Avatar.tsx`: portre/figür ayrımı; çizilmiş ücretsiz portrede profil renginin kullanılmaması, figürde yumuşak renk zemini.
- `src/ui/profile/avatarArt.ts`: 15 ücretsiz + 27 özel seçenek, kalıcı kimlikler ve açılma koşulları.
- `src/lazy.css`: `.emoji-grid`, `.emoji-btn`, `.earned-avatar`, `.earned-lock`.
- `src/index.css`: `.avatar`, `.avatar-figure`.

Önce README'deki kadraj/ölçek ve koleksiyon yerleşimini ele al. Avatarların mevcut kalıcı kimliklerini ve kazanılma koşullarını koru. Bu denetim yeni ödül kuralları önermez.

Adları ve kısa açılma koşulunu görünür yap. Kilitli karta dokunulduğunda mevcut koşul açıklaması korunabilir; yalnız title üzerine kurulmasın. Mevcut img alt metinleri ve aria-pressed bulunuyor; görünür durum açıklamalarını bunlarla tutarlı tut. Şu an en küçük grid sütunu 2.75rem: sorun bütün düğmelerin mutlaka küçük dokunma hedefi olması değil, görselin kendi kadrajındaki yüzün çok küçük kalmasıdır.

Profil rengi kapak veya figür zemininde etkili olabilir; ücretsiz portrelerin sabit arka planı var. Renk değiştirmiyor diye koşulsuz hata yazma; seçili türde etkinin anlaşılmasını iyileştir.

Çizim değişimleri için aynı yüz ölçeği, kontur, göz yerleşimi ve pastel zemin standardı kullan. Kronos, yıldız ve tam boy figürlerde CSS büyütmek tek başına yeterli olmayabilir; ayrı avatar kadrajı gerekebilir. Yeni portre kaynağı olmadan tam figürü object-fit: cover ile rastgele kırpma.

Uygulama değişirse 375 px ve masaüstünde, açık/koyu temada; klavye ve dokunmada; kilitli, açılmış, seçili ve fotoğraflı durumlarda doğrula. Bu incelemede bu etkileşim testleri yapılmadı.
