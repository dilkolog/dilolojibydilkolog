/**
 * Uncaught errors go to /api/log, which writes one line to the Vercel logs, so a bug on a phone can be
 * seen without asking. Nothing personal goes: quoted text (a word, a sentence) and anything like an
 * e-mail address are cut from the message, and the stack keeps only file paths and line numbers.
 */
export interface ErrorReport {
  name: string
  message: string
  stack: string[]
  /** Where it was caught: 'window', 'promise' or the screen the boundary was showing. */
  where: string
}

const MAX_MESSAGE = 200
const MAX_FRAMES = 8
const PER_LOAD = 5

/** Quoted parts and e-mail-like or long digit runs may be the learner's own words; they go. */
export function scrubMessage(text: string): string {
  return text
    .replace(/(["'`«“‘])[^"'`»”’]*(["'`»”’])/g, '$1…$2')
    .replace(/\S+@\S+/g, '…@…')
    .replace(/https?:\/\/[^\s)]+/g, (url) => pathOf(url))
    .replace(/\d{6,}/g, '…')
    .slice(0, MAX_MESSAGE)
}

/** A URL reduced to its path: no origin, query or hash. */
function pathOf(url: string): string {
  try {
    return new URL(url).pathname
  } catch {
    return '…'
  }
}

/** Each frame as `function path:line:col` (Chrome's `at f (url)` and Firefox/Safari's `f@url` both). */
export function scrubStack(stack: string | undefined): string[] {
  if (!stack) return []
  const frames: string[] = []
  for (const line of stack.split('\n')) {
    const m = line.match(/^\s*at (?:(.*?) \()?(\S+?):(\d+):(\d+)\)?\s*$/) ?? line.match(/^\s*(.*?)@(\S+?):(\d+):(\d+)\s*$/)
    if (!m) continue
    const fn = (m[1] ?? '').replace(/[^\w$.<>/ -]/g, '').slice(0, 60)
    frames.push(`${fn ? `${fn} ` : ''}${pathOf(m[2])}:${m[3]}:${m[4]}`)
    if (frames.length === MAX_FRAMES) break
  }
  return frames
}

export function toReport(error: unknown, where: string): ErrorReport {
  const e = error instanceof Error ? error : null
  return {
    name: (e?.name ?? typeof error).slice(0, 40),
    message: scrubMessage(e ? e.message : String(error)),
    stack: scrubStack(e?.stack),
    where: where.replace(/[^\w-]/g, '').slice(0, 30),
  }
}

let sent = 0
const seen = new Set<string>()

/** Sends once per kind of error and at most a few per page load; never throws. */
export function reportError(error: unknown, where: string) {
  if (import.meta.env.DEV || import.meta.env.MODE === 'test' || sent >= PER_LOAD) return
  try {
    const report = toReport(error, where)
    const key = `${report.name}:${report.message}:${report.stack[0] ?? ''}`
    if (seen.has(key)) return
    seen.add(key)
    sent++
    const body = JSON.stringify(report)
    if (!navigator.sendBeacon?.('/api/log', new Blob([body], { type: 'application/json' }))) {
      void fetch('/api/log', { method: 'POST', body, headers: { 'content-type': 'application/json' }, keepalive: true }).catch(() => {})
    }
  } catch {
    // Reporting must never be the next error.
  }
}

/** Listens for errors nothing else caught. Screen crashes come from ScreenBoundary. */
export function installErrorReporting() {
  addEventListener('error', (e) => reportError(e.error ?? e.message, 'window'))
  addEventListener('unhandledrejection', (e) => reportError(e.reason, 'promise'))
}
