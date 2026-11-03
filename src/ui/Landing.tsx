import '../lazy.css'
import { useEffect, useRef, useState, type ReactNode } from 'react'
import actListen from '../assets/art/act-listen.webp'
import actRead from '../assets/art/act-read.webp'
import actSpeak from '../assets/art/act-speak.webp'
import actWrite from '../assets/art/act-write.webp'
import cefrA1 from '../assets/art/cefr-monki-a1.webp'
import cefrB1 from '../assets/art/cefr-monki-b1.webp'
import cefrC1 from '../assets/art/cefr-monki-c1.webp'
import friendsTogether from '../assets/art/friends-together.webp'
import gameDuel from '../assets/art/game-duel.webp'
import guideTeach from '../assets/art/guide-teach.webp'
import headWords from '../assets/art/head-words.webp'
import monkiCheer from '../assets/art/monki-cheer.webp'
import monkiWave from '../assets/art/monki-wave.webp'
import sceneTogether from '../assets/art/scene-together.webp'
import type { TargetLanguage } from '../engine/types'
import { SiteTop } from './SiteTop'
import { dropBootHero } from './bootHero'
import { BookIcon, CheckIcon, ChevronDownIcon, CloudOffIcon, ConjugationsIcon, DataIcon, EarIcon, GameIcon, GlobeIcon, HeartIcon, LockIcon, MicIcon, SchoolIcon, ShareIcon, SparkleIcon, TagIcon } from './icons'
import { LANG_MONKI } from './drawnArt'
import { HELLO, LANGUAGE_NAME } from './labels'
import { LANGUAGE_PATHS, languageOfPath, rememberStartLanguage, startLanguage } from './startLanguage'
import { LanguageFacts, LevelBands, LiveReading, MemoryCurve, PlayingPhone, StickyStart } from './LandingParts'

export type LandingStart = 'create' | 'login'

// The app's screens as photographed for each language (scripts/capture-landing-shots.ts): only the picture chosen is fetched.
const SHOTS = import.meta.glob('../assets/landing/*.webp', { eager: true, query: '?url', import: 'default' }) as Record<string, string>
type Screen = 'today' | 'session' | 'correct' | 'summary' | 'verbs' | 'guide' | 'path' | 'dialogue'
const shotOf = (screen: Screen, language: TargetLanguage) => {
  // English has no conjugation tables in the lab: that picture keeps showing French.
  const lang = screen === 'verbs' && language === 'en' ? 'fr' : language
  return SHOTS[`../assets/landing/${screen}-${lang}.webp`]
}

/** The word tapped in the reading picture, shown beside the phone as just added. */
const SAVED_WORD: Record<TargetLanguage, { word: string; tr: string }> = {
  fr: { word: 'la maison', tr: 'ev' },
  es: { word: 'la ciudad', tr: 'şehir' },
  en: { word: 'journey', tr: 'yolculuk' },
}

/** The order the cards stand in: French first (the page's own default), then Spanish and English. */
const PICK_ORDER: TargetLanguage[] = ['fr', 'es', 'en']

const SKILLS = [
  { art: actRead, title: 'Oku', text: 'Seviyene göre hikâyeler, haberler, sesli kitaplar ve kendi metinlerin. Bilmediğin kelimeye dokun, anlamı ve çekimi açılsın.' },
  { art: actListen, title: 'Dinle', text: 'Cümle cümle dinle, dikte yaz, hızı ayarla. Haber bültenleri ve sesli metinlerle kulağın dile alışsın.' },
  { art: actSpeak, title: 'Konuş', text: 'Gölgeleme, telaffuz çalışması ve gündelik diyaloglar: kafede, otelde, doktorda ne diyeceğini bil.' },
  { art: actWrite, title: 'Yaz', text: 'Günlük tut, sınav tarzı yazma görevlerini dene. Yazım hataların bir defterde toplanır ve sana geri döner.' },
  { art: headWords, title: 'Kelime', text: 'Her kelime anlamı, örnek cümlesi ve sesiyle gelir; aralıklı tekrar onu unutmadan pekiştirir.' },
  { art: guideTeach, title: 'Dilbilgisi', text: 'Her dilde 70’ten fazla kısa ders: kural, örnek, alıştırma ve mini sınav. Hepsi Türkçe anlatılır.' },
]

