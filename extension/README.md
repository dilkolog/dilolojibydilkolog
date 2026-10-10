# Diloloji tarayıcı eklentisi (Chrome, Edge, Brave, Arc)

İngilizce, Fransızca ve İspanyolca sayfalarda kelimelerini renklendirir. Bir kelimeye tıklayınca anlamını ve geçtiği cümleyi gösterir; oradan ekleyebilir, "biliyorum" ya da "yok say" diyebilirsin. Seçtiğin metni de ekleyebilirsin. İstersen Türkçe sayfalarda listendeki birkaç kelimeyi hedef dilde gösterir.

## Kurulum

1. `npm run build:ext` (dist klasörünü oluşturur)
2. Chrome'da `chrome://extensions` → sağ üstte **Geliştirici modu**nu aç
3. **Paketlenmemiş öğe yükle** → `extension/dist` klasörünü seç
4. Diloloji'yi bir kez aç: kelimelerin eklentiye geçer (her açışta güncellenir)

Eklenti hiçbir veriyi bir yere göndermez; kelimelerin yalnızca tarayıcında durur. Başka sitelerde "Biliyorum" dediğin kelimeler, Diloloji'yi bir sonraki açışında listene işlenir.
