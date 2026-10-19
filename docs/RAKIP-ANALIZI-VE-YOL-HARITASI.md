# Diloloji — Rakip Analizi ve Gelişim Yol Haritası (Duolingo, Quizlet & Anki)

Bu belge, Diloloji'nin **Duolingo**, **Quizlet** ve **Anki** gibi önde gelen küresel dil öğrenme ve ezber platformları karşısındaki konumunu; **Tasarım**, **Pratik/Kullanılabilirlik** ve **Teorik/Pedagojik** açılardan detaylandırır ve iş yükü dağılımına göre uygulanabilir bir yol haritası sunar.

Son güncelleme: 2026-10-19.

---

## 1. Üç Boyutlu Rakip Analizi

### 🎨 1. TASARIM AÇISINDAN (UI, UX ve Etkileşim Tasarımı)

1. **Bilişsel Yük & Odak (Cognitive Load & Focus):**
   * *Duolingo:* Ekranda tek bir soru, 3-4 büyük dokunmatik düğme ve tek bir doğrusal ilerleme çubuğu bulunur. Karar verme sürtünmesi sıfırdır.
   * *Diloloji:* "Bugün" ve "Kelimeler" ekranlarımız çok zengin bilgi sunar (sayaçlar, çipler, açılır menüler, grafikler, yan panel butonları). Görsel dilimiz sevimli olsa da kimi zaman kullanıcıya bir "öğrenme alanı" yerine karmaşık bir "yönetim paneli (dashboard)" hissi verebilir.
2. **Dokunsal Geri Bildirim ve "Juicy UI" (Mikro-Etkileşimler):**
   * *Quizlet & Duolingo:* Dokunulduğunda 3D çöküş hissi veren butonlar, doğru cevapta haptik titreşim (`navigator.vibrate`), kartın kendi ekseninde 3 boyutlu takla atması (perspective 3D flip) ve fizik motoru tabanlı sağa/sola fırlatma (swipe physics) hissi çok güçlüdür.
   * *Diloloji:* CSS tabanlı geçişlerimiz (`art-pop`, yaylı switch) zariftir; ancak telefonda fiziksel bir kart destesini elde tutuyormuş hissi veren dokunsal haptik ve 3D çevirme etkileşimleri henüz gelişmeye açıktır.
3. **Kutlama ve Dopamin Anları:**
   * *Duolingo:* Bir tur veya ünite bittiğinde tam ekran konfetiler, karakter animasyonları ve sandık açılışları ile kullanıcıya yüksek bir başarı hissi yaşatır.
   * *Diloloji:* Oturum sonu özetlerimiz oldukça sade ve bilgilendiricidir; büyük görsel kutlama anları daha mütevazıdır.

---

### ⚡ 2. PRATİK AÇIDAN (Günlük Kullanım, Akış ve Özellikler)

1. **Sıfır Sürtünmeli Başlangıç (Frictionless Start):**
   * *Duolingo:* Uygulamayı açan kullanıcı ne yapacağını seçmekle vakit kaybetmez; doğrudan parlayan "BAŞLA" butonuna basar ve 3 dakikalık derse dalar.
   * *Diloloji:* Kullanıcı; kelime tekrarı, fiil laboratuvarı, kitap okuma, cümle kartları ve dikte arasında bir seçim yapmak zorunda kalır (Seçim Paradoksu). Yorgun bir kullanıcı seçim yapamayıp uygulamadan çıkabilir.
2. **Hızlı "Metro Modu" (Quizlet Tarzı Dokunsal Flaş Kartlar):**
   * *Quizlet:* Otobüste ayaktayken tek elle ekranı dokunup çevirerek ve sağa/sola kaydırarak ("Biliyorum / Tekrar Et") 60 saniyede 30 kelime gözden geçirilebilir. Klavye açılmaz, yazma zorunluluğu yoktur.
   * *Diloloji:* Mevcut çalışma oturumlarımız derin öğrenme için çok güçlüdür (yazma, boşluk doldurma); ancak ayakta veya yoldayken tek elle hızlıca kart destesini taramak isteyenler için pratik bir "saf kart çevirme" modu eksiktir.
3. **Topluluk Desteleri (Community Deck Hub):**
   * *Quizlet:* Kullanıcılar milyonlarca hazır desteyi ("YDS İlk 500", "A2 Tıp Terimleri", "Fransızca Düzensiz Fiiller") arayıp tek dokunuşla kütüphanelerine ekleyebilir.
   * *Diloloji:* CEFR listeleri ve Kindle/metin içe aktarımı çok güçlüdür; fakat kullanıcıların kendi hazırladığı özel listeleri diğer kullanıcılarla paylaşabileceği bir "Topluluk Vitrini" yoktur.
4. **Mobil PWA Kısıtları:**
   * *Duolingo:* Yerel App Store / Google Play bildirimleri, kilit ekranı widget'ları ile kullanıcıyı her gün çağırır.
   * *Diloloji:* PWA altyapısı bağımsızlık sağlasa da, iOS'ta ana ekrana eklenmeden bildirim gönderilemez; kilit ekranı widget desteği yoktur.

---

### 🧠 3. TEORİK & PEDAGOJİK AÇIDAN (Bilişsel Bilim ve Dil Edinimi)

