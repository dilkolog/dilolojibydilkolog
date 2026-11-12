# Öğrenme deneyimi · 01

Altı tasarım alanını bir araya getiren bağımsız, etkileşimli teslim. Üretim uygulaması değiştirilmedi.

**Başlangıç:** `index.html` → altı sekme. **Toplu bakış:** `galeri.html`. Yerel sunucu gerekirse bu klasörde `python -m http.server 4198` çalıştır.

| Alan | Hazır teslim |
|---|---|
| Filiz ve öğrenme yolu | Önceki filiz paketinin 7 aşamasıyla yeni ekran; aşama geçişi, sulama hareketi, günlük hedefi ayrı gösteren yol |
| Ders sonucu | İyi / kusursuz / zorlanılan tur; XP, doğruluk, süre, yeniden bakılacak kelimeler ve sonraki eylem |
| Başarılar | 6 yeni rozet çizimi; kazanılan / kilitli filtreleri, detay diyaloğu |
| Boş ve hata durumları | İlk kelime, sonuç yok, çevrimdışı, tekrarlar tamam, cümle yok, geçici hata: 6 yeni çizim ve ekran metni |
| Pratik ikonları | Dinleme, konuşma, yazma, eşleştirme, deyim, okuma; tekrar ve ses ile toplam 8 ayrı SVG |
| Kelime ve deyim | Kelime/deyim geçişi, telaffuz, yerel kayıt durumu, örnek cümle, anlam ve 3 geri bildirim hali |

**Dosyalar:**
- `assets/cizimler/`: 12 ayrı adlandırılmış çizim, her biri PNG ve WebP, 384×384.
- `assets/ikonlar/`: 8 adlandırılmış SVG, 24×24 viewBox, 1.8 çizgi kalınlığı, currentColor.
- `assets/filiz/`: önceki `filiz-buyume-01` paketinden 7 sabit SVG aşama. Yeni filiz çizimi iddiası yok.
- `assets/kaynak/`: değiştirilmemiş ImageGen kaynak levhası ve kaynak notu.
- `onizlemeler/`: altı ekranın masaüstü/mobil görüntüsü, iki koyu tema görünümü ve toplu pano.
- `CIZIM-ENVANTERI.json`: kaynak levha hücresi ve dosya eşleştirmesi.
- `DOGRULAMA.json`: yerel tarayıcı kontrol sonuçları ve sınırları.
- `CLAUDE-DEVIR.md`: hedef bileşenler, korunacak davranışlar, uygulama sırası.

EN/FR/ES seçici yalnızca vurgu renklerini önizler; içerik İspanyolca örneğidir. Koyu tema, sakin seçenek ve prefers-reduced-motion desteği vardır. Tasarım DESIGN.md dilini izler: Lexend arayüz, Literata hedef dil, dil bazlı vurgu, dokunsal buton kenarı ve 20px kartlar.

Gerçek hesap, öğrenme kaydı, XP, FSRS, rozet kazanımı veya ağ isteği yok. Kart kaydı geçici bellek durumudur; sayfa yenilenince silinir. Ses tarayıcının İspanyolca speechSynthesis desteğine bağlıdır. Çizimlerin pastel renkleri özgün varlığın parçasıdır; koyu temada yeniden renklendirilmez.
