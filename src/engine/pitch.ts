/**
 * Pitch (intonation) contours for pronunciation feedback. Seeing your melody next to a native
 * speaker's improves stress and intonation more than listening alone (Hardison 2004; Chun 1998).
 * The contour is measured in semitones around each speaker's own median, so a low voice and a
 * high voice can be compared, and time is normalised from the first to the last voiced frame.
 */

const TARGET_RATE = 16_000

/** Average-downsamples to about 16 kHz (enough for voice pitch, and much faster). */
export function downsample(samples: Float32Array, rate: number): { data: Float32Array; rate: number } {
  const factor = Math.max(1, Math.floor(rate / TARGET_RATE))
  if (factor === 1) return { data: samples, rate }
  const out = new Float32Array(Math.floor(samples.length / factor))
  for (let i = 0; i < out.length; i++) {
    let sum = 0
    for (let j = 0; j < factor; j++) sum += samples[i * factor + j]
    out[i] = sum / factor
  }
  return { data: out, rate: rate / factor }
}

/**
 * Fundamental frequency per 10 ms frame (YIN: de Cheveigné & Kawahara 2002), null where the frame
 * is silent or unvoiced. Range 70–450 Hz covers speaking voices.
 */
export function pitchTrack(samples: Float32Array, sampleRate: number, minHz = 70, maxHz = 450): (number | null)[] {
  const { data, rate } = downsample(samples, sampleRate)
  const win = Math.round(rate * 0.04)
  const hop = Math.round(rate * 0.01)
  const minLag = Math.floor(rate / maxHz)
  const maxLag = Math.min(win - 1, Math.ceil(rate / minHz))
  // Silence threshold relative to the loudest frame.
  const energies: number[] = []
  for (let s = 0; s + win + maxLag < data.length; s += hop) {
    let e = 0
    for (let i = 0; i < win; i++) e += data[s + i] * data[s + i]
    energies.push(Math.sqrt(e / win))
  }
  const loud = Math.max(0, ...energies)
  const out: (number | null)[] = []
  const d = new Float32Array(maxLag + 1)
  energies.forEach((energy, f) => {
    if (energy < loud * 0.12) return out.push(null)
    const s = f * hop
    for (let lag = 1; lag <= maxLag; lag++) {
      let sum = 0
      for (let i = 0; i < win; i++) {
        const diff = data[s + i] - data[s + i + lag]
        sum += diff * diff
      }
      d[lag] = sum
    }
    // Cumulative mean normalised difference; the first dip under the threshold is the period.
    const cmnd = new Float32Array(maxLag + 1)
    cmnd[0] = 1
    let running = 0
    for (let lag = 1; lag <= maxLag; lag++) {
      running += d[lag]
      cmnd[lag] = running ? (d[lag] * lag) / running : 1
    }
    let best = -1
    for (let lag = minLag; lag <= maxLag; lag++) {
      if (cmnd[lag] < 0.15) {
        best = lag
        while (best + 1 <= maxLag && cmnd[best + 1] < cmnd[best]) best++
        break
      }
    }
    if (best < 0) {
      // No clear dip: the global minimum, if it's convincing enough.
      best = minLag
      for (let lag = minLag; lag <= maxLag; lag++) if (cmnd[lag] < cmnd[best]) best = lag
      if (cmnd[best] > 0.35) return out.push(null)
    }
    // Parabolic interpolation around the dip for sub-sample precision.
    let period = best
    if (best > minLag && best < maxLag) {
      const [a, b, c] = [cmnd[best - 1], cmnd[best], cmnd[best + 1]]
      const denom = a - 2 * b + c
      if (denom) period = best + (a - c) / (2 * denom)
    }
    out.push(rate / period)
  })
  return smooth(out)
}
/** Median of 5 over voiced frames, so single-frame octave jumps don't show. */
function smooth(track: (number | null)[]): (number | null)[] {
  return track.map((v, i) => {
    if (v === null) return null
    const around = track.slice(Math.max(0, i - 2), i + 3).filter((x): x is number => x !== null).sort((a, b) => a - b)
    return around[Math.floor(around.length / 2)]
  })
}

/** Semitones relative to the speaker's median pitch, trimmed to the voiced part. */
export function contour(track: (number | null)[]): (number | null)[] {
  const first = track.findIndex((v) => v !== null)
  if (first < 0) return []
  let last = track.length - 1
  while (track[last] === null) last--
  const part = track.slice(first, last + 1)
  const voiced = part.filter((v): v is number => v !== null).sort((a, b) => a - b)
  const median = voiced[Math.floor(voiced.length / 2)]
  return part.map((v) => (v === null ? null : 12 * Math.log2(v / median)))
}

/** The contour resampled to `n` points over normalised time (gaps stay gaps). */
export function resample(c: (number | null)[], n = 60): (number | null)[] {
  if (!c.length) return []
  return Array.from({ length: n }, (_, i) => c[Math.min(c.length - 1, Math.round((i / (n - 1)) * (c.length - 1)))])
}

/** 0–100: how alike the two melodies are (correlation over points voiced in both). */
export function melodySimilarity(a: (number | null)[], b: (number | null)[]): number | null {
  const x = resample(a)
  const y = resample(b)
  const pairs = x.map((v, i) => [v, y[i]] as const).filter((p): p is readonly [number, number] => p[0] !== null && p[1] !== null)
  if (pairs.length < 8) return null
  const mean = (k: 0 | 1) => pairs.reduce((s, p) => s + p[k], 0) / pairs.length
  const mx = mean(0)
  const my = mean(1)
  let sxy = 0
  let sxx = 0
  let syy = 0
  for (const [p, q] of pairs) {
    sxy += (p - mx) * (q - my)
    sxx += (p - mx) ** 2
    syy += (q - my) ** 2
  }
  // A flat melody against a flat one is a match; against a moving one, not.
  if (sxx < 1 && syy < 1) return 90
  if (sxx < 1e-6 || syy < 1e-6) return 30
  const r = sxy / Math.sqrt(sxx * syy)
  return Math.round(Math.max(0, r) * 100)
}
