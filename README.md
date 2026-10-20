# Diloloji

Kişisel, adaptif dil öğrenme uygulaması (İngilizce, Fransızca, İspanyolca; ana dil Türkçe).
Tek kullanıcılı, offline çalışan bir PWA. Plan ve kararlar: [docs/PLAN.md](docs/PLAN.md).

## Komutlar

```bash
npm install
npm test          # öğrenme motoru testleri
npm run dev       # geliştirme sunucusu
npm run typecheck
```

## Kullanım

1. Açılışta dil, seviye ve günlük süreyi seç.
2. **Kelimeler** ekranından kelime ekle ya da Excel/Sheets'ten bir liste yapıştır.
   Denemek için örnek kelimeler de yüklenebilir.
3. Ana sayfadaki günlük görevi başlat. Seçenekli sorular 1–4 tuşlarıyla, geçişler Enter ile yapılır.
4. **Ayarlar → Yedeği indir** ile verini yedekle; başka cihazda **Yedekten geri yükle** ile taşı.

## Öğrenme motoru (`src/engine`)

UI ve veritabanından bağımsız, saf TypeScript.

- **Beceri başına FSRS:** recognition, recall, production, listening ve collocation ayrı ayrı planlanır.
  Tanıma güçlü olsa bile production zayıfsa kelime "mastered" sayılmaz.
- **Kanıta dayalı notlama:** kullanıcı "biliyorum" demez; doğruluk, cevap süresi ve ipucu kullanımından not çıkarılır.
- **Kademeli açılım:** yeni kelime yalnızca recognition ile başlar, diğer beceriler sırayla açılır.
- **Mistake Bank:** collocation, cinsiyet/artikel, aksan, karıştırılan kelime ve biçim hataları sınıflandırılır.
- **Günlük görev:** unutulmuş → hatalı → zayıf → vadesi gelmiş → yeni sırasıyla, süre bütçesine göre hazırlanır.
  Egzersizler karışık sırayla gelir. Birbirine karışabilecek kelimeler aynı günlerde tanıtılmaz.

## Ortam değişkenleri (Vercel)

Hepsi isteğe bağlıdır; eksik olan yalnızca ilgili özelliği kapatır. Anahtarları koda ya da sohbete yazma.

| Değişken | Ne için | Eksikse |
| --- | --- | --- |
| `BLOB_READ_WRITE_TOKEN` | Vercel Blob (eşitleme, hesap onayı, bildirim kayıtları) | Eşitleme ve hesap uçları çalışmaz |
| `DEEPL_AUTH_KEY` | Cümle çevirisi (`/api/translate`) | 503, çeviri kapalı |
| `YOUTUBE_API_KEY` | YouTube altyazı arama | 501, YouTube kapalı |
| `ADMIN_TOKEN` | Hesap onayı sistemini açar, yönetici anahtarı | Onay kapalı: herkes her şeyi kullanır |
| `SYNC_ALLOWED` | Baştan onaylı kullanıcı adları (virgüllü) | Liste yok: kısıt yok |
| `CRON_SECRET` | Günlük bildirim cron'unun yetkisi | Cron 401 verir |
| `VAPID_PRIVATE_KEY` | Web push gönderimi (genel anahtar kodda) | Cron yalnızca mail gönderir (o da yoksa 503) |
| `RESEND_API_KEY` | Hatırlatma mailleri (Resend) | Ayarlar'da e-posta hatırlatması görünmez |
| `RESEND_FROM` | Mailin göndereni, doğrulanmış alan adıyla: `Diloloji <hatirlatma@alanadin>` | Resend'in deneme göndereni (yalnızca Resend hesabının kendi adresine teslim eder) |
| `ERROR_DIGEST_TO` | Sahibin adresi: Pazartesi sabahı geçen haftanın en sık 5 hatası mail gelir (`api/_errorDigest.ts`; Resend anahtarı da gerekir) | Hatalar sayılır ama özet gitmez |
| `RESEND_REPLY_TO` | İsteğe bağlı: yanıtların gideceği adres (yoksa yanıt gönderene gider) | Yok |
| `VITE_SUPABASE_URL` | Supabase ile giriş (e-posta, bağlantı, Google; `docs/SUPABASE.md`), derlemede okunur | Eski kullanıcı adı/şifre girişi |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Supabase'in herkese açık anahtarı (`sb_publishable_…`) | Eski giriş |
| `SUPABASE_SECRET_KEY` | Supabase gizli anahtarı (`sb_secret_…`), yalnızca sunucu: hesap anahtarlarını saklar, onayı okur | Supabase girişi sunucuda kapalı (503) |
| `APP_URL` | İsteğe bağlı: maillerdeki bağlantıların kökü (kendi alan adın varsa; `vercel.app` adresleri spam puanında daha zayıf) | `https://diloloji.com` |

Node sürümü: `>=22.12` (`.nvmrc` 24; CI de 24).

