import type { TargetLanguage } from '../../engine/types'
import { BookIcon, HelpIcon, LockIcon, MessageIcon } from '../icons'
import { buildSupportMailto, getBuildId } from './buildId'

interface FaqItem {
  q: string
  a: string
}

const FAQ_ITEMS: FaqItem[] = [
  {
    q: 'Şifremi unuttum veya şifresiz giriş nasıl çalışır?',
    a: 'Giriş ekranında "Şifremi unuttum" veya "Şifresiz giriş (Magic Link)" seçeneğine dokunup e-posta adresini girmen yeterlidir. Gelen kutundaki bağlantıya tıklayarak şifre girmeden güvenle oturum açabilirsin. E-posta birkaç dakika içinde gelmezse spam / gereksiz klasörünü kontrol etmeyi unutma.',
  },
  {
    q: 'Kelimelerim ve çalışma geçmişim diğer cihazlarıma nasıl aktarılır?',
    a: 'Hesabına giriş yaptığında kelimelerin, tekrar takvimin, okuma ilerlemen ve ayarların arka planda Cloudflare ve Supabase altyapısıyla güvenle eşitlenir. Başka bir telefon, tablet veya bilgisayardan aynı hesapla giriş yaptığında tüm verilerin otomatik yüklenir.',
  },
  {
    q: 'İnternet bağlantım yokken çalışabilir miyim?',
    a: "Evet! Diloloji tam çevrimdışı (PWA) desteğine sahiptir. İlgili dilin sözlük paketi cihaza indirildikten sonra kelime tekrarları, alıştırmalar, telaffuzlar ve okuma kütüphanesi internetsiz de eksiksiz çalışır. Bağlantı sağlandığında ilerlemen bulutla senkronize edilir.",
  },
  {
    q: 'Günlük hatırlatma bildirimleri gelmiyor, ne yapmalıyım?',
    a: 'Cihazının veya tarayıcının bildirim izinlerinin açık olduğunu kontrol et. Ayarlar → Bildirimler sekmesinden çalışma saatini ayarlayabilir ve "Test bildirimi gönder" düğmesine dokunarak sistemin bildirim gönderip gönderemediğini hemen test edebilirsin.',
  },
  {
    q: 'Sesli alıştırmalarda mikrofonum algılanmıyor.',
    a: 'Tarayıcının adres çubuğundaki kilit veya site ayarları simgesine dokunarak Diloloji için mikrofon izninin "İzin Ver" durumunda olduğundan emin ol. Apple iOS cihazlarda donanımsal sessiz anahtarının kapalı ve ses seviyesinin açık olması gerekir.',
  },
  {
    q: 'Sözlükte hatalı bir çeviri görürsem düzeltebilir miyim?',
    a: 'Kesinlikle. Her kelime kartının sağ üstündeki kalem simgesine dokunarak Türkçe anlamı, telaffuz ipucunu veya örnek cümleyi dilediğin gibi düzenleyebilirsin. Yaptığın düzeltmeler cihazında saklanır ve kendi sözlüğün haline gelir.',
  },
  {
    q: 'Hesabımı ve verilerimi tamamen nasıl silebilirim?',
    a: 'Cihazındaki yerel verileri sıfırlamak için Ayarlar → Veriler sekmesindeki "Verileri sıfırla" seçeneğini kullanabilirsin. Bulut hesabını ve sunucudaki eşitleme yedeklerini kalıcı olarak silmek için destek@diloloji.com adresine kayıtlı e-postandan mesaj gönderebilirsin; hesabın en geç 24 saat içinde tamamen silinir.',
  },
]

export function HelpSettings({ language }: { language: TargetLanguage }) {
  const buildId = getBuildId()
  const supportUrl = buildSupportMailto({ context: 'Ayarlar > Yardım', lang: language })

  return (
    <div className="help-settings stack">
      {/* Support & Contact Card */}
      <section className="card stack">
        <h2 className="section-title">Destek ve İletişim</h2>
        <p className="small muted">
          Bir sorunla karşılaştığında, geri bildirimde bulunmak istediğinde veya hesap işlemlerin için bize doğrudan e-posta gönderebilirsin.
        </p>

        <div className="help-actions row">
          <a className="btn btn-primary" href={supportUrl}>
            <MessageIcon size={16} />
            <span>destek@diloloji.com</span>
          </a>
        </div>

        <div className="setting-row">
          <div>
            <div className="setting-label">Sürüm ve derleme kimliği</div>
            <p className="small muted">Hata bildirirken bu kodu eklemen çözümü hızlandırır.</p>
          </div>
          <code className="help-build-id">{buildId}</code>
        </div>
      </section>

      {/* Legal & Static Links Card */}
      <section className="card stack">
        <h2 className="section-title">Yasal Bilgiler ve Şartlar</h2>
        <div className="help-links-list">
          <a className="help-link-row" href="/gizlilik" target="_blank" rel="noopener noreferrer">
            <span className="help-link-icon"><LockIcon size={18} /></span>
            <div>
              <strong>Gizlilik Politikası</strong>
              <p className="small muted">Cihazında tutulan veriler, ağ istekleri ve hakların</p>
            </div>
          </a>
          <a className="help-link-row" href="/kosullar" target="_blank" rel="noopener noreferrer">
            <span className="help-link-icon"><BookIcon size={18} /></span>
            <div>
              <strong>Kullanım Koşulları</strong>
              <p className="small muted">Hizmet şartları, telif hakları ve sorumluluklar</p>
            </div>
          </a>
          <a className="help-link-row" href="/hakkinda" target="_blank" rel="noopener noreferrer">
            <span className="help-link-icon"><HelpIcon size={18} /></span>
            <div>
              <strong>Diloloji Hakkında</strong>
              <p className="small muted">Geliştirilme hikayesi, açık kaynak felsefesi ve mimari</p>
            </div>
          </a>
        </div>
      </section>

      {/* FAQ Accordion Card */}
      <section className="card stack">
        <h2 className="section-title">Sıkça Sorulan Sorular</h2>
        <div className="faq-list">
          {FAQ_ITEMS.map((item, idx) => (
            <details key={idx} className="faq-item">
              <summary className="faq-summary">
                <span>{item.q}</span>
              </summary>
              <div className="faq-answer">
                <p className="small muted">{item.a}</p>
              </div>
            </details>
          ))}
        </div>
      </section>
    </div>
  )
}
