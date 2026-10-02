import { useEffect, useState } from 'react'
import { mediaBlob } from '../data/db'
import { db } from '../data/instance'

/** Object URL for a stored picture/recording; revoked when no longer shown. */
export function useMediaUrl(id: string | undefined): string | undefined {
  const [url, setUrl] = useState<string>()
  useEffect(() => {
    if (!id) {
      setUrl(undefined)
      return
    }
    let objectUrl: string | undefined
    let cancelled = false
    db.media.get(id).then((m) => {
      if (cancelled || !m) return
      objectUrl = URL.createObjectURL(mediaBlob(m))
      setUrl(objectUrl)
    })
    return () => {
      cancelled = true
      if (objectUrl) URL.revokeObjectURL(objectUrl)
    }
  }, [id])
  return url
}
