import { useVirtualizer } from '@tanstack/react-virtual'
import { ClockRegular, MoreHorizontalRegular, PlayFilled } from '@fluentui/react-icons'
import { Fragment, memo, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { formatTime } from '@/lib/format'
import { openUri } from '@/state/nav'
import { useUi } from '@/state/ui'
import { usePlayer } from '@/spotify/player'
import type { Track } from '@/spotify/types'
import { Artwork } from './Artwork'
import { Equalizer } from './Equalizer'
import { LikeButton } from './LikeButton'
import { useScrollElement } from './ScrollContext'

const ROW_H = 56

interface Props {
  tracks: Track[]
  /** Toca a faixa `index` (o chamador decide o contexto). */
  onPlay: (track: Track, index: number) => void
  contextUri?: string
  showAlbum?: boolean
  showArt?: boolean
  /** Usa o número da faixa do álbum em vez da posição na lista. */
  trackNumbers?: boolean
  hasMore?: boolean
  loadMore?: () => void
  loadingMore?: boolean
  /** Linhas fantasmas enquanto carrega. */
  placeholderCount?: number
}

interface RowProps {
  track: Track
  index: number
  start: number
  playing: boolean
  paused: boolean
  selected: boolean
  showAlbum: boolean
  showArt: boolean
  number: number
  onPlay: (track: Track, index: number) => void
  onSelect: (index: number) => void
  contextUri?: string
}

const Row = memo(function Row({
  track,
  index,
  start,
  playing,
  paused,
  selected,
  showAlbum,
  showArt,
  number,
  onPlay,
  onSelect,
  contextUri
}: RowProps) {
  const openContextMenu = useUi((s) => s.openContextMenu)
  const unplayable = track.is_playable === false
  return (
    <div
      className="tl-row reveal"
      role="row"
      tabIndex={-1}
      style={{ transform: `translate3d(0, ${start}px, 0)` }}
      data-odd={index % 2 === 1 ? 'true' : 'false'}
      data-playing={playing ? 'true' : 'false'}
      data-selected={selected ? 'true' : 'false'}
      data-unplayable={unplayable ? 'true' : 'false'}
      onClick={() => onSelect(index)}
      onDoubleClick={() => !unplayable && onPlay(track, index)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' && !unplayable) onPlay(track, index)
      }}
      onContextMenu={(e) => {
        e.preventDefault()
        onSelect(index)
        openContextMenu({ track, x: e.clientX, y: e.clientY, contextUri })
      }}
    >
      <div className="tl-index">
        {playing ? <Equalizer paused={paused} /> : <span className="num">{number}</span>}
        {!unplayable && (
          <button
            className="play"
            aria-label={`Tocar ${track.name}`}
            onClick={(e) => {
              e.stopPropagation()
              onPlay(track, index)
            }}
          >
            <PlayFilled />
          </button>
        )}
      </div>
      <div className="tl-main">
        {showArt && <Artwork images={track.album?.images} size={40} />}
        <div className="tl-text">
          <span className="tl-name" title={track.name}>
            {track.name}
          </span>
          <span className="tl-artists">
            {track.explicit && <span className="explicit" title="Explícito">E</span>}
            <span className="ellipsis">
              {track.artists.map((a, i) => (
                <Fragment key={a.uri || i}>
                  {i > 0 && ', '}
                  <button
                    className="link"
                    onClick={(e) => {
                      e.stopPropagation()
                      openUri(a.uri)
                    }}
                  >
                    {a.name}
                  </button>
                </Fragment>
              ))}
            </span>
          </span>
        </div>
      </div>
      {showAlbum && (
        <div className="tl-album">
          {track.album && (
            <button
              className="link ellipsis"
              onClick={(e) => {
                e.stopPropagation()
                openUri(track.album?.uri)
              }}
            >
              {track.album.name}
            </button>
          )}
        </div>
      )}
      <div className="tl-like">
        <LikeButton uri={track.uri} />
        <button
          className="more-btn"
          aria-label="Mais opções"
          onClick={(e) => {
            e.stopPropagation()
            const r = e.currentTarget.getBoundingClientRect()
            onSelect(index)
            openContextMenu({ track, x: r.left, y: r.bottom, contextUri })
          }}
        >
          <MoreHorizontalRegular />
        </button>
      </div>
      <div className="tl-dur">{formatTime(track.duration_ms)}</div>
    </div>
  )
})

