import { useEffect, useState } from 'react'
import type { KelimeDB } from '../data/db'
import { wordJourney, type JourneyStep } from '../engine/journey'
import type { Mistake, UserWordState, VocabularyEntry } from '../engine/types'
import { STAGE_NAME } from './labels'

const fmt = (d: Date) => d.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' })

/** The word's story, oldest first. */
export function WordJourney({ db, entry, state, mistakes }: { db: KelimeDB; entry: VocabularyEntry; state?: UserWordState; mistakes: Mistake[] }) {
  const [steps, setSteps] = useState<JourneyStep[] | null>(null)
  const [encounters, setEncounters] = useState(0)
  const [webWeek, setWebWeek] = useState(0)
  useEffect(() => {
    let live = true
    void Promise.all([
      db.events.where('entryId').equals(entry.id).toArray(),
      db.getEncounters(),
      db.meta.get('webSightings').then((r) => ((r?.value as Record<string, { at: string; host: string }[]> | undefined) ?? {})[entry.id] ?? []),
    ]).then(([events, enc, seen]) => {
      if (!live) return
      setSteps(wordJourney(entry, state, events, mistakes, seen))
      setEncounters(enc[entry.id] ?? 0)
      const weekAgo = new Date(Date.now() - 7 * 86_400_000).toISOString()
      setWebWeek(seen.filter((x) => x.at >= weekAgo).length)
    })
    return () => {
      live = false
    }
  }, [db, entry, state, mistakes])
  if (!steps || steps.length < 2) return null

  const text = (s: JourneyStep) => {
    switch (s.kind) {
      case 'added':
        return s.source ? `Listene eklendi (${s.source})` : 'Listene eklendi'
      case 'introduced':
        return 'İlk kez çalıştın'
      case 'stage':
        return s.up ? `${STAGE_NAME[s.stage]} oldu` : `Geriledi: ${STAGE_NAME[s.stage]}`
      case 'mistake':
        return (
          <>
            Hata: <span className="strike">{s.given || '(boş)'}</span> → <strong lang={entry.language}>{s.expected}</strong>
          </>
        )
      case 'seen':
        return `Web'de karşına çıktı: ${s.where}`
    }
  }
  const icon: Record<JourneyStep['kind'], string> = { added: '➕', introduced: '🌱', stage: '🌿', mistake: '⚠️', seen: '🌐' }
  return (
    <section className="section stack">
      <h2 className="section-title">Kelimenin yolculuğu</h2>
      <ol className="journey">
        {steps.map((s, i) => (
          <li key={i} className={`journey-${s.kind}${s.kind === 'stage' && !s.up ? ' is-down' : ''}`}>
            <span className="journey-icon" aria-hidden>
              {s.kind === 'stage' && s.stage === 'mastered' ? '🌸' : s.kind === 'stage' && !s.up ? '🍂' : icon[s.kind]}
            </span>
            <span className="journey-text">{text(s)}</span>
            <span className="small muted">{fmt(s.at)}</span>
          </li>
        ))}
      </ol>
      {(encounters > 0 || webWeek > 0) && (
        <p className="small muted">
          {encounters > 0 && `Okurken ve web'de toplam ${encounters} kez karşılaştın.`}
          {webWeek > 0 && ` Bu hafta web'de ${webWeek} kez karşına çıktı.`}
        </p>
      )}
    </section>
  )
}
