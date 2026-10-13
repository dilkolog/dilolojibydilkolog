import { useCallback, useEffect, useRef, useState } from 'react'
import '../../lazy.css'
import { AiError, monkiTurn } from '../../ai'
import type { TargetLanguage } from '../../engine/types'
import { useAi } from '../aiContext'
import { CloseIcon, SendIcon } from '../icons'
import { LANGUAGE_NAME } from '../labels'
import { RichText } from '../RichText'
import { MonkiFace, MonkiPose } from './MonkiMascot'

interface Msg {
  role: 'user' | 'assistant'
  text: string
}

const MAX_KEPT = 30
const MAX_SENT = 12

/** The last few turns, starting with the learner's own (a conversation must not open with the assistant). */
const recent = (msgs: Msg[]): Msg[] => {
  const tail = msgs.slice(-MAX_SENT)
  const first = tail.findIndex((m) => m.role === 'user')
  return first < 0 ? [] : tail.slice(first)
}
const storeKey = (language: TargetLanguage) => `diloloji:monki:${language}`

function loadChat(language: TargetLanguage): Msg[] {
  try {
    const raw = JSON.parse(localStorage.getItem(storeKey(language)) ?? '[]')
    if (!Array.isArray(raw)) return []
    return raw.filter((m): m is Msg => !!m && (m.role === 'user' || m.role === 'assistant') && typeof m.text === 'string').slice(-MAX_KEPT)
  } catch {
    return []
  }
}

function saveChat(language: TargetLanguage, msgs: Msg[]) {
  try {
    if (msgs.length) localStorage.setItem(storeKey(language), JSON.stringify(msgs.slice(-MAX_KEPT)))
    else localStorage.removeItem(storeKey(language))
  } catch {
    // Storage full or blocked: the chat just does not survive a reload.
  }
}

const STARTERS = (language: TargetLanguage, hasWeak: boolean): string[] => [
  `Beni ${LANGUAGE_NAME[language]} küçük bir soruyla sına`,
  'Bugün işime yarayacak 5 kalıp öğret',
  'Yazdığım cümleyi düzeltir misin?',
  hasWeak ? 'Zorlandığım kelimelerle kısa bir hikâye yaz' : 'Bana kısa, kolay bir hikâye yaz',
]

