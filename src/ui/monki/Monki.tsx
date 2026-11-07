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
import { EMBLEM } from '../drawnArt'
import { talkProgress, usesWord } from './monkiWords'
import { askedToday, countAsk, overLimit } from './dailyLimit'
import { changedWord, parseCorrection, type Correction } from './corrections'
import { saveSentence } from '../saveSentence'
import { addNotes, memoryLines, removeNote, type MemoryNote } from '../../engine/monkiMemory'
import { localDate } from '../../engine/progress'
import { loadMemory, memoryOn, saveMemory, setMemoryOn } from './memoryStore'

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
/** Dollars the way the usage screen writes them (a comma, three decimals under one dollar). */
const usd = (x: number) => `$${x < 1 ? x.toFixed(3) : x.toFixed(2)}`.replace('.', ',')
const newNoteId = () => (typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`)
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
const MODE_EMBLEM: Partial<Record<MonkiMode, string>> = { chat: EMBLEM.chat, quiz: EMBLEM.trophy, pron: EMBLEM.mic }

type ChipMode = Exclude<MonkiMode, 'words' | 'write' | 'exam'>
const MODES: { id: ChipMode; label: string; hint: string }[] = [
  { id: 'chat', label: 'Sohbet', hint: 'Her şeyi sor' },
  { id: 'quiz', label: 'Sınav', hint: 'Her seferinde tek soru' },
  { id: 'mistakes', label: 'Hatalarım', hint: 'Son hatalarını konuş' },
  { id: 'pron', label: 'Telaffuz', hint: 'Zayıf telaffuzlu kelimelerini söyle' },
]

const STARTERS = (mode: MonkiMode, hasWeak: boolean, hasMistakes: boolean): string[] => {
  if (mode === 'quiz') return ['Kelimelerimden sor', 'Dilbilgisi sorusu sor', 'Boşluk doldurma sorusu sor', 'Çeviri sorusu sor']
  if (mode === 'mistakes') return hasMistakes ? ['Hatalarımı sırayla inceleyelim', 'En çok yaptığım hatadan başla'] : []
  if (mode === 'words' || mode === 'pron') return ['Başlayalım']
  return ['Bugün işime yarayacak 5 kalıp öğret', 'Yazdığım cümleyi düzeltir misin?', hasWeak ? 'Zorlandığım kelimelerle kısa bir hikâye yaz' : 'Bana kısa, kolay bir hikâye yaz']
}

const INTRO: Record<MonkiMode, (hello: string, lang: string, hasMistakes: boolean) => string> = {
  chat: (hello, lang) => `**${hello}** Hangi ekrandaysan oradayım: ${lang} çalışırken takıldığın bir kelimeyi, kuralı ya da cümleyi bana sor, kısaca açıklarım.`,
  quiz: (_h, lang) => `**Sınav zamanı!** Sana ${lang} tek tek soru soracağım; cevabını yaz ya da seçeneklerden birine dokun. Hangisiyle başlayalım?`,
  mistakes: (_h, _l, has) => (has ? '**Son hatalarına bakalım.** Tek tek, nedenini ve bir hafıza ipucunu konuşalım, sonra yeni bir cümle kuralım.' : '**Açık hatan yok**, harika! Birkaç soru çözüp hata biriktirdikçe burada onlarla çalışabiliriz.'),
  pron: (_h, lang) => `**Telaffuz çalışalım.** Telaffuz puanı düşük kelimelerinden birini sana okurum, sesleri nasıl çıkaracağını anlatırım; sen mikrofona dokunup söylersin. Seni duyamam, ${lang} tanıyıcının yazıya çevirdiğine bakarım.`,
  write: () => '**Yazarken yanındayım.** Takıldığın yerde devam etmen için kalıplar ve sorular önerebilirim; metnini ben yazmam.',
  exam: () => '**Sınav provası.** Yazını DELF/DELE/Cambridge ölçütleriyle değerlendiririm; resmî bir puan değil, bir tahmindir.',
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

/** A talk on set words is over once all of them were used or the learner has answered this many times. */
const TALK_TURNS = 5

/** At the end of a words talk: which words were used, which were not, and a tap to go on with the rest. */
function TalkSummary({ targets, learnerMessages, language, onGoOn }: { targets: string[]; learnerMessages: string[]; language: TargetLanguage; onGoOn: (unused: string[]) => void }) {
  const { used, unused } = talkProgress(targets, learnerMessages, language)
  const over = learnerMessages.length > 0 && (unused.length === 0 || learnerMessages.length >= TALK_TURNS)
  if (!over) return null
  return (
    <div className="monki-summary" role="status">
      <strong>Konuşma özeti</strong>
      <p className="small">
        {used.length}/{targets.length} kelimeyi kendi cümlenle kullandın.
      </p>
      {used.length > 0 && (
        <p className="small" lang={language}>
          {used.map((w) => `✓ ${w}`).join(' · ')}
        </p>
      )}
      {unused.length > 0 && (
        <>
          <p className="small muted" lang={language}>
            Kullanmadıkların: {unused.join(', ')}
          </p>
          <button type="button" className="btn btn-sm" onClick={() => onGoOn(unused)}>
            Kullanmadıklarla devam et
          </button>
        </>
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
  loadPronWords,
  dailyLimit = 0,
  loadUsage,
  showButton = true,
  inSession = false,
  onSettings,
  onPractice,
}: {
  language: TargetLanguage
  name?: string
  weakWords?: string[]
  mistakes?: { word: string; given: string; expected: string }[]
  /** The words whose pronunciation scores are low (read when the panel opens): with any, the panel offers the pronunciation mode. */
  loadPronWords?: () => Promise<{ word: string; score: number }[]>
  /** The most messages a day (Ayarlar → YZ yardımcısı); 0 = no limit. */
  dailyLimit?: number
  /** This month's Monki questions and what they cost (for the line under the form). */
  loadUsage?: () => Promise<{ requests: number; cost: number } | null>
  /** The floating button is hidden on the summary; in a session it is smaller and steps aside while the feedback sheet is up. */
  showButton?: boolean
  /** In a session the chat pauses the keyboard shortcuts (a number key would answer the question). */
  inSession?: boolean
  onSettings: () => void
  /** Opens Yaz & konuş: goal-led speaking and writing practice lives there, Monki helps where the learner is. */
  onPractice?: () => void
}) {
  const { apiKey, needsApproval, server } = useAi()
  const [open, setOpen] = useState(false)
  const [msgs, setMsgs] = useState<Msg[]>(() => loadChat(language))
  const [suggestions, setSuggestions] = useState<string[]>([])
  const [text, setText] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [mode, setMode] = useState<MonkiMode>('chat')
  // Voice: the word to say is spoken (pronunciation) and the microphone answers instead of typing.
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
  // Where in the chat the words talk began (the summary counts the learner's messages from there).
  const [talkFrom, setTalkFrom] = useState(0)
  const [usage, setUsage] = useState<{ requests: number; cost: number } | null>(null)
  const [pronWords, setPronWords] = useState<{ word: string; score: number }[]>([])
  const msgsRef = useRef(msgs)
  msgsRef.current = msgs
  // What Monki remembers about the learner (a few short notes), and whether it keeps adding to them.
  const [memory, setMemory] = useState<MemoryNote[]>(() => loadMemory(language))
  const [remembering, setRemembering] = useState(memoryOn)
  const [showMemory, setShowMemory] = useState(false)
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
      // In a session the button is not handed the focus: Enter or Space there would open the chat again instead of going on.
      if (back?.isConnected && !(inSession && back === fabRef.current)) back.focus()
      else if (!inSession) fabRef.current?.focus()
    }
    wasOpen.current = open
  }, [open, inSession])

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
    setMemory(loadMemory(language))
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

  // What this month's questions have cost: read when the panel opens and after each answer.
  useEffect(() => {
    if (!open || !apiKey || !loadUsage || busy) return
    let live = true
    loadUsage()
      .then((u) => live && setUsage(u))
      .catch(() => live && setUsage(null))
    return () => {
      live = false
    }
  }, [open, apiKey, loadUsage, busy])

  // The weakly pronounced words are read each time the panel opens: the scores change as the learner practises.
  useEffect(() => {
    if (!open || !apiKey || !loadPronWords) return
    let live = true
    loadPronWords()
      .then((words) => live && setPronWords(words))
      .catch(() => live && setPronWords([]))
    return () => {
      live = false
    }
  }, [open, apiKey, loadPronWords, language])

  useEffect(() => {
    const el = logRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [msgs, busy, open, suggestions])

  const send = useCallback(
    async (raw: string, over?: { mode?: MonkiMode; targets?: string[] }) => {
      const message = raw.trim()
      if (!message || busy || !apiKey) return
      if (overLimit(dailyLimit)) {
        setError(`Bugünkü Monki soru sınırına (${dailyLimit}) ulaştın. Sınırı Ayarlar → YZ yardımcısı’ndan değiştirebilirsin; yarın yeniden başlar.`)
        return
      }
      countAsk()
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
          mistakes,
          targets: (over?.mode ?? mode) === 'words' ? (over?.targets ?? targets) : undefined,
          memory: remembering && memory.length ? memoryLines(memory) : undefined,
          pron: (over?.mode ?? mode) === 'pron' ? pronWords.slice(0, 5) : undefined,
        })
        if (languageRef.current !== asked) return
        const done = [...next, { role: 'assistant' as const, text: reply.reply }]
        setMsgs(done)
        saveChat(asked, done)
        setSuggestions(reply.suggestions.slice(0, 3))
        if (remembering) {
          const kept = addNotes(memory, reply.remember, localDate(new Date()), newNoteId)
          if (kept.length !== memory.length) {
            setMemory(kept)
            saveMemory(asked, kept)
          }
        }
        if (voiceRef.current && (over?.mode ?? mode) === 'pron' && reply.say?.trim() && canSpeak()) speak(reply.say, asked)
      } catch (e) {
        if (languageRef.current !== asked) return
        setError(e instanceof AiError ? e.message : 'Monki şu an cevap veremedi. Biraz sonra tekrar dene.')
      } finally {
        if (languageRef.current === asked) setBusy(false)
      }
    },
    [apiKey, busy, language, msgs, name, weakWords, mode, mistakes, targets, memory, remembering, pronWords, dailyLimit],
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
        setTargets(ask.targets ?? [])
        setTalkFrom(msgsRef.current.length)
      }
      setOpen(true)
      if (ask.send) void sendRef.current(ask.text, { mode: ask.mode, targets: ask.targets })
      else setText(ask.text)
    })
    return () => setMonkiListener(null)
  }, [])

  const pickMode = (m: MonkiMode) => {
    setMode(m)
    setSuggestions([])
    setError('')
  }
  /** A starter chip: the first question. */
  const startWith = (label: string) => void send(label)

  const forget = (id: string) => {
    const left = removeNote(memory, id)
    setMemory(left)
    saveMemory(language, left)
  }
  const forgetAll = () => {
    setMemory([])
    saveMemory(language, [])
  }
  const toggleRemembering = () => {
    const next = !remembering
    setRemembering(next)
    setMemoryOn(next)
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
        <button ref={fabRef} type="button" className={inSession ? 'monki-fab monki-fab-session' : 'monki-fab'} onClick={() => setOpen(true)} aria-label="Monki ile konuş" title="Monki ile konuş">
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
            {apiKey && (
              <button type="button" className="btn btn-quiet btn-sm" aria-pressed={showMemory} onClick={() => setShowMemory((v) => !v)} title="Monki'nin senin hakkında hatırladıkları">
                Hatırladıkları{memory.length ? ` (${memory.length})` : ''}
              </button>
            )}
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
                {server
                  ? 'Benimle konuşmak için YZ özelliklerinin hesabında açık olması gerekiyor. Site sahibi açınca buradayım; anahtar girmen gerekmez.'
                  : needsApproval
                  ? 'Benimle konuşmak için hesabının onaylanması ve bir YZ anahtarı gerekiyor. Hesabın onaylanınca Ayarlar → YZ yardımcısı’ndan anahtarını ekleyebilirsin.'
                  : 'Benimle konuşmak için Ayarlar → YZ yardımcısı bölümüne kendi Anthropic anahtarını eklemen yeterli. Anahtar yalnızca bu cihazda durur.'}
              </p>
              <button type="button" className="btn" onClick={() => (setOpen(false), onSettings())}>
                Ayarlara git
              </button>
            </div>
          ) : (
            <>
              {showMemory && (
                <section className="monki-memory" aria-label="Monki'nin hatırladıkları">
                  <p className="small muted">
                    Monki, sohbetlerden seninle ilgili birkaç kısa not tutar (ör. “sık karıştırdığın bir kalıp”) ve bir sonraki konuşmada bunları kullanır. Notlar bu cihazda durur, hesabınla birlikte taşınır; istediğini silebilirsin.
                  </p>
                  {memory.length === 0 ? (
                    <p className="small">{remembering ? 'Henüz not yok. Konuştukça birkaç not birikecek.' : 'Hatırlama kapalı.'}</p>
                  ) : (
                    <ul className="monki-memory-list">
                      {memory.map((n) => (
                        <li key={n.id}>
                          <span>{n.text}</span>
                          <button type="button" className="icon-btn" onClick={() => forget(n.id)} aria-label={`Notu sil: ${n.text}`}>
                            <CloseIcon size={14} />
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                  <div className="monki-memory-actions">
                    <button type="button" className="chip chip-sm" aria-pressed={remembering} onClick={toggleRemembering}>
                      {remembering ? 'Hatırlama: açık' : 'Hatırlama: kapalı'}
                    </button>
                    {memory.length > 0 && (
                      <button type="button" className="btn btn-quiet btn-sm" onClick={forgetAll}>
                        Hepsini sil
                      </button>
                    )}
                  </div>
                </section>
              )}
              <div className="monki-modes" role="group" aria-label="Sohbet türü">
                {MODES.filter((m) => m.id !== 'pron' || pronWords.length > 0).map((m) => (
                  <button key={m.id} type="button" className="chip chip-sm" aria-pressed={mode === m.id} title={m.hint} onClick={() => pickMode(m.id)}>
                    {MODE_EMBLEM[m.id] && <img className="chip-art" src={MODE_EMBLEM[m.id]} alt="" width={18} height={18} draggable={false} />}
                    {m.label}
                  </button>
                ))}
              </div>
              {onPractice && (
                <p className="monki-practice small">
                  Hedefli konuşma, rol yapma ve yazma çalışmaları{' '}
                  <button type="button" className="link" onClick={() => (setOpen(false), onPractice())}>
                    Yaz &amp; konuş’ta
                  </button>
                  .
                </p>
              )}
              {mode === 'pron' && canSpeak() && (
                <div className="monki-voice small">
                  <button type="button" className="chip chip-sm" aria-pressed={voice} onClick={toggleVoice} title="Söylenecek kelimeyi sesli oku">
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
                {!busy && mode === 'words' && targets.length > 0 && (
                  <TalkSummary
                    key={`${talkFrom}-${msgs.length}`}
                    targets={targets}
                    learnerMessages={msgs.slice(talkFrom).filter((m) => m.role === 'user').map((m) => m.text)}
                    language={language}
                    onGoOn={(unused) => void send(`Kullanmadığım kelimelerle devam edelim: ${unused.join(', ')}`, { mode: 'words', targets: unused })}
                  />
                )}
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
                  {(msgs.length === 0 ? STARTERS(mode, !!weakWords?.length, !!mistakes?.length) : suggestions).map((s) => (
                    <button key={s} type="button" className="chip" disabled={busy} onClick={() => (msgs.length === 0 ? startWith(s) : void send(s))}>
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
              {(usage || dailyLimit > 0) && (
                <p className="monki-cost small muted">
                  {usage ? `Bu ay Monki: ${usage.requests} soru · ≈ ${usd(usage.cost)}` : null}
                  {usage && dailyLimit > 0 ? ' · ' : null}
                  {dailyLimit > 0 ? `bugün ${Math.min(askedToday(), dailyLimit)}/${dailyLimit}` : null}
                </p>
              )}
            </>
          )}
        </section>
      )}
    </>
  )
}
