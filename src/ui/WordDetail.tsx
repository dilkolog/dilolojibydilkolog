import { useEffect, useMemo, useState, type CSSProperties } from 'react'
import { tensesOf } from '../engine/tenses'
import { ConjugationTable } from './ConjugationTable'
import { useTenses } from './tenseGroups'
import { definiteArticle, displayForm } from '../engine/exercises'
import { masteryStage, skillScores } from '../engine/mastery'
import { openMistakes } from '../engine/mistakes'
import { contextEncounters, ENCOUNTER_TARGET } from '../engine/reading'
import { slowShare } from '../engine/grading'
import { nextReviewAt } from '../engine/review'
import type { Scheduler } from '../engine/scheduler'
import { unlockedSkills } from '../engine/selection'
import { SKILLS, type Mistake, type UserWordState, type VocabularyEntry, type WordList } from '../engine/types'
import { levelFromRank } from '../engine/wordLevel'
import { Select } from './Select'
import type { KelimeDB } from '../data/db'
import { wordKeys } from '../data/wordInput'
import { ERROR_NAME, genderRuleText, SKILL_NAME, STAGE_NAME } from './labels'
import { ruleFor } from '../engine/genderRules'
import { relativeTime } from './format'
import { canSpeak, playWord } from './speech'
import { WordForm } from './Words'
import { CrossLanguageNotes, OriginNotes, TriLanguageCard } from './CrossLanguage'
import { PatternsSection } from './Patterns'
import { MemoryCurveChart } from './MemoryCurve'
import { PitchCompare } from './PitchCompare'
import { cachedAudio } from '../data/audioCache'
import { naturalEnabled, naturalUrl } from './naturalVoice'
import { WordJourney } from './WordJourney'
import { WordFamilySection } from './WordFamily'
import { WordFamilyMap } from './WordFamilyMap'
import { CorpusExamples, WordExamples } from './WordExamples'
import { ClipsSection } from './Clips'
import { Plant } from './Plant'
import { growthStage, plantHealth, projectStage, type Health } from '../engine/growth'
import { MASTERY_STAGES } from '../engine/mastery'
import { WordMedia } from './WordMedia'
import { isRetired } from '../engine/retire'
import { GroupToggle, JumpNav } from './JumpNav'
import { useGroups } from './useGroups'
import { prefs } from './prefs'
import { useMediaUrl } from './useMedia'
import { BookIcon, CalendarIcon, ChartIcon, ChevronLeftIcon, ChevronRightIcon, LeafIcon, PenIcon, PlayIcon, SlowIcon, SpeakerIcon, TenseIcon, TrashIcon, UmbrellaIcon } from './icons'
import { verbKey } from './verbs/labShared'
import { deleteWordsWithUndo } from './undo'
import { neighbours } from './wordOrder'
import { placementOptions, parsePlacement, placementValue } from './listOptions'
import { WordPronunciation } from './PronunciationCheck'
import { azureEnabled } from './pronunciation'
import { WrittenForm } from './WrittenForm'
import { DifficultButton } from './DifficultButton'
import { WordSources } from './WordSources'
import { CardCompleteness } from './CardCompleteness'
import { PosTag } from './PosTag'
import { isDifficult, withDifficult } from '../engine/difficult'

interface Props {
  db: KelimeDB
  entry: VocabularyEntry
  vocabulary: VocabularyEntry[]
  state?: UserWordState
  mistakes: Mistake[]
  scheduler: Scheduler
  onChanged: () => void
  onBack: () => void
  /** Study just this word now. */
  onStudy?: (entries: VocabularyEntry[]) => void
  /** Open another word (previous / next in the list). */
  onOpen?: (entryId: string) => void
  /** Open a verb in the verb lab. */
  onOpenLab?: (verb: string) => void
}

/** Everything known about one word: its relations, how well each skill is held, its mistakes. */
const HEALTH_NAME: Record<Health, string> = { fresh: 'canlı', thirsty: 'susamış', wilting: 'soluyor' }

/** In order of how often they are used: sentences first, then saying it, then the rest. */
const WORD_GROUPS = [
  ['w-use', 'Kullanım'],
  ['w-voice', 'Telaffuz'],
  ['w-family', 'Aile ve diller'],
  ['w-progress', 'İlerleme'],
] as const

