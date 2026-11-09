import { markClosing } from '../../data/closing'
import { useEffect, useState } from 'react'
import { parseBackup, restoreBackup, type Backup, type Settings } from '../../data/db'
import { dictionaryHtml, flashcardsHtml, toCsv, toMemriseTsv, toQuizletText, toXlsx } from '../../data/exportList'
import { openPrint } from '../shared/printWindow'
import { db } from '../../data/instance'
import { getSafetySnapshot, restoreSafetySnapshot, saveSafetySnapshot, type SafetySnapshot } from '../../data/safetyBackup'
import { TARGET_LANGUAGES } from '../../engine/types'
import { downloadBackup } from './backup'
import { ConfirmDialog } from '../shared/Dialog'
import { LANGUAGE_NAME } from '../shared/labels'
import { showToast } from '../shared/toastFeed'
import { AccountDelete } from '../account/AccountManage'
import { getAccount } from '../account/syncRunner'
import { Chips, Row } from './settingsWidgets'
import { currentIdentity, type Identity } from '../../data/supabase'
import type { Account } from '../../data/sync'

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
  const [account, setAccount] = useState<Account | null>(null)
  const [identity, setIdentity] = useState<Identity | null>(null)
  const [scope, setScope] = useState<'one' | 'all'>('one')

  useEffect(() => {
    void getSafetySnapshot(db).then(setSafety)
    void getAccount().then(async (acc) => {
      setAccount(acc)
      if (acc) {
        const id = await currentIdentity().catch(() => null)
        setIdentity(id)
      }
    })
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

  const exportQuizletOrMemrise = async (format: 'quizlet' | 'memrise') => {
    const vocabulary = await db.vocabulary.where('language').equals(lang).toArray()
    const words = vocabulary.filter((e) => e.source !== 'sample')
    const content = format === 'quizlet' ? toQuizletText(words, { includeExample: true }) : toMemriseTsv(words)
    await navigator.clipboard.writeText(content)
    showToast(
      format === 'quizlet'
        ? `${words.length} kelime Quizlet formatında panoya kopyalandı!`
        : `${words.length} kelime Memrise formatında panoya kopyalandı!`,
    )
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
    markClosing()
    await db.delete()
    location.reload()
  }

  return (
    <>
      <section className="card stack">
        <h2 className="section-title">Yedek</h2>
        <p className="small muted">
          {account ? 'Verilerin hesabında güvende ve kendiliğinden eşitlenir. Buradan istersen bilgisayarına bir kopya alırsın.' : 'Veriler yalnızca bu cihazda duruyor; yedek almak onları korur.'}
        </p>
        <Row label="Yedeği indir" help="Kelimeler, ilerleme, görseller ve ses kayıtları tek bir dosyada.">
          <button type="button" className="btn btn-sm btn-quiet" onClick={download}>
            İndir
          </button>
        </Row>
        <Row label="Yedekten geri yükle" help="Önce ne geleceğini gösterir; bu cihazın hâli yedeklenir, istersen geri dönersin.">
          <label className="btn btn-sm btn-quiet">
            Dosya seç
            <input type="file" accept=".json,application/json" className="sr-only" onChange={(e) => e.target.files?.[0] && restore(e.target.files[0])} />
          </label>
        </Row>
        {safety && (
          <Row label="Geri yüklemeden önceki hâl" help={`Otomatik saklandı: ${new Date(safety.at).toLocaleString('tr-TR')}, ${safety.words} kelime.`}>
            <button type="button" className="btn btn-sm btn-quiet" onClick={() => setPendingUndo(true)}>
              Önceki hâle dön
            </button>
          </Row>
        )}
      </section>
      <section className="card stack">
        <h2 className="section-title">Dışa aktar</h2>
        <Row label="Excel'e aktar" help="Excel, Numbers ve Google E-Tablolar'da düzgün açılır.">
          <div className="data-export">
            <Chips<'one' | 'all'> label="Hangi kelimeler" options={['one', 'all']} value={scope} onChange={setScope} format={(v) => (v === 'one' ? LANGUAGE_NAME[lang] : 'Üç dil')} />
            <button type="button" className="btn btn-sm btn-quiet" onClick={() => exportList(scope === 'all', 'xlsx')}>
              İndir
            </button>
          </div>
        </Row>
        <Row advanced label="CSV olarak indir" help="Başka bir programa vereceksen; Excel'deki kelime seçimiyle aynı.">
          <button type="button" className="btn btn-sm btn-quiet" onClick={() => exportList(scope === 'all', 'csv')}>
            CSV indir
          </button>
        </Row>
        <Row advanced label="Quizlet ya da Memrise'a kopyala" help={`${LANGUAGE_NAME[lang]} kelimelerin panoya, o sitenin içe aktarma biçiminde kopyalanır.`}>
          <div className="row nowrap">
            <button type="button" className="btn btn-sm btn-quiet" onClick={() => exportQuizletOrMemrise('quizlet')}>
              Quizlet
            </button>
            <button type="button" className="btn btn-sm btn-quiet" onClick={() => exportQuizletOrMemrise('memrise')}>
              Memrise
            </button>
          </div>
        </Row>
      </section>
      <section className="card stack">
        <h2 className="section-title">Yazdır</h2>
        <Row label="Yazdırılabilir sözlük" help={`${LANGUAGE_NAME[lang]} kelimelerin, anlamları ve örnekleriyle; PDF olarak da kaydedilir.`}>
          <button type="button" className="btn btn-sm btn-quiet" onClick={() => printWords('dictionary')}>
            Yazdır
          </button>
        </Row>
        <Row label="Yazdırılabilir kartlar" help="Kesilip çift taraflı basılacak şekilde dizilir: her kartın arkasında anlamı.">
          <button type="button" className="btn btn-sm btn-quiet" onClick={() => printWords('cards')}>
            Yazdır
          </button>
        </Row>
      </section>
      <section className="card stack danger-zone">
        <h2 className="section-title">Sıfırlama</h2>
        <p className="small muted">Bunlar geri alınamaz; önce yedek almanı öneririm.</p>
        <Row label={`${LANGUAGE_NAME[lang]} ilerlemesini sıfırla`} help="Kelimelerin kalır; tekrar takvimi, cevap geçmişi ve hatalar silinir.">
          <button type="button" className="btn btn-sm btn-danger" onClick={() => setDanger('language')}>
            Sıfırla
          </button>
        </Row>
        <Row
          label={account ? 'Bu cihazdaki verileri sil' : 'Tüm verileri sil'}
          help={account ? 'Hesabındaki veriler durur; yeniden giriş yapınca geri gelir.' : 'Kelimeler, ilerleme, görseller ve ayarlar bu cihazdan silinir.'}
        >
          <button type="button" className="btn btn-sm btn-danger" onClick={() => setDanger('all')}>
            Sil
          </button>
        </Row>
        {account && (
          <Row label="Hesabı sil" help="Hesabın ve sunucudaki her şey kalıcı olarak silinir.">
            <AccountDelete
              account={account}
              identity={identity}
              label="Hesabı sil"
              className="btn btn-sm btn-danger"
              onGone={() => {
                setAccount(null)
                setIdentity(null)
                onDataChanged()
              }}
            />
          </Row>
        )}
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
        <ConfirmDialog title={account ? 'Bu cihazdaki veriler silinsin mi?' : 'Tüm veriler silinsin mi?'} confirmLabel="Hepsini sil" danger onConfirm={deleteAll} onCancel={() => setDanger(null)}>
          {TARGET_LANGUAGES.map((l) => LANGUAGE_NAME[l]).join(', ')} için tüm kelimeler, ilerleme, görseller, ses kayıtları, profil ve ayarlar bu cihazdan silinir.
          {account ? ' Hesabındaki kopya durur; yeniden giriş yapınca geri gelir.' : ''}
        </ConfirmDialog>
      )}
    </>
  )
}
