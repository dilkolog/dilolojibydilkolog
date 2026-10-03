import { describe, expect, it } from 'vitest'
import { readingKey, topicKeys, topicOverlap } from '../reading'

describe('narrow reading', () => {
  const read = 'The elections were close. Voters waited for the elections results; the elections commission counted ballots. Ballots from rural voters arrived late, and the commission delayed results.'
  it('finds what a text is about, leaving function words out', () => {
    const keys = topicKeys(read, 'en')
    expect(keys[0]).toBe(readingKey('elections', 'en'))
    expect(keys).toEqual(expect.arrayContaining([readingKey('ballots', 'en'), readingKey('voters', 'en'), readingKey('commission', 'en')]))
    expect(keys).not.toContain(readingKey('the', 'en'))
  })

  it('scores a same-topic text above an unrelated one', () => {
    const keys = topicKeys(read, 'en')
    const same = topicOverlap(keys, 'The commission published the election results after counting every ballot from the voters.', 'en')
    const other = topicOverlap(keys, 'A new recipe for chocolate cake with fresh berries and cream.', 'en')
    expect(same.score).toBeGreaterThan(0.5)
    expect(other.score).toBe(0)
  })
})
