import { useEffect, useState } from 'react'
import { cacheAudioWithProgress, hasCachedAudio, uncacheAudio } from '../data/audioCache'
import { CheckIcon, DownloadIcon } from './icons'
import { showToast } from './toastFeed'

/**
 * A library text's recording, kept on the device: one tap downloads it (with its progress) so the text
 * can be listened to and read along with no connection; a second tap takes the copy away again.
 * Recordings are re-fetchable, so they stay out of backups and sync.
 */
export function OfflineAudioChip({ url }: { url: string }) {
  const [state, setState] = useState<'checking' | 'none' | 'busy' | 'ready'>('checking')
  const [share, setShare] = useState<number | null>(0)
  useEffect(() => {
    let live = true
    void hasCachedAudio(url).then((has) => live && setState(has ? 'ready' : 'none'))
    return () => {
      live = false
    }
  }, [url])
  if (state === 'checking') return null
  const download = async () => {
    setState('busy')
    setShare(0)
    const ok = await cacheAudioWithProgress(url, setShare)
    setState(ok ? 'ready' : 'none')
    showToast(ok ? 'Ses cihaza indirildi; internet olmadan dinleyebilirsin.' : 'Ses indirilemedi: internet yok ya da kaynak indirmeye izin vermiyor.', undefined, 5000, ok ? 'success' : 'info')
  }
  return (
    <span className="offline-chip-row">
      {state === 'ready' ? (
        <button
          type="button"
          className="chip chip-sm offline-chip is-ready"
          title="Ses cihazda; dokununca kaldırılır"
          onClick={() => {
            void uncacheAudio(url).then(() => setState('none'))
          }}
        >
          <CheckIcon size={14} className="inline-icon" />Çevrimdışı hazır
        </button>
      ) : (
        <button type="button" className="chip chip-sm offline-chip" disabled={state === 'busy'} onClick={() => void download()}>
          <DownloadIcon size={14} className="inline-icon" />
          {state === 'busy' ? (share === null ? 'İndiriliyor…' : `İndiriliyor %${Math.round(share * 100)}`) : 'Çevrimdışı dinle'}
        </button>
      )}
    </span>
  )
}
