# Kelime Koçu

Kişisel, adaptif kelime öğrenme uygulaması (İngilizce, Fransızca, İspanyolca; ana dil Türkçe).
Tek kullanıcılı, offline çalışan bir PWA. Plan ve kararlar: [docs/PLAN.md](docs/PLAN.md).

## Komutlar

```bash
npm install
npm test          # öğrenme motoru testleri
npm run dev       # geliştirme sunucusu
npm run typecheck
```

## Öğrenme motoru (`src/engine`)

UI ve veritabanından bağımsız, saf TypeScript.

- **Beceri başına FSRS:** recognition, recall, production, listening ve collocation ayrı ayrı planlanır.
  Tanıma güçlü olsa bile production zayıfsa kelime "mastered" sayılmaz.
- **Kanıta dayalı notlama:** kullanıcı "biliyorum" demez; doğruluk, cevap süresi ve ipucu kullanımından not çıkarılır.
- **Kademeli açılım:** yeni kelime yalnızca recognition ile başlar, diğer beceriler sırayla açılır.
- **Mistake Bank:** collocation, cinsiyet/artikel, aksan, karıştırılan kelime ve biçim hataları sınıflandırılır.
- **Günlük görev:** unutulmuş → hatalı → zayıf → vadesi gelmiş → yeni sırasıyla, süre bütçesine göre hazırlanır.
  Egzersizler karışık sırayla gelir. Birbirine karışabilecek kelimeler aynı günlerde tanıtılmaz.
