import { Fragment, useEffect, useState, type ReactNode } from 'react'
import { SPLIT_ABOVE_MINUTES } from '../engine/session'
import { BACKLOG_AT, SHORT_ROUND } from '../engine/dailyPlan'
import { db } from '../data/instance'
import { loadBackItems } from '../data/backItems'
import { dueSentences } from '../engine/sentences'
import type { DailyPlan, NewWordsBlock, PlanReason } from '../engine/dailyPlan'
import type { QuestMetric } from '../engine/quests'
import { SKILLS, type Skill, type TargetLanguage } from '../engine/types'
import { relativeTime } from './format'
import { greetingFor } from './dayPart'
import { pinnedBadges } from '../engine/profileStyle'
import { BoltIcon, SnowflakeIcon } from './icons'
import { HELLO, LANGUAGE_NAME, SKILL_NAME } from './labels'
import { RaceCard } from './Race'
import { CHALLENGE_XP } from '../engine/challenges'
import { InstallHint } from './InstallHint'
import { DayPlant } from './DayPlant'
import { Plant } from './Plant'
import { Ring } from './Ring'
import { useGame } from './game'
import { BadgeMedal } from './Medal'
import { StreakPicture } from './StreakFlame'
import welcomeBanner from '../assets/art/welcome-banner.webp'
import { REPAIR_MIN_SCORE, repairKey } from '../engine/streakRepair'
import { repairTried } from './repairTry'
import { NEW_ART, STAT_ART, TILE_ART } from './drawnArt'
import { Sticker } from './Sticker'
import { DayMark, FocusLine, LevelStrip, QuestIcon } from './HomeParts'
import { useWeather } from '../data/weather'
import { MonologueCard } from './MonologueCard'

const REASON_CHIP: Record<PlanReason, (n: number) => string> = {
  forgotten: (n) => `${n} unutulmak üzere`,
  mistake: (n) => `${n} hatalı`,
  weak: (n) => `${n} zayıf`,
  due: (n) => `${n} tekrar`,
  new: (n) => `${n} yeni`,
  practice: (n) => `${n} pratik`,
}
const REASONS: PlanReason[] = ['forgotten', 'mistake', 'weak', 'due', 'new']

/** Fewer slips than this in a week are not worth a round of their own. */
const WEEK_MISSES_MIN = 3

/** Why no (more) new words today, said plainly so the plan never looks stuck. */
const NEW_BLOCK_TEXT: Record<NewWordsBlock, (n: number) => string> = {
  limit: (n) => `Günlük yeni kelime sınırına ulaştın; ${n} kelime sırada bekliyor.`,
  backlog: (n) => `Önce biriken tekrarlar bitsin; ${n} yeni kelime sırada.`,
  budget: (n) => `Günlük süren doldu; ${n} yeni kelime sırada.`,
  none_left: () => '',
}

const HOME_MORE_KEY = 'kelime-koc:home-more'
/** The daily new words a long day is offered to come down to. */
const LIGHTER_NEW = 8

