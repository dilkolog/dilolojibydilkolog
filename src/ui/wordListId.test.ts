import { describe, expect, it } from 'vitest'
import { newListId } from './wordListId'

describe('newListId', () => {
  it('generates an id starting with list:', () => {
    const id = newListId()
    expect(id.startsWith('list:')).toBe(true)
  })

  it('matches the expected format of alphanumeric characters after prefix', () => {
    const id = newListId()
    expect(id).toMatch(/^list:[0-9a-z]+$/)
  })

  it('generates unique IDs across multiple calls', () => {
    const ids = new Set(Array.from({ length: 50 }, () => newListId()))
    expect(ids.size).toBe(50)
  })
})
