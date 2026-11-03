import { describe, expect, it } from 'vitest'
import type { TopicLesson } from '../data/guide/lessonTypes'
import { lessonSheetHtml } from './guideSheet'

const lesson = {
  topic: 'x',
  language: 'fr',
  level: 'A2',
  title: 'T',
  summary: 'Özet <b>',
  rules: ["«être» ile kurulur: 'aller' gibi"],
  examples: [{ text: 'Je suis allé.', tr: 'Gittim.' }],
  watch: ['Dikkat edilecek'],
  tip: 'İpucu metni',
} as unknown as TopicLesson

describe('the printed lesson', () => {
  it('is in the app look: the language colour, Lexend and Literata from the site, quoted pieces as chips, text escaped', () => {
    const html = lessonSheetHtml(lesson, 'Başlık', new Date(2026, 10, 4), 'Notum', 'https://diloloji.com')
    expect(html).toContain('--lang: #c6317c')
    expect(html).toContain('https://diloloji.com/fonts/lexend-latin-400-normal.woff2')
    expect(html).toContain('https://diloloji.com/fonts/literata-latin-400-normal.woff2')
    expect(html).toContain('<code>être</code> ile kurulur: <code>aller</code> gibi')
    expect(html).toContain('Özet &lt;b&gt;')
    expect(html).toContain('<h1>Başlık</h1>')
    expect(html).toContain('Fransızca')
    expect(html).toContain('Notum')
  })
})
