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

  it('reads the recording of an item (an https audio enclosure), and nothing else', () => {
    const xml = `<rss><channel>
      <item><title>Bulletin</title><link>https://www.rfi.fr/a</link><enclosure url="https://audio.example.fr/a.mp3?x=1&amp;y=2" length="0" type="audio/mpeg"/></item>
      <item><title>Picture</title><link>https://www.rfi.fr/b</link><enclosure url="https://img.example.fr/b.jpg" type="image/jpeg"/></item>
      <item><title>Plain</title><link>https://www.rfi.fr/c</link><enclosure url="http://audio.example.fr/c.mp3" type="audio/mpeg"/></item>
      <item><title>No type</title><link>https://www.rfi.fr/d</link><enclosure url="https://audio.example.fr/d.mp3"/></item>
    </channel></rss>`
    expect(parseFeed(xml).map((i) => i.audio)).toEqual(['https://audio.example.fr/a.mp3?x=1&y=2', undefined, undefined, 'https://audio.example.fr/d.mp3'])
  })

  it('has bulletins with their recording for each language, first in the list', () => {
    for (const language of ['fr', 'en', 'es'] as const) {
      const first = FEEDS.find((f) => f.language === language)!
      expect(first.id).toMatch(/^(rfi-facile|voa-learning|voa-es-news)$/)
    }
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
    expect(decodeEntities('&Eacute;t&eacute; &ndash; &iquest;qu&eacute;? &ntilde; &Ntilde; &uuml; &mdash; &unknown;')).toBe('Été – ¿qué? ñ Ñ ü — &unknown;')
  })
})
