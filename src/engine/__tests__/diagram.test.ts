import { describe, expect, it } from 'vitest'
import { addPoint, diagramRound, editPoint, isRight, labelled, MAX_POINTS, newDiagram, removePoint, studyable } from '../diagram'
import { createRng } from '../rng'

const now = new Date('2026-10-12T10:00:00Z')

describe('diagram', () => {
  it('dots get their own ids even after one is removed, and stay inside the picture', () => {
    let d = newDiagram('fr', ' Le corps ', 'img1', now)
    expect(d.title).toBe('Le corps')
    d = addPoint(d, 0.2, 0.3, 'la tête')
    d = addPoint(d, 1.4, -0.2, 'le bras')
    expect(d.points.map((p) => p.id)).toEqual(['p1', 'p2'])
    expect(d.points[1]).toMatchObject({ x: 1, y: 0 })
    d = removePoint(d, 'p1')
    d = addPoint(d, 0.5, 0.5, 'la main')
    expect(d.points.map((p) => p.id)).toEqual(['p2', 'p3'])
  })

  it('at most MAX_POINTS dots; an empty title becomes "Resim"', () => {
    let d = newDiagram('es', '  ', 'i', now)
    expect(d.title).toBe('Resim')
    for (let i = 0; i < MAX_POINTS + 3; i++) d = addPoint(d, 0.1, 0.1, `w${i}`)
    expect(d.points).toHaveLength(MAX_POINTS)
  })

  it('is studyable with two labelled dots; unlabelled ones are left out of a round', () => {
    let d = addPoint(newDiagram('fr', 'x', 'i', now), 0.1, 0.1)
    d = addPoint(d, 0.2, 0.2, 'le nez')
    expect(studyable(d)).toBe(false)
    d = editPoint(d, 'p1', { word: 'la bouche', meaning: 'ağız', x: 3 })
    expect(d.points[0]).toMatchObject({ word: 'la bouche', meaning: 'ağız', x: 1 })
    expect(studyable(d)).toBe(true)
    d = addPoint(d, 0.3, 0.3, '')
    const r = diagramRound(d, createRng(1))
    expect(r.order).toHaveLength(2)
    expect(labelled(d)).toHaveLength(2)
    expect([...r.bank].sort()).toEqual(['la bouche', 'le nez'])
  })

  it('a typed answer ignores accents, capitals and the article', () => {
    const p = { id: 'p1', x: 0, y: 0, word: "l'épaule" }
    expect(isRight(p, 'EPAULE')).toBe(true)
    expect(isRight(p, "l'epaule")).toBe(true)
    expect(isRight(p, 'épaules')).toBe(false)
    expect(isRight(p, '')).toBe(false)
    expect(isRight({ ...p, word: 'la tête' }, 'tete')).toBe(true)
  })
})
