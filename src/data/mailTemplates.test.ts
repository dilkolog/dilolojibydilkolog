import { readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { supabaseTemplates } from '../../api/_mailTemplates'

const DIR = join(process.cwd(), 'supabase/templates')
const built = supabaseTemplates()

// `WRITE_MAIL_TEMPLATES=1 npx vitest run src/data/mailTemplates.test.ts` writes the files out from api/_mailTemplates.ts.
if (process.env.WRITE_MAIL_TEMPLATES) for (const [name, html] of Object.entries(built)) writeFileSync(join(DIR, `${name}.html`), `${html}\n`)

describe('Supabase mail templates', () => {
  it('the files in supabase/templates are what api/_mailTemplates.ts builds (run with WRITE_MAIL_TEMPLATES=1 after a change)', () => {
    expect(readdirSync(DIR).filter((f) => f.endsWith('.html')).sort()).toEqual(Object.keys(built).map((n) => `${n}.html`).sort())
    for (const [name, html] of Object.entries(built)) expect(readFileSync(join(DIR, `${name}.html`), 'utf8'), name).toBe(`${html}\n`)
  })

  it('every template is in the README with its subject', () => {
    const readme = readFileSync(join(DIR, 'README.md'), 'utf8')
    for (const name of Object.keys(built)) expect(readme, name).toContain(`\`${name}.html\``)
  })

  it('the confirmation address is only ever a link target, never printed as text', () => {
    for (const [name, html] of Object.entries(built)) {
      const all = html.split('{{ .ConfirmationURL }}').length - 1
      const asHref = html.split('href="{{ .ConfirmationURL }}"').length - 1
      expect(all, name).toBe(asHref)
    }
  })

  it('action mails carry the button and the short link, notices carry neither', () => {
    for (const name of ['confirm-signup', 'invite', 'magic-link', 'reset-password', 'change-email']) {
      expect(built[name], name).toContain('href="{{ .ConfirmationURL }}"')
      expect(built[name], name).toContain('Bağlantıyı tarayıcında aç')
    }
    for (const name of ['password-changed', 'email-changed', 'phone-changed', 'identity-linked', 'identity-unlinked', 'mfa-enrolled', 'mfa-unenrolled', 'reauthentication']) expect(built[name], name).not.toContain('ConfirmationURL')
    expect(built.reauthentication).toContain('{{ .Token }}')
  })

  it('uses only pictures the app serves itself (the logo and Monki), over https', () => {
    for (const [name, html] of Object.entries(built)) {
      const sources = [...html.matchAll(/<img[^>]*src="([^"]+)"/g)].map((m) => m[1]!)
      expect(sources.length, name).toBeGreaterThan(0)
      for (const src of sources) expect(src, name).toMatch(/^https:\/\/diloloji\.com\/mail\/(logo|monki-(wave|cheer|think))\.png$/)
    }
  })
})
