import { Tooltip } from '@fluentui/react-components'
import { ChevronLeftRegular, ChevronRightRegular, PlayFilled } from '@fluentui/react-icons'
import { memo, useCallback, useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import { formatTime } from '@/lib/format'
import { useUi } from '@/state/ui'
import { usePlayer } from '@/spotify/player'
import type { SpotifyImage, Track } from '@/spotify/types'
import { Artwork } from './Artwork'
import { Equalizer } from './Equalizer'
import { ContextPlayButton } from './PlayerControls'

interface CardProps {
  title: string
  subtitle?: ReactNode
  images?: SpotifyImage[] | null
  round?: boolean
  onOpen: () => void
  onPlay?: () => void
  contextUri?: string
  index?: number
}

/** Cartão de álbum/playlist/artista: zoom suave na capa, sombra que "acende" e play com mola. */
export const MediaCard = memo(function MediaCard({ title, subtitle, images, round, onOpen, onPlay, contextUri, index = 0 }: CardProps) {
  const playing = usePlayer((s) => Boolean(contextUri) && s.active && !s.paused && s.contextUri === contextUri)
  return (
    <div
      className={`card reveal${round ? ' artist' : ''}`}
      role="button"
      tabIndex={0}
      data-playing={playing ? 'true' : 'false'}
      style={{ '--i': index } as CSSProperties}
      onClick={onOpen}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onOpen()
        }
      }}
    >
      <div className="card-art-wrap">
        <Artwork images={images} size={176} round={round} />
        {onPlay && (
          <div className="card-play-wrap">
            <ContextPlayButton contextUri={contextUri} onPlay={onPlay} size="md" label={`Tocar ${title}`} />
          </div>
        )}
      </div>
      <span className="card-title" title={title}>
        {playing && <Equalizer paused={false} />}
        <span className="ellipsis">{title}</span>
      </span>
      {subtitle && <span className="card-sub">{subtitle}</span>}
    </div>
  )
})

export function CardGrid({ children }: { children: ReactNode }) {
  return <div className="grid stagger">{children}</div>
}

export function CardSkeletons({ count = 8 }: { count?: number }) {
  return (
    <div className="grid">
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="card" style={{ pointerEvents: 'none' }}>
          <div className="card-art-wrap">
            <div className="skeleton" style={{ position: 'absolute', inset: 0, borderRadius: 8 }} />
          </div>
          <div className="skeleton" style={{ height: 12, width: '80%', marginTop: 4 }} />
          <div className="skeleton" style={{ height: 10, width: '50%', marginTop: 6 }} />
        </div>
      ))}
    </div>
  )
}

/** Seção com prateleira horizontal: bordas esfumadas quando há mais conteúdo e setas flutuantes. */
export function Shelf({ title, children, action, className }: { title: string; children: ReactNode; action?: ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null)
  const [edges, setEdges] = useState({ left: false, right: false })
  const raf = useRef(0)

  const measure = useCallback(() => {
    raf.current = 0
    const el = ref.current
    if (!el) return
    const left = el.scrollLeft > 4
    const right = el.scrollLeft + el.clientWidth < el.scrollWidth - 4
    setEdges((prev) => (prev.left === left && prev.right === right ? prev : { left, right }))
  }, [])

  useEffect(() => {
    const el = ref.current
    if (!el) return
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    const onScroll = (): void => {
      if (!raf.current) raf.current = requestAnimationFrame(measure)
    }
    el.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      ro.disconnect()
      el.removeEventListener('scroll', onScroll)
      cancelAnimationFrame(raf.current)
    }
  }, [measure])

  const scroll = (dir: number): void => {
    const el = ref.current
    if (el) el.scrollBy({ left: dir * el.clientWidth * 0.85, behavior: 'smooth' })
  }
  return (
    <section className={`section${className ? ` ${className}` : ''}`}>
      <div className="section-head">
        <h2 className="section-title">{title}</h2>
        {action && <div className="actions">{action}</div>}
      </div>
      <div className="shelf-wrap" data-left={edges.left ? 'true' : 'false'} data-right={edges.right ? 'true' : 'false'}>
        <div ref={ref} className="shelf stagger">
          {children}
        </div>
        <button className="shelf-arrow left" onClick={() => scroll(-1)} aria-label="Anterior" tabIndex={-1}>
          <ChevronLeftRegular fontSize={20} />
        </button>
        <button className="shelf-arrow right" onClick={() => scroll(1)} aria-label="Próximo" tabIndex={-1}>
          <ChevronRightRegular fontSize={20} />
        </button>
      </div>
    </section>
  )
}

/** Atalho rápido (estilo "tiles"): capa à esquerda, nome, play que surge no hover. */
export function QuickTile({
  title,
  images,
  art,
  contextUri,
  onOpen,
  onPlay,
  index = 0
}: {
  title: string
  images?: SpotifyImage[] | null
  art?: ReactNode
  contextUri?: string | null
  onOpen: () => void
  onPlay: () => void
  index?: number
}) {
  const playing = usePlayer((s) => Boolean(contextUri) && s.active && !s.paused && s.contextUri === contextUri)
  return (
    <div
      className="tile reveal"
      role="button"
      tabIndex={0}
      data-playing={playing ? 'true' : 'false'}
      style={{ '--i': index } as CSSProperties}
      onClick={onOpen}
      onKeyDown={(e) => e.key === 'Enter' && onOpen()}
    >
      <div className="tile-art">{art ?? <Artwork images={images} size={64} />}</div>
      <span className="tile-title">{title}</span>
      {playing && <Equalizer paused={false} />}
      <div className="tile-play">
        <ContextPlayButton contextUri={contextUri} onPlay={onPlay} size="sm" label={`Tocar ${title}`} />
      </div>
    </div>
  )
}

/** Grade horizontal de faixas (4 linhas), como "Mais ouvidas" dos players premium. */
export function TrackGrid({ tracks, onPlay }: { tracks: Track[]; onPlay: (track: Track, index: number) => void }) {
  const currentUri = usePlayer((s) => s.track?.uri)
  const paused = usePlayer((s) => s.paused)
  const openContextMenu = useUi((s) => s.openContextMenu)
  return (
    <div className="track-grid stagger">
      {tracks.map((t, i) => {
        const playing = t.uri === currentUri
        return (
          <div
            key={t.uri}
            className="tg-item reveal"
            role="button"
            tabIndex={0}
            data-playing={playing ? 'true' : 'false'}
            style={{ '--i': i } as CSSProperties}
            onDoubleClick={() => onPlay(t, i)}
            onKeyDown={(e) => e.key === 'Enter' && onPlay(t, i)}
            onContextMenu={(e) => {
              e.preventDefault()
              openContextMenu({ track: t, x: e.clientX, y: e.clientY })
            }}
          >
            <div className="tg-art">
              <Artwork images={t.album?.images} size={48} />
              <Tooltip content={`Tocar ${t.name}`} relationship="label" withArrow>
                <button
                  className="tg-play"
                  onClick={(e) => {
                    e.stopPropagation()
                    onPlay(t, i)
                  }}
                >
                  {playing && !paused ? <Equalizer paused={false} /> : <PlayFilled fontSize={18} />}
                </button>
              </Tooltip>
            </div>
            <div className="tg-text">
              <span className="tg-name ellipsis">{t.name}</span>
              <span className="tg-sub ellipsis">
                {t.explicit && <span className="explicit">E</span>}
                {t.artists.map((a) => a.name).join(', ')}
              </span>
            </div>
            <span className="tg-dur">{formatTime(t.duration_ms)}</span>
          </div>
        )
      })}
    </div>
  )
}

