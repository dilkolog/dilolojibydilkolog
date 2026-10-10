import { CloudOffIcon } from './icons'
import { useEffect, useState } from 'react'

/**
 * A calm, small badge shown in the top bar when the device is offline.
 * Disappears automatically when connectivity is restored.
 */
export function OfflineBadge() {
  const [offline, setOffline] = useState(() => (typeof navigator !== 'undefined' ? !navigator.onLine : false))

  useEffect(() => {
    const handleOnline = () => setOffline(false)
    const handleOffline = () => setOffline(true)
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  if (!offline) return null

  return (
    <span className="offline-badge" role="status" aria-live="polite" title="İnternet bağlantısı yok">
      <CloudOffIcon size={14} />
      Çevrimdışı
    </span>
  )
}
