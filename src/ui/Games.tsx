import '../lazy.css'
import { useEffect, useState } from 'react'
import { openMistakes } from '../engine/mistakes'
import { BOSS_XP, findBosses, type BossWin } from '../engine/bosses'
import { GameIcon } from './GameIcon'
import { PlayIcon, TrophyIcon } from './icons'
import { FLUENCY_MIN_WORDS, pickFluencyWords } from '../engine/practice'
import { createRng } from '../engine/rng'
import { db } from '../data/instance'
import { SentencesGame } from './Sentences'
import { NativeDictation } from './NativeDictation'
import { BackTranslation } from './BackTranslation'
import { EarMissesGame } from './EarMisses'
import { PronPractice } from './PronPractice'
import { azureEnabled } from './pronunciation'
import { weakPronWords } from '../engine/pronWeak'
import { stillMissed } from '../engine/earMisses'
import { loadBackItems } from '../data/backItems'
import { loopItems } from '../engine/backTranslation'
import { ArticleDrill } from './ArticleDrill'
import { GrammarPractice } from './games/GrammarPractice'
import { ReflexRound } from './games/ReflexRound'
import { TrapRound } from './games/TrapRound'
import { RegisterRound } from './games/RegisterRound'
import { registerItems } from '../data/register'
import { FlowRound } from './games/FlowRound'
import { AffixHunt } from './games/AffixHunt'
import { flowItems } from '../data/flow'
import { trapWords } from '../data/traps'
import { grammarExercises } from '../data/grammar'
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
import { TrueFalseGame } from './games/TrueFalseGame'
import { PracticeTest } from './games/PracticeTest'
import { GravityGame } from './games/GravityGame'
import { NotesQuiz } from './games/NotesQuiz'
import { DiagramGame } from './games/DiagramGame'
import { useAi } from './aiContext'
import { AudioReview } from './games/AudioReview'
import { BossArena } from './games/BossArena'
import { PageHeader } from './PageHeader'
import { recordVisit } from './screenUsage'
import type { GameId } from './gameList'

type Game = GameId | null

