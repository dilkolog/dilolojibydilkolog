import { useEffect, useMemo, useState } from 'react'
import { conjugate, PRONOUNS } from '../engine/conjugation'
import { definiteArticle, displayForm } from '../engine/exercises'
import { masteryStage, skillScores } from '../engine/mastery'
import { openMistakes } from '../engine/mistakes'
import { contextEncounters, ENCOUNTER_TARGET } from '../engine/reading'
import { slowShare } from '../engine/grading'
import { nextReviewAt } from '../engine/review'
import type { Scheduler } from '../engine/scheduler'
import { unlockedSkills } from '../engine/selection'
import { SKILLS, type Mistake, type UserWordState, type VocabularyEntry } from '../engine/types'
import type { KelimeDB } from '../data/db'
import { wordKeys } from '../data/wordInput'
import { ERROR_NAME, genderRuleText, POS_NAME, SKILL_NAME, STAGE_NAME } from './labels'
import { ruleFor } from '../engine/genderRules'
import { relativeTime } from './format'
import { canSpeak, playWord } from './speech'
import { WordForm } from './Words'
import { CrossLanguageNotes, TriLanguageCard } from './CrossLanguage'
import { PatternsSection } from './Patterns'
import { MemoryCurveChart } from './MemoryCurve'
import { PitchCompare } from './PitchCompare'
import { cachedAudio } from '../data/audioCache'
import { naturalEnabled, naturalUrl } from './naturalVoice'
import { WordJourney } from './WordJourney'
import { WordFamilySection } from './WordFamily'
import { CorpusExamples, WordExamples } from './WordExamples'
import { Plant } from './Plant'
import { growthStage, plantHealth, projectStage, type Health } from '../engine/growth'
import { MASTERY_STAGES } from '../engine/mastery'
import { WordMedia } from './WordMedia'
import { isRetired } from '../engine/retire'
import { GroupTitle, JumpNav } from './JumpNav'
import { prefs } from './prefs'
import { useMediaUrl } from './useMedia'
import { ChartIcon, LeafIcon, PenIcon, SpeakerIcon } from './icons'
import { deleteWordsWithUndo } from './undo'

interface Props {
  db: KelimeDB
  entry: VocabularyEntry
  vocabulary: VocabularyEntry[]
  state?: UserWordState
  mistakes: Mistake[]
  scheduler: Scheduler
  onChanged: () => void
  onBack: () => void
}

/** Everything known about one word: its relations, how well each skill is held, its mistakes. */
const WORD_GROUPS = [
  ['w-use', 'Kullanım'],
  ['w-family', 'Aile ve diller'],
  ['w-voice', 'Telaffuz'],
  ['w-progress', 'İlerleme'],
] as const

