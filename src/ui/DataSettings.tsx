import { useState } from 'react'
import { parseBackup, restoreBackup, type Backup, type Settings } from '../data/db'
import { dictionaryHtml, toCsv } from '../data/exportList'
import { db } from '../data/instance'
import { TARGET_LANGUAGES } from '../engine/types'
import { downloadBackup } from './backup'
import { ConfirmDialog } from './Dialog'
import { LANGUAGE_NAME } from './labels'
import { showToast } from './toastFeed'

export function DataSettings({
  language: lang,
  onDataChanged,
}: {
  language: Settings['activeLanguage']
  onDataChanged: () => void
}) {
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null)
  const [danger, setDanger] = useState<'language' | 'all' | null>(null)
  const [pendingRestore, setPendingRestore] = useState<Backup | null>(null)

  const download = async () => {
    await downloadBackup(db)
    showToast('Yedek indirildi.')
  }

  const restore = async (file: File) => {
    setMessage(null)
    try {
      setPendingRestore(parseBackup(await file.text()))
    } catch (e) {
      setMessage({ ok: false, text: e instanceof Error ? e.message : 'Dosya okunamadı.' })
    }
  }

  const confirmRestore = async () => {
    const backup = pendingRestore
    setPendingRestore(null)
    if (!backup) return
    await restoreBackup(db, backup)
    showToast(`Yedek geri yüklendi: ${backup.vocabulary.length} kelime.`)
    onDataChanged()
  }

  const exportCsv = async (all: boolean) => {
    const [vocabulary, states] = await Promise.all([db.vocabulary.toArray(), db.wordStates.toArray()])
    const words = vocabulary.filter((e) => e.source !== 'sample' && (all || e.language === lang))
    const url = URL.createObjectURL(new Blob([toCsv(words, states)], { type: 'text/csv;charset=utf-8' }))
    const a = document.createElement('a')
    a.href = url
    a.download = `kelime-kocu-${all ? 'kelimeler' : lang}-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
    showToast(`${words.length} kelime CSV olarak indirildi.`)
  }

  const printDictionary = async () => {
    const words = (await db.vocabulary.where('language').equals(lang).toArray()).filter((e) => e.source !== 'sample')
    const w = window.open('', '_blank')
    if (!w) {
      setMessage({ ok: false, text: 'Yeni pencere açılamadı; tarayıcı açılır pencereleri engelliyor olabilir.' })
      return
    }
    w.document.write(dictionaryHtml(words, lang, `${LANGUAGE_NAME[lang]} sözlüğüm`))
    w.document.close()
    w.focus()
    setTimeout(() => w.print(), 300)
  }

  const resetLanguage = async () => {
    const ids = (await db.vocabulary.where('language').equals(lang).primaryKeys()) as string[]
    await db.transaction('rw', [db.wordStates, db.events, db.mistakes], async () => {
      await db.wordStates.where('language').equals(lang).delete()
      await db.events.where('language').equals(lang).delete()
      await db.mistakes.where('entryId').anyOf(ids).delete()
    })
    setDanger(null)
    showToast(`${LANGUAGE_NAME[lang]} ilerlemesi sıfırlandı; kelimelerin duruyor.`)
    onDataChanged()
  }

  const deleteAll = async () => {
    await db.delete()
    location.reload()
  }

  return (
    <>
      <section className="card stack">
        <h2 className="section-title">Yedek</h2>
        <p className="small muted">Veriler yalnızca bu cihazda duruyor. Yedek; kelimeleri, ilerlemeyi, görselleri ve ses kayıtlarını içerir.</p>
        <div className="row">
          <button className="btn btn-quiet" onClick={download}>
            Yedeği indir
          </button>
          <label className="btn btn-quiet">
            Yedekten geri yükle
            <input type="file" accept=".json,application/json" className="sr-only" onChange={(e) => e.target.files?.[0] && restore(e.target.files[0])} />
          </label>
        </div>
        <h3 className="subhead">Kelime listesini dışa aktar</h3>
        <p className="small muted">CSV, Excel ya da Google E-Tablolar'da açılır. Sözlük, yazdırma penceresinden PDF olarak da kaydedilebilir.</p>
        <div className="row">
          <button className="btn btn-quiet" onClick={() => exportCsv(false)}>
            {LANGUAGE_NAME[lang]} listesi (CSV)
          </button>
          <button className="btn btn-quiet" onClick={() => exportCsv(true)}>
            Üç dil (CSV)
          </button>
          <button className="btn btn-quiet" onClick={printDictionary}>
            Yazdırılabilir sözlük
          </button>
        </div>
      </section>
      <section className="card stack danger-zone">
        <h2 className="section-title">Sıfırlama</h2>
        <p className="small muted">Önce yedek almanı öneririm. Bu işlemler geri alınamaz.</p>
        <div className="row">
          <button className="btn btn-danger" onClick={() => setDanger('language')}>
            {LANGUAGE_NAME[lang]} ilerlemesini sıfırla
          </button>
          <button className="btn btn-danger" onClick={() => setDanger('all')}>
            Tüm verileri sil
          </button>
        </div>
      </section>

      {message && (
        <p className={message.ok ? 'notice' : 'error'} role="status">
          {message.text}
        </p>
      )}

      {danger === 'language' && (
        <ConfirmDialog title={`${LANGUAGE_NAME[lang]} ilerlemesi sıfırlansın mı?`} confirmLabel="Sıfırla" danger onConfirm={resetLanguage} onCancel={() => setDanger(null)}>
          Kelimelerin kalır; tekrar takvimi, cevap geçmişi ve hatalar silinir. Diğer dillere dokunulmaz.
        </ConfirmDialog>
      )}
      {pendingRestore && (
        <ConfirmDialog title="Yedek geri yüklensin mi?" confirmLabel="Geri yükle" danger onConfirm={confirmRestore} onCancel={() => setPendingRestore(null)}>
          Bu cihazdaki tüm veriler {new Date(pendingRestore.exportedAt).toLocaleString('tr-TR')} tarihli yedekle ({pendingRestore.vocabulary.length} kelime) değiştirilecek.
        </ConfirmDialog>
      )}
      {danger === 'all' && (
        <ConfirmDialog title="Tüm veriler silinsin mı?" confirmLabel="Hepsini sil" danger onConfirm={deleteAll} onCancel={() => setDanger(null)}>
          {TARGET_LANGUAGES.map((l) => LANGUAGE_NAME[l]).join(', ')} için tüm kelimeler, ilerleme, görseller, ses kayıtları, profil ve ayarlar bu cihazdan silinir.
        </ConfirmDialog>
      )}
    </>
  )
}
