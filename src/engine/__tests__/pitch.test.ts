import { describe, expect, it } from 'vitest'
import { contour, melodySimilarity, pitchTrack } from '../pitch'

/** A voiced sound whose pitch glides from f0 to f1 (with harmonics, like a voice). */
function glide(f0: number, f1: number, seconds: number, rate = 48_000, silence = 0.1): Float32Array {
  const pad = Math.round(rate * silence)
  const n = Math.round(rate * seconds)
  const out = new Float32Array(n + 2 * pad)
  let phase = 0
  for (let i = 0; i < n; i++) {
    const f = f0 + ((f1 - f0) * i) / n
    phase += (2 * Math.PI * f) / rate
    out[pad + i] = 0.5 * Math.sin(phase) + 0.25 * Math.sin(2 * phase) + 0.12 * Math.sin(3 * phase)
  }
  return out
}

describe('pitch contours', () => {
  it('finds the pitch of a steady voice and leaves silence out', () => {
    const track = pitchTrack(glide(150, 150, 0.5), 48_000)
    const voiced = track.filter((v): v is number => v !== null)
    expect(voiced.length).toBeGreaterThan(30)
    const avg = voiced.reduce((a, b) => a + b, 0) / voiced.length
    expect(Math.abs(avg - 150)).toBeLessThan(6)
    expect(track[0]).toBeNull()
  })

  it('follows a rising melody, in semitones around the speaker median', () => {
    const c = contour(pitchTrack(glide(120, 240, 0.6), 48_000)).filter((v): v is number => v !== null)
    expect(c[0]).toBeLessThan(-3)
    expect(c.at(-1)!).toBeGreaterThan(3)
  })

  it('rates the same melody in a higher voice as alike, the opposite melody as not', () => {
    const native = contour(pitchTrack(glide(110, 200, 0.6), 48_000))
    const sameHigher = contour(pitchTrack(glide(220, 400, 0.6), 48_000))
    const falling = contour(pitchTrack(glide(200, 110, 0.6), 48_000))
    expect(melodySimilarity(native, sameHigher)!).toBeGreaterThan(85)
    expect(melodySimilarity(native, falling)!).toBeLessThan(20)
  })
})
