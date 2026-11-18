import { Button, Tooltip } from '@fluentui/react-components'
import { ChevronLeftRegular, ChevronRightRegular, PlayFilled } from '@fluentui/react-icons'
import { memo, useRef, type CSSProperties, type ReactNode } from 'react'
import type { SpotifyImage } from '@/spotify/types'
import { Artwork } from './Artwork'

interface CardProps {
  title: string
  subtitle?: ReactNode
  images?: SpotifyImage[] | null
  round?: boolean
  onOpen: () => void
  onPlay?: () => void
  index?: number
}

/** Cartão de álbum/playlist/artista com efeito Reveal e botão de play flutuante. */
export const MediaCard = memo(function MediaCard({ title, subtitle, images, round, onOpen, onPlay, index = 0 }: CardProps) {
  return (
    <div
      className={`card reveal${round ? ' artist' : ''}`}
      role="button"
      tabIndex={0}
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
          <Tooltip content={`Tocar ${title}`} relationship="label" withArrow>
            <button
              className="card-play"
              onClick={(e) => {
                e.stopPropagation()
                onPlay()
              }}
            >
              <PlayFilled />
            </button>
          </Tooltip>
        )}
      </div>
      <span className="card-title" title={title}>
        {title}
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
            <div className="skeleton" style={{ position: 'absolute', inset: 0 }} />
          </div>
          <div className="skeleton" style={{ height: 12, width: '80%', marginTop: 4 }} />
          <div className="skeleton" style={{ height: 10, width: '50%', marginTop: 6 }} />
        </div>
      ))}
    </div>
  )
}

/** Seção com prateleira horizontal e setas de rolagem. */
export function Shelf({ title, children, action }: { title: string; children: ReactNode; action?: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null)
  const scroll = (dir: number): void => {
    const el = ref.current
    if (el) el.scrollBy({ left: dir * el.clientWidth * 0.85, behavior: 'smooth' })
  }
  return (
    <section className="section">
      <div className="section-head">
        <h2 className="t-subtitle">{title}</h2>
        <div className="actions">
          {action}
          <Button appearance="subtle" icon={<ChevronLeftRegular />} onClick={() => scroll(-1)} aria-label="Anterior" />
          <Button appearance="subtle" icon={<ChevronRightRegular />} onClick={() => scroll(1)} aria-label="Próximo" />
        </div>
      </div>
      <div className="shelf-wrap">
        <div ref={ref} className="shelf stagger">
          {children}
        </div>
      </div>
    </section>
  )
}
