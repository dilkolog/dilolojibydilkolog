# Stil rehberi: okuma metinleri

> **TASLAK: sahibinin onayını bekliyor.** Onaylanınca bu satır kalkar. Örneklem incelemesinde (docs/ICERIK-FABRIKASI.md §5.4) bulunan her yeni hata türü, en alttaki "Öğrenilen kurallar" bölümüne eklenir.

Okuma metinleri Fransızca ya da İspanyolca öğrenen **Türkçe konuşan yetişkinler** için yazılır. Metinler özgündür: başka bir metin kopyalanmaz, çevrilmez ve "yeniden yazılmaz".

Biçim `docs/ICERIK-FABRIKASI.md` §4.1'de (`ReadingItem`). Denetim aracı (`scripts/content/check.ts`) bu rehberdeki ölçülebilir kuralları uygular. Ölçülemeyenleri örneklemi okuyan kişi denetler.

## 1. Seviyeler

Sözcük sayısı ve ortalama cümle uzunluğu `content/plan/<dil>.json` içinde yazar. Araç bu iki sayıyı denetler. Ayrıca metindeki sözcüklerin **en az %92'si** CEFR listesinde o seviyede ya da altında olmalıdır. Özel adlar ve `vocabulary` listesindeki hedef kelimeler bu hesaba girmez.

| Seviye | Sözcük | Ort. cümle | Yapı |
|---|---|---|---|
| A1 | 60–120 | ≤10 | Tek yan cümle. Şimdiki zaman ağırlıklı; birkaç *aller/ir a* + mastar. Somut, gündelik konular. Bağlaç olarak yalnız *et, mais, parce que / y, pero, porque*. |
| A2 | 100–180 | ≤14 | Geçmiş zamanlar (passé composé, imparfait / pretérito, imperfecto) ve yakın gelecek. Basit yan cümleler (*quand, qui, que / cuando, que*). |
| B1 | 150–260 | ≤20 | Görüş ve gerekçe. Futur / futuro, ilk subjonctif / subjuntivo kalıpları, ilgi zamirleri. Paragraf başına bir fikir. |
| B2 | 220–360 | ≤26 | Dolaylı anlatım, koşul cümleleri, edilgen, bağlaçlar (*pourtant, bien que / sin embargo, aunque*). Karşıt görüşler tartılır. |
| C1 | 300–480 | ≤32 | Soyut konular, nüans, deyimler, üslup farkı (resmî ve gündelik). Uzun ama açık cümleler; süs için karmaşıklaştırma yok. |

- **Dilbilgisi hedefi:** `grammar` alanındaki konu metinde bilerek ve bolca geçer. Zaman konularında A1–A2'de en az 3, B1 ve üstünde en az 5 biçim olmalı. Hedef zorla sokulmaz; metnin konusu o yapıyı doğal kılmalıdır (alışkanlık anlatan bir anı → imparfait).
- **Yeni kelime:** metindeki seviye üstü sözcükler `vocabulary` listesine girer (6–12 kelime). Listedeki her sözcük metinde, listede yazılan biçimiyle geçer.

## 2. Konu ve içerik

**Yasak:** siyaset ve seçimler; din; şiddet, suç ayrıntısı, savaş; yetişkin içerik; uyuşturucu; kumar; gerçek kişiler hakkında olumsuz ya da uydurma ifadeler; marka tanıtımı ve gerçek şirket adları (genel adlar kullanılır: *le supermarché*, *una cadena de cafeterías*); tıbbi ya da hukuki tavsiye gibi okunabilecek kesin yönlendirmeler.

Ölçülebilir yasak sözcükler `content/style/banned.json` dosyasındadır; araç onları reddeder.

**Tarih ve bilim metinleri:** yalnız genel kabul görmüş, sınanabilir bilgiler kullanılır. Kesin olmayan bir sayı ya da tarih yazılmaz; yaklaşık ifade tercih edilir ("XIXe siècle'in sonunda").

**Biyografi:** yalnız uydurma kişiler ya da ölümünün üzerinden uzun zaman geçmiş, herkesçe bilinen kişiler. İkincisinde yalnız tartışmasız olgular kullanılır.

## 3. Adlar ve kültür

- **Adlar çeşitli ve gerçekçi olur.** Aynı ad iki metinde başrol olmaz. Fransızca: Léa, Karim, Mathilde, Thomas, Aminata, Lucas, Inès, Hugo, Fatou, Camille… İspanyolca: Lucía, Diego, Valentina, Mateo, Ximena, Andrés, Carmen, Joaquín, Daniela, Pablo…
- **Kültür:** Fransızca metinler Fransa'nın yanında Belçika, İsviçre, Québec ve Batı Afrika'dan da geçer. İspanyolca metinler İspanya'nın yanında Meksika, Arjantin, Kolombiya, Şili ve Peru'dan da geçer. **Bölge açıkça belirtilir** (şehir ya da ülke adı). Bölgeye özgü bir sözcük kullanılırsa (*el ordenador / la computadora*, *le déjeuner* Québec'te öğle değil sabah) bölge metinden anlaşılır.
- **İspanyolca:** Latin Amerika'da geçen metinde *vosotros* kullanılmaz. Arjantin'de geçen metinde *vos* yalnız B1 ve üstünde, metinde açıkça görünecek şekilde kullanılır.
- Klişeden kaçınılır: Fransa'yı yalnız bagetle, Meksika'yı yalnız sombreroyla anlatmak gibi.

## 4. Türkçe çeviri

- Paragraf paragraf, **doğal Türkçe**. Kelimesi kelimesine değil, anlamı veren çeviri: "Il fait beau" → "Hava güzel", "Hava güzel yapıyor" değil.
- Hedef dildeki özel adlar aynen kalır. Yer adlarının yerleşik Türkçe adı varsa o kullanılır (Paris, Lyon, Sevilla, Meksiko).
- Hitap ve üslup korunur: *vous / usted* "siz", *tu / tú* "sen" olur.
- Cümle sonu noktalaması Türkçe kurala göre yazılır.

## 5. Anlama soruları

3–5 soru, **Türkçe**, dört şık. Sorular sözcükleri değil, metnin ne anlattığını sorar:
1. ana fikir;
2. önemli bir ayrıntı;
3. bir çıkarım (metinde açıkça yazmayan ama ondan anlaşılan).

Her sorunun `why` alanı cevabın metnin neresine dayandığını söyler. Yanlış şıklar akla yatkın olur ama metne göre açıkça yanlıştır. "Hepsi" ya da "hiçbiri" şıkkı kullanılmaz.

## 6. Örnekler

**İyi (A2, fr, alışveriş · hikâye · passé composé):**
> Samedi, Inès est allée au marché de Lille avec sa grand-mère. Elles ont acheté des fraises et du fromage. Au retour, il a commencé à pleuvoir…

Neden iyi: bölge belli, hedef zaman doğal ve bol, cümleler kısa, sözcükler A2.

**Kötü:**
> Le gouvernement a annoncé hier une réforme controversée de la fiscalité…

Neden kötü: siyaset, B2 sözcükler, A2 metne uymuyor.

**Kötü (zorlanmış hedef):**
> Je mange. Tu manges. Il mange une pomme. Nous mangeons…

Neden kötü: metin değil çekim tablosu; anlatı yok.

## 7. Öğrenilen kurallar

(Örneklem incelemesinden gelen kurallar buraya tarihli olarak eklenir.)
