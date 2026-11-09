export const SUPPORT_MAIL = 'destek@diloloji.com'

/** The build's date and commit (empty where the build did not set it, e.g. an odd test setup). */
export const buildId = (): string => (typeof __BUILD_ID__ === 'string' ? __BUILD_ID__ : '')

/**
 * A mail to support with what a bug report needs already in it (version, language, browser, connection),
 * so the person only has to say what happened. `what` is the subject's tail ("Bu ekran açılamadı: today").
 */
export function supportMailto(what = ''): string {
  const subject = `Diloloji${what ? `: ${what}` : ' hakkında'}`
  const lines = [
    '',
    '',
    '— Aşağısını silme, sorunu bulmama yardım ediyor —',
    `Sürüm: ${buildId() || 'bilinmiyor'}`,
    `Tarayıcı: ${typeof navigator === 'undefined' ? '' : navigator.userAgent}`,
    `Bağlantı: ${typeof navigator !== 'undefined' && navigator.onLine === false ? 'yok' : 'var'}`,
  ]
  return `mailto:${SUPPORT_MAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(lines.join('\n'))}`
}
