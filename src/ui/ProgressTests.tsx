import type { TargetLanguage } from '../engine/types'
import type { VocabTestRecord } from '../data/db'
import { EXAM_INTERVAL_DAYS, type ExamResult } from '../engine/exam'
import { LANGUAGE_NAME } from './labels'

export function VocabTestCard({
  language,
  tests,
  onVocabTest,
}: {
  language: TargetLanguage
  tests: VocabTestRecord[]
  onVocabTest: () => void
}) {
  return (
    <section className="section stack">
      <h2 className="section-title">Kelime dağarcığı</h2>
      {tests.length > 0 ? (
        <p>
          Son testte {LANGUAGE_NAME[language]} için yaklaşık <strong>{tests.at(-1)!.estimate.toLocaleString('tr-TR')}</strong> kelime (
          {new Date(tests.at(-1)!.at).toLocaleDateString('tr-TR')}).
          {tests.length > 1 && (
            <span className="muted"> Önceki testler: {tests.slice(-4, -1).map((t) => t.estimate.toLocaleString('tr-TR')).join(' → ')}.</span>
          )}
        </p>
      ) : (
        <p className="small muted">Birkaç dakikalık bir testle {LANGUAGE_NAME[language]} kelime dağarcığının büyüklüğünü tahmin et; ilerlemeni zamanla buradan izle.</p>
      )}
      <div className="row">
        <button className="btn btn-quiet" onClick={onVocabTest}>
          {tests.length ? 'Testi tekrarla' : 'Testi yap'}
        </button>
      </div>
    </section>
  )
}

export function ExamCard({
  exams,
  onExam,
}: {
  exams: ExamResult[]
  onExam: () => void
}) {
  const days = exams.length ? Math.floor((Date.now() - new Date(exams.at(-1)!.at).getTime()) / 86_400_000) : Infinity

  return (
    <section className="section stack">
      <h2 className="section-title">Hatırlama sınavı</h2>
      {exams.length > 0 ? (
        <p>
          Son sınavda <strong>%{Math.round(exams.at(-1)!.actual * 100)}</strong> hatırladın (model %{Math.round(exams.at(-1)!.predicted * 100)} tahmin
          etmişti). {exams.length > 1 && <span className="muted">Önceki: {exams.slice(-4, -1).map((e) => `%${Math.round(e.actual * 100)}`).join(' → ')}</span>}
        </p>
      ) : (
        <p className="small muted">Ayda bir, öğrendiğin kelimelerden habersiz 20 soru: ne kadarının gerçekten kaldığını ölçer.</p>
      )}
      <div className="row">
        <button className={`btn${days >= EXAM_INTERVAL_DAYS ? '' : ' btn-quiet'}`} onClick={onExam}>
          {exams.length ? 'Sınavı tekrarla' : 'Sınava gir'}
        </button>
        {days >= EXAM_INTERVAL_DAYS && exams.length > 0 && <span className="small">Aylık sınav zamanı geldi.</span>}
      </div>
    </section>
  )
}
