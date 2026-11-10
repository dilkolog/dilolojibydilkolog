# Fransızca deyimler — ilk teslim paketi

**26 deyim, 52 özgün örnek ve Türkçe çevirisi, 26 bağlam sorusu.** Her deyimde kullanım notu ve açılarak kontrol edilmiş sözlük maddesi bulunur. Kaynaklar: 24 Larousse maddesi ve 2 Wiktionnaire maddesi. Üretici Codex; bağımsız denetleyici Antigravity.

Bu ilk parti **bağımsız denetime hazırdır**. Henüz uygulamada yayınlanmadı. Ekran görüntüsünde görev planının altı kesildiğinden toplam hedef, CEFR dağılımı ve nihai veri şeması doğrulanamadı. Bu nedenle düzeyler `null`; 26 sayısı bu teslimin kapsamıdır, doğrulanmış nihai görev kotası değildir.

## Dosyalar

- [SORULAR.md](SORULAR.md): cevap anahtarı ve anlam kartları olmadan çözücü dosyası.
- [INCELEME.md](INCELEME.md): okunabilir kartlar, örnekler, sorular ve açılır cevap anahtarları.
- [fr-idioms-0001.json](fr-idioms-0001.json): düzenlenebilir asıl veri; tüm kimlikler korunmalı.
- [KAYNAKLAR.md](KAYNAKLAR.md): madde düzeyinde bağlantılar ve kaynak kontrolünün kapsamı.
- [MEVCUT-ICERIK-TARAMASI.md](MEVCUT-ICERIK-TARAMASI.md): mevcut verilerde 42 satırda bulunan ifade parçaları; yanlış pozitifler içerebilir.
- [DOGRULAMA.json](DOGRULAMA.json): yapı kontrolünün çıktısı.
- [CLAUDE-DEVIR.md](CLAUDE-DEVIR.md): entegrasyon ve bağımsız inceleme için notlar.
- [validate.py](validate.py): `python3 docs/icerik-hazirlik/deyimler-fr/validate.py` ile tekrar çalıştırılabilir yapı denetimi.

## Editoryal kararlar

- İlk taslaktaki `vendre la peau de l'ours avant de l'avoir tué` atasözü niteliği nedeniyle bu partiye alınmadı.
- `mettre la charrue avant les bœufs` fiil grubu olarak tutuldu; görev atasözü kökenli kalıpları da dışlıyorsa denetleyici yeniden değerlendirmeli.
- Bu 26 deyimin tamamı sitede ilk kez bulunacak ifadeler değildir. Mevcut B2 `idioms_everyday` listesi ve başka derslerle örtüşmeler raporda gösterildi. Yeni örnekler, anlam soruları ve kaynak notları mevcut içeriği genişletmek için de kullanılabilir.
- Deyimlerin sözlük anlamı kontrol edildi. Örneklerin doğallığı, çeviriler, çeldiricilerin tek doğru cevabı koruması ve seviye kararı hâlâ bağımsız inceleme gerektirir. Yapı kontrolü bu dil değerlendirmesinin yerine geçmez.
- Kaynak tanımları, sesler ve sözlük örnekleri pakete kopyalanmadı. Türkçe açıklamalar ve öğrenme içeriği özgün yazıldı.
- Yakın anlamlı `tourner autour du pot` ve `noyer le poisson` birbirine çeldirici yapılmadı. `donner sa langue au chat` genel bir vazgeçme olarak, `faire la part des choses` eşit pay dağıtmak olarak öğretilmedi.

İspanyolca derleme için aynı tarihli uzak dal kontrolünde `icerik/deyimler-es` bulunamadı; bu teslimde İspanyolca denetimi yapıldığı iddia edilmez.
