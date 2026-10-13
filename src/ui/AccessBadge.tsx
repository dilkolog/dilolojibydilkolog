import { useAccess } from './accessContext'

const TEXT = {
  pending: { label: 'Onay bekliyor', title: 'Başvurun site sahibinde. Onaylanınca eşitleme, çeviri, YZ ekranları ve e-posta hatırlatmaları açılır.' },
  rejected: { label: 'Onaylanmadı', title: 'Hesabın onaylanmadı: eşitleme, çeviri ve YZ ekranları kapalı. Ayrıntı için Ayarlar → Hesap.' },
} as const

/** A small top-bar badge while the account waits for (or was refused) the owner's approval; opens the settings. */
export function AccessBadge({ onOpen }: { onOpen: () => void }) {
  const { status } = useAccess()
  if (status !== 'pending' && status !== 'rejected') return null
  const text = TEXT[status]
  return (
    <button type="button" className="offline-badge access-badge" onClick={onOpen} title={text.title} aria-label={`${text.label}. ${text.title}`}>
      {text.label}
    </button>
  )
}
