import { Component, type ReactNode } from 'react'
import { reportError } from '../../data/errorReport'
import { db } from '../../data/instance'
import { downloadBackup } from '../settings/backup'
import { supportMailto } from '../settings/helpInfo'
import { StatusPicture } from './StatusArt'
import { dropBootHero } from '../home/bootHero'
import { isChunkError, reloadForNewVersion } from './chunkError'

/**
 * The last net: a render error outside any screen (the side bar, the top bar, the toasts) used to blank the
 * whole app. Says so, keeps the data safe in view (it is on the device), and offers the two things that help:
 * reload, and a backup file to hold on to.
 *
 * Some of the app's own parts are downloaded outside any screen (Monki, the command palette, the landing and sign-in
 * pages): after a deploy their old files are gone, and that lands here, not in a ScreenBoundary. It is not a bug:
 * the page picks up the new version by itself (chunkError.ts), and the text says so if it could not.
 */
export class RootBoundary extends Component<{ children: ReactNode }, { error: unknown; saved: boolean }> {
  state = { error: null as unknown, saved: false }

  static getDerivedStateFromError(error: unknown) {
    return { error }
  }

  componentDidCatch(error: unknown) {
    // Nothing may cover the error screen, not the landing page's first lines from index.html either.
    dropBootHero()
    console.error(error)
    if (isChunkError(error)) reloadForNewVersion()
    else reportError(error, 'root')
  }

  render() {
    const { error } = this.state
    if (!error) return this.props.children
    const chunk = isChunkError(error)
    const online = typeof navigator === 'undefined' || navigator.onLine
    return (
      <main className="root-error" role="alert">
        <StatusPicture kind={chunk ? (online ? 'update' : 'offline') : 'maint'} />
        <h1>Uygulama açılamadı</h1>
        <p>
          {chunk
            ? online
              ? 'Uygulamanın yeni bir sürümü yüklendi ya da bağlantı bir an koptu; sayfayı yenileyince açılır. Verilerin bu cihazda duruyor.'
              : 'İnternet yok ve uygulamanın bu parçası henüz cihaza indirilmemiş. Bağlantı gelince sayfayı yenile; verilerin bu cihazda duruyor.'
            : 'Beklenmedik bir hata oldu. Verilerin bu cihazda duruyor, bir şey silinmedi. Sayfayı yenilemek genelde yeter; yine de emin olmak istersen önce bir yedek indir.'}
        </p>
        {/* What went wrong, in the error's own words: a screenshot sent to the owner then says more than "it broke". */}
        {!chunk && error instanceof Error && error.message && <p className="small muted screen-error-detail">{error.message.slice(0, 200)}</p>}
        <div className="root-error-actions">
          <button className="btn" onClick={() => location.reload()}>
            Sayfayı yenile
          </button>
          <button
            className="btn btn-quiet"
            onClick={() => {
              void downloadBackup(db).then(
                () => this.setState({ saved: true }),
                () => {},
              )
            }}
          >
            {this.state.saved ? 'Yedek indirildi' : 'Yedeği indir'}
          </button>
          <a className="btn btn-quiet" href={supportMailto('Uygulama açılamadı')}>
            Bize yaz
          </a>
        </div>
      </main>
    )
  }
}
