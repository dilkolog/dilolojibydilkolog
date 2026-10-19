import { Component, type ReactNode } from 'react'
import { reportError } from '../data/errorReport'
import { db } from '../data/instance'
import { downloadBackup } from './backup'
import { supportMailto } from './helpInfo'
import { StatusPicture } from './StatusArt'

/**
 * The last net: a render error outside any screen (the side bar, the top bar, the toasts) used to blank the
 * whole app. Says so, keeps the data safe in view (it is on the device), and offers the two things that help:
 * reload, and a backup file to hold on to.
 */
export class RootBoundary extends Component<{ children: ReactNode }, { error: unknown; saved: boolean }> {
  state = { error: null as unknown, saved: false }

  static getDerivedStateFromError(error: unknown) {
    return { error }
  }

  componentDidCatch(error: unknown) {
    console.error(error)
    reportError(error, 'root')
  }

  render() {
    if (!this.state.error) return this.props.children
    return (
      <main className="root-error" role="alert">
        <StatusPicture kind="maint" />
        <h1>Uygulama açılamadı</h1>
        <p>Beklenmedik bir hata oldu. Verilerin bu cihazda duruyor, bir şey silinmedi. Sayfayı yenilemek genelde yeter; yine de emin olmak istersen önce bir yedek indir.</p>
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
