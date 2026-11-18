import { Button } from '@fluentui/react-components'
import { DesktopRegular, TextBulletListLtrRegular } from '@fluentui/react-icons'
import { Fragment } from 'react'
import { openUri } from '@/state/nav'
import { playSafe, transferHere, usePlayer } from '@/spotify/player'
import { useQueue } from '@/spotify/queries'
import type { Track } from '@/spotify/types'
import { Artwork } from '@/components/Artwork'
import { Equalizer } from '@/components/Equalizer'
import { TrackList } from '@/components/TrackList'
import { EmptyState, ErrorState, LoadingState } from '@/components/States'

export function QueuePage() {
  const track = usePlayer((s) => s.track)
  const paused = usePlayer((s) => s.paused)
  const active = usePlayer((s) => s.active)
  const contextUri = usePlayer((s) => s.contextUri)
  const contextName = usePlayer((s) => s.contextName)
  const q = useQueue(track?.uri)

  const onPlay = (t: Track): void =>
    playSafe(contextUri ? { contextUri, offsetUri: t.uri } : { uris: [t.uri] }, { uris: [t.uri] })

  return (
    <>
      <h1 className="t-title-large page-title">Fila</h1>
      {!active && (
        <div style={{ marginBottom: 20 }}>
          <Button icon={<DesktopRegular />} onClick={() => void transferHere(false)}>
            Transferir a reprodução para este PC
          </Button>
        </div>
      )}
      {track ? (
        <div className="now-card enter">
          <Artwork images={track.album.images} size={88} eager />
          <div style={{ minWidth: 0, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <span className="t-caption text-2" style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <Equalizer paused={paused} /> Tocando agora{contextName ? ` • ${contextName}` : ''}
            </span>
            <span className="t-subtitle ellipsis">{track.name}</span>
            <span className="text-2 ellipsis">
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
        </div>
      ) : null}

      <h2 className="t-subtitle" style={{ margin: '0 0 12px' }}>
        A seguir
      </h2>
      {q.isLoading ? (
        <LoadingState />
      ) : q.error ? (
        <ErrorState error={q.error} onRetry={() => void q.refetch()} />
      ) : (q.data?.queue.length ?? 0) === 0 ? (
        <EmptyState icon={<TextBulletListLtrRegular />} title="A fila está vazia">
          Clique com o botão direito numa música e escolha “Adicionar à fila”.
        </EmptyState>
      ) : (
        <TrackList tracks={q.data!.queue} onPlay={onPlay} contextUri={contextUri ?? undefined} />
      )}
    </>
  )
}
