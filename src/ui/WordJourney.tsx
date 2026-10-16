import type { ReactNode } from 'react'
import { useEffect, useState } from 'react'
import { AlertIcon, BookIcon, FlowerIcon, GlobeIcon, LeafIcon, PlusIcon, SproutIcon, TrendDownIcon } from './icons'
import type { KelimeDB, FirstEncounterContext } from '../data/db'
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
      db.getFirstEncounters(),
      db.meta.get('webSightings').then((r) => ((r?.value as Record<string, { at: string; host: string }[]> | undefined) ?? {})[entry.id] ?? []),
    ]).then(([events, enc, firstEnc, seen]) => {
      if (!live) return
      const metInEx = entry.senses?.flatMap((s) => s.examples ?? []).find((e) => e.metIn)
      const firstEncounter: FirstEncounterContext | undefined = firstEnc[entry.id] || (metInEx?.metIn ? { title: metInEx.metIn, sentence: metInEx.text, at: entry.addedAt ? new Date(entry.addedAt).toISOString() : new Date().toISOString() } : undefined)
      setSteps(wordJourney(entry, state, events, mistakes, seen, firstEncounter))
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
      case 'first_met':
        return (
          <>
            İlk karşılaştığın yer: <strong>{s.where}</strong>
            {s.sentence && <span className="journey-sub muted">“{s.sentence}”</span>}
          </>
        )
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
  const icon: Record<JourneyStep['kind'], ReactNode> = { added: <PlusIcon />, first_met: <BookIcon />, introduced: <SproutIcon />, stage: <LeafIcon />, mistake: <AlertIcon />, seen: <GlobeIcon /> }
  return (
    <section className="section stack">
      <h2 className="section-title">Kelimenin yolculuğu</h2>
      <ol className="journey">
        {steps.map((s, i) => (
          <li key={i} className={`journey-${s.kind}${s.kind === 'stage' && !s.up ? ' is-down' : ''}`}>
            <span className="journey-icon" aria-hidden>
              {s.kind === 'stage' && s.stage === 'mastered' ? <FlowerIcon /> : s.kind === 'stage' && !s.up ? <TrendDownIcon /> : icon[s.kind]}
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
