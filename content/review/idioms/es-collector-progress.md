# İspanyolca deyim paketi — toplayan ilerleme kaydı

13 Kasım 2026. **Çalışma tamamlanmadı. PR #774 taslak kalır. Bu rapor bağımsız Claude denetimi değildir.**

## Mevcut durum

Dalda 16 çekirdek + 158 yeni parti kaydı = **174 ham kayıt** var. Hedef 16 × 31 yeni kayıt + 16 çekirdek = 512. Eksik 338 kayıt tamamlanmış gibi gösterilmez. Main henüz dil başına 16 deyim yayımlıyor.

Güncel main dala birleştirildi. Yeni kaynak URL ön kontrolü ilk üç partinin daha önce açılıp kaydedilmiş bazı kaynaklarını da reddediyor: ilgili sayfada deyim bulunması URL yolunda içerik kelimesi bulunduğu anlamına gelmiyor. Hayvanlar ve yemek partilerinde **73 kaynak adresi** bu ön kontrolden geçmiyor. Kaynak/kelime kuralı gevşetilmedi; adreslere yapay sorgu sözcükleri eklenmedi.

## Bu aşamada dosyaya geçirilenler

- Para partisindeki kalan 30 Wikipedia sayfası açıldı; deyim ve çekimli kullanımları arandı. Sonuçlar `es-0004-wikipedia-audit.json` içinde. Bazı sayfalarda gerçek kullanım vardı; yer/grup/eser adı eşleşmeleri ayrıca ayrıldı. Güncel ham partilerde Wikipedia atfı kalmadı.
- Para partisi 19 iki kaynaklı deyime indirildi/yenilendi. 16 eski aday elendi veya iki uygun kaynak bekleyen aday durumuna alındı; 3 yeni deyim eklendi. Gerekçeler kaynak kaydında.
- Beden partisinin URL ön kontrolünü karşılamayan kaynakları, yeniden açılmış ilgili sayfalarla değiştirildi. `chuparse el dedo`, örnek ve iki kaynağın ortak anlamı uyarınca `no chuparse el dedo` olarak düzeltildi.
- Çalışma ve çaba (0005): 16; duygular (0006): 17; konuşma ve sır (0007): 13 iki kaynaklı kayıt eklendi. Bunlar henüz 31’e tamamlanmış partiler değildir.
- 0008–0016 kaynak araştırması ve parti üretimi henüz tamamlanmadı. Kitaptaki 151 adayın tam eleme/yerleştirme raporu da bekliyor. Hazırlık klasörü/ZIP eklenmedi.

## Parti sayıları

| Parti | Tema | Kayıt | B1 | B2 | C1 | 31’e açık |
|---|---|---:|---:|---:|---:|---:|
| es-0001 | body | 31 | 6 | 13 | 12 | 0 |
| es-0002 | animals | 31 | 6 | 13 | 12 | 0 |
| es-0003 | food | 31 | 6 | 14 | 11 | 0 |
| es-0004 | money | 19 | 2 | 10 | 7 | 12 |
| es-0005 | work | 16 | 4 | 9 | 3 | 15 |
| es-0006 | feelings | 17 | 2 | 13 | 2 | 14 |
| es-0007 | talk | 13 | 3 | 9 | 1 | 18 |

0008 mind, 0009 people, 0010 trouble, 0011 time, 0012 nature, 0013 luck, 0014 ease, 0015 decide ve 0016 move ham partileri yok; her birinin 31 hedefi açık. Toplamda seviye dağılımı (çekirdek dahil): B1 29, B2 97, C1 48.

## Yenilenen kaynakların siteleri

Aşağıdaki tablo bu aşamada URL kuralına uygun hale getirilen 0001/0004/0005/0006/0007 partilerinin **96 kaydındaki 192 atfı** sayar. Bir sitenin farklı deyimlerde tekrarlanması ayrı atıftır; benzersiz sayfa sayısı değildir. 0002/0003’ün bekleyen adresleri bu tabloya katılmadı.

