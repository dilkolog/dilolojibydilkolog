import '../../lazy.css'
import type { Profile } from '../../data/db'
import type { TargetLanguage, VocabularyEntry } from '../../engine/types'
import { CommunitySets } from './CommunitySets'
import { FriendsCard } from './FriendsCard'
import type { FriendPrefs } from './FriendPrivacy'
import type { GameState } from '../game'
import { PageHeader } from '../shared/PageHeader'

/**
 * Everything social in one place: the friends and their board (with the league, requests, gifts, privacy), ways to work
 * together (a live duel, reading the same text), and the lists others shared. Today keeps a small copy of the board; this is
 * where a person finds the rest.
 */
export function CommunityScreen({
  game,
  profile,
  vocabulary,
  language,
  share,
  muted,
  onPrefs,
  onChanged,
  onDuel,
  onReading,
}: {
  game: GameState | null
  profile: Profile
  vocabulary: VocabularyEntry[]
  language: TargetLanguage
  share?: 'xp' | 'days'
  muted?: string[]
  onPrefs: (patch: Partial<FriendPrefs>) => void
  onChanged: () => void
  onDuel: () => void
  onReading: () => void
}) {
  return (
    <div className="community-page stack gap-3">
      <PageHeader art="games" title="Topluluk" sub="Arkadaşlarınla birlikte çalış, yarış ve paylaş." />
      <section className="card stack gap-2 community-together" aria-label="Birlikte çalışın">
        <h2 className="section-title">Birlikte çalışın</h2>
        <div className="community-tiles">
          <button type="button" className="community-tile" onClick={onDuel}>
            <strong>Düello</strong>
            <span className="small muted">Aynı sorulara aynı anda ya da sırayla cevap verin; canlı oda ya da bağlantıyla.</span>
          </button>
          <button type="button" className="community-tile" onClick={onReading}>
            <strong>Birlikte oku</strong>
            <span className="small muted">Aynı metni açın, birbirinizin baktığı kelimeleri görün (Okuma → Birlikte oku).</span>
          </button>
        </div>
      </section>
      <FriendsCard game={game} profile={profile} vocabulary={vocabulary} language={language} share={share} muted={muted} onPrefs={onPrefs} onChanged={onChanged} onDuel={onDuel} />
      <CommunitySets language={language} onAdded={onChanged} />
    </div>
  )
}
