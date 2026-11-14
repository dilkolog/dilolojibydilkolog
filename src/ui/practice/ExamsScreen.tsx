import '../../lazy.css'
import { useEffect, useMemo, useState } from 'react'
import { examPassages } from '../../data/examReading'
import { loadExamTasks } from '../../data/examTasks'
import { db } from '../../data/instance'
import type { JournalEntry } from '../../data/db'
import { examContent, examFamilies, passageResult, pickExam, taskResult } from '../../engine/examCatalog'
import { wordCount, type ExamMode, type ExamPassage } from '../../engine/examReading'
import type { ExamTask } from '../../engine/examTasks'
import type { GrammarLog } from '../../engine/grammar'
import type { TargetLanguage } from '../../engine/types'
import { readExamChoice, readExamMode, saveExamChoice, saveExamMode } from '../games/examMode'
import { ExamTasks } from '../games/ExamTasks'
import { EmptyState } from '../shared/EmptyState'
import { HeadphonesIcon, PenIcon, ReadIcon } from '../shared/icons'
import { LANGUAGE_NAME } from '../shared/labels'
import { PageHeader } from '../shared/PageHeader'
import { canSpeak } from '../shared/speech'
import { PTE_TASKS, type PtePack, type PteTask } from '../../data/pte'
import { loadPte } from '../../data/ptePack'
import { emptyPteLog, type PteLog } from '../../engine/pteScore'
import { PteDrill } from './pte/PteDrill'
import { PteSection } from './pte/PteSection'
import { readPteMode, savePteMode, type PteMode } from './pte/pteMode'

/** The PTE-style part's place in the exam choice (it has no levels). */
const PTE = 'PTE'