export function WordDetail({ db, entry, vocabulary, state, mistakes, scheduler, onChanged, onBack }: Props) {
  const [editing, setEditing] = useState(false)
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
  const conjugation = conjugate(entry)
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
  const chips = [
    entry.partOfSpeech !== 'other' && POS_NAME[entry.partOfSpeech],
    entry.cefr,
    next && `sıradaki tekrar ${relativeTime(next)}`,
    encounters !== null && `bağlamda ${encounters}/${ENCOUNTER_TARGET}+ karşılaşma`,
  ].filter((c): c is string => !!c)

  return (
    <div className="detail-page">
      <button className="link detail-back" onClick={onBack}>
        ← Kelimelere dön
      </button>

      {/* The word itself up top: its plant, how it sounds, what it means, its picture. */}
      <section className="word-hero span-2">
        <div className="word-hero-plant" aria-hidden>
          <Plant stage={stage} health={plantHealth(state, scheduler, now)} size={72} />
          <span className="small">{state ? STAGE_NAME[masteryStage(state)] : 'Henüz çalışılmadı'}</span>
        </div>
        <div className="word-hero-body stack gap-2">
          <div className="row items-center gap-3">
            <h1 className="word">{displayForm(entry)}</h1>
            {canSpeak() && (
              <button className="speak" onClick={() => playWord(entry)} aria-label="Sesli dinle">
                <SpeakerIcon size={20} />
              </button>
            )}
          </div>
          {entry.ipa && <span className="ipa">{entry.ipa}</span>}
          <p className="gloss">{[sense.gloss, ...(sense.altGlosses ?? [])].join(', ')}</p>
          {sense.definition && (
            <p className="definition" lang={entry.language}>
              {sense.definition}
            </p>
          )}
          {chips.length > 0 && (
            <ul className="chip-list" aria-label="Kelime bilgisi">
              {chips.map((c) => (
                <li key={c}>{c}</li>
              ))}
            </ul>
          )}
        </div>
        {heroImage && <img className="word-hero-image" src={heroImage} alt="" />}
        <div className="word-hero-actions">
          <button className="btn btn-sm btn-quiet" onClick={() => setEditing(true)}>
            Düzenle
          </button>
          <button className="btn btn-sm btn-danger" onClick={remove}>
            Sil
          </button>
        </div>
      </section>

      <section className="section stack span-2 word-notes">
        {entry.literal && <p className="small muted">Kelimesi kelimesine: {entry.literal}</p>}
        <CrossLanguageNotes entry={entry} />
        {ruleFor(entry) && <p className={`small gender-rule${ruleFor(entry)!.exception ? ' is-exception' : ''}`}>{genderRuleText(ruleFor(entry)!, displayForm(entry))}</p>}
        {fragile && (
          <p className="small fragile-note">🐢 Doğru biliyorsun ama yavaş hatırlıyorsun: bilgi kırılgan. Akıcılık turu ve hızlı tekrarlar onu otomatikleştirir.</p>
        )}
        {state && isRetired(state, prefs.autoRetire) ? (
          <p className="small retired-note">
            🏖️ Emekli: bu kelimeyi çok iyi biliyorsun, rutin tekrarlara gelmiyor; arada bir sürpriz kontrol gelir, yanılırsan geri döner.{' '}
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

      <JumpNav groups={WORD_GROUPS.filter(([id]) => id !== 'w-voice' || !!entry.audioUrl || naturalEnabled())} label="Kelime bölümleri" />
      <GrowthPanel entry={entry} state={state} scheduler={scheduler} now={now} />
      <GroupTitle id="w-use" icon={<PenIcon size={18} />}>Cümleler ve kullanım</GroupTitle>
      <WordMedia key={entry.id + (entry.imageId ?? '') + (entry.audioId ?? '')} entry={entry} onChanged={onChanged} />
      <WordExamples db={db} entry={entry} onChanged={onChanged} />
      <CorpusExamples db={db} entry={entry} onChanged={onChanged} />
      <PatternsSection db={db} entry={entry} onChanged={onChanged} />
      {conjugation && (
        <section className="section stack">
          <h2 className="section-title">Şimdiki zaman çekimi</h2>
          <table className="conj-table" lang={entry.language}>
            <tbody>
              {conjugation.forms.map((f, i) => (
                <tr key={i}>
                  <th scope="row">{PRONOUNS[entry.language as 'fr' | 'es'][i].slice(0, 2).join(' / ')}</th>
                  <td>{f}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="small muted">
            {conjugation.source === 'rule' ? 'Düzenli fiil kuralıyla üretildi. ' : conjugation.source === 'dictionary' ? 'Çekim: UniMorph. ' : ''}"Üretme" becerisi açılınca çekim soruları da gelir.
          </p>
        </section>
      )}
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
      <GroupTitle id="w-family" icon={<LeafIcon size={18} />}>Aile ve diğer diller</GroupTitle>
      <WordFamilySection db={db} entry={entry} vocabulary={vocabulary} onChanged={onChanged} />
      <TriLanguageCard entry={entry} onAdded={onChanged} />
      {(entry.collocations.length > 0 || confusables.length > 0) && (
        <section className="section stack">
          <h2 className="section-title">İlişkiler</h2>
          {entry.collocations.length > 0 && (
            <div>
              <h3 className="field"><label>Kalıplar</label></h3>
              <ul className="plain">
                {entry.collocations.map((c) => (
                  <li key={c.phrase}>
                    <span className="target">{c.phrase}</span> {c.translation && <span className="muted">{c.translation}</span>}
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
                        <span className="target">{other ? displayForm(other) : r.targetId.split(':')[1]}</span>{' '}
                        <span className="muted">{other ? other.senses[0].gloss : 'listende yok'}</span>
                      </li>
                    )
                  })}
              </ul>
            </div>
          )}
        </section>
      )}
      {(entry.audioUrl || naturalEnabled()) && <GroupTitle id="w-voice" icon={<SpeakerIcon size={18} />}>Telaffuz</GroupTitle>}
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
      <GroupTitle id="w-progress" icon={<ChartIcon size={18} />}>İlerleme</GroupTitle>
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
                <span className="strike">{m.given}</span> → <span className="target">{m.expected}</span>{' '}
                <span className="small muted">
                  {ERROR_NAME[m.errorType]}, {m.count} kez
                </span>
              </li>
            ))}
          </ul>
        </section>
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
    <section className="section growth card">
      <Plant stage={stage} health={health} size={88} />
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
