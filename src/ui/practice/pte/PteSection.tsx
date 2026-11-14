import type { ReactNode } from 'react'
import { PTE_TASK_NAME, PTE_TASKS, type PtePack, type PteTask } from '../../../data/pte'
import { pteTaskSummary, type PteLog } from '../../../engine/pteScore'
import { DictationIcon, HelpIcon, MicIcon, PuzzleIcon, ShadowingIcon } from '../../shared/icons'
import type { PteMode } from './pteMode'

const ICON: Record<PteTask, ReactNode> = {
  wfd: <DictationIcon size={18} />,
  rs: <ShadowingIcon size={18} />,
  ra: <MicIcon size={18} />,
  fib: <PuzzleIcon size={18} />,
  asq: <HelpIcon size={18} />,
}

/** What each task asks, in a line. */
const WHAT: Record<PteTask, string> = {
  wfd: 'Cümleyi dinle, yaz',
  rs: 'Cümleyi dinle, tekrar et',
  ra: 'Metni sesli oku',
  fib: 'Paragraftaki boşlukları seç',
  asq: 'Soruyu dinle, kısaca cevapla',
}

/**
 * The PTE-style part of the exams screen (English): the mode, then a card per task that has content, with how many
 * of its items were done and the last round's accuracy. The counts come from the content, whatever its size.
 */
export function PteSection({ pack, log, mode, onMode, onOpen }: { pack: PtePack; log: PteLog; mode: PteMode; onMode: (m: PteMode) => void; onOpen: (task: PteTask) => void }) {
  const tasks = PTE_TASKS.filter((t) => pack[t].length > 0)
  return (
    <section className="section stack pte-section" aria-labelledby="exams-pte">
      <h2 className="section-title" id="exams-pte">
        PTE tarzı görevler <span className="section-title-count">({tasks.length})</span>
      </h2>
      <div className="segmented" role="group" aria-label="Mod">
        <button type="button" className="segmented-btn" aria-pressed={mode === 'practice'} onClick={() => onMode('practice')}>
          Alıştırma
        </button>
        <button type="button" className="segmented-btn" aria-pressed={mode === 'exam'} onClick={() => onMode('exam')}>
          Sınav
        </button>
      </div>
      <p className="small muted">{mode === 'practice' ? 'Süre yok; kaydı istediğin kadar dinleyebilirsin.' : 'Sınavdaki gibi: kayıt bir kez çalar, hazırlık ve cevap süreleri işler.'}</p>
      <ul className="plain stack examtask-list">
        {tasks.map((task) => {
          const s = pteTaskSummary(task, pack[task], log)
          return (
            <li key={task}>
              <button type="button" className="card examtask-item" onClick={() => onOpen(task)}>
                <span className="examtask-level" aria-hidden>
                  {ICON[task]}
                </span>
                <span className="examtask-title">
                  <strong>{PTE_TASK_NAME[task]}</strong>
                  <span className="small muted">{WHAT[task]}</span>
                  <span className="small muted">
                    {s.done} / {s.total} öğe yapıldı{s.last !== undefined ? ` · son tur %${s.last} doğruluk` : ''}
                  </span>
                </span>
              </button>
            </li>
          )
        })}
      </ul>
      {pack.placeholder && <p className="small muted">Şimdilik az sayıda örnek görev var; yenileri eklenecek.</p>}
      <p className="small muted exams-note">
        PTE tarzı görevler Diloloji için yazılmış özgün içeriktir; Pearson ile bir bağlantısı yoktur. Yüzdeler görev başına doğruluktur, PTE puanı (10–90) hesaplanmaz.
      </p>
    </section>
  )
}
