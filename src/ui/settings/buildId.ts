declare const __APP_BUILD_ID__: string | undefined

/**
 * Returns the current build ID (short git commit sha or build date).
 * Injected at build time via vite's `define` config.
 */
export function getBuildId(): string {
  try {
    if (typeof __APP_BUILD_ID__ !== 'undefined' && __APP_BUILD_ID__) {
      return __APP_BUILD_ID__
    }
  } catch {
    // Fall back below
  }
  return '2026-10-19'
}

/**
 * Generates a pre-filled mailto link for support with device/build metadata.
 */
export function buildSupportMailto(options?: { context?: string; error?: string; lang?: string }): string {
  const build = getBuildId()
  const ua = typeof navigator !== 'undefined' ? navigator.userAgent : 'Bilinmeyen Tarayıcı'
  const lang = options?.lang || (typeof localStorage !== 'undefined' ? localStorage.getItem('diloloji:lang') || 'tr' : 'tr')

  const subject = `Diloloji Destek [${build}]`
  const lines: string[] = []

  if (options?.error) {
    lines.push(`Hata Mesajı: ${options.error}`)
  }
  if (options?.context) {
    lines.push(`Konum / Ekran: ${options.context}`)
  }
  lines.push(`Sürüm / Derleme: ${build}`)
  lines.push(`Öğrenilen Dil: ${lang.toUpperCase()}`)
  lines.push(`Tarayıcı / Sistem: ${ua}`)
  lines.push('')
  lines.push('---')
  lines.push('Lütfen karşılaştığınız sorunu veya önerinizi buraya yazın:')
  lines.push('')

  const body = lines.join('\n')
  return `mailto:destek@diloloji.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
}
