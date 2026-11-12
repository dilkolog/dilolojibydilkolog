# Claude — önce bu dosyayı oku

Güncelleme: 12 Kasım 2026.

Bu klasör, kullanıcının tasarım çalışmalarıdır. Kullanıcı tasarım üretimini bu çalışmada yürüttü; uygulamaya aktarımı Claude ile yapmak istiyor. Her pakette `README.md`, `PAKET.json` ve ayrıntılı devir notu bulunur. Kullanıcı görselleri tek tek onaylatmadan üretme izni verdi; bu, bütün adayların otomatik olarak canlıya alınacağı anlamına gelmez. Önce güncel kod ile karşılaştırıp kullanıcının istediği tasarımları mevcut yapıya uygula.

## Çalışma durumu

- Çizimler, prototipler ve animasyonlar tasarım çıktısı olarak hazır.
- Çalışan `src/`, `api/` veya `worker/` uygulaması bu tasarım çalışmalarıyla değiştirilmedi; dağıtım yapılmadı.
- Çalışma alanında önceden var olan `src/engine/grammar.ts` ve `src/engine/__tests__/grammar.test.ts` değişiklikleri bu tasarım paketlerine ait değildir; üzerine yazma.
- Bu teslim `tasarim/tum-paketler-2026-11-12` dalında depoya aktarılmak üzere paketlendi. Yerel `/workspace/...` yolları makineye özeldir; bu dalı fetch/checkout ederek göreli `tasarim/` yollarını kullan. ZIP’ler ayrı taşınabilir kopyalardır. Alt paketlerdeki eski “commit/push yapılmadı” notları üretildikleri andaki tarihsel durumu anlatır.
- Bazı kaynaklar `docs/gelen-gorseller/` içinde; gitignore davranışı dosya ve alt klasöre göre değişir. Yalnızca `git status` çıktısını kaynak varlığının kanıtı sayma. İlgili ZIP’ler gereken kaynakları da içerir.

## Paket dizini

| Paket | İçerik | Önce okunacak dosya |
|---|---|---|
| `monki-01` | Yeni Monki pozları | [CLAUDE-DEVIR.md](monki-01/CLAUDE-DEVIR.md) |
| `ikonlar-01` | Arayüz ikon alternatifleri | [CLAUDE-DEVIR.md](ikonlar-01/CLAUDE-DEVIR.md) |
| `gorev-paketi-01` | Görev dosyasındaki 12 çizim | [CLAUDE-TESLIM.md](gorev-paketi-01/CLAUDE-TESLIM.md) |
| `monki-panel-01` | Monki sohbet paneli | [CLAUDE-DEVIR.md](monki-panel-01/CLAUDE-DEVIR.md) |
| `monki-denetim-01` | Monki görsel denetimi ve yenileme | [CLAUDE-DEVIR.md](monki-denetim-01/CLAUDE-DEVIR.md) |
| `monki-animasyon-01` | Monki el sallama animasyonu | [CLAUDE-DEVIR.md](monki-animasyon-01/CLAUDE-DEVIR.md) |
| `filiz-buyume-01` | Tohumdan çiçeğe büyüme | [CLAUDE-DEVIR.md](filiz-buyume-01/CLAUDE-DEVIR.md) |

## Birbiriyle ilişkili çalışmalar

- `monki-denetim-01` içindeki el sallama kaynağı statik bir ana karedir. Gerçek hareket denemesi sonraki `monki-animasyon-01` paketindedir.
- Sekizli animasyon önerisi listesinden filiz büyümesi ve küçük kutlama hazır. Diğer altı öneri tamamlanmadı. Ayrıca el sallama ve göz kırpma üretildi. En güncel göz kırpma/kutlama/el sallama adayları `monki-son-rotuslar-01` paketindedir.
- `filiz-buyume-01`, yeni bir öğrenme algoritması değildir. Mevcut -1 / 0–5 mastery aşamalarına görsel öneridir. Yalnızca doğru cevap sayısına bağlama.
- `gorev-paketi-01`, `docs/chatgpt/GORSEL-GOREVLERI.md` içindeki isimlendirmeyi korur. Güncel main’de aynı çizimlerin başka bir kaynakla işlenmiş olması mümkündür; kopyaları birbirinin üzerine körlemesine yazma.
- İncelemelerin bir bölümü main `bcf19328` üzerinden yapıldı; canlı dağıtım sürümü ayrıca doğrulanmadı. `monki-panel-01/mevcut-main.png` temsilî statik yeniden kurulumdur, canlı site ekran görüntüsü değildir.

