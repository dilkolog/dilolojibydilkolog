import { useEffect, useState } from 'react'

import { db } from '../../data/instance'

import { useCountUp } from '../shared/useCountUp'
import { isFormId } from '../../engine/dailyPlan'
import { TENSE_GUIDE } from '../../engine/tenseGuide'
import type { Tense } from '../../engine/tenses'
import type { SessionSummary } from '../../engine/session'
import { type VocabularyEntry } from '../../engine/types'
import { MASTERY_STAGES } from '../../engine/mastery'

import { BoltIcon, BulbIcon, CheckIcon, CloseIcon, ShareIcon } from '../shared/icons'
import { shareCard } from '../social/shareCard'
import { ERROR_NAME, STAGE_NAME } from '../shared/labels'
import { GrowingPlant, Plant } from '../home/Plant'

import { BadgeMoment } from '../profile/BadgeMoment'
import { notify } from '../social/noticeCenter'
import { badgeNotice, levelNotice } from '../social/noticeTexts'
import { markBadgesSeen } from '../profile/badgeSeen'
import { Burst } from '../shared/Burst'

import { Ring } from '../home/Ring'
import { WordLabel } from '../words/WordLabel'
import { SummaryGarden } from '../words/SummaryGarden'
import { type GameState } from '../game'
import { sfx } from '../shared/sounds'
import { BadgeMedal } from '../words/Medal'
import { closestStep, crossedMilestone } from '../../engine/gamification'
import { MilestoneMoment, LevelUpBadge } from '../progress/MilestoneMoment'
import { markLevelSeen } from '../profile/levelSeen'
import { StreakPicture } from '../home/StreakFlame'
import { FREE_RECALL_MIN, FreeRecall } from '../practice/FreeRecall'
import { SentenceStep, sentenceWord } from './SentenceStep'
import { SessionNote } from './SessionNote'
import { RESULT_ART, STAT_ART, resultKind } from '../shared/drawnArt'
import { Sticker } from '../shared/Sticker'
import { Confetti } from '../shared/Confetti'

function hardHeadline(accuracy: number): string {
  if (accuracy >= 0.9) return 'Zor kelimelerin yola geliyor!'
  if (accuracy >= 0.7) return 'Zorlandıkça öğreniyorsun'
  return 'Zor kelimeler zor, bu yüzden buradasın'
}

function headline(accuracy: number, practice?: boolean): string {
  if (accuracy >= 0.9) return 'Muhteşem bir oturum!'
  if (accuracy >= 0.7) return 'Çok iyi gidiyorsun!'
  if (practice) return 'Pratik bunun için var!'
  return 'Her hata bir adım. Devam!'
}

/** Answers after which a session counts as long enough to suggest splitting it. */
const LONG_SESSION = 40
/** Below this many answers in all, a learner is just starting: a low score is not yet a reason to slow down. */
export const EARLY_ANSWERS = 150

