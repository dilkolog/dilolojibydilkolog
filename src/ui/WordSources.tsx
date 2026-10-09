import { db } from '../data/instance'
import { FIELD_LABEL, originsOf, SOURCE_INFO } from '../data/provenance'
import type { VocabularyEntry } from '../engine/types'
import { FlagIcon } from './icons'

/**
 * Where this word's data came from, field by field, with each source's licence; and the flag for
 * "look at this word again" (a doubtful meaning, a wrong picture) that the word list can filter by.
 */
export function WordSources({ entry, onChanged }: { entry: VocabularyEntry; onChanged: () => void }) {
  const origins = originsOf(entry)
  return (
    <section className="section stack word-sources">
      <div className="row between">
        <h2 className="section-title">Veri kaynakları</h2>
        <button
          type="button"
          className={`chip chip-sm review-toggle${entry.review ? ' is-on' : ''}`}
          aria-pressed={!!entry.review}
          title="Bu kelimenin verisine sonra yine bakmak istiyorsan işaretle; kelime listesinde filtrelenir"
          onClick={async () => {
            await db.vocabulary.put({ ...entry, review: entry.review ? undefined : true })
            onChanged()
          }}
        >
          <FlagIcon size={14} className="inline-icon" />
          İşaretlenenler
        </button>
      </div>
      {origins.length > 0 && (
        <ul className="source-list">
          {origins.map(({ field, origin }) => (
            <li key={field}>
              <span>{FIELD_LABEL[field]}</span>
              {origin.kind === 'user' ? (
                <span className="small muted">senin düzenlemen (otomatik güncellemeler dokunmaz)</span>
              ) : origin.kind === 'unknown' ? null : (
                <span className="small muted">
                  {SOURCE_INFO[origin.kind].name}
                  {SOURCE_INFO[origin.kind].license && ` · ${SOURCE_INFO[origin.kind].license}`}
                </span>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
