import type { TargetLanguage } from '../engine/types'
import { LinkIcon } from './icons'

interface Resource {
  name: string
  url: string
  about: string
}

/**
 * Good free practice that lives on other sites. Their content is copyrighted and is never copied
 * into the app (see docs/kaynaklar/tv5monde-dele-ahora.md): each one only opens in a new tab.
 */
const EXTERNAL_RESOURCES: Record<TargetLanguage, Resource[]> = {
  en: [{ name: 'BBC Learning English', url: 'https://www.bbc.co.uk/learningenglish', about: 'Kısa dersler, haber ve dil bilgisi videoları.' }],
  fr: [{ name: 'TV5Monde: Apprendre le français', url: 'https://apprendre.tv5monde.com/', about: 'Seviyeye göre video, ses ve alıştırmalar.' }],
  es: [{ name: 'DELE Ahora', url: 'https://www.deleahora.com/', about: 'Dil bilgisi, kelime ve DELE sınavı alıştırmaları.' }],
}

/** A short card of outside learning sites for the language being learned, opened in a new tab. */
export function ExternalResources({ language }: { language: TargetLanguage }) {
  const list = EXTERNAL_RESOURCES[language]
  if (!list.length) return null
  return (
    <section className="card stack external-resources" aria-label="Dışarıda çalış">
      <h2 className="section-title">Dışarıda çalış</h2>
      <p className="small muted">Başka sitelerin ücretsiz kaynakları. İçerikleri o sitelere ait; burada kopyalamıyoruz, yeni sekmede açılır.</p>
      <ul className="plain stack gap-2">
        {list.map((r) => (
          <li key={r.url}>
            <a className="link" href={r.url} target="_blank" rel="noopener noreferrer">
              <LinkIcon size={14} className="inline-icon" />
              {r.name}
              <span className="sr-only"> (yeni sekmede açılır)</span>
            </a>
            <span className="small muted"> · {r.about}</span>
          </li>
        ))}
      </ul>
    </section>
  )
}
