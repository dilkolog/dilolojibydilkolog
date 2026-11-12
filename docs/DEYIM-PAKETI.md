# Deyim paketi: toplama rehberi

Hedef: **dil başına 500 deyim** (İngilizce, Fransızca, İspanyolca), tek pakette. Asıl amaç **sözlük**: deyim Sözlük'te aranınca (tam hâliyle, içindeki bir kelimeyle ya da Türkçe anlamıyla) kendi kartıyla çıkar ve tek dokunuşla kelimelere eklenir. Ayrıca Kelimeler → Ekle → "Deyim paketi" altında tema ve seviyeye göre toplu eklenebilir ("Deyimler" listesine).

Sözlükte bulunabilsin diye `t` alanına insanların arayacağı sade Türkçe karşılık, `eq` alanına Türkçe deyim yazılır; `w` insanların yazacağı sözlük biçimidir.

Bu belge toplamayı ve denetimi yapan ajanlar içindir. Sahibinin güncel kararı (2026-11-13): üç dilin toplayanı Codex, bağımsız denetleyeni Claude oturumudur. Antigravity bu işte çalışmaz. Sıra İspanyolca → Fransızca → İngilizce; dil başına tek PR. 16 × 31 parti planı korunur; 16 çekirdekle toplam 512 olabilir. İki gerçek kaynakla doğrulanmış 31 güçlü deyim bulunamazsa parti eksik bırakılır ve raporlanır; sayı doldurmak için zayıf kalıp alınmaz.

## Nasıl çalışır

1. Toplayan ajan partileri `content/raw/idioms/<dil>-NNNN.json` olarak yazar. **`src/` altına dokunmaz.**
2. `node scripts/build-idioms.mjs` partileri birleştirir, yinelenenleri ve kaynaksızları reddeder, `src/data/idioms/<dil>.json` dosyasını üretir (elle düzenlenmez).
3. `npx vitest run src/data/idioms.test.ts` her deyimi denetler (`idiomProblems`, `src/data/idioms.ts`).
4. Toplayandan **farklı** bir model partiyi bağımsız okur, sahibi her partiden 5–6 deyime bakar, sonra birleştirilir (aşağıda "İş düzeni").

`<dil>-0000.json` paketin başladığı elle yazılmış 16 deyimdir (eski "Canlı deyimler" listesi); kaynak göstermez. Sonraki her deyim iki kaynak gösterir.

## Plan

Parti = bir tema. 16 tema, tema başına **31 deyim: 6 B1, 12 B2, 13 C1** (16 × 31 = 496, eldeki 16 ile birlikte elemeden sonra yaklaşık 500). Parti numarası temanın sırası:

| No | `theme` | Tema | | No | `theme` | Tema |
|---|---|---|---|---|---|---|
| 0001 | `body` | Beden ve sağlık | | 0009 | `people` | İnsanlar ve ilişkiler |
| 0002 | `animals` | Hayvanlar | | 0010 | `trouble` | Hata ve dert |
| 0003 | `food` | Yemek ve içmek | | 0011 | `time` | Zaman |
| 0004 | `money` | Para ve alışveriş | | 0012 | `nature` | Hava ve doğa |
| 0005 | `work` | Çalışma ve çaba | | 0013 | `luck` | Şans ve risk |
| 0006 | `feelings` | Duygular | | 0014 | `ease` | Kolaylık ve zorluk |
| 0007 | `talk` | Konuşma ve sır | | 0015 | `decide` | Karar ve tavır |
| 0008 | `mind` | Akıl ve dikkat | | 0016 | `move` | Yol ve hareket |

Tema, deyimin **anlamına** göre seçilir, içindeki kelimeye göre değil; tek istisna `body`, `animals`, `food`, `nature`: bunlar deyimin imgesine göredir ("avoir un chat dans la gorge" → `animals`). Seviye: B1 = sık, anlamı şeffafa yakın; B2 = günlük ama imgesi tahmin edilemeyen; C1 = daha seyrek, üsluba ya da bölgeye bağlı.

## Kurallar