## Ortak aktarım kuralları

AGENTS.md ve DESIGN.md geçerlidir. Mevcut tokenları, ikon sarmalayıcılarını ve bileşenleri kullan. Tasarım HTML’lerini doğrudan üretim ekranına çevirmeden önce mevcut işlevleri kontrol et. Prototip metinleri, örnek sohbet, kullanım değerleri ve demo düğmeleri gerçek veri veya iş kuralı değildir. Görsellerin hedef boyut, alfa kenarı, açık/koyu/sakin tema ve mobil davranışı entegrasyonda tekrar kontrol edilmeli. Animasyonların indirilebilir GIF/WebP sürümleri reduced-motion tercihini kendileri okuyamaz; uygulamada sabit poz seçilmeli.

## Dosya kimlikleri ve kaynaklar

`DOSYA-DIZINI.json`, paket klasöründeki dosyaların göreli yollarını, boyutlarını ve SHA-256 özetlerini listeler. Üretim hedefleri, ilgili `manifest.json`, `yeniden-tasarimlar.json`, `rig.json` veya ayrıntılı devir notundadır. Genel ad taşıyan bir katmanı (ör. `body.png`) klasöründen koparırken paket kimliğini dosya adına ekle; proje içi bağlantıları korumak için mevcut paket içi adlar değiştirilmedi.

## Son paket güncellemesi

`monki-son-rotuslar-01/CLAUDE-DEVIR.md`: kalan dinleme resmi ve iki animasyon yenilendi, el sallama omuz birleşimi v2 olarak tekrar kuruldu. İlgili eski paketleri silme; yeni sürüm eşleştirmesi PAKET.json içindedir.

## En yeni teslim: 40 avatar

`avatar-koleksiyonu-01/CLAUDE-DEVIR.md` dosyasını oku. 26 yenilenen + 14 yeni, toplam 40 Monki dışı figür. Önceki avatar denetiminin ardından hazırlanmış uygulanabilir tasarım paketi. Üretime bağlanmadı. Eski Monki kullanıcı kayıtları korunmalı; yeni seçim ekranında sunulmamalı.

## En yeni teslim: altı öğrenme alanı

`ogrenme-deneyimi-01/CLAUDE-DEVIR.md` ile başla. Kullanıcının tüm altı alanı tasarlama isteği karşılandı. Filiz eski paketle aynı öğrenme modelini korur; yeni ekran düzeni sunar. Sonuç, rozet, boş/hata, pratik ikonları ve kelime/deyim tasarımları da aynı bağımsız prototipte. 12 yeni çizim ve 8 SVG ikon dosyası var. Bu paket avatar koleksiyonunun yerine geçmez. Rozet hedefleri ve XP/süre gibi sayılar örnektir; gerçek kullanıcı verisini değiştirme. Dosya envanteri ve masaüstü/mobil ekran görüntüleri pakette.

## Son teslim: mevcut rozetlerin tam denetimi

`rozet-yenileme-01/CLAUDE-DEVIR.md` dosyasını oku. Bu paket önceki 6 kavramsal rozet önerisinin aksine gerçek 93 başarı tanımını ve 48 mevcut varlığı eşler. 10 mevcut çizim için 12 yeni stat bazlı alternatif var; diğer 38 çizim korunuyor. Ortak hundred/daynight görselleri iki ayrı stat için ayrıldı. Başarı kimliği, hedefi, tier, kazanım tarihi ve senkronizasyon değişmemeli. Rehberdeki eski Monki sahnelerini silme; sadece madalya eşlemesini değiştir.

## 11 Kasım 2026 · Beş alanın iş planı

`tasarim-is-plani-01/IS-PLANI.md` ve `BACKLOG.json`: beş alanın ayrı incelemesi ve 17 görev. Kullanıcı bu turda inceleme ve plan istedi. Henüz yeni maket veya üretim aktarımı yapılmadı. Güncel site ile paketlerin entegrasyon durumunu doğrula; ardından konuşma–dinleme → okuma → Bugün → ilk kullanım → ayarlar. Canlı görsel doğrulaması yapılmamış hipotezleri kesin hata kabul etme.

## Yeni tasarım teslimi: konuşma–dinleme