const day = (iso?: string) => (iso ? new Date(iso).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long' }) : '')

/**
 * The language's exam-style practice in one place: choose an exam (as the content names it, "DELF tarzı") and a
 * level that has content, then its reading and listening sets and its writing tasks. A set opens the exam-style
 * tasks game on it; a task opens the journal of "Yaz & konuş" with it chosen. The games' card and the journal's
 * picker stay as they were.
 */
export function ExamsScreen({
  language,
  passage,
  passages = examPassages,
  tasks: givenTasks,
  pteTask,
  ptePack: givenPack,
  onOpenPte = () => {},
  onOpenSet,
  onCloseSet,
  onOpenTask,
}: {
  language: TargetLanguage
  /** A reading set opened from this screen (the route's), shown in the exam-style tasks game. */
  passage?: string
  /** The content, for tests; the app's own by default. */
  passages?: readonly ExamPassage[]
  tasks?: readonly ExamTask[]
  /** A PTE-style task opened from this screen (the route's). */
  pteTask?: string
  /** The PTE-style content, for tests; the app's own (English only) by default. */
  ptePack?: PtePack | null
  onOpenPte?: (task: PteTask) => void
  onOpenSet: (id: string) => void
  onCloseSet: () => void
  onOpenTask: (id: string) => void
}) {
  const [loaded, setLoaded] = useState<readonly ExamTask[] | null>(givenTasks ?? null)
  const tasks = givenTasks ?? loaded
  const [log, setLog] = useState<GrammarLog>({})
  const [journal, setJournal] = useState<JournalEntry[]>([])
  const [mode, setModeState] = useState<ExamMode>(readExamMode)
  const [choice, setChoiceState] = useState(() => readExamChoice(language))
  // undefined while loading, null for a language without PTE-style content.
  const [loadedPack, setLoadedPack] = useState<PtePack | null | undefined>(givenPack)
  const pack = givenPack !== undefined ? givenPack : loadedPack
  const [pteLog, setPteLog] = useState<PteLog>(emptyPteLog)
  const [pteMode, setPteModeState] = useState<PteMode>(readPteMode)

  useEffect(() => {
    if (givenTasks) return
    let live = true
    void loadExamTasks(language).then((t) => live && setLoaded(t))
    return () => {
      live = false
    }
  }, [language, givenTasks])
  useEffect(() => {
    if (givenPack !== undefined) return
    let live = true
    void loadPte(language).then((p) => live && setLoadedPack(p))
    return () => {
      live = false
    }
  }, [language, givenPack])
  useEffect(() => {
    let live = true
    void db.getExamLog().then((l) => live && setLog(l))
    void db.getJournal(language).then((j) => live && setJournal(j))
    void db.getPteLog().then((l) => live && setPteLog(l))
    return () => {
      live = false
    }
  }, [language, passage, pteTask])

  const families = useMemo(() => (tasks ? examFamilies(language, passages, tasks) : []), [language, passages, tasks])
  const current = pickExam(families, choice)
  const content = current && tasks ? examContent(language, current.exam, current.level, passages, tasks) : null
  const hasPte = !!pack && PTE_TASKS.some((t) => pack[t].length > 0)
  // PTE-style when it is chosen, or when the language has nothing else.
  const pteOn = hasPte && (choice.exam === PTE || !families.length)

  if (passage) return <ExamTasks key={passage} language={language} start={passage} exitLabel="← Sınavlar" onExit={onCloseSet} />
  if (pteTask && pack && (PTE_TASKS as readonly string[]).includes(pteTask) && pack[pteTask as PteTask].length) {
    return <PteDrill key={pteTask} task={pteTask as PteTask} pack={pack} log={pteLog} mode={pteMode} onExit={onCloseSet} />
  }

  const choose = (next: { exam: string; level?: string }) => {
    if (next.exam === PTE) {
      const pte = { exam: PTE, level: current?.level ?? '' }
      setChoiceState(pte)
      saveExamChoice(language, pte)
      return
    }
    const picked = pickExam(families, next)
    if (!picked) return
    setChoiceState(picked)
    saveExamChoice(language, picked)
  }
  const setMode = (m: ExamMode) => {
    setModeState(m)
    saveExamMode(m)
  }
  const setPteMode = (m: PteMode) => {
    setPteModeState(m)
    savePteMode(m)
  }
  const names = families.map((f) => f.exam)

  return (
    <div className="stack exams">
      <PageHeader art="exam" title="Sınavlar" sub={`${LANGUAGE_NAME[language]} sınavlarının tarzında okuma, dinleme ve yazma görevleri: önce sınavı, sonra seviyeni seç.`} />
      {tasks && !families.length && pack !== undefined && !hasPte && (
        <EmptyState art="nothing-found" title="Bu dilde sınav görevi yok">
          Sınav tarzı görevler henüz bu dil için yazılmadı.
        </EmptyState>
      )}
      {families.length + (hasPte ? 1 : 0) > 1 && (
        <div className="choice-row" role="group" aria-label="Sınav">
          {families.map((f) => (
            <button key={f.exam} type="button" className="chip" aria-pressed={!pteOn && f.exam === current?.exam} onClick={() => choose({ exam: f.exam, level: current?.level })}>
              {f.exam} tarzı
            </button>
          ))}
          {hasPte && (
            <button type="button" className="chip" aria-pressed={pteOn} onClick={() => choose({ exam: PTE })}>
              PTE tarzı
            </button>
          )}
        </div>
      )}
      {pteOn && pack && <PteSection pack={pack} log={pteLog} mode={pteMode} onMode={setPteMode} onOpen={onOpenPte} />}
      {!pteOn && current && content && (
        <>
          <div className="segmented" role="group" aria-label="Seviye">
            {families
              .find((f) => f.exam === current.exam)!
              .levels.map((l) => (
                <button key={l} type="button" className="segmented-btn" aria-pressed={l === current.level} onClick={() => choose({ exam: current.exam, level: l })}>
                  {l}
                </button>
              ))}
          </div>

          <section className="section stack" aria-labelledby="exams-reading">
            <h2 className="section-title" id="exams-reading">
              Okuma ve dinleme <span className="section-title-count">({content.passages.length})</span>
            </h2>
            {content.passages.length > 0 ? (
              <>
                <div className="choice-row" role="group" aria-label="Görev türü">
                  <button type="button" className="chip" aria-pressed={mode === 'read'} onClick={() => setMode('read')}>
                    Okuma
                  </button>
                  <button type="button" className="chip" aria-pressed={mode === 'listen'} onClick={() => setMode('listen')} disabled={!canSpeak()}>
                    Dinleme
                  </button>
                </div>
                <ul className="plain stack examtask-list">
                  {content.passages.map((p) => {
                    const r = passageResult(p, log)
                    return (
                      <li key={p.id}>
                        <button type="button" className="card examtask-item" onClick={() => onOpenSet(p.id)}>
                          <span className="examtask-level" aria-hidden>
                            {mode === 'listen' ? <HeadphonesIcon size={18} /> : <ReadIcon size={18} />}
                          </span>
                          <span className="examtask-title">
                            <strong lang={language}>{p.title}</strong>
                            <span className="small muted">
                              {mode === 'listen' ? 'Dinleme' : 'Okuma'} · {wordCount(p.text)} kelime · {p.questions.length} soru
                            </span>
                            <span className="small muted">{r ? `Son sonuç %${Math.round(r.share * 100)}${r.at ? ` · ${day(r.at)}` : ''}` : 'Henüz yapılmadı'}</span>
                          </span>
                        </button>
                      </li>
                    )
                  })}
                </ul>
              </>
            ) : (
              <p className="small muted">Bu seviyede okuma ve dinleme seti yok.</p>
            )}
          </section>

          <section className="section stack" aria-labelledby="exams-writing">
            <h2 className="section-title" id="exams-writing">
              Yazma <span className="section-title-count">({content.tasks.length})</span>
            </h2>
            {content.tasks.length > 0 ? (
              <ul className="plain stack examtask-list">
                {content.tasks.map((t) => {
                  const r = taskResult(t.id, journal)
                  return (
                    <li key={t.id}>
                      <button type="button" className="card examtask-item" onClick={() => onOpenTask(t.id)}>
                        <span className="examtask-level" aria-hidden>
                          <PenIcon size={18} />
                        </span>
                        <span className="examtask-title">
                          <strong lang={language}>{t.title}</strong>
                          <span className="small muted">
                            {t.kind} · {t.min}–{t.max} kelime
                          </span>
                          <span className="small muted">{r ? `Son yazış ${day(r.at)}${r.corrections !== undefined ? ` · ${r.corrections} düzeltme` : ''}` : 'Henüz yazılmadı'}</span>
                        </span>
                      </button>
                    </li>
                  )
                })}
              </ul>
            ) : (
              <p className="small muted">Bu seviyede yazma görevi yok.</p>
            )}
          </section>
        </>
      )}
      {!pteOn && names.length > 0 && (
        <p className="small muted exams-note">
          Bu görevler Diloloji için yazılmış özgün içeriktir. {names.join(', ')} adları yalnızca görevlerin tarzını anlatır; resmî sınav kurumlarıyla bir bağlantı yoktur.
        </p>
      )}
    </div>
  )
}