| Site | Atıf |
|---|---:|
| dle.rae.es | 82 |
| www.diccionarios.com | 75 |
| www.wordreference.com | 7 |
| www.spanishdict.com | 5 |
| es.wiktionary.org | 4 |
| dichosymas.com | 3 |
| dem.colmex.mx | 2 |
| diccionario.reverso.net | 2 |
| tureng.com | 2 |
| refranespopulares.com | 1 |
| en.wiktionary.org | 1 |
| horchataypalomitas.com | 1 |
| www.primerahora.com | 1 |
| espanol.lingolia.com | 1 |
| www.collinsdictionary.com | 1 |
| www.fundacionlengua.com | 1 |
| diccionarioactual.com | 1 |
| www.udep.edu.pe | 1 |
| dictionary.cambridge.org | 1 |

## Kontroller

- `node scripts/build-idioms.mjs`: **başarısız**, çıkış 1; 0002/0003’te 73 URL reddi, 8 ortak URL uyarısı. Tam çıktı: `es-build-progress-2026-11-13.txt`. Betik çıktıları hata halinde değiştirmediği için `src/data/idioms/es.json` hâlâ önceki 140 kayıtlık derlemedir; güncel ham verinin yayımlanmış sürümü değildir.
- `npx vitest run content/review/idioms/raw-progress.test.ts src/data/idioms.test.ts`: **15/15 geçti**. Ham 174 kaydın alan/form/tekrar kontrolü ve yenilenen beş partinin URL ön kontrolü dahil. Bu test sayfa içeriğinin doğruluğunu veya Claude onayını kanıtlamaz.
- `npm run typecheck`: geçti.
- `npx oxlint src api e2e`: çıkış 0; kapsam dışındaki `src/ui/shared/wordCounts.tsx:7:14` için mevcut `react(only-export-components)` uyarısı sürüyor. “Uyarısız temiz” denmiyor.
- Tam test paketi ve CI yayıma hazırlık kontrolü bu ara aşamada tamamlandı diye raporlanmıyor. Derleyici ve bütün içerik/bağımsız denetim koşulları geçmeden taslak kaldırılmaz, birleştirilmez.

## Main üzerinde gerçek derleyici çıktısı

13 Kasım 2026, main merge commit bab0b2ce üzerinde `node scripts/build-idioms.mjs`:

```text
en: 16 deyim (1 parti) · B2 16
   talk 3, decide 3, body 1, work 3, trouble 1, time 1, people 2, mind 1, luck 1
fr: 16 deyim (1 parti) · B2 16
   people 1, feelings 1, body 2, money 1, trouble 2, work 1, mind 3, talk 1, decide 1, move 1, ease 1, animals 1
es: 16 deyim (1 parti) · B2 16
   trouble 1, people 2, money 1, talk 3, mind 1, body 1, work 1, feelings 2, decide 2, ease 1, animals 1
```

## İnceleme sınırları ve devam sırası

Toplayan Codex; denetleyen Claude oturumudur. Eski `es-NNNN.md` denetimleri tarihî sürümleri anlatır; bu yeni veriye onay olarak sunulmaz. Yeni kaynak kayıtları `es-NNNN-source-checks.json` içinde. Seviye ve bölge etiketleri editoryal karardır; özellikle anlam varyantları ve sık ifadelerin eski C1 etiketleri bağımsız incelemede yeniden ele alınmalıdır.

Önce 0002/0003 URL uyumu, sonra 0005–0016 ikmal ve kitap adayları; ardından Claude incelemesi, bütün kontroller ve yeşil CI. İspanyolca birleşmeden Fransızca veya İngilizce toplanmaya başlanmadı.

## Kullanıcının sıraya eklediği sonraki iş

Deyim paketinin ardından Fransızca dilbilgisi: B1 100, B2 110, C1 90 yeni soru; her seviye ayrı PR. Mevcut 450 A1–A2 sorusunda çift doğru cevap, şablon açıklama ve cevabı ele veren ipucu taraması ayrı dördüncü PR. Yalnız Rehber’de dersi olan konular; konu başına parti, soruya özgü Türkçe açıklama, karışık desteklenen soru tipleri, bağımsız solver ve yeşil CI zorunlu. Başlamadan AGENTS.md, docs/ICERIK-FABRIKASI.md ve content/style/grammar.md baştan sona okunacak. Bu iş henüz başlamadı.
