import type { ReadingText } from '../data/db'
import { coverageZone, type CoverageZone, type ReadingAnalysis } from '../engine/reading'
import { ChevronDownIcon, PlayIcon } from './icons'

const ZONE: Record<CoverageZone, { title: string; text: string }> = {
  easy: { title: 'Rahat okuma', text: 'Neredeyse her kelimeyi biliyorsun: akıcılık için ideal. Yeni kelime için biraz daha zor bir metin seçebilirsin.' },
  ideal: { title: 'Öğrenmek için ideal', text: 'Bilmediğin kelimeleri bağlamdan çıkarabileceğin aralıktasın (%95–98).' },
  hard: { title: 'Zorlayıcı', text: 'Bağlamdan anlam çıkarmak zorlaşıyor. Önce işaretli kelimelere bak, sonra oku.' },
  too_hard: { title: 'Çok zor', text: 'Bu metin şu an çoğunlukla çözümleme olur. Daha kolay bir metin seçmek daha verimli.' },
}

const pct = (x: number) => `%${Math.round(x * 1000) / 10}`.replace('.', ',')

/** One line while reading (score, verdict, bar); the explanations open on request. */
export function CoverageCard({ analysis, current, startCoverage, knownCount, expanded, onToggle }: { analysis: ReadingAnalysis; current: ReadingText | null; startCoverage: number | null; knownCount: number; expanded: boolean; onToggle: () => void }) {
  const zone = coverageZone(analysis.coverage)
  const share = (n: number) => `${(n / Math.max(1, analysis.total)) * 100}%`
  return (
    <section className={`card coverage coverage-compact zone-${zone}`}>
      <button type="button" className="coverage-line" aria-expanded={expanded} onClick={onToggle}>
        <span className="coverage-num">{pct(analysis.coverage)}</span>
        <strong className="coverage-title">{ZONE[zone].title}</strong>
        <span className="coverage-bar" role="img" aria-label={`Bilinen ${pct(analysis.coverage)}, kelimelerinde ${pct(analysis.coverageWithList - analysis.coverage)}, yeni ${pct(1 - analysis.coverageWithList)}`}>
          <span className="cb-known" style={{ width: share(analysis.counts.known) }} />
          <span className="cb-list" style={{ width: share(analysis.counts.learning + analysis.counts.new) }} />
          <span className="cb-unseen" style={{ width: share(analysis.counts.unseen) }} />
        </span>
        <ChevronDownIcon size={16} className="coverage-chevron" />
      </button>
      {expanded && (
        <div className="stack gap-2 coverage-more">
          <p className="small muted">{ZONE[zone].text}</p>
          <p className="small muted coverage-legend">
            <span><i className="cb-known" /> bildiğin {analysis.counts.known}</span>
            <span><i className="cb-list" /> kelimelerinde {analysis.counts.learning + analysis.counts.new}</span>
            <span><i className="cb-unseen" /> yeni {analysis.counts.unseen}</span>
            <span>toplam {analysis.total} kelime</span>
          </p>
          {current && current.history.length > 0 && startCoverage !== null && (
            <p className="small">
              Önceki okumada %{Math.round(current.history[0].coverage * 100)}
              {current.history.length > 1 && `, son okumada %${Math.round(current.history.at(-1)!.coverage * 100)}`}; bu okumaya başlarken %
              {Math.round(startCoverage * 100)}.
            </p>
          )}
          {knownCount < 500 && (
            <p className="small muted">
              Bildiğin kelimeleri henüz az tanıyorum ({knownCount}). Birkaç metni bitirdikçe "yeni" görünen kelimeler azalır ve bu oran gerçeğe yaklaşır.
            </p>
          )}
        </div>
      )}
      {current?.credit && <p className="small muted">{current.credit}</p>}
      {current?.source && (
        <p className="small coverage-source">
          <a className="link" href={current.source} target="_blank" rel="noreferrer">
            {current.source.includes('youtube.com') ? (
              <>
                <PlayIcon size={14} className="inline-icon" />
                Videoyu YouTube’da aç
              </>
            ) : (
              'Kaynağı aç'
            )}
          </a>
        </p>
      )}
    </section>
  )
}
