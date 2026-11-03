/**
 * Opens a page in a new window and brings up the print dialog (which also saves a PDF). False when the browser blocked
 * the window. The dialog waits for the page's fonts and pictures (up to two seconds): printed before they load, the
 * sheet would come out in a fallback font without its logo.
 */
export function openPrint(html: string): boolean {
  const w = window.open('', '_blank')
  if (!w) return false
  w.document.write(html)
  w.document.close()
  w.focus()
  let done = false
  const print = () => {
    if (done) return
    done = true
    w.print()
  }
  const images = [...(w.document.images ?? [])].map((img) => (img.complete ? Promise.resolve() : new Promise<void>((ok) => ((img.onload = img.onerror = () => ok())))))
  const fonts = w.document.fonts?.ready ?? Promise.resolve()
  void Promise.all([fonts, ...images]).then(() => setTimeout(print, 100), print)
  setTimeout(print, 2000)
  return true
}
