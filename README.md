# Diloloji

Kişisel, adaptif dil öğrenme uygulaması (İngilizce, Fransızca, İspanyolca; ana dil Türkçe; önceki adıyla Kelime Koçu).
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
| `VAPID_PRIVATE_KEY` | Web push gönderimi (genel anahtar kodda) | Cron 503 verir |

Node sürümü: `>=22.12` (`.nvmrc` 24; CI de 24).

