/**
 * A container format this browser can both record and play back. MP4/AAC first: Safari records
 * it natively and every browser plays it; Firefox falls back to WebM/Ogg.
 */
export function recordingType(): string | undefined {
  if (typeof MediaRecorder === 'undefined') return undefined
  const probe = typeof document !== 'undefined' ? document.createElement('audio') : null
  return ['audio/mp4', 'audio/webm;codecs=opus', 'audio/webm', 'audio/ogg'].find(
    (t) => MediaRecorder.isTypeSupported(t) && (!probe || probe.canPlayType(t.split(';')[0]) !== ''),
  )
}

export const canRecord = () => typeof navigator !== 'undefined' && !!navigator.mediaDevices?.getUserMedia && !!recordingType()
