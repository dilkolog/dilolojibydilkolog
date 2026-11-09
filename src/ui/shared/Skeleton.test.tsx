import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { LinesSkeleton, TilesSkeleton } from './Skeleton'

describe('small loading placeholders', () => {
  it('draw the lines or tiles asked for and tell a screen reader what is loading', () => {
    const lines = renderToStaticMarkup(<LinesSkeleton lines={3} label="Cümleler yükleniyor" />)
    expect(lines.match(/class="sk sk-line"/g)).toHaveLength(3)
    expect(lines).toContain('role="status"')
    expect(lines).toContain('aria-label="Cümleler yükleniyor"')
    expect(renderToStaticMarkup(<TilesSkeleton count={5} />).match(/class="sk sk-tile"/g)).toHaveLength(5)
  })
})