1. **Yalnızca bugün kullanılan deyimler.** Ana dili konuşanların günlük konuşmada ya da basında gerçekten kullandığı deyimler; kitapta kalmış, eskimiş olanlar alınmaz. Her deyim **iki bağımsız kaynakta** doğrulanır (tercihen bir sözlük + gerçek kullanım: gazete, altyazı, derlem). İki sayfa gerçekten açılır; her birinde deyimin kendisi veya doğal çekimli kullanımı görülür. Sayfa yalnızca içindeki tek kelimeyi anlatıyorsa kaynak sayılamaz. Açılmayan veya ifade bulunmayan URL yazılmaz. İki geçerli kaynak bulunamayan deyim alınmaz.
2. **Anlamı bileşenlerinden doğrudan çıkarılamayan söz öbeği.** `poner límites`, `cerrar el trato`, `trabajar por su cuenta` gibi şeffaf kalıplar alınmaz. **Dilin kendi deyimi.** Başka dilden çevrilmiş deyim yazılmaz. Atasözü (tam cümle) değil, deyim (söz öbeği).
3. **Özgün metin.** Anlam, kelimesi kelimesine çeviri ve örnek cümle kendi yazdığındır; hiçbir sözlükten tanım ya da örnek kopyalanmaz. Kaynaklar yalnızca doğrulama içindir.
4. **Örnek cümle:** en çok 16 kelime, günlük, seviyeye uygun. Deyim cümlede **bölünmeden** geçer (araya `pas`, `no`, zarf girmez; gerekirse cümleyi öyle kur). `form` deyimin cümledeki hâlidir, birebir (çekimli olabilir).
5. **Sözlük biçimi (`w`):** mastar hâlinde, en az iki kelime, parantez / eğik çizgi / virgül yok. "Birine, bir şeye" gibi yer tutucular `pat` alanına gider.
6. **Kaba ve hakaret içeren deyimler alınmaz.** Argo olan `slang` diye işaretlenir.
7. Önceki partilerde (`content/raw/idioms/`) olan deyim yeniden yazılmaz.

## Alanlar

```json
{
 "w": "tomar el pelo",
 "pat": "tomarle el pelo a alguien",
 "t": "kafa bulmak, işletmek",
 "lit": "saçını tutmak",
 "eq": "",
 "s": "¿Hablas en serio o me estás tomando el pelo?",
 "form": "tomando el pelo",
 "tr": "Ciddi mi konuşuyorsun yoksa benimle kafa mı buluyorsun?",
 "reg": "informal",
 "area": "genel",
 "level": "B2",
 "theme": "people",
 "src": ["https://…", "https://…"]
}
```

| Alan | Zorunlu | Açıklama |
|---|---|---|
| `w` | evet | deyimin sözlük biçimi |
| `pat` | hayır | kullanım kalıbı, deyimden belli değilse |
| `t` | evet | Türkçe anlamı (birden çoksa virgülle, en çok iki) |
| `lit` | evet | kelimesi kelimesine Türkçesi (anlamla aynı olamaz) |
| `eq` | hayır | aynı şeyi söyleyen Türkçe deyim, gerçekten varsa |
| `s`, `form`, `tr` | evet | örnek cümle, deyimin oradaki hâli, cümlenin Türkçesi |
| `reg` | evet | `neutral`, `informal`, `slang`, `formal` |
| `area` | evet | `genel` ya da bölge: `İspanya`, `Latin Amerika`, `Meksika`, `UK`, `US`, `Fransa`, `Québec`… |
| `level` | evet | `B1`, `B2`, `C1` |
| `theme` | evet | yukarıdaki tablodan |
| `src` | evet | doğrulamada bakılan iki kaynağın adresi (pakete girmez) |

## İş düzeni: kim neyi yapar

Güncelleme: 2026-11-13, sahibinin talimatı. Antigravity bu çalışmada görev almaz.

| Sıra | Dil | Toplayan | Denetleyen | Dal / PR |
|---|---|---|---|---|
| 1 | İspanyolca (`es`) | **Codex** | **Claude oturumu** | `icerik/deyimler-es`, #774 |
| 2 | Fransızca (`fr`) | **Codex** | **Claude oturumu** | `icerik/deyimler-fr`, #773 |
| 3 | İngilizce (`en`) | **Codex** | **Claude oturumu** | `icerik/deyimler-en`, tek yeni PR |

**Dosya sahipliği:**

- Toplayan, ilgili dilin `content/raw/idioms/<dil>-NNNN.json` partilerini ve betiğin ürettiği `src/data/idioms/<dil>.json` dosyasını günceller. Başka uygulama kodunu değiştirmez.
- Denetleyen, `content/review/idioms/<dil>-NNNN.md` raporlarını bağımsız yazar; hataları toplayana bildirir. Toplayanın kendi kontrolü bağımsız Claude denetimi yerine geçmez.
- Çekirdek `<dil>-0000.json` ve öteki dilin dosyaları mevcut kapsamda korunur. Bu belge iş düzenini güncellemek için yetkili olarak değiştirilmiştir.
- Hazırlık klasörleri ve ZIP'ler içerik PR'larına alınmaz. Kitabın 151 ifadesi yalnız adaydır; kitap doğrulama kaynağı sayılmaz. Kitap aday klasörü depoya aktarılmaz; #775 kapatılır.

**Parti grupları (dil başına tek PR içinde):**

| Grup | Partiler | Temalar |
|---|---|---|
| 1 | 0001–0004 | body, animals, food, money |
| 2 | 0005–0008 | work, feelings, talk, mind |
| 3 | 0009–0012 | people, trouble, time, nature |
| 4 | 0013–0016 | luck, ease, decide, move |

**Hedef:** yeni parti başına 31 deyim (6 B1, 12 B2, 13 C1). 496 yeni + 16 çekirdek = 512 olabilir. Sayı ve seviye kotası kaynak/kalite kuralının önüne geçmez; doldurulamayan yerler gerekçesiyle açık yazılır. Seviye etiketleri editoryal tahmindir; resmî CEFR sertifikası değildir.

