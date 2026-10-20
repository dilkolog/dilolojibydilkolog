import '../lazy.css'
import type { ReactNode } from 'react'
import todayShot from '../assets/landing/today.webp'
import readingShot from '../assets/landing/reading.webp'
import verbsShot from '../assets/landing/verbs.webp'
import guideShot from '../assets/landing/guide.webp'
import { BrandLogo } from './BrandLogo'
import { BookIcon, CheckIcon, ChevronDownIcon, CloudOffIcon, ConjugationsIcon, DataIcon, GameIcon, HeartIcon, LockIcon, MessageIcon, ReadIcon, SchoolIcon, SparkleIcon } from './icons'
import { Sticker } from './Sticker'

export type LandingStart = 'create' | 'login'

const STEPS = [
  { title: 'Kelimeni ekle', text: 'Kendi listeni kur, bir metinden ya da Kindle’dan aktar. Türkçe anlam, örnek cümle ve telaffuz hazır gelir.' },
  { title: 'Günde birkaç dakika çalış', text: 'Kısa oturumlar: seç, yaz, dinle. Her cevaba anında karşılık alırsın; yanlış yapınca nedenini görürsün.' },
  { title: 'Unutmadan önce tekrar et', text: 'Aralıklı tekrar, her kelimeyi unutmaya yaklaştığı anda karşına çıkarır. Az çalışıp çok akılda tutarsın.' },
]

const FEATURES = [
  { icon: <BookIcon size={22} />, title: 'Sözlük ve çeviri', text: 'Çekimli biçimden bile kelimeyi bulan sözlük; cümle çevirisi ve kendi sözlük notların.' },
  { icon: <GameIcon size={22} />, title: 'Oyunlar', text: 'Dilbilgisi soruları, dikte, eşleştirme, hız oyunları ve arkadaşınla düello.' },
  { icon: <MessageIcon size={22} />, title: 'Monki', text: 'Konuşma, rol yapma ve hata düzeltme için yapay zekâ yardımcısı. İsteğe bağlı.' },
  { icon: <CloudOffIcon size={22} />, title: 'Çevrimdışı çalışır', text: 'Telefonuna uygulama gibi kurulur; çalışma ve okuma internetsiz de sürer.' },
]

const FAQ: { q: string; a: ReactNode }[] = [
  { q: 'Hangi dilleri öğrenebilirim?', a: 'İngilizce, Fransızca ve İspanyolca. Arayüz ve açıklamalar Türkçe.' },
  { q: 'Telefonda çalışır mı?', a: 'Evet. Tarayıcıdan açıp “Ana ekrana ekle” dersen uygulama gibi kurulur; bilgisayarda da aynı hesapla devam edersin.' },
  { q: 'Yapay zekâ özellikleri zorunlu mu?', a: 'Hayır. Kelime çalışma, okuma, fiil laboratuvarı, Rehber ve oyunlar yapay zekâsız çalışır. Monki gibi yapay zekâ özellikleri için kendi Anthropic anahtarını Ayarlar’dan eklersin.' },
  { q: 'Verilerime ne oluyor?', a: <>Kelimelerin ve ilerlemen hesabında eşitlenir; reklam ve izleme yoktur. İstediğin zaman yedeğini indirir ya da hesabını silersin. Ayrıntılar için <a href="/gizlilik">gizlilik politikasına</a> bak.</> },
  { q: 'Nasıl giriş yapıyorum?', a: 'E-posta ve şifreyle, e-postana gelen bağlantıyla ya da Google hesabınla.' },
]

function Shot({ src, alt }: { src: string; alt: string }) {
  return (
    <figure className="lp-shot">
      <div className="device-mockup">
        <div className="device-island" aria-hidden />
        <div className="device-screen">
          <img src={src} alt={alt} width={560} height={1213} loading="lazy" decoding="async" />
        </div>
      </div>
    </figure>
  )
}

/**
 * What a visitor sees before signing in: what Diloloji is, how it works, with the app's own screens, and the
 * two ways in. It stands where the sign-in page used to be the whole site; the sign-in page is one step on.
 */
