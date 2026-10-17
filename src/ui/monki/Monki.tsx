import { useCallback, useEffect, useRef, useState } from 'react'
import '../../lazy.css'
import { AiError, monkiTurn, type MonkiMode } from '../../ai'
import type { TargetLanguage } from '../../engine/types'
import { useAi } from '../aiContext'
import { CloseIcon, MicIcon, SendIcon, StopIcon } from '../icons'
import { canListen, listen, type Listening } from '../speechInput'
import { canSpeak, speak, stopSpeaking } from '../speech'
import { LANGUAGE_NAME } from '../labels'
import { RichText } from '../RichText'
import { MonkiFace, MonkiPose, MonkiStage } from './MonkiMascot'
import { setMonkiListener, type MonkiAsk } from './monkiBus'
import { EMBLEM, ROLE_ART } from '../drawnArt'
import { usesWord } from './monkiWords'
import { changedWord, parseCorrection, type Correction } from './corrections'
import { saveSentence } from '../saveSentence'

interface Msg {
  role: 'user' | 'assistant'
  text: string
}

const MAX_KEPT = 30
const VOICE_KEY = 'diloloji:monki-voice'
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

/** A small drawn emblem on three of the four mode chips. */
const MODE_EMBLEM: Partial<Record<MonkiMode, string>> = { chat: EMBLEM.chat, quiz: EMBLEM.trophy, roleplay: EMBLEM.mic }

const MODES: { id: MonkiMode; label: string; hint: string }[] = [
  { id: 'chat', label: 'Sohbet', hint: 'Her şeyi sor' },
  { id: 'quiz', label: 'Sınav', hint: 'Her seferinde tek soru' },
  { id: 'roleplay', label: 'Rol yap', hint: 'Bir sahneyi konuşarak çalış' },
  { id: 'mistakes', label: 'Hatalarım', hint: 'Son hatalarını konuş' },
]

const SCENES: { label: string; art: string }[] = [
  { label: 'Kafede sipariş vermek', art: ROLE_ART.cafe },
  { label: 'Otelde check-in', art: ROLE_ART.hotel },
  { label: 'Yol sormak', art: ROLE_ART.directions },
  { label: 'Doktora gitmek', art: ROLE_ART.doctor },
  { label: 'İş mülakatı', art: ROLE_ART.interview },
  { label: 'Alışveriş yapmak', art: ROLE_ART.shopping },
]
const SCENARIOS = SCENES.map((s) => s.label)

const STARTERS = (mode: MonkiMode, hasWeak: boolean, hasMistakes: boolean): string[] => {
  if (mode === 'quiz') return ['Kelimelerimden sor', 'Dilbilgisi sorusu sor', 'Boşluk doldurma sorusu sor', 'Çeviri sorusu sor']
  if (mode === 'roleplay') return SCENARIOS
  if (mode === 'mistakes') return hasMistakes ? ['Hatalarımı sırayla inceleyelim', 'En çok yaptığım hatadan başla'] : []
  if (mode === 'words') return ['Başlayalım']
  return ['Bugün işime yarayacak 5 kalıp öğret', 'Yazdığım cümleyi düzeltir misin?', hasWeak ? 'Zorlandığım kelimelerle kısa bir hikâye yaz' : 'Bana kısa, kolay bir hikâye yaz']
}

const INTRO: Record<MonkiMode, (hello: string, lang: string, hasMistakes: boolean) => string> = {
  chat: (hello, lang) => `**${hello}** ${lang} çalışırken takıldığın her şeyi bana sorabilirsin: bir kelime, bir kural, bir cümle. Nereden başlayalım?`,
  quiz: (_h, lang) => `**Sınav zamanı!** Sana ${lang} tek tek soru soracağım; cevabını yaz ya da seçeneklerden birine dokun. Hangisiyle başlayalım?`,
  roleplay: (_h, lang) => `**Bir sahne seç**, ben karşındaki kişi olurum ve ${lang} konuşuruz. Hata yaparsan konuşmayı bölmeden altına küçük bir düzeltme yazarım.`,
  mistakes: (_h, _l, has) => (has ? '**Son hatalarına bakalım.** Tek tek, nedenini ve bir hafıza ipucunu konuşalım, sonra yeni bir cümle kuralım.' : '**Açık hatan yok**, harika! Birkaç soru çözüp hata biriktirdikçe burada onlarla çalışabiliriz.'),
  words: () => '**Kelimelerle konuşalım.** Sana sorular soracağım; cevaplarken yukarıdaki kelimeleri kullanmaya çalış, kullandıkça işaretlenir.',
}

