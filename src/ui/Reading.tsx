import { useEffect, useMemo, useRef, useState } from 'react'
import { cleanToken } from '../engine/extract'
import { analyzeText, coverageZone, finishReading, type CoverageZone, type ReadStatus, type ReadToken } from '../engine/reading'
import type { TargetLanguage, UserWordState, VocabularyEntry } from '../engine/types'
import { titleOf, type KelimeDB, type ReadingText } from '../data/db'
import { looksLikeSubtitles, parseSubtitles } from '../engine/subtitles'
import { NewsPicker } from './News'
import { markWord, wordKeys } from '../data/wordInput'
import { ConfirmDialog } from './Dialog'
import { LANGUAGE_NAME } from './labels'
import { WordForm } from './Words'

const ZONE: Record<CoverageZone, { title: string; text: string }> = {
  easy: { title: 'Rahat okuma', text: 'Neredeyse her kelimeyi biliyorsun: akıcılık için ideal. Yeni kelime için biraz daha zor bir metin seçebilirsin.' },
  ideal: { title: 'Öğrenmek için ideal', text: 'Bilmediğin kelimeleri bağlamdan çıkarabileceğin aralıktasın (%95–98).' },
  hard: { title: 'Zorlayıcı', text: 'Bağlamdan anlam çıkarmak zorlaşıyor. Önce işaretli kelimelere bak, sonra oku.' },
  too_hard: { title: 'Çok zor', text: 'Bu metin şu an çoğunlukla çözümleme olur. Daha kolay bir metin seçmek daha verimli.' },
}

/** Days after finishing a text when re-reading it is suggested. */
const REREAD_DAYS = 7

const STATUS_TEXT: Record<ReadStatus, string> = {
  known: 'Bildiğin bir kelime.',
  learning: 'Listende, öğreniyorsun.',
  new: 'Listende, henüz çalışmadın.',
  unseen: 'Bu kelimeyi daha önce işaretlemedin.',
  name: 'Özel isim gibi görünüyor; hesaba katılmıyor.',
}

interface Selected {
  token: ReadToken
  sentence: string
}

/**
 * Reading mode: paste a text, see how much of it you know, mark or add the words you don't,
 * and finish to grow your known-word set.
 */