export function Landing({ onStart, invited = false }: { onStart: (mode: LandingStart) => void; invited?: boolean }) {
  return (
    <div className="lp">
      <header className="lp-top">
        <a className="lp-brand" href="/" aria-label="Diloloji">
          <BrandLogo />
          <span>Diloloji</span>
        </a>
        <div className="lp-top-actions">
          <button type="button" className="btn btn-quiet btn-sm" onClick={() => onStart('login')}>
            Giriş yap
          </button>
          <button type="button" className="btn btn-sm" onClick={() => onStart('create')}>
            Hesap aç
          </button>
        </div>
      </header>

      <main>
        <section className="lp-hero" aria-labelledby="lp-h1">
          <div className="lp-hero-text">
            {invited && (
              <p className="note lp-invite" role="status">
                <HeartIcon size={16} />
                <span>Bir arkadaşın seni davet etti. Hesap açınca otomatik arkadaş olursunuz; birbirinizin günlük çalışmasını görürsünüz.</span>
              </p>
            )}
            <div className="lp-pill">
              <span className="lp-pill-dot" aria-hidden />
              <span>İngilizce · Fransızca · İspanyolca</span>
            </div>
            <h1 id="lp-h1">Kelimeleri unutmadan önce tekrar et.</h1>
            <p className="lp-lead">
              Diloloji, Türkçe konuşanlar için kişiselleştirilmiş kelime öğrenme uygulaması: bilimsel aralıklı tekrar, gerçek metinlerle okuma, dinleme ve kapsamlı fiil laboratuvarı tek yerde. Günde birkaç dakika yeter.
            </p>
            <div className="lp-cta">
              <button type="button" className="btn btn-lg" onClick={() => onStart('create')}>
                Hesap aç ve başla
              </button>
              <button type="button" className="btn btn-quiet btn-lg" onClick={() => onStart('login')}>
                Giriş yap
              </button>
            </div>
            <div className="lp-trust-chips">
              <span className="lp-chip"><SparkleIcon size={14} /> FSRS Hafıza Modeli</span>
              <span className="lp-chip"><ReadIcon size={14} /> 100+ Seviyeli Metin</span>
              <span className="lp-chip"><ConjugationsIcon size={14} /> Fiil Laboratuvarı</span>
              <span className="lp-chip"><LockIcon size={14} /> Reklamsız & Gizli</span>
            </div>
          </div>
          <Shot src={todayShot} alt="Diloloji’nin Bugün ekranı: günün görevi, yeni kelime sayısı ve Başla düğmesi." />
        </section>

        <section className="lp-section" aria-labelledby="lp-how">
          <h2 id="lp-how" className="lp-h2">
            Nasıl çalışır?
          </h2>
          <ol className="lp-steps">
            {STEPS.map((s, i) => (
              <li key={s.title} className="card">
                <span className="lp-step-n" aria-hidden>
                  {i + 1}
                </span>
                <h3 className="section-title">{s.title}</h3>
                <p className="small muted">{s.text}</p>
              </li>
            ))}
          </ol>
        </section>

        <section className="lp-section lp-show" aria-label="Öne çıkan özellikler">
          <article className="lp-row">
            <div className="lp-row-text">
              <span className="lp-icon" aria-hidden>
                <ReadIcon size={22} />
              </span>
              <span className="lp-kicker">Kapsamlı Okuma & Dinleme</span>
              <h2 className="lp-h2">Oku, dinle, dokun, ekle</h2>
              <p>
                Hikâyeler, haberler ve kendi metinlerin. Bilmediğin kelimeye dokununca anlamını görür, tek dokunuşla çalışma listene eklersin; metindeki bildiğin kelime oranı da baştan görünür.
              </p>
              <ul className="lp-list">
                <li><CheckIcon size={16} />Cümle cümle Türkçesi, dikte ve gölgeleme</li>
                <li><CheckIcon size={16} />Sesli kitaplar, haber bültenleri, şarkılar</li>
                <li><CheckIcon size={16} />Kindle ve dosyalardan kelime aktarma</li>
              </ul>
            </div>
            <Shot src={readingShot} alt="Okuma ekranı: Fransızca bir metinde dokunulan kelimenin Türkçe anlamı ve kökeni." />
          </article>

          <article className="lp-row lp-row-flip">
            <div className="lp-row-text">
              <span className="lp-icon" aria-hidden>
                <ConjugationsIcon size={22} />
              </span>
              <span className="lp-kicker">Fiil Laboratuvarı</span>
              <h2 className="lp-h2">Fiil laboratuvarı</h2>
              <p>
                Fransızca ve İspanyolca fiilleri zamanlara göre öğren. Her yanlışta neyi karıştırdığını görürsün; hataların kayıt altında kalır ve onlara dönüp çalışabilirsin.
              </p>
              <ul className="lp-list">
                <li><CheckIcon size={16} />Tüm zamanlar ve kişiler, örnek cümlelerle</li>
                <li><CheckIcon size={16} />Yazarak, seçerek ve süreye karşı alıştırma</li>
                <li><CheckIcon size={16} />Metinde geçen fiil çekimleri otomatik bulunur</li>
              </ul>
            </div>
            <Shot src={verbsShot} alt="Fiil laboratuvarı: Fransızca attendre fiilinin şimdiki zaman çekimi ve Türkçe karşılıkları." />
          </article>

          <article className="lp-row">
            <div className="lp-row-text">
              <span className="lp-icon" aria-hidden>
                <SchoolIcon size={22} />
              </span>
              <span className="lp-kicker">Dilbilgisi Rehberi</span>
              <h2 className="lp-h2">Dilbilgisini de öğren</h2>
              <p>
                Rehber, her konuyu kısa kurallar ve örneklerle anlatır. Dersi okuyup mini sınavı geçince konu öğrenildi sayılır; unutmaman için tekrarı da planlanır.
              </p>
              <ul className="lp-list">
                <li><CheckIcon size={16} />Seviyene göre ders yolu ve seviye belirleme testi</li>
                <li><CheckIcon size={16} />Kendi metinlerinden örnek cümleler</li>
                <li><CheckIcon size={16} />Hata yaptığın konuya tek dokunuşla ders</li>
              </ul>
            </div>
            <Shot src={guideShot} alt="Rehber dersi: Fransızca artikeller ve cinsiyet, kurallar ve örnekler." />
          </article>
        </section>

        <section className="lp-section" aria-labelledby="lp-more">
          <h2 id="lp-more" className="lp-h2">Ve daha fazlası</h2>
          <ul className="lp-tiles">
            {FEATURES.map((f) => (
              <li key={f.title} className="card lp-tile">
                <span className="lp-icon" aria-hidden>
                  {f.icon}
                </span>
                <h3 className="section-title">{f.title}</h3>
                <p className="small muted">{f.text}</p>
              </li>
            ))}
          </ul>
        </section>

        <section className="lp-section lp-trust" aria-labelledby="lp-trust">
          <h2 id="lp-trust" className="lp-h2">
            Verilerin sende
          </h2>
          <ul className="lp-trust-list">
            <li>
              <LockIcon size={20} />
              <span>
                <strong>Reklam ve izleme yok.</strong> Ne okuduğun, ne yazdığın kimseye satılmaz.
              </span>
            </li>
            <li>
              <DataIcon size={20} />
              <span>
                <strong>Yedek ve silme sende.</strong> Her an yedeğini indirir, hesabını ve verilerini silersin.
              </span>
            </li>
            <li>
              <SparkleIcon size={20} />
              <span>
                <strong>Yapay zekâ isteğe bağlı.</strong> Kendi anahtarınla açarsın; açmazsan hiçbir şey gönderilmez.
              </span>
            </li>
          </ul>
        </section>

        <section className="lp-section" aria-labelledby="lp-faq">
          <h2 id="lp-faq" className="lp-h2">
            Sık sorulanlar
          </h2>
          <div className="lp-faq">
            {FAQ.map((f) => (
              <details key={f.q} className="lp-q">
                <summary>
                  <span>{f.q}</span>
                  <ChevronDownIcon size={18} />
                </summary>
                <p className="small">{f.a}</p>
              </details>
            ))}
          </div>
        </section>

        <section className="lp-final card" aria-labelledby="lp-final">
          <Sticker name="hello" size={72} />
          <h2 id="lp-final" className="lp-h2">
            Bugün ilk kelimeni ekle.
          </h2>
          <p className="muted">Hesap aç, dilini seç, birkaç dakikada ilk oturumunu bitir.</p>
          <div className="lp-cta lp-cta-center">
            <button type="button" className="btn btn-lg" onClick={() => onStart('create')}>
              Hesap aç ve başla
            </button>
          </div>
        </section>
      </main>

      <footer className="lp-foot">
        <nav aria-label="Bağlantılar">
          <a href="/hakkinda">Hakkında</a>
          <a href="/gizlilik">Gizlilik politikası</a>
          <a href="/kosullar">Kullanım koşulları</a>
          <a href="mailto:destek@diloloji.com">İletişim</a>
        </nav>
        <p className="small muted">Diloloji · Türkçe konuşanlar için kelime öğrenme uygulaması</p>
      </footer>
    </div>
  )
}
