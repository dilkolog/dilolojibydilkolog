import { useEffect, useMemo, useRef, useState } from 'react'
import type { KelimeDB, ReadingText } from '../data/db'
import { newRoomCode, cleanRoomCode } from '../engine/liveDuel'
import { CLUB_INBOX, cleanClubText, othersLooks, type ClubError, type ClubMessage, type ClubText, type ClubView } from '../engine/readingClub'
import type { TargetLanguage } from '../engine/types'
import { useLiveRoom } from './games/useLiveRoom'

const NO_LOOKS: ReadonlyMap<string, string[]> = new Map()

/**
 * A club link this app was opened on (App leaves the code here). It stays until the club's text is opened or the
 * reader leaves: switching to the text's language opens the reading screen again, and it joins again.
 */
function invitedCode(): string | null {
  try {
    return cleanRoomCode(sessionStorage.getItem(CLUB_INBOX))
  } catch {
    return null
  }
}
function forgetInvite() {
  try {
    sessionStorage.removeItem(CLUB_INBOX)
  } catch {
    // Nothing kept.
  }
}

/** A short, stable id for a club's text: the same text opened again is the same copy in the library. */
export function clubTextId(text: ClubText): string {
  let h = 0x811c9dc5
  for (const ch of `${text.language}\n${text.title}\n${text.body}`) {
    h ^= ch.codePointAt(0)!
    h = Math.imul(h, 0x01000193) >>> 0
  }
  return `club-${h.toString(36)}`
}

/** The name the others see: the profile's, else the one used in duels. */
async function readerName(db: KelimeDB): Promise<string> {
  const fromProfile = (await db.getSettings().catch(() => undefined))?.profile?.name?.trim()
  if (fromProfile) return fromProfile
  try {
    return localStorage.getItem('diloloji:duel-name')?.trim() || 'Okur'
  } catch {
    return 'Okur'
  }
}

/**
 * Reading together (engine/readingClub.ts): the reader opens a club on the open text, or joins one from a link.
 * The host brings the text; a guest gets it put in their library and opened. Each word the reader looks up goes to
 * the others, and theirs come back (`looks`: word → who), to be marked in the text.
 */
export function useReadingClub({
  db,
  language,
  current,
  lookedUp,
  onText,
}: {
  db: KelimeDB
  language: TargetLanguage
  current: ReadingText | null
  /** The key of the word the reader has open now. */
  lookedUp: string | undefined
  /** A guest got the club's text: open it (it is already saved). */
  onText: (item: ReadingText) => void
}) {
  const [code, setCode] = useState<string | null>(null)
  const [host, setHost] = useState(false)
  const [name, setName] = useState('Okur')
  useEffect(() => {
    void readerName(db).then(setName)
    const invited = invitedCode()
    if (invited) {
      setHost(false)
      setCode(invited)
    }
  }, [db])

  const { room, status, error, send } = useLiveRoom<ClubView, ClubMessage, ClubError>(code, name, 'club')
  // The open text as the room keeps it (cleaned the same way), or null when it cannot be brought (too long, too short).
  const clubText = useMemo(() => (current ? cleanClubText({ language: current.language, title: current.title, body: current.text }) : null), [current])

  // The host brings the open text once the room has them in it (again after a reconnect to an emptied room).
  useEffect(() => {
    if (!host || !room || room.you !== 0 || room.text || !clubText || error === 'bad_text') return
    send({ t: 'share', text: clubText })
  }, [host, room, clubText, error, send])

  // A guest gets the club's text: kept in the library (once) and opened.
  const onTextRef = useRef(onText)
  useEffect(() => {
    onTextRef.current = onText
  })
  const opened = useRef<string | null>(null)
  useEffect(() => {
    const text = room?.text
    if (host || !text || text.language !== language) return
    const id = clubTextId(text)
    if (opened.current === id) return
    opened.current = id
    void (async () => {
      const item: ReadingText = { id, language: text.language, title: text.title, text: text.body, addedAt: new Date().toISOString(), history: [], credit: 'Okuma kulübünden' }
      const existing = (await db.getLibrary(text.language).catch(() => [])).find((t) => t.id === id)
      if (!existing) await db.saveText(item)
      forgetInvite()
      onTextRef.current(existing ?? item)
    })()
  }, [host, room?.text, db, language])

  // Is the open text the club's? Words looked up in another text are not the club's business.
  const sameText = !!code && !!room?.text && !!clubText && room.text.body === clubText.body
  const sent = useRef(new Set<string>())
  useEffect(() => {
    if (!sameText || !lookedUp || sent.current.has(lookedUp)) return
    sent.current.add(lookedUp)
    send({ t: 'look', key: lookedUp })
  }, [sameText, lookedUp, send])
  // A new text in the room: every word can be sent again.
  useEffect(() => {
    sent.current = new Set()
  }, [room?.text?.body])

  const looks = useMemo(() => (room && sameText ? othersLooks(room) : NO_LOOKS), [room, sameText])

  return {
    code,
    room,
    status,
    error,
    looks,
    sameText,
    /** The open text can be brought into a club (not too long or short). */
    canStart: !!clubText,
    /** The club's text is in another language than the one studied now. */
    otherLanguage: room?.text && room.text.language !== language ? room.text.language : null,
    /** Opens a club on the open text. */
    start: () => {
      setHost(true)
      opened.current = null
      setCode(newRoomCode())
    },
    leave: () => {
      forgetInvite()
      setCode(null)
      setHost(false)
      opened.current = null
    },
  }
}

export type ReadingClub = ReturnType<typeof useReadingClub>
