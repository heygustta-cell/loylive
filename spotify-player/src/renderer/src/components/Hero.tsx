import { Menu, MenuItem, MenuList, MenuPopover, MenuTrigger, Tooltip } from '@fluentui/react-components'
import { ArrowShuffleRegular, CopyRegular, MoreHorizontalRegular, OpenRegular } from '@fluentui/react-icons'
import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { notify } from '@/lib/notify'
import { paletteVars, useImagePalette } from '@/lib/palette'
import { pickImage } from '@/spotify/api'
import type { SpotifyImage } from '@/spotify/types'
import type { RGB } from '@/theme/colors'
import { Artwork } from './Artwork'
import { ContextPlayButton } from './PlayerControls'
import { useScrollElement } from './ScrollContext'

interface Props {
  kind: string
  title: string
  images?: SpotifyImage[] | null
  /** Arte personalizada (ex.: "Músicas curtidas"). */
  art?: ReactNode
  round?: boolean
  description?: ReactNode
  meta?: ReactNode[]
  contextUri?: string | null
  onPlay?: () => void
  onShuffle?: () => void
  /** Link público (open.spotify.com) para "copiar link"/"abrir no Spotify". */
  shareUrl?: string | null
  /** Cores quando não há imagem (ex.: curtidas). */
  fallbackColors?: [RGB, RGB, RGB]
}

/** Inclinação 3D sutil da capa seguindo o cursor (só transform → GPU). */
function useTilt() {
  const ref = useRef<HTMLDivElement>(null)
  const onMove = (e: React.PointerEvent): void => {
    const el = ref.current
    if (!el || document.documentElement.dataset.reduceMotion === 'on') return
    const r = el.getBoundingClientRect()
    const x = (e.clientX - r.left) / r.width - 0.5
    const y = (e.clientY - r.top) / r.height - 0.5
    el.style.transform = `perspective(800px) rotateY(${x * 10}deg) rotateX(${-y * 10}deg) scale(1.02)`
    el.style.setProperty('--shine-x', `${(x + 0.5) * 100}%`)
    el.style.setProperty('--shine-y', `${(y + 0.5) * 100}%`)
  }
  const onLeave = (): void => {
    if (ref.current) ref.current.style.transform = ''
  }
  return { ref, onPointerMove: onMove, onPointerLeave: onLeave }
}

function CompactHeader({
  visible,
  title,
  images,
  round,
  contextUri,
  onPlay,
  style
}: {
  visible: boolean
  title: string
  images?: SpotifyImage[] | null
  round?: boolean
  contextUri?: string | null
  onPlay?: () => void
  style: CSSProperties
}) {
  const slot = document.getElementById('content-overlay')
  if (!slot) return null
  return createPortal(
    <div className="compact-head" data-visible={visible ? 'true' : 'false'} style={style} aria-hidden={!visible}>
      {onPlay && <ContextPlayButton contextUri={contextUri} onPlay={onPlay} size="sm" />}
      {images && <Artwork images={images} size={36} round={round} className="compact-art" />}
      <span className="compact-title">{title}</span>
    </div>,
    slot
  )
}

/** Cabeçalho imersivo de coleção (playlist, álbum, artista) — fundo com a capa e as cores dela. */
export function Hero({
  kind,
  title,
  images,
  art,
  round,
  description,
  meta,
  contextUri,
  onPlay,
  onShuffle,
  shareUrl,
  fallbackColors
}: Props) {
  const palette = useImagePalette(pickImage(images, 300))
  const vars = paletteVars(palette, fallbackColors) as CSSProperties
  const tilt = useTilt()
  const scrollEl = useScrollElement()
  const sentinel = useRef<HTMLDivElement>(null)
  const [scrolledPast, setScrolledPast] = useState(false)

  // Mostra a barra compacta quando o cabeçalho sai da área visível (sem listener de scroll).
  useEffect(() => {
    const el = sentinel.current
    if (!el || !scrollEl) return
    const io = new IntersectionObserver(([e]) => setScrolledPast(!e.isIntersecting && e.boundingClientRect.top < 200), {
      root: scrollEl,
      rootMargin: '-72px 0px 0px 0px'
    })
    io.observe(el)
    return () => io.disconnect()
  }, [scrollEl])

  const long = title.length > 26
  return (
    <>
      <section className="hero2" style={vars} data-has-colors={palette || fallbackColors ? 'true' : 'false'}>
        <div className="hero2-bg" aria-hidden="true">
          {palette?.backdrop && <img key={palette.backdrop} src={palette.backdrop} alt="" />}
          <div className="hero2-wash" />
        </div>
        <div className="hero2-inner">
          <div className={`hero2-art${round ? ' round' : ''}`} {...tilt}>
            {art ?? <Artwork images={images} size={232} round={round} eager />}
            <span className="hero2-shine" />
          </div>
          <div className="hero2-info">
            <span className="eyebrow">{kind}</span>
            <h1 className={`hero2-title display${long ? ' long' : ''}`}>{title}</h1>
            {description && <div className="hero2-desc clamp-2">{description}</div>}
            {meta && meta.length > 0 && (
              <div className="hero2-meta">
                {meta.filter(Boolean).map((m, i) => (
                  <span key={i} className={i > 0 ? 'dot' : undefined}>
                    {m}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      </section>

      <div className="hero2-actions" style={vars}>
        {onPlay && <ContextPlayButton contextUri={contextUri} onPlay={onPlay} />}
        {onShuffle && (
          <Tooltip content="Aleatório" relationship="label" withArrow>
            <button className="round-btn" onClick={onShuffle}>
              <ArrowShuffleRegular fontSize={22} />
            </button>
          </Tooltip>
        )}
        {shareUrl && (
          <Menu positioning={{ position: 'below', align: 'start' }}>
            <MenuTrigger disableButtonEnhancement>
              <Tooltip content="Mais opções" relationship="label" withArrow>
                <button className="round-btn">
                  <MoreHorizontalRegular fontSize={22} />
                </button>
              </Tooltip>
            </MenuTrigger>
            <MenuPopover>
              <MenuList>
                <MenuItem
                  icon={<CopyRegular />}
                  onClick={() => {
                    void navigator.clipboard.writeText(shareUrl)
                    notify('Link copiado', { intent: 'success', timeout: 2000 })
                  }}
                >
                  Copiar link
                </MenuItem>
                <MenuItem icon={<OpenRegular />} onClick={() => void window.sonora.openExternal(shareUrl)}>
                  Abrir no Spotify
                </MenuItem>
              </MenuList>
            </MenuPopover>
          </Menu>
        )}
        <div ref={sentinel} className="hero2-sentinel" />
      </div>

      <CompactHeader
        visible={scrolledPast}
        title={title}
        images={images}
        round={round}
        contextUri={contextUri}
        onPlay={onPlay}
        style={vars}
      />
    </>
  )
}
