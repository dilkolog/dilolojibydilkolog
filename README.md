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
