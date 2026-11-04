# İçerik fabrikası: ajanlara verilecek hazır komutlar

`docs/ICERIK-FABRIKASI.md`deki sistemi çalıştırmak için ajanlara kopyalayıp yapıştırılacak komutlar. Sırası şöyle: **Komut 1** bir kez, **Komut 2 ve 3** her gün, **Komut 4** haftada bir.

---

## Komut 1: Kurulum (Faz 0, yalnız bir kez)

```
AGENTS.md'yi, DESIGN.md'yi ve docs/ICERIK-FABRIKASI.md'yi baştan sona oku.

Görevin: belgedeki Faz 0'ı (altyapı) kurmak. Henüz içerik üretme.

Yapılacaklar:
- content/plan/fr.json ve es.json
- content/style/reading.md ve grammar.md (taslak; bana onaya sun)
- scripts/content/ altında jobs.ts, check.ts, sample.ts, build.ts, coverage.ts, derive.ts
- src/data/content.ts istemcisi
- okuma kütüphanesinde "Diloloji metinleri" girişi
- dilbilgisi oyununun parçalı yüklemeyle çalışması
- araçlar ve istemci için testler, E2E ve a11y testleri

Sistemin uçtan uca çalıştığını göstermek için dil başına 5 deneme metni ve 20 deneme sorusu üret. Bunları denetimden geçir, derle ve uygulamada göster.

Kurallar: AGENTS.md'deki doğrulama adımlarının hepsini çalıştır; yerelde doğrulanmış PR'ları birleştir; canlıda npm run verify:deploy çalıştır.

Bitince Türkçe kısa rapor ver: ne kuruldu, nasıl çalıştırılır, stil rehberinde onayımı bekleyenler.
```

---

## Komut 2: Günlük üretim (her gün, bir ya da birkaç ajana)

Birden çok ajan çalıştırılacaksa her birine farklı bir **ALAN** verilir ki aynı işi yapmasınlar.

```
AGENTS.md'yi ve docs/ICERIK-FABRIKASI.md'yi oku. Sonra content/style/ içindeki stil rehberlerini ve docs/veri/icerik-kapsama.md raporunu oku.

ALAN: [Fransızca okuma metinleri]  (ya da: İspanyolca okuma / Fransızca dilbilgisi / İspanyolca dilbilgisi)

Bugünkü görevin:
1. Kapsama raporuna göre bu alandaki en boş hücrelerden iş emirlerini sahiplen; günde en çok 5 iş. Sahiplendiğini iş dosyasına yazıp commit et.
2. Her iş için öğeleri stil rehberine göre yaz. Aynı hücrede daha önce kabul edilmiş örneklere bak, ama tekrarlama.
3. scripts/content/check.ts ile denetle. Reddedilenleri nedenlerine göre düzelt; partinin kabul oranı %95'i geçmeden commit etme.
4. Her iş için sample.ts ile insan örneklemi sayfasını oluştur.
5. build.ts ve coverage.ts'i çalıştır, veri testlerini geçir. Tek PR aç ve birleştir; canlıda verify:deploy çalıştır.

Kurallar:
- Başka sitelerden metin kopyalama ya da yeniden yazdırma; yalnız özgün içerik.
- Tek doğru cevap; bölgeye göre ikinci bir doğru cevap çıkabiliyorsa soruyu yazma.
- Yasak konulara girme.
- Var olan kimlikleri asla değiştirme.

Bitince Türkçe kısa rapor ver:
- kaç öğe üretildi, kaçı kabul edildi;
- en sık red nedeni;
- bakmam gereken örneklem dosyaları;
- stil rehberine eklenmesini önerdiğin kural varsa o.
```

---

## Komut 3: Çözücü ve gözden geçirici (her gün, üretimden sonra, AYRI bir ajana)

Bu ajan içeriği yazanla aynı oturum olmamalı. Amaç, yazarın göremediği hataları yakalamak.

```
AGENTS.md'yi ve docs/ICERIK-FABRIKASI.md'yi oku; özellikle §5.2'yi (çözücü denetimi).

Görevin: dün ve bugün birleşen içerik partilerini denetlemek. Bu içeriği sen yazmadın.

Her dilbilgisi partisi için:
- Soruları cevap anahtarına bakmadan çöz.
- Her soruda yaz: bulduğun cevap, tek doğru cevap var mı, ikinci bir doğru şık ya da bölgesel fark var mı.
- Sonucu content/review/<iş-kimliği>.solver.json dosyasına yaz.

Her okuma partisi için:
- Rastgele 5 metni oku.
- Seviye uygun mu, Türkçe çeviri doğru mu, anlama sorularının tek bir doğru cevabı var mı, metin doğal ve ilgi çekici mi: bunları değerlendir.

Uyuşmazlık %5'in üstündeyse partiyi "yeniden incelenecek" olarak işaretle.
Açık hataları düzelt: yanlış cevap anahtarı, eksik alternatives, yazım hatası. Kimlikleri değiştirme.
PR açıp birleştir.

Bitince Türkçe kısa rapor ver:
- incelenen parti sayısı;
- bulunan hata oranı;
- hata türleri;
- stil rehberine eklenmesi gereken yeni kurallar.
```

---

## Komut 4: Haftalık kalite turu (haftada bir)

```
AGENTS.md'yi ve docs/ICERIK-FABRIKASI.md'yi oku.

Haftalık kalite turu:
1. coverage.ts'i çalıştır; docs/veri/icerik-kapsama.md'yi güncelle.
2. Bu haftanın çözücü raporlarını ve benim örneklem notlarımı topla. Tekrar eden hata türlerini stil rehberine kural olarak ekle (bana onaya sun).
3. Benzerlik denetimini bütün içerikte çalıştır. Birbirine fazla benzeyen öğeleri listele; gerekirse emekliye ayır (manifest.retired).
4. Uygulamada rastgele 3 metni ve 3 dilbilgisi turunu, telefonda ve masaüstünde, açık ve koyu temada dene; sorun varsa düzelt.
5. AGENTS.md'ye haftalık durum notu yaz: toplam sayılar, hedefin yüzde kaçı, gelecek haftanın öncelikli hücreleri.

Bitince Türkçe kısa rapor ver ve gelecek hafta için 3 öneri sun.
```

---

## Sahibinin günlük işi (yaklaşık 10 dakika)

- **İnsan örneklemi:** Komut 2'nin raporundaki örneklem dosyalarına (`content/review/*.md`) bak; hatalı görülen öğenin yanına "hata: …" yaz.
- **Stil rehberi:** Komut 3'ün önerdiği yeni kuralları onayla.

Kalite asıl bu iki adımdan geliyor. Ajanlar kendi hatalarını en iyi sahibinin örneklerinden öğrenir.

**Başlangıç önerisi:** ilk hafta yalnız bir üretim ajanı (Fransızca okuma) ve bir çözücü çalıştır. Hata oranı %2'nin altına inince alan sayısını artır.
