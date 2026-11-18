import { Spinner, Tooltip } from '@fluentui/react-components'
import {
  ArrowMaximizeRegular,
  DesktopRegular,
  PictureInPictureEnterRegular,
  TextBulletListLtrRegular
} from '@fluentui/react-icons'
import { Fragment } from 'react'
import { openUri, navigate, useNav } from '@/state/nav'
import { useUi } from '@/state/ui'
import { transferHere, usePlayer } from '@/spotify/player'
import { Artwork } from './Artwork'
import { Equalizer } from './Equalizer'
import { LikeButton } from './LikeButton'
import { SeekBar, TransportControls, VolumeControl } from './PlayerControls'

function NowInfo() {
  const track = usePlayer((s) => s.track)
  const status = usePlayer((s) => s.status)
  const active = usePlayer((s) => s.active)
  const paused = usePlayer((s) => s.paused)
  const setNowPlaying = useUi((s) => s.setNowPlaying)

  if (!track) {
    return (
      <div className="dock-now">
        <div className="dock-art empty">{status === 'loading' && <Spinner size="tiny" />}</div>
        <div className="dock-meta">
          <span className="title">{status === 'loading' ? 'Conectando ao Spotify…' : 'Nada tocando'}</span>
          <span className="sub">
            {status === 'ready' && !active ? 'Escolha uma música ou transfira a reprodução para cá' : 'Sonora'}
          </span>
        </div>
      </div>
    )
  }

  return (
    <div className="dock-now">
      <Tooltip content="Tocando agora" relationship="label" withArrow>
        <button className="dock-art player-art" onClick={() => setNowPlaying(true)} aria-label="Abrir Tocando agora">
          <Artwork images={track.album.images} size={56} eager />
          <span className="expand-hint">
            <ArrowMaximizeRegular fontSize={18} />
          </span>
        </button>
      </Tooltip>
      <div key={track.uri} className="dock-meta track-swap">
        <span className="title-row">
          {active && !paused && <Equalizer paused={false} />}
          <button className="link title" onClick={() => openUri(track.album.uri)} title={track.name}>
            {track.name}
          </button>
        </span>
        <span className="sub">
          {track.artists.map((a, i) => (
            <Fragment key={a.uri || i}>
              {i > 0 && ', '}
              <button className="link" onClick={() => openUri(a.uri)}>
                {a.name}
              </button>
            </Fragment>
          ))}
        </span>
      </div>
      <LikeButton uri={track.uri} />
    </div>
  )
}

/** Player flutuante ("dock") de vidro, com brilho na cor da capa atual. */
export function PlayerBar() {
  const active = usePlayer((s) => s.active)
  const ready = usePlayer((s) => s.status === 'ready')
  const onQueue = useNav((s) => s.current.name === 'queue')
  const setNowPlaying = useUi((s) => s.setNowPlaying)
  const setMini = useUi((s) => s.setMini)
  const hasTrack = usePlayer((s) => Boolean(s.track))

  return (
    <footer className="player dock" aria-label="Player">
      <div className="dock-glow" aria-hidden="true" />
      <NowInfo />
      <div className="dock-center">
        <div className="player-controls">
          <TransportControls />
        </div>
        <SeekBar className="dock-seek" />
      </div>
      <div className="dock-right">
        {ready && !active && (
          <Tooltip content="Transferir a reprodução para este PC" relationship="label" withArrow>
            <button className="ctl ctl-sm" onClick={() => void transferHere(false)} data-on="true">
              <DesktopRegular />
            </button>
          </Tooltip>
        )}
        <Tooltip content="Fila" relationship="label" withArrow>
          <button className="ctl ctl-sm" data-on={onQueue ? 'true' : 'false'} onClick={() => navigate({ name: 'queue' })}>
            <TextBulletListLtrRegular />
          </button>
        </Tooltip>
        <VolumeControl />
        <Tooltip content="Mini player" relationship="label" withArrow>
          <button className="ctl ctl-sm" onClick={() => setMini(true)}>
            <PictureInPictureEnterRegular />
          </button>
        </Tooltip>
        <Tooltip content="Tocando agora" relationship="label" withArrow>
          <button className="ctl ctl-sm" onClick={() => setNowPlaying(true)} disabled={!hasTrack}>
            <ArrowMaximizeRegular />
          </button>
        </Tooltip>
      </div>
    </footer>
  )
}
