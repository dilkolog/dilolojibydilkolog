import { useEffect, useState, type ReactNode } from 'react'
import { SPLIT_ABOVE_MINUTES } from '../engine/session'
import { BACKLOG_AT, SHORT_ROUND } from '../engine/dailyPlan'
import { db } from '../data/instance'
import { loadBackItems } from '../data/backItems'
import { dueSentences } from '../engine/sentences'
import { useCountUp } from './useCountUp'
import { Glyph } from './Glyph'
import { type DailyPlan, type NewWordsBlock, type PlanReason } from '../engine/dailyPlan'

import type { QuestMetric } from '../engine/quests'
import { SKILLS, type Skill, type TargetLanguage } from '../engine/types'

import { relativeTime } from './format'
import { greetingFor, dayPart } from './dayPart'
import { pinnedBadges } from '../engine/profileStyle'
import { AlertIcon, MoonIcon, SunIcon, BookIcon, CheckCircleIcon, CheckIcon, GameIcon, MessageIcon, ShuffleIcon, SnowflakeIcon, SparkleIcon, StarIcon, StoryIcon, TargetIcon, TenseIcon, SunriseIcon, VerbReviewIcon } from './icons'
import { HELLO, LANGUAGE_NAME, SKILL_NAME } from './labels'

import { RaceCard } from './Race'
import { CHALLENGE_XP } from '../engine/challenges'
import { InstallHint } from './InstallHint'

import { DayPlant } from './DayPlant'
import { Ring } from './Ring'

import { useGame, type GameState } from './game'

import { Medal } from './Medal'
import { medalTier } from '../engine/gamification'
import { StreakFlame } from './StreakFlame'

const REASON_CHIP: Record<PlanReason, (n: number) => string> = {
  forgotten: (n) => `${n} unutulmak üzere`,
  mistake: (n) => `${n} hatalı`,
  weak: (n) => `${n} zayıf`,
  due: (n) => `${n} tekrar`,
  new: (n) => `${n} yeni`,
  practice: (n) => `${n} pratik`,
}
const REASONS: PlanReason[] = ['forgotten', 'mistake', 'weak', 'due', 'new']

/** Why no (more) new words today, said plainly so the plan never looks stuck. */
const NEW_BLOCK_TEXT: Record<NewWordsBlock, (n: number) => string> = {
  limit: (n) => `Günlük yeni kelime sınırına ulaştın; ${n} kelime sırada bekliyor.`,
  backlog: (n) => `Önce biriken tekrarlar bitsin; ${n} yeni kelime sırada.`,
  budget: (n) => `Günlük süren doldu; ${n} yeni kelime sırada.`,
  none_left: () => '',
}

/** Where today's new words come from when a list is in focus, and what to do once it's all met. */
function FocusLine({ focus, done, onOpenLists }: { focus: NonNullable<Parameters<typeof Home>[0]['focus']>; done: boolean; onOpenLists?: () => void }) {
  return (
    <p className="small hero-focus">
      <TargetIcon size={14} className="inline-icon" />
      {done ? (
        <>
          “{focus.name}” listesinin bütün kelimeleriyle tanıştın; yeni kelimeler için başka bir listeye odaklan.{' '}
          {onOpenLists && (
            <button type="button" className="link" onClick={onOpenLists}>
              Listeler
            </button>
          )}
        </>
      ) : (
        <>
          Yeni kelimeler “{focus.name}” listesinden{focus.level ? `, “${focus.level}” seviyesi` : ''}
          {focus.total ? ` (${focus.met}/${focus.total} tanıştın)` : ''}.
        </>
      )}
    </p>
  )
}

