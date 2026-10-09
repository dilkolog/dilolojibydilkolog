import { useEffect, useState } from 'react'
import { openMistakes } from '../engine/mistakes'
import { BOSS_XP } from '../engine/bosses'
import { Glyph } from './Glyph'
import { PlayIcon, TrophyIcon } from './icons'
import { FLUENCY_MIN_WORDS, pickFluencyWords } from '../engine/practice'
import { createRng } from '../engine/rng'
import { db } from '../data/instance'
import { SentencesGame } from './Sentences'
import { NativeDictation } from './NativeDictation'
import { BackTranslation } from './BackTranslation'
import { EarMissesGame } from './EarMisses'
import { stillMissed } from '../engine/earMisses'
import { loadBackItems } from '../data/backItems'
import { ArticleDrill } from './ArticleDrill'
import { dueSentences } from '../engine/sentences'
import { useOnline } from './useOnline'
import { canSpeak } from './speech'
import { type Props, FLUENCY_ROUND, fmt } from './games/shared'
import { MatchGame } from './games/MatchGame'
import { BlitzGame } from './games/BlitzGame'
import { FluencyGame } from './games/FluencyGame'
import { PairsGame } from './games/PairsGame'
import { GenderGame } from './games/GenderGame'
import { AccentGame } from './games/AccentGame'
import { ACCENT_MIN_WORDS, accentedWords } from './games/accentedWords'
import { SwipeCards } from './games/SwipeCards'
import { AudioReview } from './games/AudioReview'
import { BossArena } from './games/BossArena'
import { PageHeader } from './PageHeader'
import type { GameId } from './gameList'

type Game = GameId | null

