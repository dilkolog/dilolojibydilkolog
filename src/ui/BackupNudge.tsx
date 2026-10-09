import { useEffect, useState } from 'react'
import { db } from '../data/instance'
import { BACKUP_MIN_WORDS, backupState, dismissBackupNudge, downloadBackup, keepStorage } from './backup'
import { getCredential } from './syncRunner'
import { CloseIcon, DataIcon } from './icons'
import { showToast } from './toastFeed'

/** One line on the home screen when the words live only on this device and no recent backup exists. */
export function BackupNudge({ onOpenSync }: { onOpenSync: () => void }) {
  const [due, setDue] = useState<number | null | false>(false)
  useEffect(() => {
    let live = true
    void (async () => {
      // The learner's own words: the sample set can be loaded again any time.
      const [cred, words] = await Promise.all([getCredential(), db.vocabulary.filter((v) => v.source !== 'sample').count()])
      if (words >= BACKUP_MIN_WORDS) void keepStorage()
      if (live) setDue(backupState(!!cred, words))
    })()
    return () => {
      live = false
    }
  }, [])
  if (due === false) return null
  return (
    <div className="habit-nudge backup-nudge">
      <button
        type="button"
        className="habit-nudge-main"
        onClick={async () => {
          await downloadBackup(db)
          showToast('Yedek indirildi.')
          setDue(false)
        }}
      >
        <DataIcon size={18} />
        <span>
          <strong>Kelimelerin yalnızca bu cihazda.</strong>{' '}
          <span className="muted">{due === null ? 'Hiç yedek almadın.' : `Son yedek ${due} gün önce.`}</span>
        </span>
        <span className="habit-nudge-cta">Yedek al</span>
      </button>
      <button type="button" className="link small backup-sync" onClick={onOpenSync}>
        Eşitlemeyi aç
      </button>
      <button
        type="button"
        className="icon-btn icon-btn-sm"
        aria-label="Şimdi değil"
        title="Şimdi değil"
        onClick={() => {
          dismissBackupNudge()
          setDue(false)
        }}
      >
        <CloseIcon size={16} />
      </button>
    </div>
  )
}
