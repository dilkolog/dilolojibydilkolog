import { useState } from 'react'
import { seedIndex, seedText } from '../engine/mindSeed'
import { localDate } from '../engine/progress'
import type { TargetLanguage } from '../engine/types'
import { CheckIcon, SproutIcon } from './icons'

interface Saved {
  day: string
  skip: number
  done: boolean
}

const keyOf = (language: TargetLanguage) => `diloloji:mind-seed:${language}`

function load(language: TargetLanguage, day: string): Saved {
  try {
    const v = JSON.parse(localStorage.getItem(keyOf(language)) ?? 'null') as Saved | null
    if (v && v.day === day) return v
  } catch {
    // Unreadable: start the day afresh.
  }
  return { day, skip: 0, done: false }
}

function save(language: TargetLanguage, v: Saved) {
  try {
    localStorage.setItem(keyOf(language), JSON.stringify(v))
  } catch {
    // Private mode: it just shows again.
  }
}

/**
 * A small prompt a day to think in the language away from the screen ("describe three things in
 * the room"). "Düşündüm" closes it for the day; another can be asked for. Kept on the device only.
 */
export function MindSeed({ language }: { language: TargetLanguage }) {
  const day = localDate(new Date())
  const [state, setState] = useState(() => ({ language, saved: load(language, day) }))
  // A new day or another language starts afresh.
  const current = state.language === language && state.saved.day === day ? state.saved : load(language, day)
  const set = (v: Saved) => (save(language, v), setState({ language, saved: v }))
  const text = seedText(seedIndex(day, language, current.skip), language)

  if (current.done)
    return (
      <p className="small muted mind-seed-done" role="status">
        <CheckIcon size={14} className="inline-icon" /> Bugünün zihin tohumunu ektin.{' '}
        <button type="button" className="link small" onClick={() => set({ ...current, done: false })}>
          Tekrar göster
        </button>
      </p>
    )
  return (
    <section className="card stack mind-seed" aria-label="Günün zihin tohumu">
      <h2 className="section-title row gap-2">
        <SproutIcon size={18} className="icon-star" /> Günün zihin tohumu
      </h2>
      <p>{text}</p>
      <p className="small muted">Ekrandan uzakta, kafanda ya da yüksek sesle; yazman gerekmiyor.</p>
      <div className="row">
        <button type="button" className="btn btn-sm" onClick={() => set({ ...current, done: true })}>
          <CheckIcon size={14} /> Düşündüm
        </button>
        <button type="button" className="link small" onClick={() => set({ ...current, skip: current.skip + 1 })}>
          Başka bir tane
        </button>
      </div>
    </section>
  )
}
