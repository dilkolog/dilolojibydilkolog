import { ERROR_TEXT } from '../../engine/formDiagnosis'
import { MASTERY_MAX, errorBreakdown, gardenVerbs, labKey, masteryLevel, plantStage, seenVerbs, tallyCells, verbMastery, weakestCell, type LabData, type MasteryLevel } from '../../engine/labProgress'
import { Plant } from '../Plant'
import { subjectLabel, type Tense } from '../../engine/tenses'
import { tenseName, type LabLanguage } from './labShared'

const LEVEL_TEXT: Record<MasteryLevel, string> = { new: 'Yeni', learning: 'Öğreniliyor', good: 'İyi', master: 'Usta' }

/** Mastery: how well each tense of the verb is known, from the lab's own practice. */
export function MasteryTab({ language, verb, available, lab, onPractice, onOpenVerb, onWeak }: { language: LabLanguage; verb: string; available: readonly Tense[]; lab: LabData; onPractice: (t: Tense) => void; onOpenVerb: (verb: string) => void; onWeak: (tense: Tense) => void }) {
  const score = verbMastery(lab, verb, available)
  const garden = gardenVerbs(lab, new Date())
  const cells = tallyCells(lab)
  const tenses = [...new Set(cells.map((c) => c.tense))]
  const worst = weakestCell(lab)
  const kinds = errorBreakdown(lab)
  const seen = lab.seen?.[verb] ?? []
  const metVerbs = seenVerbs(lab).filter((v) => v.verb !== verb)
  return (
    <div className="stack lab-mastery">
      <header className="lab-mastery-head">
        <h2 lang={language}>{verb[0].toLocaleUpperCase(language) + verb.slice(1)}</h2>
        <p className="muted">Ustalık skoru: %{score}</p>
      </header>
      <ul className="lab-mastery-list">
        {available.map((t) => {
          const rec = lab.records[labKey(verb, t)]
          const level = masteryLevel(rec)
          const points = rec?.points ?? 0
          return (
            <li key={t}>
              <button type="button" className="lab-mastery-row" onClick={() => onPractice(t)} aria-label={`${tenseName(t)}: ${LEVEL_TEXT[level]}, alıştır`}>
                <span className="lab-mastery-name" lang={language}>
                  {tenseName(t)}
                </span>
                <span className={`lab-level is-${level}`}>
                  {LEVEL_TEXT[level]} ({points}/{MASTERY_MAX})
                </span>
                <span className="lab-bar lab-mastery-bar" aria-hidden>
                  <span style={{ width: `${(points / MASTERY_MAX) * 100}%` }} />
                </span>
              </button>
            </li>
          )
        })}
      </ul>
      {cells.length > 0 && (
        <section className="stack gap-2 lab-weak" aria-label="Zayıf noktaların">
          <h3 className="lab-mood-title">Zayıf noktaların</h3>
          {worst && (
            <p className="lab-weak-worst">
              En çok zorlandığın: <strong lang={language}>{tenseName(worst.tense)}</strong> · {subjectLabel(language, worst.tense, worst.person).split(' / ')[0]} ({worst.wrong}/{worst.ok + worst.wrong} yanlış).{' '}
              <button type="button" className="link" onClick={() => onWeak(worst.tense)}>
                Bu zamanı çalış
              </button>
            </p>
          )}
          <div className="lab-heat-wrap">
            <table className="lab-heat">
              <thead>
                <tr>
                  <th scope="col">
                    <span className="sr-only">Zaman</span>
                  </th>
                  {[0, 1, 2, 3, 4, 5].map((p) => (
                    <th key={p} scope="col">
                      {subjectLabel(language, tenses[0], p).split(' / ')[0].replace(/^que |^qu'/, '')}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {tenses.map((t) => (
                  <tr key={t}>
                    <th scope="row" lang={language}>
                      {tenseName(t)}
                    </th>
                    {[0, 1, 2, 3, 4, 5].map((p) => {
                      const c = cells.find((x) => x.tense === t && x.person === p)
                      const level = !c ? 'none' : c.wrong === 0 ? 'good' : c.rate < 0.3 ? 'some' : c.rate < 0.6 ? 'many' : 'bad'
                      return (
                        <td key={p} className={`is-${level}`} title={c ? `${c.wrong} yanlış, ${c.ok} doğru` : 'Henüz sorulmadı'}>
                          {c ? `${c.ok}/${c.ok + c.wrong}` : '·'}
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {kinds.length > 0 && (
            <ul className="lab-kinds" aria-label="Hata türleri">
              {kinds.map((k) => (
                <li key={k.kind} title={ERROR_TEXT[k.kind].hint}>
                  <span>{ERROR_TEXT[k.kind].name}</span>
                  <span className="lab-bar" aria-hidden>
                    <span style={{ width: `${k.share * 100}%` }} />
                  </span>
                  <span className="small muted">%{Math.round(k.share * 100)}</span>
                </li>
              ))}
            </ul>
          )}
          <p className="small muted">Hücrelerde doğru/toplam cevap görünür; kırmızıya yakın hücreler çalışılacak yerler.</p>
        </section>
      )}
      {seen.length > 0 && (
        <section className="stack gap-2" aria-label="Metinlerde gördüklerin">
          <h3 className="lab-mood-title">Metinlerde gördüklerin</h3>
          <ul className="word-list">
            {seen.slice(0, 8).map((f) => (
              <li key={`${f.form}|${f.tense}`}>
                <button type="button" className="word-row" onClick={() => onPractice(f.tense)} aria-label={`${f.form}: ${tenseName(f.tense)}, alıştır`}>
                  <span className="word-row-text">
                    <span className="w" lang={language}>
                      {f.form}
                    </span>
                    <span className="meta">
                      {tenseName(f.tense)} · {f.count} kez{f.title && <> · {f.title}</>}
                    </span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
          <p className="small muted">Okumayı bitirdiğin metinlerdeki çekimler; birine dokununca o zamanı alıştırırsın.</p>
        </section>
      )}
      {metVerbs.length > 0 && (
        <section className="stack gap-2" aria-label="Metinlerde en çok gördüğün fiiller">
          <h3 className="lab-mood-title">Metinlerde en çok gördüğün fiiller</h3>
          <div className="choice-row" role="group" aria-label="Metinlerde en çok gördüğün fiiller">
            {metVerbs.map((v) => (
              <button key={v.verb} type="button" className="chip chip-sm" lang={language} onClick={() => onOpenVerb(v.verb)}>
                {v.verb} <span className="muted">×{v.count}</span>
              </button>
            ))}
          </div>
        </section>
      )}
      {garden.length > 0 && (
        <section className="stack gap-2 lab-garden" aria-label="Fiil bahçem">
          <h3 className="lab-mood-title">Fiil bahçem</h3>
          <ul className="lab-garden-grid">
            {garden.map((g) => (
              <li key={g.verb}>
                <button type="button" className={`lab-garden-plot${g.verb === verb ? ' is-current' : ''}`} onClick={() => onOpenVerb(g.verb)} aria-label={`${g.verb}: %${g.percent}${g.due ? `, ${g.due} çekim tekrar bekliyor` : ''}`}>
                  <Plant stage={plantStage((g.points / g.forms))} health={g.due ? (g.due >= g.forms ? 'wilting' : 'thirsty') : 'fresh'} size={44} />
                  <strong lang={language}>{g.verb}</strong>
                  <span className="small muted">%{g.percent}</span>
                </button>
              </li>
            ))}
          </ul>
          <p className="small muted">Her bitki bir fiil; çekimleri oturdukça büyür, tekrarı gelince susar.</p>
        </section>
      )}
      <p className="small muted">Her doğru cevap 10 puan ekler, her yanlış 10 puan alır; {MASTERY_MAX} puan bir zamanda ustalık demek. Alıştırdıkça tekrarlar “Bugünün tekrarları”na düşer.</p>
    </div>
  )
}
