import { describe, expect, it } from 'vitest'
import { LAB_TENSES } from '../../engine/tenses'
import { MOODS, splitEndings } from './labShared'

const text = (segs: { text: string }[]) => segs.map((s) => s.text).join('')
const ending = (segs: { text: string; kind: string }[], kind: string) => segs.filter((s) => s.kind === kind).map((s) => s.text).join('')

describe('splitEndings', () => {
  it('colours what the six forms do not share', () => {
    const forms = ['como', 'comes', 'come', 'comemos', 'coméis', 'comen']
    const segs = splitEndings(forms, false)
    expect(segs.map(text)).toEqual(forms)
    expect(segs.map((s) => ending(s, 'ending'))).toEqual(['o', 'es', 'e', 'emos', 'éis', 'en'])
  })

  it('keeps a stem change in the stem only as far as all six share it', () => {
    const segs = splitEndings(['pienso', 'piensas', 'piensa', 'pensamos', 'pensáis', 'piensan'], false)
    expect(segs[0].filter((s) => s.kind === 'stem').map((s) => s.text).join('')).toBe('p')
    expect(segs.map(text)).toEqual(['pienso', 'piensas', 'piensa', 'pensamos', 'pensáis', 'piensan'])
  })

  it('never colours a whole word: a form with nothing in common still keeps a letter of stem', () => {
    const segs = splitEndings(['voy', 'vas', 'va', 'vamos', 'vais', 'van'], false)
    expect(segs.map(text)).toEqual(['voy', 'vas', 'va', 'vamos', 'vais', 'van'])
    expect(segs.every((s) => s.some((x) => x.kind === 'stem' && x.text))).toBe(true)
  })

  it('compound forms: the auxiliary ending and the participle ending are coloured', () => {
    const forms = ['había comido', 'habías comido', 'había comido', 'habíamos comido', 'habíais comido', 'habían comido']
    const segs = splitEndings(forms, true)
    expect(segs.map(text)).toEqual(forms)
    expect(ending(segs[1], 'aux')).toBe('as')
    expect(ending(segs[1], 'pp')).toBe('ido')
  })

  it('a reflexive or negative lead word stays plain', () => {
    const forms = ['me había levantado', 'te habías levantado', 'se había levantado', 'nos habíamos levantado', 'os habíais levantado', 'se habían levantado']
    const segs = splitEndings(forms, true)
    expect(segs.map(text)).toEqual(forms)
    expect(segs[0][0]).toEqual({ text: 'me ', kind: 'stem' })
  })
})

describe('MOODS', () => {
  it('groups exactly the tenses the lab knows, in the same order (a tense added to one list must reach the menu)', () => {
    for (const language of ['fr', 'es'] as const) expect(MOODS[language].flatMap((m) => m.tenses)).toEqual(LAB_TENSES[language])
  })
})
