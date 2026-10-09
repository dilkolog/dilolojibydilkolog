import { TENSE_GUIDE } from '../engine/tenseGuide'
import type { TenseGroup } from '../engine/textForms'

const SHOWN = 6

/**
 * The verb forms in the open text, a tense at a time (the most used tense first): the form as
 * written, its verb, how often it occurs. A form opens its verb in the lab at that tense.
 */
export function TextForms({ groups, language, onOpenLab, onClose }: { groups: TenseGroup[]; language: 'fr' | 'es'; onOpenLab?: (verb: string, tense: string) => void; onClose: () => void }) {
  const total = groups.reduce((n, g) => n + g.total, 0)
  return (
    <section className="card stack text-forms" aria-label="Metindeki çekimler">
      <div className="row justify-between">
        <h2 className="section-title">Metindeki çekimler</h2>
        <button type="button" className="link small" onClick={onClose}>
          Kapat
        </button>
      </div>
      {groups.length === 0 ? (
        <p className="small muted">Bu metinde tanıdığım bir fiil çekimi yok.</p>
      ) : (
        <>
          <p className="small muted">
            {total} çekim, {groups.length} zaman. Birine dokununca fiil laboratuvarında o zamanı açarsın.
          </p>
          {groups.map((g) => (
            <details key={g.tense} className="text-forms-group" open={g === groups[0]}>
              <summary>
                <strong>{TENSE_GUIDE[g.tense].tr}</strong> <span className="muted small">{g.total} kez · {g.forms.length} farklı biçim</span>
              </summary>
              <ul className="word-list">
                {g.forms.slice(0, SHOWN * 2).map((f) => (
                  <li key={`${f.lemma}|${f.form}`}>
                    {onOpenLab ? (
                      <button type="button" className="word-row" onClick={() => onOpenLab(f.lemma, g.tense)} aria-label={`${f.form}, ${f.lemma} fiili, ${TENSE_GUIDE[g.tense].tr}: fiil laboratuvarında aç`}>
                        <Row form={f.form} lemma={f.lemma} count={f.count} language={language} />
                      </button>
                    ) : (
                      <div className="word-row">
                        <Row form={f.form} lemma={f.lemma} count={f.count} language={language} />
                      </div>
                    )}
                  </li>
                ))}
              </ul>
              {g.forms.length > SHOWN * 2 && <p className="small muted">+{g.forms.length - SHOWN * 2} biçim daha</p>}
            </details>
          ))}
        </>
      )}
    </section>
  )
}

function Row({ form, lemma, count, language }: { form: string; lemma: string; count: number; language: 'fr' | 'es' }) {
  return (
    <span className="word-row-text">
      <span className="w" lang={language}>
        {form}
      </span>
      <span className="meta">
        <span lang={language}>{lemma}</span>
        {count > 1 && <> · {count} kez</>}
      </span>
    </span>
  )
}
