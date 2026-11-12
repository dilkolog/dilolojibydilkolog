import { Popover } from './Popover'

/**
 * The word counts the app shows, one name and one meaning each wherever they appear (2026-11-12: Today said "aktif" and
 * "öğreniliyor", Profile "oturan" and "tanışılan", Reading "bilinen", and none of them said what it counted).
 */
export const WORD_COUNTS = {
  met: { label: 'tanıştığın kelime', help: 'İlk tanıtımından beri çalıştığın kelimeler, hangi aşamada olursa olsun.' },
  active: { label: 'aktif kelime', help: 'İpucu olmadan cümlede üretebildiğin ve şu an hâlâ hatırladığın kelimeler. Asıl hedef bu sayının büyümesi.' },
  settled: { label: 'oturan kelime', help: 'Son aşamaya ("Oturdu") ulaşan kelimeler: haftalar sonra da yardımsız hatırladıkların.' },
  known: { label: 'bilinen kelime', help: 'Okurken bildiğini işaretlediğin kelimeler ve listende öğrendiklerin; metinlerin ne kadarını bildiğin buna göre hesaplanır.' },
} as const

export type WordCount = keyof typeof WORD_COUNTS

/** A count's name that opens its one-line meaning on a tap (a stat's label under its number). */
export function WordCountLabel({ kind, className = 'stat-label' }: { kind: WordCount; className?: string }) {
  const { label, help } = WORD_COUNTS[kind]
  return (
    <Popover button={label} buttonClassName={`${className} word-count-term`} buttonProps={{ title: help }} label={label}>
      {() => <p className="small word-count-help">{help}</p>}
    </Popover>
  )
}
