import { FluentProvider, Tooltip } from '@fluentui/react-components'
import {
  ChevronDownRegular,
  FullScreenMaximizeRegular,
  FullScreenMinimizeRegular,
  TextBulletListLtrRegular
} from '@fluentui/react-icons'
import { Fragment, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { usePalette } from '@/lib/palette'
import { openUri } from '@/state/nav'
import { useUi } from '@/state/ui'
import { useSettings } from '@/state/settings'
import { buildFluentTheme } from '@/theme/fluentTheme'
import { pickImage } from '@/spotify/api'
import { playSafe, usePlayer, type PlayerTrack } from '@/spotify/player'
import { useQueue } from '@/spotify/queries'
import type { Track } from '@/spotify/types'
import { LikeButton } from './LikeButton'
import { SeekBar, TransportControls, VolumeControl } from './PlayerControls'

interface BgLayer {
  id: number
  src: string
  visible: boolean
}
let bgSeq = 0

/** Fundo com a capa desfocada (pré-renderizada) + crossfade entre faixas. */
function Backdrop() {
  const backdrop = usePalette((s) => s.palette?.backdrop ?? null)
  const [layers, setLayers] = useState<BgLayer[]>([])
  useEffect(() => {
    if (!backdrop) return
    const id = ++bgSeq
    setLayers((prev) => [...prev.map((l) => ({ ...l, visible: false })), { id, src: backdrop, visible: false }].slice(-3))
    let r2 = 0
    const r1 = requestAnimationFrame(() => {
      r2 = requestAnimationFrame(() => setLayers((p) => p.map((l) => (l.id === id ? { ...l, visible: true } : l))))
    })
    const t = setTimeout(() => setLayers((p) => p.filter((l) => l.id === id || l.visible)), 1400)
    return () => {
      cancelAnimationFrame(r1)
      cancelAnimationFrame(r2)
      clearTimeout(t)
    }
  }, [backdrop])
  return (
    <div className="np-bg" aria-hidden="true">
      {layers.map((l) => (
        <div key={l.id} className={`np-bg-layer${l.visible ? ' visible' : ''}`}>
          <img src={l.src} alt="" />
        </div>
      ))}
      <div className="np-scrim" />
      <div className="np-noise" />
    </div>
  )
}

function QueuePanel({ track }: { track: PlayerTrack }) {
  const { data } = useQueue(track.uri)
  const fallback = usePlayer((s) => s.nextTracks)
  const contextUri = usePlayer((s) => s.contextUri)
  const items: Array<Pick<Track, 'uri' | 'name'> & { artists: string; image: string | null }> = useMemo(() => {
    const fromApi = data?.queue ?? []
    if (fromApi.length)
      return fromApi.slice(0, 30).map((t) => ({
        uri: t.uri,
        name: t.name,
        artists: t.artists.map((a) => a.name).join(', '),
        image: pickImage(t.album?.images, 40)
      }))
    return fallback.map((t) => ({
      uri: t.uri,
      name: t.name,
      artists: t.artists.map((a) => a.name).join(', '),
      image: pickImage(t.album.images, 40)
    }))
  }, [data, fallback])

  return (
    <aside className="np-queue">
      <h3>A seguir</h3>
      <div className="np-queue-list">
        {items.length === 0 && <div style={{ padding: '8px 10px', opacity: 0.7, fontSize: 13 }}>A fila está vazia.</div>}
        {items.map((t, i) => (
          <button
            key={`${t.uri}-${i}`}
            className="np-queue-item"
            onDoubleClick={() =>
              playSafe(contextUri ? { contextUri, offsetUri: t.uri } : { uris: [t.uri] }, { uris: [t.uri] })
            }
          >
            {t.image ? <img src={t.image} alt="" loading="lazy" /> : <span className="ph" />}
            <span className="meta">
              <span className="ellipsis">{t.name}</span>
              <span className="ellipsis">{t.artists}</span>
            </span>
          </button>
        ))}
      </div>
    </aside>
  )
}

/** Anima a capa do player (miniatura) até a posição grande — "connected animation" do Fluent. */
function connectedAnimation(dest: HTMLElement, reverse: boolean): Animation | null {
  const source = document.querySelector<HTMLElement>('.player-art')
  if (!source || document.documentElement.dataset.reduceMotion === 'on') return null
  const s = source.getBoundingClientRect()
  const d = dest.getBoundingClientRect()
  if (!d.width || !s.width) return null
  const from = `translate3d(${s.left - d.left}px, ${s.top - d.top}px, 0) scale(${s.width / d.width})`
  const frames = [{ transform: from, borderRadius: '24px' }, { transform: 'none', borderRadius: '10px' }]
  return dest.animate(reverse ? frames.reverse() : frames, {
    duration: reverse ? 260 : 560,
    easing: reverse ? 'cubic-bezier(0.7, 0, 1, 0.5)' : 'cubic-bezier(0.1, 0.9, 0.2, 1)',
    fill: 'both'
  })
}

export function NowPlaying() {
  const open = useUi((s) => s.nowPlayingOpen)
  const fullscreen = useUi((s) => s.fullscreen)
  const setNowPlaying = useUi((s) => s.setNowPlaying)
  const track = usePlayer((s) => s.track)
  const contextName = usePlayer((s) => s.contextName)
  const accent = useSettings((s) => s.system.accent)
  const [mounted, setMounted] = useState(open)
  const [closing, setClosing] = useState(false)
  const [showQueue, setShowQueue] = useState(true)
  const artRef = useRef<HTMLImageElement>(null)
  const firstAlbum = useRef<string | null>(null)
  const darkTheme = useMemo(() => ({ ...buildFluentTheme(accent, true), colorNeutralBackground1: 'transparent' }), [accent])

  useEffect(() => {
    if (open) {
      setMounted(true)
      setClosing(false)
      window.sonora.window.setOverlayTone('dark')
    } else if (mounted) {
      setClosing(true)
      if (artRef.current) connectedAnimation(artRef.current, true)
      const t = setTimeout(() => {
        setMounted(false)
        setClosing(false)
        window.sonora.window.setOverlayTone('auto')
      }, 220)
      return () => clearTimeout(t)
    }
    return undefined
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  useLayoutEffect(() => {
    if (mounted && open) {
      firstAlbum.current = track?.album.uri ?? null
      if (artRef.current) connectedAnimation(artRef.current, false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mounted])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') {
        if (fullscreen) window.sonora.window.toggleFullscreen()
        else setNowPlaying(false)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, fullscreen, setNowPlaying])

  // Sem faixa: fecha.
  useEffect(() => {
    if (open && !track) setNowPlaying(false)
  }, [open, track, setNowPlaying])

  if (!mounted || !track) return null
  const art = pickImage(track.album.images, 640)
  const swap = firstAlbum.current !== null && firstAlbum.current !== track.album.uri

  return (
    <FluentProvider theme={darkTheme} className="np-provider">
      <section className="np" data-closing={closing ? 'true' : 'false'} aria-label="Tocando agora">
        <Backdrop />
        <div className="np-top">
          <Tooltip content="Fechar (Esc)" relationship="label" withArrow>
            <button className="ctl ctl-sm" onClick={() => setNowPlaying(false)}>
              <ChevronDownRegular />
            </button>
          </Tooltip>
          <span style={{ fontSize: 12, opacity: 0.8 }}>Tocando agora</span>
        </div>

        <div className="np-body" data-queue={showQueue ? 'true' : 'false'}>
          <div className="np-art-wrap">
            {art && (
              <img
                key={track.album.uri}
                ref={artRef}
                className={`np-art${swap ? ' swap' : ''}`}
                src={art}
                alt={track.album.name}
                draggable={false}
              />
            )}
          </div>
          <div key={track.uri} className="np-info">
            {contextName && <div className="np-context">Tocando de {contextName}</div>}
            <div className="np-title">{track.name}</div>
            <div className="np-artist">
              {track.artists.map((a, i) => (
                <Fragment key={a.uri || i}>
                  {i > 0 && ', '}
                  <button
                    className="link"
                    onClick={() => {
                      setNowPlaying(false)
                      openUri(a.uri)
                    }}
                  >
                    {a.name}
                  </button>
                </Fragment>
              ))}
            </div>
            <button
              className="link np-album"
              style={{ alignSelf: 'flex-start' }}
              onClick={() => {
                setNowPlaying(false)
                openUri(track.album.uri)
              }}
            >
              {track.album.name}
            </button>
            <div style={{ marginTop: 10 }}>
              <LikeButton uri={track.uri} size="md" />
            </div>
          </div>
          {showQueue && <QueuePanel track={track} />}
        </div>

        <div className="np-footer">
          <SeekBar className="np-seek" />
          <div className="np-controls">
            <div />
            <div className="center">
              <TransportControls size="lg" />
            </div>
            <div className="right">
              <Tooltip content={showQueue ? 'Ocultar fila' : 'Mostrar fila'} relationship="label" withArrow>
                <button className="ctl ctl-sm" data-on={showQueue ? 'true' : 'false'} onClick={() => setShowQueue((v) => !v)}>
                  <TextBulletListLtrRegular />
                </button>
              </Tooltip>
              <VolumeControl />
              <Tooltip content={fullscreen ? 'Sair da tela cheia' : 'Tela cheia'} relationship="label" withArrow>
                <button className="ctl ctl-sm" onClick={() => window.sonora.window.toggleFullscreen()}>
                  {fullscreen ? <FullScreenMinimizeRegular /> : <FullScreenMaximizeRegular />}
                </button>
              </Tooltip>
            </div>
          </div>
        </div>
      </section>
    </FluentProvider>
  )
}

