import { lazy, Suspense, useState } from 'react'
import { clubLink, type ClubView } from '../engine/readingClub'
import { FlagIcon } from './icons'
import { LANGUAGE_NAME } from './labels'
import { share } from './games/shareLink'
import type { ReadingClub } from './useReadingClub'

const showCode = (code: string) => `${code.slice(0, 3)}-${code.slice(3)}`
const ReportDialog = lazy(() => import('./ReportDialog'))

/** What the reporter's screen shows of the room: a room lives only in the server's memory, so this is the record. */
const roomShown = (code: string, room: ClubView | null) =>
  [`Oda: ${showCode(code)}`, room ? `Okurlar: ${room.readers.map((r, i) => (i === room.you ? `${r.name} (şikâyet eden)` : r.name)).join(', ')}` : '', room?.text ? `Metin: “${room.text.title}”\n\n${room.text.body.slice(0, 1200)}` : '']
    .filter(Boolean)
    .join('\n')

/**
 * The reading club above the text: its code and link to share, who is reading, and how many words the others
 * looked up (marked in the text with a dotted line). A guest waiting for the text sees only that it is coming.
 */
export function ClubBar({
  club,
  words = [],
  onWord,
}: {
  club: ReadingClub
  /** The words friends looked up in this text, in reading order: tapping one opens it in the text. */
  words?: readonly { key: string; text: string; who: string[] }[]
  onWord?: (key: string) => void
}) {
  const { code, room, status, error, looks, sameText, otherLanguage } = club
  const [reporting, setReporting] = useState(false)
  // A reported room is left, but once the learner has read that the report went.
  const [reported, setReported] = useState(false)
  if (!code) return null
  const link = clubLink(code, location.origin)
  if (status === 'lost')
    return (
      <section className="card stack club-bar" role="alert">
        <strong>{error === 'full' ? 'Bu okuma kulübü dolu.' : 'Okuma kulübüne bağlanılamadı.'}</strong>
        <p className="small muted">{error === 'full' ? 'Kulüpte dört kişi var; arkadaşından yeni bir kulüp açmasını iste.' : 'İnternet bağlantını kontrol edip tekrar dene.'}</p>
        <div className="row">
          <button type="button" className="btn btn-sm" onClick={club.leave}>
            Tamam
          </button>
        </div>
      </section>
    )
  const others = room ? room.readers.filter((_, i) => i !== room.you) : []
  return (
    <section className="card stack club-bar" aria-label="Okuma kulübü">
      <div className="row club-bar-head">
        <strong>Okuma kulübü</strong>
        <span className="small muted" lang="en">
          {showCode(code)}
        </span>
        <span className="grow" />
        <button type="button" className="btn btn-sm" onClick={() => void share(`Benimle birlikte oku! Okuma kulübü: ${showCode(code)}`, link, 'Diloloji okuma kulübü')}>
          Arkadaşını çağır
        </button>
        <button type="button" className="btn btn-sm btn-quiet" onClick={club.leave}>
          Ayrıl
        </button>
        {room && room.readers.length > 1 && (
          <button type="button" className="icon-btn icon-btn-sm" aria-label="Okuma kulübünü şikâyet et" title="Şikâyet et" onClick={() => setReporting(true)}>
            <FlagIcon size={14} />
          </button>
        )}
      </div>
      {reporting && (
        <Suspense fallback={null}>
          <ReportDialog title="Bu okuma kulübünü şikâyet et" report={{ kind: 'club', target: code, shown: roomShown(code, room) }} onClose={() => (reported ? club.leave() : setReporting(false))} onDone={() => setReported(true)} />
        </Suspense>
      )}
      {!room ? (
        <p className="small muted" role="status">
          Kulübe bağlanılıyor…
        </p>
      ) : error === 'bad_text' ? (
        <p className="small notice" role="alert">
          Bu metin kulübe alınamadı: çok uzun ya da çok kısa (en çok 30.000 karakter). Daha kısa bir bölümle yeniden dene.
        </p>
      ) : otherLanguage ? (
        <p className="small notice" role="status">
          Kulübün metni {LANGUAGE_NAME[otherLanguage]}. Üstten dili {LANGUAGE_NAME[otherLanguage]} yap: metin kendiliğinden açılır.
        </p>
      ) : !room.text ? (
        <p className="small muted" role="status">
          Metin bekleniyor…
        </p>
      ) : (
        <>
          <ul className="plain club-readers" aria-label="Kulüptekiler">
            {room.readers.map((r, i) => (
              <li key={i} className={r.connected ? undefined : 'muted'}>
                <span aria-hidden>{r.connected ? '●' : '○'}</span> {i === room.you ? `${r.name} (sen)` : r.name}
                <span className="small muted"> · {r.looks.length} kelimeye baktı</span>
              </li>
            ))}
          </ul>
          {others.length === 0 ? (
            <p className="small muted">Bağlantıyı bir arkadaşına gönder: aynı metni açar, birbirinizin baktığı kelimeleri görürsünüz.</p>
          ) : sameText ? (
            <>
              <p className="small muted">{looks.size ? `Arkadaşlarının baktığı ${looks.size} kelime metinde noktalı çizgiyle işaretli.` : 'Arkadaşların bir kelimeye bakınca metinde noktalı çizgiyle işaretlenir.'}</p>
              {words.length > 0 && onWord && (
                <div className="chip-list club-words" aria-label="Arkadaşlarının baktığı kelimeler">
                  {words.slice(0, 24).map((w) => (
                    <button key={w.key} type="button" className="chip chip-sm" onClick={() => onWord(w.key)} title={`${w.who.join(', ')} baktı`}>
                      <span lang={club.room?.text?.language}>{w.text}</span>
                    </button>
                  ))}
                </div>
              )}
            </>
          ) : (
            <p className="small muted">Kulübün metni bu değil: “{room.text.title}”. Kütüphaneden açabilirsin.</p>
          )}
        </>
      )}
    </section>
  )
}
