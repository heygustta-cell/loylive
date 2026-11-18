import { Button, MessageBar, MessageBarActions, MessageBarBody, MessageBarTitle, Spinner } from '@fluentui/react-components'
import { ArrowSyncRegular } from '@fluentui/react-icons'
import type { ReactNode } from 'react'
import { SpotifyError } from '@/spotify/api'

export function EmptyState({ icon, title, children }: { icon?: ReactNode; title: string; children?: ReactNode }) {
  return (
    <div className="empty">
      {icon && <div className="icon">{icon}</div>}
      <h3>{title}</h3>
      {children && <div>{children}</div>}
    </div>
  )
}

export function LoadingState({ label = 'Carregando…' }: { label?: string }) {
  return (
    <div className="spinner-center">
      <Spinner size="medium" label={label} labelPosition="below" />
    </div>
  )
}

function describe(err: unknown): string {
  if (err instanceof SpotifyError) {
    if (err.status === 403)
      return 'O Spotify negou o acesso a este conteúdo. Apps em modo de desenvolvimento não podem abrir algumas playlists do próprio Spotify.'
    if (err.status === 404) return 'Conteúdo não encontrado ou indisponível na sua região.'
    if (err.status === 0) return 'Sem conexão com a internet.'
    return err.message
  }
  return (err as Error)?.message ?? 'Erro desconhecido.'
}

export function ErrorState({ error, onRetry }: { error: unknown; onRetry?: () => void }) {
  return (
    <div className="infobar-wrap">
      <MessageBar intent="error" layout="multiline">
        <MessageBarBody>
          <MessageBarTitle>Não foi possível carregar</MessageBarTitle>
          {describe(error)}
        </MessageBarBody>
        {onRetry && (
          <MessageBarActions>
            <Button icon={<ArrowSyncRegular />} onClick={onRetry}>
              Tentar de novo
            </Button>
          </MessageBarActions>
        )}
      </MessageBar>
    </div>
  )
}