/** Keeps a correction as a sentence card (the word that changed is blanked first); false when the card was already there. */
const keepCorrection = (language: TargetLanguage, correction: Correction, original?: string) =>
  saveSentence({
    language,
    text: correction.sentence,
    focus: changedWord(correction.sentence, original),
    source: 'Monki düzeltmesi',
    note: correction.reason ? `Monki: ${correction.reason}` : undefined,
  })

/** The corrections in a chat, each with what the learner had written just before it. */
const correctionsIn = (msgs: Msg[]) =>
  msgs.flatMap((m, i) => {
    const correction = m.role === 'assistant' ? parseCorrection(m.text) : null
    return correction ? [{ correction, original: msgs[i - 1]?.role === 'user' ? msgs[i - 1].text : undefined }] : []
  })

/** At the end of a scene with several corrections: all of them as cards in one tap. */
function SaveAllCorrections({ msgs, language }: { msgs: Msg[]; language: TargetLanguage }) {
  const found = correctionsIn(msgs)
  const [done, setDone] = useState<number | null>(null)
  if (found.length < 2) return null
  const saveAll = async () => {
    let added = 0
    for (const f of found) if (await keepCorrection(language, f.correction, f.original).catch(() => false)) added++
    setDone(added)
  }
  return (
    <div className="monki-save monki-save-all">
      {done === null ? (
        <button type="button" className="btn btn-sm" onClick={() => void saveAll()}>
          Bu konuşmanın {found.length} düzeltmesini karta ekle
        </button>
      ) : (
        <span className="small muted" role="status">
          ✓ {done} cümle kartlarına eklendi{done < found.length ? ` (${found.length - done} zaten vardı)` : ''}
        </span>
      )}
    </div>
  )
}

/** Under a correction Monki wrote: one tap keeps the corrected sentence as a sentence card. */
function SaveCorrection({ text, original, language }: { text: string; original?: string; language: TargetLanguage }) {
  const correction = parseCorrection(text)
  const [state, setState] = useState<'idle' | 'saved' | 'had' | 'failed'>('idle')
  if (!correction) return null
  const save = async () => {
    try {
      setState((await keepCorrection(language, correction, original)) ? 'saved' : 'had')
    } catch {
      setState('failed')
    }
  }
  return (
    <div className="monki-save">
      {state === 'saved' || state === 'had' ? (
        <span className="small muted" role="status">
          {state === 'saved' ? '✓ Cümle kartlarına eklendi' : 'Bu cümle zaten kartlarında'}
        </span>
      ) : (
        <button type="button" className="btn btn-sm btn-quiet" onClick={() => void save()}>
          Düzeltilmiş cümleyi karta ekle
        </button>
      )}
      {state === 'failed' && (
        <span className="small notice" role="alert">
          Eklenemedi, tekrar dene.
        </span>
      )}
    </div>
  )
}