Bir dilin adımları:

1. Codex ilgili dalı güncel `main` ile uzlaştırır. Mevcut sorunlu kaynakları yeniden doğrular; her aday için iki gerçek sayfayı açıp deyimi görür. Erişim zamanı ve teyit edilen ifade kısa doğrulama kaydında tutulur; sözlük tanımları/örnekleri kopyalanmaz.
2. Özgün Türkçe anlam, literal çeviri, doğal ve en çok 16 kelimelik örnek, birebir `form`, doğru tema/üslup/bölge yazılır. Şeffaf kalıp, atasözü, kaba ifade ve yinelenen elenir. Şüpheli madde yerine doğrulanmış aday bulunamazsa parti eksik kalır.
3. Dilin bütün partileri aynı PR'da toplanır; dört parti başına ayrı PR açılmaz. Taslak PR, içerik ve bağımsız inceleme bitene kadar hazır sayılmaz.
4. Claude oturumu partileri bağımsız inceler. Codex rapordaki sorunları düzeltir veya deyimi çıkarır; kaynak doğrulamasını kendi kendine bağımsız denetim diye adlandırmaz.
5. `node scripts/build-idioms.mjs`, `npx vitest run src/data/idioms.test.ts`, `npm run typecheck` ve `npx oxlint src api e2e` geçer. Kaynak sayfasının gerçekten ilgili olduğunu bu yapısal testler kanıtlamaz; ayrı kaynak kaydı gereklidir.
6. İçerik/denetim koşulları tamamlanan PR hazır duruma alınır; CI yeşilse birleştirilir. Başarısız veya eksik kontrol saklanmaz.
7. Son rapor: eklenen ve toplam deyim sayısı, parti/tema/seviye dağılımı, hedefe göre açıklar, elenen aday ve gerekçeleri, kaynak sitelerinin bağlantı sayıları ve belirsizlikler. Sonra sıradaki dile geçilir.

**İnternet yoksa:** kaynaklara erişemeyen ajan `src` uydurmaz. Erişemediğini raporda söyler ve durur; parti yarım bırakılır, tamamlanmış gibi gösterilmez. Tek bir kaynağın engellenmesi bütün internetin kapalı olduğu anlamına gelmez; erişilebilir bağımsız kaynak aranır.

## Başlatma metinleri

### Codex: üç dilin toplayanı

```text
Diloloji deposunda AGENTS.md ve docs/DEYIM-PAKETI.md dosyalarını baştan sona oku. Kullanıcıya Türkçe yaz.
Rolün: es, sonra fr, sonra en deyim paketinin TOPLAYANI. Her dil için tek dal ve tek PR kullan.
Bağımsız denetleyen Claude oturumudur; Antigravity bu işte çalışmıyor.
Partiler 0001–0016, hedef her partide 31 deyim: 6 B1, 12 B2, 13 C1.
İki gerçek kaynakla doğrulayamadığını alma; sayı doldurmak için şeffaf/zayıf kalıp ekleme.
Sayfaları gerçekten aç ve her birinde deyimin kendisini gör. URL tahmin etme.
Anlam/örnekler özgün; örnek en çok 16 kelime ve deyim bölünmeden geçer.
İspanyolcada bölgeyi belirt. Fransızcada araya pas/jamais/zarf sokma.
İngilizcede someone's gibi yer tutucular gerektiğinde sözlük biçiminde kalır, düz apostrof kullan.
Şeffaf öbek fiiller give up/look after ve atasözleri alınmaz. UK/US kapsamını belirt.
Hazırlık klasörü/ZIP'leri PR'a alma; kitap yalnız adaydır, kaynak değildir.
Her dil sonunda derleyici, deyim testi, typecheck ve oxlint çalıştır; başarısızlığı gizleme.
Rapor: sayılar, tema/seviye dağılımı, elenenler ve nedenleri, site başına kaynak sayısı, belirsizlikler.
```

### Claude oturumu: bağımsız denetim

```text
Diloloji deposunda AGENTS.md ve docs/DEYIM-PAKETI.md dosyalarını baştan sona oku. Kullanıcıya Türkçe yaz.
Rolün: Codex'in topladığı es/fr/en deyim paketlerinin bağımsız DENETLEYENİ.
İlgili icerik/deyimler-<dil> dalını çek; her partiyi ve kaynak doğrulamasını bağımsız incele.
Her deyimde: deyim niteliği, güncel kullanım, iki gerçekten açılmış ilgili bağımsız kaynak,
özgün/doğru Türkçe anlam ve literal çeviri, doğal örnek/form, tema/seviye/üslup/bölge ve tekrar kontrolü.
Çıktı content/review/idioms/<dil>-NNNN.md: sorunlu, şüpheli, gerekçeler ve doğrulanan temiz sayı.
Erişemediğin kaynak veya eksik inceleme için temiz deme. Deyim verisini değiştirme; toplayana raporla.
```