export function TrackList({
  tracks,
  onPlay,
  contextUri,
  showAlbum = true,
  showArt = true,
  trackNumbers = false,
  hasMore,
  loadMore,
  loadingMore,
  placeholderCount = 0
}: Props) {
  const scrollEl = useScrollElement()
  const listRef = useRef<HTMLDivElement>(null)
  const [margin, setMargin] = useState(0)
  const [selected, setSelected] = useState<number | null>(null)
  const currentUri = usePlayer((s) => s.track?.uri)
  const paused = usePlayer((s) => s.paused)

  // Distância da lista até o topo do contêiner de rolagem (o cabeçalho da página fica acima).
  useLayoutEffect(() => {
    const el = listRef.current
    if (!el || !scrollEl) return
    const measure = (): void => {
      const m = el.getBoundingClientRect().top - scrollEl.getBoundingClientRect().top + scrollEl.scrollTop
      setMargin((prev) => (Math.abs(prev - m) > 0.5 ? m : prev))
    }
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(scrollEl)
    if (el.parentElement) ro.observe(el.parentElement)
    return () => ro.disconnect()
  }, [scrollEl])

  const count = tracks.length + (tracks.length === 0 ? placeholderCount : 0)
  const virtualizer = useVirtualizer({
    count,
    getScrollElement: () => scrollEl,
    estimateSize: () => ROW_H,
    overscan: 14,
    scrollMargin: margin
  })
  const items = virtualizer.getVirtualItems()

  // Carregamento infinito: busca a próxima página ao chegar perto do fim.
  const lastIndex = items.length ? items[items.length - 1].index : 0
  useEffect(() => {
    if (hasMore && !loadingMore && loadMore && lastIndex >= tracks.length - 20) loadMore()
  }, [lastIndex, hasMore, loadingMore, loadMore, tracks.length])

  return (
    <div className="tracklist" data-album={showAlbum ? 'true' : 'false'} role="grid">
      <div className="tl-head" role="row">
        <span style={{ textAlign: 'center' }}>#</span>
        <span>Título</span>
        {showAlbum && <span className="tl-album">Álbum</span>}
        <span />
        <span className="tl-dur" title="Duração">
          <ClockRegular />
        </span>
      </div>
      <div ref={listRef} className="tl-body" style={{ height: virtualizer.getTotalSize() }}>
        {items.map((vi) => {
          const track = tracks[vi.index]
          const start = vi.start - virtualizer.options.scrollMargin
          if (!track) {
            return (
              <div key={`ph-${vi.index}`} className="tl-row" style={{ transform: `translate3d(0, ${start}px, 0)` }}>
                <span />
                <div className="tl-main">
                  <div className="skeleton" style={{ width: 40, height: 40 }} />
                  <div className="tl-text" style={{ gap: 6 }}>
                    <div className="skeleton" style={{ width: 180, height: 12 }} />
                    <div className="skeleton" style={{ width: 120, height: 10 }} />
                  </div>
                </div>
              </div>
            )
          }
          return (
            <Row
              key={`${track.uri}-${vi.index}`}
              track={track}
              index={vi.index}
              start={start}
              playing={track.uri === currentUri}
              paused={paused}
              selected={selected === vi.index}
              showAlbum={showAlbum}
              showArt={showArt}
              number={trackNumbers && track.track_number ? track.track_number : vi.index + 1}
              onPlay={onPlay}
              onSelect={setSelected}
              contextUri={contextUri}
            />
          )
        })}
      </div>
    </div>
  )
}