/** Monki: the assistant. A floating monkey that opens a small chat about the language being learned. */
export default function Monki({
  language,
  name,
  weakWords,
  mistakes,
  showButton = true,
  inSession = false,
  onSettings,
}: {
  language: TargetLanguage
  name?: string
  weakWords?: string[]
  mistakes?: { word: string; given: string; expected: string }[]
  /** The floating button is hidden in a session and on the summary; the chat can still be opened by a question from the screen. */
  showButton?: boolean
  /** In a session the chat pauses the keyboard shortcuts (a number key would answer the question). */
  inSession?: boolean
  onSettings: () => void
}) {
  const { apiKey, needsApproval } = useAi()
  const [open, setOpen] = useState(false)
  const [msgs, setMsgs] = useState<Msg[]>(() => loadChat(language))
  const [suggestions, setSuggestions] = useState<string[]>([])
  const [text, setText] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [mode, setMode] = useState<MonkiMode>('chat')
  const [scenario, setScenario] = useState('')
  // Voice: the other person's lines are spoken (role-play) and the microphone answers instead of typing.
  const [voice, setVoice] = useState(() => {
    try {
      return localStorage.getItem(VOICE_KEY) !== 'off'
    } catch {
      return true
    }
  })
  const [listening, setListening] = useState(false)
  const [heard, setHeard] = useState('')
  const stopListen = useRef<Listening | null>(null)
  const voiceRef = useRef(voice)
  voiceRef.current = voice
  // Words mode: the words to use, and which of them the learner has used so far.
  const [targets, setTargets] = useState<string[]>([])
  const logRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const fabRef = useRef<HTMLButtonElement>(null)
  const languageRef = useRef(language)
  const wasOpen = useRef(false)
  /** Where the focus was when the chat was opened from the screen (a session's answer sheet): it goes back there. */
  const returnTo = useRef<HTMLElement | null>(null)

  // Closing hands the focus back (the button is drawn again then, so this runs after the render).
  useEffect(() => {
    if (wasOpen.current && !open) {
      const back = returnTo.current
      returnTo.current = null
      if (back?.isConnected) back.focus()
      else fabRef.current?.focus()
    }
    wasOpen.current = open
  }, [open])

  // Nothing keeps talking or listening once the chat is closed.
  useEffect(() => {
    if (open) return
    stopListen.current?.()
    stopListen.current = null
    setListening(false)
    setHeard('')
    stopSpeaking()
  }, [open])

  // Each language has its own chat.
  useEffect(() => {
    languageRef.current = language
    stopListen.current?.()
    setListening(false)
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
    async (raw: string, over?: { mode?: MonkiMode; scenario?: string; targets?: string[] }) => {
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
          mode: over?.mode ?? mode,
          scenario: (over?.scenario ?? scenario) || undefined,
          mistakes,
          targets: (over?.mode ?? mode) === 'words' ? (over?.targets ?? targets) : undefined,
        })
        if (languageRef.current !== asked) return
        const done = [...next, { role: 'assistant' as const, text: reply.reply }]
        setMsgs(done)
        saveChat(asked, done)
        setSuggestions(reply.suggestions.slice(0, 3))
        if (voiceRef.current && (over?.mode ?? mode) === 'roleplay' && reply.say?.trim() && canSpeak()) speak(reply.say, asked)
      } catch (e) {
        if (languageRef.current !== asked) return
        setError(e instanceof AiError ? e.message : 'Monki şu an cevap veremedi. Biraz sonra tekrar dene.')
      } finally {
        if (languageRef.current === asked) setBusy(false)
      }
    },
    [apiKey, busy, language, msgs, name, weakWords, mode, scenario, mistakes, targets],
  )

  // A question from elsewhere in the app (a word page, a wrong answer, a sentence being read).
  const sendRef = useRef(send)
  sendRef.current = send
  const toggleMic = () => {
    if (listening) {
      stopListen.current?.finish()
      return
    }
    stopSpeaking()
    setError('')
    setHeard('')
    setListening(true)
    stopListen.current = listen(language, {
      onInterim: setHeard,
      onFinal: (alts) => {
        setHeard('')
        if (alts[0]) void sendRef.current(alts[0])
      },
      onError: (message) => setError(message),
      onEnd: () => {
        setListening(false)
        setHeard('')
        stopListen.current = null
      },
    })
  }
  const toggleVoice = () => {
    const next = !voice
    setVoice(next)
    if (!next) stopSpeaking()
    try {
      localStorage.setItem(VOICE_KEY, next ? 'on' : 'off')
    } catch {
      // Not remembered; fine.
    }
  }
  useEffect(() => {
    setMonkiListener((ask: MonkiAsk) => {
      returnTo.current = document.activeElement instanceof HTMLElement ? document.activeElement : null
      if (ask.mode) {
        setMode(ask.mode)
        setScenario(ask.scenario ?? '')
        setTargets(ask.targets ?? [])
      }
      setOpen(true)
      if (ask.send) void sendRef.current(ask.text, { mode: ask.mode, scenario: ask.scenario, targets: ask.targets })
      else setText(ask.text)
    })
    return () => setMonkiListener(null)
  }, [])

  const pickMode = (m: MonkiMode) => {
    setMode(m)
    setScenario('')
    setSuggestions([])
    setError('')
  }
  /** A starter chip: in the role-play it picks the scene, elsewhere it is simply the first question. */
  const startWith = (label: string) => {
    if (mode === 'roleplay') {
      setScenario(label)
      void send(`Rol yapalım: ${label}. Sahneyi sen başlat.`, { mode, scenario: label })
    } else void send(label)
  }

  const clear = () => {
    setMsgs([])
    saveChat(language, [])
    setSuggestions([])
    setError('')
  }

  const hello = name ? `Merhaba ${name}! Ben Monki.` : 'Merhaba! Ben Monki.'

  return (
    <>
      {!open && showButton && (
        <button ref={fabRef} type="button" className="monki-fab" onClick={() => setOpen(true)} aria-label="Monki ile konuş" title="Monki ile konuş">
          <MonkiFace face="happy" size={50} />
        </button>
      )}
      {open && (
        <section className="monki-panel" role="dialog" aria-label="Monki" aria-modal={inSession ? 'true' : 'false'}>
          <header className="monki-head">
            <span className="monki-avatar" aria-hidden>
              <MonkiFace face={busy ? 'think' : error ? 'surprised' : 'happy'} size={42} />
            </span>
            <div className="monki-title">
              <strong>Monki</strong>
              <span className="small muted">{LANGUAGE_NAME[language]} çalışma arkadaşın</span>
            </div>
            {apiKey && msgs.length > 0 && (
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
              <MonkiStage language={language} height={132} />
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
              <div className="monki-modes" role="group" aria-label="Sohbet türü">
                {MODES.map((m) => (
                  <button key={m.id} type="button" className="chip chip-sm" aria-pressed={mode === m.id} title={m.hint} onClick={() => pickMode(m.id)}>
                    {MODE_EMBLEM[m.id] && <img className="chip-art" src={MODE_EMBLEM[m.id]} alt="" width={18} height={18} draggable={false} />}
                    {m.label}
                  </button>
                ))}
              </div>
              {mode === 'roleplay' && canSpeak() && (
                <div className="monki-voice small">
                  <button type="button" className="chip chip-sm" aria-pressed={voice} onClick={toggleVoice} title="Karşındaki kişinin cümlelerini sesli oku">
                    {voice ? 'Sesli: açık' : 'Sesli: kapalı'}
                  </button>
                  {canListen() && <span className="muted">Mikrofona dokunup cevap ver.</span>}
                </div>
              )}
              {mode === 'words' && targets.length > 0 && (
                <div className="monki-targets" role="group" aria-label="Kullanılacak kelimeler">
                  {targets.map((w) => {
                    const done = msgs.some((m) => m.role === 'user' && usesWord(m.text, w, language))
                    return (
                      <span key={w} className={done ? 'chip chip-sm monki-target monki-target-used' : 'chip chip-sm monki-target'} lang={language}>
                        {done && '✓ '}
                        {w}
                      </span>
                    )
                  })}
                </div>
              )}
              <div className="monki-body monki-log" ref={logRef} role="log" aria-live="polite" aria-label="Sohbet">
                {msgs.length === 0 && mode === 'chat' && (
                  <div className="monki-hello">
                    <MonkiStage language={language} height={108} />
                  </div>
                )}
                {msgs.length === 0 && (
                  <div className="monki-msg from-monki">
                    <RichText text={INTRO[mode](hello, LANGUAGE_NAME[language], !!mistakes?.length)} />
                  </div>
                )}
                {msgs.map((m, i) => (
                  <div key={i} className={`monki-msg ${m.role === 'user' ? 'from-user' : 'from-monki'}`}>
                    {m.role === 'user' ? m.text : <RichText text={m.text} />}
                    {m.role === 'assistant' && <SaveCorrection text={m.text} original={msgs[i - 1]?.role === 'user' ? msgs[i - 1].text : undefined} language={language} />}
                  </div>
                ))}
                {!busy && <SaveAllCorrections key={msgs.length} msgs={msgs} language={language} />}
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
              {/* Choosing a scene: a picture for each, so the six read at a glance. */}
              {mode === 'roleplay' && !scenario ? (
                <div className="monki-scenes" role="group" aria-label="Sahne seç">
                  {SCENES.map((s) => (
                    <button key={s.label} type="button" className="monki-scene" disabled={busy} onClick={() => startWith(s.label)}>
                      <img src={s.art} alt="" draggable={false} />
                      <span>{s.label}</span>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="monki-chips">
                  {(msgs.length === 0 || (mode === 'roleplay' && !scenario) ? STARTERS(mode, !!weakWords?.length, !!mistakes?.length) : suggestions).map((s) => (
                    <button key={s} type="button" className="chip" disabled={busy} onClick={() => (msgs.length === 0 || (mode === 'roleplay' && !scenario) ? startWith(s) : void send(s))}>
                      {s}
                    </button>
                  ))}
                </div>
              )}
              <form
                className="monki-form"
                onSubmit={(e) => {
                  e.preventDefault()
                  void send(text)
                }}
              >
                {canListen() && (
                  <button
                    type="button"
                    className={listening ? 'btn monki-mic mic-on' : 'btn btn-quiet monki-mic'}
                    onClick={toggleMic}
                    disabled={busy}
                    aria-pressed={listening}
                    aria-label={listening ? 'Bitir ve gönder' : 'Konuşarak cevap ver'}
                    title={listening ? 'Bitir ve gönder' : 'Konuşarak cevap ver'}
                  >
                    {listening ? <StopIcon size={18} /> : <MicIcon size={18} />}
                  </button>
                )}
                <textarea
                  ref={inputRef}
                  rows={1}
                  value={text}
                  maxLength={1000}
                  placeholder={listening ? heard || 'Dinliyorum…' : 'Monki’ye yaz…'}
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