export function WordDetail({ db, entry, vocabulary, state, mistakes, scheduler, onChanged, onBack, onStudy, onOpen, onOpenLab }: Props) {
  const nav = useMemo(() => neighbours(entry.id, vocabulary), [entry.id, vocabulary])
  // A word page is long: on a phone the usage group starts open, the rest on request.
  const { isOpen, open: openGroup, toggle } = useGroups(WORD_GROUPS.map(([id]) => id), ['w-use'])
  // ← → step through the list, unless typing or a dialog is open.
  useEffect(() => {
    if (!onOpen) return
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null
      if (e.altKey || e.metaKey || e.ctrlKey || document.querySelector('[aria-modal="true"]')) return
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return
      // Inside tabs the arrows move between tabs (the tense groups), not between words.
      if (t?.closest('[role="tablist"]')) return
      const to = e.key === 'ArrowLeft' ? nav.prev : e.key === 'ArrowRight' ? nav.next : undefined
      if (to) {
        e.preventDefault()
        onOpen(to)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [nav, onOpen])
  const [editing, setEditing] = useState(false)
  const [lists, setLists] = useState<WordList[]>([])
  useEffect(() => {
    let live = true
    void db.getLists(entry.language).then((all) => live && setLists(all))
    return () => {
      live = false
    }
  }, [db, entry.language])
  const place = async (patch: Partial<VocabularyEntry>) => {
    const next = { ...entry, ...patch }
    if (!next.listId) delete next.listId
    if (!next.levelId) delete next.levelId
    await db.vocabulary.put(next)
    onChanged()
  }
  const others = useMemo(() => wordKeys(vocabulary.filter((v) => v.id !== entry.id)), [vocabulary, entry.id])
  const byId = useMemo(() => new Map(vocabulary.map((v) => [v.id, v])), [vocabulary])
  const sense = entry.senses[0]
  const open = openMistakes(mistakes, entry.id)
  const now = new Date()
  const scores = state ? skillScores(state, scheduler, now) : undefined
  const unlocked = new Set(unlockedSkills(state, entry))
  const next = state && nextReviewAt(state)
  const [encounters, setEncounters] = useState<number | null>(null)
  const [fragile, setFragile] = useState(false)
  useEffect(() => {
    Promise.all([db.events.where('entryId').equals(entry.id).toArray(), db.getEncounters()]).then(([events, reading]) => {
      setEncounters(contextEncounters(events, reading[entry.id] ?? 0))
      const s = slowShare(events)
      setFragile(s.correct >= 3 && s.slow / s.correct >= 0.4)
    })
  }, [db, entry.id, state])
  useTenses(entry.language)
  const hasConjugation = tensesOf(entry).length > 0
  const heroImage = useMediaUrl(entry.imageId)
  const confusables = entry.relations.filter((r) => r.type === 'confusable').map((r) => byId.get(r.targetId))

  const setRetired = async (retired: boolean) => {
    if (!state) return
    await db.wordStates.put({ ...state, retired })
    onChanged()
  }

  const remove = async () => {
    onBack()
    await deleteWordsWithUndo([entry.id], `“${displayForm(entry)}” silindi`, onChanged)
  }

  if (editing) {
    return (
      <div className="stack">
        <button className="link" onClick={() => setEditing(false)}>
          Kelimeye dön
        </button>
        <h1 className="greeting">Düzenle: {displayForm(entry)}</h1>
        <WordForm
          preview
          db={db}
          language={entry.language}
          existing={others}
          entry={entry}
          onSaved={() => {
            onChanged()
            setEditing(false)
          }}
          onCancel={() => setEditing(false)}
        />
      </div>
    )
  }

  const stage = growthStage(state)
  const list = lists.find((l) => l.id === entry.listId)
  const level = list?.levels?.find((l) => l.id === entry.levelId)
  const chips = [list && (level ? `${list.name} › ${level.name}` : list.name)].filter((c): c is string => !!c)
  // How common the word is, as an approximate level (not the list's own levels above).
  const wordLevel = levelFromRank(entry.frequencyRank)
  const health = plantHealth(state, scheduler, now)

  return (
    <div className="detail-page">
      <div className="detail-back detail-nav">
        <button className="link" onClick={onBack}>
          ← Kelimelere dön
        </button>
        {onOpen && nav.total > 1 && nav.index >= 0 && (
          <div className="word-stepper" role="group" aria-label="Kelimeler arasında gez">
            <button className="icon-btn" onClick={() => nav.prev && onOpen(nav.prev)} disabled={!nav.prev} aria-label="Önceki kelime" title="Önceki kelime (←)">
              <ChevronLeftIcon size={18} />
            </button>
            <span className="small muted">
              {nav.index + 1} / {nav.total}
            </span>
            <button className="icon-btn" onClick={() => nav.next && onOpen(nav.next)} disabled={!nav.next} aria-label="Sonraki kelime" title="Sonraki kelime (→)">
              <ChevronRightIcon size={18} />
            </button>
          </div>
        )}
      </div>

      {/* The word itself up top: what it is, how it sounds, what it means; then where it stands. */}
      <section className={`word-hero span-2${heroImage ? ' has-image' : ''}`}>
        <div className="word-hero-main">
          {(chips.length > 0 || entry.partOfSpeech !== 'other' || wordLevel) && (
            <ul className="chip-list" aria-label="Kelime bilgisi">
              {entry.partOfSpeech !== 'other' && (
                <li className="pos-chip">
                  <PosTag pos={entry.partOfSpeech} label />
                </li>
              )}
              {chips.map((c) => (
                <li key={c}>{c}</li>
              ))}
              {wordLevel && <li title={`Sıklığa göre yaklaşık seviye: en sık ${entry.frequencyRank.toLocaleString('tr')}. kelime`}>≈ {wordLevel}</li>}
            </ul>
          )}
          <div className="word-hero-title">
            <h1 className="word" style={{ '--len': displayForm(entry).length } as CSSProperties} lang={entry.language}><WrittenForm entry={entry} /></h1>
            {canSpeak() && (
              <button className="speak" onClick={() => playWord(entry)} aria-label="Sesli dinle">
                <SpeakerIcon size={20} />
              </button>
            )}
            <DifficultButton
              marked={isDifficult(entry)}
              onToggle={async () => {
                await db.vocabulary.put(withDifficult(entry, !isDifficult(entry)))
                onChanged()
              }}
            />
          </div>
          {entry.ipa && <span className="ipa">{entry.ipa}</span>}
          <p className="gloss">{[sense.gloss, ...(sense.altGlosses ?? [])].join(', ')}</p>
          {sense.definition && (
            <p className="definition" lang={entry.language}>
              {sense.definition}
            </p>
          )}
        </div>
        {heroImage && <img className="word-hero-image" src={heroImage} alt="" />}
        <div className="word-hero-actions">
          {onStudy && (
            <button className="btn btn-sm" onClick={() => onStudy([entry])}>
              <PlayIcon size={15} /> Çalış
            </button>
          )}
          <button className="btn btn-sm btn-quiet" onClick={() => setEditing(true)}>
            <PenIcon size={15} /> Düzenle
          </button>
          <button className="icon-btn word-hero-delete" onClick={remove} aria-label="Kelimeyi sil" title="Sil">
            <TrashIcon size={18} />
          </button>
        </div>
        <CardCompleteness entry={entry} />
        <dl className="word-hero-status">
          <div>
            <dt>Aşama</dt>
            <dd>
              <Plant stage={stage} health={health} size={30} />
              <span>
                {state ? STAGE_NAME[masteryStage(state)] : 'Henüz çalışılmadı'}
                {state && <span className="muted"> · {HEALTH_NAME[health]}</span>}
              </span>
            </dd>
          </div>
          <div>
            <dt>Sıradaki tekrar</dt>
            <dd>
              <CalendarIcon size={18} />
              <span>{next ? relativeTime(next) : 'Planlanmadı'}</span>
            </dd>
          </div>
          {encounters !== null && (
            <div>
              <dt>Bağlamda karşılaşma</dt>
              <dd>
                <BookIcon size={18} />
                <span>
                  {encounters}
                  <span className="muted"> / {ENCOUNTER_TARGET}+</span>
                </span>
              </dd>
            </div>
          )}
        </dl>
      </section>

      <section className="section stack span-2 word-notes">
        {entry.literal && <p className="small muted">Kelimesi kelimesine: {entry.literal}</p>}
        <CrossLanguageNotes entry={entry} />
        <OriginNotes entry={entry} />
        {ruleFor(entry) && <p className={`small gender-rule${ruleFor(entry)!.exception ? ' is-exception' : ''}`}>{genderRuleText(ruleFor(entry)!, displayForm(entry))}</p>}
        {fragile && (
          <p className="small fragile-note"><SlowIcon size={16} className="inline-icon" />Doğru biliyorsun ama yavaş hatırlıyorsun: bilgi kırılgan. Akıcılık turu ve hızlı tekrarlar onu otomatikleştirir.</p>
        )}
        {state && isRetired(state, prefs.autoRetire) ? (
          <p className="small retired-note">
            <UmbrellaIcon size={16} className="inline-icon" />Emekli: bu kelimeyi çok iyi biliyorsun, rutin tekrarlara gelmiyor; arada bir sürpriz kontrol gelir, yanılırsan geri döner.{' '}
            <button className="link small" onClick={() => setRetired(false)}>
              Rutine geri al
            </button>
          </p>
        ) : (
          state &&
          ['production_ready', 'mastered'].includes(masteryStage(state)) && (
            <p className="small muted">
              Bu kelimeyi artık çok iyi biliyorsan tekrarlardan çıkarabilirsin.{' '}
              <button className="link small" onClick={() => setRetired(true)}>
                Emekliye ayır
              </button>
            </p>
          )
        )}
      </section>

      <JumpNav groups={WORD_GROUPS.filter(([id]) => id !== 'w-voice' || !!entry.audioUrl || naturalEnabled() || azureEnabled())} label="Kelime bölümleri" onPick={openGroup} />
      <GroupToggle id="w-use" icon={<PenIcon size={18} />} open={isOpen('w-use')} onToggle={() => toggle('w-use')}>Cümleler ve kullanım</GroupToggle>
      {isOpen('w-use') && (
        <>
          <div id="word-examples">
            <WordExamples db={db} entry={entry} onChanged={onChanged} />
          </div>
          <CorpusExamples db={db} entry={entry} onChanged={onChanged} />
          <ClipsSection db={db} entry={entry} onChanged={onChanged} />
          {hasConjugation && (
            <section className="section stack">
              <h2 className="section-title">Fiil çekimi</h2>
              <ConjugationTable key={entry.id} entry={entry} productionReps={state?.skills.production?.reps ?? 0} />
              {onOpenLab && entry.language !== 'en' && (
                <div>
                  <button type="button" className="btn btn-quiet btn-sm" onClick={() => onOpenLab(verbKey(entry.language as 'fr' | 'es', entry.lemma))}>
                    <TenseIcon size={16} /> Fiil laboratuvarında aç
                  </button>
                </div>
              )}
              <p className="small muted">"Üretme" becerisi açıldıkça çekim soruları gelir: önce şimdiki zaman, kelime oturdukça geçmiş ve gelecek.</p>
            </section>
          )}
          <PatternsSection db={db} entry={entry} onChanged={onChanged} />
          <WordMedia key={entry.id + (entry.imageId ?? '') + (entry.audioId ?? '')} entry={entry} onChanged={onChanged} />
          <WordSources entry={entry} onChanged={onChanged} />
          {(entry.alternativeForms?.length ?? 0) > 0 && (
            <section className="section stack">
              <h2 className="section-title">Kabul edilen diğer yazımlar</h2>
              <div className="row">
                {entry.alternativeForms!.map((f) => (
                  <span key={f} className="pill" style={{ fontSize: 'var(--t-sm)' }}>
                    {f}{' '}
                    <button
                      className="link small"
                      aria-label={`${f} kaldır`}
                      onClick={async () => {
                        await db.vocabulary.put({ ...entry, alternativeForms: entry.alternativeForms!.filter((x) => x !== f) })
                        onChanged()
                      }}
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            </section>
          )}
        </>
      )}
      {(entry.audioUrl || naturalEnabled() || azureEnabled()) && <GroupToggle id="w-voice" icon={<SpeakerIcon size={18} />} open={isOpen('w-voice')} onToggle={() => toggle('w-voice')}>Telaffuz</GroupToggle>}
      {isOpen('w-voice') && (
        <>
          {azureEnabled() && <WordPronunciation db={db} entry={entry} />}
          {(entry.audioUrl || naturalEnabled()) && (
            <section className="section stack">
              <h2 className="section-title">Telaffuzunu karşılaştır</h2>
              <p className="small muted">
                Doğrusunu dinle, sonra sen söyle: iki ezgi üst üste çizilir. Vurgu ve tonlama, sadece dinleyince fark edilmeyen yerlerde bile görünür olur.
              </p>
              <PitchCompare
                key={entry.id}
                label={entry.audioUrl ? 'Ana dili konuşan bir kişinin kaydı' : 'Doğal ses'}
                reference={async () => (entry.audioUrl ? ((await cachedAudio(entry.audioUrl)) ?? entry.audioUrl) : naturalUrl(displayForm(entry), entry.language, 1))}
              />
            </section>
          )}
        </>
      )}
      <GroupToggle id="w-family" icon={<LeafIcon size={18} />} open={isOpen('w-family')} onToggle={() => toggle('w-family')}>Aile ve diğer diller</GroupToggle>
      {isOpen('w-family') && (
        <>
          <WordFamilyMap entry={entry} vocabulary={vocabulary} onOpen={onOpen} />
          <WordFamilySection db={db} entry={entry} vocabulary={vocabulary} onChanged={onChanged} />
          <TriLanguageCard entry={entry} onAdded={onChanged} />
          {/* Which list, and which of its levels, the word is studied in. */}
          {lists.length > 0 && (
            <section className="section stack word-placement">
              <h2 className="section-title">Liste ve seviye</h2>
              <div className="word-placement-row">
                <Select
                  label="Liste ve seviye"
                  value={placementValue(entry, lists)}
                  onChange={(v) => {
                    const { listId, levelId } = parsePlacement(v)
                    void place({ listId: listId ?? undefined, levelId: levelId ?? undefined })
                  }}
                  options={placementOptions(lists)}
                />
              </div>
            </section>
          )}

          {(entry.collocations.length > 0 || confusables.length > 0) && (
            <section className="section stack">
              <h2 className="section-title">İlişkiler</h2>
              {entry.collocations.length > 0 && (
                <div>
                  <h3 className="field"><label>Kalıplar</label></h3>
                  <ul className="plain">
                    {entry.collocations.map((c) => (
                      <li key={c.phrase}>
                        <span className="target" lang={entry.language}>{c.phrase}</span> {c.translation && <span className="muted">{c.translation}</span>}
                        {c.wrongVariants?.length ? <span className="small muted"> Yanlış: {c.wrongVariants.join(', ')}</span> : null}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {confusables.length > 0 && (
                <div>
                  <h3 className="field"><label>Karıştırılan</label></h3>
                  <ul className="plain">
                    {entry.relations
                      .filter((r) => r.type === 'confusable')
                      .map((r) => {
                        const other = byId.get(r.targetId)
                        return (
                          <li key={r.targetId}>
                            <span className="target" lang={entry.language}>{other ? displayForm(other) : r.targetId.split(':')[1]}</span>{' '}
                            <span className="muted">{other ? other.senses[0].gloss : 'listende yok'}</span>
                          </li>
                        )
                      })}
                  </ul>
                </div>
              )}
            </section>
          )}
        </>
      )}
      <GroupToggle id="w-progress" icon={<ChartIcon size={18} />} open={isOpen('w-progress')} onToggle={() => toggle('w-progress')}>İlerleme</GroupToggle>
      {isOpen('w-progress') && (
        <>
          <GrowthPanel entry={entry} state={state} scheduler={scheduler} now={now} />
          <MemoryCurveChart db={db} entryId={entry.id} refresh={state} />
          <WordJourney db={db} entry={entry} state={state} mistakes={mistakes} />
          <section className="section stack">
            <h2 className="section-title">Beceriler</h2>
            <div className="bars">
              {SKILLS.filter((s) => s !== 'gender' || definiteArticle(entry)).map((s) => (
                <div className="bar-row" key={s}>
                  <span>{SKILL_NAME[s]}</span>
                  <div className="bar-track">
                    <div className="bar-fill" style={{ width: `${scores?.[s] ?? 0}%` }} />
                  </div>
                  <span className="bar-value">
                    {state?.skills[s] ? `%${scores![s]}` : unlocked.has(s) ? 'sırada' : 'kilitli'}
                  </span>
                </div>
              ))}
            </div>
            <p className="small muted">
              Beceriler sırayla açılır: önce tanıma, sonra dinleme, artikel ve hatırlama, en son kalıplar ve üretme.
              {sense.examples.length === 0 && ' Üretme alıştırmaları için örnek cümle ekle.'}
            </p>
          </section>
          {open.length > 0 && (
            <section className="section stack">
              <h2 className="section-title">Açık hatalar</h2>
              <ul className="plain">
                {open.map((m) => (
                  <li key={m.id}>
                    <span className="strike" lang={entry.language}>{m.given}</span> → <span className="target" lang={entry.language}>{m.expected}</span>{' '}
                    <span className="small muted">
                      {ERROR_NAME[m.errorType]}, {m.count} kez
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </>
      )}
    </div>
  )
}

const HEALTH_NOTE: Record<Health, string> = {
  fresh: 'Canlı: şu an büyük ihtimalle hatırlıyorsun.',
  thirsty: 'Susamış: hatırlama ihtimalin düşmeye başladı, yakında tekrar gelecek.',
  wilting: 'Soluyor: unutulmak üzere. Bugünkü tekrarlarda öncelikli; bir doğru cevap onu sular.',
}

const STAGE_RULES: [string, string][] = [
  ['Yeni tanıştı', 'Kelimeyle tanıştın: filiz.'],
  ['Tanıdık', 'Gördüğünde anlamını tanıyorsun (tanıma becerisi kalıcı tekrara geçti).'],
  ['Hatırlanıyor', 'Türkçesinden kelimeyi kendin hatırlayabiliyorsun.'],
  ['Sağlam', 'Tanıma ve hatırlama en az 7 gün dayanıyor.'],
  ['Kullanılabiliyor', 'Hatırlama 7, cümlede üretme 3 gün dayanıyor: tomurcuk.'],
  ['Oturdu', 'Üç beceri de en az 21 gün dayanıyor: çiçek açtı.'],
]

const fmtDate = (d: Date) => d.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long' })

/**
 * The word's plant: where it is, what the next stage takes (projected with the memory model,
 * assuming each review comes when due and is answered right) and how healthy it is now.
 */
function GrowthPanel({ entry, state, scheduler, now }: { entry: VocabularyEntry; state?: UserWordState; scheduler: Scheduler; now: Date }) {
  const stage = growthStage(state)
  const health = plantHealth(state, scheduler, now)
  const next = state && stage < MASTERY_STAGES.length - 1 ? projectStage(state, entry, scheduler, now) : undefined
  const mastered = state && stage < MASTERY_STAGES.length - 1 ? projectStage(state, entry, scheduler, now, {}, 'mastered') : undefined
  const days = (d: Date) => Math.max(1, Math.ceil((d.getTime() - now.getTime()) / 86_400_000))
  return (
    <section className="section growth card span-2">
      <Plant stage={stage} health={health} size={88} live />
      <div className="stack gap-xs">
        <strong className="growth-title">{state ? STAGE_NAME[MASTERY_STAGES[stage]] : 'Henüz ekilmedi'}</strong>
        {!state && <p className="small muted">Bu kelime günlük görevine sırası gelince eklenir; ilk tanışmada filizlenir.</p>}
        {state && <p className="small">{HEALTH_NOTE[health]}</p>}
        {state && stage === MASTERY_STAGES.length - 1 && <p className="small">Çiçek açtı! Unutmaman için arada bir, giderek seyrekleşen aralıklarla tekrar gelir.</p>}
        {next && (
          <p className="small">
            Sıradaki aşama <strong>{STAGE_NAME[next.stage]}</strong>: en az {next.reviews} doğru cevap daha, en erken {fmtDate(next.date)}.
          </p>
        )}
        {mastered && mastered.stage !== next?.stage && (
          <p className="small muted">
            Çiçek açması (Oturdu) için hatasız giderse ~{mastered.reviews} doğru cevap ve ~{days(mastered.date)} gün. Her yanlış bu süreyi uzatır.
          </p>
        )}
        {state && stage < MASTERY_STAGES.length - 1 && !mastered && (
          <p className="small muted">Çiçek açması için cümlede üretme alıştırması gerekiyor: bir örnek cümle ekle.</p>
        )}
        {/* Where the word is on the way from seed to flower. */}
        <ol className="growth-track" aria-label="Aşamalar">
          {MASTERY_STAGES.map((m, i) => (
            <li key={m} className={i < stage ? 'is-done' : i === stage ? 'is-current' : undefined} aria-current={i === stage ? 'step' : undefined}>
              <Plant stage={i} size={30} />
              <span>{STAGE_NAME[m]}</span>
            </li>
          ))}
        </ol>
        <details className="small">
          <summary>Bitkiler nasıl büyür?</summary>
          <ol className="growth-rules">
            {STAGE_RULES.map(([name, rule], i) => (
              <li key={name}>
                <Plant stage={i} size={22} /> <strong>{name}</strong> <span className="muted">{rule}</span>
              </li>
            ))}
          </ol>
          <p className="muted">
            Doğru cevap sayısı tek başına yetmez: hafıza zamanla sağlamlaşır, bu yüzden aşamalar günlere yayılmış tekrarlarla açılır. Hatırlama ihtimalin
            düştükçe bitki susar ve solar; zamanında gelen bir tekrar onu sular.
          </p>
        </details>
      </div>
    </section>
  )
}
