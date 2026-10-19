import { prefs } from './prefs'

let ctx: AudioContext | null = null

/** Short synthesized tones: no audio files to download, works offline. */
function tones(notes: [freq: number, start: number, dur: number][], type: OscillatorType = 'sine', volume = 0.12) {
  if (!prefs.soundEffects || typeof AudioContext === 'undefined') return
  ctx ??= new AudioContext()
  // iPhone starts audio suspended until a tap has resumed it.
  if (ctx.state === 'suspended') void ctx.resume()
  const t0 = ctx.currentTime
  for (const [freq, start, dur] of notes) {
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.type = type
    osc.frequency.value = freq
    gain.gain.setValueAtTime(0, t0 + start)
    gain.gain.linearRampToValueAtTime(volume, t0 + start + 0.01)
    gain.gain.exponentialRampToValueAtTime(0.001, t0 + start + dur)
    osc.connect(gain).connect(ctx.destination)
    osc.start(t0 + start)
    osc.stop(t0 + start + dur + 0.02)
  }
}

/** A short vibration with the tone on phones that support it (Android; iPhone ignores it). */
function buzz(pattern: number | number[]) {
  if (prefs.haptics && typeof navigator !== 'undefined' && 'vibrate' in navigator) navigator.vibrate(pattern)
}

export const sfx = {
  correct: () => (tones([[660, 0, 0.12], [880, 0.08, 0.18]]), buzz(15)),
  near: () => (tones([[520, 0, 0.15], [600, 0.1, 0.18]]), buzz(30)),
  wrong: () => (tones([[220, 0, 0.18], [180, 0.12, 0.25]], 'triangle', 0.1), buzz([40, 60, 40])),
  combo: () => (tones([[660, 0, 0.1], [880, 0.07, 0.1], [1100, 0.14, 0.2]]), buzz([20, 40, 20])),
  levelUp: () => (tones([[523, 0, 0.15], [659, 0.12, 0.15], [784, 0.24, 0.15], [1047, 0.36, 0.35]], 'triangle', 0.14), buzz([25, 50, 30, 60, 45])),
}
