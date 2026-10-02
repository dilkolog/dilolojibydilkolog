import { describe, expect, it } from 'vitest'
import { dictionaryHtml, toCsv } from './exportList'
import { createEntry } from './wordInput'
import { newWordState } from '../engine/review'

const NOW = new Date('2026-10-02T10:00:00Z')

describe('exporting the list', () => {
  const maison = createEntry({ word: 'la maison', meaning: 'ev, yuva', example: 'Ma *maison* est "grande"; belle.', exampleTranslation: 'Evim büyük.' }, 'fr', NOW)
  const arbre = createEntry({ word: "l'arbre", meaning: 'ağaç' }, 'fr', NOW)

  it('writes a semicolon CSV with a BOM, quoting what needs it', () => {
    const csv = toCsv([maison, arbre], [newWordState(maison, NOW)])
    expect(csv.startsWith('﻿Dil;Kelime;Artikel')).toBe(true)
    const lines = csv.slice(1).split('\r\n')
    expect(lines).toHaveLength(3)
    expect(lines[1]).toContain('Fransızca;maison;la;noun;ev;yuva;')
    expect(lines[1]).toContain('"Ma maison est ""grande""; belle."')
    expect(lines[1]).toContain(';Tohum;')
    expect(lines[2]).toContain(';Başlanmadı;')
  })

  it('prints an alphabetical dictionary with letter headings, escaping text', () => {
    const html = dictionaryHtml([maison, { ...arbre, notes: '<b>' }], 'fr', 'Sözlüğüm')
    expect(html.indexOf("l'arbre")).toBeLessThan(html.indexOf('la maison'))
    expect(html).toContain('<h2>A</h2>')
    expect(html).toContain('<h2>M</h2>')
    expect(html).toContain('2 kelime')
    expect(html).not.toContain('*maison*')
  })
})
