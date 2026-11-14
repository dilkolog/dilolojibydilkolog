import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { WordPlant } from './WordPlant'

const offset = (html: string) => Number(/class="word-plant-fill"[^>]*stroke-dashoffset="([\d.]+)"/.exec(html)![1])

describe('WordPlant', () => {
  it('fills its ring with the word’s steps in this session when given them', () => {
    const half = renderToStaticMarkup(<WordPlant state={undefined} steps={{ done: 2, total: 4, carriesOver: false }} />)
    const full = renderToStaticMarkup(<WordPlant state={undefined} steps={{ done: 4, total: 4, carriesOver: false }} />)
    expect(half).toContain('bu turda 2/4 adım')
    expect(offset(half)).toBeGreaterThan(0)
    expect(offset(full)).toBe(0)
  })

  it('reads “next time”, never complete, while debt remains', () => {
    const html = renderToStaticMarkup(<WordPlant state={undefined} steps={{ done: 3, total: 4, carriesOver: true }} />)
    expect(html).toContain('Sonraki turda')
    expect(html).toContain('sonraki turda sürecek')
    expect(offset(html)).toBeGreaterThan(0)
  })

  it('keeps its usual meaning (the way to the next stage) without steps', () => {
    const html = renderToStaticMarkup(<WordPlant state={undefined} />)
    expect(html).toContain('sonraki aşamaya %0')
    expect(html).not.toContain('bu turda')
  })
})
