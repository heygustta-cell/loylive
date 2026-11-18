import { Button, MessageBar, MessageBarActions, MessageBarBody, MessageBarTitle } from '@fluentui/react-components'
import { ArrowSyncRegular, SettingsRegular } from '@fluentui/react-icons'
import { navigate } from '@/state/nav'
import { usePlayer } from '@/spotify/player'

const TITLES = {
  drm: 'Widevine (DRM) indisponível',
  init: 'O player não iniciou',
  auth: 'Problema de autenticação no player',
  account: 'Conta sem Premium',
  playback: 'Licença de reprodução recusada'
} as const

/** Barra de aviso (InfoBar) no topo do conteúdo quando o player tem problemas. */
export function PlayerErrorBar() {
  const error = usePlayer((s) => s.error)
  if (!error) return null
  return (
    <div className="infobar-wrap" style={{ margin: '16px 40px 0' }}>
      <MessageBar intent={error.kind === 'playback' ? 'warning' : 'error'} layout="multiline">
        <MessageBarBody>
          <MessageBarTitle>{TITLES[error.kind]}</MessageBarTitle>
          {error.message}
        </MessageBarBody>
        <MessageBarActions>
          <Button icon={<SettingsRegular />} onClick={() => navigate({ name: 'settings' })}>
            Diagnóstico
          </Button>
          <Button icon={<ArrowSyncRegular />} onClick={() => window.location.reload()}>
            Recarregar
          </Button>
        </MessageBarActions>
      </MessageBar>
    </div>
  )
}
