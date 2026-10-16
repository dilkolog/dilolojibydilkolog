import { describe, expect, it } from 'vitest'
import { interestsOf } from './personalInterests'

describe('interestsOf', () => {
  it('returns empty array when settings is undefined or empty', () => {
    expect(interestsOf(undefined)).toEqual([])
    expect(interestsOf({})).toEqual([])
  })

  it('combines profile and story interests without duplicates', () => {
    const settings = {
      profile: { interests: ['müzik', 'sinema'] },
      story: { interests: ['sinema', 'bilim', 'tarih'] },
    }
    expect(interestsOf(settings)).toEqual(['müzik', 'sinema', 'bilim', 'tarih'])
  })

  it('includes custom story topic, trims whitespace, and ignores empty strings', () => {
    const settings = {
      profile: { interests: ['  felsefe  ', ''] },
      story: { interests: ['edebiyat'], custom: '  uzay araştırmaları  ' },
    }
    expect(interestsOf(settings)).toEqual(['felsefe', 'edebiyat', 'uzay araştırmaları'])
  })

  it('limits the returned interests to a maximum of 8 items', () => {
    const settings = {
      profile: { interests: ['1', '2', '3', '4', '5'] },
      story: { interests: ['6', '7', '8', '9', '10'] },
    }
    const res = interestsOf(settings)
    expect(res).toHaveLength(8)
    expect(res).toEqual(['1', '2', '3', '4', '5', '6', '7', '8'])
  })
})
