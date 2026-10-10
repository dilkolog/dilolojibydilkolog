import { MASTERY_STAGES, type MasteryStage } from '../engine/mastery'
import type { ErrorType, VocabularyEntry } from '../engine/types'
import { displayForm } from '../engine/exercises'
import type { calibration, hardWords, recallCalibration } from '../engine/insights'
import { BrainIcon, LeafIcon, TargetIcon } from './icons'
import { ERROR_NAME, STAGE_NAME } from './labels'
import { StageBar } from './ProgressCharts'

export function RecallCalibrationCard({ recallBins }: { recallBins: ReturnType<typeof recallCalibration> }) {
  const total = recallBins.reduce((n, b) => n + b.answers, 0)
  if (total < 30) return null

  const recallGap = total ? Math.round((recallBins.reduce((n, b) => n + (b.actual - b.predicted) * b.answers, 0) / total) * 100) : 0

  return (
    <section className="section stack">
      <p className="eyebrow eyebrow-icon"><BrainIcon size={16} /> Model tahmini ve gerçek</p>
      <h2 className="section-title">
        {Math.abs(recallGap) <= 5
          ? 'Tekrarlar doğru zamanda geliyor'
          : recallGap < 0
            ? `Tahminden ${-recallGap} puan az hatırlıyorsun`
            : `Tahminden ${recallGap} puan fazla hatırlıyorsun`}
      </h2>
      <p className="small muted">
        Her tekrardan önce FSRS kelimeyi hatırlama ihtimalini tahmin eder. Halka tahmin, nokta gerçekte hatırladığın oran. İkisi yakınsa tekrarlar doğru
        zamanda geliyor demektir.
      </p>
      <div className="recall-chart" role="table" aria-label="Tahmin edilen ve gerçek hatırlama oranı">
        {recallBins.map((b) => (
          <div className="recall-row" role="row" key={b.from}>
            <span role="rowheader" className="small">
              %{Math.round(b.from * 100)}–{Math.round(b.to * 100)}
            </span>
            <div className="recall-track" role="cell" aria-label={`Tahmin %${Math.round(b.predicted * 100)}, gerçek %${Math.round(b.actual * 100)}`}>
              <span className="recall-pred" style={{ left: `${b.predicted * 100}%` }} title={`Tahmin %${Math.round(b.predicted * 100)}`} />
              <span className="recall-act" style={{ left: `${b.actual * 100}%` }} title={`Gerçek %${Math.round(b.actual * 100)}`} />
            </div>
            <span role="cell" className="small muted recall-n">
              %{Math.round(b.actual * 100)} · {b.answers}
            </span>
          </div>
        ))}
      </div>
    </section>
  )
}

export function MetacognitionCard({ calib }: { calib: ReturnType<typeof calibration> }) {
  if (calib.sure.answers + calib.unsure.answers < 10) return null
  const pct = (c: { answers: number; correct: number }) => Math.round((c.correct / c.answers) * 100)

  return (
    <section className="section stack">
      <p className="eyebrow eyebrow-icon"><TargetIcon size={16} /> Ne kadar bildiğini ne kadar iyi biliyorsun?</p>
      <h2 className="section-title">
        {calib.sure.answers > 0 ? `Emin olduğun cevapların %${pct(calib.sure)}'i doğru` : `Emin olmadığın cevapların %${pct(calib.unsure)}'i doğru`}
      </h2>
      <div className="calib">
        {calib.sure.answers > 0 && (
          <p>
            <span className="calib-num">%{pct(calib.sure)}</span>
            <span className="small muted">emin olduğun {calib.sure.answers} cevabın doğru</span>
          </p>
        )}
        {calib.unsure.answers > 0 && (
          <p>
            <span className="calib-num">%{pct(calib.unsure)}</span>
            <span className="small muted">emin olmadığın {calib.unsure.answers} cevabın doğru</span>
          </p>
        )}
      </div>
      <p className="small muted">
        Son 30 gün.{' '}
        {calib.sure.answers >= 10 && pct(calib.sure) < 85
          ? 'Emin olduğun cevapların fazlası yanlış çıkıyor: emin değilsen Shift ile işaretle, o kelimeler daha erken tekrar gelsin.'
          : calib.unsure.answers >= 10 && pct(calib.unsure) > 85
            ? 'Emin olmadığın cevapların çoğu doğru: kendine biraz daha güvenebilirsin.'
            : 'Emin olduğunda neredeyse hep doğru biliyorsan, kendini iyi tanıyorsun demektir.'}
      </p>
    </section>
  )
}