const BANDS: { id: 'A' | 'B' | 'C'; art: string; levels: string; name: string; text: string }[] = [
  { id: 'A', art: cefrA1, levels: 'A1 · A2', name: 'Başlangıç', text: 'Kendini tanıtırsın, alışveriş yapar, yol sorar, gününü anlatırsın.' },
  { id: 'B', art: cefrB1, levels: 'B1 · B2', name: 'Orta', text: 'Seyahatte rahat edersin; deneyimlerini anlatır, haberleri izler, fikrini savunursun.' },
  { id: 'C', art: cefrC1, levels: 'C1', name: 'İleri', text: 'Uzun ve zor metinleri okur, akıcı yazar, resmî dille gündelik dil arasında rahatça geçersin.' },
]

/** Where a Turkish speaker trips, one of each kind per language: from the app's own trap words and lessons. */
interface Native {
  traps: { word: string; not: string; is: string }[]
  sound: { words: string; text: string }
  grammar: { words: string; text: ReactNode }
}
const NATIVE: Record<TargetLanguage, Native> = {
  fr: {
    traps: [
      { word: 'magasin', not: 'magazin', is: 'mağaza' },
      { word: 'carte', not: 'kart', is: 'harita ya da menü' },
    ],
    sound: { words: 'vin · vent · vont', text: 'Üç burun ünlüsü, üç ayrı anlam: şarap, rüzgâr, giderler. Türkçede olmayan bu sesleri “n” ekleyerek bozmamayı öğrenirsin.' },
    grammar: {
      words: 'en lisant',
      text: (
        <>
          Türkçedeki “-arak, -arken” Fransızcada <span lang="fr">en + -ant</span> olur: <span lang="fr">J’apprends en lisant</span> (okuyarak öğreniyorum).
        </>
      ),
    },
  },
  es: {
    traps: [
      { word: 'carta', not: 'kart', is: 'mektup' },
      { word: 'nombre', not: 'numara', is: 'ad, isim' },
    ],
    sound: { words: 'pero · perro', text: 'Tek r ile titrek rr anlam ayırır: “ama” ile “köpek”. Türkçede böyle bir ayrım yok; farkı kulağın da dilin de öğrenir.' },
    grammar: {
      words: 'hay · está',
      text: (
        <>
          İkisi de Türkçede “var” ya da “-de”: “Masada bir kitap var” <span lang="es">hay</span>, “Kitap masada” <span lang="es">está</span>.
        </>
      ),
    },
  },
  en: {
    traps: [
      { word: 'magazine', not: 'magazin', is: 'dergi' },
      { word: 'actually', not: 'aktüel', is: 'aslında' },
    ],
    sound: { words: 'think · this', text: 'th’nin iki sesi Türkçede yok: s, z, t ya da d demek yerine dil ucunu dişlerin arasına koymayı öğrenirsin.' },
    grammar: {
      words: 'in · on · at',
      text: (
        <>
          Türkçedeki tek “-de” eki İngilizcede üç edata ayrılır: <span lang="en">in June, on Monday, at five</span>.
        </>
      ),
    },
  },
}

/** A short exchange with Monki, the way its corrections read in the app (an example, not a live chat). */
const MONKI_CHAT: Record<TargetLanguage, { said: string; right: string; why: ReactNode }> = {
  fr: {
    said: 'Hier, j’ai allé au cinéma avec ma sœur.',
    right: 'Je suis allé au cinéma.',
    why: (
      <>
        <span lang="fr">aller</span>, passé composé’de <span lang="fr">être</span> ile çekilir; <span lang="fr">venir, partir</span> ve <span lang="fr">arriver</span> da öyle.
      </>
    ),
  },
  es: {
    said: 'Hoy soy muy cansado después del trabajo.',
    right: 'Hoy estoy muy cansado.',
    why: (
      <>
        Yorgunluk geçici bir durum: <span lang="es">ser</span> değil <span lang="es">estar</span>.
      </>
    ),
  },
  en: {
    said: 'I live in Izmir since 2018.',
    right: 'I have lived in Izmir since 2018.',
    why: (
      <>
        <span lang="en">since</span> ile bugüne süren bir durum: present perfect. Türkçedeki şimdiki zamanı aynen aktarma.
      </>
    ),
  },
}