/** The light of the hour beside the greeting: the sun high, on the horizon (dawn and dusk), or the moon. */
function DayMark({ now }: { now: Date }) {
  const part = dayPart(now)
  return (
    <span className={`day-mark is-${part}`} aria-hidden>
      {part === 'day' ? (
        <SunIcon size={22} />
      ) : part === 'night' ? (
        <MoonIcon size={22} />
      ) : (
        <SunriseIcon size={22} />
      )}
    </span>
  )
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
  openMistakeWords,
  canPractice,
  onStart,
  onAddWords,
  onTrySamples,
  onProfile,
  onStory,
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
  onFreePractice,
  newWordsPerDay,
  onLowerNew,
  extra,
  firstWords,
  garden,
  focus,
  onOpenLists,
  pinned,
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
  openMistakeWords: number
  canPractice: boolean
  onStart: () => void
  onAddWords: () => void
  /** First run: load the sample words to try the app before adding one's own. */
  onTrySamples?: () => void
  onProfile: () => void
  onStory?: () => void
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
  onFreePractice: () => void
  /** The daily new words, and a one-tap way down to LIGHTER_NEW when the day runs long. */
  newWordsPerDay?: number
  onLowerNew?: () => void
  /** Habit nudges shown under the day's mission. */
  extra?: ReactNode
  /** Shown under the empty list's invitation: a word looked up in the dictionary is a good first one. */
  firstWords?: ReactNode
  /** The garden card: up top when plants need water, otherwise with the weekly things. */
  garden?: { node: ReactNode; urgent: boolean } | null
  /** The word list in focus, and the level its new words come from (null: words with no level; undefined: all met). */
  focus?: { name: string; level?: string | null; met?: number; total?: number }
  onOpenLists?: () => void
  /** The badges the learner put on show (ids); they sit beside the greeting and open the profile. */
  pinned?: readonly string[]
}) {
  const now = new Date()
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
      <div className="stack">
        <h1 className="greeting"><DayMark now={now} />{hello}</h1>
        <div className="hero">
          <div className="hero-body">
            <h2 className="hero-title">{LANGUAGE_NAME[language]} için ilk kelimelerini ekle</h2>
            <p className="hero-sub">Öğrenmek istediğin kelimeleri yaz ya da bir listeyi yapıştır. Önce denemek istersen hazır örnek kelimelerle başlayabilirsin.</p>
            <div className="row hero-actions">
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
        {firstWords}
      </div>
    )
  }

  return (
    <div>
      <div className="greeting-row">
        <h1 className="greeting"><DayMark now={now} />{hello}</h1>
        {showcase.length > 0 && (
          <ul className="today-showcase" aria-label="Rozet vitrini">
            {showcase.map((a) => (
              <li key={a.id}>
                <button type="button" className="showcase-badge" onClick={onProfile} aria-label={`${a.title}: profilde gör`} title={a.title}>
                  <Medal icon={a.icon} tier={medalTier(a)} unlocked size={38} />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
      {/* The day at a glance: what's waiting, the streak, and whether today still counts for it. */}
      <ul className="today-status">
        <li>
          {remaining > 0 ? (
            <>
              <BookIcon size={16} /> <strong>{remaining}</strong> soru seni bekliyor
            </>
          ) : answeredToday > 0 ? (
            <>
              <CheckCircleIcon size={16} /> Bugünkü görev tamam
            </>
          ) : (
            <>
              <CheckCircleIcon size={16} /> Bugün tekrar yok
            </>
          )}
        </li>
        <li>
          <StreakFlame streak={streak} frozen={game?.frozenYesterday} /> {streak > 0 ? <><strong>{streak}</strong> günlük seri</> : 'Seri bugün başlar'}
        </li>
        {/* The streak counts any language, so today's XP (all languages) says whether it is safe. */}
        {streak > 0 && (game?.xp.today ?? 0) === 0 && remaining > 0 && <li className="is-nudge">Seriyi korumak için bugün bir tur yeter</li>}
      </ul>

      <div className="home-grid">
      <div className="home-main">
        <div className="hero hero-today">
          {/* The language itself as decoration: a large, faint greeting behind the mission. */}
          <span className="hero-hello" aria-hidden lang={language}>
            {HELLO[language]}
          </span>
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
                  {remaining} soru, yaklaşık {plan.estimatedMinutes} dakika
                </p>
                <ul className="mission">
                  {REASONS.filter((r) => plan.counts[r] > 0).map((r) => (
                    <li key={r}>{REASON_CHIP[r](plan.counts[r])}</li>
                  ))}
                </ul>
                <button className="btn btn-lg" onClick={onStart} autoFocus>
                  {answeredToday > 0 ? 'Devam et' : 'Başla'}
                </button>
                {focus && <FocusLine focus={focus} done={!!plan.focusDone} onOpenLists={onOpenLists} />}
                {piled ? (
                  <p className="small mt-3 hero-long">
                    {plan.dueTotal} tekrar birikmiş. Hepsini bugün bitirmen gerekmiyor: en çok unutulmak üzere olan {SHORT_ROUND} soruyla başla, kalanı sırada bekler.{' '}
                    <button type="button" className="link" onClick={onShortRound}>
                      Kısa tur ({SHORT_ROUND} soru)
                    </button>
                  </p>
                ) : long ? (
                  // A long day is the opposite of a time to add more: the lighter day, one tap away.
                  <p className="small mt-3 hero-long">
                    Gün uzun. Günlük yeni kelime {newWordsPerDay}; {LIGHTER_NEW}'e indirirsen tekrarların birikmez ve günler kısalır.{' '}
                    <button type="button" className="link" onClick={onLowerNew}>
                      {LIGHTER_NEW}'e indir
                    </button>
                  </p>
                ) : (
                  plan.newBlockedBy &&
                  plan.waitingNew > 0 && (
                    <p className="small muted mt-3">
                      {plan.newEntryIds.length > 0 && plan.newBlockedBy === 'limit'
                        ? // Said, not urged: more new words a day is what makes days long.
                          `${plan.waitingNew} kelime daha sırada; her gün ${plan.newEntryIds.length} tanesiyle tanışıyorsun.`
                        : NEW_BLOCK_TEXT[plan.newBlockedBy](plan.waitingNew)}
                    </p>
                  )
                )}
              </>
            ) : (
              <>
                <h2 className="hero-title">{answeredToday > 0 ? 'Bugünün görevi tamam!' : 'Bugün tekrar yok'}</h2>
                <p className="hero-sub">
                  {answeredToday > 0 && `Bugün ${answeredToday} soru cevapladın. `}
                  {nextReview && `Sıradaki tekrar ${relativeTime(nextReview)}. `}
                  {plan.waitingNew > 0 && NEW_BLOCK_TEXT[plan.newBlockedBy ?? 'limit'](plan.waitingNew)}
                </p>
                {focus && <FocusLine focus={focus} done={!!plan.focusDone} onOpenLists={onOpenLists} />}
                {plan.waitingNew > 0 ? (
                  <button className="btn btn-lg" onClick={onExtraNew}>
                    +{Math.min(5, plan.waitingNew)} yeni kelime öğren
                  </button>
                ) : (
                  <button className="btn btn-quiet" onClick={onAddWords}>
                    Kelime ekle
                  </button>
                )}
              </>
            )}
          </div>
        </div>

        {/* One suggestion at a time (a habit, a word looked up, gains, the week, a backup): the first that has something to say. */}
        <div className="home-nudges">{extra}</div>
        {garden?.urgent && garden.node}

        {(openMistakeWords > 0 || difficultCount > 0 || !!sentenceTile || (remaining === 0 && (canPractice || onGames)) || onStory || onMixed || (formsDue > 0 && onForms) || (!!warmup && onWarmup) || (!!verbOfDay && onVerbOfDay)) && (
          <section className="section stack">
            <h2 className="section-title">Ek çalışma</h2>
            <div className="tiles">
              {openMistakeWords > 0 && (
                <button className="tile" onClick={onPracticeMistakes}>
                  <span className="tile-icon bad">
                    <AlertIcon size={22} />
                  </span>
                  <span>
                    <strong>Hatalarını düzelt</strong>
                    <span className="small muted">{openMistakeWords} kelimede açık hata</span>
                  </span>
                </button>
              )}
              {difficultCount > 0 && onPracticeDifficult && (
                <button className="tile" onClick={onPracticeDifficult}>
                  <span className="tile-icon warm">
                    <VerbReviewIcon size={22} />
                  </span>
                  <span>
                    <strong>Zor kelimelerin</strong>
                    <span className="small muted">{difficultCount} kelime zor diye işaretli: ayrı bir çalışmada topla</span>
                  </span>
                </button>
              )}
              {sentenceTile && onSentenceGame && (
                <button className="tile" onClick={() => onSentenceGame(sentenceTile.due > 0 ? 'sentences' : 'back')}>
                  <span className="tile-icon">
                    <MessageIcon size={22} />
                  </span>
                  <span>
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
                  <span className="tile-icon">
                    <StoryIcon size={22} />
                  </span>
                  <span>
                    <strong>Hikayenin yeni bölümü</strong>
                    <span className="small muted">Zorlandığın kelimelerle yazılır</span>
                  </span>
                </button>
              )}
              {formsDue > 0 && onForms && (
                <button className="tile" onClick={onForms}>
                  <span className="tile-icon">
                    <TenseIcon size={22} />
                  </span>
                  <span>
                    <strong>Fiil çekimi tekrarı</strong>
                    <span className="small muted">{formsDue} çekim unutulmak üzere: kısa bir tur (yaklaşık 2 dk)</span>
                  </span>
                </button>
              )}
              {formsDue === 0 && warmup && onWarmup && (
                <button className="tile" onClick={onWarmup}>
                  <span className="tile-icon">
                    <TenseIcon size={22} />
                  </span>
                  <span>
                    <strong>Fiil ısınması</strong>
                    <span className="small muted">
                      En çok karıştırdığın: <span lang={language}>{warmup}</span>. Kısa bir hedefli tur (yaklaşık 2 dk)
                    </span>
                  </span>
                </button>
              )}
              {formsDue === 0 && !(warmup && onWarmup) && verbOfDay && onVerbOfDay && (
                <button className="tile" onClick={() => onVerbOfDay(verbOfDay.verb)}>
                  <span className="tile-icon">
                    <TenseIcon size={22} />
                  </span>
                  <span>
                    <strong>
                      Günün fiili: <span lang={language}>{verbOfDay.verb}</span>
                    </strong>
                    <span className="small muted">{verbOfDay.gloss ? `${verbOfDay.gloss} · ` : ''}tablosuna bak, kısa bir alıştırma yap</span>
                  </span>
                </button>
              )}
              {onMixed && (
                <button className="tile" onClick={onMixed}>
                  <span className="tile-icon">
                    <ShuffleIcon size={22} />
                  </span>
                  <span>
                    <strong>Karışık tekrar</strong>
                    <span className="small muted">Üç dilden {mixedDue} tekrar tek oturumda: dil değiştirmek ayırt etmeyi güçlendirir</span>
                  </span>
                </button>
              )}
              {remaining === 0 && onGames && (
                <button className="tile" onClick={onGames}>
                  <span className="tile-icon">
                    <GameIcon size={22} />
                  </span>
                  <span>
                    <strong>Oyunlar</strong>
                    <span className="small muted">Tekrar, dinleme, hız ve dilbilgisi oyunları</span>
                  </span>
                </button>
              )}
              {remaining === 0 && canPractice && (
                <button className="tile" onClick={onFreePractice}>
                  <span className="tile-icon">
                    <SparkleIcon size={22} />
                  </span>
                  <span>
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
                      <span className="quest-icon">{q.done ? <CheckCircleIcon size={22} /> : <Glyph emoji={q.icon} size={22} />}</span>
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
              <StreakFlame streak={streak} frozen={game?.frozenYesterday} /> {streak}
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
              <StarIcon className="icon-star" size={22} /> {activeVocabulary}
            </span>
            <span className="stat-label">aktif kelime</span>
          </div>
          <div className="stat">
            <span className="stat-value">
              <BookIcon className="icon-book" size={22} /> {learningCount}
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
                    <span className="quest-icon">{q.done ? <CheckCircleIcon size={22} /> : <Glyph emoji={q.icon} size={22} />}</span>
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

      </div>
      </div>
    </div>
  )
}

/** Level and today's XP; both count up to their new values when you come back from a session. */
function LevelStrip({ game, dailyXpGoal, onProfile }: { game: GameState; dailyXpGoal: number; onProfile: () => void }) {
  const into = useCountUp(game.level.into, `into:${game.level.level}`)
  const today = useCountUp(game.xp.today, 'today')
  const progress = game.level.needed ? into / game.level.needed : 0
  return (
    <button className="level-strip" onClick={onProfile}>
      <span className="level-badge">Sv. {game.level.level}</span>
      <span className="level-strip-body">
        <span className="level-strip-top">
          <strong>{game.level.title}</strong>
          <span className="small muted">
            {Math.round(into).toLocaleString('tr-TR')} / {game.level.needed.toLocaleString('tr-TR')} XP
          </span>
        </span>
        <span className="xp-bar xp-bar-sm">
          <span style={{ width: `${Math.min(1, progress) * 100}%` }} />
        </span>
      </span>
      {/* Once the day's goal is met a green seal stands by the day's XP (no "done" word beside a tick); the goal stays below it. */}
      {today >= dailyXpGoal ? (
        <span className="daily-goal is-done">
          <span className="small muted">Bugün</span>
          <strong>
            <span className="daily-check" aria-hidden>
              <CheckIcon size={12} />
            </span>
            {Math.round(today)} XP
          </strong>
          <span className="small muted">
            <span className="sr-only">Günlük hedef tamam, </span>hedef {dailyXpGoal}
          </span>
        </span>
      ) : (
        <span className="daily-goal">
          <span className="small muted">Bugün</span>
          <strong>
            {Math.round(today)}/{dailyXpGoal} XP
          </strong>
        </span>
      )}
    </button>
  )
}
