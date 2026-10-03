import { useEffect, useState } from 'react'
import type { VocabularyEntry } from '../engine/types'
import { db } from '../data/instance'
import { useAi } from './aiContext'
import { AudioRecorder } from './AudioRecorder'
import { MnemonicDialog } from './Mnemonic'
import { ImagePicker } from './ImagePicker'
import { comparePronunciation, playWord, preloadRecording } from './speech'
import { useMediaUrl } from './useMedia'
import { undoable } from './toast'
import { BulbIcon } from './icons'

/** Picture, own recording and personal note of a word, editable in place. */
export function WordMedia({ entry, onChanged }: { entry: VocabularyEntry; onChanged: () => void }) {
  // Ready before any click, so Safari plays it straight from the button.
  useEffect(() => {
    void preloadRecording(entry.audioId)
  }, [entry.audioId])
  const imageUrl = useMediaUrl(entry.imageId)
  const [picking, setPicking] = useState(false)
  const [recording, setRecording] = useState(false)
  const [notes, setNotes] = useState(entry.notes ?? '')
  const [saved, setSaved] = useState(false)
  const [mnemonicOpen, setMnemonicOpen] = useState(false)
  const { apiKey } = useAi()

  const update = async (patch: Partial<VocabularyEntry>, removeMedia?: string) => {
    const before = entry
    const media = removeMedia ? await db.media.get(removeMedia) : undefined
    if (removeMedia) await db.media.delete(removeMedia)
    await db.vocabulary.put({ ...entry, ...patch })
    onChanged()
    if (media)
      undoable(patch.audioId === undefined && 'audioId' in patch ? 'Ses kaydı kaldırıldı' : 'Görsel kaldırıldı', async () => {
        await db.media.put(media)
        await db.vocabulary.put(before)
        onChanged()
      })
  }

  const saveNotes = async () => {
    if ((entry.notes ?? '') === notes.trim()) return
    await update({ notes: notes.trim() || undefined })
    setSaved(true)
    setTimeout(() => setSaved(false), 1500)
  }

  return (
    <section className="section stack">
      <h2 className="section-title">Görsel, ses ve not</h2>
      <div className="grid-2 media-split">
        <div className="stack media-block">
          <h3 className="field">
            <label>Görsel</label>
          </h3>
          {imageUrl ? (
            <>
              <img className="word-image-sm" src={imageUrl} alt={entry.lemma} />
              {entry.imageCredit && <p className="credit">{entry.imageCredit}</p>}
              <div className="row">
                <button className="btn btn-quiet" onClick={() => setPicking(true)}>
                  Değiştir
                </button>
                <button className="link small" onClick={() => update({ imageId: undefined, imageCredit: undefined }, entry.imageId)}>
                  Kaldır
                </button>
              </div>
            </>
          ) : (
            <>
              <p className="small muted">Görsel, "resme bak, kelimeyi seç" alıştırmasını açar ve kelimenin kartında görünür.</p>
              <div>
                <button className="btn btn-quiet" onClick={() => setPicking(true)}>
                  Görsel ekle
                </button>
              </div>
            </>
          )}
        </div>

        <div className="stack media-block">
          <h3 className="field">
            <label>Kendi sesin</label>
          </h3>
          {entry.audioId && !recording ? (
            <>
              <p className="small muted">Bu kelimede yapay ses yerine senin kaydın çalınıyor.</p>
              <div className="row">
                <button className="btn btn-quiet" onClick={() => playWord(entry)}>
                  Dinle
                </button>
                <button className="btn btn-quiet" onClick={() => comparePronunciation(entry)} title="Önce yapay ses, hemen ardından senin kaydın">
                  Karşılaştır
                </button>
                <button className="btn btn-quiet" onClick={() => setRecording(true)}>
                  Yeniden kaydet
                </button>
                <button className="link small" onClick={() => update({ audioId: undefined }, entry.audioId)}>
                  Kaldır
                </button>
              </div>
            </>
          ) : (
            <>
              <p className="small muted">Kelimeyi kendi sesinle kaydet; tekrarlarda bu kayıt çalınır.</p>
              <AudioRecorder
                onSave={async (blob) => {
                  const audioId = await db.addMedia('audio', blob)
                  await update({ audioId }, entry.audioId)
                  setRecording(false)
                }}
              />
            </>
          )}
        </div>
      </div>

      <div className="field">
        <label htmlFor="w-notes">Not / hafıza ipucu</label>
        <textarea
          id="w-notes"
          className="textarea"
          style={{ minHeight: '5rem' }}
          placeholder="Örn. 'abandon' → 'a band on' (bir grup sahneyi terk ediyor)"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          onBlur={saveNotes}
        />
        <span className="help">{saved ? 'Kaydedildi.' : 'Kelime tanıtılırken ve yanlış cevaptan sonra gösterilir. Alandan çıkınca kaydedilir.'}</span>
        <div>
          <button className="btn btn-quiet" onClick={() => setMnemonicOpen(true)}>
            <BulbIcon size={18} /> Hafıza ipucu {apiKey ? 'üret' : 'yaz'}
          </button>
        </div>
      </div>
      {mnemonicOpen && (
        <MnemonicDialog
          entry={{ ...entry, notes: notes.trim() || undefined }}
          onClose={() => setMnemonicOpen(false)}
          onSaved={(updated) => {
            setNotes(updated.notes ?? '')
            setMnemonicOpen(false)
            onChanged()
          }}
        />
      )}

      {picking && (
        <ImagePicker
          initialQuery={entry.lemma}
          suggestions={[entry.senses[0].gloss, ...(entry.senses[0].altGlosses ?? [])]}
          onClose={() => setPicking(false)}
          onPick={async (img) => {
            const imageId = await db.addMedia('image', img.blob)
            await update({ imageId, imageCredit: img.credit }, entry.imageId)
            setPicking(false)
          }}
        />
      )}
    </section>
  )
}
