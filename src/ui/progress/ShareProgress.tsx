import { useState } from 'react'
import type { UserWordState, VocabularyEntry } from '../../engine/types'
import { ChartIcon, DownloadIcon, ShareIcon, SparkleIcon, StarIcon } from '../shared/icons'
import { MenuItem, Popover } from '../shared/Popover'
import { openPrint } from '../shared/printWindow'
import { progressHtml, progressXlsx, type ProgressReport } from './progressReport'
import { showToast } from '../shared/toastFeed'
import { StoryCardModal } from '../reading/StoryCardModal'
import { shareCard } from '../social/shareCard'

/**
 * "Paylaş" on the progress page: printed/PDF report, Excel workbook, or 9:16 Instagram/WhatsApp Story Card.
 */
export function ShareProgress({
  build,
  words,
  streak: streakProp,
  activeWords: activeWordsProp,
}: {
  build: () => ProgressReport
  words: { entries: readonly VocabularyEntry[]; states: readonly UserWordState[] }
  streak?: number
  activeWords?: number
}) {
  const [storyOpen, setStoryOpen] = useState(false)

  const print = () => {
    if (!openPrint(progressHtml(build()))) showToast('Yeni pencere açılamadı; tarayıcı açılır pencereleri engelliyor olabilir.', undefined, 5000, 'info')
  }
  const excel = () => {
    const report = build()
    const blob = new Blob([progressXlsx(report, words) as BlobPart], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `diloloji-ilerleme-${report.language}-${report.date}.xlsx`
    a.click()
    URL.revokeObjectURL(url)
    showToast('İlerleme raporu Excel olarak indirildi.')
  }

  const report = storyOpen ? build() : null
  const streakCell = report?.summary?.find(([k]) => k === 'Seri')?.[1]
  const streak = streakProp ?? (typeof streakCell === 'number' ? streakCell : 0)
  const activeCell = report?.summary?.find(([k]) => k === 'Aktif kelime')?.[1]
  const activeWords = activeWordsProp ?? (typeof activeCell === 'number' ? activeCell : 0)

  return (
    <>
      <Popover
        kind="menu"
        align="end"
        label="İlerlemeyi paylaş"
        buttonClassName="btn btn-sm btn-quiet share-progress-btn"
        buttonProps={{ 'aria-label': 'Paylaş', title: 'İlerlemeni paylaş: hikâye kartı, PDF ya da Excel' }}
        button={
          <>
            <ShareIcon size={17} />
            <span className="share-progress-label">Paylaş</span>
          </>
        }
      >
        {(close) => (
          <>
            <MenuItem
              icon={<SparkleIcon size={18} />}
              title="Hikaye Kartı (9:16)"
              hint="Instagram veya WhatsApp için öğrenci karnesi"
              onSelect={() => {
                close()
                setStoryOpen(true)
              }}
            />
            <MenuItem
              icon={<StarIcon size={18} />}
              title="Haftalık Başarı Kartı (Yatay)"
              hint="Monki çizimli haftalık karne görseli"
              onSelect={async () => {
                close()
                const rep = build()
                const kicker = `${rep.date} Özeti`
                const title = `${rep.language.toUpperCase()} İlerlemen`
                const streakLine = streak > 0 ? `${streak} gün seri` : ''
                const wordsLine = `${activeWords} aktif kelime`
                const text = [streakLine, wordsLine].filter(Boolean).join(' · ')
                await shareCard({ kicker, title, text, art: 'week' }, `Diloloji ${rep.language.toUpperCase()} haftalık ilerlemem: ${text}`)
              }}
            />
            <MenuItem
              icon={<SparkleIcon size={18} />}
              title="Kare Başarı Kartı (1:1)"
              hint="Monki çizimli kare sosyal medya görseli"
              onSelect={async () => {
                close()
                const rep = build()
                const kicker = `${rep.date} Özeti`
                const title = `${rep.language.toUpperCase()} Başarın`
                const streakLine = streak > 0 ? `${streak} gün seri` : ''
                const wordsLine = `${activeWords} aktif kelime`
                const text = [streakLine, wordsLine].filter(Boolean).join(' · ')
                await shareCard({ kicker, title, text, art: 'square' }, `Diloloji ${rep.language.toUpperCase()} ilerlemem: ${text}`)
              }}
            />
            <MenuItem
              icon={<DownloadIcon size={18} />}
              title="Yazdır ya da PDF"
              hint="Öğretmenine göndermek için tek sayfalık rapor"
              onSelect={() => {
                close()
                print()
              }}
            />
            <MenuItem
              icon={<ChartIcon size={18} />}
              title="Excel (.xlsx)"
              hint="Günler, beceriler, zor kelimeler, sınavlar ve kelime listen"
              onSelect={() => {
                close()
                excel()
              }}
            />
          </>
        )}
      </Popover>

      {storyOpen && report && (
        <StoryCardModal
          report={report}
          streak={streak}
          activeWords={activeWords}
          onClose={() => setStoryOpen(false)}
        />
      )}
    </>
  )
}