const TOGETHER = [
  { art: friendsTogether, title: 'Arkadaşlar', text: 'Kullanıcı adıyla ekle; haftalık lig, ortak hedef, tebrik ve nazik bir hatırlatma.' },
  { art: gameDuel, title: 'Canlı düello', text: 'Aynı dilbilgisi soruları, aynı anda. Kim daha çok doğru yapacak?' },
  { art: sceneTogether, title: 'Birlikte oku', text: 'Aynı metni arkadaşlarınla oku; kimin hangi kelimeye baktığını gör.' },
]

const MORE = [
  { icon: <BookIcon size={22} />, title: 'Sözlük ve çeviri', text: 'Çekimli biçimden bile kelimeyi bulan sözlük, cümle çevirisi ve kendi sözlük notların.' },
  { icon: <GameIcon size={22} />, title: '40’tan fazla oyun', text: 'Tuzak kelimeler, dikte, sayılar ve saatler, refleks turu, eşleştirme ve daha fazlası.' },
  { icon: <CloudOffIcon size={22} />, title: 'İnternetsiz de çalışır', text: 'Telefonuna uygulama gibi kurulur; çalışma ve okuma bağlantı olmadan da sürer.' },
  { icon: <GlobeIcon size={22} />, title: 'Her cihazda', text: 'Telefonda, tablette, bilgisayarda aynı hesap; ilerlemen kendiliğinden eşitlenir.' },
]

const FAQ: { q: string; a: ReactNode }[] = [
  { q: 'Hangi dilleri öğrenebilirim?', a: 'İngilizce, Fransızca ve İspanyolca. Arayüz ve bütün açıklamalar Türkçe; istediğin zaman öbür dillere de geçebilirsin.' },
  { q: 'Hiç bilmiyorum, nereden başlarım?', a: 'Sıfırdan başlayabilirsin: Rehber A1 dersleriyle açılır, ilk kelimeler hazır gelir. Biraz biliyorsan kısa seviye testi bildiğin dersleri işaretler, yol oradan devam eder.' },
  { q: 'Sınava hazırlanmama yardımcı olur mu?', a: 'DELF, DELE ve Cambridge tarzında okuma, dinleme ve yazma görevleri, B2 ve C1 dersleri ve okumalar var. Bunlar resmî sınav soruları değil, sınava benzeyen alıştırmalardır.' },
  { q: 'Telefonda çalışır mı?', a: 'Evet. Tarayıcıdan açıp “Ana ekrana ekle” dersen uygulama gibi kurulur; bilgisayarda da aynı hesapla kaldığın yerden devam edersin.' },
  { q: 'Yapay zekâ özellikleri zorunlu mu?', a: 'Hayır. Kelime çalışma, okuma, dinleme, fiil laboratuvarı, Rehber ve oyunlar yapay zekâsız çalışır. Monki gibi yapay zekâ özellikleri hesabın onaylanınca kendiliğinden açılır; anahtar girmen gerekmez.' },
  { q: 'Verilerime ne oluyor?', a: <>Kelimelerin ve ilerlemen hesabında eşitlenir; reklam ve izleme yoktur. İstediğin zaman yedeğini indirir ya da hesabını silersin. Ayrıntılar için <a href="/gizlilik">gizlilik politikasına</a> bak.</> },
  { q: 'Nasıl giriş yapıyorum?', a: 'E-posta ve şifreyle, e-postana gelen bağlantıyla ya da Google hesabınla.' },
]

function Shot({ src, alt }: { src: string; alt: string }) {
  return (
    <figure className="lp-shot">
      <div className="device-mockup">
        <div className="device-screen">
          <img src={src} alt={alt} width={560} height={1213} loading="lazy" decoding="async" />
        </div>
      </div>
    </figure>
  )
}

function Art({ src, className = '' }: { src: string; className?: string }) {
  return <img className={`lp-art ${className}`.trim()} src={src} alt="" loading="lazy" decoding="async" draggable={false} />
}

