/** A card field as plain text: markup, sound and image tags dropped, entities decoded (small on purpose: the main bundle reads it). */
const ENTITIES: Record<string, string> = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ' }

export function plainField(html: string): string {
  return html
    .replace(/\[sound:[^\]]*\]/g, '')
    .replace(/<br\s*\/?>|<\/(div|p|li)>/gi, ' ')
    .replace(/<[^>]*>/g, '')
    .replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (m, e: string) => {
      if (e[0] === '#') {
        const code = e[1].toLowerCase() === 'x' ? parseInt(e.slice(2), 16) : Number(e.slice(1))
        return Number.isFinite(code) && code > 0 && code < 0x110000 ? String.fromCodePoint(code) : m
      }
      return ENTITIES[e.toLowerCase()] ?? m
    })
    .replace(/[\t\r\n]+/g, ' ')
    .replace(/ {2,}/g, ' ')
    .trim()
}

