import { ArrowLeftRegular } from '@fluentui/react-icons'
import { Tooltip } from '@fluentui/react-components'
import { goBack, useNav } from '@/state/nav'
import { usePlayer } from '@/spotify/player'
import { AppLogo } from './AppLogo'

export function TitleBar() {
  const canGoBack = useNav((s) => s.stack.length > 0)
  const track = usePlayer((s) => s.track)
  const paused = usePlayer((s) => s.paused)
  return (
    <header className="titlebar">
      <Tooltip content="Voltar (Alt+←)" relationship="label" withArrow>
        <button className="titlebar-back" onClick={goBack} disabled={!canGoBack} aria-label="Voltar">
          <ArrowLeftRegular fontSize={16} />
        </button>
      </Tooltip>
      <AppLogo className="titlebar-icon" />
      <span className="titlebar-title">Sonora</span>
      {track && !paused && (
        <span key={track.uri} className="titlebar-sub">
          {track.name} — {track.artists.map((a) => a.name).join(', ')}
        </span>
      )}
      <div className="titlebar-spacer" />
    </header>
  )
}
