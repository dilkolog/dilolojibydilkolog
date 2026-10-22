import { showToast } from '../toastFeed'

/** Hands the link to the share sheet where there is one, otherwise to the clipboard. */
export async function share(text: string, url: string, title = 'Diloloji düellosu') {
  try {
    if (typeof navigator.share === 'function') {
      await navigator.share({ title, text, url })
      return
    }
    await navigator.clipboard.writeText(`${text} ${url}`)
    showToast('Bağlantı kopyalandı: arkadaşına yapıştır.')
  } catch {
    // The share sheet was closed, or the clipboard is blocked: the link is also shown on screen.
  }
}
