/**
 * The Supabase account mails (Authentication → Emails → Templates and the security notices), written once
 * here in the look of every Diloloji mail (api/_mailLayout.ts) and written out to supabase/templates/*.html by
 * `WRITE_MAIL_TEMPLATES=1 npx vitest run src/data/mailTemplates.test.ts`. The owner pastes those files into the
 * Supabase dashboard (supabase/templates/README.md lists the subject of each).
 *
 * `{{ .Email }}`, `{{ .ConfirmationURL }}` and the rest are Supabase's own variables; they stay as they are.
 */
import { button, codeBox, fallbackLink, mailLayout, paragraph, strong, type Mascot } from './_mailLayout.js'

const SITE = 'https://diloloji.com'
const URL_VAR = '{{ .ConfirmationURL }}'
const REVOKE = 'Bunu sen yapmadıysan hemen şifreni yenile: Diloloji → Ayarlar → Hesap → Giriş yap → “Şifremi unuttum”.'

interface Template {
  preheader: string
  title: string
  mascot?: Mascot
  /** The paragraphs, then the button when the mail has one. */
  body: string[]
  action?: string
  footer: string
}

const t = (x: Template) => x

const TEMPLATES: Record<string, Template> = {
  'confirm-signup': t({
    preheader: 'Tek dokunuşla onayla, kelimelerin her cihazda seninle olsun.',
    title: 'Hoş geldin!',
    mascot: 'wave',
    body: [`Diloloji hesabını ${strong('{{ .Email }}')} adresiyle açtın. Hesabını etkinleştirmek için aşağıdaki düğmeye dokun.`, 'Onaydan sonra ilerlemen bu cihazda ve giriş yaptığın her yerde aynı olur.'],
    action: 'Hesabımı onayla',
    footer: 'Bu hesabı sen açmadıysan bu maili yok sayabilirsin; onaylanmayan hesap kullanılamaz.',
  }),
  invite: t({
    preheader: 'Davetini kabul et ve öğrenmeye başla.',
    title: "Diloloji'ye davetlisin",
    mascot: 'wave',
    body: [`${strong('{{ .Email }}')} adresi için bir Diloloji hesabı hazırlandı. Daveti kabul edip hesabını kurmak için aşağıdaki düğmeye dokun.`],
    action: 'Daveti kabul et',
    footer: 'Bu daveti beklemiyorsan maili yok sayabilirsin.',
  }),
  'magic-link': t({
    preheader: 'Şifresiz giriş: tek dokunuşla içeridesin.',
    title: 'Giriş bağlantın hazır',
    mascot: 'cheer',
    body: ["Diloloji'ye şifresiz girmek için aşağıdaki düğmeye dokun. Bağlantı kısa süre geçerlidir ve yalnızca bir kez kullanılabilir."],
    action: "Diloloji'ye giriş yap",
    footer: 'Giriş isteğini sen yapmadıysan bu maili yok sayabilirsin; bağlantı kullanılmadıkça kimse hesabına giremez.',
  }),
  'reset-password': t({
    preheader: 'Yeni şifreni belirle; verilerin olduğu gibi kalır.',
    title: 'Şifreni yenile',
    mascot: 'think',
    body: ['Diloloji hesabın için şifre yenileme isteği aldık. Yeni şifreni belirlemek için aşağıdaki düğmeye dokun.', 'Kelimelerin, listelerin ve ilerlemen olduğu gibi kalır.'],
    action: 'Yeni şifre belirle',
    footer: 'Şifre yenilemeyi sen istemediysen bu maili yok sayabilirsin; şifren değişmez.',
  }),
  'change-email': t({
    preheader: 'E-posta değişikliğini onayla.',
    title: 'E-posta adresini değiştiriyorsun',
    mascot: 'think',
    body: [`Diloloji hesabının e-postasını ${strong('{{ .Email }}')} adresinden ${strong('{{ .NewEmail }}')} adresine değiştirmek istedin. Onaylamak için aşağıdaki düğmeye dokun.`],
    action: 'Değişikliği onayla',
    footer: 'Bu değişikliği sen istemediysen maili yok say ve şifreni değiştir.',
  }),
  reauthentication: t({
    preheader: 'İşlemi onaylamak için doğrulama kodun.',
    title: 'Doğrulama kodun',
    body: ['Hesabında hassas bir işlemi onaylamak için bu kodu uygulamaya yaz:', '{{ .Token }}', 'Kod kısa süre geçerlidir.'],
    footer: 'Bu kodu sen istemediysen maili yok say ve şifreni değiştir.',
  }),
  // Security notices: no button, no mascot (they should read serious).
  'password-changed': t({
    preheader: 'Hesabının şifresi değiştirildi.',
    title: 'Şifren değişti',
    body: [`${strong('{{ .Email }}')} adresli Diloloji hesabının şifresi az önce değiştirildi.`, 'Bunu sen yaptıysan başka bir şey yapmana gerek yok.'],
    footer: REVOKE,
  }),
  'email-changed': t({
    preheader: 'Hesabının e-posta adresi değiştirildi.',
    title: 'E-posta adresin değişti',
    body: [`Diloloji hesabının e-posta adresi ${strong('{{ .OldEmail }}')} yerine artık ${strong('{{ .Email }}')}.`, 'Bundan sonra girişlerde ve maillerde yeni adres kullanılır.'],
    footer: 'Bu değişikliği sen yapmadıysan eski adresinle (“Şifremi unuttum”) hemen şifreni yenile ve site sahibine haber ver.',
  }),
  'phone-changed': t({
    preheader: 'Hesabının telefon numarası değiştirildi.',
    title: 'Telefon numaran değişti',
    body: [`${strong('{{ .Email }}')} adresli Diloloji hesabının telefon numarası değiştirildi.`],
    footer: REVOKE,
  }),
  'identity-linked': t({
    preheader: 'Hesabına yeni bir giriş yolu bağlandı.',
    title: 'Yeni giriş yolu eklendi',
    body: [`${strong('{{ .Email }}')} adresli Diloloji hesabına ${strong('{{ .Provider }}')} ile giriş bağlandı. Artık bu yolla da girebilirsin.`],
    footer: REVOKE,
  }),
  'identity-unlinked': t({
    preheader: 'Hesabından bir giriş yolu kaldırıldı.',
    title: 'Giriş yolu kaldırıldı',
    body: [`${strong('{{ .Email }}')} adresli Diloloji hesabından ${strong('{{ .Provider }}')} ile giriş kaldırıldı. Bu yolla artık giremezsin.`],
    footer: REVOKE,
  }),
  'mfa-enrolled': t({
    preheader: 'İki adımlı doğrulama açıldı.',
    title: 'İki adımlı doğrulama açıldı',
    body: [`${strong('{{ .Email }}')} adresli Diloloji hesabına yeni bir doğrulama yöntemi (${strong('{{ .FactorType }}')}) eklendi. Girişlerde bu yöntemle de doğrulanman istenir.`],
    footer: REVOKE,
  }),
  'mfa-unenrolled': t({
    preheader: 'İki adımlı doğrulama yöntemi kaldırıldı.',
    title: 'Doğrulama yöntemi kaldırıldı',
    body: [`${strong('{{ .Email }}')} adresli Diloloji hesabından bir doğrulama yöntemi (${strong('{{ .FactorType }}')}) kaldırıldı.`],
    footer: REVOKE,
  }),
}

/** The HTML of each Supabase template, by file name (without .html). */
export function supabaseTemplates(): Record<string, string> {
  const out: Record<string, string> = {}
  for (const [name, x] of Object.entries(TEMPLATES)) {
    const body = x.body
      .map((text) => (text === '{{ .Token }}' ? codeBox(text) : paragraph(text)))
      .join('')
    out[name] = mailLayout({
      preheader: x.preheader,
      title: x.title,
      mascot: x.mascot,
      body: x.action ? `${body}${button(URL_VAR, x.action)}${fallbackLink(URL_VAR)}` : body,
      footer: x.footer,
      site: SITE,
    })
  }
  return out
}
