import { describe, expect, it } from 'vitest'
import { automatedOnLive } from './automation'

describe('a bot on the live site', () => {
  it('is a driven browser on diloloji.com, not a person nor a local test', () => {
    expect(automatedOnLive({ webdriver: true }, 'diloloji.com')).toBe(true)
    expect(automatedOnLive({ webdriver: true }, 'www.diloloji.com')).toBe(true)
    // A person on the live site, and the tests on a local preview (they sync against fake servers).
    expect(automatedOnLive({ webdriver: false }, 'diloloji.com')).toBe(false)
    expect(automatedOnLive({}, 'diloloji.com')).toBe(false)
    expect(automatedOnLive({ webdriver: true }, 'localhost')).toBe(false)
    expect(automatedOnLive({ webdriver: true }, '127.0.0.1')).toBe(false)
    expect(automatedOnLive({ webdriver: true }, 'notdiloloji.com')).toBe(false)
  })
})