export function ReadingScreen({
  db,
  language,
  vocabulary,
  states,
  onChanged,
  onOpen,
}: {
  db: KelimeDB
  language: TargetLanguage
  vocabulary: VocabularyEntry[]
  states: UserWordState[]
  onChanged: () => void
  onOpen: (entryId: string) => void
}) {
  const [library, setLibrary] = useState<ReadingText[] | null>(null)
  const [current, setCurrent] = useState<ReadingText | null>(null)
  const text = current?.text ?? ''
  const [draft, setDraft] = useState('')
  const [title, setTitle] = useState('')
  // Coverage when this reading started: saved with the text on finishing, to show progress.
  const startCoverage = useRef<number | null>(null)
  const [known, setKnown] = useState<Set<string>>(new Set())
  // Words the reader left open on purpose: they don't become known when the text is finished.
  const [skipped, setSkipped] = useState<Set<string>>(new Set())
  const [selected, setSelected] = useState<Selected | null>(null)
  const [adding, setAdding] = useState<{ word: string; sentence: string } | null>(null)
  const [confirmFinish, setConfirmFinish] = useState(false)
  const [message, setMessage] = useState('')

  useEffect(() => {
    Promise.all([db.getLibrary(language), db.getCurrentText(language), db.getKnownWords(language)]).then(([lib, id, k]) => {
      setLibrary(lib)
      setCurrent(lib.find((t) => t.id === id) ?? null)
      setKnown(k)
    })
  }, [db, language])

  const analysis = useMemo(() => (text ? analyzeText(text, language, vocabulary, states, known) : null), [text, language, vocabulary, states, known])
  const existing = useMemo(() => wordKeys(vocabulary), [vocabulary])
  const byId = useMemo(() => new Map(vocabulary.map((v) => [v.id, v])), [vocabulary])

  useEffect(() => {
    if (analysis && startCoverage.current === null) startCoverage.current = analysis.coverage
  }, [analysis])

  const open = async (item: ReadingText | null) => {
    await db.setCurrentText(language, item?.id ?? null)
    setCurrent(item)
    startCoverage.current = null
    setSkipped(new Set())
    setSelected(null)
    setAdding(null)
    setMessage('')
  }

  const start = async () => {
    const t = draft.trim()
    if (!t) return
    const item: ReadingText = { id: crypto.randomUUID(), language, title: title.trim() || titleOf(t), text: t, addedAt: new Date().toISOString(), history: [] }
    await db.saveText(item)
    setLibrary((lib) => [item, ...(lib ?? [])])
    setDraft('')
    setTitle('')
    await open(item)
  }

  /** A subtitle (.srt/.vtt) or plain-text file goes into the draft; subtitles are cleaned up first. */
  const loadFile = async (file: File) => {
    const raw = await file.text()
    setDraft(looksLikeSubtitles(raw) || /\.(srt|vtt)$/i.test(file.name) ? parseSubtitles(raw) : raw)
    setTitle(file.name.replace(/\.[^.]+$/, '').replace(/[._]+/g, ' '))
  }

  const remove = async (item: ReadingText) => {
    await db.deleteText(item.id)
    setLibrary((lib) => (lib ?? []).filter((t) => t.id !== item.id))
  }

  const markKnown = async (key: string) => {
    await db.addKnownWords(language, [key])
    setKnown((k) => new Set(k).add(key))
    setSelected(null)
  }

  const markUnknown = async (key: string) => {
    await db.removeKnownWord(language, key)
    setKnown((k) => {
      const next = new Set(k)
      next.delete(key)
      return next
    })
    setSkipped((s) => new Set(s).add(key))
    setSelected(null)
  }

  const finish = async () => {
    if (!analysis) return
    const { knownKeys, encounters } = finishReading(analysis, skipped)
    await db.addKnownWords(language, knownKeys)
    await db.addEncounters(encounters)
    setKnown(await db.getKnownWords(language))
    if (current) {
      const updated: ReadingText = {
        ...current,
        readAt: new Date().toISOString(),
        history: [...current.history, { at: new Date().toISOString(), coverage: startCoverage.current ?? analysis.coverage }],
      }
      await db.saveText(updated)
      setCurrent(updated)
      setLibrary((lib) => (lib ?? []).map((t) => (t.id === updated.id ? updated : t)))
    }
    setConfirmFinish(false)
    const met = Object.keys(encounters).length
    setMessage(`${knownKeys.length} kelime bilinen kelimelerine eklendi${met ? `, listendeki ${met} kelimeyle bir kez daha karşılaştın` : ''}.`)
    onChanged()
  }

  if (library === null) return null

  if (!text || !analysis) {
    const now = Date.now()
    return (
      <div className="stack">
        <h1 className="greeting">Okuma</h1>
        <p className="greeting-sub">
          {LANGUAGE_NAME[language]} bir metin yapıştır ya da bir alt yazı dosyası yükle: bir haber, blog yazısı, kitaptan bir sayfa ya da izlediğin dizinin
          alt yazısı. Ne kadarını bildiğini gösteririm; bilmediğin kelimeleri işaretler, listene eklersin.
        </p>
        <input className="input" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Başlık (isteğe bağlı)" aria-label="Başlık" />
        <textarea className="textarea" style={{ minHeight: '14rem' }} lang={language} aria-label="Metin" placeholder="Metni buraya yapıştır…" value={draft} onChange={(e) => setDraft(e.target.value)} />
        <div className="row">
          <button className="btn" onClick={start} disabled={!draft.trim()}>
            Okumaya başla
          </button>
          <label className="btn btn-quiet file-btn">
            Alt yazı ya da metin dosyası yükle
            <input type="file" accept=".srt,.vtt,.txt,text/plain" onChange={(e) => e.target.files?.[0] && loadFile(e.target.files[0])} />
          </label>
        </div>
        <NewsPicker
          language={language}
          vocabulary={vocabulary}
          states={states}
          known={known}
          onRead={async (newsTitle, newsText) => {
            const item: ReadingText = { id: crypto.randomUUID(), language, title: newsTitle, text: newsText, addedAt: new Date().toISOString(), history: [] }
            await db.saveText(item)
            setLibrary((lib) => [item, ...(lib ?? [])])
            await open(item)
          }}
        />
        {library.length > 0 && (
          <section className="section stack">
            <h2 className="section-title">Kütüphanen</h2>
            <ul className="library">
              {library.map((item) => {
                const last = item.history.at(-1)
                const since = item.readAt ? Math.floor((now - new Date(item.readAt).getTime()) / 86_400_000) : null
                const reread = since !== null && since >= REREAD_DAYS
                return (
                  <li key={item.id}>
                    <button className="word-link library-open" onClick={() => open(item)}>
                      <strong>{item.title}</strong>
                      <span className="small muted">
                        {item.text.split(/\s+/).length} kelime
                        {last && ` · son okumada %${Math.round(last.coverage * 100)}`}
                        {since !== null && ` · ${since === 0 ? 'bugün' : `${since} gün önce`} okundu`}
                      </span>
                    </button>
                    {reread && <span className="pill reread-pill">Tekrar oku</span>}
                    <button className="link small" onClick={() => remove(item)} aria-label={`${item.title} sil`}>
                      Sil
                    </button>
                  </li>
                )
              })}
            </ul>
            <p className="small muted">
              Bitirdiğin bir metni bir hafta sonra tekrar okumak, kelimeleri yeni bağlamda değil ama yeniden karşılaşarak pekiştirir; kapsama oranının
              nasıl arttığını da görürsün.
            </p>
          </section>
        )}
        <p className="small muted">
          İlk metinlerde çok kelime "yeni" görünür; çünkü bildiğin kelimeleri henüz tanımıyorum. Okumayı bitirdiğinde işaretlemediğin kelimeler bilinen
          sayılır ve sonraki metinlerin ölçümü giderek doğrulaşır.
        </p>
      </div>
    )
  }

  const zone = coverageZone(analysis.coverage)
  const pct = (x: number) => `%${Math.round(x * 1000) / 10}`.replace('.', ',')
  const unseenKeys = new Set(analysis.paragraphs.flat().flatMap((s) => s.tokens).filter((t) => t.status === 'unseen' && t.key && !skipped.has(t.key)).map((t) => t.key))
  const selectedEntry = selected?.token.entryId ? byId.get(selected.token.entryId) : undefined
  const share = (n: number) => `${(n / Math.max(1, analysis.total)) * 100}%`

  return (
    <div className="stack">
      <div className="row" style={{ justifyContent: 'space-between' }}>
        <h1 className="greeting">Okuma</h1>
        <button className="link small" onClick={() => open(null)}>
          ← Kütüphane
        </button>
      </div>

      <section className={`card stack coverage zone-${zone}`}>
        <div className="coverage-head">
          <span className="coverage-num">{pct(analysis.coverage)}</span>
          <span>
            <strong>{ZONE[zone].title}</strong>
            <br />
            <span className="small muted">{ZONE[zone].text}</span>
          </span>
        </div>
        {current && current.history.length > 0 && startCoverage.current !== null && (
          <p className="small">
            Önceki okumada %{Math.round(current.history[0].coverage * 100)}
            {current.history.length > 1 && `, son okumada %${Math.round(current.history.at(-1)!.coverage * 100)}`}; bu okumaya başlarken %
            {Math.round(startCoverage.current * 100)}.
          </p>
        )}
        {known.size < 500 && (
          <p className="small muted">
            Bildiğin kelimeleri henüz az tanıyorum ({known.size}). Birkaç metni bitirdikçe "yeni" görünen kelimeler azalır ve bu oran gerçeğe yaklaşır.
          </p>
        )}
        <div className="coverage-bar" role="img" aria-label={`Bilinen ${pct(analysis.coverage)}, listede ${pct(analysis.coverageWithList - analysis.coverage)}, yeni ${pct(1 - analysis.coverageWithList)}`}>
          <span className="cb-known" style={{ width: share(analysis.counts.known) }} />
          <span className="cb-list" style={{ width: share(analysis.counts.learning + analysis.counts.new) }} />
          <span className="cb-unseen" style={{ width: share(analysis.counts.unseen) }} />
        </div>
        <p className="small muted coverage-legend">
          <span><i className="cb-known" /> bildiğin {analysis.counts.known}</span>
          <span><i className="cb-list" /> listende {analysis.counts.learning + analysis.counts.new}</span>
          <span><i className="cb-unseen" /> yeni {analysis.counts.unseen}</span>
          <span>toplam {analysis.total} kelime</span>
        </p>
      </section>

      <article className="reader" lang={language}>
        {analysis.paragraphs.map((p, i) => (
          <p key={i}>
            {p.map((s, j) => (
              <span key={j}>
                {s.tokens.map((t, k) =>
                  t.key ? (
                    <span
                      key={k}
                      role="button"
                      tabIndex={t.status === 'known' || t.status === 'name' ? -1 : 0}
                      className={`rw rw-${t.status}${t.status === 'unseen' && skipped.has(t.key) ? ' rw-skipped' : ''}${selected?.token.key === t.key ? ' is-selected' : ''}`}
                      onClick={() => setSelected({ token: t, sentence: s.text })}
                      onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), setSelected({ token: t, sentence: s.text }))}
                    >
                      {t.text}
                    </span>
                  ) : (
                    <span key={k}>{t.text}</span>
                  ),
                )}{' '}
              </span>
            ))}
          </p>
        ))}
      </article>

      {selected && selected.token.key && (
        <section className="card stack word-pop" aria-live="polite">
          <div className="row" style={{ justifyContent: 'space-between' }}>
            <strong className="word-pop-word" lang={language}>
              {selectedEntry ? `${selectedEntry.article ? `${selectedEntry.article} ` : ''}${selectedEntry.lemma}` : cleanToken(selected.token.text, language)}
            </strong>
            <button className="icon-btn" onClick={() => setSelected(null)} aria-label="Kapat">
              ×
            </button>
          </div>
          {selectedEntry && <p className="gloss">{selectedEntry.senses[0].gloss}</p>}
          <p className="small muted">{STATUS_TEXT[selected.token.status!]}</p>
          <p className="small sentence-sm">{selected.sentence}</p>
          <div className="row">
            {selectedEntry ? (
              <button className="btn btn-quiet" onClick={() => onOpen(selectedEntry.id)}>
                Kelimeyi aç
              </button>
            ) : (
              <>
                <button className="btn" onClick={() => setAdding({ word: cleanToken(selected.token.text, language).toLocaleLowerCase(language), sentence: selected.sentence })}>
                  Listeye ekle
                </button>
                {selected.token.status === 'known' ? (
                  <button className="btn btn-quiet" onClick={() => markUnknown(selected.token.key!)}>
                    Aslında bilmiyorum
                  </button>
                ) : (
                  <>
                    <button className="btn btn-quiet" onClick={() => markKnown(selected.token.key!)}>
                      Biliyorum
                    </button>
                    {!skipped.has(selected.token.key) && (
                      <button className="link small" onClick={() => (setSkipped((s) => new Set(s).add(selected.token.key!)), setSelected(null))}>
                        Bilmiyorum, eklemeden geç
                      </button>
                    )}
                  </>
                )}
              </>
            )}
          </div>
        </section>
      )}

      {adding && (
        <section className="card stack">
          <h2 className="section-title">Listeye ekle</h2>
          <WordForm
            db={db}
            language={language}
            existing={existing}
            initial={{ word: adding.word, meaning: '', example: markWord(adding.sentence, adding.word), exampleTranslation: '' }}
            onSaved={() => {
              setAdding(null)
              setSelected(null)
              onChanged()
            }}
            onCancel={() => setAdding(null)}
          />
        </section>
      )}

      {analysis.iPlusOne.length > 0 && (
        <section className="section stack">
          <h2 className="section-title">Tek bilinmeyenli cümleler</h2>
          <p className="small muted">
            Yalnızca bir kelimesini bilmediğin cümleler: yeni bir kelimeyi öğrenmenin en verimli bağlamı (i+1). Kelimeyi bu cümleyle birlikte ekle.
          </p>
          <ul className="plain stack" style={{ gap: '0.5rem' }}>
            {analysis.iPlusOne.slice(0, 12).map((x) => (
              <li key={x.key} className="row" style={{ justifyContent: 'space-between', flexWrap: 'nowrap', alignItems: 'flex-start' }}>
                <span className="sentence-sm" lang={language}>
                  {highlight(x.sentence, x.word)}
                </span>
                <button className="btn btn-quiet" onClick={() => setAdding({ word: x.word.toLocaleLowerCase(language), sentence: x.sentence })}>
                  Ekle
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      <div className="row">
        <button className="btn btn-lg" onClick={() => setConfirmFinish(true)}>
          Okumayı bitir
        </button>
        {message && (
          <p className="notice" role="status">
            {message}
          </p>
        )}
      </div>

      {confirmFinish && (
        <ConfirmDialog
          title="Okumayı bitir"
          confirmLabel="Bitir"
          cancelLabel="Okumaya dön"
          onConfirm={finish}
          onCancel={() => setConfirmFinish(false)}
        >
          {unseenKeys.size > 0
            ? `İşaretlemediğin ${unseenKeys.size} kelime bilinen kelimelerine eklenecek. Bilmediğin varsa önce "Bilmiyorum" ya da "Listeye ekle" ile işaretle.`
            : 'Yeni kelime kalmadı; listendeki kelimelerle karşılaşmaların kaydedilecek.'}
        </ConfirmDialog>
      )}
    </div>
  )
}

function highlight(sentence: string, word: string) {
  const i = sentence.toLowerCase().indexOf(word.toLowerCase())
  if (i < 0) return sentence
  return (
    <>
      {sentence.slice(0, i)}
      <mark>{sentence.slice(i, i + word.length)}</mark>
      {sentence.slice(i + word.length)}
    </>
  )
}
