import { TENSE_GUIDE } from '../engine/tenseGuide'
import { SearchIcon } from './icons'
import { isPersonless, type Tense } from '../engine/tenses'
import type { TenseGroup } from '../engine/textForms'

const SHOWN = 6

/**
 * The verb forms in the open text, a tense at a time (the most used tense first): the form as
 * written, its verb, how often it occurs. A form opens its verb in the lab at that tense.
 */
export function TextForms({ groups, language, onOpenLab, onReview, onShow, onClose }: { groups: TenseGroup[]; language: 'fr' | 'es'; onOpenLab?: (verb: string, tense: string) => void; /** Scrolls the text to a sentence and lights it. */ onShow?: (sentence: number) => void; /** Puts verb-and-tense pairs in the verb lab's review queue. */ onReview?: (pairs: { lemma: string; tense: Tense }[]) => void; onClose: () => void }) {
  const total = groups.reduce((n, g) => n + g.total, 0)
  // Forms with no person (après avoir mangé) cannot be asked in the lab, so they are not offered for review.
  const pairsOf = (list: readonly TenseGroup[]) => list.filter((g) => !isPersonless(g.tense)).flatMap((g) => [...new Set(g.forms.map((f) => f.lemma))].map((lemma) => ({ lemma, tense: g.tense })))
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
          {onReview && pairsOf(groups).length > 0 && (
            <div className="row">
              <button type="button" className="btn btn-sm" onClick={() => onReview(pairsOf(groups))}>
                Hepsini fiil tekrarına ekle ({pairsOf(groups).length})
              </button>
            </div>
          )}
          {groups.map((g) => (
            <details key={g.tense} className="text-forms-group" open={g === groups[0]}>
              <summary>
                <strong lang={language}>{TENSE_GUIDE[g.tense].name}</strong> <span className="muted small">{TENSE_GUIDE[g.tense].tr} ·</span> <span className="muted small">{g.total} kez · {g.forms.length} farklı biçim</span>
              </summary>
              <ul className="word-list">
                {g.forms.slice(0, SHOWN * 2).map((f) => (
                  <li key={`${f.lemma}|${f.form}`} className="text-forms-item">
                    {onOpenLab && !isPersonless(g.tense) ? (
                      <button type="button" className="word-row" onClick={() => onOpenLab(f.lemma, g.tense)} aria-label={`${f.form}, ${f.lemma} fiili, ${TENSE_GUIDE[g.tense].tr}: fiil laboratuvarında aç`}>
                        <Row form={f.form} lemma={f.lemma} count={f.count} language={language} />
                      </button>
                    ) : (
                      <div className="word-row">
                        <Row form={f.form} lemma={f.lemma} count={f.count} language={language} />
                      </div>
                    )}
                    {onShow && f.sentence !== undefined && (
                      <button type="button" className="icon-btn icon-btn-sm" onClick={() => onShow(f.sentence!)} aria-label={`${f.form}: metinde göster`} title="Metinde göster">
                        <SearchIcon size={16} />
                      </button>
                    )}
                  </li>
                ))}
              </ul>
              {g.forms.length > SHOWN * 2 && <p className="small muted">+{g.forms.length - SHOWN * 2} biçim daha</p>}
              {onReview && !isPersonless(g.tense) && (
                <button type="button" className="link small" onClick={() => onReview(pairsOf([g]))}>
                  Bu zamanın fiillerini tekrara ekle ({pairsOf([g]).length})
                </button>
              )}
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
