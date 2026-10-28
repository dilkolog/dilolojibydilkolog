# Diloloji Android uygulaması (TWA)

Uygulama, Play Store'dan indirilen ince bir kabuktur: `diloloji.com`'u telefondaki Chrome altyapısıyla
adres çubuğu olmadan açar (Trusted Web Activity). Kodun tamamı sitededir; siteye yapılan her dağıtım
uygulamaya da anında ulaşır, mağazaya yeni sürüm göndermek gerekmez. Yeni sürüm yalnızca kabuk
değişince (simge, ad, renk, Google'ın yıllık hedef API şartı) gerekir.

Bu klasörde yalnızca iki dosya izlenir: `twa-manifest.json` (uygulamanın ayarları) ve bu not.
Bubblewrap'in ürettiği Android projesi, derleme çıktıları ve **imza anahtarı** `.gitignore`'dadır.

| Ayar | Değer |
|---|---|
| Paket adı | `com.diloloji.app` (Play'e ilk yüklemeden sonra **değişmez**) |
| Açılan adres | `https://diloloji.com/` |
| Chrome yoksa | Custom Tab (`fallbackType: customtabs`) |
| Bildirimler | Chrome'a devredilir (Android 13+ izni uygulama ister) |
| Paylaş → Diloloji | Sitenin `share_target`'ı ile aynı |

## 1. Gerekenler (bir kez)
- Node 22+ (projenin kendisi için zaten var).
- JDK 17 ve Android SDK: Bubblewrap ilk çalıştırmada indirmeyi önerir (`npx @bubblewrap/cli doctor`
  eksikleri söyler). Claude'un bulut ortamı `dl.google.com`'a erişemediği için derleme orada yapılamaz;
  kendi bilgisayarında yap.

## 2. Yükleme anahtarı (bir kez, sakla)
```sh
cd android
keytool -genkeypair -v -keystore diloloji-upload.keystore -alias diloloji-upload \
  -keyalg RSA -keysize 2048 -validity 10000
```
- Şifreyi bir parola yöneticisine yaz; dosyanın bir yedeğini depo dışında tut.
- Play App Signing açık olacağı için bu yalnızca **yükleme** anahtarıdır: kaybolursa Play Console'dan
  yenisi istenebilir. Asıl imza anahtarını Google saklar.
- Anahtar dosyası ve şifresi asla commit'lenmez, sohbete yazılmaz.

## 3. Derleme
```sh
cd android
npx @bubblewrap/cli update --skipVersionUpgrade   # twa-manifest.json'dan Android projesini üretir
npx @bubblewrap/cli build                          # app-release-bundle.aab + app-release-signed.apk
```
- `update` proje yokken hata verirse bir kez
  `npx @bubblewrap/cli init --manifest https://diloloji.com/manifest.webmanifest` çalıştır, soruları
  `twa-manifest.json`'daki değerlerle cevapla, sonra `git checkout twa-manifest.json` ile bu dosyayı geri al
  ve yeniden `update` çalıştır.
- Play'e yüklenen dosya `app-release-bundle.aab`; telefonda denemek için `app-release-signed.apk`
  (`adb install app-release-signed.apk`).
- Kurulumsuz alternatif: [PWABuilder](https://www.pwabuilder.com) → `diloloji.com` → Android →
  aynı paket adı ve ayarlar. Bu yolda da 4. adım aynıdır.

## 4. Parmak izleri (uygulama tam ekran açılsın diye)
Android, uygulamanın siteye ait olduğunu `https://diloloji.com/.well-known/assetlinks.json` ile doğrular.
Dosyada uygulamayı imzalayan anahtarın SHA-256 parmak izi yoksa uygulama **üstte adres çubuğuyla** açılır.

Gereken iki parmak izi:
1. **Play uygulama imzalama anahtarı:** Play Console → uygulama → *Test ve yayınla → Kurulum → Uygulama
   bütünlüğü (App signing)* → "Uygulama imzalama anahtarı sertifikası" → SHA-256. Mağazadan inen her
   kopya bununla imzalanır.
2. **Yükleme anahtarı** (yalnızca `adb` ile denerken):
   `keytool -list -v -keystore diloloji-upload.keystore -alias diloloji-upload` → SHA-256.

İkisini de `public/.well-known/assetlinks.json` içindeki `sha256_cert_fingerprints` listesine ve
`twa-manifest.json` içindeki `fingerprints` listesine (`{"name": "play", "value": "AB:CD:…"}`) yaz
(`npx @bubblewrap/cli fingerprint add <SHA-256>` ikinci dosyayı kendisi günceller). İki liste aynı
olmalı: `src/androidApp.test.ts` denetler. Sonra siteyi dağıt; `npm run verify:deploy` dosyanın
yayında olduğunu denetler. Parmak izi bir sır değildir, depoya yazılabilir.

## 5. Yeni kabuk sürümü
`twa-manifest.json`'da `appVersionCode`'u bir artır (ve `appVersionName`'i değiştir), 3. adımı tekrarla,
yeni `.aab`'ı Play'e yükle.

## 6. Yayından önce uygulamada kapanması gereken açık
**Kullanıcı içeriği politikası:** Play, kullanıcıların birbirine içerik gönderebildiği uygulamalarda
(arkadaşa metin/kelime, topluluk kütüphanesi, okuma kulübü) uygulama içinden **şikâyet etme** ve
**kullanıcı engelleme** yolu ister. Diloloji'de bu yok (topluluk listelerini şimdilik sahibi elle siler).
Üretime başvurmadan önce eklenmeli; ya da bu özellikler Android'de kapatılmalı.

## 7. Google Play Console (kişisel hesap)
1. Geliştirici hesabı: tek seferlik 25 $, kimlik doğrulaması.
2. Uygulama oluştur: ad *Diloloji*, varsayılan dil Türkçe, uygulama, ücretsiz.
3. **Kapalı test zorunlu:** kişisel hesaplarda üretime geçmeden önce **en az 12 test kullanıcısı
   14 gün kesintisiz** kapalı testte olmalı. Testçilerin Gmail adreslerini bir listeye ekle, katılım
   bağlantısını gönder; 14 gün dolunca "Üretime erişim başvurusu" açılır.
4. Mağaza sayfası: kısa açıklama (≤80 karakter), uzun açıklama, 512 px simge (`public/pwa-512.png`),
   1024×500 tanıtım görseli, en az 2 telefon ekran görüntüsü; kategori *Eğitim*.
5. Formlar (*Uygulama içeriği*):
   - **Gizlilik politikası:** `https://diloloji.com/gizlilik`
   - **Hesap silme:** uygulama içi yol (*Ayarlar → Hesap → Hesabı sil*) ve web adresi
     `https://diloloji.com/hesap-silme`
   - **Reklam:** yok. **Hedef kitle:** 13 yaş ve üstü (çocuklara yönelik değil).
   - **İçerik derecelendirmesi:** eğitim; şiddet ve kumar yok. Kullanıcılar arası etkileşim **var**:
     arkadaşa metin ve kelime gönderme, topluluk kütüphanesi, okuma kulübü (serbest sohbet yok).
   - **Veri güvenliği** (hepsi aktarımda şifreli, hiçbiri reklam için değil, kullanıcı silebilir):

     | Veri | Toplanıyor mu | Amaç | Zorunlu mu |
     |---|---|---|---|
     | E-posta adresi | Evet | Hesap yönetimi | Evet |
     | Ad, profil resmi (Google ile girişte) | Evet | Hesap yönetimi | Hayır |
     | Kullanıcı kimliği (@kullanıcı adı) | Evet | Uygulama işlevi (arkadaşlar) | Evet |
     | Uygulama etkinliği (çalışma geçmişi, kelimeler) | Evet | Uygulama işlevi (eşitleme) | Evet |
     | Kullanıcının oluşturduğu içerik (listeler, metinler) | Evet | Uygulama işlevi | Hayır |
     | Ses kayıtları (yalnızca kelimeye kendi kaydını eklersen) | Evet | Uygulama işlevi | Hayır |
     | Kilitlenme / hata günlükleri | Evet | Analiz (hata ayıklama) | Evet |
     | Konum, rehber, reklam kimliği | Hayır | | |

   Altyapı sağlayıcılarına (Cloudflare, Supabase, Resend) aktarım Play'in tanımında "paylaşma" sayılmaz.
6. Testte bakılacaklar: Google ve e-postayla giriş, eşitleme, bildirim izni ve hatırlatmalar, mikrofon
   (gölgeleme, sesli cevap), sesli okuma, çevrimdışı açılış, geri tuşu, Paylaş → Diloloji,
   **üstte adres çubuğu görünmemeli** (görünüyorsa 4. adım).