export function GamesScreen(
  p: Props & {
    initialGame?: Game
    /** Opens the verb lab (the conjugation practice lives there). */
    onOpenVerbs?: () => void
    /** The day's reviews still waiting, and the way to start the day's session. */
    dayDue?: { reviews: number; minutes: number }
    onStartDay?: () => void
  },
) {
  const [game, setGame] = useState<Game>(p.initialGame ?? null)
  const [dueSentenceCount, setDueSentenceCount] = useState(0)
  useEffect(() => {
    void db.getSentences().then((all) => setDueSentenceCount(dueSentences(all, p.language, new Date()).length))
  }, [p.language, game])
  // Sentences translated and not yet written back (back-translation).
  const [backCount, setBackCount] = useState(0)
  useEffect(() => {
    void loadBackItems(p.language).then((items) => setBackCount(items.length))
  }, [p.language, game])
  // Words missed in dictation and not yet written right as often.
  const [earCount, setEarCount] = useState(0)
  useEffect(() => {
    void db.getEarLog().then((log) => setEarCount(Object.values(log[p.language] ?? {}).filter(stillMissed).length))
  }, [p.language, game])
  const [records, setRecords] = useState<Record<string, number>>({})
  useEffect(() => {
    db.getRecords().then(setRecords)
  }, [game])

  const enough = p.vocabulary.length >= 4
  const matchKey = `match:${p.language}`
  const blitzKey = `blitz:${p.language}`
  const fluencyKey = `fluency:${p.language}`
  const fluencyWords = pickFluencyWords(p.vocabulary, p.states, createRng(1)).length
  const online = useOnline()

  // The game being played, in a stage that (on phones) puts its answer buttons within thumb reach.
  const active = (() => {
    if (game === 'accent') return <AccentGame {...p} best={records[`accent:${p.language}`]} recordKey={`accent:${p.language}`} onExit={() => setGame(null)} />
    if (game === 'match') return <MatchGame {...p} best={records[matchKey]} recordKey={matchKey} onExit={() => setGame(null)} />
    if (game === 'gender' && p.language !== 'en')
      return <GenderGame {...p} language={p.language} best={records[`gender:${p.language}`]} recordKey={`gender:${p.language}`} onExit={() => setGame(null)} />
    if (game === 'boss') return <BossArena {...p} onExit={() => setGame(null)} />
    if (game === 'audio') return <AudioReview {...p} onExit={() => setGame(null)} />
    if (game === 'swipe') return <SwipeCards {...p} onExit={() => setGame(null)} />
    if (game === 'sentences') return <SentencesGame language={p.language} onExit={() => setGame(null)} />
    if (game === 'ear') return <EarMissesGame language={p.language} onExit={() => setGame(null)} />
    if (game === 'back') return <BackTranslation language={p.language} onExit={() => setGame(null)} />
    if (game === 'article' && p.language !== 'en') return <ArticleDrill language={p.language} vocabulary={p.vocabulary} states={p.states} onExit={() => setGame(null)} onChanged={p.onChanged} />
    if (game === 'dictation') return <NativeDictation language={p.language} vocabulary={p.vocabulary} states={p.states} onExit={() => setGame(null)} />
    if (game === 'pairs') return <PairsGame {...p} best={records[`pairs:${p.language}`]} recordKey={`pairs:${p.language}`} onExit={() => setGame(null)} />
    if (game === 'fluency')
      return <FluencyGame {...p} best={records[fluencyKey]} last={records[`${fluencyKey}:last`]} recordKey={fluencyKey} onExit={() => setGame(null)} />
    if (game === 'blitz') return <BlitzGame {...p} best={records[blitzKey]} bestTyped={records[`${blitzKey}:typed`]} recordKey={blitzKey} onExit={() => setGame(null)} />
    return null
  })()
  if (active) return <div className="game-stage">{active}</div>

  const learnFirst = 'Önce birkaç kelime öğren'
  const accentCount = accentedWords(p.vocabulary).length
  const record = (key: string, show: (v: number) => string) => (records[key] ? `Rekorun: ${show(records[key])}` : 'Henüz rekor yok')
  const groups: { title: string; tone: 'review' | 'listen' | 'speed' | 'grammar'; cards: GameCard[] }[] = [
    {
      title: 'Tekrar',
      tone: 'review',
      cards: [
        { id: 'swipe', emoji: '👆', name: 'Kaydırmalı kartlar', text: 'Anlamı düşün, dokunup bak; bildiysen sağa, bilmediysen sola.', status: p.states.length ? 'Zayıf kelimelerden başlar' : learnFirst, disabled: p.states.length === 0 },
        { id: 'sentences', emoji: '💬', name: 'Cümle kartları', text: 'Okurken kaydettiğin cümleler: boşluk, dikte ve çeviri.', status: dueSentenceCount ? `${dueSentenceCount} cümle tekrar bekliyor` : 'Okumada bir kelimeye dokun → Cümleyi kaydet', scheduled: true, due: dueSentenceCount > 0 },
        { id: 'back', emoji: '🔁', name: 'Geri çeviri', text: 'Çevirdiğin cümlelerin Türkçesini gör, kendin yaz; farkı kelime kelime gör.', status: backCount ? `${backCount} cümle hazır` : 'Okurken “Cümlenin Türkçesi”ne bas', disabled: backCount === 0 },
        { id: 'boss', emoji: '⚔️', name: 'Boss savaşları', text: 'Bir türlü oturmayan kelimeleri farklı sorularla yen.', status: `Her zafer +${BOSS_XP} XP`, className: 'game-card-boss' },
        { id: 'audio', emoji: '🎧', name: 'Sesli tekrar', text: 'Ekrana bakmadan dinle: kelime, düşünme payı, anlamı.', status: !canSpeak() ? 'Bu tarayıcıda sesli okuma yok' : p.states.length ? 'Yürürken, yemek yaparken' : learnFirst, disabled: !canSpeak() || p.states.length === 0 },
      ],
    },
    {
      title: 'Dinleme ve telaffuz',
      tone: 'listen',
      cards: [
        { id: 'dictation', emoji: '🎙️', name: 'Gerçek seslerle dikte', text: 'Farklı insanların sesinden gerçek cümleleri dinle ve yaz.', status: online ? 'Her cümle başka bir ses' : 'İnternet gerekir', disabled: !online },
        { id: 'ear', emoji: '🎯', name: 'Kaçırdıkların', text: 'Dikte ederken duymadığın kelimeler, kendi cümleleriyle: dinle ve yaz.', status: !canSpeak() ? 'Bu tarayıcıda sesli okuma yok' : earCount ? `${earCount} kelime` : 'Dikte yaptıkça birikir', disabled: !canSpeak() || earCount === 0 },
        { id: 'pairs', emoji: '👂', name: 'Ses ayırt etme', text: 'Tek sesi farklı iki kelimeden hangisini duydun?', status: canSpeak() ? record(`pairs:${p.language}`, (v) => `%${v}`) : 'Bu tarayıcıda sesli okuma yok', disabled: !canSpeak() },
      ],
    },
    {
      title: 'Hız ve akıcılık',
      tone: 'speed',
      cards: [
        { id: 'match', emoji: '🧩', name: 'Eşleştirme', text: '6 kelimeyi anlamlarıyla en kısa sürede eşleştir.', status: enough ? record(matchKey, fmt) : 'En az 4 kelime gerekiyor', disabled: !enough },
        { id: 'blitz', emoji: '⚡', name: 'Zamana karşı', text: '60 saniyede olabildiğince çok doğru: anlamı seç ya da kelimeyi yaz.', status: enough ? record(blitzKey, (v) => `${v} puan`) : 'En az 4 kelime gerekiyor', disabled: !enough },
        {
          id: 'fluency',
          emoji: '🏎️',
          name: 'Akıcılık turu',
          text: `Sadece iyi bildiklerinle ${FLUENCY_ROUND} soru: düşünmeden hatırla.`,
          status: fluencyWords < FLUENCY_MIN_WORDS ? `İyi bildiğin ${FLUENCY_MIN_WORDS} kelime gerekiyor (şu an ${fluencyWords})` : record(fluencyKey, (v) => `soru başına ${fmt(v)}`),
          disabled: fluencyWords < FLUENCY_MIN_WORDS,
        },
      ],
    },
  ]
  if (p.language !== 'en')
    groups.push({
      title: 'Dilbilgisi',
      tone: 'grammar',
      cards: [
        { id: 'article', emoji: '🏷️', name: 'Artikel antrenmanı', text: `Kendi isimlerinle ${p.language === 'fr' ? 'le/la' : 'el/la'}, en çok karıştırdıkların önce.`, status: 'Hızlı, sırayla', scheduled: true },
        {
          id: 'verbs',
          emoji: '🕰️',
          name: 'Fiil laboratuvarı',
          text: 'Her fiili her zamanda çek: öğren, alıştır, zamana karşı dene, hangi geçmiş zaman olduğunu bul.',
          status: 'Pratik → Fiiller',
          open: p.onOpenVerbs,
        },
        { id: 'gender', emoji: '⚖️', name: 'Cinsiyet kuralları', text: 'Kelimenin sonu artikelini söyler (-tion → la, -age → le).', status: record(`gender:${p.language}`, (v) => `%${v}`) },
        { id: 'accent', emoji: '✍️', name: 'Aksan antrenmanı', text: 'Sadece aksanlı kelimelerin: harfleri görürsün, aksanlarıyla yazarsın.', status: accentCount < ACCENT_MIN_WORDS ? `En az ${ACCENT_MIN_WORDS} aksanlı kelime gerekiyor (${accentCount})` : record(`accent:${p.language}`, (v) => `%${v}`), disabled: accentCount < ACCENT_MIN_WORDS },
      ],
    })

  // One game suggested for today, from what the learner's mistakes and lists point to.
  const open = openMistakes(p.mistakes ?? [])
  const openOf = (types: string[]) => new Set(open.filter((m) => types.includes(m.errorType)).map((m) => m.entryId)).size
  const allCards = groups.flatMap((g) => g.cards.map((c) => ({ ...c, tone: g.tone })))
  const pickCard = (id: string) => allCards.find((c) => c.id === id && !c.disabled)
  const suggestion =
    (openOf(['accent']) >= 2 && pickCard('accent') && { card: pickCard('accent')!, why: `${openOf(['accent'])} kelimede aksan hatan var: aksanlarını yerleştirerek düzelt.` }) ||
    (openOf(['gender', 'article']) >= 2 && pickCard('article') && { card: pickCard('article')!, why: `${openOf(['gender', 'article'])} kelimede artikel hatan var: kısa bir artikel turu iyi gelir.` }) ||
    (dueSentenceCount > 0 && pickCard('sentences') && { card: pickCard('sentences')!, why: `${dueSentenceCount} cümle kartının tekrar zamanı geldi.` }) ||
    (open.length >= 3 && pickCard('boss') && { card: pickCard('boss')!, why: 'Bir türlü oturmayan kelimelerin var: farklı sorularla yenme zamanı.' }) ||
    (fluencyWords >= FLUENCY_MIN_WORDS && pickCard('fluency') && { card: pickCard('fluency')!, why: 'İyi bildiğin kelimeler hız kazanınca konuşurken akıcı gelir.' }) ||
    (pickCard('match') && { card: pickCard('match')!, why: 'Kısa ve eğlenceli bir ısınma: 6 kelimeyi anlamlarıyla eşleştir.' }) ||
    null

  return (
    <div className="stack">
      <PageHeader
        title="Oyunlar"
        sub={
          <>
            Tekrar zamanı gelmiş kelimeler oyunlarda da tekrar sayılır ve önce onlar gelir; diğer cevaplar pratiktir. <span className="game-tag">takvime işler</span> etiketliler her zaman tekrar yerine geçer.
          </>
        }
      />
      {p.dayDue && p.dayDue.reviews > 0 && p.onStartDay && (
        <div className="note row games-day-first" role="status">
          <span>
            Önce bugünkü görevin: <strong>{p.dayDue.reviews} tekrar</strong> bekliyor (yaklaşık {Math.max(1, p.dayDue.minutes)} dk). Oyunlarda da sayılırlar, ama oturum hepsini doğru sırayla ve yazarak da sorar.
          </span>
          <button type="button" className="btn btn-sm" onClick={p.onStartDay}>
            Başlat
          </button>
        </div>
      )}
      {suggestion && (
        <section className={`game-suggest tone-${suggestion.card.tone}`}>
          <span className="game-suggest-icon" aria-hidden>
            <Glyph emoji={suggestion.card.emoji} size={30} />
          </span>
          <div className="game-suggest-body">
            <span className="small game-suggest-kicker">Bugün için önerilen</span>
            <h2 className="game-suggest-title">{suggestion.card.name}</h2>
            <p className="small muted">{suggestion.why}</p>
          </div>
          <button className="btn" onClick={() => (suggestion.card.open ? suggestion.card.open() : setGame(suggestion.card.id as Game))}>
            <PlayIcon size={16} /> Oyna
          </button>
        </section>
      )}
      {groups.map((g) => (
        <section className={`stack game-group tone-${g.tone}`} key={g.title}>
          <h2 className="section-title game-group-title">{g.title}</h2>
          <div className="game-cards">
            {g.cards.map((c) => (
              <button key={c.id} className={`game-card${c.className ? ` ${c.className}` : ''}${c.due ? ' is-due' : ''}`} disabled={c.disabled} onClick={() => (c.open ? c.open() : setGame(c.id as Game))}>
                <span className="game-emoji" aria-hidden>
                  <Glyph emoji={c.emoji} size={26} />
                </span>
                {/* The same sign, large and faint in the corner: each card its own face. */}
                <span className="game-watermark" aria-hidden>
                  <Glyph emoji={c.emoji} size={96} />
                </span>
                <strong>{c.name}</strong>
                <span className="small muted">{c.text}</span>
                <span className={`game-record${c.status.startsWith('Rekorun') ? ' has-record' : ''}`}>
                  {c.status.startsWith('Rekorun') && <TrophyIcon size={15} className="inline-icon" />}
                  {c.status}
                  {c.scheduled && <span className="game-tag">takvime işler</span>}
                </span>
              </button>
            ))}
          </div>
        </section>
      ))}
    </div>
  )
}

interface GameCard {
  id: Exclude<Game, null> | 'verbs'
  emoji: string
  /** Opens somewhere else instead of starting a game here. */
  open?: () => void
  name: string
  /** What you do, in one line. */
  text: string
  /** Record, what's waiting, or why it can't start yet. */
  status: string
  disabled?: boolean
  /** Counts as a scheduled review rather than practice. */
  scheduled?: boolean
  /** Something is waiting here. */
  due?: boolean
  className?: string
}