export function GamesScreen(
  p: Props & {
    initialGame?: Game
    /** Told when a game opens or closes, so the app's screen (and the Back button) follows. */
    onGameChange?: (game: Game) => void
    /** Opens the verb lab (the conjugation practice lives there). */
    onOpenVerbs?: () => void
    /** The day's reviews still waiting, and the way to start the day's session. */
    dayDue?: { reviews: number; minutes: number }
    onStartDay?: () => void
  },
) {
  const [game, show] = useState<Game>(p.initialGame ?? null)
  const setGame = (g: Game) => {
    show(g)
    p.onGameChange?.(g)
  }
  // The screen can change the game too: Back from a game, or a link into one.
  useEffect(() => {
    show(p.initialGame ?? null)
  }, [p.initialGame])
  // Whether a word has become a boss yet: until then the card says so instead of opening an empty page.
  const [bossWins, setBossWins] = useState<BossWin[] | null>(null)
  useEffect(() => {
    let live = true
    void db.getBossWins().then((w) => live && setBossWins(w))
    return () => {
      live = false
    }
  }, [])
  const bossCount = bossWins ? findBosses(p.vocabulary, p.states, p.mistakes ?? [], bossWins).length : -1
  // Which games are played, counted on this device (Ayarlar → Kullanım).
  useEffect(() => {
    if (game) recordVisit(`games:${game}`)
    // A game opens at its top, not where the list was scrolled to.
    window.scrollTo(0, 0)
  }, [game])
  const [dueSentenceCount, setDueSentenceCount] = useState(0)
  useEffect(() => {
    void db.getSentences().then((all) => setDueSentenceCount(dueSentences(all, p.language, new Date()).length))
  }, [p.language, game])
  // Sentences translated and not yet written back (back-translation).
  const [backCount, setBackCount] = useState(0)
  const [backRested, setBackRested] = useState(0)
  useEffect(() => {
    void loadBackItems(p.language).then((items) => (setBackCount(items.length), setBackRested(loopItems(items, new Date()).length)))
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

  // Words whose pronunciation score is still low (only with an Azure key).
  const [pronCount, setPronCount] = useState(0)
  useEffect(() => {
    void db.getAllPronScores().then((scores) => setPronCount(weakPronWords(scores, p.vocabulary, p.language, 50).length))
  }, [p.language, p.vocabulary, game])

  const enough = p.vocabulary.length >= 4
  const matchKey = `match:${p.language}`
  const blitzKey = `blitz:${p.language}`
  const fluencyKey = `fluency:${p.language}`
  const fluencyWords = pickFluencyWords(p.vocabulary, p.states, createRng(1)).length
  const online = useOnline()
  const { apiKey: aiKey } = useAi()

  // The game being played, in a stage that (on phones) puts its answer buttons within thumb reach.
  const active = (() => {
    if (game === 'accent') return <AccentGame {...p} best={records[`accent:${p.language}`]} recordKey={`accent:${p.language}`} onExit={() => setGame(null)} />
    if (game === 'match') return <MatchGame {...p} best={records[matchKey]} recordKey={matchKey} onExit={() => setGame(null)} />
    if (game === 'gender' && p.language !== 'en')
      return <GenderGame {...p} language={p.language} best={records[`gender:${p.language}`]} recordKey={`gender:${p.language}`} onExit={() => setGame(null)} />
    if (game === 'boss') return <BossArena {...p} onExit={() => setGame(null)} />
    if (game === 'audio') return <AudioReview {...p} onExit={() => setGame(null)} />
    if (game === 'swipe') return <SwipeCards {...p} onExit={() => setGame(null)} />
    if (game === 'truefalse') return <TrueFalseGame {...p} onExit={() => setGame(null)} />
    if (game === 'test') return <PracticeTest {...p} onExit={() => setGame(null)} />
    if (game === 'gravity') return <GravityGame {...p} onExit={() => setGame(null)} />
    if (game === 'diagram') return <DiagramGame language={p.language} vocabulary={p.vocabulary} onChanged={p.onChanged} onExit={() => setGame(null)} />
    if (game === 'notes') return <NotesQuiz language={p.language} onExit={() => setGame(null)} />
    if (game === 'sentences') return <SentencesGame language={p.language} onExit={() => setGame(null)} />
    if (game === 'ear') return <EarMissesGame language={p.language} onExit={() => setGame(null)} />
    if (game === 'pron') return <PronPractice language={p.language} vocabulary={p.vocabulary} onExit={() => setGame(null)} />
    if (game === 'back') return <BackTranslation language={p.language} onExit={() => setGame(null)} />
    if (game === 'register') return <RegisterRound language={p.language} onExit={() => setGame(null)} />
    if (game === 'affix') return <AffixHunt language={p.language} onExit={() => setGame(null)} />
    if (game === 'flow') return <FlowRound language={p.language} onExit={() => setGame(null)} />
    if (game === 'traps') return <TrapRound language={p.language} onExit={() => setGame(null)} />
    if (game === 'reflex') return <ReflexRound language={p.language} onExit={() => setGame(null)} />
    if (game === 'grammar') return <GrammarPractice language={p.language} onExit={() => setGame(null)} />
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
        { id: 'truefalse', emoji: '✅', name: 'Doğru mu, yanlış mı?', text: 'Kelimenin yanındaki anlam doğru mu, başka bir kelimenin mi? Hızlı, tek elle.', status: p.vocabulary.length >= 3 ? 'Yarısı doğru, yarısı tuzak' : learnFirst, disabled: p.vocabulary.length < 3 },
        { id: 'test', emoji: '📋', name: 'Deneme sınavı', text: 'Kendi kelimelerinden karışık sınav: seçmeli, yazma, doğru/yanlış, eşleştirme.', status: p.vocabulary.length >= 3 ? 'Yanlışlarınla yeni sınav kurulur' : learnFirst, disabled: p.vocabulary.length < 3 },
        ...(aiKey
          ? [{ id: 'notes' as const, emoji: '🗒️', name: 'Notlarından sınav', text: 'Ders notunu yapıştır; YZ içinden çoktan seçmeli sorular hazırlasın, her cevapta nedeni gör.', status: online ? 'YZ ile, notun kaydedilmez' : 'İnternet gerekir', disabled: !online }]
          : []),
        { id: 'diagram', emoji: '🖼️', name: 'Resim etiketleme', text: 'Bir çizim, fotoğraf ya da haritaya kelimeleri yerleştir; nokta nokta çalış.', status: 'Kendi resimlerinle' },
        { id: 'sentences', emoji: '💬', name: 'Cümle kartları', text: 'Okurken kaydettiğin cümleler: boşluk, dikte ve çeviri.', status: dueSentenceCount ? `${dueSentenceCount} cümle tekrar bekliyor` : 'Okumada bir kelimeye dokun → Cümleyi kaydet', scheduled: true, due: dueSentenceCount > 0 },
        { id: 'back', emoji: '🔁', name: 'Geri çeviri', text: 'Çevirdiğin cümlelerin Türkçesini gör, kendin yaz (en iyisi ertesi gün); farkı kelime kelime gör.', status: backCount ? `${backCount} cümle hazır${backRested ? ` · ${backRested} tanesi önceki günlerden` : ''}` : 'Okurken “Cümlenin Türkçesi”ne bas', disabled: backCount === 0 },
        { id: 'boss', emoji: '⚔️', name: 'Boss savaşları', text: 'Bir türlü oturmayan kelimeleri farklı sorularla yen.', status: bossCount === 0 ? 'Henüz boss yok: bir kelime sık yanlış olunca belirir' : `Her zafer +${BOSS_XP} XP`, className: 'game-card-boss', disabled: bossCount === 0 },
        { id: 'audio', emoji: '🎧', name: 'Sesli tekrar', text: 'Ekrana bakmadan dinle: kelime, düşünme payı, anlamı.', status: !canSpeak() ? 'Bu tarayıcıda sesli okuma yok' : p.states.length ? 'Yürürken, yemek yaparken' : learnFirst, disabled: !canSpeak() || p.states.length === 0 },
      ],
    },
    {
      title: 'Dinleme ve telaffuz',
      tone: 'listen',
      cards: [
        { id: 'dictation', emoji: '📝', name: 'Gerçek seslerle dikte', text: 'Farklı insanların sesinden gerçek cümleleri dinle ve yaz.', status: online ? 'Her cümle başka bir ses' : 'İnternet gerekir', disabled: !online },
        { id: 'ear', emoji: '🦻', name: 'Kaçırdıkların', text: 'Dikte ederken duymadığın kelimeler, kendi cümleleriyle: dinle ve yaz.', status: !canSpeak() ? 'Bu tarayıcıda sesli okuma yok' : earCount ? `${earCount} kelime` : 'Dikte yaptıkça birikir', disabled: !canSpeak() || earCount === 0 },
        ...(azureEnabled()
          ? [{ id: 'pron' as const, emoji: '🗣️', name: 'Telaffuz çalışması', text: 'Puanı düşük kalan kelimeleri söyle ve puanla; iyileşenler listeden çıkar.', status: pronCount ? `${pronCount} kelime zayıf` : 'Kelime sayfasında puanladıkça birikir', disabled: pronCount === 0 }]
          : []),
        { id: 'pairs', emoji: '👂', name: 'Ses ayırt etme', text: 'Tek sesi farklı iki kelimeden hangisini duydun?', status: canSpeak() ? record(`pairs:${p.language}`, (v) => `%${v}`) : 'Bu tarayıcıda sesli okuma yok', disabled: !canSpeak() },
      ],
    },
    {
      title: 'Hız ve akıcılık',
      tone: 'speed',
      cards: [
        { id: 'match', emoji: '🧩', name: 'Eşleştirme', text: '6 kelimeyi anlamlarıyla en kısa sürede eşleştir.', status: enough ? record(matchKey, fmt) : 'En az 4 kelime gerekiyor', disabled: !enough },
        { id: 'reflex', emoji: '⚡', name: 'Refleks turu', text: 'Günlük kalıpların Türkçesi çıkar; karşılığını 3 saniyede seç.', status: 'Konuşurken çabuk gelmesi için' },
        { id: 'gravity', emoji: '☄️', name: 'Yerçekimi', text: 'Anlamlar yukarıdan düşer; yere değmeden kelimeyi yaz. Üç canın var.', status: enough ? 'Düştükçe hızlanır' : 'En az 4 kelime gerekiyor', disabled: !enough },
        { id: 'blitz', emoji: '⏱️', name: 'Zamana karşı', text: '60 saniyede olabildiğince çok doğru: anlamı seç ya da kelimeyi yaz.', status: enough ? record(blitzKey, (v) => `${v} puan`) : 'En az 4 kelime gerekiyor', disabled: !enough },
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
  const grammarCard: GameCard = { id: 'grammar', emoji: '📐', name: 'Dilbilgisi soruları', text: 'Boşluk doldur, seçeneği seç, hatalı kelimeyi bul; her cevapta kuralı Türkçe gör.', status: `${grammarExercises(p.language).length} soru · B1–C1` }
  const trapCard: GameCard = { id: 'traps', emoji: '⚠️', name: 'Tuzak kelimeler', text: 'Başka bir kelimeye benzeyip başka şey diyenler: gerçek anlamı seç.', status: `${trapWords.filter((t) => t.language === p.language).length} kelime` }
  const registerCard: GameCard = { id: 'register', emoji: '🎭', name: 'Kayıt farkı', text: 'Sokakta, standart ve resmî: durumu oku, ortama uyan söyleyişi seç.', status: `${registerItems.filter((r) => r.language === p.language).length} düşünce` }
  const flowCard: GameCard = { id: 'flow', emoji: '🧱', name: 'Metin akışı', text: 'Paragrafta eksik bağlaçları yerleştir: zıtlık, neden, taviz.', status: `${flowItems.filter((r) => r.language === p.language).length} paragraf` }
  const affixCard: GameCard = { id: 'affix', emoji: '🌱', name: 'Ek avı', text: 'Bir kelime ve türevi: hangi ek ya da ön ek getirir? Kelimeyi sen kur.', status: 'Kendi kelimelerinden' }
  if (p.language === 'en') groups.push({ title: 'Dilbilgisi', tone: 'grammar', cards: [grammarCard, trapCard, registerCard, flowCard, affixCard] })
  else
    groups.push({
      title: 'Dilbilgisi',
      tone: 'grammar',
      cards: [
        grammarCard,
        trapCard,
        registerCard,
        flowCard,
        affixCard,
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
            <GameIcon id={suggestion.card.id} emoji={suggestion.card.emoji} size={30} />
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
                  <GameIcon id={c.id} emoji={c.emoji} size={28} />
                </span>
                {/* The same sign, large and faint in the corner: each card its own face. */}
                <span className="game-watermark" aria-hidden>
                  <GameIcon id={c.id} emoji={c.emoji} size={96} />
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
