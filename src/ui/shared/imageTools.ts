/** Downscales a picture to at most `max` px on its long side as JPEG, so stored images stay small. */
export async function shrinkImage(blob: Blob, max = 720): Promise<Blob> {
  try {
    const bitmap = await createImageBitmap(blob)
    const scale = Math.min(1, max / Math.max(bitmap.width, bitmap.height))
    const canvas = document.createElement('canvas')
    canvas.width = Math.round(bitmap.width * scale)
    canvas.height = Math.round(bitmap.height * scale)
    canvas.getContext('2d')!.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
    bitmap.close()
    return await new Promise<Blob>((resolve) => canvas.toBlob((b) => resolve(b ?? blob), 'image/jpeg', 0.85))
  } catch {
    // Unsupported format for decoding (e.g. some HEIC): keep the original.
    return blob
  }
}

/** First image in a paste event or the clipboard. */
export function imageFromClipboard(e: ClipboardEvent): Blob | null {
  for (const item of e.clipboardData?.items ?? []) {
    if (item.type.startsWith('image/')) return item.getAsFile()
  }
  return null
}

/** Determines if a string is a valid web image URL. */
export function isLikelyImageUrl(url: string): boolean {
  const trimmed = url.trim()
  if (!/^https?:\/\//i.test(trimmed)) return false
  if (/\.(jpe?g|png|webp|avif|gif)(\?.*)?$/i.test(trimmed)) return true
  if (/\/(images\.|encrypted-tbn0\.gstatic\.com\/|cdn\.|media\.)/i.test(trimmed)) return true
  return false
}

/** Extracts an image URL from text/plain or text/html in a clipboard event. */
export function imageUrlFromClipboard(e: ClipboardEvent): string | null {
  const text = e.clipboardData?.getData('text/plain')?.trim()
  if (text && isLikelyImageUrl(text)) return text
  return null
}

