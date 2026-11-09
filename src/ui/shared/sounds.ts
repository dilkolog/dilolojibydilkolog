import { prefs } from '../prefs'
import { setEffectDucker } from './effectDuck'

/**
 * Diloloji's sounds: synthesized, no audio files to download, works offline. Every sound is a soft mallet note (a sine
 * with a quick "tock" overtone, like a marimba or kalimba) with a short room around it, and every note comes from one
 * scale (C major pentatonic), so sounds that follow each other always fit together: that is the app's sound. Right
 * answers in a row climb the scale; a wrong one, a forgotten one or a pause starts the climb again.
 */

/** The scale as MIDI notes from C4 upwards: C D E G A in each octave. */
const PENTA = [0, 2, 4, 7, 9]
const note = (step: number) => 60 + 12 * Math.floor(step / 5) + PENTA[((step % 5) + 5) % 5]
const hz = (midi: number) => 440 * 2 ** ((midi - 69) / 12)
/** Scale steps from C4: 5 = C5, 10 = C6. */
const S = (step: number) => hz(note(step))

export type SoundName = 'correct' | 'near' | 'wrong' | 'forgot' | 'combo' | 'pair' | 'flip' | 'tick' | 'finish' | 'goal' | 'badge' | 'levelUp'
/** The ones that still play with "only the big moments" (Settings → Ses). */
export const MOMENTS: readonly SoundName[] = ['finish', 'goal', 'badge', 'levelUp']

interface Hit {
  /** Frequency in Hz. */
  f: number
  /** Start, seconds from now. */
  at: number
  /** Loudness, 0–1 before the master volume. */
  v: number
  /** How long the note rings, seconds. */
  ring: number
  /** How much of the bright "tock" overtone: 1 = marimba, 0 = a plain soft tone. */
  bright?: number
}

let ctx: AudioContext | null = null
let master: GainNode | null = null
let duck: GainNode | null = null
let room: ConvolverNode | null = null

/** A small room: two seconds of noise fading fast, made once (no file). */
function roomResponse(c: AudioContext): AudioBuffer {
  const length = Math.round(c.sampleRate * 1.2)
  const buffer = c.createBuffer(2, length, c.sampleRate)
  for (let ch = 0; ch < 2; ch++) {
    const data = buffer.getChannelData(ch)
    for (let i = 0; i < length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / length) ** 3.2
  }
  return buffer
}

function audio(): AudioContext | null {
  if (typeof AudioContext === 'undefined') return null
  if (!ctx) {
    ctx = new AudioContext()
    master = ctx.createGain()
    duck = ctx.createGain()
    const limiter = ctx.createDynamicsCompressor()
    limiter.threshold.value = -10
    limiter.knee.value = 8
    limiter.ratio.value = 6
    room = ctx.createConvolver()
    room.buffer = roomResponse(ctx)
    const wet = ctx.createGain()
    wet.gain.value = 0.22
    // dry and the room both go through the duck (speech turns effects down) and the master volume.
    master.connect(duck).connect(limiter).connect(ctx.destination)
    room.connect(wet).connect(duck)
  }
  // iPhone starts audio suspended until a tap has resumed it.
  if (ctx.state === 'suspended') void ctx.resume()
  return ctx
}

function play(hits: Hit[]) {
  const c = audio()
  if (!c || !master || !room) return
  master.gain.value = 0.55 * Math.max(0, Math.min(1, prefs.soundVolume))
  const t0 = c.currentTime + 0.005
  for (const h of hits) {
    const at = t0 + h.at
    const out = c.createGain()
    out.connect(master)
    out.connect(room)
    // The body: a sine that starts at once (4 ms) and dies away.
    const body = c.createOscillator()
    const bodyGain = c.createGain()
    body.type = 'sine'
    body.frequency.value = h.f
    bodyGain.gain.setValueAtTime(0, at)
    bodyGain.gain.linearRampToValueAtTime(h.v, at + 0.004)
    bodyGain.gain.exponentialRampToValueAtTime(0.0008, at + h.ring)
    body.connect(bodyGain).connect(out)
    body.start(at)
    body.stop(at + h.ring + 0.05)
    // The mallet: the fourth partial, gone in a few hundredths of a second.
    const bright = h.bright ?? 1
    if (bright > 0 && h.f * 4 < 9000) {
      const tock = c.createOscillator()
      const tockGain = c.createGain()
      tock.type = 'sine'
      tock.frequency.value = h.f * 3.98
      tockGain.gain.setValueAtTime(0, at)
      tockGain.gain.linearRampToValueAtTime(h.v * 0.32 * bright, at + 0.002)
      tockGain.gain.exponentialRampToValueAtTime(0.0005, at + 0.07)
      tock.connect(tockGain).connect(out)
      tock.start(at)
      tock.stop(at + 0.1)
    }
  }
}

