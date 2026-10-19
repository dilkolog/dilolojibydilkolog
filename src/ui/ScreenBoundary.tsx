import { Component, type ReactNode } from 'react'
import { reportError } from '../data/errorReport'
import { isChunkError } from './chunkError'
import { supportMailto } from './helpInfo'
import { StatusPicture } from './StatusArt'

/**
 * Keeps one broken screen from blanking the whole app: says what happened and offers a way out.
 * `resetKey` (the screen) clears the error when the learner goes elsewhere.
 */
export class ScreenBoundary extends Component<{ resetKey: string; onHome: () => void; children: ReactNode }, { error: unknown; key: string }> {
  state = { error: null as unknown, key: this.props.resetKey }

  static getDerivedStateFromError(error: unknown) {
    return { error }
  }

  static getDerivedStateFromProps(props: { resetKey: string }, state: { error: unknown; key: string }) {
    return props.resetKey !== state.key ? { error: null, key: props.resetKey } : null
  }

  componentDidCatch(error: unknown) {
    console.error(error)
    // A screen that failed to download is expected after a deploy or offline; not a bug.
    if (!isChunkError(error)) reportError(error, this.props.resetKey)
  }

  render() {
    const { error } = this.state
    if (!error) return this.props.children
    const chunk = isChunkError(error)
    return (
      <section className="card stack screen-error" role="alert">
        <span className="screen-error-art" aria-hidden>
          <StatusPicture kind={chunk ? (navigator.onLine ? 'update' : 'offline') : 'maint'} />
        </span>
        <h2 className="section-title">Bu ekran açılamadı</h2>
        <p className="small muted">
          {chunk
            ? navigator.onLine
              ? 'Bağlantı bir an koptu ya da uygulamanın yeni bir sürümü yüklendi; sayfayı yenileyince bu ekran açılır.'
              : 'İnternet yok ve bu ekran henüz cihaza indirilmemiş. Bağlantı gelince yeniden dene; tekrarların ve kelimelerin internetsiz de çalışır.'
            : 'Beklenmedik bir hata oldu. Verilerin güvende; yeniden denemek ya da sayfayı yenilemek genelde yeter.'}
        </p>
        {!chunk && error instanceof Error && <p className="small muted screen-error-detail">{error.message}</p>}
        <div className="row">
          <button className="btn" onClick={() => (chunk ? location.reload() : this.setState({ error: null }))}>
            {chunk ? 'Sayfayı yenile' : 'Yeniden dene'}
          </button>
          <button className="btn btn-quiet" onClick={this.props.onHome}>
            Bugün’e dön
          </button>
          {!chunk && (
            <a className="btn btn-quiet" href={supportMailto(`Bu ekran açılamadı (${this.props.resetKey})`)}>
              Bize yaz
            </a>
          )}
        </div>
      </section>
    )
  }
}
