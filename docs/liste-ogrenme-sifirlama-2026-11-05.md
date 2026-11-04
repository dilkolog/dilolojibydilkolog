# Liste öğrenmesini sıfırlama ve kart hazırlık ekranı

Liste ayrıntısındaki **Liste işlemleri → Öğrenmeyi sıfırla**, onaydan sonra yalnızca o listedeki kelimelerin çalışma durumunu, cevap geçmişini ve hata kayıtlarını temizler. Kelimeler, anlamlar, notlar, seviyeler ve liste korunur. Cevap geçmişinden hesaplanan XP ve istatistikler değişebilir; onay penceresi bunu açıklar. Kısa süreli **Geri al** eylemi, yeni öğrenme başlamamışsa ilerlemeyi geri getirir; sonradan düzenlenen notları değiştirmez.

- `resetListLearning.ts`: ilerleme, geçmiş, hatalar, sıfırlama işaretleri ve yarım oturumlar tek veritabanı işleminde güncellenir. Karışık oturumdan yalnızca seçili kelimeler çıkarılır; diğer listelerin adımları korunur.
- Eşitleme: kelime başına sıfırlama işareti ile `introducedAt` öğrenme başlangıcı karşılaştırılır. Eski cihazın durumları birleştirmeden önce elenir; eski bir öğrenme dönemine ait çevrimdışı cevaplar da geri gelmez. Sıfırlamadan sonra başlayan yeni öğrenme korunur. Açık başka sekmedeki eski cevap/cevap düzeltme/geri alma işlemleri reddedilir.
- Kart hazırlığı: kapsamlar iki sütunda okunur; geniş ekranda ayarlar ayrı sütundadır. Başlatma alanı seçilen kart sayısını ve yönü gösterir, telefonda alt gezinmenin üstünde kalır. Liste kapsamındaki sayı seçili listenin kelime sayısıdır. Geçersiz veya eksik liste seçimi ilk dolu listeye yönelir.

Doğrulama: sıfırlama, diğer listelerin korunması, eski cihazla birleştirme, yeni öğrenmenin korunması, eski açık cevabın engellenmesi, geri alma ve işlem hatasında geri dönüş için birim testleri; gerçek tarayıcıda sıfırlama/geri alma/yeniden tanıtım ve 1440/375 piksel kart hazırlığı kontrolleri. Bu çalışma gerçek kullanıcı hesabında sıfırlama gerçekleştirmez.