export function Home({
  language,
  plan,
  profile,
  vocabularyCount,
  learningCount,
  activeVocabulary,
  name,
  dailyXpGoal,
  answeredToday,
  nextReview,
  onEarlyReview,
  openMistakeWords,
  canPractice,
  onStart,
  onRepairStreak,
  onFocusReason,
  onMinutes,
  onAddWords,
  onTrySamples,
  onProfile,
  onStory,
  onReading,
  onGames,
  onShortRound,
  onQuest,
  onSentenceGame,
  formsDue = 0,
  onForms,
  warmup,
  onWarmup,
  verbOfDay,
  onVerbOfDay,
  onMixed,
  mixedDue = 0,
  onExtraNew,
  onPracticeMistakes,
  difficultCount = 0,
  onPracticeDifficult,
  weekMisses = 0,
  onWeekMisses,
  onFreePractice,
  newWordsPerDay,
  onLowerNew,
  extra,
  firstWords,
  timeCard,
  friendsCard,
  garden,
  focus,
  onOpenLists,
  lists = [],
  focusListId,
  onFocusList,
  onOpenList,
  pinned,
  location,
  coordinates,
}: {
  language: TargetLanguage
  plan: DailyPlan
  profile: Record<Skill, number | null>
  vocabularyCount: number
  learningCount: number
  activeVocabulary: number
  name: string
  dailyXpGoal: number
  answeredToday: number
  nextReview?: Date
  /** Review upcoming words before their review time arrives. */
  onEarlyReview?: () => void
  openMistakeWords: number
  canPractice: boolean
  onStart: () => void
  /** Opens the recall exam to win a lost streak back (shown while game.repair offers one). */
  onRepairStreak?: () => void
  /** A round of only one kind of the day's questions (the wrong, the weak, the reviews, the new words). */
  onFocusReason?: (reason: PlanReason) => void
  /** A round that fits N minutes, for a short moment (the most urgent questions). */
  onMinutes?: (minutes: number) => void
  onAddWords: () => void
  /** First run: load the sample words to try the app before adding one's own. */
  onTrySamples?: () => void
  onProfile: () => void
  onStory?: () => void
  onReading?: () => void
  onGames?: () => void
  /** A short round of the most urgent questions, for a pile of reviews too big to face at once. */
  onShortRound?: () => void
  /** Starts the round that fills one of the day's quests (`remaining` answers of its kind to go). */
  onQuest?: (id: QuestMetric, remaining: number) => void
  /** Sentence practice: due sentence cards, else back-translation of the sentences translated. */
  onSentenceGame?: (game: 'sentences' | 'back') => void
  /** Verb forms due for review, and the way to review them. */
  formsDue?: number
  onForms?: () => void
  /** The verb lab's weakest spot ("Présent · nous"), for a short warm-up when no form is due. */
  warmup?: string | null
  onWarmup?: () => void
  /** One of the learner's verbs still being learnt, a new one each day: its table in the lab. */
  verbOfDay?: { verb: string; gloss?: string } | null
  onVerbOfDay?: (verb: string) => void
  /** Reviews due in two or more languages: one interleaved session. */
  onMixed?: () => void
  mixedDue?: number
  onExtraNew: () => void
  onPracticeMistakes: () => void
  /** Words marked hard (the lightning mark) and a practice of just those. */
  difficultCount?: number
  onPracticeDifficult?: () => void
  /** Words missed in the last seven days (a round of them once more). */
  weekMisses?: number
  onWeekMisses?: () => void
  onFreePractice: () => void
  /** The daily new words, and a one-tap way down to LIGHTER_NEW when the day runs long. */
  newWordsPerDay?: number
  onLowerNew?: () => void
  /** Habit nudges shown under the day's mission. */
  extra?: ReactNode
  /** Shown under the empty list's invitation: a word looked up in the dictionary is a good first one. */
  firstWords?: ReactNode
  /** The reading and listening time card (a small section under the day's quests). */
  timeCard?: ReactNode
  /** Friends and their XP today or this week (FriendsCard). */
  friendsCard?: ReactNode
  /** The garden card: up top when plants need water, otherwise with the weekly things. */
  garden?: { node: ReactNode; urgent: boolean } | null
  /** The word list in focus, and the level its new words come from (null: words with no level; undefined: all met). */
  focus?: { name: string; level?: string | null; met?: number; total?: number }
  onOpenLists?: () => void
  /** The learner's lists (with their sizes), the one in focus, and the ways to pick another or open it. */
  lists?: readonly { id: string; name: string; count: number }[]
  focusListId?: string
  onFocusList?: (listId: string | null) => void
  onOpenList?: (listId: string) => void
  /** The badges the learner put on show (ids); they sit beside the greeting and open the profile. */
  pinned?: readonly string[]
  /** Location (city name) for live weather and greetings. */
  location?: string
  /** Coordinates for live weather. */
  coordinates?: { lat: number; lon: number }
}) {
  const now = new Date()
  const { weather } = useWeather(location, coordinates)
  const game = useGame()
  const streak = game?.streak ?? 0
  const earned = new Set(game?.achievements.filter((a) => a.unlocked).map((a) => a.id))
  const showcase = pinnedBadges(pinned, earned).map((id) => game?.achievements.find((a) => a.id === id)).filter((a): a is NonNullable<typeof a> => !!a)
  const hello = `${greetingFor(now)}${name ? `, ${name}` : ''}!`
  const remaining = plan.items.filter((i) => i.kind === 'exercise').length
  // A day over the split length with many new words: the hint suggests fewer, not more.
  // A deep pile of due reviews: not all of it has to be done today; the most urgent few are one tap away.
  const piled = !!onShortRound && plan.dueTotal >= BACKLOG_AT && remaining > SHORT_ROUND
  const long = !!onLowerNew && plan.estimatedMinutes > SPLIT_ABOVE_MINUTES && (newWordsPerDay ?? 0) > LIGHTER_NEW
  // Today's goal = what was already answered + what is still planned, so the ring fills as you go.
  const goal = answeredToday + remaining
  const progress = goal ? answeredToday / goal : 0
  const [moreOpen, setMoreOpen] = useState(() => {
    try {
      const saved = localStorage.getItem(HOME_MORE_KEY)
      if (saved) return saved === '1'
    } catch {
      // Falls back to the screen size.
    }
    // Closed by default: Today is about the day's work; this is a tap away.
    return false
  })
  // Sentence work once the day's reviews are done: the cards due, else sentences to write back.
  const [sentenceWork, setSentenceWork] = useState<{ due: number; back: number } | null>(null)
  const sentencesOn = !!onSentenceGame
  useEffect(() => {
    if (remaining > 0 || !sentencesOn) return
    let live = true
    void Promise.all([db.getSentences(), loadBackItems(language)])
      .then(([cards, back]) => live && setSentenceWork({ due: dueSentences(cards, language, new Date()).length, back: back.length }))
      .catch(() => undefined)
    return () => {
      live = false
    }
  }, [remaining, language, sentencesOn])
  const sentenceTile = remaining === 0 && onSentenceGame && sentenceWork && (sentenceWork.due > 0 || sentenceWork.back > 0) ? sentenceWork : null
  const rememberMore = (open: boolean) => {
    setMoreOpen(open)
    try {
      localStorage.setItem(HOME_MORE_KEY, open ? '1' : '0')
    } catch {
      // Opens closed next time; fine.
    }
  }

  if (vocabularyCount === 0) {
    return (
      <div className="stack welcome">
        <h1 className="greeting"><DayMark now={now} weather={weather} />{hello}</h1>
        <div className="welcome-banner">
          <img src={welcomeBanner} alt="" width={900} height={466} draggable={false} />
          <p className="welcome-banner-text">
            <strong>Merhaba, ben Monki!</strong>
            <span>Kelimelerini birlikte büyütelim.</span>
          </p>
        </div>
        <div className="hero welcome-hero">
          <span className="day-plant welcome-seed">
            <Plant stage={-1} size={56} live />
          </span>
          <div className="hero-body">
            <h2 className="hero-title">{LANGUAGE_NAME[language]} için ilk kelimelerini ekle</h2>
            <p className="hero-sub">Yaz ya da bir listeyi yapıştır. Önce denemek istersen hazır örnek kelimelerle başlayabilirsin.</p>
            <div className="row hero-actions welcome-actions">
              <button className="btn btn-lg" onClick={onAddWords}>
                Kelime ekle
              </button>
              {onTrySamples && (
                <button className="btn btn-lg btn-ghost-on-hero" onClick={onTrySamples}>
                  Örnek kelimelerle dene
                </button>
              )}
            </div>
          </div>
        </div>
        <section aria-labelledby="welcome-steps-title">
          <h2 id="welcome-steps-title" className="section-title">
            Nasıl çalışır?
          </h2>
          <ol className="welcome-steps">
            <li>
              <span className="welcome-step-no" aria-hidden>
                1
              </span>
              <span>
                <strong>Kelimeni ekle</strong>
                <span className="small muted">Yaz, yapıştır ya da bir dosyadan al.</span>
              </span>
            </li>
            <li>
              <span className="welcome-step-no" aria-hidden>
                2
              </span>
              <span>
                <strong>Günde birkaç dakika çalış</strong>
                <span className="small muted">Kısa turlar; hangi kelime ne zaman gelir, uygulama ayarlar.</span>
              </span>
            </li>
            <li>
              <span className="welcome-step-no" aria-hidden>
                3
              </span>
              <span>
                <strong>Kelimen büyüsün</strong>
                <span className="small muted">Her kelime bir bitki: tohumdan çiçeğe, sen çalıştıkça.</span>
              </span>
            </li>
          </ol>
        </section>
        {firstWords}
      </div>
    )
  }

  return (
    <div>
      <div className="greeting-row">
        <h1 className="greeting"><DayMark now={now} weather={weather} />{hello}</h1>
        {showcase.length > 0 && (
          <ul className="today-showcase" aria-label="Rozet vitrini">
            {showcase.map((a) => (
              <li key={a.id}>
                <button type="button" className="showcase-badge" onClick={onProfile} aria-label={`${a.title}: profilde gör`} title={a.title}>
                  <BadgeMedal badge={a} unlocked size={38} />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
      {/* The day at a glance: what's waiting, the streak, and whether today still counts for it. */}
      <ul className="today-status">
        {/* While the card below says how many questions wait, this line does not say it a second time. */}
        {remaining === 0 && (
          <li>
            {answeredToday > 0 ? (
              <>
                <Sticker name="party" className="today-sticker" /> Bugünkü görev tamam
              </>
            ) : (
              <>
                <Sticker name="sleep" className="today-sticker" /> Bugün tekrar yok
              </>
            )}
          </li>
        )}
        <li>
          <StreakPicture streak={streak} size={28} /> {streak > 0 ? <><strong>{streak}</strong> günlük seri</> : 'Seri bugün başlar'}
          {game && (game.freezes ?? 0) > 0 && (
            <span className="freeze-chip small" title={`${game.freezes} gün seri kalkanı devrede: bir gün kaçırsan bile serin sıfırlanmaz`}>
              🛡️ {game.freezes} kalkan
            </span>
          )}
        </li>
        {game?.frozenYesterday && (
          <li className="is-nudge streak-frozen-note" role="status">
            🛡️ Dün çalışamadın ama Seri Kalkanın gün serini korudu! Serin kaldığı yerden devam ediyor.
          </li>
        )}
        {/* The streak counts any language, so today's XP (all languages) says whether it is safe. */}
        {streak > 0 && (game?.xp.today ?? 0) === 0 && remaining > 0 && <li className="is-nudge">Seriyi korumak için bugün bir tur yeter</li>}
        {/* A streak lost a day or two ago can be won back with the recall exam: one try per break. */}
        {game?.repair && onRepairStreak && !repairTried(repairKey(game.repair)) && (
          <li className="is-nudge streak-repair">
            <button type="button" className="link" onClick={onRepairStreak}>
              <img className="nudge-art" src={NEW_ART.streakRepair} alt="" width={30} height={30} draggable={false} />
              {game.repair.lost} günlük serin koptu: hatırlama sınavında %{Math.round(REPAIR_MIN_SCORE * 100)} yap, geri gelsin ›
            </button>
          </li>
        )}
      </ul>

      <div className="home-grid">
      <div className="home-main">
        <div className="hero hero-today">
          {/* The language itself as decoration: a large, faint greeting behind the mission. */}
          <div className="hero-hello-clip" aria-hidden>
            <span className="hero-hello" lang={language}>
              {HELLO[language]}
            </span>
          </div>
          {/* The ring is the way through the task; the plant inside grows with it. */}
          {(() => {
            const done = remaining === 0 && answeredToday > 0
            const value = done ? 1 : progress
            const plant = <DayPlant language={language} progress={value} done={done} />
            return <Ring value={value} doneLabel={plant} label={plant} start={remaining > 0 && answeredToday === 0} />
          })()}
          <div className="hero-body">
            {remaining > 0 ? (
              <>
                <h2 className="hero-title">{answeredToday > 0 ? 'Güzel gidiyor, devam!' : 'Bugünün görevi'}</h2>
                <p className="hero-sub">
                  {remaining} soru · yaklaşık {plan.estimatedMinutes} dakika
                </p>
                <ul className="mission">
                  {REASONS.filter((r) => plan.counts[r] > 0).map((r) => (
                    <li key={r}>
                      {onFocusReason ? (
                        <button type="button" className="mission-chip" title="Yalnızca bunlarla çalış" onClick={() => onFocusReason(r)}>
                          {REASON_CHIP[r](plan.counts[r])}
                        </button>
                      ) : (
                        REASON_CHIP[r](plan.counts[r])
                      )}
                    </li>
                  ))}
                </ul>
                {/* One row of actions: the day, and the shorter way through it when there is one. */}
                <div className="hero-actions">
                  <button className="btn btn-lg" onClick={onStart}>
                    {answeredToday > 0 ? 'Devam et' : 'Başla'}
                  </button>
                  {piled ? (
                    <button type="button" className="btn btn-lg btn-ghost-on-hero" onClick={onShortRound}>
                      <BoltIcon size={18} /> Kısa tur ({SHORT_ROUND} soru)
                    </button>
                  ) : onShortRound ? (
                    <button type="button" className="btn btn-lg btn-ghost-on-hero" onClick={onShortRound} title="En acil kelimelerle 3 dakikalık hızlı seans">
                      <BoltIcon size={18} /> 3 dk hızlı tur
                    </button>
                  ) : null}
                  {!piled && onMinutes && plan.estimatedMinutes > 7 && (
                    <span className="hero-minutes small">
                      Vaktin kısaysa:{' '}
                      {[5, 10]
                        .filter((m) => m + 2 < plan.estimatedMinutes)
                        .map((m, i) => (
                          <Fragment key={m}>
                            {i > 0 && ' · '}
                            <button type="button" className="link" onClick={() => onMinutes(m)}>
                              {m} dakika
                            </button>
                          </Fragment>
                        ))}
                    </span>
                  )}
                </div>
                {piled ? (
                  <p className="small hero-note">
                    {plan.dueTotal} tekrar birikmiş. Hepsini bugün bitirmen gerekmiyor: kısa tur en çok unutulmak üzere olanlarla başlar, kalanı sırada bekler.
                  </p>
                ) : long ? (
                  // A long day is the opposite of a time to add more: the lighter day, one tap away.
                  <p className="small hero-note">
                    Gün uzun. Günlük yeni kelime {newWordsPerDay}; {LIGHTER_NEW}'e indirirsen tekrarların birikmez ve günler kısalır.{' '}
                    <button type="button" className="link" onClick={onLowerNew}>
                      {LIGHTER_NEW}'e indir
                    </button>
                  </p>
                ) : (
                  plan.newBlockedBy &&
                  plan.waitingNew > 0 && (
                    <p className="small hero-note">
                      {plan.newEntryIds.length > 0 && plan.newBlockedBy === 'limit'
                        ? // Said, not urged: more new words a day is what makes days long.
                          `${plan.waitingNew} kelime daha sırada; her gün ${plan.newEntryIds.length} tanesiyle tanışıyorsun.`
                        : NEW_BLOCK_TEXT[plan.newBlockedBy](plan.waitingNew)}
                    </p>
                  )
                )}
                <FocusLine focus={focus} done={!!plan.focusDone} lists={lists} focusListId={focusListId} onFocusList={onFocusList} onOpenList={onOpenList} onOpenLists={onOpenLists} />
              </>
            ) : (
              <>
                <h2 className="hero-title">{answeredToday > 0 ? 'Bugünün görevi tamam!' : 'Bugün tekrar yok'}</h2>
                <p className="hero-sub">
                  {answeredToday > 0 && `Bugün ${answeredToday} soru cevapladın. `}
                  {nextReview && `Sıradaki tekrar ${relativeTime(nextReview)}. `}
                  {plan.waitingNew > 0 && NEW_BLOCK_TEXT[plan.newBlockedBy ?? 'limit'](plan.waitingNew)}
                </p>
                <div className="hero-actions">
                  {nextReview && onEarlyReview && (
                    <button className="btn btn-lg" onClick={onEarlyReview}>
                      Önden tekrar et
                    </button>
                  )}
                  {plan.waitingNew > 0 ? (
                    <button className={nextReview && onEarlyReview ? 'btn btn-quiet' : 'btn btn-lg'} onClick={onExtraNew}>
                      +{Math.min(5, plan.waitingNew)} yeni kelime öğren
                    </button>
                  ) : (
                    <button className="btn btn-quiet" onClick={onAddWords}>
                      Kelime ekle
                    </button>
                  )}
                </div>
                <FocusLine focus={focus} done={!!plan.focusDone} lists={lists} focusListId={focusListId} onFocusList={onFocusList} onOpenList={onOpenList} onOpenLists={onOpenLists} />
              </>
            )}
          </div>
        </div>

        {/* One suggestion at a time (a habit, a word looked up, gains, the week, a backup): the first that has something to say. */}
        <div className="home-nudges">{extra}</div>
        {garden?.urgent && garden.node}
        <MonologueCard language={language} />

        {(openMistakeWords > 0 || weekMisses >= WEEK_MISSES_MIN || difficultCount > 0 || !!sentenceTile || (remaining === 0 && (canPractice || onGames || (!!nextReview && !!onEarlyReview))) || onStory || onReading || onMixed || (formsDue > 0 && onForms) || (!!warmup && onWarmup) || (!!verbOfDay && onVerbOfDay)) && (
          <section className="section stack">
            <h2 className="section-title">Ek çalışma</h2>
            <div className="tiles">
              {remaining === 0 && nextReview && onEarlyReview && (
                <button className="tile" onClick={onEarlyReview}>
                  <img className="tile-art" src={TILE_ART.early} alt="" draggable={false} />
                  <span className="tile-text">
                    <strong>Önden tekrar</strong>
                    <span className="small muted">Vadesi yaklaşan kelimeleri şimdiden çalış · sıradaki {relativeTime(nextReview)}</span>
                  </span>
                </button>
              )}
              {openMistakeWords > 0 && (
                <button className="tile" onClick={onPracticeMistakes}>
                  <img className="tile-art" src={TILE_ART.mistakes} alt="" draggable={false} />
                  <span className="tile-text">
                    <strong>Hatalarını düzelt</strong>
                    <span className="small muted">{openMistakeWords} kelimede açık hata</span>
                  </span>
                </button>
              )}
              {weekMisses >= WEEK_MISSES_MIN && onWeekMisses && (
                <button className="tile" onClick={onWeekMisses}>
                  <img className="tile-art" src={TILE_ART.weekMisses} alt="" draggable={false} />
                  <span className="tile-text">
                    <strong>Bu haftanın hataları</strong>
                    <span className="small muted">Son 7 günde yanıldığın {weekMisses} kelime · yaklaşık 5 dk</span>
                  </span>
                </button>
              )}
              {difficultCount > 0 && onPracticeDifficult && (
                <button className="tile" onClick={onPracticeDifficult}>
                  <img className="tile-art" src={TILE_ART.difficult} alt="" draggable={false} />
                  <span className="tile-text">
                    <strong>Zor kelimelerin</strong>
                    <span className="small muted">{difficultCount} kelime zor diye işaretli: ayrı bir çalışmada topla</span>
                  </span>
                </button>
              )}
              {sentenceTile && onSentenceGame && (
                <button className="tile" onClick={() => onSentenceGame(sentenceTile.due > 0 ? 'sentences' : 'back')}>
                  <img className="tile-art" src={sentenceTile.due > 0 ? TILE_ART.sentences : TILE_ART.back} alt="" draggable={false} />
                  <span className="tile-text">
                    {sentenceTile.due > 0 ? (
                      <>
                        <strong>Cümle kartları</strong>
                        <span className="small muted">{sentenceTile.due} cümle tekrar bekliyor: boşluk, dikte ve çeviri</span>
                      </>
                    ) : (
                      <>
                        <strong>Geri çeviri</strong>
                        <span className="small muted">Çevirdiğin {sentenceTile.back} cümle hazır: Türkçesinden kendin yaz</span>
                      </>
                    )}
                  </span>
                </button>
              )}
              {onStory && (
                <button className="tile" onClick={onStory}>
                  <img className="tile-art" src={TILE_ART.story} alt="" draggable={false} />
                  <span className="tile-text">
                    <strong>Hikayenin yeni bölümü</strong>
                    <span className="small muted">Zorlandığın kelimelerle yazılır</span>
                  </span>
                </button>
              )}
              {onReading && (
                <button className="tile" onClick={onReading}>
                  <img className="tile-art" src={TILE_ART.news} alt="" draggable={false} />
                  <span className="tile-text">
                    <strong>Günün mikro haberi</strong>
                    <span className="small muted">
                      {language === 'fr'
                        ? 'RFI Savoirs · 2 dakikalık kolay bülten ve transkript'
                        : language === 'es'
                          ? 'Radio Ambulante / VOA · Güncel kolay haber'
                          : 'VOA Learning English · 2 dakikalık mikro bülten'}
                    </span>
                  </span>
                </button>
              )}
              {formsDue > 0 && onForms && (
                <button className="tile" onClick={onForms}>
                  <img className="tile-art" src={TILE_ART.verbs} alt="" draggable={false} />
                  <span className="tile-text">
                    <strong>Fiil çekimi tekrarı</strong>
                    <span className="small muted">{formsDue} çekim unutulmak üzere · yaklaşık 2 dk</span>
                  </span>
                </button>
              )}
              {formsDue === 0 && warmup && onWarmup && (
                <button className="tile" onClick={onWarmup}>
                  <img className="tile-art" src={TILE_ART.verbs} alt="" draggable={false} />
                  <span className="tile-text">
                    <strong>Fiil ısınması</strong>
                    <span className="small muted">
                      En çok karıştırdığın: <span lang={language}>{warmup}</span>. Kısa bir hedefli tur (yaklaşık 2 dk)
                    </span>
                  </span>
                </button>
              )}
              {formsDue === 0 && !(warmup && onWarmup) && verbOfDay && onVerbOfDay && (
                <button className="tile" onClick={() => onVerbOfDay(verbOfDay.verb)}>
                  <img className="tile-art" src={TILE_ART.verbs} alt="" draggable={false} />
                  <span className="tile-text">
                    <strong>
                      Günün fiili: <span lang={language}>{verbOfDay.verb}</span>
                    </strong>
                    <span className="small muted">{verbOfDay.gloss ? `${verbOfDay.gloss} · ` : ''}tablo ve kısa bir alıştırma</span>
                  </span>
                </button>
              )}
              {onMixed && (
                <button className="tile" onClick={onMixed}>
                  <img className="tile-art" src={TILE_ART.mixed} alt="" draggable={false} />
                  <span className="tile-text">
                    <strong>Karışık tekrar</strong>
                    <span className="small muted">Üç dilden {mixedDue} tekrar, tek oturumda karışık</span>
                  </span>
                </button>
              )}
              {remaining === 0 && onGames && (
                <button className="tile" onClick={onGames}>
                  <img className="tile-art" src={TILE_ART.games} alt="" draggable={false} />
                  <span className="tile-text">
                    <strong>Oyunlar</strong>
                    <span className="small muted">Tekrar, dinleme, hız ve dilbilgisi oyunları</span>
                  </span>
                </button>
              )}
              {remaining === 0 && canPractice && (
                <button className="tile" onClick={onFreePractice}>
                  <img className="tile-art" src={TILE_ART.free} alt="" draggable={false} />
                  <span className="tile-text">
                    <strong>Serbest pratik</strong>
                    <span className="small muted">Stressiz, hiçbir şeyi etkilemez</span>
                  </span>
                </button>
              )}
            </div>
          </section>
        )}

        {/* The rest is useful now and then: open on wide screens (room beside the side column), closed on phones; the choice is remembered. */}
        <details className="home-more" open={moreOpen} onToggle={(e) => rememberMore(e.currentTarget.open)}>
          <summary className="section-title">Haftalık hedefler, bahçe ve beceriler</summary>
          <div className="stack">
            {game && game.weekly.length > 0 && (
              <section className="quests">
                <h2 className="section-title">Haftanın meydan okumaları</h2>
                <ul className="quest-list">
                  {game.weekly.map((q) => (
                    <li key={q.id} className={q.done ? 'is-done' : ''}>
                      <QuestIcon quest={q} />
                      <span className="quest-body">
                        <span className="quest-top">
                          <strong>{q.title}</strong>
                          <span className="small muted">
                            {q.value}/{q.target}
                          </span>
                        </span>
                        <span className="quest-bar">
                          <span style={{ width: `${(q.value / q.target) * 100}%` }} />
                        </span>
                      </span>
                      <span className="quest-xp">+{CHALLENGE_XP} XP</span>
                    </li>
                  ))}
                </ul>
              </section>
            )}
            {game && <RaceCard game={game} />}
            {garden && !garden.urgent && garden.node}
            <section className="section stack">
              <h2 className="section-title">Beceriler</h2>
              <div className="bars">
                {SKILLS.filter((s) => s !== 'gender' || profile.gender !== null).map((s) => (
                  <div className="bar-row" key={s}>
                    <span>{SKILL_NAME[s]}</span>
                    <div className="bar-track">
                      <div className="bar-fill" style={{ width: `${profile[s] ?? 0}%` }} />
                    </div>
                    <span className="bar-value">{profile[s] === null ? 'henüz yok' : `%${profile[s]}`}</span>
                  </div>
                ))}
              </div>
              <p className="small muted">Yüzde, o becerideki kelimeleri şu an hatırlama olasılığın.</p>
            </section>
          </div>
        </details>
      </div>
      <div className="home-side">
        {/* Level and the three numbers as one card, not four. */}
        <section className="status-card">
        {game && <LevelStrip game={game} dailyXpGoal={dailyXpGoal} onProfile={onProfile} />}

        <div className="stats">
          <div className="stat">
            <span className="stat-value">
              <StreakPicture streak={streak} size={28} /> {streak}
              {(game?.freezes ?? 0) > 0 && (
                <span className="freeze" title="Seri dondurma: çalışamadığın bir günde serini otomatik korur. 7 günlük her seride bir tane kazanırsın.">
                  <SnowflakeIcon size={15} className="inline-icon" />{game!.freezes}
                </span>
              )}
            </span>
            <span className="stat-label">günlük seri</span>
          </div>
          <div className="stat">
            <span className="stat-value">
              <img className="stat-art-img" src={STAT_ART.star} alt="" height={26} width={26} draggable={false} /> {activeVocabulary}
            </span>
            <span className="stat-label">aktif kelime</span>
          </div>
          <div className="stat">
            <span className="stat-value">
              <img className="stat-art-img" src={STAT_ART.book} alt="" height={26} width={26} draggable={false} /> {learningCount}
              <span className="small muted stat-total">/{vocabularyCount}</span>
            </span>
            <span className="stat-label">kelime öğreniliyor</span>
          </div>
        </div>
        </section>

        <InstallHint />
        {game && (
          <section className="quests">
            <h2 className="section-title">Günün görevleri</h2>
            <ul className="quest-list">
              {game.quests.map((q) => {
                const row = (
                  <>
                    <QuestIcon quest={q} />
                    <span className="quest-body">
                      <span className="quest-top">
                        <strong>{q.title}</strong>
                        <span className="small muted">
                          {q.value}/{q.target}
                        </span>
                      </span>
                      <span className="quest-bar">
                        <span style={{ width: `${(q.value / q.target) * 100}%` }} />
                      </span>
                    </span>
                    <span className="quest-xp">+{q.xp} XP</span>
                  </>
                )
                // A quest still open starts the round that fills it.
                return onQuest && !q.done ? (
                  <li key={q.id} className="is-go">
                    <button type="button" className="quest-row" onClick={() => onQuest(q.id, q.target - q.value)} title="Bu görevi tamamlayacak çalışmayı başlat">
                      {row}
                    </button>
                  </li>
                ) : (
                  <li key={q.id} className={q.done ? 'is-done' : ''}>
                    {row}
                  </li>
                )
              })}
            </ul>
          </section>
        )}
        {timeCard}
        {friendsCard}

      </div>
      </div>
    </div>
  )
}