1. **Sarmal Müfredat (Spiral Curriculum - Jerome Bruner):**
   * *Duolingo:* Bir dilbilgisi kuralını öğretir, 3 ünite sonra başka bir kılıkta tekrar karşına çıkarır, 8 ünite sonra istisnalarını verir. Bilgi sarmal olarak üst üste biner.
   * *Diloloji:* FSRS algoritmamız kelime hafızası için dünya standartlarındadır; ancak **cümle yapısı ve dilbilgisi (sentaks) gelişimi** için konuları birbirine bağlayan "pedagojik bir müfredat omurgası" henüz tam kurulu değildir.
2. **İskele Kurma (Scaffolding - Vygotsky):**
   * *Teori:* Öğrenciye destek en başta maksimum verilmeli (ipucu, görsel, şablon), öğrenci ustalaştıkça destek yavaşça geri çekilmelidir.
   * *Diloloji:* Başlangıç seviyesindeki bir kullanıcı doğrudan karmaşık bir sesli kitaba veya çok seçenekli fiil laboratuvarına girdiğinde "bilişsel aşırı yüklenme" (cognitive overload) yaşayabilir.
3. **Anlık Biçimlendirici Geri Bildirim (Formative Feedback):**
   * *Eksik:* Kullanıcı bir soruda yanlış yaptığında doğru cevabı görür; ancak *"Neden bu artikel geldi? Çünkü bu isim dişil"* veya *"Neden 'suis' değil 'ai'? Çünkü bu fiil hareket fiili değil"* diyen **kural temelli mikro-açıklama** eksik kalır.
4. **Anlaşılabilir Girdi Üstünlüğü (Comprehensible Input - Stephen Krashen):**
   * *Diloloji'nin Gücü:* Bu alanda Diloloji rakiplerinden üstündür. Duolingo'nun bağlamsız ve absürt cümleleri yerine, Diloloji gerçek edebiyat metinleri, iki dilli çocuk masalları ve sesli kitaplar sunar.

---

## 2. Görev ve Yük Paylaşımı (Kim Ne Yapacak?)

### 🟢 Antigravity: Hızlı Kazanımlar & Hafif/Orta Yük (Hemen Başlanacaklar)
*Bağımsız UI bileşenleri, dokunsal deneyim, CSS/etkileşim ve kullanıcı kolaylıkları:*

1. **Görev 1 — Haptik & Dokunsal Geri Bildirim Motoru (`haptics.ts`):**
   - Web Haptics API (`navigator.vibrate`) ile doğru cevaplarda hafif tatlı titreşim (`12ms`), yanlış cevaplarda uyarıcı çift titreşim (`[25, 40, 25]`), kart çevirmelerde hafif dokunsal tık.
   - Ayarlar'dan kapatılabilme seçeneği (erişilebilirlik ve pil dostu).
2. **Görev 2 — Quizlet Tarzı 3D Flaş Kart Çevirme & Kaydırma Modu (Flashcard Flip & Swipe):**
   - Kelimeler listesinde veya pratik ekranında "Flaş Kartlar" modu: Tıklayınca 3D dönen kart (ön: yabancı kelime/cümle + ses, arka: Türkçe anlam + örnek cümle).
   - Sağa kaydır: Öğrendim / Biliyorum, Sola kaydır: Tekrar et. Klavyesiz, tek elle, hızlı gözden geçirme.
3. **Görev 3 — Yanlış Cevaplarda Pedagojik İpucu / Mikro-Kural Notu (Formative Feedback):**
   - Yanlış yapılan artikel veya zaman sorularında "Neden?" sorusunu yanıtlayan 1 cümlelik kural ipucu kutusu.
4. **Görev 4 — Zafer / Tamamlama Kutlaması Güçlendirmesi:**
   - Oturum ve görev tamamlandığında daha enerjik, dopamin salgılatan konfeti ve Monki zafer tepkisi (`art-pop`, konfeti parçacıkları).

---

### 🔵 Claude Code: Ağır Yük & Derin Mimari (Geniş Refaktör ve Altyapı)
*Büyük veri modelleri, arka plan senkronizasyonu ve pedagojik omurga:*

1. **Görev A — Sarmal Öğrenme Patikası (Linear Learning Path / Snake):**
   - A0-A1'den B2'ye kadar kilitleri açılan, kelime + dilbilgisi + okuma metnini harmanlayan ana hat müfredat motoru.
2. **Görev B — Topluluk Desteleri Vitrini (Deck Hub / Marketplace):**
   - Cloudflare Worker + Supabase üzerinde kullanıcı listelerini herkese açık yayınlama, arama, puanlama ve tek tıkla cihaza indirme altyapısı.
3. **Görev C — Yerel Konuşma Tanıma & Telaffuz Skoru Entegrasyonu:**
   - Harici ücretli anahtara bağımlı olmadan tarayıcı/cihaz içi modellerle gerçek zamanlı telaffuz analizi ve kelime renklendirmesi.
4. **Görev D — Doğal Çoklu Seslendirme Altyapısı:**
   - Farklı karakter tonlarında açık kaynak TTS / ses sentezleme modellerinin entegrasyonu.