export function Summary({
  summary,
  byId,
  practice,
  topic,
  onUnmarkDifficult,
  before,
  after,
  firstSitting,
  onOwnSentence,
  onDone,
}: {
  summary: SessionSummary
  byId: Map<string, VocabularyEntry>
  practice?: boolean
  /** 'difficult': a practice of the words marked hard; the summary is about them and lets the ones that went well graduate. */
  topic?: 'difficult'
  onUnmarkDifficult?: (entryId: string) => void | Promise<void>
  before: GameState | null
  after: GameState | null
  /** The first of a long day's two sittings: the rest waits on Today. */
  firstSitting?: boolean
  /** Saves the learner's own sentence with a word of the round (the "Bir cümle yaz" step of a daily round). */
  onOwnSentence?: (entryId: string, text: string) => Promise<void>
  onDone: () => void
}) {
  const name = (id: string) => {
    const e = byId.get(id)
    if (e) return <WordLabel entry={e} />
    // A verb lab form mixed into the session: "attendre · Présent".
    if (isFormId(id)) {
      const [verb, tense] = id.slice('form:'.length).split('|')
      return `${verb} · ${TENSE_GUIDE[tense as Tense]?.name ?? tense}`
    }
    return id
  }
  const accuracy = summary.answered ? (practice ? summary.correct : summary.independentCorrect ?? summary.correct) / summary.answered : 0
  const errors = Object.entries(summary.errors) as [keyof typeof ERROR_NAME, number][]
  const leveledUp = !!before && !!after && after.level.level > before.level.level
  const newBadges = before && after ? after.achievements.filter((a) => a.unlocked && !before.achievements.find((b) => b.id === a.id)?.unlocked) : []
  const [milestone, setMilestone] = useState(() =>
    before && after && !practice ? crossedMilestone({ level: before.level.level, stats: before.stats }, { level: after.level.level, stats: after.stats }) : null,
  )

  // A badge earned in this session gets its moment, after the level or milestone one.
  // Derived, not an initial value: the game state after the session may arrive a moment after the summary opens.
  const [badgeMomentDone, setBadgeMomentDone] = useState(false)
  // One big moment a summary: after a level or milestone moment the badges are listed under "Kazandıkların", not given a
  // second full-screen moment (the first session earned a badge, a level and a streak at once, each celebrated in turn).
  const [hadMoment] = useState(() => !!milestone)
  const badgeMoment = !practice && !badgeMomentDone && !hadMoment && newBadges.length > 0
  // The session's badges go into the log now, dated, so they are kept (and not celebrated again later).
  useEffect(() => {
    if (practice || !newBadges.length) return
    const at = new Date().toISOString()
    void db.logBadges(Object.fromEntries(newBadges.map((a) => [a.id, at])))
    markBadgesSeen(newBadges.map((a) => a.id))
    for (const a of newBadges) void notify(badgeNotice(a.id, a.title))
  }, [newBadges.map((a) => a.id).join()]) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (leveledUp) sfx.levelUp()
    else if (newBadges.length) sfx.badge()
    else if (accuracy >= 0.85 && summary.answered >= 5) sfx.finish()
    if (leveledUp && after) void notify(levelNotice(after.level.level, after.level.title))
    // Play once when the summary opens.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  // The level this summary shows is seen, whenever it arrives (the game state after the session may come a moment
  // after the summary opens): otherwise the level watcher celebrated it a second time once the summary closed.
  const levelAfter = after?.level.level
  useEffect(() => {
    if (levelAfter !== undefined) markLevelSeen(levelAfter)
  }, [levelAfter])

  const grown = practice
    ? []
    : summary.words.filter((w) => (w.stageAfter ? MASTERY_STAGES.indexOf(w.stageAfter) : -1) > (w.stageBefore ? MASTERY_STAGES.indexOf(w.stageBefore) : -1))
  const rest = summary.words.filter((w) => !grown.includes(w))
  // A word that reached the last stage has bloomed: its row is marked, and the session gets its burst.
  const bloomed = (w: (typeof grown)[number]) => !!w.stageAfter && MASTERY_STAGES.indexOf(w.stageAfter) === MASTERY_STAGES.length - 1
  const blooms = grown.filter(bloomed).length
  // Free recall: the words studied, and while the learner writes them the lists stay hidden.
  const studied = summary.words.map((w) => byId.get(w.entryId)).filter((e): e is VocabularyEntry => !!e)
  const [recalling, setRecalling] = useState(false)
  // A low score while words are new is how learning starts, not a sign of too much: the "too hard" note waits until the
  // learner has a history (EARLY_ANSWERS) and the session was not mostly new words (each new word asks about three questions).
  const early = (before?.stats.totalAnswers ?? 0) < EARLY_ANSWERS || summary.introduced.length * 3 >= summary.answered / 2
  const tooEasyOrHard = !practice && !topic && summary.answered >= 12 && (accuracy > 0.93 || (accuracy < 0.7 && !early))
  const [graduated, setGraduated] = useState<Set<string>>(() => new Set())
  // Chosen once: saving the sentence reloads the words, and the step should not jump to another one.
  const [sentenceEntry] = useState(() => (!practice && !topic && onOwnSentence ? sentenceWord(summary, byId) : undefined))

  return (
    <div className="summary-grid">
      {(accuracy >= 0.95 || !!milestone || !!leveledUp) && <Confetti />}
      {milestone && <MilestoneMoment milestone={milestone} onClose={() => setMilestone(null)} />}
      {!milestone && badgeMoment && (
        <BadgeMoment
          badges={newBadges}
          onClose={() => {
            markBadgesSeen(newBadges.map((a) => a.id))
            setBadgeMomentDone(true)
          }}
        />
      )}
      <div className="summary-main stack">
      <div className="celebrate celebrate-card">
        {(leveledUp || blooms > 0 || accuracy >= 0.8) && <Burst />}
        <img className={`result-art${accuracy >= 0.8 ? ' art-pop' : ''}`} src={RESULT_ART[resultKind(accuracy, summary.answered, { leveledUp, streakSaved: !!after?.frozenYesterday })]} alt="" draggable={false} />
        <Ring value={accuracy} size={140} stroke={14} label={`%${Math.round(accuracy * 100)}`} doneLabel="%100" />
        {topic === 'difficult' && (
          <span className="topic-chip">
            <BoltIcon size={15} /> Zor kelime çalışması
          </span>
        )}
        <h1>{topic === 'difficult' ? hardHeadline(accuracy) : practice ? headline(accuracy, true) : 'Tur bitti'}</h1>
        <p className="muted mt-2">
          {topic === 'difficult'
            ? `${summary.words.length} zor kelimeyle çalıştın: ${summary.answered} sorudan ${summary.correct} tanesini doğru bildin.`
            : `${summary.answered} sorudan ${summary.correct} tanesini doğru bildin.`}
          {!practice && summary.independentCorrect !== undefined && ` ${summary.independentCorrect} cevabı yardımsız hatırladın.`}
          {practice && ' Serbest pratikti: takvimin ve hata listen değişmedi.'}
        </p>
        {!practice && (
          <p className="note">
            {/* What comes next, not "done" beside "not learned": the words settle in the coming days' reviews. */}
            {summary.pendingLearning?.length
              ? `${summary.pendingLearning.length} kelimenin pekiştirmesi sırada: sonraki turda önce onlar gelecek.`
              : 'Kelimeler önümüzdeki günlerin tekrarlarıyla kalıcılaşacak.'}
          </p>
        )}
        <p className="xp-gain">
          +<GainCount value={summary.xp} /> XP
        </p>
        {after && (
          <dl className="celebrate-stats">
            <div>
              <dd>
                <StreakPicture streak={after.streak} size={40} ignite={!!before && after.streak > before.streak && after.streak >= 2} /> {after.streak}
              </dd>
              <dt>
                günlük seri
                {after.streak >= 3 && (
                  <button
                    type="button"
                    className="streak-share-btn"
                    onClick={() => {
                      void shareCard(
                        {
                          kicker: 'Seri alevi',
                          title: `${after.streak} günlük seri!`,
                          text: 'Diloloji ile her gün düzenli pratik yapıyorum.',
                          art: 'streak',
                        },
                        `Diloloji'de ${after.streak} günlük seriye ulaştım!`,
                      )
                    }}
                    title="Serini paylaş"
                    aria-label="Serini paylaş"
                  >
                    <ShareIcon size={13} />
                  </button>
                )}
              </dt>
            </div>
            <div>
              <dd>
                <img className="stat-art-img" src={STAT_ART.sprout} alt="" height={36} width={36} draggable={false} /> {summary.introduced.length}
              </dd>
              <dt>yeni kelime</dt>
            </div>
            <div>
              <dd>
                <img className="stat-art-img" src={STAT_ART.star} alt="" height={36} width={36} draggable={false} /> {practice ? 0 : summary.strengthened.length}
              </dd>
              <dt>güçlenen</dt>
            </div>
          </dl>
        )}
      </div>
      {sentenceEntry && onOwnSentence && <SentenceStep entry={sentenceEntry} onSave={onOwnSentence} />}
      {studied.length >= FREE_RECALL_MIN && <FreeRecall entries={studied} onWriting={setRecalling} />}
      {((leveledUp && after) || newBadges.length > 0) && (
        // Level and badges side by side in one strip, instead of a column of separate blocks.
        <section className="rewards" aria-label="Kazandıkların">
          <h2 className="section-title">Kazandıkların</h2>
          <ul className="rewards-list">
            {leveledUp && after && (
              <li className="reward reward-level">
                <LevelUpBadge from={before!.level.level} to={after.level.level} />
                <span className="reward-text">
                  <strong>Seviye atladın!</strong>
                  <span className="small muted">
                    {after.level.level}. seviye: {after.level.title}
                  </span>
                </span>
                <button
                  type="button"
                  className="btn btn-sm btn-quiet reward-share-btn"
                  onClick={() => {
                    void shareCard(
                      {
                        kicker: 'Yeni seviye',
                        title: `${after.level.level}. Seviye: ${after.level.title}`,
                        text: 'Diloloji ile her gün öğrenmeye devam ediyorum.',
                        art: 'level',
                      },
                      `Diloloji'de ${after.level.level}. seviyeye ulaştım (${after.level.title})!`,
                    )
                  }}
                  aria-label="Seviyeni paylaş"
                >
                  <ShareIcon size={14} /> Paylaş
                </button>
              </li>
            )}
            {newBadges.map((a) => (
              <li key={a.id} className="reward">
                <BadgeMedal badge={a} unlocked size={48} />
                <span className="reward-text">
                  <strong>{a.title}</strong>
                  <span className="small muted">{a.description}</span>
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}
      {!practice && after && (() => {
        const step = closestStep(after.achievements)
        return (
          step && (
            <p className="note row summary-next">
              <BadgeMedal badge={step} unlocked={false} progress={step.value / step.goal} size={32} />
              <span>
                Sıradaki rozet: <strong>{step.title}</strong>, {(step.goal - step.value).toLocaleString('tr-TR')} kaldı <span className="muted">({step.description.toLocaleLowerCase('tr')})</span>
              </span>
            </p>
          )
        )
      })()}
      {(tooEasyOrHard || summary.answered >= LONG_SESSION) && (
        <section className="coach-note">
          <span className="coach-note-icon" aria-hidden>
            <BulbIcon size={18} />
          </span>
          <div className="coach-note-body">
            <strong>Koçun notu</strong>
            {tooEasyOrHard && (
              <p className="small">
                {accuracy > 0.93
                  ? 'Bu oturum biraz kolaydı. Öğrenme, cevapların yaklaşık %85\'i doğruyken en hızlı ilerliyor: Ayarlar\'dan günlük yeni kelime sayısını artırabilirsin.'
                  : 'Bu oturum zorlayıcıydı. Öğrenme, cevapların yaklaşık %85\'i doğruyken en hızlı ilerliyor: birkaç gün yeni kelime sayısını azaltıp tekrarlara ağırlık vermek daha verimli olabilir.'}
              </p>
            )}
            {summary.answered >= LONG_SESSION && (
              <p className="small">Uzun bir oturumdu. Aynı süreyi gün içine yayılmış 2–3 kısa tura bölmek daha kalıcı öğretir (dağıtılmış pratik): bir sonraki turu birkaç saat sonra yap.</p>
            )}
          </div>
        </section>
      )}
      <SessionNote summary={summary} byId={byId} />
      {errors.length > 0 && (
        <div className="error-chips" aria-label="Hata türleri">
          <span className="small muted">Hata türleri</span>
          {errors.map(([t, n]) => (
            <span key={t} className={`error-chip tone-${t}`}>
              {ERROR_NAME[t]} <strong>{n}</strong>
            </span>
          ))}
        </div>
      )}
      {firstSitting && (
        <p className="note sticker-note">
          <Sticker name="coffee" size={40} />
          <span>Günün ilk yarısı tamam. Kalanı Bugün'de hazır; birkaç saat sonra yaparsan araya giren zaman sayesinde daha kalıcı olur.</span>
        </p>
      )}
      <div className="summary-actions">
        <button className="btn btn-lg btn-block" onClick={onDone} autoFocus>
          Devam
        </button>
      </div>
      </div>

      <div className="summary-side stack" hidden={recalling}>
        {/* Mounted only while shown: hidden, the plants would finish growing unseen. */}
        {!recalling && <SummaryGarden summary={summary} />}
        {!recalling && grown.length > 0 && (
          <section className="stack summary-grown">
            <h2 className="section-title">Bugün büyüyenler ({grown.length})</h2>
            <ul className="grown-list">
              {grown.map((w, i) => {
                const from = w.stageBefore ? MASTERY_STAGES.indexOf(w.stageBefore) : -1
                const to = MASTERY_STAGES.indexOf(w.stageAfter!)
                const e = byId.get(w.entryId)
                return (
                  <li key={w.entryId} className={bloomed(w) ? 'is-bloom' : undefined} style={{ ['--i' as string]: Math.min(i, 6) }}>
                    <span className="grown-plants" aria-hidden>
                      <span className="grown-from">
                        <Plant stage={from} size={30} />
                      </span>
                      <span className="grown-arrow">→</span>
                      <span className="grown-to">
                        <GrowingPlant from={from} to={to} delay={400 + Math.min(i, 6) * 200} size={46} />
                      </span>
                    </span>
                    <span className="garden-text">
                      <span className="target">{name(w.entryId)}</span>
                      {e && <span className="small muted">{e.senses[0].gloss}</span>}
                      <span className="small garden-grew">{bloomed(w) ? `Çiçek açtı: ${STAGE_NAME[w.stageAfter!]}` : `${STAGE_NAME[w.stageAfter!]} oldu`}</span>
                    </span>
                  </li>
                )
              })}
            </ul>
          </section>
        )}
        {topic === 'difficult' && summary.words.length > 0 && (
          <section className="stack summary-hard">
            <h2 className="section-title">Zor kelimelerin</h2>
            <ul className="garden garden-compact hard-list">
              {summary.words.map((w) => {
                const e = byId.get(w.entryId)
                const clean = w.wrong === 0 && w.correct > 0
                const out = graduated.has(w.entryId)
                return (
                  <li key={w.entryId}>
                    <span className={`hard-mark${clean || out ? ' is-clean' : ''}`} aria-hidden>
                      {out ? <CheckIcon size={16} /> : <BoltIcon size={16} />}
                    </span>
                    <span className="garden-text">
                      <span className="target">{name(w.entryId)}</span>
                      {e && <span className="small muted">{e.senses[0].gloss}</span>}
                      <span className="small">
                        {out ? <span className="garden-ok">Zor listesinden çıktı</span> : clean ? <span className="garden-ok">Bu sefer hepsi doğru</span> : <span className="muted">Zor kalıyor: yakında yine karşına çıkar</span>}
                      </span>
                    </span>
                    {clean && !out && onUnmarkDifficult && (
                      <button
                        type="button"
                        className="btn btn-sm btn-quiet"
                        onClick={async () => {
                          await onUnmarkDifficult(w.entryId)
                          setGraduated((g) => new Set(g).add(w.entryId))
                        }}
                      >
                        Artık zor değil
                      </button>
                    )}
                  </li>
                )
              })}
            </ul>
          </section>
        )}
        {topic !== 'difficult' && rest.length > 0 && (
          <section className="stack summary-rest">
            <h2 className="section-title">
              {grown.length ? 'Tekrar ettiklerin' : 'Bu oturumda çalıştıkların'} <span className="section-title-count">({rest.length})</span>
            </h2>
            <ul className="garden garden-compact">
              {rest.map((w) => {
                const e = byId.get(w.entryId)
                const stage = w.stageAfter ? MASTERY_STAGES.indexOf(w.stageAfter) : w.stageBefore ? MASTERY_STAGES.indexOf(w.stageBefore) : -1
                return (
                  <li key={w.entryId} className="summary-word-row">
                    <span className="summary-word-bed" aria-hidden>
                      <Plant stage={stage} size={36} />
                    </span>
                    <span className="garden-text">
                      <span className="target">{name(w.entryId)}</span>
                      {e && <span className="small muted garden-gloss">{e.senses[0].gloss}</span>}
                    </span>
                    <span className="summary-word-status">
                      {w.correct > 0 && (
                        <span className="garden-ok garden-pill is-ok" title={`${w.correct} doğru`}>
                          <CheckIcon size={12} className="inline-icon" />
                          <span>{w.correct}</span>
                        </span>
                      )}
                      {w.wrong > 0 && (
                        <span className="garden-bad garden-pill is-bad" title={`${w.wrong} yanlış`}>
                          <CloseIcon size={12} className="inline-icon" />
                          <span>{w.wrong}</span>
                        </span>
                      )}
                      {w.wrong > 0 && !practice && <span className="summary-word-hint muted">yakında tekrar</span>}
                    </span>
                  </li>
                )
              })}
            </ul>
          </section>
        )}
      </div>
    </div>
  )
}

/** XP earned in the session, counting up from 0. */
export function GainCount({ value }: { value: number }) {
  return <>{Math.round(useCountUp(value, 'session-gain', 1000, 0))}</>
}

export { LevelUpBadge } from '../progress/MilestoneMoment'
