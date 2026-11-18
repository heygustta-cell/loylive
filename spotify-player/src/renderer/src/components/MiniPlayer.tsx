import { Tooltip } from '@fluentui/react-components'
import { NextFilled, PictureInPictureExitRegular, PreviousFilled } from '@fluentui/react-icons'
import type { CSSProperties } from 'react'
import { formatTime } from '@/lib/format'
import { paletteVars, usePalette } from '@/lib/palette'
import { useUi } from '@/state/ui'
import { pickImage } from '@/spotify/api'
import { currentPosition, nextTrack, previousTrack, seek, togglePlay, usePlayer } from '@/spotify/player'
import { AppLogo } from './AppLogo'
import { LikeButton } from './LikeButton'
import { PlayPauseIcon } from './PlayerControls'
import { Slider } from './Slider'

/**
 * Mini player (estilo Media Player do Windows 11): janela quadrada sempre visível, com a capa
 * ocupando tudo e os controles surgindo ao passar o mouse.
 */
export function MiniPlayer() {
  const track = usePlayer((s) => s.track)
  const paused = usePlayer((s) => s.paused || !s.active)
  const duration = usePlayer((s) => s.duration)
  const live = usePlayer((s) => s.active && !s.paused && !s.buffering)
  usePlayer((s) => s.position)
  const palette = usePalette((s) => s.palette)
  const setMini = useUi((s) => s.setMini)
  const art = pickImage(track?.album.images, 640)

  return (
    <div className="mini" data-paused={paused ? 'true' : 'false'} style={paletteVars(palette) as CSSProperties}>
      <div className="mini-bg" aria-hidden="true">
        {palette?.backdrop && <img src={palette.backdrop} alt="" />}
      </div>
      <div className="mini-art-wrap">
        {art ? (
          <img key={art} className="mini-art" src={art} alt={track?.album.name ?? ''} draggable={false} />
        ) : (
          <div className="mini-empty">
            <AppLogo size={56} />
            <span>Nada tocando</span>
          </div>
        )}
      </div>
      <div className="mini-scrim" />
      <div className="mini-drag" />

      <div className="mini-top">
        <Tooltip content="Voltar ao Sonora completo" relationship="label" withArrow>
          <button className="ctl ctl-sm" onClick={() => setMini(false)}>
            <PictureInPictureExitRegular />
          </button>
        </Tooltip>
      </div>

      <div className="mini-bottom">
        {track && (
          <div key={track.uri} className="mini-meta track-swap">
            <span className="mini-title ellipsis">{track.name}</span>
            <span className="mini-sub ellipsis">{track.artists.map((a) => a.name).join(', ')}</span>
          </div>
        )}
        <div className="mini-controls">
          <LikeButton uri={track?.uri} size="md" />
          <button className="ctl" onClick={() => void previousTrack()} aria-label="Anterior">
            <PreviousFilled fontSize={20} />
          </button>
          <button className="ctl ctl-play" onClick={() => void togglePlay()} aria-label={paused ? 'Reproduzir' : 'Pausar'}>
            <PlayPauseIcon paused={paused} size={22} />
          </button>
          <button className="ctl" onClick={() => void nextTrack()} aria-label="Próxima">
            <NextFilled fontSize={20} />
          </button>
          <span className="mini-time">{formatTime(duration)}</span>
        </div>
      </div>
      <div className="mini-progress">
        <Slider
          label="Posição da música"
          variant="media"
          max={Math.max(1, duration)}
          source={currentPosition}
          live={live}
          disabled={!track}
          format={formatTime}
          onCommit={(v) => void seek(v)}
        />
      </div>
    </div>
  )
}