/** A short woody click (card flip, the clock's last seconds): filtered noise, no pitch to clash with anything. */
function click(v: number, f = 2400) {
  const c = audio()
  if (!c || !master) return
  master.gain.value = 0.55 * Math.max(0, Math.min(1, prefs.soundVolume))
  const length = Math.round(c.sampleRate * 0.04)
  const buffer = c.createBuffer(1, length, c.sampleRate)
  const data = buffer.getChannelData(0)
  for (let i = 0; i < length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / length) ** 4
  const src = c.createBufferSource()
  src.buffer = buffer
  const band = c.createBiquadFilter()
  band.type = 'bandpass'
  band.frequency.value = f
  band.Q.value = 3
  const g = c.createGain()
  g.gain.value = v
  src.connect(band).connect(g).connect(master)
  src.start()
}

/** A short vibration with the sound on phones that support it (Android; iPhone ignores it). */
function buzz(pattern: number | number[]) {
  if (prefs.haptics && typeof navigator !== 'undefined' && 'vibrate' in navigator) navigator.vibrate(pattern)
}

/** Whether this sound may play now: effects on, and the answer sounds only when every sound is wanted. */
export function soundAllowed(name: SoundName): boolean {
  if (!prefs.soundEffects) return false
  return prefs.soundLevel !== 'moments' || MOMENTS.includes(name)
}

/** The climb: how many right answers in a row, forgotten after a pause (a new round starts low). */
const PAUSE_MS = 90_000
const TOP = 7
let run = 0
let lastRight = 0
function climb(): number {
  const now = Date.now()
  if (now - lastRight > PAUSE_MS) run = 0
  const step = Math.min(run, TOP)
  run++
  lastRight = now
  return step
}
const fall = () => {
  run = 0
}

/** The notes of each sound (for the sounds' tests and trying them in Settings). `step` is the climb, 0 = first. */
export function notesOf(name: SoundName, step = 0): Hit[] {
  const s = 7 + step // E5 upwards
  switch (name) {
    case 'correct':
      return [
        { f: S(s), at: 0, v: 0.5, ring: 0.45 },
        { f: S(s + 2), at: 0.075, v: 0.6, ring: 0.7 },
      ]
    case 'near':
      return [
        { f: S(s), at: 0, v: 0.45, ring: 0.4 },
        { f: S(s + 1), at: 0.09, v: 0.42, ring: 0.55, bright: 0.6 },
      ]
    case 'wrong':
      // Low and round, falling a step: says "not this one" without a buzzer.
      return [
        { f: S(3), at: 0, v: 0.5, ring: 0.35, bright: 0.35 },
        { f: S(2), at: 0.11, v: 0.45, ring: 0.6, bright: 0.25 },
      ]
    case 'forgot':
      // One soft, low note: no judgement, it only says the answer is shown.
      return [{ f: S(4), at: 0, v: 0.38, ring: 0.9, bright: 0.2 }]
    case 'combo':
      return [
        { f: S(s), at: 0, v: 0.45, ring: 0.35 },
        { f: S(s + 2), at: 0.06, v: 0.5, ring: 0.35 },
        { f: S(s + 4), at: 0.12, v: 0.55, ring: 0.5 },
        { f: S(s + 7), at: 0.2, v: 0.4, ring: 0.9, bright: 0.5 },
      ]
    case 'pair':
      return [{ f: S(s + 3), at: 0, v: 0.5, ring: 0.5 }]
    case 'finish':
      // A short phrase that comes home: G E G C.
      return [
        { f: S(8), at: 0, v: 0.45, ring: 0.4 },
        { f: S(7), at: 0.11, v: 0.45, ring: 0.4 },
        { f: S(8), at: 0.22, v: 0.5, ring: 0.45 },
        { f: S(10), at: 0.36, v: 0.6, ring: 1.1 },
      ]
    case 'goal':
      // Two chimes, the second a chord: the day is done.
      return [
        { f: S(9), at: 0, v: 0.5, ring: 0.6 },
        { f: S(10), at: 0.16, v: 0.5, ring: 1.1 },
        { f: S(12), at: 0.16, v: 0.35, ring: 1.1, bright: 0.5 },
      ]
    case 'badge':
      // A quick sparkle up the scale, landing on a bright chord.
      return [
        ...[10, 11, 12, 13, 14].map((st, i) => ({ f: S(st), at: i * 0.045, v: 0.3, ring: 0.3, bright: 0.7 })),
        { f: S(10), at: 0.25, v: 0.45, ring: 1.3 },
        { f: S(12), at: 0.25, v: 0.35, ring: 1.3, bright: 0.5 },
        { f: S(15), at: 0.25, v: 0.3, ring: 1.3, bright: 0.3 },
      ]
    case 'levelUp':
      // The biggest one, and the only one this long: up the C chord, then held with a low root.
      return [
        { f: S(5), at: 0, v: 0.45, ring: 0.5 },
        { f: S(7), at: 0.12, v: 0.45, ring: 0.5 },
        { f: S(8), at: 0.24, v: 0.5, ring: 0.5 },
        { f: S(10), at: 0.38, v: 0.6, ring: 1.6 },
        { f: S(12), at: 0.38, v: 0.4, ring: 1.6, bright: 0.5 },
        { f: S(0), at: 0.38, v: 0.45, ring: 1.6, bright: 0.2 },
      ]
    default:
      return []
  }
}

