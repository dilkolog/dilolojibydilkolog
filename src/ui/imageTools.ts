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