/**
 * What a visitor sees before signing in: what Diloloji is, with the app's own screens in the language they pick,
 * and the two ways in. Picking a language lights the whole page in its colour (as the app does) and carries the
 * choice to the first-run screen.
 */
export function Landing({ onStart, invited = false, inviterName }: { onStart: (mode: LandingStart) => void; invited?: boolean; inviterName?: string }) {
  // A shared language page (/fransizca…) opens on its language; otherwise the one picked before, or French.
  const [lang, setLang] = useState<TargetLanguage>(() => (typeof location === 'undefined' ? null : languageOfPath(location.pathname)) ?? startLanguage() ?? 'fr')
  const [shared, setShared] = useState(false)
  const name = LANGUAGE_NAME[lang]
  const native = NATIVE[lang]
  const chat = MONKI_CHAT[lang]
  const heroCta = useRef<HTMLDivElement>(null)
  const finalCta = useRef<HTMLElement>(null)

  // Here now: the first lines index.html showed in its place go.
  useEffect(() => dropBootHero(), [])

  // The page takes the chosen language's light, the way the app does once a language is set. It stays on through the
  // sign-in page (one look until the app sets its own language).
  useEffect(() => {
    document.documentElement.dataset.lang = lang
  }, [lang])

  const pick = (l: TargetLanguage) => {
    setLang(l)
    rememberStartLanguage(l)
  }
  // The language's own page: its link shows that language's picture where it is shared.
  const share = async () => {
    const url = `${location.origin}/${LANGUAGE_PATHS[lang]}`
    try {
      if (navigator.share) {
        await navigator.share({ title: `${name} öğren · Diloloji`, url })
        return
      }
      await navigator.clipboard.writeText(url)
      setShared(true)
    } catch {
      // Closed or not allowed: nothing to say.
    }
  }
  const create = () => {
    rememberStartLanguage(lang)
    onStart('create')
  }

  return (
    <div className="lp" data-lang={lang}>
      <SiteTop onHome={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
        <nav className="lp-nav" aria-label="Sayfa bölümleri">
          <a href="#lp-skills">Beceriler</a>
          <a href="#lp-levels">Seviyeler</a>
          <a href="#lp-method">Yöntem</a>
          <a href="#lp-faq">Sık sorulanlar</a>
        </nav>
        <button type="button" className="btn btn-quiet btn-sm" onClick={() => onStart('login')}>
          Giriş yap
        </button>
        <button type="button" className="btn btn-sm" onClick={create}>
          Hesap aç
        </button>
      </SiteTop>

      <main>
        <section className="lp-hero" aria-labelledby="lp-h1">
          <div className="lp-hero-text">
            {invited && (
              <p className="note lp-invite" role="status">
                <HeartIcon size={16} />
                <span>
                  {inviterName ? (
                    <>
                      <strong>{inviterName}</strong> seni davet etti. Hesap açınca otomatik arkadaş olursunuz; birbirinizin günlük çalışmasını görürsünüz.
                    </>
                  ) : (
                    'Bir arkadaşın seni davet etti. Hesap açınca otomatik arkadaş olursunuz; birbirinizin günlük çalışmasını görürsünüz.'
                  )}
                </span>
              </p>
            )}
            <div className="lp-pill">
              <span className="lp-pill-dot" aria-hidden />
              <span>Türkçe konuşanlar için dil okulu</span>
            </div>
            <h1 id="lp-h1">
              Fransızca, İspanyolca, İngilizce. <span className="lp-h1-accent">Türkçe anlatımla, A1’den C1’e.</span>
            </h1>
            <p className="lp-lead">
              Kelime, dilbilgisi, okuma, dinleme ve konuşma tek bir yolda. Her kural Türkçe anlatılır, tekrarlar senin hafızana göre ayarlanır. Günde birkaç dakika yeter.
            </p>
            <div className="lp-pick">
              <p className="lp-pick-label" id="lp-pick-label">
                Hangi dili öğrenmek istiyorsun?
              </p>
              <div className="lang-cards lp-langs" role="group" aria-labelledby="lp-pick-label">
                {PICK_ORDER.map((l) => (
                  <button key={l} type="button" className="lang-card" aria-pressed={l === lang} data-lang={l} onClick={() => pick(l)}>
                    <img className="lang-card-art" src={LANG_MONKI[l]} alt="" draggable={false} />
                    <span className="hello" lang={l}>
                      {HELLO[l]}
                    </span>
                    <span className="muted">{LANGUAGE_NAME[l]}</span>
                    {l === lang && (
                      <span className="lang-card-check" aria-hidden>
                        <CheckIcon size={16} />
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </div>
            <div className="lp-cta" ref={heroCta}>
              <button type="button" className="btn btn-lg" onClick={create}>
                {name} öğrenmeye başla
              </button>
              <button type="button" className="btn btn-quiet btn-lg" onClick={() => onStart('login')}>
                Giriş yap
              </button>
            </div>
            <ul className="lp-facts small">
              <li>
                <LockIcon size={14} /> Reklam yok
              </li>
              <li>
                <CloudOffIcon size={14} /> İnternetsiz de çalışır
              </li>
              <li>
                <SchoolIcon size={14} /> A1’den C1’e
              </li>
            </ul>
          </div>
          <div className="lp-hero-visual">
            <PlayingPhone
              steps={[
                { src: shotOf('today', lang), label: 'Bugün', alt: `Diloloji’nin Bugün ekranı (${name}): günün görevi, yeni kelime sayısı ve Başla düğmesi.` },
                { src: shotOf('session', lang), label: 'Yeni kelime', alt: `Oturumda yeni bir ${name} kelime: anlamını tahmin et, dört seçenek.` },
                { src: shotOf('correct', lang), label: 'Doğru cevap', alt: 'Doğru tahmin: kelimenin anlamı, sesi ve örnek cümlesi.' },
                { src: shotOf('summary', lang), label: 'Gün sonu', alt: 'Oturum özeti: çalışılan kelimeler ve büyüyen bahçe.' },
              ]}
            >
              <div className="lp-float lp-float-hello" aria-hidden>
                <span className="lp-float-word" lang={lang}>
                  {HELLO[lang]}
                </span>
                <span className="small muted">Merhaba!</span>
              </div>
              <div className="lp-float lp-float-word-added" aria-hidden>
                <CheckIcon size={16} />
                <span>
                  <span className="lp-float-word" lang={lang}>
                    {SAVED_WORD[lang].word}
                  </span>
                  <span className="small muted"> · {SAVED_WORD[lang].tr}</span>
                </span>
              </div>
            </PlayingPhone>
          </div>
        </section>

        <section className="lp-section" aria-labelledby="lp-skills">
          <div className="lp-head">
            <span className="lp-kicker">Dört beceri, tek yol</span>
            <h2 id="lp-skills" className="lp-h2">
              Bir dili bütün yönleriyle öğren
            </h2>
            <p className="lp-sub">Diloloji yalnızca kelime ezberletmez: okur, dinler, konuşur ve yazarsın. Dilbilgisi de kelimeler de aynı yolda, birbirine bağlı ilerler.</p>
          </div>
          <ul className="lp-skills">
            {SKILLS.map((s) => (
              <li key={s.title} className="card lp-skill">
                <Art src={s.art} />
                <div>
                  <h3 className="section-title">{s.title}</h3>
                  <p className="small muted">{s.text}</p>
                </div>
              </li>
            ))}
          </ul>
        </section>

        <section className="lp-section" aria-labelledby="lp-levels">
          <div className="lp-head">
            <span className="lp-kicker">A1’den C1’e</span>
            <h2 id="lp-levels" className="lp-h2">
              Seviyeni bul, yolunu izle
            </h2>
            <p className="lp-sub">Kısa bir seviye testiyle nereden başlayacağını öğren. Rehber dersleri öğrenme sırasına dizer; bir seviyenin bütün derslerini bitirince sertifikanı alırsın.</p>
          </div>
          <LevelBands language={lang} bands={BANDS} />
          <article className="lp-row lp-row-flip lp-row-tight">
            <div className="lp-row-text">
              <ul className="lp-list">
                <li>
                  <CheckIcon size={16} />
                  <span>
                    <strong>Seviye testi.</strong> Kolaydan zora sorular; bildiğin dersler işaretlenir, sen kaldığın yerden başlarsın.
                  </span>
                </li>
                <li>
                  <CheckIcon size={16} />
                  <span>
                    <strong>Öğrenme yolu.</strong> Her ders, dayandığı derslerden sonra gelir. Kilit yok: istediğin dersi açarsın.
                  </span>
                </li>
                <li>
                  <CheckIcon size={16} />
                  <span>
                    <strong>Seviye sertifikası.</strong> Bir seviyenin bütün derslerini öğrenince sertifikanı paylaşır ya da indirirsin.
                  </span>
                </li>
                <li>
                  <CheckIcon size={16} />
                  <span>
                    <strong>Sınav tarzı görevler.</strong> DELF, DELE ve Cambridge tarzında okuma, dinleme ve yazma. Resmî sınav soruları değildir.
                  </span>
                </li>
              </ul>
            </div>
            <Shot src={shotOf('path', lang)} alt={`Rehber’in öğrenme yolu (${name}): A1 dersleri, öğrenilenler işaretli, sıradaki ders öne çıkmış.`} />
          </article>
        </section>

        <section className="lp-section lp-native" aria-labelledby="lp-native">
          <article className="lp-row">
            <div className="lp-row-text">
              <span className="lp-kicker">Türkçe konuşana özel</span>
              <h2 id="lp-native" className="lp-h2">
                Türkçeden gelen tuzakları bilir
              </h2>
              <p>Çeviri vermekle kalmaz: Türkçe alışkanlıklarının seni nerede yanıltacağını söyler. Kurallar Türkçeyle karşılaştırılarak anlatılır, yanlışında nedenini Türkçe görürsün.</p>
              <div className="lp-native-card">
                <p className="lp-native-cap small">{name} için üç örnek</p>
                <dl>
                  <div className="lp-native-row">
                    <dt>
                      <TagIcon size={16} /> Tuzak kelime
                    </dt>
                    <dd>
                      {native.traps.map((t) => (
                        <p key={t.word}>
                          <span className="lp-native-word" lang={lang}>
                            {t.word}
                          </span>{' '}
                          <span className="muted">
                            {t.not} değil, <strong>{t.is}</strong>
                          </span>
                        </p>
                      ))}
                    </dd>
                  </div>
                  <div className="lp-native-row">
                    <dt>
                      <EarIcon size={16} /> Telaffuz
                    </dt>
                    <dd>
                      <p>
                        <span className="lp-native-word" lang={lang}>
                          {native.sound.words}
                        </span>
                      </p>
                      <p className="small muted">{native.sound.text}</p>
                    </dd>
                  </div>
                  <div className="lp-native-row">
                    <dt>
                      <SchoolIcon size={16} /> Dilbilgisi
                    </dt>
                    <dd>
                      <p>
                        <span className="lp-native-word" lang={lang}>
                          {native.grammar.words}
                        </span>
                      </p>
                      <p className="small muted">{native.grammar.text}</p>
                    </dd>
                  </div>
                </dl>
              </div>
            </div>
            <Shot src={shotOf('guide', lang)} alt={`Rehber dersi (${name}): artikeller, Türkçe kurallar ve örnekler.`} />
          </article>
        </section>

        <section className="lp-section lp-show" aria-label="Öne çıkan özellikler">
          <article className="lp-row lp-row-flip">
            <div className="lp-row-text">
              <span className="lp-icon" aria-hidden>
                <BookIcon size={22} />
              </span>
              <span className="lp-kicker">Okuma ve dinleme</span>
              <h2 className="lp-h2">Gerçek metinlerle oku, dinle</h2>
              <p>Hikâyeler, haberler, sesli kitaplar ve kendi metinlerin. Bilmediğin kelimeye dokununca anlamını görür, tek dokunuşla çalışma listene eklersin; metnin ne kadarını bildiğin baştan görünür.</p>
              <ul className="lp-list">
                <li>
                  <CheckIcon size={16} />
                  <span>Cümle cümle Türkçesi, dikte ve gölgeleme</span>
                </li>
                <li>
                  <CheckIcon size={16} />
                  <span>Seviyene göre resimli hikâyeler, B2–C1 okumalar, haber bültenleri</span>
                </li>
                <li>
                  <CheckIcon size={16} />
                  <span>Dinlerken duyulan cümle metinde aydınlanır</span>
                </li>
              </ul>
            </div>
            <LiveReading language={lang} onAdd={create} />
          </article>

          <article className="lp-row">
            <div className="lp-row-text">
              <span className="lp-icon" aria-hidden>
                <MicIcon size={22} />
              </span>
              <span className="lp-kicker">Konuşma</span>
              <h2 className="lp-h2">Gündelik konuşmalara hazır ol</h2>
              <p>Kafede sipariş, otelde bir sorun, doktorda randevu: karşındaki konuşur, sen uygun cevabı seçersin ve her cevapta nedenini görürsün. Sonra aynı cümleleri sesli söyleyip kendi telaffuzunu dinlersin.</p>
              <ul className="lp-list">
                <li>
                  <CheckIcon size={16} />
                  <span>A1’den B1’e gündelik diyaloglar, sesli</span>
                </li>
                <li>
                  <CheckIcon size={16} />
                  <span>Gölgeleme: cümleyi dinle, tekrarla, karşılaştır</span>
                </li>
                <li>
                  <CheckIcon size={16} />
                  <span>Sayılar, saatler, harf harf hecelemek</span>
                </li>
              </ul>
            </div>
            <Shot src={shotOf('dialogue', lang)} alt={`Diyalog (${name}): kafede garsonun sorusu, üç cevap seçeneği ve doğru cevabın açıklaması.`} />
          </article>

          <article className="lp-row lp-row-flip">
            <div className="lp-row-text">
              <span className="lp-icon" aria-hidden>
                <ConjugationsIcon size={22} />
              </span>
              <span className="lp-kicker">Fiil laboratuvarı</span>
              <h2 className="lp-h2">Fiilleri zaman zaman çalış</h2>
              <p>
                Fransızca ve İspanyolcada bütün zamanlar ve kişiler; İngilizcede düzensiz fiiller ve phrasal verbs. Her yanlışta neyi karıştırdığını görürsün; hataların ayrı bir sekmede toplanır, sana yeniden sorulur.
              </p>
              <ul className="lp-list">
                <li>
                  <CheckIcon size={16} />
                  <span>Her zamanın Türkçe anlatımı ve örnek cümleleri</span>
                </li>
                <li>
                  <CheckIcon size={16} />
                  <span>Yazarak, seçerek ve süreye karşı alıştırma</span>
                </li>
                <li>
                  <CheckIcon size={16} />
                  <span>Okuduğun metindeki çekimler kendiliğinden bulunur</span>
                </li>
              </ul>
            </div>
            <Shot src={shotOf('verbs', lang)} alt={`Fiil laboratuvarı: ${lang === 'es' ? 'İspanyolca hablar' : 'Fransızca attendre'} fiilinin şimdiki zaman çekimi ve Türkçe karşılıkları.`} />
          </article>
        </section>

        <section className="lp-section" aria-labelledby="lp-method">
          <article className="lp-row lp-method">
            <div className="lp-row-text">
              <span className="lp-kicker">Yöntem</span>
              <h2 id="lp-method" className="lp-h2">
                Unutmadan hemen önce tekrar
              </h2>
              <p>
                Her cevabın, o kelimeyi ne kadar iyi bildiğini günceller. Diloloji, Anki’nin de kullandığı FSRS algoritmasıyla her kelimenin ne zaman unutulmaya yaklaştığını tahmin eder ve tekrarı tam o güne koyar. Yeterince cevap birikince hafıza modeli sana göre ayarlanır.
              </p>
              <ul className="lp-list">
                <li>
                  <CheckIcon size={16} />
                  <span>Günün planı hazır: tekrarlar, zorlandığın kelimeler, yeniler</span>
                </li>
                <li>
                  <CheckIcon size={16} />
                  <span>Beş dakikan mı var? Kısa bir tur yeter</span>
                </li>
                <li>
                  <CheckIcon size={16} />
                  <span>Kelimelerin tohumdan çiçeğe büyür</span>
                </li>
              </ul>
            </div>
            <MemoryCurve />
          </article>
        </section>

        <section className="lp-section" aria-labelledby="lp-monki">
          <article className="lp-row lp-row-flip lp-monki">
            <div className="lp-row-text">
              <span className="lp-kicker">Monki</span>
              <h2 id="lp-monki" className="lp-h2">
                Takıldığında Monki’ye sor
              </h2>
              <p>Monki, Diloloji’nin yapay zekâ yardımcısı. Hatanı Türkçe açıklar, kendi kelimelerinle küçük sınavlar hazırlar, kafede ya da otelde seninle rol yapar ve konuştuklarınızı hatırlar.</p>
              <p className="small muted">Hesabın onaylanınca açılır. Zorunlu değildir: Diloloji onsuz da baştan sona çalışır.</p>
            </div>
            <figure className="lp-chat">
              <figcaption className="lp-chat-head">
                <Art src={monkiWave} className="lp-chat-face" />
                <span>
                  <strong>Monki</strong>
                  <span className="small muted"> · örnek sohbet</span>
                </span>
              </figcaption>
              <p className="lp-bubble lp-bubble-you" lang={lang}>
                {chat.said}
              </p>
              <p className="lp-bubble lp-bubble-monki">
                <span className="lp-bubble-fix">
                  <SparkleIcon size={14} /> Düzeltme
                </span>
                <span className="lp-bubble-right" lang={lang}>
                  {chat.right}
                </span>
                <span className="small">{chat.why}</span>
              </p>
            </figure>
          </article>
        </section>

        <section className="lp-section" aria-labelledby="lp-together">
          <div className="lp-head">
            <span className="lp-kicker">Birlikte</span>
            <h2 id="lp-together" className="lp-h2">
              Arkadaşlarınla daha kolay
            </h2>
            <p className="lp-sub">Birbirinizin günlük çalışmasını görün, haftalık ligde yarışın, canlı düelloya girin. Seni kimin bulabileceğini ve ne paylaşılacağını sen seçersin.</p>
          </div>
          <ul className="lp-together">
            {TOGETHER.map((t) => (
              <li key={t.title} className="card lp-skill">
                <Art src={t.art} />
                <div>
                  <h3 className="section-title">{t.title}</h3>
                  <p className="small muted">{t.text}</p>
                </div>
              </li>
            ))}
          </ul>
        </section>

        <section className="lp-section" aria-labelledby="lp-facts">
          <div className="lp-head">
            <span className="lp-kicker">İçerik</span>
            <h2 id="lp-facts" className="lp-h2">
              Her dilde neler var?
            </h2>
          </div>
          <LanguageFacts language={lang} names={LANGUAGE_NAME} onPick={pick} />
        </section>

        <section className="lp-section" aria-labelledby="lp-more">
          <h2 id="lp-more" className="lp-h2">
            Ve daha fazlası
          </h2>
          <ul className="lp-tiles">
            {MORE.map((f) => (
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
                <strong>Yapay zekâ isteğe bağlı.</strong> Onaylı hesaplarda hazır gelir; kullanmazsan hiçbir şey gönderilmez.
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

        <section className="lp-final card" aria-labelledby="lp-final" ref={finalCta}>
          <Art src={monkiCheer} className="lp-final-art" />
          <h2 id="lp-final" className="lp-h2">
            İlk dersin birkaç dakika uzakta.
          </h2>
          <p className="muted">Hesap aç, dilini seç, bugün ilk adımı at.</p>
          <div className="lp-cta lp-cta-center">
            <button type="button" className="btn btn-lg" onClick={create}>
              Hesap aç ve başla
            </button>
          </div>
          <button type="button" className="link small lp-share" onClick={() => void share()}>
            <ShareIcon size={16} /> {shared ? 'Bağlantı kopyalandı' : `${name} sayfasını bir arkadaşına gönder`}
          </button>
        </section>
      </main>

      <StickyStart label={`${name} öğrenmeye başla`} onStart={create} after={heroCta} before={finalCta} />
      <footer className="lp-foot">
        <nav aria-label="Bağlantılar">
          <a href="/hakkinda">Hakkında</a>
          <a href="/gizlilik">Gizlilik politikası</a>
          <a href="/kosullar">Kullanım koşulları</a>
          <a href="mailto:destek@diloloji.com">İletişim</a>
        </nav>
        <p className="small muted">Diloloji · Türkçe konuşanlar için İngilizce, Fransızca ve İspanyolca</p>
      </footer>
    </div>
  )
}
