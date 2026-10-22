import { useCallback, useEffect, useRef, useState } from 'react'
import type { ClientMessage, LiveError, RoomView } from '../../engine/liveDuel'

export type LiveStatus = 'connecting' | 'open' | 'lost'

/** How often the connection says it is still there (a quiet one can be dropped on the way), and how many times it reconnects. */
const PING_MS = 25_000
const RETRIES = 4

/** What a room is for: a live duel, or a reading club (its own rooms, src/engine/readingClub.ts). */
export type RoomKind = 'duel' | 'club'

/** The address of a room's WebSocket on the site the app is served from. */
export const roomUrl = (code: string, loc: Pick<Location, 'protocol' | 'host'> = location, kind: RoomKind = 'duel') =>
  `${loc.protocol === 'https:' ? 'wss' : 'ws'}://${loc.host}/api/room?code=${code}${kind === 'club' ? '&kind=club' : ''}`

/**
 * One connection to a live duel room (see engine/liveDuel.ts and worker/duelRoom.ts): joins by name when it opens,
 * keeps the room's latest view, reconnects a few times if it drops (the same name takes the same seat again), and
 * gives `send` for the player's messages. A room that is full or a refusal ends it.
 */
export function useLiveRoom<View = RoomView, Message = ClientMessage, Error extends string = LiveError>(code: string | null, name: string, kind: RoomKind = 'duel') {
  const [room, setRoom] = useState<View | null>(null)
  const [status, setStatus] = useState<LiveStatus>('connecting')
  const [error, setError] = useState<Error | null>(null)
  const socket = useRef<WebSocket | null>(null)
  const nameRef = useRef(name)
  useEffect(() => {
    nameRef.current = name
  })

  const send = useCallback((message: Message) => {
    if (socket.current?.readyState === 1) socket.current.send(JSON.stringify(message))
  }, [])

  useEffect(() => {
    // A new room (or none): nothing of the last one carries over.
    setRoom(null)
    setStatus('connecting')
    setError(null)
    if (!code) return
    let closed = false
    let tries = 0
    let ping: number | undefined
    let retry: number | undefined
    const connect = () => {
      const ws = new WebSocket(roomUrl(code, location, kind))
      socket.current = ws
      ws.onopen = () => {
        tries = 0
        setStatus('open')
        ws.send(JSON.stringify({ t: 'join', name: nameRef.current }))
        ping = window.setInterval(() => ws.readyState === 1 && ws.send('{"t":"ping"}'), PING_MS)
      }
      ws.onmessage = (event) => {
        let message: { t: 'state'; room: View } | { t: 'error'; reason: Error }
        try {
          message = JSON.parse(String(event.data)) as typeof message
        } catch {
          return
        }
        if (message.t === 'state') {
          setRoom(message.room)
          setError(null)
        } else if (message.t === 'error') {
          setError(message.reason)
          // No seat to be had: nothing to reconnect to.
          if (message.reason === 'full') {
            closed = true
            ws.close()
            setStatus('lost')
          }
        }
      }
      ws.onclose = () => {
        window.clearInterval(ping)
        if (closed) return
        if (tries < RETRIES) {
          tries++
          setStatus('connecting')
          retry = window.setTimeout(connect, 800 * tries)
        } else setStatus('lost')
      }
    }
    connect()
    return () => {
      closed = true
      window.clearInterval(ping)
      window.clearTimeout(retry)
      socket.current?.close()
      socket.current = null
    }
  }, [code, kind])

  return { room, status, error, send }
}
