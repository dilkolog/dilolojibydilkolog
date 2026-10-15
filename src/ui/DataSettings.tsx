import { useEffect, useState } from 'react'
import { parseBackup, restoreBackup, type Backup, type Settings } from '../data/db'
import { dictionaryHtml, flashcardsHtml, toCsv, toXlsx } from '../data/exportList'
import { openPrint } from './printWindow'
import { db } from '../data/instance'
import { getSafetySnapshot, restoreSafetySnapshot, saveSafetySnapshot, type SafetySnapshot } from '../data/safetyBackup'
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
  const [safety, setSafety] = useState<SafetySnapshot | null>(null)
  const [pendingUndo, setPendingUndo] = useState(false)

  useEffect(() => {
    void getSafetySnapshot(db).then(setSafety)
  }, [])

  const download = async () => {
    await downloadBackup(db)
    showToast('Yedek indirildi.')
  }

  const restore = async (file: File) => {
    setMessage(null)
    try {
      setPendingRestore(parseBackup(await file.text()))
    } catch (e) {
      // JSON.parse's own message is English and says nothing to the learner.
      setMessage({ ok: false, text: e instanceof SyntaxError ? 'Bu dosya geçerli bir yedek değil (içeriği okunamadı).' : e instanceof Error ? e.message : 'Dosya okunamadı.' })
    }
  }

  const confirmRestore = async () => {
    const backup = pendingRestore
    setPendingRestore(null)
    if (!backup) return
    try {
      // The data on this device is about to be replaced: keep a copy so a wrong file can be taken back.
      setSafety(await saveSafetySnapshot(db))
      await restoreBackup(db, backup)
    } catch {
      setMessage({ ok: false, text: 'Yedek geri yüklenemedi; dosya bozuk olabilir. Veriler olduğu gibi duruyor.' })
      return
    }
    showToast(`Yedek geri yüklendi: ${backup.vocabulary.length} kelime.`)
    onDataChanged()
  }

  const undoRestore = async () => {
    setPendingUndo(false)
    try {
      if (!(await restoreSafetySnapshot(db))) return
    } catch {
      setMessage({ ok: false, text: 'Önceki hâle dönülemedi.' })
      return
    }
    setSafety(null)
    showToast('Geri yüklemeden önceki hâle dönüldü.')
    onDataChanged()
  }

  const exportList = async (all: boolean, format: 'xlsx' | 'csv') => {
    const [vocabulary, states] = await Promise.all([db.vocabulary.toArray(), db.wordStates.toArray()])
    const words = vocabulary.filter((e) => e.source !== 'sample' && (all || e.language === lang))
    const blob =
      format === 'xlsx'
        ? new Blob([toXlsx(words, states) as BlobPart], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
        : new Blob([toCsv(words, states)], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `diloloji-${all ? 'kelimeler' : lang}-${new Date().toISOString().slice(0, 10)}.${format}`
    a.click()
    URL.revokeObjectURL(url)
    showToast(`${words.length} kelime ${format === 'xlsx' ? 'Excel' : 'CSV'} olarak indirildi.`)
  }

  const printWords = async (what: 'dictionary' | 'cards') => {
    const words = (await db.vocabulary.where('language').equals(lang).toArray()).filter((e) => e.source !== 'sample')
    const html = what === 'cards' ? flashcardsHtml(words, lang, `${LANGUAGE_NAME[lang]} kartlarım`) : dictionaryHtml(words, lang, `${LANGUAGE_NAME[lang]} sözlüğüm`)
    if (!openPrint(html)) setMessage({ ok: false, text: 'Yeni pencere açılamadı; tarayıcı açılır pencereleri engelliyor olabilir.' })
  }

  const resetLanguage = async () => {
    const ids = (await db.vocabulary.where('language').equals(lang).primaryKeys()) as string[]
    await db.transaction('rw', [db.wordStates, db.events, db.mistakes, db.meta], async () => {
      // The mark travels with sync: without it the other devices' copies of the answers bring the progress back.
      await db.addDeleted([`reset:${lang}`])
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
        {safety && (
          <div className="row">
            <span className="small muted">
              Geri yüklemeden önce bu cihazın hâli otomatik saklandı ({new Date(safety.at).toLocaleString('tr-TR')}, {safety.words} kelime).
            </span>
            <button className="btn btn-sm btn-quiet" onClick={() => setPendingUndo(true)}>
              Önceki hâle dön
            </button>
          </div>
        )}
        <h3 className="subhead">Kelime listesini dışa aktar</h3>
        <p className="small muted">Excel dosyası Excel, Numbers ve Google E-Tablolar'da düzgün açılır. CSV'yi başka bir programa vereceksen kullan. Sözlük ve kartlar, yazdırma penceresinden PDF olarak da kaydedilebilir (kartlar kesilip çift taraflı basılacak şekilde dizilir).</p>
        <div className="row">
          <button className="btn btn-quiet" onClick={() => exportList(false, 'xlsx')}>
            {LANGUAGE_NAME[lang]} listesi (Excel)
          </button>
          <button className="btn btn-quiet" onClick={() => exportList(true, 'xlsx')}>
            Üç dil (Excel)
          </button>
          <button className="btn btn-quiet" onClick={() => printWords('dictionary')}>
            Yazdırılabilir sözlük
          </button>
          <button className="btn btn-quiet" onClick={() => printWords('cards')}>
            Yazdırılabilir kartlar
          </button>
        </div>
        <p className="small muted">
          CSV olarak:{' '}
          <button className="link small" onClick={() => exportList(false, 'csv')}>
            {LANGUAGE_NAME[lang]}
          </button>{' '}
          ·{' '}
          <button className="link small" onClick={() => exportList(true, 'csv')}>
            üç dil
          </button>
        </p>
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
      {pendingUndo && safety && (
        <ConfirmDialog title="Önceki hâle dönülsün mü?" confirmLabel="Önceki hâle dön" danger onConfirm={undoRestore} onCancel={() => setPendingUndo(false)}>
          Bu cihazdaki veriler {new Date(safety.at).toLocaleString('tr-TR')} tarihindeki hâliyle ({safety.words} kelime) değiştirilecek.
        </ConfirmDialog>
      )}
      {danger === 'all' && (
        <ConfirmDialog title="Tüm veriler silinsin mi?" confirmLabel="Hepsini sil" danger onConfirm={deleteAll} onCancel={() => setDanger(null)}>
          {TARGET_LANGUAGES.map((l) => LANGUAGE_NAME[l]).join(', ')} için tüm kelimeler, ilerleme, görseller, ses kayıtları, profil ve ayarlar bu cihazdan silinir.
        </ConfirmDialog>
      )}
    </>
  )
}
