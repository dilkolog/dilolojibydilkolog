import { describe, expect, it } from 'vitest'
import { directAudio, inlineTranscript, parsePodcastFeed, rfiTranscript, voaEpisode } from '../podcasts'

describe('listening sources', () => {
  it('reads feed items, keeping only audio enclosures, without tracking redirects', () => {
    const xml = `<rss><channel><item><title>2026-10-02 - Inflación sube</title><link>https://ex.nl/1</link><pubDate>Fri, 02 Oct 2026 09:11:31 +0000</pubDate>
      <description>&lt;![CDATA[&lt;ul&gt;&lt;li&gt;Temas&lt;/li&gt;&lt;/ul&gt;&lt;h3&gt;Economía&lt;/h3&gt;&lt;p&gt;La inflación &amp;amp; los precios.&lt;/p&gt;]]&gt;</description>
      <enclosure length="1" type="audio/mpeg" url="https://op3.dev/e/https://s3.example.com/p/2026-10-02.mp3"/></item>
      <item><title>Photo</title><link>https://ex/2</link><enclosure url="https://x/img.jpg" type="image/jpeg"/></item></channel></rss>`
    const items = parsePodcastFeed(xml)
    expect(items[0]).toMatchObject({ title: '2026-10-02 - Inflación sube', audio: 'https://s3.example.com/p/2026-10-02.mp3' })
    expect(items[1].audio).toBeUndefined()
    expect(inlineTranscript(items[0].description)).toBe('Economía\n\nLa inflación & los precios.')
  })

  it('cleans the RFI and audiomeans addresses', () => {
    expect(directAudio('https://audio.audiomeans.fr/pfx/abc-123/aod-rfi.akamaized.net/rfi/x.mp3?guid=1&source=Z')).toBe('https://aod-rfi.akamaized.net/rfi/x.mp3')
  })

  it('takes the RFI transcription block and the VOA audio + article', () => {
    const rfi = '<nav><p>Menu</p></nav><div class="m-transcription__content"><p>RFI.  À Paris, il est 18 heures.</p><p>Bonjour.</p></div><div class="m-transcription__load-pdf"><p>PDF</p></div>'
    expect(rfiTranscript(rfi)).toBe('RFI. À Paris, il est 18 heures.\n\nBonjour.')
    const voa = `<a href="https://voa-audio.voanews.eu/vle/2025/03/14/abc_hq.mp3">hq</a><a href="https://voa-audio.voanews.eu/vle/2025/03/14/abc.mp3?download=1">dl</a><article><p>${'Word '.repeat(80)}</p></article>`
    expect(voaEpisode(voa).audio).toBe('https://voa-audio.voanews.eu/vle/2025/03/14/abc.mp3')
  })
})
