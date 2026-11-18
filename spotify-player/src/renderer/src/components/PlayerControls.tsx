import { Tooltip } from '@fluentui/react-components'
import {
  ArrowRepeat1Regular,
  ArrowRepeatAllRegular,
  ArrowShuffleRegular,
  NextFilled,
  PauseFilled,
  PlayFilled,
  PreviousFilled,
  Speaker0Regular,
  Speaker1Regular,
  Speaker2Regular,
  SpeakerMuteRegular
} from '@fluentui/react-icons'
import { useRef } from 'react'
import { formatTime } from '@/lib/format'
import { useRafLoop } from '@/lib/raf'
import {
  currentPosition,
  cycleRepeat,
  nextTrack,
  previousTrack,
  seek,
  setVolume,
  toggleMute,
  togglePlay,
  toggleShuffle,
  usePlayer
} from '@/spotify/player'
import { Slider } from './Slider'

/** Texto do tempo atual; atualiza o DOM só quando o segundo muda. */
export function TimeLabel({ className }: { className?: string }) {
  const ref = useRef<HTMLSpanElement>(null)
  const last = useRef('')
  const live = usePlayer((s) => s.active && !s.paused && !s.buffering)
  usePlayer((s) => s.position) // re-render em seek/pausa
  useRafLoop(live, () => {
    const t = formatTime(currentPosition())
    if (t !== last.current && ref.current) {
      last.current = t
      ref.current.textContent = t
    }
  })
  return (
    <span ref={ref} className={className}>
      {formatTime(currentPosition())}
    </span>
  )
}

/** Barra de progresso da faixa (busca). */
export function SeekBar({ className }: { className?: string }) {
  const duration = usePlayer((s) => s.duration)
  const live = usePlayer((s) => s.active && !s.paused && !s.buffering)
  const hasTrack = usePlayer((s) => Boolean(s.track))
  const canSeek = usePlayer((s) => !s.disallows.seeking)
  usePlayer((s) => s.position)
  usePlayer((s) => s.updatedAt)
  return (
    <div className={className}>
      <TimeLabel className="time-left" />
      <Slider
        label="Posição da música"
        variant="media"
        max={Math.max(1, duration)}
        source={currentPosition}
        live={live}
        disabled={!hasTrack || !canSeek}
        step={5000}
        format={formatTime}
        onCommit={(v) => void seek(v)}
      />
      <span className="time-right">{formatTime(duration)}</span>
    </div>
  )
}

/** Ícones de play/pause sobrepostos que se transformam um no outro (mola). */
export function PlayPauseIcon({ paused, size }: { paused: boolean; size: number }) {
  return (
    <span className="pp" data-paused={paused ? 'true' : 'false'} aria-hidden="true">
      <PlayFilled className="pp-play" fontSize={size} />
      <PauseFilled className="pp-pause" fontSize={size} />
    </span>
  )
}

/**
 * Botão de play de uma coleção (playlist/álbum/artista). Se aquele contexto já estiver tocando,
 * vira "pausar" — o mesmo comportamento dos players premium.
 */
export function ContextPlayButton({
  contextUri,
  onPlay,
  size = 'lg',
  label = 'Reproduzir'
}: {
  contextUri?: string | null
  onPlay: () => void
  size?: 'sm' | 'md' | 'lg'
  label?: string
}) {
  const isCurrent = usePlayer((s) => Boolean(contextUri) && s.active && s.contextUri === contextUri)
  const paused = usePlayer((s) => s.paused)
  const playing = isCurrent && !paused
  const px = size === 'lg' ? 26 : size === 'md' ? 22 : 18
  return (
    <Tooltip content={playing ? 'Pausar' : label} relationship="label" withArrow>
      <button
        className={`big-play big-play-${size}`}
        data-playing={playing ? 'true' : 'false'}
        onClick={(e) => {
          e.stopPropagation()
          if (isCurrent) void togglePlay()
          else onPlay()
        }}
      >
        <PlayPauseIcon paused={!playing} size={px} />
      </button>
    </Tooltip>
  )
}

export function TransportControls({ size = 'md' }: { size?: 'md' | 'lg' }) {
  const paused = usePlayer((s) => s.paused)
  const shuffle = usePlayer((s) => s.shuffle)
  const repeat = usePlayer((s) => s.repeat)
  const busy = usePlayer((s) => s.buffering || s.status === 'loading')
  const ready = usePlayer((s) => s.status === 'ready')
  const d = usePlayer((s) => s.disallows)
  const iconSize = size === 'lg' ? 28 : 20

  return (
    <>
      <Tooltip content={shuffle ? 'Aleatório: ativado' : 'Aleatório: desativado'} relationship="label" withArrow>
        <button className="ctl" data-on={shuffle ? 'true' : 'false'} onClick={() => void toggleShuffle()} disabled={!ready || d.toggling_shuffle}>
          <ArrowShuffleRegular fontSize={iconSize - 2} />
        </button>
      </Tooltip>
      <Tooltip content="Anterior (Ctrl+←)" relationship="label" withArrow>
        <button className="ctl ctl-skip" data-dir="prev" onClick={() => void previousTrack()} disabled={!ready}>
          <PreviousFilled fontSize={iconSize} />
        </button>
      </Tooltip>
      <Tooltip content={paused ? 'Reproduzir (Espaço)' : 'Pausar (Espaço)'} relationship="label" withArrow>
        <button className="ctl ctl-play" data-busy={busy ? 'true' : 'false'} onClick={() => void togglePlay()} disabled={!ready}>
          <PlayPauseIcon paused={paused} size={iconSize + 2} />
        </button>
      </Tooltip>
      <Tooltip content="Próxima (Ctrl+→)" relationship="label" withArrow>
        <button className="ctl ctl-skip" data-dir="next" onClick={() => void nextTrack()} disabled={!ready || d.skipping_next}>
          <NextFilled fontSize={iconSize} />
        </button>
      </Tooltip>
      <Tooltip
        content={repeat === 0 ? 'Repetir: desativado' : repeat === 1 ? 'Repetir: tudo' : 'Repetir: uma'}
        relationship="label"
        withArrow
      >
        <button className="ctl" data-on={repeat ? 'true' : 'false'} onClick={() => void cycleRepeat()} disabled={!ready}>
          {repeat === 2 ? <ArrowRepeat1Regular fontSize={iconSize - 2} /> : <ArrowRepeatAllRegular fontSize={iconSize - 2} />}
        </button>
      </Tooltip>
    </>
  )
}

export function VolumeControl() {
  const volume = usePlayer((s) => s.volume)
  const muted = usePlayer((s) => s.muted)
  const effective = muted ? 0 : volume
  const Icon = effective === 0 ? SpeakerMuteRegular : effective < 0.34 ? Speaker0Regular : effective < 0.67 ? Speaker1Regular : Speaker2Regular
  return (
    <div className="player-volume">
      <Tooltip content={muted ? 'Ativar som' : 'Silenciar'} relationship="label" withArrow>
        <button className="ctl ctl-sm" onClick={toggleMute}>
          <Icon />
        </button>
      </Tooltip>
      <Slider
        label="Volume"
        variant="media"
        max={100}
        value={Math.round(effective * 100)}
        step={5}
        format={(v) => `${Math.round(v)}%`}
        onChange={(v) => setVolume(v / 100)}
      />
    </div>
  )
}
