import { Button } from '@fluentui/react-components'
import { ArrowShuffleRegular, PlayFilled } from '@fluentui/react-icons'
import type { ReactNode } from 'react'
import type { SpotifyImage } from '@/spotify/types'
import { Artwork } from './Artwork'

interface Props {
  kind: string
  title: string
  images?: SpotifyImage[] | null
  art?: ReactNode
  round?: boolean
  description?: ReactNode
  meta?: ReactNode[]
  onPlay?: () => void
  onShuffle?: () => void
  extra?: ReactNode
}

/** Cabeçalho de coleção (playlist, álbum, artista) no estilo do Media Player. */
export function Hero({ kind, title, images, art, round, description, meta, onPlay, onShuffle, extra }: Props) {
  return (
    <div className="hero">
      {art ?? <Artwork images={images} size={216} round={round} className={`hero-art${round ? ' round' : ''}`} eager />}
      <div className="hero-info">
        <span className="hero-kind">{kind}</span>
        <h1 className="hero-title">{title}</h1>
        {description && <div className="hero-desc clamp-2">{description}</div>}
        {meta && meta.length > 0 && (
          <div className="hero-meta">
            {meta.filter(Boolean).map((m, i) => (
              <span key={i} className={i > 0 ? 'dot' : undefined}>
                {m}
              </span>
            ))}
          </div>
        )}
        {(onPlay || onShuffle || extra) && (
          <div className="hero-actions">
            {onPlay && (
              <Button appearance="primary" size="large" icon={<PlayFilled />} onClick={onPlay}>
                Reproduzir
              </Button>
            )}
            {onShuffle && (
              <Button size="large" icon={<ArrowShuffleRegular />} onClick={onShuffle}>
                Aleatório
              </Button>
            )}
            {extra}
          </div>
        )}
      </div>
    </div>
  )
}
