import type { InboxItem } from '../data/friends'
import type { Notice } from '../engine/notices'

type Draft = Omit<Notice, 'at' | 'read'>

/** A friend's message as a notice (the same wording as the card on Today). One per message, so it is listed once however often the inbox is read. */
export function friendNotice(item: InboxItem, who: string): Draft {
  const text =
    item.kind === 'cheer'
      ? `${who} seni tebrik etti`
      : item.kind === 'nudge'
        ? `${who} seni dürttü: bugün biraz çalışmaya ne dersin?`
        : item.kind === 'gift' && item.gift
          ? `${who} sana bir kelime gönderdi: ${item.gift.lemma} = ${item.gift.meaning}`
          : item.kind === 'text' && item.text
            ? `${who} bir metin gönderdi: “${item.text.title}”`
            : `${who} sana bir ileti gönderdi`
  return { id: `friend|${item.id.replace(/[^\w.:-]/g, '')}`, kind: 'friend', text, target: 'home' }
}

export const badgeNotice = (id: string, title: string): Draft => ({ id: `badge|${id}`, kind: 'badge', text: `Yeni rozet: ${title}`, target: 'profile' })

export const levelNotice = (level: number, title: string): Draft => ({ id: `level|${level}`, kind: 'level', text: `Seviye ${level}'e ulaştın: ${title}`, target: 'profile' })

export const certNotice = (language: string, level: string, languageName: string): Draft => ({
  id: `cert|${language}|${level}`,
  kind: 'cert',
  text: `${languageName} ${level} sertifikan hazır. Rehber'de paylaşabilirsin.`,
  target: 'guide',
})

export const accountNotice = (status: 'approved' | 'rejected'): Draft =>
  status === 'approved'
    ? { id: 'account|approved', kind: 'account', text: 'Hesabın onaylandı: eşitleme, çeviri ve YZ ekranları açıldı.', target: 'settings' }
    : { id: 'account|rejected', kind: 'account', text: 'Hesabın onaylanmadı. Ayrıntı için Ayarlar → Hesap.', target: 'settings' }

export const syncNotice = (line: string, at = Date.now()): Draft => ({ id: `sync|${at}`, kind: 'sync', text: line, target: 'home' })