export function HardWordsCard({
  hard,
  byId,
  errors,
  onOpen,
}: {
  hard: ReturnType<typeof hardWords>
  byId: Map<string, VocabularyEntry>
  errors: [ErrorType, number][]
  onOpen: (entryId: string) => void
}) {
  return (
    <section className="section stack">
      <h2 className="section-title">Zorlandığın kelimeler</h2>
      {hard.length === 0 ? (
        <p className="muted">Henüz belirgin bir zorluk yok. En az 3 kez cevapladığın kelimeler burada sıralanır.</p>
      ) : (
        <ul className="word-list">
          {hard.map((h) => {
            const e = byId.get(h.entryId)
            if (!e) return null
            return (
              <li key={h.entryId}>
                <button className="word-row" onClick={() => onOpen(h.entryId)}>
                  <span className="word-row-text">
                    <span className="w">{displayForm(e)}</span>
                    <span className="meta">{e.senses[0].gloss}</span>
                  </span>
                  <span className="small muted">
                    {h.wrong}/{h.total} yanlış
                  </span>
                  <span className="hard-rate" style={{ ['--rate' as string]: h.rate }}>
                    %{Math.round(h.rate * 100)}
                  </span>
                </button>
              </li>
            )
          })}
        </ul>
      )}
      {errors.length > 0 && (
        <>
          <h3 className="field">
            <label>Hata türleri</label>
          </h3>
          <div className="bars">
            {errors
              .sort((a, b) => b[1] - a[1])
              .map(([t, n]) => (
                <div className="bar-row" key={t}>
                  <span>{ERROR_NAME[t]}</span>
                  <div className="bar-track bar-track-plain">
                    <div className="bar-fill" style={{ width: `${(n / Math.max(...errors.map((x) => x[1]))) * 100}%`, background: 'var(--bad)' }} />
                  </div>
                  <span className="bar-value">{n}</span>
                </div>
              ))}
          </div>
        </>
      )}
    </section>
  )
}

export function StageDistributionCard({
  stageCounts,
  notStarted,
  maxStage,
  topStage,
}: {
  stageCounts: Record<MasteryStage, number>
  notStarted: number
  maxStage: number
  topStage: MasteryStage
}) {
  return (
    <section className="section stack">
      <p className="eyebrow eyebrow-icon"><LeafIcon size={16} /> Kelimeler nerede?</p>
      <h2 className="section-title">
        {stageCounts[topStage] > 0 ? `En çok kelime “${STAGE_NAME[topStage]}” aşamasında (${stageCounts[topStage]})` : 'Henüz başlanmış kelime yok'}
      </h2>
      <div className="bars">
        {[...MASTERY_STAGES].reverse().map((stage) => {
          const i = MASTERY_STAGES.indexOf(stage)
          // The garden's colours: flower, growing, sprout (as in Kelimeler → Bahçe).
          return <StageBar key={stage} label={STAGE_NAME[stage]} value={stageCounts[stage]} max={maxStage} tone={i === MASTERY_STAGES.length - 1 ? 'flower' : i === 0 ? 'sprout' : 'growing'} />
        })}
        <StageBar label="Başlanmadı" value={notStarted} max={maxStage} tone="seed" muted />
      </div>
    </section>
  )
}