/** Monki: the assistant. A floating monkey that opens a small chat about the language being learned. */
export default function Monki({ language, name, weakWords, onSettings }: { language: TargetLanguage; name?: string; weakWords?: string[]; onSettings: () => void }) {
  const { apiKey, needsApproval } = useAi()
  const [open, setOpen] = useState(false)
  const [msgs, setMsgs] = useState<Msg[]>(() => loadChat(language))
  const [suggestions, setSuggestions] = useState<string[]>([])
  const [text, setText] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const logRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const fabRef = useRef<HTMLButtonElement>(null)
  const languageRef = useRef(language)
  const wasOpen = useRef(false)

  // Closing hands the focus back to the button (it is drawn again then, so this runs after the render).
  useEffect(() => {
    if (wasOpen.current && !open) fabRef.current?.focus()
    wasOpen.current = open
  }, [open])

  // Each language has its own chat.
  useEffect(() => {
    languageRef.current = language
    setMsgs(loadChat(language))
    setSuggestions([])
    setError('')
    setBusy(false)
  }, [language])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      e.stopPropagation()
      setOpen(false)
    }
    window.addEventListener('keydown', onKey, true)
    return () => window.removeEventListener('keydown', onKey, true)
  }, [open])

  useEffect(() => {
    if (open && apiKey) inputRef.current?.focus()
  }, [open, apiKey])

  useEffect(() => {
    const el = logRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [msgs, busy, open, suggestions])

  const send = useCallback(
    async (raw: string) => {
      const message = raw.trim()
      if (!message || busy || !apiKey) return
      const asked = language
      const next = [...msgs, { role: 'user' as const, text: message }]
      setMsgs(next)
      saveChat(asked, next)
      setText('')
      setSuggestions([])
      setError('')
      setBusy(true)
      try {
        const reply = await monkiTurn(apiKey, {
          language: asked,
          history: recent(next).map((m) => ({ role: m.role, text: m.text })),
          name: name || undefined,
          weakWords,
        })
        if (languageRef.current !== asked) return
        const done = [...next, { role: 'assistant' as const, text: reply.reply }]
        setMsgs(done)
        saveChat(asked, done)
        setSuggestions(reply.suggestions.slice(0, 3))
      } catch (e) {
        if (languageRef.current !== asked) return
        setError(e instanceof AiError ? e.message : 'Monki şu an cevap veremedi. Biraz sonra tekrar dene.')
      } finally {
        if (languageRef.current === asked) setBusy(false)
      }
    },
    [apiKey, busy, language, msgs, name, weakWords],
  )

  const clear = () => {
    setMsgs([])
    saveChat(language, [])
    setSuggestions([])
    setError('')
  }

  const hello = name ? `Merhaba ${name}! Ben Monki.` : 'Merhaba! Ben Monki.'

  return (
    <>
      {!open && (
        <button ref={fabRef} type="button" className="monki-fab" onClick={() => setOpen(true)} aria-label="Monki ile konuş" title="Monki ile konuş">
          <MonkiFace face="happy" size={50} />
        </button>
      )}
      {open && (
        <section className="monki-panel" role="dialog" aria-label="Monki" aria-modal="false">
          <header className="monki-head">
            <span className="monki-avatar" aria-hidden>
              <MonkiFace face={busy ? 'think' : error ? 'surprised' : 'happy'} size={42} />
            </span>
            <div className="monki-title">
              <strong>Monki</strong>
              <span className="small muted">{LANGUAGE_NAME[language]} çalışma arkadaşın</span>
            </div>
            {msgs.length > 0 && (
              <button type="button" className="btn btn-quiet btn-sm" onClick={clear}>
                Temizle
              </button>
            )}
            <button type="button" className="icon-btn" onClick={() => setOpen(false)} aria-label="Kapat">
              <CloseIcon size={18} />
            </button>
          </header>

          {!apiKey ? (
            <div className="monki-body monki-setup">
              <MonkiPose pose="wave" height={132} />
              <p>
                <strong>{hello}</strong>
              </p>
              <p className="muted">
                {needsApproval
                  ? 'Benimle konuşmak için hesabının onaylanması ve bir YZ anahtarı gerekiyor. Hesabın onaylanınca Ayarlar → YZ yardımcısı’ndan anahtarını ekleyebilirsin.'
                  : 'Benimle konuşmak için Ayarlar → YZ yardımcısı bölümüne kendi Anthropic anahtarını eklemen yeterli. Anahtar yalnızca bu cihazda durur.'}
              </p>
              <button type="button" className="btn" onClick={() => (setOpen(false), onSettings())}>
                Ayarlara git
              </button>
            </div>
          ) : (
            <>
              <div className="monki-body monki-log" ref={logRef} role="log" aria-live="polite" aria-label="Sohbet">
                {msgs.length === 0 && (
                  <div className="monki-hello">
                    <MonkiPose pose="hang" height={104} />
                  </div>
                )}
                {msgs.length === 0 && (
                  <div className="monki-msg from-monki">
                    <RichText text={`**${hello}** ${LANGUAGE_NAME[language]} çalışırken takıldığın her şeyi bana sorabilirsin: bir kelime, bir kural, bir cümle. Nereden başlayalım?`} />
                  </div>
                )}
                {msgs.map((m, i) => (
                  <div key={i} className={`monki-msg ${m.role === 'user' ? 'from-user' : 'from-monki'}`}>
                    {m.role === 'user' ? m.text : <RichText text={m.text} />}
                  </div>
                ))}
                {busy && (
                  <div className="monki-msg from-monki monki-typing" role="status" aria-label="Monki yazıyor">
                    <span /> <span /> <span />
                  </div>
                )}
                {error && (
                  <div className="monki-fail">
                    <MonkiPose pose="sad" height={84} still />
                    <p className="note monki-error" role="alert">
                      {error}
                    </p>
                  </div>
                )}
              </div>
              <div className="monki-chips">
                {(msgs.length === 0 ? STARTERS(language, !!weakWords?.length) : suggestions).map((s) => (
                  <button key={s} type="button" className="chip" disabled={busy} onClick={() => void send(s)}>
                    {s}
                  </button>
                ))}
              </div>
              <form
                className="monki-form"
                onSubmit={(e) => {
                  e.preventDefault()
                  void send(text)
                }}
              >
                <textarea
                  ref={inputRef}
                  rows={1}
                  value={text}
                  maxLength={1000}
                  placeholder="Monki’ye yaz…"
                  aria-label="Monki’ye mesaj"
                  onChange={(e) => setText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
                      e.preventDefault()
                      void send(text)
                    }
                  }}
                />
                <button type="submit" className="btn monki-send" disabled={busy || !text.trim()} aria-label="Gönder">
                  <SendIcon size={18} />
                </button>
              </form>
            </>
          )}
        </section>
      )}
    </>
  )
}
