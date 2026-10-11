import type { Settings } from '../data/db'
import { effectivePrefs, PREF_TYPES, type ExercisePref } from '../engine/exercisePrefs'
import type { ExerciseType } from '../engine/types'
import { Chips } from './settingsWidgets'

type Level = 'normal' | ExercisePref

const LEVELS: Level[] = ['normal', 'less', 'off']
const LEVEL_NAME: Record<Level, string> = { normal: 'Normal', less: 'Az', off: 'Hiç' }
const GROUPS: { id: 'typed' | 'choice' | 'voice'; title: string }[] = [
  { id: 'typed', title: 'Yazarak cevapladıkların' },
  { id: 'choice', title: 'Seçenekli sorular' },
  { id: 'voice', title: 'Sesli sorular' },
]

/**
 * Which kinds of questions come up, one by one: as usual, less often (a third of the share) or
 * not at all. A question that feels too hard to be worth it can be switched off without losing
 * the word: it is asked in the other ways, and the meaning choice and typing the word from its
 * meaning (what every word learns first) are always there.
 */
export function ExerciseTypeSettings({ settings, onChange }: { settings: Settings; onChange: (s: Settings) => void }) {
  const current = effectivePrefs(settings.exercisePrefs, settings.typedBlanks)
  const set = (type: ExerciseType, level: Level) => {
    const next = { ...current }
    if (level === 'normal') delete next[type]
    else next[type] = level
    // The first form of this setting (typedBlanks) is folded into the list from now on.
    onChange({ ...settings, exercisePrefs: next, typedBlanks: true })
  }
  const changed = Object.keys(current).length > 0
  return (
    <section className="card stack" aria-label="Soru türleri">
      <div className="row justify-between">
        <h2 className="section-title">Soru türleri</h2>
        {changed && (
          <button type="button" className="link small" onClick={() => onChange({ ...settings, exercisePrefs: {}, typedBlanks: true })}>
            Hepsini normale döndür
          </button>
        )}
      </div>
      <p className="small muted">Zor gelen ya da sevmediğin bir soru türünü azalt ya da kapat; o kelimeler diğer türlerle çalışılmaya devam eder. “Az”, o türün diğerlerinin yaklaşık üçte biri kadar çıkması demek.</p>
      {GROUPS.map((g) => (
        <div key={g.id} className="stack" role="group" aria-label={g.title}>
          <h3 className="subhead">{g.title}</h3>
          {PREF_TYPES.filter((p) => p.group === g.id).map((p) => (
            <div key={p.type} className="setting-row">
              <div className="setting-text">
                <strong>{p.name}</strong>
                <span className="small muted">{p.hint}</span>
              </div>
              <Chips<Level> label={p.name} options={LEVELS} value={(current[p.type] as Level | undefined) ?? 'normal'} onChange={(v) => set(p.type, v)} format={(v) => LEVEL_NAME[v]} />
            </div>
          ))}
        </div>
      ))}
    </section>
  )
}
