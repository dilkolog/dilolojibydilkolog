import { describe, expect, it } from 'vitest'
import { cleanClubText, clubLink, clubViewFor, emptyClub, handleClub, joinClub, leaveClub, look, MAX_CLUB_TEXT, MAX_LOOKS, MAX_READERS, othersLooks, share, type ClubState } from '../readingClub'

const TEXT = { language: 'fr', title: 'Le Petit Prince', body: 'Le petit prince habitait une planète à peine plus grande que lui.' }
const club = (): ClubState => {
  let s = joinClub(emptyClub(), 'Ali').state
  s = joinClub(s, 'Veli').state
  return share(s, 0, TEXT).state
}

describe('reading club', () => {
  it('the one who opened it brings the text; a text is cleaned and kept within limits', () => {
    expect(clubLink('ABC234', 'https://diloloji.com')).toBe('https://diloloji.com/?kulup=ABC234')
    expect(share(club(), 1, TEXT)).toMatchObject({ error: 'not_host' })
    expect(cleanClubText({ ...TEXT, language: 'de' })).toBeNull()
    expect(cleanClubText({ ...TEXT, body: 'kısa' })).toBeNull()
    expect(cleanClubText({ ...TEXT, body: 'a'.repeat(MAX_CLUB_TEXT + 1) })).toBeNull()
    expect(cleanClubText({ ...TEXT, title: ' <b>x</b>\u0007 ', body: `${TEXT.body}\r\nSuite.\u0000` })).toEqual({ language: 'fr', title: 'bx/b', body: `${TEXT.body}\nSuite.` })
    expect(cleanClubText({ ...TEXT, title: '' })?.title).toBe('Ortak metin')
  })

  it('seats up to four readers; a dropped one takes the same seat again by name, words kept', () => {
    let s = club()
    s = look(s, 1, 'planèt').state
    s = leaveClub(s, 1)
    expect(s.readers[1]).toMatchObject({ connected: false, looks: ['planèt'] })
    const back = joinClub(s, 'veli')
    expect(back.slot).toBe(1)
    expect(back.state.readers[1]).toMatchObject({ connected: true, looks: ['planèt'] })
    let full = back.state
    for (let i = full.readers.length; i < MAX_READERS; i++) full = joinClub(full, `R${i}`).state
    expect(joinClub(full, 'Ece')).toMatchObject({ error: 'full' })
  })

  it('a looked-up word is kept once, only real words, only with a text, and within a limit', () => {
    let s = club()
    s = look(s, 1, 'planèt').state
    s = look(s, 1, 'planèt').state
    expect(s.readers[1]!.looks).toEqual(['planèt'])
    expect(look(s, 1, '<script>')).toMatchObject({ error: 'bad_look' })
    expect(look(s, 1, 42)).toMatchObject({ error: 'bad_look' })
    expect(look(joinClub(emptyClub(), 'Ali').state, 0, 'mot')).toMatchObject({ error: 'no_text' })
    for (let i = 0; i < MAX_LOOKS + 5; i++) s = look(s, 0, `mot${'a'.repeat(i % 30)}${String.fromCharCode(97 + (i % 26))}${String.fromCharCode(97 + Math.floor(i / 26))}`).state
    expect(s.readers[0]!.looks.length).toBe(MAX_LOOKS)
  })

  it('a new text starts the reading afresh', () => {
    let s = look(club(), 1, 'planèt').state
    s = share(s, 0, { ...TEXT, title: 'Autre' }).state
    expect(s.text?.title).toBe('Autre')
    expect(s.readers.every((r) => r.looks.length === 0)).toBe(true)
  })

  it('each reader sees the others\' words with their names, not their own', () => {
    let s = club()
    s = joinClub(s, 'Ayşe').state
    s = look(s, 1, 'planèt').state
    s = look(s, 2, 'planèt').state
    s = look(s, 2, 'pein').state
    s = look(s, 0, 'grand').state
    const mine = othersLooks(clubViewFor(s, 0))
    expect(Object.fromEntries(mine)).toEqual({ planèt: ['Veli', 'Ayşe'], pein: ['Ayşe'] })
    expect(othersLooks(clubViewFor(s, 1)).get('grand')).toEqual(['Ali'])
  })

  it('messages: join first, then the rest; nonsense is refused', () => {
    const first = handleClub(emptyClub(), undefined, { t: 'join', name: 'Ali' })
    expect(first.slot).toBe(0)
    expect(handleClub(first.state, undefined, { t: 'look', key: 'x' })).toMatchObject({ error: 'not_joined' })
    expect(handleClub(first.state, 0, { t: 'dance' })).toMatchObject({ error: 'bad_message' })
    expect(handleClub(first.state, 0, null)).toMatchObject({ error: 'bad_message' })
    expect(handleClub(first.state, 0, { t: 'share', text: TEXT }).state.text?.title).toBe('Le Petit Prince')
  })
})