function sound(name: SoundName, step = 0) {
  if (soundAllowed(name)) play(notesOf(name, step))
}

export const sfx = {
  /** A right answer: one step higher than the last, while they come in a row. */
  correct: () => (sound('correct', climb()), buzz(15)),
  /** Almost: the climb holds (neither up nor back). */
  near: () => (sound('near', Math.min(run, TOP)), buzz(30)),
  wrong: () => (fall(), sound('wrong'), buzz([40, 60, 40])),
  /** "I don't remember": the answer is shown, gently. */
  forgot: () => (fall(), sound('forgot'), buzz(20)),
  /** Five, ten, twenty right in a row: a little run up from where the climb is. */
  combo: () => (sound('combo', climb()), buzz([20, 40, 20])),
  /** A matched pair in a matching game. */
  pair: () => (sound('pair', climb()), buzz(12)),
  /** A card turned over. */
  flip: () => soundAllowed('flip') && click(0.5),
  /** The clock's last seconds; `last` is the final one. */
  tick: (last = false) => soundAllowed('tick') && click(last ? 0.9 : 0.55, last ? 1500 : 2000),
  /** A round, a game or a session is over. */
  finish: () => (fall(), sound('finish'), buzz([20, 40, 30])),
  /** The day's goal is reached. */
  goal: () => (sound('goal'), buzz([25, 50, 35])),
  /** A badge or a milestone. */
  badge: () => (sound('badge'), buzz([20, 40, 20, 40, 40])),
  /** A new level: kept for that moment only. */
  levelUp: () => (fall(), sound('levelUp'), buzz([25, 50, 30, 60, 45])),
  /** A new session starts the climb from the bottom. */
  resetRun: fall,
  /** Plays a sound to try in Settings, whatever the level chosen (only if effects are on). */
  trySound: (name: SoundName) => {
    if (!prefs.soundEffects) return
    if (name === 'flip') click(0.5)
    else if (name === 'tick') click(0.9, 1500)
    else play(notesOf(name, name === 'correct' ? 3 : 0))
  },
}

// Word audio turns the effects down: a chime's tail must not cover the pronunciation.
setEffectDucker(() => {
  if (!ctx || !duck) return
  const t = ctx.currentTime
  duck.gain.cancelScheduledValues(t)
  duck.gain.setValueAtTime(duck.gain.value, t)
  duck.gain.linearRampToValueAtTime(0.12, t + 0.06)
  duck.gain.linearRampToValueAtTime(1, t + 1.2)
})
