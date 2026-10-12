/** The longest side a stored picture keeps: sharp enough to read a label on, small enough to sync. */
export const MAX_SIDE = 1200

/** The size a picture of `width`×`height` is shrunk to (never enlarged). */
export function fitSize(width: number, height: number, max = MAX_SIDE): { width: number; height: number } {
  const scale = Math.min(1, max / Math.max(width, height))
  return { width: Math.max(1, Math.round(width * scale)), height: Math.max(1, Math.round(height * scale)) }
}

/** A picture file shrunk to at most MAX_SIDE and re-encoded as JPEG (a photo from a phone is several MB). */
export async function downscaleImage(file: Blob): Promise<Blob> {
  const bitmap = await createImageBitmap(file)
  const { width, height } = fitSize(bitmap.width, bitmap.height)
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('canvas')
  // JPEG has no transparency: a drawing with a clear background would turn black without this.
  ctx.fillStyle = '#fff'
  ctx.fillRect(0, 0, width, height)
  ctx.drawImage(bitmap, 0, 0, width, height)
  bitmap.close()
  return new Promise((resolve, reject) => canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('encode'))), 'image/jpeg', 0.85))
}
