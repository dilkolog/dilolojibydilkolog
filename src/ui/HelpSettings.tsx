import { buildId, SUPPORT_MAIL, supportMailto } from './helpInfo'

/** Short answers to what a new person gets stuck on; each is a row so Settings search finds it. */
const QUESTIONS: { q: string; a: string }[] = [
  {
    q: 'Giriş maili gelmedi',
    a: 'Önce spam ya da gereksiz klasörüne bak, bir dakika bekleyip bağlantıyı yeniden iste. Olmazsa Google ile giriş yap ya da e-posta + şifreyle gir. iPhone’da uygulamayı ana ekrana eklediysen e-postadaki bağlantı Safari’de açılır ve uygulamaya geçmez: Google ya da şifreyle gir.',
  },
  {
    q: 'İlerlemem başka cihazda görünmüyor',
    a: 'İki cihazda da aynı hesapla giriş yaptığından emin ol, sonra Ayarlar → Hesap → “Şimdi eşitle”ye dokun. Eşitleme internet ister; ilk seferde birkaç saniye sürebilir.',
  },
  {
    q: 'Dil paketi ya da ses ilk açılışta yavaş',
    a: 'Her dilin sözlük paketi (birkaç MB) ilk kullanımda iner ve cihazda kalır; sonra internetsiz de çalışır. Mobil veride Wi‑Fi’ı bekleyebilirsin.',
  },
  {
    q: 'İnternetsiz neler çalışır?',
    a: 'Kelimeler, tekrarlar, oyunlar ve daha önce indirilen paketler. Çeviri, haber, dinleme kaynakları, YZ ve eşitleme internet ister.',
  },
  {
    q: 'Verilerimi nasıl yedeklerim?',
    a: 'Ayarlar → Veriler → “Yedeği indir”. Yedek dosyasını sonradan aynı yerden geri yükleyebilirsin. Hesaba giriş yaptıysan ilerlemen zaten eşitlenir.',
  },
  {
    q: 'Ortak bir cihazda kullanıyorum',
    a: 'Bitirince Ayarlar → Hesap → “Ortak cihaz: Çıkış yap ve sil”e dokun: önce eşitler, sonra bu cihazdaki kelimeleri ve anahtarları siler.',
  },
  {
    q: 'Hatırlatma bildirimi gelmiyor',
    a: 'Ayarlar → Bildirimler’den hatırlatıcıyı aç ve tarayıcının bildirim iznini ver. iPhone’da önce uygulamayı ana ekrana eklemen gerekir.',
  },
  {
    q: 'Hesabımı silmek istiyorum',
    a: 'Ayarlar → Veriler’in altındaki “Hesabı sil”. Hesap ve sunucudaki verilerin silinir; bu cihazdaki kopya için ayrıca “Çıkış yap ve sil”i kullanabilirsin.',
  },
]

/** Settings → Yardım: who to write to, the policies, answers to the usual questions, which version this is. */
export function HelpSettings() {
  return (
    <>
      <section className="card stack">
        <h3 className="section-title">Bize ulaş</h3>
        <p className="small muted">Bir şey çalışmıyorsa ya da bir fikrin varsa yaz. Mail, sürüm ve tarayıcı bilgisiyle hazır açılır; sorunu görmemize yardım eder.</p>
        <div className="row">
          <a className="btn" href={supportMailto()}>
            {SUPPORT_MAIL} adresine yaz
          </a>
        </div>
      </section>

      <section className="card stack">
        <h3 className="section-title">Sık sorulanlar</h3>
        {QUESTIONS.map((item) => (
          <details key={item.q} className="setting-row help-q">
            <summary>{item.q}</summary>
            <p className="small muted">{item.a}</p>
          </details>
        ))}
      </section>

      <section className="card stack">
        <h3 className="section-title">Uygulama hakkında</h3>
        <p className="row">
          <a className="link" href="/gizlilik.html" target="_blank" rel="noreferrer">
            Gizlilik
          </a>
          <a className="link" href="/kosullar.html" target="_blank" rel="noreferrer">
            Kullanım koşulları
          </a>
          <a className="link" href="/hakkinda.html" target="_blank" rel="noreferrer">
            Diloloji nedir?
          </a>
        </p>
        {buildId() && <p className="small muted">Sürüm: {buildId()}</p>}
      </section>
    </>
  )
}
