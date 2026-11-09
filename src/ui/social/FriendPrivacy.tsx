import { ChevronDownIcon } from '../shared/icons'
import { FindableSetting } from '../settings/FindableSetting'

export interface FriendPrefs {
  share: 'xp' | 'days'
  muted: string[]
}

/**
 * What friends see and hear: whether they see the XP by day or only the days studied (the streak and level always show),
 * whether a stranger can find the @name, and the friends whose nudges and cheers are silenced.
 */
export function FriendPrivacy({ prefs, names, onChange }: { prefs: FriendPrefs; names: Record<string, string>; onChange: (patch: Partial<FriendPrefs>) => void }) {
  return (
    <details className="friends-add friends-privacy">
      <summary className="friends-accordion-summary small">
        <span className="friends-accordion-title">
          <span>Gizlilik</span>
        </span>
        <ChevronDownIcon size={16} className="friends-accordion-arrow" />
      </summary>
      <div className="stack gap-2 friends-add-body">
        <fieldset className="friends-share">
          <legend className="small">Arkadaşların neyi görsün?</legend>
          <label className="friends-share-option">
            <input type="radio" name="friend-share" checked={prefs.share === 'xp'} onChange={() => onChange({ share: 'xp' })} />
            <span>
              Günlük XP'ni
              <span className="small muted"> · sıralamada XP ile yer alırsın</span>
            </span>
          </label>
          <label className="friends-share-option">
            <input type="radio" name="friend-share" checked={prefs.share === 'days'} onChange={() => onChange({ share: 'days' })} />
            <span>
              Yalnızca hangi günler çalıştığını
              <span className="small muted"> · XP'n gizli kalır, "Tutarlılık" sıralamasında yer alırsın</span>
            </span>
          </label>
          <p className="small muted">Serin ve seviyen her iki durumda da görünür.</p>
        </fieldset>
        <FindableSetting />
        {prefs.muted.length > 0 && (
          <div className="stack gap-2 friends-muted">
            <p className="small">Sessize aldıkların (dürtme ve tebrikleri görünmez; onlara haber gitmez):</p>
            <ul className="friends-muted-list">
              {prefs.muted.map((code) => (
                <li key={code}>
                  <span>{names[code] ?? 'Arkadaş'}</span>
                  <button type="button" className="link small" onClick={() => onChange({ muted: prefs.muted.filter((c) => c !== code) })}>
                    Sessizden çıkar
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </details>
  )
}
