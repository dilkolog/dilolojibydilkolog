# Ayarlar ve profil · 01

Sekiz ana ayar grubu + ayrı Yardım, gruplar arası arama, gelişmiş satırlar ve profil bağlantısı için etkileşimli tasarım önerisi. Yeni bir ayar sistemi değil; mevcut işlevlerin görsel düzenlemesi.

`index.html` dosyasını tarayıcıda aç. Kurulum ve ağ bağlantısı gerekmez. İnceleme için `galeri.html`; statik görüntüler `ekranlar/` altında. Kaynak HTML/CSS/JS ve kullanılan figürler ZIP içinde birlikte bulunur.

## Neler tasarlandı?

- Hesap, Çalışma, Sorular, Ses, Görünüm, Bildirimler, Araçlar, Veriler ve Yardım için ortak sayfa/satır düzeni.
- Arama sonuçlarında grup bağlamı; gelişmiş sonuçların doğrudan görünmesi, boş sonuçtan geri dönüş. Profil, yedek ve yardım için ilgili bölüme yönlendirme.
- Seçilen grubun gelişmiş görünümünü sayfa açıkken koruma; dört grubun örnek tercihlerinde varsayılana dönüş ve 6 saniye geri alma.
- Hesap → profil: görünen ad, figür, profil rengi, vazgeç/uygula. Önceki 40 figürlük koleksiyondan 8 örnek; yeni Monki avatarı eklenmedi.
- Desteklenmeyen konuşma tanıma görünümü, veri kapsamını açıklayan onay penceresi ve hata durumu.
- 17 senaryo, 37 PNG; 1440px / 375px, açık/koyu/sakin ve üç dilin vurgu varyantları.

## Sınırlar

Tüm değişiklikler sayfanın belleğindedir; yenilemede sıfırlanır. Hesap, kalıcı ayarlar, eşitleme, izinler, seslendirme, yedek indirme, silme ve dışa aktarma çalıştırılmaz. Desteksiz cihaz ve veri hatası URL ile seçilen tasarım senaryolarıdır. Kaynak koddaki bütün ayar satırları burada kopyalanmadı; tüm mevcut satırlar entegrasyonda korunmalı. Bazı değerler temsili gösterimdir; kaynak varsayılanı veya tam şema sanılmamalı.

## İnceleme bağlantıları

`?scene=study`, `?scene=advanced`, `?scene=search`, `?scene=noresults`, `?scene=unsupported`, `?scene=profile`, `?scene=reset`, `?scene=confirm`, `?scene=error`. Diğer gruplar kendi İngilizce anahtarıyla seçilir. `&theme=dark&lang=fr&calm` eklenebilir. Üstteki Vurgu kontrolü yalnızca tasarım rengini değiştirir; öğrenme dilini değiştirmez.

Claude: önce `CLAUDE-DEVIR.md`, sonra `BILESEN-SOZLESMESI.md` ve `DOGRULAMA.json`. Bu paket yerelde hazır; canlıya uygulanmadı.

Yerel kontrolü tekrarlama: depo kökünde `python -m http.server 4205 --bind 127.0.0.1`, ardından Playwright ve `/usr/bin/chromium` kurulu ortamda `node tasarim/ayarlar-deneyimi-01/verify.cjs` ve `node tasarim/ayarlar-deneyimi-01/verify-extra.cjs`. Farklı sunucu için `DESIGN_URL` kullanılabilir. Kontrol ekranları/raporu yeniden yazar.
