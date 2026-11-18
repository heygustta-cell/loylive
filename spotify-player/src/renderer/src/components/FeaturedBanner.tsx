import { AlbumRegular, DesktopRegular } from '@fluentui/react-icons'
import type { CSSProperties } from 'react'
import { paletteVars, useImagePalette } from '@/lib/palette'
import { openUri } from '@/state/nav'
import { pickImage } from '@/spotify/api'
import { playSafe, togglePlay, transferHere, usePlayer } from '@/spotify/player'
import type { Track } from '@/spotify/types'
import { Artwork } from './Artwork'
import { Equalizer } from './Equalizer'
import { PlayPauseIcon } from './PlayerControls'

/**
 * Banner de destaque do Início: "Tocando agora" / "Continue de onde parou", com a capa desfocada,
 * as cores dela e a capa grande com brilho colorido.
 */
export function FeaturedBanner({ recent }: { recent: Track | null }) {
  const current = usePlayer((s) => s.track)
  const active = usePlayer((s) => s.active)
  const paused = usePlayer((s) => s.paused)
  const contextName = usePlayer((s) => s.contextName)

  const source = current
    ? {
        title: current.name,
        artists: current.artists.map((a) => a.name).join(', '),
        album: current.album.name,
        albumUri: current.album.uri,
        images: current.album.images,
        uri: current.uri
      }
    : recent
      ? {
          title: recent.name,
          artists: recent.artists.map((a) => a.name).join(', '),
          album: recent.album?.name ?? '',
          albumUri: recent.album?.uri ?? '',
          images: recent.album?.images ?? [],
          uri: recent.uri
        }
      : null

  const palette = useImagePalette(pickImage(source?.images, 300))
  if (!source) return null

  const playingHere = Boolean(current) && active && !paused
  const eyebrow = playingHere ? 'Tocando agora' : current && active ? 'Pausado' : 'Continue de onde parou'

  const primary = (): void => {
    if (current && active) void togglePlay()
    else if (current && !active) void transferHere(false)
    else if (recent) playSafe(recent.album?.uri ? { contextUri: recent.album.uri, offsetUri: recent.uri } : { uris: [recent.uri] })
  }
  const primaryLabel = current && active ? (paused ? 'Retomar' : 'Pausar') : current ? 'Tocar aqui' : 'Tocar'

  return (
    <section className="featured" style={paletteVars(palette) as CSSProperties}>
      <div className="featured-bg" aria-hidden="true">
        {palette?.backdrop && <img key={palette.backdrop} src={palette.backdrop} alt="" />}
        <div className="featured-wash" />
      </div>
      <div className="featured-art">
        <Artwork images={source.images} size={208} eager />
      </div>
      <div className="featured-info">
        <span className="featured-eyebrow">
          {playingHere && <Equalizer paused={false} />}
          {eyebrow}
          {contextName && current ? ` · ${contextName}` : ''}
        </span>
        <h2 key={source.uri} className={`featured-title display${source.title.length > 28 ? ' long' : ''}`}>
          {source.title}
        </h2>
        <span className="featured-sub">
          {source.artists}
          {source.album ? ` — ${source.album}` : ''}
        </span>
        <div className="featured-actions">
          <button className="pill pill-primary" onClick={primary}>
            {current && !active ? <DesktopRegular fontSize={18} /> : <PlayPauseIcon paused={!(current && active && !paused)} size={18} />}
            {primaryLabel}
          </button>
          {source.albumUri && (
            <button className="pill pill-glass" onClick={() => openUri(source.albumUri)}>
              <AlbumRegular fontSize={18} />
              Ver álbum
            </button>
          )}
        </div>
      </div>
    </section>
  )
}
