import { Spinner, Tooltip } from '@fluentui/react-components'
import {
  ArrowMaximizeRegular,
  DesktopRegular,
  TextBulletListLtrRegular
} from '@fluentui/react-icons'
import { Fragment } from 'react'
import { openUri, navigate, useNav } from '@/state/nav'
import { useUi } from '@/state/ui'
import { transferHere, usePlayer } from '@/spotify/player'
import { Artwork } from './Artwork'
import { LikeButton } from './LikeButton'
import { SeekBar, TransportControls, VolumeControl } from './PlayerControls'

function NowInfo() {
  const track = usePlayer((s) => s.track)
  const status = usePlayer((s) => s.status)
  const active = usePlayer((s) => s.active)
  const setNowPlaying = useUi((s) => s.setNowPlaying)

  if (!track) {
    return (
      <div className="player-now">
        <div className="player-art" style={{ cursor: 'default' }}>
          {status === 'loading' && (
            <div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center' }}>
              <Spinner size="tiny" />
            </div>
          )}
        </div>
        <div className="player-meta">
          <span className="title">{status === 'loading' ? 'Conectando ao Spotify…' : 'Nada tocando'}</span>
          <span className="sub">
            {status === 'ready' && !active ? 'Escolha uma música ou transfira a reprodução para cá' : 'Sonora'}
          </span>
        </div>
      </div>
    )
  }

  return (
    <div className="player-now">
      <Tooltip content="Tocando agora (tela cheia)" relationship="label" withArrow>
        <button className="player-art" onClick={() => setNowPlaying(true)} aria-label="Abrir Tocando agora">
          <Artwork images={track.album.images} size={52} eager />
          <span className="expand-hint">
            <ArrowMaximizeRegular fontSize={18} />
          </span>
        </button>
      </Tooltip>
      <div key={track.uri} className="player-meta track-swap">
        <button className="link title ellipsis" onClick={() => openUri(track.album.uri)} title={track.name}>
          {track.name}
        </button>
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

export function PlayerBar() {
  const active = usePlayer((s) => s.active)
  const ready = usePlayer((s) => s.status === 'ready')
  const onQueue = useNav((s) => s.current.name === 'queue')
  const setNowPlaying = useUi((s) => s.setNowPlaying)
  const hasTrack = usePlayer((s) => Boolean(s.track))

  return (
    <footer className="player" aria-label="Player">
      <SeekBar className="player-seek" />
      <div className="player-row">
        <NowInfo />
        <div className="player-controls">
          <TransportControls />
        </div>
        <div className="player-right">
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
          <Tooltip content="Tocando agora" relationship="label" withArrow>
            <button className="ctl ctl-sm" onClick={() => setNowPlaying(true)} disabled={!hasTrack}>
              <ArrowMaximizeRegular />
            </button>
          </Tooltip>
        </div>
      </div>
    </footer>
  )
}
