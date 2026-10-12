/** Opens a page in a new window and brings up the print dialog (which also saves a PDF). False when the browser blocked the window. */
export function openPrint(html: string): boolean {
  const w = window.open('', '_blank')
  if (!w) return false
  w.document.write(html)
  w.document.close()
  w.focus()
  setTimeout(() => w.print(), 300)
  return true
}