`konusma-dinleme-01/CLAUDE-DEVIR.md` ile başla. 4 akış ve 15 ortak durum tasarlandı. Kelime kaydı 8 sn, telaffuz 12 sn; gölgeleme ayrı ve puansız. Paket gerçek mikrofon/puanlama yapmaz; test kontrolleri üretime aktarılmaz. Native audio, ses tercihleri, gerçek kayıt/servis sözleşmeleri korunmalı. Yerel kontroller DOGRULAMA.json içinde. Canlı site karşılaştırması/gerçek cihaz doğrulaması henüz bekliyor.

## 12 Kasım 2026 · Okuma paketi

`okuma-deneyimi-01/CLAUDE-DEVIR.md` ile başla. 17 görünüm/durum; kelime paneli, sadeleştirilmiş araçlar, kütüphane ve okuma sonu tasarlandı. Örnek 138 sözcüklük hikâye ve 17 sözcüklük mini sözlük gerçek sözlük/çeviri/analiz motorunun yerine geçmez. Gerçek WordCard/Reading callbackleri, mobil swipe/odak, dinleme/dikte koşulları ve okuma verisi korunmalı. Canlı ekran karşılaştırması yapılmadı; yerel kontroller DOGRULAMA.json içinde.

## Bugün ekranı · 12 Kasım 2026

`bugun-deneyimi-01/CLAUDE-DEVIR.md`: 10 durum, tek baskın eylem ve ikincil kısa tur; SHORT_ROUND=15 ve yeni kelimelerin dışarıda kalması kaynak sözleşmesine göre ele alındı. Yarım tur kelimesi/kalan soru/günlük ilerleme/haftalık beceri süresi karıştırılmamalı. Örnek sayılar, soru ilerletme penceresi ve durum seçicisi üretime aktarılmaz. Gün tamam olsa da taslak devamı korunmalı; seçili listede iş bitmesi bütün günün bitişi sayılmamalı. Canlı P0 ve gerçek motor/cihaz testi bekliyor.

## İlk kullanım · 12 Kasım 2026

`ilk-kullanim-01/CLAUDE-DEVIR.md`: mevcut üç adım korunarak dokuz görünüm tasarlandı. DEFAULT_SETTINGS 10 dk / 5 yeni; dil devralma ve isteğe bağlı ad, mobil başlık odağı korunmalı. GuidePlacementNudge için yalnız ilk kelime yeterli değil: en az 5 kelime ve diğer uygunluk koşulları gerekir. Test daveti zorunlu onboarding adımı değildir. Bu prototip gerçek localStorage/Settings/kelime/test kaydı yapmaz; canlı P0 ve cihaz kontrolleri bekliyor.

## 12 Kasım · Ayarlar ve profil bağlantısı

Son teslim: [ayarlar-deneyimi-01/CLAUDE-DEVIR.md](ayarlar-deneyimi-01/CLAUDE-DEVIR.md). 17 senaryo, 37 ekran ve yerel etkileşim kontrolleri tamamlandı. Mevcut ayar şeması ve kayıt/sıfırlama işlemleri üretimden korunmalı; örnek değerler yeni şema değildir. Profil 40 figürlük kanonik koleksiyondan 8 örnek kullanır. Beş plan alanının yerel prototipleri hazır; ORT-01 canlı başlangıç karşılaştırması ve ORT-02 entegrasyon sonrası son kontrol açık.

## Başka makinede erişim

```sh
git fetch origin tasarim/tum-paketler-2026-11-12
git switch --track origin/tasarim/tum-paketler-2026-11-12
```

Başka bir dalda çalışılıyorsa mevcut değişiklikleri koruyup ayrı worktree açılabilir. Bu teslim yalnızca tasarım kaynakları ve notları içerir; uygulamaya entegrasyon/deploy yapılmadı. Ham kaynakların depoda eksik olanları `docs/gelen-gorseller/` altına eklendi; güncel main’de var olan dosyaların üzerine yazılmadı. Paket notlarındaki kaynak commitleri tarihsel inceleme referanslarıdır.

## 13 Kasım · Memrise araştırması

[Çalışma mantığı ve Diloloji çıkarımları](../docs/notlar/memrise-arastirmasi-2026-11-13.md). Resmî kaynaklar, eski/yeni sürüm ayrımı, kamuya açıklanan SRS, etkinlik planlama, video/konuşma döngüsü, çiçek ve 3/4/6 ilk öğrenme kuralı. Bulgular, tarihsel davranışlar ve bizim önerilerimiz ayrı. Üretim değişikliği veya yeni eksik-özellik denetimi değildir.
