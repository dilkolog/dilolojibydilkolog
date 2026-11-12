# İspanyolca toplayan ilerleme kaydı

Bu dosya bağımsız Claude denetimi değildir. PR #774 hâlâ taslaktır; bütün İspanyolca paketinin tamamlandığı veya yayıma hazır olduğu anlamına gelmez.

## Geçerli plan

16 × 31 parti + korunacak 16 çekirdek: toplam 512 olabilir. Kaynak/kalite koşulları sayı ve seviye kotasından önce gelir. İki gerçek kaynak bulunamayan veya şeffaf kalan ifade sırf sayı tamamlamak için alınmaz. Toplayan Codex; bağımsız denetleyen Claude oturumu. Kitap yalnız aday kaynağıdır; #775 kapatıldı, hazırlık klasörü bu PR'a alınmadı.

## Bu ara kaydın kapsamı

İlk üç partide toplam **93 kayıt**, **186 kaynak atfı** yeniden kuruldu. Her sayfada deyim, çekimli kullanımı veya açıklanan taban locución görüldü. Özellikle kaynakta farklı biçim varsa yanındaki JSON kaydında yazıldı. Kaynak tanımı/örneği kopyalanmadı; özgün Türkçe anlam ve örnekler düzenlendi.

| Parti | Tema | Kayıt | B1 | B2 | C1 |
|---|---|---:|---:|---:|---:|
| es-0001 | body | 31 | 6 | 12 | 13 |
| es-0002 | animals | 31 | 6 | 13 | 12 |
| es-0003 | food | 31 | 6 | 14 | 11 |

Seviye etiketleri editoryal tahmindir. Yemek ve hayvanlar partilerindeki değişikliklerden sonra başlangıçtaki 6/12/13 dağılımı birebir korunmuyor; kotayı tutturmak için zorluk etiketi yükseltilmedi. Seviyeler bağımsız incelemede ayrıca ele alınmalı.

## Çıkarılan/değiştirilen eski adaylar

- **ser un bicho raro**: Kişiyi küçümseyen niteleme; hakaret içeren deyimleri almama kuralı nedeniyle çıkarıldı. Yerine: hacer el ganso.
- **estar a pan y agua**: Mevcut anlam ve örnek doğrudan yiyeceklerle kıt geçinmeyi anlatıyordu; mecaz ayrımı zayıf. Yerine: estar en el ajo.
- **comerse un marrón**: Marrón burada yiyecek değildir; yemek imgesi temasına uygun değil. Trouble partisi için yeniden doğrulanacak aday. Yerine: ponerse como un tomate.
- **importar un pepino**: Çekirdekteki importar un pimiento ile aynı deyimin kelime varyantı; ayrı kayıtla sayı artırılmadı. Yerine: dejar con la miel en los labios.
- **importar un comino**: Çekirdekteki importar un pimiento ile aynı deyimin kelime varyantı; ayrı kayıtla sayı artırılmadı. Yerine: volverse la tortilla.

Deyim olmayan adayları eleme sayısı bu aşamada bütün dilin nihai sayısı değildir. Para partisi ve kitap adaylarının tamamı henüz elenip raporlanmadı. Kitaptaki “ponerse como un tomate” adayı iki internet kaynağıyla doğrulandı; kitap kaynak olarak yazılmadı.

## Kaynak alan adları

Aşağıdakiler yalnız yeniden doğrulanan es-0001–0003 içindir. Aynı sayfanın farklı deyimler için kullanılması her deyimde bir atıf sayılır; benzersiz sayfa sayısı değildir.

| Site | Atıf |
|---|---:|
| dle.rae.es | 62 |
| www.diccionarios.com | 20 |
| spanishlessonsacademy.com | 10 |
| estudiarespanol.wordpress.com | 9 |
| fpnvalencia.es | 9 |
| www.juegosdepalabras.com | 8 |
| preparaeldele.com | 8 |
| human.libretexts.org | 8 |
| borjaprofe.com | 7 |
| elblogdeidiomas.es | 7 |
| aprenderespanholesfacil.wordpress.com | 6 |
| en.wiktionary.org | 4 |
| www.wordreference.com | 3 |
| www.revistaelobservador.com | 3 |
| dem.colmex.mx | 2 |
| es.wiktionary.org | 2 |
| www.newsinslowspanish.com | 2 |
| www.spanishdict.com | 2 |
| aexgastronomia.es | 2 |
| www.ecos-online.de | 1 |
| diccionario.reverso.net | 1 |
| horchataypalomitas.com | 1 |
| www.primerahora.com | 1 |
| espanol.lingolia.com | 1 |
| www.coloquial.es | 1 |
| www.collinsdictionary.com | 1 |
| cadenaser.com | 1 |
| espaniero.online | 1 |
| www.speakinglatino.com | 1 |
| diccet.com | 1 |
| www.spanishschoolvalencia.com | 1 |

## Doğrulama

- `node scripts/build-idioms.mjs`: geçti; mevcut dalda çekirdekle toplam 140 İspanyolca kayıt var. Bunun 31 kaydı es-0004'teki eski, henüz kaynakları tamamlanmamış verilerdir; 140 doğrulanmış deyim diye sunulmaz.
- `npx vitest run src/data/idioms.test.ts`: 5/5 geçti.
- `npm run typecheck`: geçti.
- `npx oxlint src api e2e`: çıkış kodu 0, ancak **temiz değil**: değişiklik kapsamı dışındaki `src/ui/shared/wordCounts.tsx:7:14` için `react(only-export-components)` uyarısı var. Uygulama kodu sahipliği sınırı nedeniyle bu içerik turunda değiştirilmedi.

## Henüz yapılmayanlar ve belirsizlikler

- **es-0004 para partisi**: eski kaynakları hâlâ güvenilir kabul edilmiyor. Açılan RAE/Larousse sayfaları bazı adayları doğruladı; nihai seçki henüz dosyaya geçirilmedi. “Andar mal de dinero”, “comprar a precio de saldo”, “cobrar en dinero negro” gibi şeffaf/kapsamı tartışmalı kayıtlar yeniden seçilmeli.
- **es-0005–0016**: henüz yeniden doğrulanmış parti olarak eklenmedi. Tarihî aday dosyaları tamamlanmış veri sayılmaz.
- Kitaptaki 151 adayın tamamının karşılaştırması ve eleme raporu bekliyor. PR hazırlık klasörü taşınmayacak.
- Fransızca 260 kaydın dönüşümü ve İngilizce paket çalışması henüz tamamlanmadı.
- Üç partinin de bağımsız Claude denetimi bekliyor. Kaynakların sayfada bulunması, bütün anlam/üslup/bölge kararlarının kesinleştiği anlamına gelmez. Özellikle yaygın deyimlerde eski C1 etiketlerinin yeniden değerlendirilmesi gerekiyor.
- Dil bitmediği için hedefe göre nihai eksik sayısı ve tam dil raporu henüz çıkarılmadı; PR birleştirilmedi.
