// @vitest-environment happy-dom
import { beforeEach, describe, expect, it } from 'vitest'
import { applyDensity, getDensity, setDensity } from './density'

describe('density', () => {
  beforeEach(() => {
    localStorage.clear()
    delete document.documentElement.dataset.density
  })

  it('defaults to comfortable when nothing is stored', () => {
    expect(getDensity()).toBe('comfortable')
  })

  it('reads compact from localStorage', () => {
    localStorage.setItem('kelime-koc:density', 'compact')
    expect(getDensity()).toBe('compact')
  })

  it('saves density and updates document.documentElement dataset', () => {
    setDensity('compact')
    expect(localStorage.getItem('kelime-koc:density')).toBe('compact')
    expect(document.documentElement.dataset.density).toBe('compact')

    setDensity('comfortable')
    expect(localStorage.getItem('kelime-koc:density')).toBe('comfortable')
    expect(document.documentElement.dataset.density).toBeUndefined()
  })

  it('applyDensity applies dataset attribute according to parameter or stored value', () => {
    applyDensity('compact')
    expect(document.documentElement.dataset.density).toBe('compact')

    applyDensity('comfortable')
    expect(document.documentElement.dataset.density).toBeUndefined()
  })
})
