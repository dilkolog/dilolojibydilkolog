import { describe, expect, it } from 'vitest'
import { decodeEntities, extractArticle, FEEDS, parseFeed } from '../news'

describe('news parsing', () => {
  it('reads RSS items, CDATA and entities included', () => {
    const xml = `<rss><channel><title>X</title>
      <item><title><![CDATA[La réforme &amp; le débat]]></title><link>https://www.lemonde.fr/a.html</link><description>Un &#233;t&eacute; chaud</description></item>
      <item><title>Sans lien</title><link>javascript:alert(1)</link></item>
    </channel></rss>`
    expect(parseFeed(xml)).toEqual([{ title: 'La réforme & le débat', link: 'https://www.lemonde.fr/a.html', description: 'Un été chaud' }])
  })

  it('reads Atom entries', () => {
    const xml = `<feed><entry><title>Hola</title><link href="https://elpais.com/x"/><summary>Resumen del artículo</summary></entry></feed>`
    expect(parseFeed(xml)[0]).toEqual({ title: 'Hola', link: 'https://elpais.com/x', description: 'Resumen del artículo' })
  })

  it('extracts article paragraphs, skipping scripts, menus and short fragments', () => {
    const long = 'Ceci est un paragraphe assez long pour être gardé dans le texte de l’article.'
    const html = `<html><nav><p>${long} menu</p></nav><article><script>var x=1</script><p>${long}</p><p>Court.</p><figure><p>${long} légende</p></figure><p>${long} Deux.</p></article></html>`
    expect(extractArticle(html)).toBe(`${long}\n\n${long} Deux.`)
  })

  it('every feed is https and has a unique id', () => {
    expect(new Set(FEEDS.map((f) => f.id)).size).toBe(FEEDS.length)
    for (const f of FEEDS) expect(f.url.startsWith('https://')).toBe(true)
    expect(decodeEntities('&laquo;a&raquo;')).toBe('«a»')
  })
})
