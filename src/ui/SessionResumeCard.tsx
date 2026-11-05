import { useEffect, useState } from 'react'
import { db } from '../data/instance'
import { readSessionDraft, type SessionDraft } from '../data/sessionDraft'
import { PlayIcon } from './icons'
import type { TargetLanguage } from '../engine/types'

/** Available even when the daily scheduler has no more due questions. */
export function SessionResumeCard({ language, onResume }: { language: TargetLanguage; onResume: () => void }) {
  const [draft, setDraft] = useState<SessionDraft | null>(null)
  useEffect(() => {
    let live = true
    void readSessionDraft(db, language).then((value) => { if (live) setDraft(value) }, () => {})
    return () => { live = false }
  }, [language])
  if (!draft) return null
  const remaining = new Set(draft.session.items.slice(draft.session.index).map((it) => it.entryId)).size
  return (
    <section className="habit-nudge" aria-label="Yarım kalan kelime turu">
      <button type="button" className="habit-nudge-main" onClick={onResume}>
        <PlayIcon size={18} /><span className="stack gap-1"><strong>Yarım kalan turuna dön</strong><span>{remaining} kelimenin öğrenme adımları seni bekliyor.</span></span>
        <span className="habit-nudge-cta">Devam et</span>
      </button>
    </section>
  )
}
