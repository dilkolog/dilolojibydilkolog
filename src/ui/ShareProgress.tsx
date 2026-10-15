import type { UserWordState, VocabularyEntry } from '../engine/types'
import { ChartIcon, DownloadIcon, LinkIcon } from './icons'
import { MenuItem, Popover } from './Popover'
import { openPrint } from './printWindow'
import { progressHtml, progressXlsx, type ProgressReport } from './progressReport'
import { showToast } from './toastFeed'

/**
 * "Paylaş" on the progress page: the report printed (the print dialog also saves a PDF, to send a
 * teacher) or as an Excel workbook. The report is built when chosen, from what the page shows.
 */
export function ShareProgress({ build, words }: { build: () => ProgressReport; words: { entries: readonly VocabularyEntry[]; states: readonly UserWordState[] } }) {
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
  return (
    <Popover kind="menu" align="end" label="İlerlemeyi paylaş" buttonClassName="btn btn-quiet" button={<><LinkIcon size={16} className="inline-icon" /> Paylaş</>}>
      {(close) => (
        <>
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
  )
}
