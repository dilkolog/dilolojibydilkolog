import { describe, expect, it } from 'vitest'
import { cleanBy } from '../../api/share'

describe('the public library\'s publisher name', () => {
  it('is plain text and never passes for the site itself', () => {
    expect(cleanBy('ali_42')).toBe('ali_42')
    expect(cleanBy('  Ayşe  ')).toBe('Ayşe')
    expect(cleanBy('Diloloji')).toBeUndefined()
    expect(cleanBy('diloloji ekibi')).toBeUndefined()
    expect(cleanBy('Resmi liste')).toBeUndefined()
    expect(cleanBy('Admin')).toBeUndefined()
    expect(cleanBy('Monki')).toBeUndefined()
    expect(cleanBy('ali‮ilolid')).toBe('aliilolid')
    expect(cleanBy('<b>x</b>')).toBe('bx/b')
    expect(cleanBy('a'.repeat(40))).toHaveLength(30)
    expect(cleanBy(42)).toBeUndefined()
  })
})
